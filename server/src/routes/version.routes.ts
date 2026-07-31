import { Router } from 'express';
import { VersionController } from '../controllers/version.controller';
import { validate } from '../middleware/validate';
import { versionListSchema, versionIdParamSchema } from '../validators/version.validator';
import { authenticate } from '../middleware/auth';

const router = Router();
const versionController = new VersionController();

// All version routes require authentication
router.use(authenticate);

router.get('/:briefId', validate(versionListSchema), versionController.list);
router.post('/:briefId/save', validate(versionListSchema), versionController.save);
router.get('/:briefId/:versionId', validate(versionIdParamSchema), versionController.getById);
router.post('/:briefId/restore/:versionId', validate(versionIdParamSchema), versionController.restore);

export default router;
