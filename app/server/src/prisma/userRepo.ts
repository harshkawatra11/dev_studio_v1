import { prisma } from './client';
import { Role } from '../types/enums';

export async function createUser(data: {
  email: string; passwordHash: string; name: string; role: Role;
}) {
  return prisma.user.create({ data });
}

export async function findByEmail(email: string) {
  return prisma.user.findUnique({ where: { email } });
}

export async function findById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, role: true, avatarUrl: true, bio: true, resumeUrl: true, isActive: true, createdAt: true },
  });
}

export async function updateProfile(id: string, data: {
  name?: string; bio?: string; avatarUrl?: string; resumeUrl?: string;
}) {
  return prisma.user.update({ where: { id }, data });
}

export async function storeRefreshToken(userId: string, token: string, expiresAt: Date) {
  return prisma.refreshToken.create({ data: { userId, token, expiresAt } });
}

export async function findRefreshToken(token: string) {
  return prisma.refreshToken.findUnique({ where: { token }, include: { user: true } });
}

export async function deleteRefreshToken(token: string) {
  return prisma.refreshToken.deleteMany({ where: { token } });
}

export async function deleteAllRefreshTokens(userId: string) {
  return prisma.refreshToken.deleteMany({ where: { userId } });
}
