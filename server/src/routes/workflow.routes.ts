import { Router, Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/:projectId', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const projectId = req.params['projectId'] as string;

    const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } });
    if (!project) { res.status(404).json({ success: false, message: 'Project not found.' }); return; }

    const logs = await prisma.workflowLog.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { logs } });
  } catch (error) { next(error); }
});

export default router;
