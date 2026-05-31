import { Router } from 'express';
import * as ctrl from '../controllers/application.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { createApplicationSchema, updateStatusSchema } from '../schemas/application.schema';

const router = Router();

router.post('/',               authenticate, requireRole('CANDIDATE'), validate(createApplicationSchema), ctrl.applyToJob);
router.get('/my',              authenticate, requireRole('CANDIDATE'), ctrl.getMyApplications);
router.get('/job/:jobId',      authenticate, requireRole('EMPLOYER', 'ADMIN'), ctrl.getJobApplications);
router.get('/:id',             authenticate, ctrl.getApplication);
router.patch('/:id/status',    authenticate, requireRole('EMPLOYER', 'ADMIN'), validate(updateStatusSchema), ctrl.updateStatus);
router.delete('/:id',          authenticate, requireRole('CANDIDATE'), ctrl.withdraw);

export default router;
