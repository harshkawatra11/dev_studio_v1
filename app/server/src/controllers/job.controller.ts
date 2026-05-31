import { Request, Response, NextFunction } from 'express';
import * as jobRepo from '../prisma/jobRepo';
import * as companyRepo from '../prisma/companyRepo';
import { ok, created, notFound, forbidden } from '../utils/apiResponse';
import { parsePagination, buildMeta } from '../utils/pagination';
import { JobType } from '../types/enums';

export async function listJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const pg = parsePagination(req);
    const { keyword, type, location, tags, salaryMin, salaryMax, companyId } = req.query as any;
    const { jobs, total } = await jobRepo.listJobs(
      { keyword, type: type as JobType, location, tags, salaryMin, salaryMax, companyId },
      { skip: pg.skip, take: pg.limit },
    );
    ok(res, jobs, buildMeta(total, pg));
  } catch (e) { next(e); }
}

export async function getJob(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await jobRepo.findJobById(req.params.id);
    if (!job) return notFound(res, 'Job');
    ok(res, job);
  } catch (e) { next(e); }
}

export async function createJob(req: Request, res: Response, next: NextFunction) {
  try {
    const company = await companyRepo.findByOwner(req.user!.id);
    if (!company) return forbidden(res, 'Create a company profile first');
    const job = await jobRepo.createJob({ ...req.body, companyId: company.id });
    created(res, job);
  } catch (e) { next(e); }
}

export async function updateJob(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await jobRepo.findJobById(req.params.id);
    if (!job) return notFound(res, 'Job');
    const company = await companyRepo.findByOwner(req.user!.id);
    if (job.companyId !== company?.id) return forbidden(res, 'Not your job');
    const updated = await jobRepo.updateJob(req.params.id, req.body);
    ok(res, updated);
  } catch (e) { next(e); }
}

export async function deleteJob(req: Request, res: Response, next: NextFunction) {
  try {
    const job = await jobRepo.findJobById(req.params.id);
    if (!job) return notFound(res, 'Job');
    const company = await companyRepo.findByOwner(req.user!.id);
    if (job.companyId !== company?.id) return forbidden(res, 'Not your job');
    await jobRepo.deleteJob(req.params.id);
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function getJobsByCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const pg = parsePagination(req);
    const { jobs, total } = await jobRepo.listJobs({ companyId: req.params.companyId }, { skip: pg.skip, take: pg.limit });
    ok(res, jobs, buildMeta(total, pg));
  } catch (e) { next(e); }
}
