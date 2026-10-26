import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';

import {
    listInquiries,
    createInquiry,
    updateInquiryStatus,
    getInquiryHistory,
    editInquiry,
} from '../controllers/inquiryController.js';

const router = Router();

router.use(requireAuth);

router.get('/', listInquiries);
router.post('/', createInquiry);
router.get('/:id/history', getInquiryHistory);
// Edit customer details (authenticated staff only).
router.patch('/:id', editInquiry);
router.patch('/:id/status', updateInquiryStatus);

export default router;