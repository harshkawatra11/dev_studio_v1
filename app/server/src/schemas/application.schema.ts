import { z } from 'zod';

export const createApplicationSchema = z.object({
  body: z.object({
    jobId:       z.string().min(1),
    coverLetter: z.string().max(2000).optional(),
    resumeUrl:   z.string().url(),
  }),
});

export const updateStatusSchema = z.object({
  params: z.object({ id: z.string() }),
  body:   z.object({
    status: z.enum(['SCREENING', 'INTERVIEW', 'OFFER', 'HIRED', 'REJECTED']),
    note:   z.string().max(500).optional(),
  }),
});
