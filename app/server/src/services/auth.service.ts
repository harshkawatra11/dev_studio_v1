import { Role } from '../types/enums';
import { hashPassword, comparePassword } from '../utils/hash';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt';
import * as userRepo from '../prisma/userRepo';

const REFRESH_EXPIRY_DAYS = 7;

function refreshExpiresAt() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_EXPIRY_DAYS);
  return d;
}

export async function register(email: string, password: string, name: string, role: Role) {
  const existing = await userRepo.findByEmail(email);
  if (existing) throw Object.assign(new Error('Email already registered'), { status: 409 });

  const passwordHash = await hashPassword(password);
  const user = await userRepo.createUser({ email, passwordHash, name, role });

  const payload  = { userId: user.id, email: user.email, role: user.role };
  const access   = signAccessToken(payload);
  const refresh  = signRefreshToken(payload);
  await userRepo.storeRefreshToken(user.id, refresh, refreshExpiresAt());

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, accessToken: access, refreshToken: refresh };
}

export async function login(email: string, password: string) {
  const user = await userRepo.findByEmail(email);
  if (!user) throw Object.assign(new Error('Invalid credentials'), { status: 401 });
  if (!user.isActive) throw Object.assign(new Error('Account suspended'), { status: 403 });

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) throw Object.assign(new Error('Invalid credentials'), { status: 401 });

  const payload  = { userId: user.id, email: user.email, role: user.role };
  const access   = signAccessToken(payload);
  const refresh  = signRefreshToken(payload);
  await userRepo.storeRefreshToken(user.id, refresh, refreshExpiresAt());

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, accessToken: access, refreshToken: refresh };
}

export async function refreshTokens(token: string) {
  let payload;
  try { payload = verifyRefreshToken(token); }
  catch { throw Object.assign(new Error('Invalid or expired refresh token'), { status: 401 }); }

  const stored = await userRepo.findRefreshToken(token);
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Refresh token revoked or expired'), { status: 401 });
  }

  await userRepo.deleteRefreshToken(token);

  const newPayload = { userId: stored.user.id, email: stored.user.email, role: stored.user.role };
  const access     = signAccessToken(newPayload);
  const refresh    = signRefreshToken(newPayload);
  await userRepo.storeRefreshToken(stored.user.id, refresh, refreshExpiresAt());

  return { accessToken: access, refreshToken: refresh };
}

export async function logout(token: string) {
  await userRepo.deleteRefreshToken(token);
}
