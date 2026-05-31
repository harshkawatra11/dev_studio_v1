import { Request } from 'express';

export interface PaginationQuery {
  page:  number;
  limit: number;
  skip:  number;
}

export interface PaginationMeta {
  page:       number;
  limit:      number;
  total:      number;
  totalPages: number;
  hasNext:    boolean;
  hasPrev:    boolean;
}

export function parsePagination(req: Request): PaginationQuery {
  const page  = Math.max(1, parseInt(req.query.page  as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(total: number, { page, limit }: PaginationQuery): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page, limit, total, totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}
