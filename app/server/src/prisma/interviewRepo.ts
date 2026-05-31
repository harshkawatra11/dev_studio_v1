import { prisma } from './client';

export async function scheduleInterview(applicationId: string, data: {
  scheduledAt: Date; meetLink?: string; notes?: string;
}) {
  return prisma.interview.upsert({
    where:  { applicationId },
    update: data,
    create: { applicationId, ...data },
  });
}

export async function findByApplication(applicationId: string) {
  return prisma.interview.findUnique({ where: { applicationId } });
}

export async function updateInterview(id: string, data: {
  scheduledAt?: Date; meetLink?: string; notes?: string;
}) {
  return prisma.interview.update({ where: { id }, data });
}
