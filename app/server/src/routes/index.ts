import { Router } from 'express';
import authRoutes        from './auth.routes';
import jobRoutes         from './job.routes';
import applicationRoutes from './application.routes';
import companyRoutes     from './company.routes';
import interviewRoutes   from './interview.routes';
import userRoutes        from './user.routes';

const router = Router();

router.use('/auth',         authRoutes);
router.use('/jobs',         jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/companies',    companyRoutes);
router.use('/interviews',   interviewRoutes);
router.use('/users',        userRoutes);

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'jobboard-api', version: '1.0.0' }));

export default router;
