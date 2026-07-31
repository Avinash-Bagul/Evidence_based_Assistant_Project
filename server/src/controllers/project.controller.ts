import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

const countInclude = { _count: { select: { documents: true, researchPlans: true, researchBriefs: true } } };

export class ProjectController {
  async create(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, description, researchQuestion } = req.body;
      const project = await prisma.project.create({
        data: { title, description: description || '', researchQuestion: researchQuestion || null, userId: req.userId! },
        include: countInclude,
      });
      logger.info({ projectId: project.id }, 'Project created');
      res.status(201).json({ success: true, data: { project }, message: 'Project created successfully.' });
    } catch (error) { next(error); }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
      const skip = (page - 1) * limit;
      const [projects, total] = await Promise.all([
        prisma.project.findMany({ where: { userId: req.userId! }, include: countInclude, orderBy: { updatedAt: 'desc' }, skip, take: limit }),
        prisma.project.count({ where: { userId: req.userId! } }),
      ]);
      res.json({ success: true, data: projects, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
    } catch (error) { next(error); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const project = await prisma.project.findFirst({
        where: { id, userId: req.userId! },
        include: {
          documents: { orderBy: { createdAt: 'desc' } },
          researchPlans: { include: { steps: { orderBy: { orderIndex: 'asc' } } }, orderBy: { createdAt: 'desc' } },
          researchBriefs: { orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { documents: true, researchPlans: true, evidence: true, researchBriefs: true } },
        },
      });
      if (!project) { res.status(404).json({ success: false, message: 'Project not found.' }); return; }
      res.json({ success: true, data: { project } });
    } catch (error) { next(error); }
  }

  async update(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const existing = await prisma.project.findFirst({ where: { id, userId: req.userId! } });
      if (!existing) { res.status(404).json({ success: false, message: 'Project not found.' }); return; }
      const project = await prisma.project.update({ where: { id }, data: req.body, include: countInclude });
      logger.info({ projectId: id }, 'Project updated');
      res.json({ success: true, data: { project }, message: 'Project updated successfully.' });
    } catch (error) { next(error); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const existing = await prisma.project.findFirst({ where: { id, userId: req.userId! } });
      if (!existing) { res.status(404).json({ success: false, message: 'Project not found.' }); return; }
      await prisma.project.delete({ where: { id } });
      logger.info({ projectId: id }, 'Project deleted');
      res.json({ success: true, message: 'Project deleted successfully.' });
    } catch (error) { next(error); }
  }

  async getReviews(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params['id'] as string;
      const project = await prisma.project.findFirst({ where: { id, userId: req.userId! } });
      if (!project) { res.status(404).json({ success: false, message: 'Project not found.' }); return; }

      const [plans, briefs] = await Promise.all([
        prisma.researchPlan.findMany({ where: { projectId: id }, select: { id: true } }),
        prisma.researchBrief.findMany({ where: { projectId: id }, select: { id: true } }),
      ]);
      const planIds = plans.map((p) => p.id);
      const briefIds = briefs.map((b) => b.id);

      const reviews = await prisma.review.findMany({
        where: {
          OR: [
            { targetType: 'ResearchPlan', targetId: { in: planIds } },
            { targetType: 'ResearchBrief', targetId: { in: briefIds } },
          ],
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      res.json({ success: true, data: { reviews } });
    } catch (error) { next(error); }
  }
}
