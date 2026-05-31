import { Request, Response, NextFunction } from 'express';
import * as companyRepo from '../prisma/companyRepo';
import { ok, created, notFound, conflict, forbidden } from '../utils/apiResponse';

export async function createCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const existing = await companyRepo.findByOwner(req.user!.id);
    if (existing) return conflict(res, 'You already have a company profile');
    const company = await companyRepo.createCompany({ ...req.body, ownerId: req.user!.id });
    created(res, company);
  } catch (e) { next(e); }
}

export async function getCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const company = await companyRepo.findCompanyById(req.params.id);
    if (!company) return notFound(res, 'Company');
    ok(res, company);
  } catch (e) { next(e); }
}

export async function updateCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const company = await companyRepo.findCompanyById(req.params.id);
    if (!company) return notFound(res, 'Company');
    if (company.ownerId !== req.user!.id) return forbidden(res);
    const updated = await companyRepo.updateCompany(req.params.id, req.body);
    ok(res, updated);
  } catch (e) { next(e); }
}

export async function getMyCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const company = await companyRepo.findByOwner(req.user!.id);
    ok(res, company);
  } catch (e) { next(e); }
}
