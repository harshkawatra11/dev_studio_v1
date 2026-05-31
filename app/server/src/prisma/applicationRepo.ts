import { prisma } from './client';
import { ApplicationStatus } from '../types/enums';

const APP_INCLUDE = {
  candidate: { select: { id: true, name: true, email: true, avatarUrl: true, resumeUrl: true, bio: true } },
  job:       { include: { company: { select: { id: true, name: true, logoUrl: true } }, tags: true } },
  interview: true,
};

export async function createApplication(data: {
  candidateId: string; jobId: string; coverLetter?: string; resumeUrl: string;
}) {
  return prisma.application.create({ data, include: APP_INCLUDE });
}

export async function findApplicationById(id: string) {
  return prisma.application.findUnique({ where: { id }, include: APP_INCLUDE });
}

export async function listByJob(jobId: string, statusFilter?: ApplicationStatus) {
  return prisma.application.findMany({
    where: { jobId, ...(statusFilter && { status: statusFilter }) },
    include: APP_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
}

export async function listByCandidate(candidateId: string) {
  return prisma.application.findMany({
    where: { candidateId },
    include: APP_INCLUDE,
    orderBy: { updatedAt: 'desc' },
  });
}

export async function updateStatus(id: string, status: ApplicationStatus, note?: string) {
  return prisma.application.update({
    where: { id },
    data:  { status, ...(note !== undefined && { note }) },
    include: APP_INCLUDE,
  });
}

export async function checkDuplicate(candidateId: string, jobId: string) {
  return prisma.application.findUnique({ where: { candidateId_jobId: { candidateId, jobId } } });
}

export async function deleteApplication(id: string) {
  return prisma.application.delete({ where: { id } });
}
