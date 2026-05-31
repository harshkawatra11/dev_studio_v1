import { z } from 'zod';

export const createInterviewSchema = z.object({
  body: z.object({
    applicationId: z.string().min(1),
    scheduledAt:   z.string().datetime().transform(v => new Date(v)),
    meetLink:      z.string().url().optional(),
    notes:         z.string().max(1000).optional(),
  }),
});

export const updateInterviewSchema = z.object({
  params: z.object({ id: z.string() }),
  body:   z.object({
    scheduledAt: z.string().datetime().transform(v => new Date(v)).optional(),
    meetLink:    z.string().url().optional(),
    notes:       z.string().max(1000).optional(),
  }),
});
