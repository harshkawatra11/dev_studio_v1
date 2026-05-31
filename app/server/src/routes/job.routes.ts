import { Router } from 'express';
import * as ctrl from '../controllers/job.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { createJobSchema, updateJobSchema, listJobsSchema } from '../schemas/job.schema';

const router = Router();

router.get('/',                    validate(listJobsSchema),  ctrl.listJobs);
router.get('/company/:companyId',  ctrl.getJobsByCompany);
router.get('/:id',                 ctrl.getJob);
router.post('/',                   authenticate, requireRole('EMPLOYER', 'ADMIN'), validate(createJobSchema), ctrl.createJob);
router.patch('/:id',               authenticate, requireRole('EMPLOYER', 'ADMIN'), validate(updateJobSchema), ctrl.updateJob);
router.delete('/:id',              authenticate, requireRole('EMPLOYER', 'ADMIN'), ctrl.deleteJob);

export default router;
