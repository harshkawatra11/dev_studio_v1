import { ApplicationStatus } from '../types/enums';
import * as appRepo from '../prisma/applicationRepo';

// Valid pipeline transitions
const TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  APPLIED:    ['SCREENING', 'REJECTED'],
  SCREENING:  ['INTERVIEW', 'REJECTED'],
  INTERVIEW:  ['OFFER',     'REJECTED'],
  OFFER:      ['HIRED',     'REJECTED'],
  HIRED:      [],
  REJECTED:   [],
};

export function isValidTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export async function updateApplicationStatus(
  id: string,
  newStatus: ApplicationStatus,
  note?: string,
) {
  const app = await appRepo.findApplicationById(id);
  if (!app) throw Object.assign(new Error('Application not found'), { status: 404 });

  if (!isValidTransition(app.status, newStatus)) {
    throw Object.assign(
      new Error(`Cannot transition from ${app.status} to ${newStatus}`),
      { status: 400 },
    );
  }

  return appRepo.updateStatus(id, newStatus, note);
}

export async function applyToJob(candidateId: string, jobId: string, resumeUrl: string, coverLetter?: string) {
  const existing = await appRepo.checkDuplicate(candidateId, jobId);
  if (existing) throw Object.assign(new Error('You have already applied to this job'), { status: 409 });
  return appRepo.createApplication({ candidateId, jobId, resumeUrl, coverLetter });
}

export async function withdrawApplication(id: string, candidateId: string) {
  const app = await appRepo.findApplicationById(id);
  if (!app) throw Object.assign(new Error('Application not found'), { status: 404 });
  if (app.candidateId !== candidateId) throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (app.status !== 'APPLIED') throw Object.assign(new Error('Can only withdraw APPLIED applications'), { status: 400 });
  return appRepo.deleteApplication(id);
}
