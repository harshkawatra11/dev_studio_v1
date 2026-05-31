import { z } from 'zod';

export const createCompanySchema = z.object({
  body: z.object({
    name:        z.string().min(2).max(100),
    logoUrl:     z.string().url().optional(),
    website:     z.string().url().optional(),
    description: z.string().max(2000).optional(),
    location:    z.string().max(100).optional(),
    industry:    z.string().max(100).optional(),
    size:        z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
  }),
});

export const updateCompanySchema = z.object({
  params: z.object({ id: z.string() }),
  body:   createCompanySchema.shape.body.partial(),
});
