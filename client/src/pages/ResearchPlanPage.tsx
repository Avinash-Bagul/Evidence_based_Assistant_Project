import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  FileText,
  Edit3,
  Check,
  X,
  Search,
  Bookmark,
  Layers,
  AlertCircle,
  MinusCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { planApi } from '@/api/plan';
import { documentsApi } from '@/api/documents';
import type { ResearchPlan, Document, EvidenceClassification } from '@/types';

const STEP_CLASSIFICATION_BADGES: Record<EvidenceClassification, { label: string; color: string; icon: typeof CheckCircle }> = {
  SUPPORTING: { label: 'SUPPORTING', color: 'text-evidence-supporting bg-accent-600/10 border-accent-500/30', icon: CheckCircle },
  CONFLICTING: { label: 'CONFLICTING', color: 'text-danger-400 bg-danger-600/10 border-danger-500/30', icon: AlertCircle },
  INSUFFICIENT: { label: 'INSUFFICIENT', color: 'text-warning-400 bg-warning-600/10 border-warning-500/30', icon: MinusCircle },
};

export default function ResearchPlanPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const { data: docsData, isLoading: docsLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => documentsApi.list(projectId!),
    enabled: !!projectId,
    refetchInterval: 3000,
  });

  const documents: Document[] = docsData?.data?.data?.documents ?? [];
  const processedDocs = documents.filter((d) => d.status === 'CHUNKED' || d.status === 'EMBEDDED');
  const processingDocs = documents.filter((d) => d.status === 'UPLOADED' || d.status === 'PROCESSING');

  const { data, isLoading } = useQuery({
    queryKey: ['plan', projectId],
    queryFn: () => planApi.get(projectId!),
    enabled: !!projectId,
  });

  const generateMutation = useMutation({
    mutationFn: () => planApi.generate(projectId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Research plan generated');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Failed to generate plan');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: ({ planId, action }: { planId: string; action: 'APPROVE' | 'REJECT' }) =>
      planApi.review(planId, action, reviewComment || undefined),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['plan', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success(`Plan ${vars.action.toLowerCase()}d`);
      setShowReview(false);
      setReviewComment('');
    },
    onError: () => toast.error('Review failed'),
  });

  const updateStepMutation = useMutation({
    mutationFn: ({
      planId,
      stepId,
      title,
      description,
    }: {
      planId: string;
      stepId: string;
      title: string;
      description: string;
    }) => planApi.updateStep(planId, stepId, { title, description }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan', projectId] });
      toast.success('Step updated successfully');
      setEditingStepId(null);
    },
    onError: () => toast.error('Failed to update step'),
  });

  const plans: ResearchPlan[] = data?.data?.data?.plans ?? [];
  const latestPlan = plans[0];

  const handleStartEdit = (step: { id: string; title: string; description: string }) => {
    setEditingStepId(step.id);
    setEditTitle(step.title);
    setEditDesc(step.description);
    setExpandedStep(step.id);
  };

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
      <div>
        <button
          onClick={() => navigate(`/projects/${projectId}`)}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Research Plan</h1>
            <p className="text-muted-foreground mt-1">AI-generated research plan based on your documents</p>
          </div>
          <button
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-primary-600/20 shrink-0"
          >
            {generateMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {latestPlan ? 'Regenerate Plan' : 'Generate Plan'}
          </button>
        </div>
      </div>

      {/* Document processing status banner */}
      {!docsLoading && documents.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-warning-600/10 border border-warning-500/20 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-warning-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning-400">No documents uploaded</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Upload at least one PDF or DOCX document before generating a plan.
            </p>
          </div>
        </div>
      )}

      {!docsLoading && documents.length > 0 && processingDocs.length > 0 && processedDocs.length === 0 && (
        <div className="flex items-start gap-3 p-4 bg-primary-600/10 border border-primary-500/20 rounded-xl">
          <Loader2 className="w-4 h-4 text-primary-400 mt-0.5 shrink-0 animate-spin" />
          <div>
            <p className="text-sm font-medium text-primary-400">Documents are being processed…</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Please wait until processing completes before generating a plan.
            </p>
          </div>
        </div>
      )}

      {!docsLoading && processedDocs.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-accent-600/10 border border-accent-500/20 rounded-xl">
          <FileText className="w-4 h-4 text-accent-400 shrink-0" />
          <p className="text-sm text-accent-400">
            {processedDocs.length} document{processedDocs.length > 1 ? 's' : ''} ready
            {processingDocs.length > 0 && (
              <span className="text-muted-foreground"> · {processingDocs.length} still processing</span>
            )}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : !latestPlan ? (
        <div className="glass rounded-xl p-12 flex flex-col items-center text-center">
          <ClipboardList className="w-10 h-10 text-muted-foreground mb-4" />
          <h3 className="text-sm font-medium text-foreground mb-1">No research plan yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Make sure you have uploaded and processed documents, then click "Generate Plan".
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Plan Header */}
          <div className="glass rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">{latestPlan.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {latestPlan.steps.length} steps · Created {new Date(latestPlan.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 whitespace-nowrap self-start ${
                  latestPlan.status === 'APPROVED'
                    ? 'bg-accent-600/10 text-accent-400'
                    : latestPlan.status === 'REJECTED'
                    ? 'bg-danger-600/10 text-danger-400'
                    : 'bg-warning-600/10 text-warning-400'
                }`}
              >
                {latestPlan.status}
              </span>
            </div>

            {latestPlan.status === 'DRAFT' && (
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowReview(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-accent-600/10 hover:bg-accent-600/20 border border-accent-500/20 text-accent-400 text-sm font-medium rounded-xl transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Plan
                </button>
                <button
                  onClick={() => reviewMutation.mutate({ planId: latestPlan.id, action: 'REJECT' })}
                  disabled={reviewMutation.isPending}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-danger-600/10 hover:bg-danger-600/20 border border-danger-500/20 text-danger-400 text-sm font-medium rounded-xl transition-all"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            )}
          </div>

          {/* Review Modal */}
          {showReview && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="glass rounded-xl p-5 sm:p-6 w-full max-w-md max-h-[90vh] overflow-y-auto animate-[scale-in_0.2s_ease-out]">
                <h3 className="text-base font-semibold text-foreground mb-3">Approve Research Plan</h3>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="Optional comment..."
                  className="w-full px-3.5 py-2.5 bg-surface-800 border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none mb-4"
                />
                <div className="flex flex-col-reverse sm:flex-row gap-3">
                  <button
                    onClick={() => setShowReview(false)}
                    className="flex-1 py-2.5 border border-border text-muted-foreground hover:text-foreground rounded-xl text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => reviewMutation.mutate({ planId: latestPlan.id, action: 'APPROVE' })}
                    disabled={reviewMutation.isPending}
                    className="flex-1 py-2.5 bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {reviewMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Approve
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Steps */}
          <div className="space-y-3">
            {latestPlan.steps.map((step, i) => (
              <div key={step.id} className="glass rounded-xl overflow-hidden">
                <div className="flex items-start sm:items-center justify-between p-4 gap-3">
                  <button
                    onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                    className="flex-1 flex items-start sm:items-center gap-3 sm:gap-4 text-left hover:bg-surface-800/20 rounded-lg p-1 transition-colors min-w-0"
                  >
                    <div className="w-7 h-7 rounded-full bg-primary-600/20 border border-primary-500/30 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      <span className="text-xs font-bold text-primary-400">{i + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-foreground">{step.title}</p>
                        {step.evidence && step.evidence.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-accent-600/10 border border-accent-500/20 text-accent-400 rounded-full font-medium">
                            <Bookmark className="w-3 h-3" />
                            {step.evidence.length} Evidence Linked
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.description}</p>
                    </div>
                  </button>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${
                        step.status === 'COMPLETED'
                          ? 'bg-accent-600/10 text-accent-400'
                          : step.status === 'IN_PROGRESS'
                          ? 'bg-primary-600/10 text-primary-400'
                          : 'bg-surface-800 text-muted-foreground'
                      }`}
                    >
                      {step.status}
                    </span>

                    {latestPlan.status === 'DRAFT' && editingStepId !== step.id && (
                      <button
                        onClick={() => handleStartEdit(step)}
                        title="Edit Step"
                        className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-800 rounded-lg transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}

                    <button
                      onClick={() => setExpandedStep(expandedStep === step.id ? null : step.id)}
                      className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                    >
                      {expandedStep === step.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {expandedStep === step.id && (
                  <div className="px-4 pb-4 pt-0 border-t border-border/60 space-y-4">
                    {editingStepId === step.id ? (
                      <div className="mt-3 space-y-3 p-3 bg-surface-800/80 border border-primary-500/30 rounded-xl">
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">Step Title</label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-3 py-1.5 bg-surface-900 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-muted-foreground mb-1">
                            Step Description
                          </label>
                          <textarea
                            value={editDesc}
                            onChange={(e) => setEditDesc(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-1.5 bg-surface-900 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:border-primary-500 resize-none"
                          />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                          <button
                            onClick={() => setEditingStepId(null)}
                            className="px-3 py-1.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-xs flex items-center gap-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            Cancel
                          </button>
                          <button
                            onClick={() =>
                              updateStepMutation.mutate({
                                planId: latestPlan.id,
                                stepId: step.id,
                                title: editTitle,
                                description: editDesc,
                              })
                            }
                            disabled={updateStepMutation.isPending}
                            className="px-3 py-1.5 bg-primary-600 hover:bg-primary-500 text-white rounded-lg text-xs font-medium flex items-center gap-1"
                          >
                            {updateStepMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            Save Step
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{step.description}</p>
                    )}

                    {/* Linked Evidence Section */}
                    <div className="pt-2 border-t border-border/40 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bookmark className="w-3.5 h-3.5 text-primary-400" />
                          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            Evidence Linked to Step {i + 1}
                          </h4>
                          <span className="text-xs text-muted-foreground">
                            ({step.evidence?.length ?? 0} item{(step.evidence?.length ?? 0) === 1 ? '' : 's'})
                          </span>
                        </div>
                        <button
                          onClick={() => navigate(`/projects/${projectId}/evidence`)}
                          className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1 font-medium"
                        >
                          <Search className="w-3 h-3" /> View Explorer
                        </button>
                      </div>

                      {(!step.evidence || step.evidence.length === 0) ? (
                        <div className="p-3 bg-surface-900/40 border border-border/40 rounded-xl text-center">
                          <p className="text-xs text-muted-foreground">
                            No evidence linked to this step yet. Approve your plan and click "Retrieve Evidence".
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2.5">
                          {step.evidence.map((ev) => {
                            const badge = STEP_CLASSIFICATION_BADGES[ev.classification];
                            const docName = ev.chunk?.document?.originalName || 'Document Chunk';
                            return (
                              <div
                                key={ev.id}
                                className="p-3 bg-surface-900/60 border border-border/60 rounded-xl space-y-2"
                              >
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold flex items-center gap-1 ${badge.color}`}
                                    >
                                      <badge.icon className="w-3 h-3" />
                                      {badge.label}
                                    </span>
                                    <span className="text-[11px] font-mono text-muted-foreground px-2 py-0.5 bg-surface-800 rounded">
                                      {(ev.relevanceScore * 100).toFixed(0)}% Relevance
                                    </span>
                                  </div>
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono text-[11px]">
                                    <FileText className="w-3 h-3 text-primary-400" />
                                    {docName}
                                    {ev.chunk?.chunkIndex != null && ` (Chunk #${ev.chunk.chunkIndex + 1})`}
                                  </span>
                                </div>
                                <p className="text-xs text-foreground font-mono bg-surface-950/50 p-2 rounded-lg border border-border/30 leading-relaxed">
                                  "{ev.content}"
                                </p>
                                {ev.analysis && (
                                  <p className="text-[11px] text-muted-foreground italic">
                                    AI Rationale: {ev.analysis}
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
