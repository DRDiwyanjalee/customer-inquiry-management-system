import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import authRoutes from './routes/authRoutes.js';
import inquiryRoutes from './routes/inquiryRoutes.js';

const app = express();

// Allow requests from our React development frontend.
app.use(
    cors({
        origin: process.env.CLIENT_URL || 'http://localhost:5173',
    })
);

// Parse incoming JSON request bodies.
app.use(express.json({ limit: '1mb' }));

// Basic health endpoint to confirm the API is running.
app.get('/api/health', (req, res) => {
    res.status(200).json({
        success: true,
        message: 'Customer Inquiry Management API is running',
    });
});

// Handle invalid JSON and other unexpected errors.
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && 'body' in err) {
        return res.status(400).json({
            success: false,
            message: 'Invalid JSON request body',
        });
    }

    console.error('Server error:', err.message);

    return res.status(500).json({
        success: false,
        message: 'Internal server error',
    });
});

// Register authentication endpoints.
app.use('/api/auth', authRoutes);

// Register protected inquiry endpoints.
app.use('/api/inquiries', inquiryRoutes);

export default app;
