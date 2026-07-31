import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { generatePlan } from '../services/plan.service';

export class PlanController {
  async generate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } });
      if (!project) { res.status(404).json({ success: false, message: 'Project not found.' }); return; }
      if (!project.researchQuestion) {
        res.status(400).json({ success: false, message: 'Please set a research question before generating a plan.' });
        return;
      }

      const stepInclude = {
        orderBy: { orderIndex: 'asc' as const },
        include: {
          evidence: {
            include: {
              chunk: {
                select: {
                  id: true,
                  chunkIndex: true,
                  pageNumber: true,
                  document: { select: { id: true, originalName: true, mimeType: true } },
                },
              },
            },
            orderBy: { relevanceScore: 'desc' as const },
          },
        },
      };

      const planId = await generatePlan(projectId);
      const plan = await prisma.researchPlan.findUniqueOrThrow({
        where: { id: planId },
        include: { steps: stepInclude },
      });

      logger.info({ projectId, planId }, 'Research plan generated');
      res.status(201).json({ success: true, data: { plan }, message: 'Research plan generated successfully.' });
    } catch (error) { next(error); }
  }

  async get(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } });
      if (!project) { res.status(404).json({ success: false, message: 'Project not found.' }); return; }

      const stepInclude = {
        orderBy: { orderIndex: 'asc' as const },
        include: {
          evidence: {
            include: {
              chunk: {
                select: {
                  id: true,
                  chunkIndex: true,
                  pageNumber: true,
                  document: { select: { id: true, originalName: true, mimeType: true } },
                },
              },
            },
            orderBy: { relevanceScore: 'desc' as const },
          },
        },
      };

      const plans = await prisma.researchPlan.findMany({
        where: { projectId },
        include: { steps: stepInclude },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: { plans } });
    } catch (error) { next(error); }
  }

  async review(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const planId = req.params['planId'] as string;
      const { action, comment } = req.body;

      const plan = await prisma.researchPlan.findFirst({
        where: { id: planId, project: { userId: req.userId! } },
      });
      if (!plan) { res.status(404).json({ success: false, message: 'Research plan not found.' }); return; }

      const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const stepInclude = {
        orderBy: { orderIndex: 'asc' as const },
        include: {
          evidence: {
            include: {
              chunk: {
                select: {
                  id: true,
                  chunkIndex: true,
                  pageNumber: true,
                  document: { select: { id: true, originalName: true, mimeType: true } },
                },
              },
            },
            orderBy: { relevanceScore: 'desc' as const },
          },
        },
      };

      const updatedPlan = await prisma.researchPlan.update({
        where: { id: planId },
        data: { status: newStatus },
        include: { steps: stepInclude },
      });

      if (action === 'APPROVE') {
        await prisma.project.update({ where: { id: plan.projectId }, data: { status: 'PLAN_APPROVED' } });
      }

      await prisma.review.create({
        data: { action, comment: comment || null, targetType: 'ResearchPlan', targetId: planId, userId: req.userId! },
      });

      logger.info({ planId, action }, 'Research plan reviewed');
      res.json({ success: true, data: { plan: updatedPlan }, message: `Research plan ${action.toLowerCase()}d.` });
    } catch (error) { next(error); }
  }

  async updateStep(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const planId = req.params['planId'] as string;
      const stepId = req.params['stepId'] as string;

      const step = await prisma.planStep.findFirst({
        where: { id: stepId, planId, plan: { project: { userId: req.userId! } } },
      });
      if (!step) { res.status(404).json({ success: false, message: 'Plan step not found.' }); return; }

      const { title, description } = req.body;
      const updatedStep = await prisma.planStep.update({
        where: { id: stepId },
        data: { ...(title && { title }), ...(description && { description }) },
      });
      res.json({ success: true, data: { step: updatedStep } });
    } catch (error) { next(error); }
  }
}
