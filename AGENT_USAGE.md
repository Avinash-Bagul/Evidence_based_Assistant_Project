# AGENT_USAGE.md

# Evidence-Based Research Briefing Assistant

## Purpose

This document describes how AI tools were used during the design and development of the Evidence-Based Research Briefing Assistant.

The application was developed using AI as an engineering assistant rather than an autonomous developer. Every AI-generated artifact was reviewed, validated, and refined before being incorporated into the project.

---

# AI Tools Used

## Primary Assistant

- ChatGPT (GPT-5.5)
- Antigravity
- Amazon Q
- claude

Used for:

- System architecture discussions
- Database design
- API design
- Prompt engineering
- Workflow planning
- UI/UX planning
- Documentation generation
- Code review assistance
- Debugging support

---

## LLM Used Inside the Application

Groq API

Recommended Models

- openai/gpt-oss-120b
- llama-3.3-70b-versatile

Responsibilities

- Generate research plans
- Classify evidence
- Generate research briefs
- Process follow-up questions

The application architecture keeps the AI provider abstracted behind a single AI service so that OpenAI, Gemini, Groq, or OpenRouter can be substituted with minimal code changes.

---

# AI Responsibilities During Development

AI was used to assist with:

- Feature planning
- API contract design
- Database schema suggestions
- Prompt creation
- UI component ideas
- Error handling suggestions
- Testing scenarios
- Documentation

AI was **not** used to blindly generate the complete application.

All generated code and documentation were manually reviewed and modified where necessary.

---

Prompt 1 — Overall System Architecture
Objective

Design the architecture for an Evidence-Based Research Briefing Assistant.

Prompt

You are acting as a senior software architect.

Design a production-ready architecture for an Evidence-Based Research Briefing Assistant using React, TypeScript, Express, PostgreSQL, Prisma, and pgvector.

The architecture should follow a modular monolith approach rather than microservices.

Separate business logic from AI orchestration.

The AI should never directly modify the database.

All AI operations must pass through dedicated service layers.

Design the system so that replacing the LLM provider requires changing only one provider implementation.

Every important AI action must produce structured workflow logs.

Human approval must be required before any research brief becomes final.

Explain why each module exists, what responsibilities belong to it, what responsibilities should be avoided, and how the modules communicate with each other.

Prefer maintainability and readability over unnecessary complexity.

Expected Output

Modular architecture
Service responsibilities
Folder structure
Request lifecycle
AI workflow boundaries
Prompt 2 — Database Design
Objective

Design a normalized PostgreSQL schema.

Prompt

Act as a senior backend engineer designing a database for long-term maintainability.

Design a PostgreSQL schema that supports:

research projects
uploaded documents
document chunks
vector embeddings
AI research plans
editable plan steps
evidence records
claim-to-evidence relationships
research briefs
review history
workflow logs
immutable version history

Avoid storing JSON where relational tables are more appropriate.

Explain every table, primary key, foreign key, indexing strategy, and relationship.

Consider future scalability while avoiding premature optimization.

Expected Output

ER model
Normalized schema
Foreign keys
Index recommendations
Justification for every table
Prompt 3 — AI Workflow
Objective

Design the complete AI pipeline.

Prompt

Design an AI workflow that minimizes hallucinations.

The workflow must:

generate a research plan
wait for user approval
retrieve relevant evidence
classify evidence
generate a research brief
require human review
save approved versions

The workflow should never allow unsupported conclusions.

Explain the inputs, outputs, validation rules, failure cases, retry strategy, and logging requirements for every stage.

Recommend where deterministic code should be preferred over AI reasoning.

Expected Output

Workflow diagram
Stage descriptions
Validation rules
Failure handling
Logging strategy
Prompt 4 — Prompt Engineering
Objective

Create reliable prompts for the LLM.

Prompt

Design prompts that produce deterministic JSON responses.

Every prompt should:

clearly define the model's role
specify the required output schema
forbid unsupported conclusions
require evidence citations
distinguish supporting, conflicting, and insufficient evidence
avoid chain-of-thought in the output
gracefully handle missing evidence

Include examples of valid and invalid outputs.

Expected Output

Prompt templates
JSON schema
Validation rules
Error recovery guidance
Prompt 5 — API Design
Objective

Design maintainable REST APIs.

Prompt

Design REST APIs following industry best practices.

Endpoints should be resource-oriented.

Every endpoint should define:

request body
validation rules
response schema
HTTP status codes
possible error responses
authentication requirements

Explain why each endpoint exists and whether it should be synchronous or asynchronous.

Expected Output

REST endpoints
Validation
Error handling
API contracts

Ai suggesting better way about my prompts
Initial Prompt

Build the project using multiple autonomous AI agents, LangGraph, Redis, Kafka, Kubernetes, Elasticsearch, and Pinecone.

Why It Was Rejected

The AI suggested a distributed architecture that significantly increased infrastructure complexity without improving the assignment requirements.

Final Decision

A modular monolith with a single AI service was selected because it:

is easier to understand
is simpler to deploy
satisfies all functional requirements
is easier to test
allows future migration to more advanced architectures if needed
Negative Prompt Example 2
Initial Prompt

Let the AI automatically publish the final research brief after generating it.

Why It Was Rejected

This violates the requirement for human review and increases the risk of unsupported conclusions reaching the final report.

Final Decision

The workflow was redesigned so that:

AI generates a draft
users review every important claim
unsupported claims can be edited or rejected
only approved briefs become versioned research reports

This human-in-the-loop approach better satisfies the project requirements and improves trust in AI-generated output.

Prompt Improvement Process

During development, prompts were refined iteratively rather than accepted after the first attempt.

Typical refinement steps included:

Define the AI's role explicitly.
Specify the expected output format.
Add constraints to prevent unsupported conclusions.
Require structured citations for every important claim.
Validate the output against application requirements.
Refine prompts when outputs were ambiguous or inconsistent.

This iterative approach resulted in more predictable AI behavior and reduced the amount of manual post-processing required.

# Output Verification

Every AI-generated artifact is verified before use.

Development Verification

- Reviewed generated code manually.
- Verified API contracts against frontend requirements.
- Validated Prisma schema relationships.
- Tested database queries.
- Checked prompt outputs against expected JSON structures.
- Confirmed source citations reference retrieved evidence.
- Tested failure scenarios and validation logic.

Runtime Verification

The application verifies:

- Approved research plan exists before retrieval.
- Retrieved evidence belongs to the active project.
- Every important claim references at least one evidence record.
- Unsupported conclusions are flagged for review.
- Version history is immutable.
- Workflow logs are written for every major AI step.

---

# Engineering Principles

The project follows these principles:

- Human-in-the-loop AI.
- Evidence-grounded generation.
- Modular architecture.
- Clear separation of AI and business logic.
- Deterministic backend operations.
- Transparent AI decisions.
- Reproducible workflow.
- Maintainable codebase.

---
