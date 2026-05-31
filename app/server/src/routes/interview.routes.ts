import { Router } from 'express';
import * as ctrl from '../controllers/interview.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { createInterviewSchema, updateInterviewSchema } from '../schemas/interview.schema';

const router = Router();

router.post('/',                       authenticate, requireRole('EMPLOYER', 'ADMIN'), validate(createInterviewSchema), ctrl.scheduleInterview);
router.get('/:applicationId',          authenticate, ctrl.getInterview);
router.patch('/:id',                   authenticate, requireRole('EMPLOYER', 'ADMIN'), validate(updateInterviewSchema), ctrl.updateInterview);

export default router;
