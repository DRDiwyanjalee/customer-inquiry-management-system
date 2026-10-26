
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../config/db.js';

const loginSchema = z.object({
    email: z.string().trim().email().max(255),
    password: z.string().min(1).max(128),
});

// Authenticate a staff member and issue a JWT.
export async function login(req, res) {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
        return res.status(400).json({
            success: false,
            message: 'Please provide a valid email and password',
        });
    }

    const email = validation.data.email.toLowerCase();
    const { password } = validation.data;

    try {
        const result = await pool.query(
            `SELECT id, name, email, phone, password_hash
       FROM users
       WHERE LOWER(email) = $1`,
            [email]
        );

        const staff = result.rows[0];

        // Use the same response for unknown emails and incorrect passwords.
        if (!staff || !(await bcrypt.compare(password, staff.password_hash))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        if (!process.env.JWT_SECRET) {
            console.error('JWT_SECRET is not configured');

            return res.status(500).json({
                success: false,
                message: 'Server configuration error',
            });
        }

        const token = jwt.sign(
            { email: staff.email },
            process.env.JWT_SECRET,
            {
                subject: String(staff.id),
                expiresIn: '8h',
            }
        );

        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: staff.id,
                name: staff.name,
                email: staff.email,
                phone: staff.phone,
            },
        });
    } catch (error) {
        console.error('Login failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Unable to process login',
        });
    }
}
