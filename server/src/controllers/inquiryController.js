
import { pool } from '../config/db.js';
import {
    createInquirySchema,
    inquiryListSchema,
    updateStatusSchema,
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
              created_by, updated_by, created_at, updated_at
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

// PATCH /api/inquiries/:id/status - update the inquiry lifecycle status.
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
            message: 'Invalid status value',
        });
    }

    try {
        const currentResult = await pool.query(
            'SELECT id, status FROM inquiries WHERE id = $1',
            [id]
        );

        if (currentResult.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Inquiry not found',
            });
        }

        const currentStatus = currentResult.rows[0].status;
        const newStatus = validation.data.status;

        // Enforce the allowed workflow on the backend.
        const allowedTransitions = {
            New: ['In Progress'],
            'In Progress': ['Resolved'],
            Resolved: ['In Progress'],
        };

        if (!allowedTransitions[currentStatus].includes(newStatus)) {
            return res.status(400).json({
                success: false,
                message: `Cannot change status from ${currentStatus} to ${newStatus}`,
            });
        }

        const result = await pool.query(
            `UPDATE inquiries
       SET status = $1, updated_by = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, customer_name, subject, status,
                 updated_by, updated_at`,
            [newStatus, req.user.id, id]
        );

        return res.status(200).json({
            success: true,
            message: 'Inquiry status updated successfully',
            inquiry: result.rows[0],
        });
    } catch (error) {
        console.error('Update inquiry status failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to update inquiry status',
        });
    }
}
