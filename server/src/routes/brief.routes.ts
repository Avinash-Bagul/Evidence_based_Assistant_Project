import { Router } from 'express';
import { BriefController } from '../controllers/brief.controller';
import { validate } from '../middleware/validate';
import { generateBriefSchema, getBriefSchema, reviewBriefSchema, updateClaimSchema } from '../validators/brief.validator';
import { authenticate } from '../middleware/auth';

const router = Router();
const briefController = new BriefController();

// All brief routes require authentication
router.use(authenticate);

router.post('/:projectId/generate', validate(generateBriefSchema), briefController.generate);
router.get('/:projectId', validate(getBriefSchema), briefController.get);
router.post('/:briefId/review', validate(reviewBriefSchema), briefController.review);
router.put('/:briefId/claims/:claimId', validate(updateClaimSchema), briefController.updateClaim);

export default router;
