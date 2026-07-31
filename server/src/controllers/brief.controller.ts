import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { generateBrief } from '../services/brief.service';

const claimsInclude = {
  claims: {
    include: {
      evidence: {
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
          },
        },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

export class BriefController {
  async generate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } });
      if (!project) { res.status(404).json({ success: false, message: 'Project not found.' }); return; }

      const briefId = await generateBrief(projectId);
      const brief = await prisma.researchBrief.findUniqueOrThrow({ where: { id: briefId }, include: claimsInclude });

      logger.info({ projectId, briefId }, 'Research brief generated');
      res.status(201).json({ success: true, data: { brief }, message: 'Research brief generated successfully.' });
    } catch (error) { next(error); }
  }

  async get(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } });
      if (!project) { res.status(404).json({ success: false, message: 'Project not found.' }); return; }

      const brief = await prisma.researchBrief.findFirst({
        where: { projectId },
        include: { ...claimsInclude, versions: { orderBy: { versionNumber: 'desc' } } },
        orderBy: { createdAt: 'desc' },
      });
      if (!brief) { res.status(404).json({ success: false, message: 'No research brief found for this project.' }); return; }
      res.json({ success: true, data: { brief } });
    } catch (error) { next(error); }
  }

  async review(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const briefId = req.params['briefId'] as string;
      const { action, comment } = req.body;

      const brief = await prisma.researchBrief.findFirst({
        where: { id: briefId, project: { userId: req.userId! } },
      });
      if (!brief) { res.status(404).json({ success: false, message: 'Research brief not found.' }); return; }

      const newStatus = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
      const updatedBrief = await prisma.researchBrief.update({
        where: { id: briefId },
        data: { status: newStatus },
        include: claimsInclude,
      });

      if (action === 'APPROVE') {
        await prisma.project.update({ where: { id: brief.projectId }, data: { status: 'BRIEF_APPROVED' } });
      }

      await prisma.review.create({
        data: { action, comment: comment || null, targetType: 'ResearchBrief', targetId: briefId, userId: req.userId! },
      });

      logger.info({ briefId, action }, 'Research brief reviewed');
      res.json({ success: true, data: { brief: updatedBrief }, message: `Research brief ${action.toLowerCase()}d.` });
    } catch (error) { next(error); }
  }

  async updateClaim(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const briefId = req.params['briefId'] as string;
      const claimId = req.params['claimId'] as string;
      const { status, content } = req.body;

      const claim = await prisma.claim.findFirst({
        where: { id: claimId, briefId, brief: { project: { userId: req.userId! } } },
      });
      if (!claim) { res.status(404).json({ success: false, message: 'Claim not found.' }); return; }

      const updateData: Record<string, unknown> = { status };
      if (content && status === 'EDITED') updateData.content = content;

      const updatedClaim = await prisma.claim.update({
        where: { id: claimId },
        data: updateData,
        include: {
          evidence: {
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
              },
            },
          },
        },
      });

      logger.info({ claimId, status }, 'Claim updated');
      res.json({ success: true, data: { claim: updatedClaim }, message: 'Claim updated successfully.' });
    } catch (error) { next(error); }
  }
}
