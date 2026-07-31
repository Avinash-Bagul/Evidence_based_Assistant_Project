import { Response, NextFunction } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';

export class VersionController {
  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const briefId = req.params['briefId'] as string;

      const brief = await prisma.researchBrief.findFirst({
        where: { id: briefId, project: { userId: req.userId! } },
      });
      if (!brief) { res.status(404).json({ success: false, message: 'Research brief not found.' }); return; }

      const versions = await prisma.briefVersion.findMany({
        where: { briefId },
        orderBy: { versionNumber: 'desc' },
        select: { id: true, versionNumber: true, changeLog: true, createdAt: true },
      });
      res.json({ success: true, data: { versions } });
    } catch (error) { next(error); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const briefId = req.params['briefId'] as string;
      const versionId = req.params['versionId'] as string;

      const version = await prisma.briefVersion.findFirst({
        where: { id: versionId, briefId, brief: { project: { userId: req.userId! } } },
      });
      if (!version) { res.status(404).json({ success: false, message: 'Version not found.' }); return; }
      res.json({ success: true, data: { version } });
    } catch (error) { next(error); }
  }

  async save(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const briefId = req.params['briefId'] as string;
      const { changeLog } = req.body;

      const brief = await prisma.researchBrief.findFirst({
        where: { id: briefId, project: { userId: req.userId! } },
        include: { claims: { include: { evidence: { select: { evidenceId: true } } } } },
      });
      if (!brief) { res.status(404).json({ success: false, message: 'Research brief not found.' }); return; }

      const lastVersion = await prisma.briefVersion.findFirst({
        where: { briefId },
        orderBy: { versionNumber: 'desc' },
      });
      const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

      const snapshot = {
        title: brief.title,
        executiveSummary: brief.executiveSummary,
        methodology: brief.methodology,
        findings: brief.findings,
        openQuestions: brief.openQuestions,
        references: brief.references,
        claims: brief.claims.map((c) => ({
          content: c.content,
          status: c.status,
          evidenceIds: c.evidence.map((e) => e.evidenceId),
        })),
      };

      const newVersion = await prisma.briefVersion.create({
        data: {
          versionNumber: nextVersionNumber,
          content: JSON.stringify(snapshot),
          changeLog: changeLog || `Manual version snapshot v${nextVersionNumber}`,
          briefId,
        },
      });

      res.status(201).json({ success: true, data: { version: newVersion }, message: `Version v${nextVersionNumber} saved successfully.` });
    } catch (error) { next(error); }
  }

  async restore(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const briefId = req.params['briefId'] as string;
      const versionId = req.params['versionId'] as string;

      const version = await prisma.briefVersion.findFirst({
        where: { id: versionId, briefId, brief: { project: { userId: req.userId! } } },
      });
      if (!version) { res.status(404).json({ success: false, message: 'Version not found.' }); return; }

      let snapshot: any;
      try {
        snapshot = JSON.parse(version.content);
      } catch {
        res.status(400).json({ success: false, message: 'Version content is corrupted or unparseable.' });
        return;
      }

      const updatedBrief = await prisma.researchBrief.update({
        where: { id: briefId },
        data: {
          title: snapshot.title || 'Research Brief',
          executiveSummary: snapshot.executiveSummary || '',
          methodology: snapshot.methodology || '',
          findings: snapshot.findings || '',
          openQuestions: snapshot.openQuestions || '',
          references: snapshot.references || '',
        },
      });

      const lastVersion = await prisma.briefVersion.findFirst({
        where: { briefId },
        orderBy: { versionNumber: 'desc' },
      });
      const nextVersionNumber = (lastVersion?.versionNumber ?? 0) + 1;

      await prisma.briefVersion.create({
        data: {
          versionNumber: nextVersionNumber,
          content: version.content,
          changeLog: `Restored from version v${version.versionNumber}`,
          briefId,
        },
      });

      res.json({ success: true, data: { brief: updatedBrief }, message: `Restored brief to version v${version.versionNumber}.` });
    } catch (error) { next(error); }
  }
}
