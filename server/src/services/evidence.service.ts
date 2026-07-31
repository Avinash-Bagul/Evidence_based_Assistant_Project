import prisma from '../config/database';
import { getCompletion, getEmbedding, parseJsonResponse } from '../ai/aiService';
import { CLASSIFIER_SYSTEM_PROMPT, formatClassifierMessage } from '../ai/prompts';
import { logger } from '../utils/logger';
import { createAppError } from '../middleware/errorHandler';

interface ClassificationResult {
  classification: 'SUPPORTING' | 'CONFLICTING' | 'INSUFFICIENT';
  relevanceScore: number;
  analysis: string;
}

interface SimilarChunk {
  id: string;
  content: string;
  document_id: string;
  original_name: string;
  similarity: number;
}

/**
 * Retrieve and classify evidence for a project using pgvector semantic search
 * or fallback chunk-text search.
 *
 * For each plan step:
 * 1. Embed query and run pgvector similarity search (if embeddings exist)
 * 2. Fall back to chunk text selection (if embeddings do not exist or vector search returns empty)
 * 3. Classify candidate chunks with AI LLM
 * 4. Save evidence records
 */
export async function retrieveEvidence(projectId: string): Promise<number> {
  const startTime = Date.now();

  const workflowLog = await prisma.workflowLog.create({
    data: { stage: 'EVIDENCE_RETRIEVAL', status: 'STARTED', projectId },
  });

  try {
    const plan = await prisma.researchPlan.findFirst({
      where: { projectId, status: 'APPROVED' },
      include: { steps: { orderBy: { orderIndex: 'asc' } } },
    });

    if (!plan) {
      throw createAppError('No approved research plan found. Please approve a plan first.', 400);
    }

    // Check total document chunks count for this project
    const totalChunkCount = await prisma.documentChunk.count({
      where: { document: { projectId } },
    });

    if (totalChunkCount === 0) {
      throw createAppError('No processed document chunks found. Please upload and process documents first.', 400);
    }

    // Check if any chunks have embeddings
    const embeddedChunkCount = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) as count FROM document_chunks dc
      JOIN documents d ON d.id = dc.document_id
      WHERE d.project_id = ${projectId}::uuid
        AND dc.embedding IS NOT NULL
    `;

    const hasEmbeddings = Number(embeddedChunkCount[0].count) > 0;

    let totalEvidence = 0;
    const TOP_K = 10; // top chunks per step

    for (const step of plan.steps) {
      await prisma.planStep.update({
        where: { id: step.id },
        data: { status: 'IN_PROGRESS' },
      });

      let similarChunks: SimilarChunk[] = [];

      if (hasEmbeddings) {
        try {
          const queryText = `${step.title}: ${step.description}`;
          const queryEmbedding = await getEmbedding(queryText);

          if (queryEmbedding && queryEmbedding.length > 0) {
            const vectorLiteral = `[${queryEmbedding.join(',')}]`;

            similarChunks = await prisma.$queryRaw<SimilarChunk[]>`
              SELECT
                dc.id,
                dc.content,
                dc.document_id,
                d.original_name,
                1 - (dc.embedding <=> ${vectorLiteral}::vector) AS similarity
              FROM document_chunks dc
              JOIN documents d ON d.id = dc.document_id
              WHERE d.project_id = ${projectId}::uuid
                AND dc.embedding IS NOT NULL
              ORDER BY dc.embedding <=> ${vectorLiteral}::vector
              LIMIT ${TOP_K}
            `;
          }
        } catch (embErr) {
          logger.warn(
            { stepId: step.id, error: embErr },
            'Vector search failed, falling back to chunk text retrieval'
          );
        }
      }

      // Fallback: If vector search was not available or returned no chunks, fetch chunks directly for classification
      if (similarChunks.length === 0) {
        const rawChunks = await prisma.documentChunk.findMany({
          where: { document: { projectId } },
          include: { document: { select: { originalName: true } } },
          take: 8,
        });

        similarChunks = rawChunks.map((dc) => ({
          id: dc.id,
          content: dc.content,
          document_id: dc.documentId,
          original_name: dc.document.originalName,
          similarity: 1.0,
        }));
      }

      // Classify candidate chunks sequentially with rate-limit pacing
      const classificationResults: Array<{ chunk: SimilarChunk; result: ClassificationResult } | null> = [];

      for (const chunk of similarChunks) {
        const similarityScore = Number(chunk.similarity ?? 0);
        if (similarityScore < 0.3) {
          classificationResults.push(null);
          continue;
        }

        try {
          const response = await getCompletion({
            messages: [
              { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
              {
                role: 'user',
                content: formatClassifierMessage(
                  step.title,
                  step.description,
                  chunk.content,
                  chunk.original_name
                ),
              },
            ],
            temperature: 0.2,
            responseFormat: { type: 'json_object' },
          });

          const result = parseJsonResponse<ClassificationResult>(response);
          classificationResults.push({ chunk, result });
        } catch (chunkError) {
          logger.warn(
            { chunkId: chunk.id, stepId: step.id, error: chunkError },
            'Failed to classify chunk, skipping'
          );
          classificationResults.push(null);
        }

        // Pacing delay between requests to remain well within Groq TPM limits
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      for (const item of classificationResults) {
        if (!item || !item.result) continue;
        const { chunk, result } = item;

        if (result.relevanceScore >= 0.3) {
          const existing = await prisma.evidence.findFirst({
            where: { chunkId: chunk.id, stepId: step.id },
          });

          if (!existing) {
            await prisma.evidence.create({
              data: {
                content: chunk.content,
                classification: result.classification,
                relevanceScore: result.relevanceScore,
                analysis: result.analysis,
                chunkId: chunk.id,
                stepId: step.id,
                projectId,
              },
            });
            totalEvidence++;
          }
        }
      }

      await prisma.planStep.update({
        where: { id: step.id },
        data: { status: 'COMPLETED' },
      });
    }

    await prisma.project.update({
      where: { id: projectId },
      data: { status: 'EVIDENCE_RETRIEVED' },
    });

    const duration = Date.now() - startTime;
    await prisma.workflowLog.update({
      where: { id: workflowLog.id },
      data: {
        status: 'COMPLETED',
        duration,
        metadata: { stepsProcessed: plan.steps.length, evidenceFound: totalEvidence },
      },
    });

    logger.info({ projectId, totalEvidence, duration }, 'Evidence retrieval completed');
    return totalEvidence;
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
