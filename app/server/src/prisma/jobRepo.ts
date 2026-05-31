import { prisma } from './client';
import { Prisma } from '@prisma/client';
import { JobType } from '../types/enums';

const JOB_INCLUDE = {
  company: { select: { id: true, name: true, logoUrl: true, location: true, industry: true } },
  tags:    { select: { id: true, name: true } },
  _count:  { select: { applications: true } },
};

export async function createJob(data: {
  title: string; description: string; location: string; type: JobType;
  salaryMin?: number; salaryMax?: number; currency?: string; experienceMin?: number;
  closesAt?: Date; companyId: string; tags?: string[];
}) {
  const { tags, ...rest } = data;
  return prisma.job.create({
    data: {
      ...rest,
      tags: tags?.length ? { create: tags.map(name => ({ name })) } : undefined,
    },
    include: JOB_INCLUDE,
  });
}

export async function updateJob(id: string, data: {
  title?: string; description?: string; location?: string; type?: JobType;
  salaryMin?: number; salaryMax?: number; experienceMin?: number; closesAt?: Date;
  isActive?: boolean; tags?: string[];
}) {
  const { tags, ...rest } = data;
  return prisma.$transaction(async (tx) => {
    if (tags !== undefined) {
      await tx.jobTag.deleteMany({ where: { jobId: id } });
    }
    return tx.job.update({
      where: { id },
      data: {
        ...rest,
        tags: tags?.length ? { create: tags.map(name => ({ name })) } : undefined,
      },
      include: JOB_INCLUDE,
    });
  });
}

export async function deleteJob(id: string) {
  return prisma.job.update({ where: { id }, data: { isActive: false } });
}

export async function findJobById(id: string) {
  return prisma.job.findUnique({ where: { id }, include: JOB_INCLUDE });
}

export async function listJobs(filters: {
  keyword?: string; type?: JobType; location?: string;
  tags?: string[]; salaryMin?: number; salaryMax?: number;
  companyId?: string; isActive?: boolean;
}, pagination: { skip: number; take: number }) {
  const where: Prisma.JobWhereInput = {
    isActive: filters.isActive ?? true,
    ...(filters.companyId && { companyId: filters.companyId }),
    ...(filters.type      && { type: filters.type }),
    ...(filters.location  && { location: { contains: filters.location, mode: 'insensitive' } }),
    ...(filters.salaryMin && { salaryMin: { gte: filters.salaryMin } }),
    ...(filters.salaryMax && { salaryMax: { lte: filters.salaryMax } }),
    ...(filters.tags?.length && { tags: { some: { name: { in: filters.tags } } } }),
    ...(filters.keyword   && {
      OR: [
        { title:       { contains: filters.keyword, mode: 'insensitive' } },
        { description: { contains: filters.keyword, mode: 'insensitive' } },
        { location:    { contains: filters.keyword, mode: 'insensitive' } },
      ],
    }),
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({ where, include: JOB_INCLUDE, orderBy: { createdAt: 'desc' }, ...pagination }),
    prisma.job.count({ where }),
  ]);

  return { jobs, total };
}
