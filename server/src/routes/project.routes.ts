import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { validate } from '../middleware/validate';
import { createProjectSchema, updateProjectSchema, projectIdParamSchema } from '../validators/project.validator';
import { authenticate } from '../middleware/auth';

const router = Router();
const projectController = new ProjectController();

// All project routes require authentication
router.use(authenticate);

router.post('/', validate(createProjectSchema), projectController.create);
router.get('/', projectController.list);
router.get('/:id', validate(projectIdParamSchema), projectController.getById);
router.get('/:id/reviews', validate(projectIdParamSchema), projectController.getReviews);
router.put('/:id', validate(updateProjectSchema), projectController.update);
router.delete('/:id', validate(projectIdParamSchema), projectController.delete);

export default router;
