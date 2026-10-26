
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Health API', () => {
    it('GET /api/health should return HTTP 200', async () => {
        const response = await request(app).get('/api/health');

        expect(response.status).toBe(200);
    });

    it('GET /api/inquiries should reject unauthenticated users', async () => {
        const response = await request(app).get('/api/inquiries');

        expect(response.status).toBe(401);
    });

    it('GET /api/auth/me should reject unauthenticated users', async () => {
        const response = await request(app).get('/api/auth/me');

        expect(response.status).toBe(401);
    });
});
