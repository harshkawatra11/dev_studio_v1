import { Request, Response, NextFunction } from 'express';
import * as interviewRepo from '../prisma/interviewRepo';
import * as appRepo from '../prisma/applicationRepo';
import * as emailService from '../services/email.service';
import { ok, created, notFound } from '../utils/apiResponse';

export async function scheduleInterview(req: Request, res: Response, next: NextFunction) {
  try {
    const { applicationId, scheduledAt, meetLink, notes } = req.body;
    const interview = await interviewRepo.scheduleInterview(applicationId, { scheduledAt, meetLink, notes });
    const app = await appRepo.findApplicationById(applicationId);
    if (app) {
      emailService.sendInterviewScheduled(
        app.candidate.email, app.candidate.name, app.job.title, scheduledAt, meetLink,
      ).catch(() => {});
    }
    created(res, interview);
  } catch (e) { next(e); }
}

export async function getInterview(req: Request, res: Response, next: NextFunction) {
  try {
    const interview = await interviewRepo.findByApplication(req.params.applicationId);
    if (!interview) return notFound(res, 'Interview');
    ok(res, interview);
  } catch (e) { next(e); }
}

export async function updateInterview(req: Request, res: Response, next: NextFunction) {
  try {
    const updated = await interviewRepo.updateInterview(req.params.id, req.body);
    ok(res, updated);
  } catch (e) { next(e); }
}
