import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export function validate(schema: z.ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body:   req.body,
      query:  req.query,
      params: req.params,
    });
    if (!result.success) {
      const errors = (result.error as ZodError).flatten().fieldErrors;
      return res.status(400).json({ success: false, error: 'Validation failed', details: errors });
    }
    // Merge parsed (transformed) values back
    if (result.data.body)   req.body   = result.data.body;
    if (result.data.query)  req.query  = result.data.query;
    if (result.data.params) req.params = result.data.params;
    next();
  };
}
