-- ============================================================
-- Evidence-Based Research Briefing Assistant
-- Database Schema + Sample Data
-- ============================================================
-- 
-- HOW TO USE:
-- 1. Create the database:   CREATE DATABASE ai_db;
-- 2. Connect to it:         \c ai_db
-- 3. Paste this entire file into psql or pgAdmin Query Tool
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE "ProjectStatus" AS ENUM (
  'CREATED',
  'DOCUMENTS_UPLOADED',
  'PLAN_GENERATED',
  'PLAN_APPROVED',
  'EVIDENCE_RETRIEVED',
  'BRIEF_GENERATED',
  'BRIEF_APPROVED',
  'COMPLETED'
);

CREATE TYPE "DocumentStatus" AS ENUM (
  'UPLOADED',
  'PROCESSING',
  'CHUNKED',
  'EMBEDDED',
  'FAILED'
);

CREATE TYPE "PlanStatus" AS ENUM (
  'DRAFT',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "StepStatus" AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED'
);

CREATE TYPE "EvidenceClassification" AS ENUM (
  'SUPPORTING',
  'CONFLICTING',
  'INSUFFICIENT'
);

CREATE TYPE "ClaimStatus" AS ENUM (
  'PENDING',
  'ACCEPTED',
  'REJECTED',
  'EDITED'
);

CREATE TYPE "BriefStatus" AS ENUM (
  'DRAFT',
  'IN_REVIEW',
  'APPROVED',
  'REJECTED'
);

CREATE TYPE "ReviewAction" AS ENUM (
  'APPROVE',
  'REJECT',
  'EDIT'
);

CREATE TYPE "WorkflowStatus" AS ENUM (
  'STARTED',
  'COMPLETED',
  'FAILED'
);

-- ============================================================
-- TABLES
-- ============================================================

