import { generatePlan } from '../services/plan.service';
import { retrieveEvidence } from '../services/evidence.service';
import { generateBrief } from '../services/brief.service';
import { logger } from '../utils/logger';

/**
 * Research Workflow Orchestrator
 *
 * Coordinates the full AI pipeline for a project:
 *   Generate Plan → [human approves] → Retrieve Evidence → Generate Brief → [human reviews]
 *
 * Each step is a separate service function.
 * Human approval gates are enforced by the API layer (plan/review, brief/review endpoints).
 */

export async function runPlanGeneration(projectId: string): Promise<string> {
  logger.info({ projectId }, 'Workflow: starting plan generation');
  const planId = await generatePlan(projectId);
  logger.info({ projectId, planId }, 'Workflow: plan generation complete — awaiting human approval');
  return planId;
}

export async function runEvidenceRetrieval(projectId: string): Promise<number> {
  logger.info({ projectId }, 'Workflow: starting evidence retrieval');
  const count = await retrieveEvidence(projectId);
  logger.info({ projectId, count }, 'Workflow: evidence retrieval complete');
  return count;
}

export async function runBriefGeneration(projectId: string): Promise<string> {
  logger.info({ projectId }, 'Workflow: starting brief generation');
  const briefId = await generateBrief(projectId);
  logger.info({ projectId, briefId }, 'Workflow: brief generation complete — awaiting human review');
  return briefId;
}

/**
 * Run the full automated pipeline (plan → evidence → brief) in one call.
 * Skips human approval gates — use only for testing/demo purposes.
 */
export async function runFullPipeline(projectId: string): Promise<{
  planId: string;
  evidenceCount: number;
  briefId: string;
}> {
  logger.info({ projectId }, 'Workflow: running full pipeline');

  const planId = await generatePlan(projectId);
  const evidenceCount = await retrieveEvidence(projectId);
  const briefId = await generateBrief(projectId);

  logger.info({ projectId, planId, evidenceCount, briefId }, 'Workflow: full pipeline complete');

  return { planId, evidenceCount, briefId };
}
