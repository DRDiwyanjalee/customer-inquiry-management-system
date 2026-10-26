
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { pool } from '../config/db.js';

// Demo staff accounts for local development and assessment testing.
const staffAccounts = [
    {
        name: 'Staff One',
        email: 'staff1@coffeeninja.local',
        phone: '0771234567',
        password: 'DemoStaff123!',
    },
    {
        name: 'Staff Two',
        email: 'staff2@coffeeninja.local',
        phone: '0777654321',
        password: 'DemoStaff456!',
    },
];

async function seedStaff() {
    try {
        for (const staff of staffAccounts) {
            // Hash each password before storing it in PostgreSQL.
            const passwordHash = await bcrypt.hash(staff.password, 12);

            // Avoid creating duplicate accounts when the seed runs again.
            const result = await pool.query(
                `INSERT INTO users (name, email, phone, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email`,
                [staff.name, staff.email, staff.phone, passwordHash]
            );

            if (result.rowCount > 0) {
                console.log(`Created staff account: ${staff.email}`);
            } else {
                console.log(`Staff account already exists: ${staff.email}`);
            }
        }
    } catch (error) {
        console.error('Failed to seed staff accounts:', error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

seedStaff();
