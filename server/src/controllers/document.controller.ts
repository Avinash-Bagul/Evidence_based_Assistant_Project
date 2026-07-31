import { Response, NextFunction } from 'express';
import path from 'path';
import prisma from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { config } from '../config';
import { logger } from '../utils/logger';
import { processDocument } from '../services/document.service';

export class DocumentController {
  async upload(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;

      const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } });
      if (!project) { res.status(404).json({ success: false, message: 'Project not found.' }); return; }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) { res.status(400).json({ success: false, message: 'No files uploaded.' }); return; }

      const documents = await Promise.all(
        files.map((file) =>
          prisma.document.create({
            data: {
              filename: path.resolve(config.uploadDir, file.filename),
              originalName: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              status: 'UPLOADED',
              projectId,
            },
          })
        )
      );

      if (project.status === 'CREATED') {
        await prisma.project.update({ where: { id: projectId }, data: { status: 'DOCUMENTS_UPLOADED' } });
      }

      logger.info({ projectId, fileCount: files.length }, 'Documents uploaded');

      for (const doc of documents) {
        processDocument(doc.id).catch((err) => {
          logger.error({ documentId: doc.id, error: err }, 'Background document processing failed');
        });
      }

      res.status(201).json({ success: true, data: { documents }, message: `${files.length} document(s) uploaded. Processing started.` });
    } catch (error) { next(error); }
  }

  async list(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const project = await prisma.project.findFirst({ where: { id: projectId, userId: req.userId! } });
      if (!project) { res.status(404).json({ success: false, message: 'Project not found.' }); return; }

      const documents = await prisma.document.findMany({
        where: { projectId },
        include: { _count: { select: { chunks: true } } },
        orderBy: { createdAt: 'desc' },
      });
      res.json({ success: true, data: { documents } });
    } catch (error) { next(error); }
  }

  async getById(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const docId = req.params['docId'] as string;

      const document = await prisma.document.findFirst({
        where: { id: docId, projectId, project: { userId: req.userId! } },
        include: { _count: { select: { chunks: true } } },
      });
      if (!document) { res.status(404).json({ success: false, message: 'Document not found.' }); return; }
      res.json({ success: true, data: { document } });
    } catch (error) { next(error); }
  }

  async getChunks(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const docId = req.params['docId'] as string;

      const document = await prisma.document.findFirst({
        where: { id: docId, projectId, project: { userId: req.userId! } },
      });
      if (!document) { res.status(404).json({ success: false, message: 'Document not found.' }); return; }

      const chunks = await prisma.documentChunk.findMany({
        where: { documentId: docId },
        orderBy: { chunkIndex: 'asc' },
        select: { id: true, content: true, chunkIndex: true, pageNumber: true, tokenCount: true, createdAt: true },
      });
      res.json({ success: true, data: { chunks } });
    } catch (error) { next(error); }
  }

  async delete(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const projectId = req.params['projectId'] as string;
      const docId = req.params['docId'] as string;

      const document = await prisma.document.findFirst({
        where: { id: docId, projectId, project: { userId: req.userId! } },
      });
      if (!document) { res.status(404).json({ success: false, message: 'Document not found.' }); return; }

      await prisma.document.delete({ where: { id: docId } });
      logger.info({ documentId: docId, projectId }, 'Document deleted');
      res.json({ success: true, message: 'Document deleted successfully.' });
    } catch (error) { next(error); }
  }
}
