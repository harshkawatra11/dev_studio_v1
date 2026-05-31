import { Router } from 'express';
import * as ctrl from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema, refreshSchema, logoutSchema } from '../schemas/auth.schema';

const router = Router();

router.post('/register', validate(registerSchema), ctrl.register);
router.post('/login',    validate(loginSchema),    ctrl.login);
router.post('/refresh',  validate(refreshSchema),  ctrl.refresh);
router.post('/logout',   validate(logoutSchema),   ctrl.logout);
router.get('/me',        authenticate,             ctrl.me);

export default router;
