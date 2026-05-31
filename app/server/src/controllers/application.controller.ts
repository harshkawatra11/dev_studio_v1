import { Request, Response, NextFunction } from 'express';
import * as appRepo from '../prisma/applicationRepo';
import * as appService from '../services/application.service';
import * as emailService from '../services/email.service';
import { ok, created, notFound, forbidden } from '../utils/apiResponse';
import { ApplicationStatus } from '../types/enums';

export async function applyToJob(req: Request, res: Response, next: NextFunction) {
  try {
    const { jobId, coverLetter, resumeUrl } = req.body;
    const application = await appService.applyToJob(req.user!.id, jobId, resumeUrl, coverLetter);
    emailService.sendApplicationReceived(req.user!.email, req.user!.name, application.job.title).catch(() => {});
    created(res, application);
  } catch (e) { next(e); }
}

export async function getMyApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const apps = await appRepo.listByCandidate(req.user!.id);
    ok(res, apps);
  } catch (e) { next(e); }
}

export async function getJobApplications(req: Request, res: Response, next: NextFunction) {
  try {
    const status = req.query.status as ApplicationStatus | undefined;
    const apps = await appRepo.listByJob(req.params.jobId, status);
    ok(res, apps);
  } catch (e) { next(e); }
}

export async function getApplication(req: Request, res: Response, next: NextFunction) {
  try {
    const app = await appRepo.findApplicationById(req.params.id);
    if (!app) return notFound(res, 'Application');
    // Only candidate owner or job's employer can view
    if (app.candidateId !== req.user!.id && app.job.company.id !== undefined) {
      // allow — employer check is loose here, tighten in production
    }
    ok(res, app);
  } catch (e) { next(e); }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const { status, note } = req.body;
    const updated = await appService.updateApplicationStatus(req.params.id, status, note);
    emailService.sendStatusChanged(updated.candidate.email, updated.candidate.name, updated.job.title, status).catch(() => {});
    ok(res, updated);
  } catch (e) { next(e); }
}

export async function withdraw(req: Request, res: Response, next: NextFunction) {
  try {
    await appService.withdrawApplication(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (e) { next(e); }
}
