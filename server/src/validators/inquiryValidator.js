
import { z } from 'zod';

// Keep inquiry values consistent across the API.
export const sourceChannels = [
    'Phone Call',
    'Email',
    'WhatsApp',
    'Website',
    'Other',
];

export const inquiryStatuses = [
    'New',
    'In Progress',
    'Resolved',
];

export const createInquirySchema = z.object({
    customer_name: z.string().trim().min(1).max(150),
    customer_contact: z.string().trim().min(3).max(255),
    subject: z.string().trim().min(3).max(200),
    description: z.string().trim().min(5).max(2000),
    source_channel: z.enum(sourceChannels),
    confirmDuplicate: z.boolean().optional().default(false),
});

export const inquiryListSchema = z.object({
    q: z.string().trim().max(100).optional(),
    status: z.enum(inquiryStatuses).optional(),
});

export const updateStatusSchema = z.object({
    status: z.enum(inquiryStatuses),
});
