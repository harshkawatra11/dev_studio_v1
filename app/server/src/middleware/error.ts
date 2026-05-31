import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  status?: number;
}

export function errorHandler(err: AppError, _req: Request, res: Response, _next: NextFunction) {
  const status  = err.status ?? 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  if (status === 500) console.error('[Error]', err);
  res.status(status).json({ success: false, error: message });
}
