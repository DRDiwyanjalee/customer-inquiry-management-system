
import { Router } from 'express';
import { login } from '../controllers/authController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Public endpoint: sign in with staff credentials.
router.post('/login', login);

// Protected endpoint: return the authenticated staff member.
router.get('/me', requireAuth, (req, res) => {
    res.status(200).json({
        success: true,
        user: req.user,
    });
});

export default router;
