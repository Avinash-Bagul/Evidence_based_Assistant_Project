import { Router } from 'express';
import { EvidenceController } from '../controllers/evidence.controller';
import { validate } from '../middleware/validate';
import { retrieveEvidenceSchema, evidenceListSchema, evidenceIdParamSchema } from '../validators/evidence.validator';
import { authenticate } from '../middleware/auth';

const router = Router();
const evidenceController = new EvidenceController();

// All evidence routes require authentication
router.use(authenticate);

router.post('/:projectId/retrieve', validate(retrieveEvidenceSchema), evidenceController.retrieve);
router.get('/:projectId', validate(evidenceListSchema), evidenceController.list);
router.get('/:projectId/:evidenceId', validate(evidenceIdParamSchema), evidenceController.getById);

export default router;
