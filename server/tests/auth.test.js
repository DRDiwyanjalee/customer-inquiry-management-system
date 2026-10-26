
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Authentication API', () => {
    it('should reject login with an invalid password', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'staff1@coffeeninja.local',
                password: 'WrongPassword123!',
            });

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
    });

    it('should reject login when email is missing', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                password: 'SomePassword123!',
            });

        expect(response.status).toBe(400);
    });

    it('should reject an invalid JWT token', async () => {
        const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
    });

    it('should allow login with valid seeded staff credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'staff1@coffeeninja.local',
                password: 'DemoStaff123!',
            });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.token).toBeDefined();
        expect(response.body.user.email).toBe('staff1@coffeeninja.local');
    });

    it('should allow authenticated staff to access their profile', async () => {
        const login = await request(app)
            .post('/api/auth/login')
            .send({
                email: 'staff1@coffeeninja.local',
                password: 'DemoStaff123!',
            });

        expect(login.status).toBe(200);

        const response = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${login.body.token}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.user.email).toBe('staff1@coffeeninja.local');
    });
});
