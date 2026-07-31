import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { retrieveEvidence } from '../services/evidence.service';

export class EvidenceController {
  async retrieve(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } });
      if (!project) { res.status(404).json({ success: false, message: 'Project not found.' }); return; }

      const totalEvidence = await retrieveEvidence(projectId);
      logger.info({ projectId, totalEvidence }, 'Evidence retrieval completed');
      res.status(201).json({ success: true, data: { totalEvidence }, message: `${totalEvidence} evidence items retrieved and classified.` });
    } catch (error) { next(error); }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } });
      if (!project) { res.status(404).json({ success: false, message: 'Project not found.' }); return; }

      const classification = req.query.classification as string;
      const where: Record<string, unknown> = { projectId };
      if (classification && ['SUPPORTING', 'CONFLICTING', 'INSUFFICIENT'].includes(classification)) {
        where.classification = classification;
      }

      const evidence = await prisma.evidence.findMany({
        where,
        include: {
          chunk: { select: { id: true, chunkIndex: true, pageNumber: true, document: { select: { id: true, originalName: true } } } },
          step: { select: { id: true, title: true, orderIndex: true } },
        },
        orderBy: { relevanceScore: 'desc' },
      });
      res.json({ success: true, data: { evidence } });
    } catch (error) { next(error); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const evidenceId = req.params['evidenceId'] as string;

      const evidence = await prisma.evidence.findFirst({
        where: { id: evidenceId, projectId, project: { userId: req.userId! } },
        include: {
          chunk: { include: { document: { select: { id: true, originalName: true, mimeType: true } } } },
          step: { select: { id: true, title: true, description: true, orderIndex: true } },
        },
      });
      if (!evidence) { res.status(404).json({ success: false, message: 'Evidence not found.' }); return; }
      res.json({ success: true, data: { evidence } });
    } catch (error) { next(error); }
  }
}
