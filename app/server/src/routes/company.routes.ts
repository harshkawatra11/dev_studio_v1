import { Router } from 'express';
import * as ctrl from '../controllers/company.controller';
import { authenticate } from '../middleware/auth';
import { requireRole } from '../middleware/role';
import { validate } from '../middleware/validate';
import { createCompanySchema, updateCompanySchema } from '../schemas/company.schema';

const router = Router();

router.post('/',      authenticate, requireRole('EMPLOYER', 'ADMIN'), validate(createCompanySchema), ctrl.createCompany);
router.get('/mine',   authenticate, requireRole('EMPLOYER'), ctrl.getMyCompany);
router.get('/:id',    ctrl.getCompany);
router.patch('/:id',  authenticate, requireRole('EMPLOYER', 'ADMIN'), validate(updateCompanySchema), ctrl.updateCompany);

export default router;
