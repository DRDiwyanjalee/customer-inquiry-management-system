
import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import {
    createInquiry,
    listInquiries,
    updateInquiryStatus,
} from '../controllers/inquiryController.js';

const router = Router();

// Every inquiry endpoint requires an authenticated staff member.
router.use(requireAuth);

router.get('/', listInquiries);
router.post('/', createInquiry);
router.patch('/:id/status', updateInquiryStatus);

export default router;
