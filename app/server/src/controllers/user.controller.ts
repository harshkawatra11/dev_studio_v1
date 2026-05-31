import { Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma/client';
import * as userRepo from '../prisma/userRepo';
import { ok, notFound } from '../utils/apiResponse';

export async function updateProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const updated = await userRepo.updateProfile(req.user!.id, req.body);
    ok(res, updated);
  } catch (e) { next(e); }
}

export async function getSavedJobs(req: Request, res: Response, next: NextFunction) {
  try {
    const saved = await prisma.savedJob.findMany({
      where:   { userId: req.user!.id },
      include: { job: { include: { company: { select: { id: true, name: true, logoUrl: true } }, tags: true } } },
      orderBy: { createdAt: 'desc' },
    });
    ok(res, saved.map(s => s.job));
  } catch (e) { next(e); }
}

export async function saveJob(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.savedJob.upsert({
      where:  { userId_jobId: { userId: req.user!.id, jobId: req.params.jobId } },
      update: {},
      create: { userId: req.user!.id, jobId: req.params.jobId },
    });
    res.status(201).json({ success: true });
  } catch (e) { next(e); }
}

export async function unsaveJob(req: Request, res: Response, next: NextFunction) {
  try {
    await prisma.savedJob.deleteMany({
      where: { userId: req.user!.id, jobId: req.params.jobId },
    });
    res.status(204).send();
  } catch (e) { next(e); }
}
