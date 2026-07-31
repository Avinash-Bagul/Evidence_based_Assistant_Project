import { Router } from 'express';
import { DocumentController } from '../controllers/document.controller';
import { validate } from '../middleware/validate';
import { documentProjectParamSchema, documentIdParamSchema } from '../validators/document.validator';
import { authenticate } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();
const documentController = new DocumentController();

// All document routes require authentication
router.use(authenticate);

router.post(
  '/:projectId/upload',
  validate(documentProjectParamSchema),
  upload.array('files', 10),
  documentController.upload
);
router.get('/:projectId', validate(documentProjectParamSchema), documentController.list);
router.get('/:projectId/:docId', validate(documentIdParamSchema), documentController.getById);
router.get('/:projectId/:docId/chunks', validate(documentIdParamSchema), documentController.getChunks);
router.delete('/:projectId/:docId', validate(documentIdParamSchema), documentController.delete);

export default router;
