import { prisma } from './client';

export async function createCompany(data: {
  name: string; ownerId: string; logoUrl?: string; website?: string;
  description?: string; location?: string; industry?: string; size?: string;
}) {
  return prisma.company.create({ data, include: { owner: { select: { id: true, name: true, email: true } } } });
}

export async function updateCompany(id: string, data: {
  name?: string; logoUrl?: string; website?: string; description?: string;
  location?: string; industry?: string; size?: string;
}) {
  return prisma.company.update({ where: { id }, data });
}

export async function findByOwner(ownerId: string) {
  return prisma.company.findUnique({ where: { ownerId } });
}

export async function findCompanyById(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: {
      jobs: {
        where:   { isActive: true },
        include: { tags: true, _count: { select: { applications: true } } },
        orderBy: { createdAt: 'desc' },
        take:    20,
      },
      _count: { select: { jobs: true } },
    },
  });
}
