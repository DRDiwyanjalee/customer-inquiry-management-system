
import { pool } from '../config/db.js';
import {
    createInquirySchema,
    inquiryListSchema,
    updateStatusSchema,
    editInquirySchema,
} from '../validators/inquiryValidator.js';

// Normalize contact details before comparing existing inquiries.
function normalizeContact(value) {
    return value.trim().toLowerCase().replace(/[\s()-]/g, '');
}

// Normalize subject text for a simple duplicate check.
function normalizeSubject(value) {
    return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

// GET /api/inquiries - list, search and filter inquiries.
export async function listInquiries(req, res) {
    const validation = inquiryListSchema.safeParse(req.query);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: 'Invalid search or filter values',
        });
    }

    try {
        const { q, status } = validation.data;
        const conditions = [];
        const values = [];

        if (status) {
            values.push(status);
            conditions.push(`status = $${values.length}`);
        }

        if (q) {
            values.push(`%${q}%`);
            const parameter = `$${values.length}`;

            conditions.push(`(
        customer_name ILIKE ${parameter}
        OR customer_contact ILIKE ${parameter}
        OR subject ILIKE ${parameter}
        OR description ILIKE ${parameter}
      )`);
        }

        const whereClause = conditions.length
            ? `WHERE ${conditions.join(' AND ')}`
            : '';

        const result = await pool.query(
            `SELECT id, customer_name, customer_contact, subject,
            description, source_channel, status,
            created_by, updated_by, created_at, updated_at,
            EXISTS (
                SELECT 1
                FROM inquiry_status_history h
                WHERE h.inquiry_id = inquiries.id
                  AND h.previous_status = 'Resolved'
                  AND h.new_status = 'In Progress'
            ) AS was_reopened
        FROM inquiries
        ${whereClause}
        ORDER BY created_at DESC`,
        values
        );

        return res.status(200).json({
            success: true,
            count: result.rowCount,
            inquiries: result.rows,
        });
    } catch (error) {
        console.error('List inquiries failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve inquiries',
        });
    }
}

// POST /api/inquiries - create an inquiry with duplicate detection.
export async function createInquiry(req, res) {
    const validation = createInquirySchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: 'Invalid inquiry details',
            errors: validation.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            })),
        });
    }

    const {
        customer_name,
        customer_contact,
        subject,
        description,
        source_channel,
        confirmDuplicate,
    } = validation.data;

    try {

        // Check for unresolved inquiries using the same customer contact.
        if (!confirmDuplicate) {
            const contact = normalizeContact(customer_contact);

            const duplicateResult = await pool.query(
                `SELECT id, customer_name, customer_contact, subject,
                        status, created_at
                 FROM inquiries
                 WHERE status IN ('New', 'In Progress')
                   AND regexp_replace(
                         lower(customer_contact),
                         '[[:space:]()\\-]', '', 'g'
                       ) = $1
                 ORDER BY created_at DESC
                 LIMIT 5`,
                [contact]
            );


            if (duplicateResult.rowCount > 0) {
                return res.status(409).json({
                    success: false,
                    requiresConfirmation: true,
                    message: 'A similar unresolved inquiry already exists',
                    duplicates: duplicateResult.rows,
                });
            }
        }

        const result = await pool.query(
            `INSERT INTO inquiries (
         customer_name, customer_contact, subject,
         description, source_channel, created_by, updated_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $6)
       RETURNING id, customer_name, customer_contact, subject,
                 description, source_channel, status,
                 created_by, updated_by, created_at, updated_at`,
            [
                customer_name,
                customer_contact,
                subject,
                description,
                source_channel,
                req.user.id,
            ]
        );

        return res.status(201).json({
            success: true,
            message: 'Inquiry created successfully',
            inquiry: result.rows[0],
        });
    } catch (error) {
        console.error('Create inquiry failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to create inquiry',
        });
    }
}

