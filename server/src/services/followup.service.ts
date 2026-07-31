import prisma from '../config/database';
import { getCompletion, parseJsonResponse } from '../ai/aiService';
import { FOLLOWUP_SYSTEM_PROMPT, formatFollowupMessage } from '../ai/prompts';
import { logger } from '../utils/logger';

interface FollowUpAnalysis {
  requiresNewEvidence: boolean;
  searchQueries: string[];
  updatedSections: string[];
  analysis: string;
}

/**
 * Process a follow-up question on an existing research brief.
 *
 * 1. Fetches the current brief
 * 2. Sends to AI with the follow-up question
 * 3. Creates a new version with the analysis
 */
export async function processFollowUp(
  briefId: string,
  question: string,
  userId: string
): Promise<{ analysis: FollowUpAnalysis; versionId: string }> {
  try {
    // Get the current brief
    const brief = await prisma.researchBrief.findUniqueOrThrow({
      where: { id: briefId },
      include: {
        claims: { include: { evidence: true } },
        versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      },
    });

    // Build the full brief text for the AI
    const briefText = [
      `Title: ${brief.title}`,
      `Executive Summary: ${brief.executiveSummary}`,
      `Methodology: ${brief.methodology}`,
      `Findings: ${brief.findings}`,
      `Open Questions: ${brief.openQuestions}`,
      `References: ${brief.references}`,
    ].join('\n\n');

    // Call AI
    const response = await getCompletion({
      messages: [
        { role: 'system', content: FOLLOWUP_SYSTEM_PROMPT },
        { role: 'user', content: formatFollowupMessage(briefText, question) },
      ],
      temperature: 0.3,
      responseFormat: { type: 'json_object' },
    });

    const analysis = parseJsonResponse<FollowUpAnalysis>(response);

    // Determine next version number
    const latestVersion = brief.versions[0];
    const nextVersionNumber = (latestVersion?.versionNumber ?? 0) + 1;

    // Create new version with the analysis
    const version = await prisma.briefVersion.create({
      data: {
        versionNumber: nextVersionNumber,
        content: JSON.stringify({
          followUpQuestion: question,
          analysis,
          previousVersion: latestVersion?.versionNumber ?? 0,
        }),
        changeLog: `Follow-up: ${question.substring(0, 200)}`,
        briefId,
      },
    });

    // Log the review action
    await prisma.review.create({
      data: {
        action: 'EDIT',
        comment: `Follow-up question: ${question}`,
        targetType: 'ResearchBrief',
        targetId: briefId,
        userId,
      },
    });

    logger.info(
      { briefId, versionNumber: nextVersionNumber, requiresNewEvidence: analysis.requiresNewEvidence },
      'Follow-up processed'
    );

    return { analysis, versionId: version.id };
  } catch (error) {
    logger.error({ error, briefId }, 'Follow-up processing failed');
    throw error;
  }
}
