import { Router } from 'express';
import { PlanController } from '../controllers/plan.controller';
import { validate } from '../middleware/validate';
import { generatePlanSchema, getPlanSchema, reviewPlanSchema } from '../validators/plan.validator';
import { authenticate } from '../middleware/auth';

const router = Router();
const planController = new PlanController();

// All plan routes require authentication
router.use(authenticate);

router.post('/:projectId/generate', validate(generatePlanSchema), planController.generate);
router.get('/:projectId', validate(getPlanSchema), planController.get);
router.post('/:planId/review', validate(reviewPlanSchema), planController.review);
router.put('/:planId/steps/:stepId', planController.updateStep);

export default router;