// PATCH /api/inquiries/:id/status - update the inquiry lifecycle status
export async function updateInquiryStatus(req, res) {
    const id = req.params.id;

    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid inquiry ID',
        });
    }

    const validation = updateStatusSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: 'Invalid status or reopen reason',
            errors: validation.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            })),
        });
    }

    const { status: newStatus, reopen_reason } = validation.data;

    const allowedTransitions = {
        New: ['In Progress'],
        'In Progress': ['Resolved'],
        Resolved: ['In Progress'],
    };

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Lock this inquiry while checking and updating its status.
        const currentResult = await client.query(
            'SELECT id, status FROM inquiries WHERE id = $1 FOR UPDATE',
            [id]
        );

        if (currentResult.rowCount === 0) {
            await client.query('ROLLBACK');

            return res.status(404).json({
                success: false,
                message: 'Inquiry not found',
            });
        }

        const currentStatus = currentResult.rows[0].status;

        if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
            await client.query('ROLLBACK');

            return res.status(400).json({
                success: false,
                message: `Cannot change status from ${currentStatus} to ${newStatus}`,
            });
        }

        const isReopening =
            currentStatus === 'Resolved' &&
            newStatus === 'In Progress';

        if (isReopening && !reopen_reason) {
            await client.query('ROLLBACK');

            return res.status(400).json({
                success: false,
                message: 'Reopen reason is required',
            });
        }

        if (!isReopening && reopen_reason) {
            await client.query('ROLLBACK');

            return res.status(400).json({
                success: false,
                message: 'Reopen reason is only allowed when reopening an inquiry',
            });
        }

        // Update the inquiry status.
        const result = await client.query(
            `UPDATE inquiries
             SET status = $1,
                 updated_by = $2,
                 updated_at = NOW()
             WHERE id = $3
             RETURNING id, customer_name, subject, status,
                       updated_by, updated_at`,
            [newStatus, req.user.id, id]
        );

        // Record every status transition, including reopen reasons.
        await client.query(
            `INSERT INTO inquiry_status_history (
                inquiry_id,
                previous_status,
                new_status,
                reopen_reason,
                changed_by
             )
             VALUES ($1, $2, $3, $4, $5)`,
            [
                id,
                currentStatus,
                newStatus,
                isReopening ? reopen_reason : null,
                req.user.id,
            ]
        );

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: isReopening
                ? 'Inquiry reopened successfully'
                : 'Inquiry status updated successfully',
            inquiry: result.rows[0],
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Update inquiry status failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to update inquiry status',
        });
    } finally {
        client.release();
    }
}

export async function getInquiryHistory(req, res) {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid inquiry ID',
        });
    }

    try {
        const inquiryResult = await pool.query(
            'SELECT id FROM inquiries WHERE id = $1',
            [id]
        );

        if (inquiryResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found',
            });
        }

        const result = await pool.query(
            `SELECT
                h.id,
                h.previous_status,
                h.new_status,
                h.reopen_reason,
                h.changed_at,
                u.name AS changed_by_name
             FROM inquiry_status_history h
             JOIN users u ON u.id = h.changed_by
             WHERE h.inquiry_id = $1
             ORDER BY h.changed_at DESC, h.id DESC`,
            [id]
        );

        return res.status(200).json({
            success: true,
            history: result.rows,
        });
    } catch (error) {
        console.error('Get inquiry history failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to retrieve inquiry history',
        });
    }
}

// Update inquiry details without changing its status.
export async function editInquiry(req, res) {
    const { id } = req.params;

    if (!/^[1-9]\d*$/.test(id)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid inquiry ID',
        });
    }

    const validation = editInquirySchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: 'Invalid inquiry details',
            errors: validation.error.issues.map((issue) => ({
                field: issue.path.join('.'),
                message: issue.message,
            })),
        });
    }

    const {
        customer_name,
        customer_contact,
        subject,
        description,
        source_channel,
    } = validation.data;

    try {
        // Check whether the inquiry still exists.
        const existing = await pool.query(
            'SELECT id FROM inquiries WHERE id = $1',
            [id]
        );

        if (!existing.rowCount) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found',
            });
        }

        // Save validated details using parameterized SQL.
        const result = await pool.query(
            `UPDATE inquiries
             SET customer_name = $1,
                 customer_contact = $2,
                 subject = $3,
                 description = $4,
                 source_channel = $5,
                 updated_by = $6,
                 updated_at = NOW()
             WHERE id = $7
             RETURNING *`,
            [
                customer_name,
                customer_contact,
                subject,
                description,
                source_channel,
                req.user.id,
                id,
            ]
        );

        return res.status(200).json({
            success: true,
            message: 'Inquiry details updated successfully',
            inquiry: result.rows[0],
        });
    } catch (error) {
        console.error('Edit inquiry failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to update inquiry',
        });
    }
}