import { Request, Response, NextFunction } from 'express';
import { Role } from '../types/enums';
import { forbidden } from '../utils/apiResponse';

export function requireRole(...roles: Role[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return forbidden(res, `Requires role: ${roles.join(' or ')}`);
    }
    next();
  };
}
