
import jwt from 'jsonwebtoken';

// Protect API routes by verifying the JWT access token.
export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    // Expect: Authorization: Bearer <token>
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
        });
    }

    const token = authHeader.slice(7);

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        req.user = {
            id: payload.sub,
            email: payload.email,
        };

        return next();
    } catch {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
        });
    }
}
