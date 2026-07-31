import prisma from '../config/database';
import { getCompletion, parseJsonResponse } from '../ai/aiService';
import { PLAN_SYSTEM_PROMPT, formatPlanUserMessage } from '../ai/prompts';
import { logger } from '../utils/logger';

interface GeneratedPlan {
  title: string;
  steps: { title: string; description: string; orderIndex: number }[];
}

/**
 * Generate a research plan for a project using AI.
 *
 * 1. Fetches the project and its documents
 * 2. Sends document summaries + research question to LLM
 * 3. Parses the structured plan response
 * 4. Saves the plan and steps to the database
 */
export async function generatePlan(projectId: string): Promise<string> {
  const startTime = Date.now();

  // Log workflow start
  const workflowLog = await prisma.workflowLog.create({
    data: {
      stage: 'PLAN_GENERATION',
      status: 'STARTED',
      projectId,
    },
  });

  try {
    // Get project with documents
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        documents: {
          where: { status: { in: ['CHUNKED', 'EMBEDDED'] } },
          select: { originalName: true, pageCount: true },
        },
      },
    });

    if (!project.researchQuestion) {
      throw new Error('Project must have a research question before generating a plan.');
    }

    if (project.documents.length === 0) {
      throw new Error('Project must have at least one processed document.');
    }

    // Prepare document summaries
    const summaries = project.documents.map(
      (doc) => `${doc.originalName} (${doc.pageCount || '?'} pages)`
    );

    // Call AI
    const response = await getCompletion({
      messages: [
        { role: 'system', content: PLAN_SYSTEM_PROMPT },
        { role: 'user', content: formatPlanUserMessage(project.researchQuestion, summaries) },
      ],
      temperature: 0.4,
      responseFormat: { type: 'json_object' },
    });

    const plan = parseJsonResponse<GeneratedPlan>(response);

    // Save plan and steps
    const savedPlan = await prisma.researchPlan.create({
      data: {
        title: plan.title,
        status: 'DRAFT',
        projectId,
        steps: {
          create: plan.steps.map((step, index) => ({
            title: step.title,
            description: step.description,
            orderIndex: step.orderIndex ?? index,
            status: 'PENDING',
          })),
        },
      },
      include: { steps: true },
    });

    // Update project status
    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'PLAN_GENERATED' },
    });

    // Log workflow completion
    const duration = Date.now() - startTime;
    await prisma.workflowLog.update({
      where: { id: workflowLog.id },
      data: {
        status: 'COMPLETED',
        duration,
        metadata: { stepsGenerated: savedPlan.steps.length },
      },
    });

    logger.info(
      { projectId, planId: savedPlan.id, steps: savedPlan.steps.length, duration },
      'Research plan generated'
    );

    return savedPlan.id;
  } catch (error) {
    const duration = Date.now() - startTime;
    await prisma.workflowLog.update({
      where: { id: workflowLog.id },
      data: {
        status: 'FAILED',
        duration,
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
    });
    throw error;
  }
}
