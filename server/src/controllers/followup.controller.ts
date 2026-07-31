import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/auth';
import { logger } from '../utils/logger';
import { processFollowUp } from '../services/followup.service';

export class FollowUpController {
  async process(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const briefId = req.params['briefId'] as string;
      const { question } = req.body;

      const result = await processFollowUp(briefId, question, req.userId!);
      logger.info({ briefId, versionId: result.versionId }, 'Follow-up processed');
      res.status(201).json({
        success: true,
        data: { analysis: result.analysis, versionId: result.versionId },
        message: 'Follow-up question processed successfully.',
      });
    } catch (error) { next(error); }
  }
}
