
import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

// Reuse a connection pool instead of opening a new connection per request.
export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Log unexpected errors from idle database connections.
pool.on('error', (error) => {
    console.error('Unexpected PostgreSQL pool error:', error.message);
});
