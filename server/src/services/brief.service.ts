import prisma from '../config/database';
import { getCompletion, parseJsonResponse } from '../ai/aiService';
import { BRIEF_SYSTEM_PROMPT, formatBriefUserMessage } from '../ai/prompts';
import { logger } from '../utils/logger';
import { createAppError } from '../middleware/errorHandler';

interface GeneratedBrief {
  title: string;
  executiveSummary: string;
  methodology: string;
  findings: string;
  openQuestions: string;
  references: string;
  claims: { content: string; evidenceIds: string[] }[];
}

/**
 * Generate a research brief for a project using AI.
 *
 * 1. Gathers all evidence for the project
 * 2. Gets the approved plan steps
 * 3. Sends everything to the LLM with the brief prompt
 * 4. Saves the brief, claims, and claim-evidence links
 */
export async function generateBrief(projectId: string): Promise<string> {
  const startTime = Date.now();

  const workflowLog = await prisma.workflowLog.create({
    data: {
      stage: 'BRIEF_GENERATION',
      status: 'STARTED',
      projectId,
    },
  });

  try {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
    });

    if (!project.researchQuestion) {
      throw new Error('Project must have a research question.');
    }

    // Get approved plan with steps
    const plan = await prisma.researchPlan.findFirst({
      where: { projectId, status: 'APPROVED' },
      include: {
        steps: { orderBy: { orderIndex: 'asc' } },
      },
    });

    if (!plan) {
      throw new Error('No approved research plan found.');
    }

    // Get all evidence with chunk/document info
    const evidenceRecords = await prisma.evidence.findMany({
      where: { projectId },
      include: {
        chunk: {
          select: {
            id: true,
            chunkIndex: true,
            pageNumber: true,
            document: { select: { id: true, originalName: true } },
          },
        },
      },
    });

    if (evidenceRecords.length === 0) {
      throw new Error('No evidence found. Please run evidence retrieval first.');
    }

    // Rank all evidence by relevance score (including supporting, conflicting, and weak/insufficient)
    const selectedEvidence = [...evidenceRecords]
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20);

    // Format evidence for the AI prompt with exact citation details and content capping
    const formattedEvidence = selectedEvidence.map((e) => ({
      id: e.id,
      content: e.content.length > 500 ? `${e.content.substring(0, 500)}...` : e.content,
      classification: e.classification,
      analysis: e.analysis,
      documentName: e.chunk.document.originalName,
      pageNumber: e.chunk.pageNumber,
      chunkIndex: e.chunk.chunkIndex,
    }));

    const planSteps = plan.steps.map((s) => ({
      title: s.title,
      description: s.description,
    }));

    // Call AI
    const response = await getCompletion({
      messages: [
        { role: 'system', content: BRIEF_SYSTEM_PROMPT },
        {
          role: 'user',
          content: formatBriefUserMessage(
            project.researchQuestion,
            planSteps,
            formattedEvidence
          ),
        },
      ],
      temperature: 0.3,
      maxTokens: 4096,
      responseFormat: { type: 'json_object' },
    });

    const brief = parseJsonResponse<GeneratedBrief>(response);

    const stringifyField = (val: unknown): string => {
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val.map((v) => (typeof v === 'string' ? v : JSON.stringify(v))).join('\n');
      if (val && typeof val === 'object') {
        return Object.entries(val)
          .map(([k, v]) => `${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`)
          .join('\n\n');
      }
      return val ? String(val) : '';
    };

    // Save the brief with sanitized string fields
    const savedBrief = await prisma.researchBrief.create({
      data: {
        title: stringifyField(brief.title) || 'Research Brief',
        executiveSummary: stringifyField(brief.executiveSummary),
        methodology: stringifyField(brief.methodology),
        findings: stringifyField(brief.findings),
        openQuestions: stringifyField(brief.openQuestions),
        references: stringifyField(brief.references),
        status: 'DRAFT',
        projectId,
      },
    });

    // Save claims with evidence links
    const claimsList = Array.isArray(brief.claims) ? brief.claims : [];
    for (const claim of claimsList) {
      const evidenceIds = Array.isArray(claim.evidenceIds) ? claim.evidenceIds : [];
      // Validate that referenced evidence IDs actually exist
      const validEvidenceIds = evidenceIds.filter((eid) =>
        evidenceRecords.some((e) => e.id === eid)
      );

      await prisma.claim.create({
        data: {
          content: typeof claim.content === 'string' ? claim.content : JSON.stringify(claim.content),
          status: 'PENDING',
          briefId: savedBrief.id,
          evidence: {
            create: validEvidenceIds.map((evidenceId) => ({
              evidenceId,
            })),
          },
        },
      });
    }

    // Save initial version
    await prisma.briefVersion.create({
      data: {
        versionNumber: 1,
        content: JSON.stringify(brief),
        changeLog: 'Initial version generated from research evidence.',
        briefId: savedBrief.id,
      },
    });

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'BRIEF_GENERATED' },
    });

    const duration = Date.now() - startTime;
    await prisma.workflowLog.update({
      where: { id: workflowLog.id },
      data: {
        status: 'COMPLETED',
        duration,
        metadata: { claimsGenerated: brief.claims.length },
      },
    });

    logger.info(
      { projectId, briefId: savedBrief.id, claims: brief.claims.length, duration },
      'Research brief generated'
    );

    return savedBrief.id;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await prisma.workflowLog.update({
      where: { id: workflowLog.id },
      data: {
        status: 'FAILED',
        duration,
        metadata: { error: errorMessage },
      },
    });

    if (errorMessage.includes('rate_limit_exceeded') || errorMessage.includes('413') || errorMessage.includes('TPM')) {
      throw createAppError(
        'Groq API token limit reached. The evidence context has been auto-trimmed, please try generating the brief again.',
        429
      );
    }

    if (error && (error as { isOperational?: boolean }).isOperational) {
      throw error;
    }

    throw createAppError(errorMessage, 500);
  }
}
