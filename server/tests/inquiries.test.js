
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Inquiry API validation', () => {
    it('should reject inquiry creation without authentication', async () => {
        const response = await request(app)
            .post('/api/inquiries')
            .send({
                customer_name: 'Test Customer',
                customer_contact: '0771234567',
                subject: 'Test subject',
                description: 'Test description',
                source_channel: 'Email',
            });

        expect(response.status).toBe(401);
    });

    it('should reject inquiry status updates without authentication', async () => {
        const response = await request(app)
            .patch('/api/inquiries/1/status')
            .send({ status: 'Resolved' });

        expect(response.status).toBe(401);
    });

    it('should reject inquiry listing with an invalid token', async () => {
        const response = await request(app)
            .get('/api/inquiries')
            .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
    });
});
