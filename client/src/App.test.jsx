
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { apiRequest } from './api';

vi.mock('./api', () => ({
    apiRequest: vi.fn(),
}));

describe('InquiryFlow Login UI', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        sessionStorage.clear();
    });

    it('shows the login form', () => {
        render(<App />);

        expect(
            screen.getByRole('heading', { name: /welcome back/i })
        ).toBeInTheDocument();

        expect(
            screen.getByRole('textbox', { name: /work email/i })
        ).toBeInTheDocument();

        expect(
            screen.getByLabelText(/password/i)
        ).toBeInTheDocument();

        expect(
            screen.getByRole('button', { name: /sign in/i })
        ).toBeInTheDocument();
    });

    it('shows an error when login credentials are invalid', async () => {
        apiRequest.mockResolvedValue({
            response: { ok: false, status: 401 },
            data: {
                success: false,
                message: 'Invalid email or password.',
            },
        });

        const user = userEvent.setup();
        render(<App />);

        await user.type(
            screen.getByRole('textbox', { name: /work email/i }),
            'wrong@example.com'
        );

        await user.type(
            screen.getByLabelText(/password/i),
            'WrongPassword123'
        );

        await user.click(
            screen.getByRole('button', { name: /sign in/i })
        );

        expect(
            await screen.findByText('Invalid email or password.')
        ).toBeInTheDocument();

        expect(apiRequest).toHaveBeenCalledWith(
            '/auth/login',
            expect.objectContaining({
                method: 'POST',
                body: JSON.stringify({
                    email: 'wrong@example.com',
                    password: 'WrongPassword123',
                }),
            })
        );

        expect(
            localStorage.getItem('inquiry_token')
        ).toBeNull();
    });
});
