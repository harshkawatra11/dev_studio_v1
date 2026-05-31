import { Response } from 'express';
import { PaginationMeta } from './pagination';

export function ok<T>(res: Response, data: T, meta?: PaginationMeta, status = 200) {
  return res.status(status).json({ success: true, data, meta });
}

export function created<T>(res: Response, data: T) {
  return res.status(201).json({ success: true, data });
}

export function noContent(res: Response) {
  return res.status(204).send();
}

export function badRequest(res: Response, message: string) {
  return res.status(400).json({ success: false, error: message });
}

export function unauthorized(res: Response, message = 'Unauthorized') {
  return res.status(401).json({ success: false, error: message });
}

export function forbidden(res: Response, message = 'Forbidden') {
  return res.status(403).json({ success: false, error: message });
}

export function notFound(res: Response, resource = 'Resource') {
  return res.status(404).json({ success: false, error: `${resource} not found` });
}

export function conflict(res: Response, message: string) {
  return res.status(409).json({ success: false, error: message });
}

export function serverError(res: Response, message = 'Internal server error') {
  return res.status(500).json({ success: false, error: message });
}
