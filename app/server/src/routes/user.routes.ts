import { Router } from 'express';
import * as ctrl from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';

const router = Router();

router.patch('/profile',             authenticate, ctrl.updateProfile);
router.get('/saved-jobs',            authenticate, requireRole('CANDIDATE'), ctrl.getSavedJobs);
router.post('/saved-jobs/:jobId',    authenticate, requireRole('CANDIDATE'), ctrl.saveJob);
router.delete('/saved-jobs/:jobId',  authenticate, requireRole('CANDIDATE'), ctrl.unsaveJob);

export default router;
