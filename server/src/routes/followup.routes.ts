import { Router } from 'express';
import { FollowUpController } from '../controllers/followup.controller';
import { validate } from '../middleware/validate';
import { followUpSchema } from '../validators/followup.validator';
import { authenticate } from '../middleware/auth';

const router = Router();
const followUpController = new FollowUpController();

// All follow-up routes require authentication
router.use(authenticate);

router.post('/:briefId', validate(followUpSchema), followUpController.process);

export default router;
