import dotenv from 'dotenv';
import path from 'node:path';

const result = dotenv.config({
    path: path.resolve(process.cwd(), '.env.test'),
    override: true,
});

if (result.error) {
    throw new Error(
        'Could not load .env.test. Check that the file exists inside the server folder.'
    );
}

const databaseUrl = new URL(process.env.DATABASE_URL);

if (databaseUrl.pathname !== '/customer_inquiry_management_test') {
    throw new Error(
        'Safety check failed: Automated tests must use the test database.'
    );
}