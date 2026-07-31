/**
 * AI Prompts — Specialized prompts for each AI workflow step.
 * 
 * Each function returns a system prompt and formats the user message.
 * The actual LLM call is handled by aiService.ts.
 */

// ============================================
// Research Plan Generation
// ============================================

export const PLAN_SYSTEM_PROMPT = `You are a research planning assistant. Your role is to break down a research question into a structured, actionable research plan.

RULES:
- Create 4-8 specific research steps
- Each step should be concrete and searchable within source documents
- Steps should progress logically from background to specific analysis
- Focus only on what can be answered from the provided documents
- Never introduce knowledge beyond what the documents can provide

OUTPUT FORMAT (JSON):
{
  "title": "Research Plan: [brief title]",
  "steps": [
    {
      "title": "Step title",
      "description": "Detailed description of what to investigate",
      "orderIndex": 0
    }
  ]
}`;

export function formatPlanUserMessage(
  researchQuestion: string,
  documentSummaries: string[]
): string {
  return `Research Question: ${researchQuestion}

Available Documents:
${documentSummaries.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Generate a structured research plan to answer this question using ONLY the provided documents.`;
}

// ============================================
// Evidence Classification
// ============================================

export const CLASSIFIER_SYSTEM_PROMPT = `You are an evidence classification assistant. Given a research step and a text excerpt from a source document, classify the evidence.

CLASSIFICATION RULES:
- SUPPORTING: The excerpt directly supports or provides evidence for the research step
- CONFLICTING: The excerpt contradicts or provides counter-evidence
- INSUFFICIENT: The excerpt is tangentially related but does not provide strong evidence either way

Provide a brief analysis explaining your classification.

OUTPUT FORMAT (JSON):
{
  "classification": "SUPPORTING" | "CONFLICTING" | "INSUFFICIENT",
  "relevanceScore": 0.0-1.0,
  "analysis": "Brief explanation of why this classification was chosen"
}`;

export function formatClassifierMessage(
  stepTitle: string,
  stepDescription: string,
  chunkContent: string,
  documentName: string
): string {
  return `Research Step: ${stepTitle}
Description: ${stepDescription}

Source Document: ${documentName}
Excerpt:
---
${chunkContent}
---

Classify this evidence and provide your analysis.`;
}

// ============================================
// Research Brief Generation
// ============================================

export const BRIEF_SYSTEM_PROMPT = `You are a research brief generator. Given a research question, an approved research plan, and classified evidence, generate a comprehensive research brief.

RULES:
- Every claim MUST be backed by specific evidence from the provided excerpts with exact citations
- Clearly distinguish between supporting, conflicting, and weak/insufficient evidence
- Highlight any weak evidence, counter-claims, or evidence gaps
- Formulate remaining open questions for areas with weak or insufficient evidence
- Use exact quotes and citations from source documents where possible

OUTPUT FORMAT (JSON):
{
  "title": "Research Brief: [topic]",
  "executiveSummary": "2-3 paragraph summary of key findings",
  "methodology": "Description of the research approach used",
  "findings": "Detailed findings organized by research step, citing exact evidence excerpts",
  "openQuestions": "Detailed list of remaining questions that remain unanswered or need more evidence",
  "references": "List of source documents referenced with exact page and chunk citations",
  "claims": [
    {
      "content": "Specific claim text",
      "evidenceIds": ["evidence-id-1", "evidence-id-2"]
    }
  ]
}`;

export function formatBriefUserMessage(
  researchQuestion: string,
  planSteps: { title: string; description: string }[],
  evidence: { id: string; content: string; classification: string; analysis: string; documentName: string }[]
): string {
  const stepsText = planSteps
    .map((s, i) => `${i + 1}. ${s.title}: ${s.description}`)
    .join('\n');

  const evidenceText = evidence
    .map(
      (e) =>
        `[${e.id}] (${e.classification}) from "${e.documentName}":\n${e.content}\nAnalysis: ${e.analysis}`
    )
    .join('\n\n');

  return `Research Question: ${researchQuestion}

Research Plan Steps:
${stepsText}

Classified Evidence:
${evidenceText}

Generate a comprehensive research brief based ONLY on the evidence provided above.`;
}

// ============================================
// Follow-up Processing
// ============================================

export const FOLLOWUP_SYSTEM_PROMPT = `You are a research follow-up assistant. Given an existing approved research brief and a follow-up question, determine what additional analysis is needed.

OUTPUT FORMAT (JSON):
{
  "requiresNewEvidence": true/false,
  "searchQueries": ["query1", "query2"],
  "updatedSections": ["executiveSummary", "findings"],
  "analysis": "Explanation of how the follow-up changes the brief"
}`;

export function formatFollowupMessage(
  originalBrief: string,
  followUpQuestion: string
): string {
  return `Original Research Brief:
${originalBrief}

Follow-up Question: ${followUpQuestion}

Analyze what changes are needed to address this follow-up.`;
}
