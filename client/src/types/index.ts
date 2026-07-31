// Auth types
export interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// Project types
export interface Project {
  id: string;
  title: string;
  description: string;
  status: ProjectStatus;
  researchQuestion: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    documents: number;
    researchPlans: number;
    researchBriefs: number;
  };
}

export type ProjectStatus =
  | 'CREATED'
  | 'DOCUMENTS_UPLOADED'
  | 'PLAN_GENERATED'
  | 'PLAN_APPROVED'
  | 'EVIDENCE_RETRIEVED'
  | 'BRIEF_GENERATED'
  | 'BRIEF_APPROVED'
  | 'COMPLETED';

// Document types
export interface Document {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  pageCount: number | null;
  status: DocumentStatus;
  projectId: string;
  createdAt: string;
}

export type DocumentStatus =
  | 'UPLOADED'
  | 'PROCESSING'
  | 'CHUNKED'
  | 'EMBEDDED'
  | 'FAILED';

export interface DocumentChunk {
  id: string;
  content: string;
  chunkIndex: number;
  pageNumber: number | null;
  documentId: string;
  document?: Document;
}

// Research Plan types
export interface ResearchPlan {
  id: string;
  title: string;
  status: PlanStatus;
  projectId: string;
  steps: PlanStep[];
  createdAt: string;
  updatedAt: string;
}

export type PlanStatus = 'DRAFT' | 'APPROVED' | 'REJECTED';

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  orderIndex: number;
  status: StepStatus;
  planId: string;
  evidence?: Evidence[];
}

export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

// Evidence types
export interface Evidence {
  id: string;
  content: string;
  classification: EvidenceClassification;
  relevanceScore: number;
  analysis: string;
  chunkId: string;
  chunk?: DocumentChunk;
  stepId: string;
  step?: PlanStep;
  projectId: string;
  createdAt: string;
}

export type EvidenceClassification =
  | 'SUPPORTING'
  | 'CONFLICTING'
  | 'INSUFFICIENT';

// Claim types
export interface Claim {
  id: string;
  content: string;
  status: ClaimStatus;
  briefId: string;
  evidence: ClaimEvidence[];
  createdAt: string;
}

export type ClaimStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EDITED';

export interface ClaimEvidence {
  id: string;
  claimId: string;
  evidenceId: string;
  evidence: Evidence;
}

// Research Brief types
export interface ResearchBrief {
  id: string;
  title: string;
  executiveSummary: string;
  methodology: string;
  findings: string;
  openQuestions: string;
  references: string;
  status: BriefStatus;
  projectId: string;
  claims: Claim[];
  createdAt: string;
  updatedAt: string;
}

export type BriefStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

// Brief Version types
export interface BriefVersion {
  id: string;
  versionNumber: number;
  content: string;
  changeLog: string;
  briefId: string;
  createdAt: string;
}

// Review types
export interface Review {
  id: string;
  action: ReviewAction;
  comment: string | null;
  targetType: string;
  targetId: string;
  userId: string;
  createdAt: string;
}

export type ReviewAction = 'APPROVE' | 'REJECT' | 'EDIT';

// Workflow Log types
export interface WorkflowLog {
  id: string;
  stage: string;
  status: WorkflowStatus;
  duration: number | null;
  metadata: Record<string, unknown> | null;
  projectId: string;
  createdAt: string;
}

export type WorkflowStatus = 'STARTED' | 'COMPLETED' | 'FAILED';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
