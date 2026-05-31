import { z } from 'zod';

const JOB_TYPES = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE'] as const;

export const createJobSchema = z.object({
  body: z.object({
    title:         z.string().min(3).max(200),
    description:   z.string().min(20),
    location:      z.string().min(2).max(100),
    type:          z.enum(JOB_TYPES).default('FULL_TIME'),
    salaryMin:     z.number().int().positive().optional(),
    salaryMax:     z.number().int().positive().optional(),
    currency:      z.string().length(3).default('USD'),
    experienceMin: z.number().int().min(0).optional(),
    closesAt:      z.string().datetime().optional().transform(v => v ? new Date(v) : undefined),
    tags:          z.array(z.string().min(1).max(50)).max(10).optional(),
  }),
});

export const updateJobSchema = z.object({
  params: z.object({ id: z.string() }),
  body:   createJobSchema.shape.body.partial().extend({
    isActive: z.boolean().optional(),
  }),
});

export const listJobsSchema = z.object({
  query: z.object({
    keyword:   z.string().optional(),
    type:      z.enum(JOB_TYPES).optional(),
    location:  z.string().optional(),
    tags:      z.union([z.string(), z.array(z.string())]).optional().transform(v =>
      v ? (Array.isArray(v) ? v : [v]) : undefined,
    ),
    salaryMin: z.string().optional().transform(v => v ? parseInt(v) : undefined),
    salaryMax: z.string().optional().transform(v => v ? parseInt(v) : undefined),
    companyId: z.string().optional(),
    page:      z.string().optional(),
    limit:     z.string().optional(),
  }),
});
