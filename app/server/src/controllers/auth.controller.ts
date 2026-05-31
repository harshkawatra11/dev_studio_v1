import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service';
import * as userRepo from '../prisma/userRepo';
import { ok, created } from '../utils/apiResponse';

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password, name, role } = req.body;
    const result = await authService.register(email, password, name, role);
    created(res, result);
  } catch (e) { next(e); }
}

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    ok(res, result);
  } catch (e) { next(e); }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.refreshTokens(req.body.refreshToken);
    ok(res, result);
  } catch (e) { next(e); }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    await authService.logout(req.body.refreshToken);
    res.status(204).send();
  } catch (e) { next(e); }
}

export async function me(req: Request, res: Response, next: NextFunction) {
  try {
    const user = await userRepo.findById(req.user!.id);
    ok(res, user);
  } catch (e) { next(e); }
}