-- 1. Users
CREATE TABLE users (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email       VARCHAR(255) NOT NULL UNIQUE,
  password    TEXT NOT NULL,
  name        VARCHAR(255) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Projects
CREATE TABLE projects (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             VARCHAR(500) NOT NULL,
  description       TEXT NOT NULL DEFAULT '',
  status            "ProjectStatus" NOT NULL DEFAULT 'CREATED',
  research_question TEXT,
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Documents
CREATE TABLE documents (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename      VARCHAR(500) NOT NULL,
  original_name VARCHAR(500) NOT NULL,
  mime_type     VARCHAR(100) NOT NULL,
  size          INTEGER NOT NULL,
  page_count    INTEGER,
  status        "DocumentStatus" NOT NULL DEFAULT 'UPLOADED',
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Document Chunks
CREATE TABLE document_chunks (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content      TEXT NOT NULL,
  chunk_index  INTEGER NOT NULL,
  page_number  INTEGER,
  token_count  INTEGER,
  embedding    vector(1536),
  document_id  UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_chunks_document_id ON document_chunks(document_id);

-- 5. Research Plans
CREATE TABLE research_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       VARCHAR(500) NOT NULL,
  status      "PlanStatus" NOT NULL DEFAULT 'DRAFT',
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Plan Steps
CREATE TABLE plan_steps (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        VARCHAR(500) NOT NULL,
  description  TEXT NOT NULL,
  order_index  INTEGER NOT NULL,
  status       "StepStatus" NOT NULL DEFAULT 'PENDING',
  plan_id      UUID NOT NULL REFERENCES research_plans(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_plan_steps_plan_id ON plan_steps(plan_id);

-- 7. Evidence
CREATE TABLE evidence (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content         TEXT NOT NULL,
  classification  "EvidenceClassification" NOT NULL,
  relevance_score DOUBLE PRECISION NOT NULL,
  analysis        TEXT NOT NULL DEFAULT '',
  chunk_id        UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
  step_id         UUID NOT NULL REFERENCES plan_steps(id) ON DELETE CASCADE,
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_evidence_project_id ON evidence(project_id);
CREATE INDEX idx_evidence_step_id ON evidence(step_id);

-- 8. Research Briefs
CREATE TABLE research_briefs (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             VARCHAR(500) NOT NULL,
  executive_summary TEXT NOT NULL DEFAULT '',
  methodology       TEXT NOT NULL DEFAULT '',
  findings          TEXT NOT NULL DEFAULT '',
  open_questions    TEXT NOT NULL DEFAULT '',
  "references"      TEXT NOT NULL DEFAULT '',
  status            "BriefStatus" NOT NULL DEFAULT 'DRAFT',
  project_id        UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Claims
CREATE TABLE claims (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content     TEXT NOT NULL,
  status      "ClaimStatus" NOT NULL DEFAULT 'PENDING',
  brief_id    UUID NOT NULL REFERENCES research_briefs(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_claims_brief_id ON claims(brief_id);

-- 10. Claim Evidence (junction table)
CREATE TABLE claim_evidence (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  claim_id     UUID NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  evidence_id  UUID NOT NULL REFERENCES evidence(id) ON DELETE CASCADE,
  UNIQUE(claim_id, evidence_id)
);

-- 11. Brief Versions
CREATE TABLE brief_versions (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_number  INTEGER NOT NULL,
  content         TEXT NOT NULL,
  change_log      TEXT NOT NULL DEFAULT '',
  brief_id        UUID NOT NULL REFERENCES research_briefs(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(brief_id, version_number)
);

CREATE INDEX idx_brief_versions_brief_id ON brief_versions(brief_id);

-- 12. Reviews
CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action      "ReviewAction" NOT NULL,
  comment     TEXT,
  target_type VARCHAR(100) NOT NULL,
  target_id   UUID NOT NULL,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_target ON reviews(target_type, target_id);

-- 13. Workflow Logs
CREATE TABLE workflow_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stage       VARCHAR(200) NOT NULL,
  status      "WorkflowStatus" NOT NULL,
  duration    INTEGER,
  metadata    JSONB,
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_workflow_logs_project_id ON workflow_logs(project_id);


-- -- ============================================================
-- -- SAMPLE DATA (2 rows per table)
-- -- ============================================================

-- -- Passwords are bcrypt hashes of "password123"
-- INSERT INTO users (id, email, password, name) VALUES
--   ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'alice@example.com',
--    '$2a$12$LJ3N4y0E4sQPll4Sez6tEenNXnGhOciRFJKEiwd5FmGWLOKg/XWPC', 'Alice Johnson'),
--   ('b2c3d4e5-f6a7-8901-bcde-f12345678901', 'bob@example.com',
--    '$2a$12$LJ3N4y0E4sQPll4Sez6tEenNXnGhOciRFJKEiwd5FmGWLOKg/XWPC', 'Bob Smith');

-- INSERT INTO projects (id, title, description, status, research_question, user_id) VALUES
--   ('c3d4e5f6-a7b8-9012-cdef-123456789012',
--    'AI in Healthcare',
--    'Research project exploring the impact of AI on healthcare delivery',
--    'PLAN_APPROVED',
--    'How is artificial intelligence transforming diagnostic accuracy in healthcare?',
--    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
--   ('d4e5f6a7-b8c9-0123-defa-234567890123',
--    'Climate Policy Analysis',
--    'Analyzing effectiveness of carbon pricing policies across different economies',
--    'CREATED',
--    NULL,
--    'b2c3d4e5-f6a7-8901-bcde-f12345678901');

-- INSERT INTO documents (id, filename, original_name, mime_type, size, page_count, status, project_id) VALUES
--   ('e5f6a7b8-c9d0-1234-efab-345678901234',
--    'e5f6a7b8-ai-healthcare-review.pdf',
--    'AI Healthcare Systematic Review 2024.pdf',
--    'application/pdf', 2458000, 42, 'EMBEDDED',
--    'c3d4e5f6-a7b8-9012-cdef-123456789012'),
--   ('f6a7b8c9-d0e1-2345-fabc-456789012345',
--    'f6a7b8c9-radiology-ai.pdf',
--    'Radiology AI Performance Study.pdf',
--    'application/pdf', 1835000, 28, 'EMBEDDED',
--    'c3d4e5f6-a7b8-9012-cdef-123456789012');

-- INSERT INTO document_chunks (id, content, chunk_index, page_number, token_count, document_id) VALUES
--   ('11111111-1111-1111-1111-111111111111',
--    'Artificial intelligence (AI) systems have demonstrated diagnostic accuracy comparable to or exceeding that of experienced clinicians in several medical imaging domains, including dermatology, ophthalmology, and radiology.',
--    0, 1, 38,
--    'e5f6a7b8-c9d0-1234-efab-345678901234'),
--   ('22222222-2222-2222-2222-222222222222',
--    'A meta-analysis of 82 studies found that deep learning models achieved a pooled sensitivity of 87.0% (95% CI 83.0-90.2) and specificity of 92.5% (95% CI 89.1-95.0) for disease detection in medical images.',
--    1, 5, 48,
--    'e5f6a7b8-c9d0-1234-efab-345678901234');

-- INSERT INTO research_plans (id, title, status, project_id) VALUES
--   ('33333333-3333-3333-3333-333333333333',
--    'Research Plan: AI Impact on Healthcare Diagnostics',
--    'APPROVED',
--    'c3d4e5f6-a7b8-9012-cdef-123456789012'),
--   ('44444444-4444-4444-4444-444444444444',
--    'Research Plan: Climate Policy Effectiveness',
--    'DRAFT',
--    'd4e5f6a7-b8c9-0123-defa-234567890123');

-- INSERT INTO plan_steps (id, title, description, order_index, status, plan_id) VALUES
--   ('55555555-5555-5555-5555-555555555555',
--    'Background: Current State of AI in Diagnostics',
--    'Review the current landscape of AI applications in medical diagnostics, including key technologies and adoption rates.',
--    0, 'COMPLETED',
--    '33333333-3333-3333-3333-333333333333'),
--   ('66666666-6666-6666-6666-666666666666',
--    'Evidence: Diagnostic Accuracy Comparison',
--    'Analyze studies comparing AI diagnostic accuracy versus human clinicians across different medical specialties.',
--    1, 'COMPLETED',
--    '33333333-3333-3333-3333-333333333333');

-- INSERT INTO evidence (id, content, classification, relevance_score, analysis, chunk_id, step_id, project_id) VALUES
--   ('77777777-7777-7777-7777-777777777777',
--    'AI systems have demonstrated diagnostic accuracy comparable to or exceeding that of experienced clinicians in several medical imaging domains.',
--    'SUPPORTING', 0.92,
--    'Directly supports the research step by confirming AI matches or exceeds clinician accuracy in imaging diagnostics.',
--    '11111111-1111-1111-1111-111111111111',
--    '55555555-5555-5555-5555-555555555555',
--    'c3d4e5f6-a7b8-9012-cdef-123456789012'),
--   ('88888888-8888-8888-8888-888888888888',
--    'Deep learning models achieved a pooled sensitivity of 87.0% and specificity of 92.5% for disease detection in medical images.',
--    'SUPPORTING', 0.95,
--    'Strong quantitative evidence supporting AI diagnostic performance with specific sensitivity/specificity metrics.',
--    '22222222-2222-2222-2222-222222222222',
--    '66666666-6666-6666-6666-666666666666',
--    'c3d4e5f6-a7b8-9012-cdef-123456789012');

-- INSERT INTO research_briefs (id, title, executive_summary, methodology, findings, open_questions, "references", status, project_id) VALUES
--   ('99999999-9999-9999-9999-999999999999',
--    'Research Brief: AI in Healthcare Diagnostics',
--    'This brief examines the current evidence on AI-driven diagnostic tools in healthcare. The findings indicate that AI systems achieve diagnostic accuracy comparable to experienced clinicians, with pooled sensitivity of 87% and specificity of 92.5% across 82 studies.',
--    'Systematic review of uploaded documents with AI-assisted evidence classification and analysis.',
--    'Key finding 1: AI diagnostic systems match or exceed clinician accuracy in imaging. Key finding 2: Performance is strongest in dermatology, ophthalmology, and radiology.',
--    'How do AI diagnostic tools perform in resource-limited settings? What are the long-term patient outcomes when AI assists diagnosis?',
--    'AI Healthcare Systematic Review 2024.pdf, Radiology AI Performance Study.pdf',
--    'DRAFT',
--    'c3d4e5f6-a7b8-9012-cdef-123456789012'),
--   ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
--    'Research Brief: Climate Policy Draft',
--    '', '', '', '', '',
--    'DRAFT',
--    'd4e5f6a7-b8c9-0123-defa-234567890123');

-- INSERT INTO claims (id, content, status, brief_id) VALUES
--   ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
--    'AI diagnostic systems achieve accuracy comparable to or exceeding experienced clinicians in medical imaging.',
--    'PENDING',
--    '99999999-9999-9999-9999-999999999999'),
--   ('cccccccc-cccc-cccc-cccc-cccccccccccc',
--    'Deep learning models achieve 87% sensitivity and 92.5% specificity for disease detection in medical images.',
--    'PENDING',
--    '99999999-9999-9999-9999-999999999999');

-- INSERT INTO claim_evidence (id, claim_id, evidence_id) VALUES
--   ('dddddddd-dddd-dddd-dddd-dddddddddddd',
--    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
--    '77777777-7777-7777-7777-777777777777'),
--   ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
--    'cccccccc-cccc-cccc-cccc-cccccccccccc',
--    '88888888-8888-8888-8888-888888888888');

-- INSERT INTO brief_versions (id, version_number, content, change_log, brief_id) VALUES
--   ('ffffffff-ffff-ffff-ffff-ffffffffffff',
--    1,
--    '{"title":"Research Brief: AI in Healthcare Diagnostics","executiveSummary":"This brief examines the current evidence on AI-driven diagnostic tools...","findings":"AI systems achieve diagnostic accuracy comparable to clinicians."}',
--    'Initial version generated from research evidence.',
--    '99999999-9999-9999-9999-999999999999'),
--   ('11111111-aaaa-bbbb-cccc-dddddddddddd',
--    2,
--    '{"title":"Research Brief: AI in Healthcare Diagnostics v2","executiveSummary":"Updated brief with additional specificity/sensitivity data...","findings":"AI systems achieve 87% sensitivity and 92.5% specificity."}',
--    'Updated with quantitative performance metrics from meta-analysis.',
--    '99999999-9999-9999-9999-999999999999');

-- INSERT INTO reviews (id, action, comment, target_type, target_id, user_id) VALUES
--   ('22222222-aaaa-bbbb-cccc-dddddddddddd',
--    'APPROVE', 'Research plan looks comprehensive and well-structured.',
--    'ResearchPlan', '33333333-3333-3333-3333-333333333333',
--    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'),
--   ('33333333-aaaa-bbbb-cccc-dddddddddddd',
--    'EDIT', 'Please add more detail on limitations of AI diagnostics.',
--    'ResearchBrief', '99999999-9999-9999-9999-999999999999',
--    'a1b2c3d4-e5f6-7890-abcd-ef1234567890');

-- INSERT INTO workflow_logs (id, stage, status, duration, metadata, project_id) VALUES
--   ('44444444-aaaa-bbbb-cccc-dddddddddddd',
--    'PLAN_GENERATION', 'COMPLETED', 3200,
--    '{"model":"llama-3.3-70b-versatile","promptTokens":1250,"completionTokens":890}',
--    'c3d4e5f6-a7b8-9012-cdef-123456789012'),
--   ('55555555-aaaa-bbbb-cccc-dddddddddddd',
--    'EVIDENCE_RETRIEVAL', 'COMPLETED', 8500,
--    '{"chunksProcessed":24,"evidenceFound":12,"model":"llama-3.3-70b-versatile"}',
--    'c3d4e5f6-a7b8-9012-cdef-123456789012');


-- -- ============================================================
-- -- DONE! All tables created and sample data inserted.
-- -- ============================================================
