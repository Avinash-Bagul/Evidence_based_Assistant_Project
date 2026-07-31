import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Edit3,
  Check,
  X,
  FileText,
  Layers,
  AlertTriangle,
  HelpCircle,
  Bookmark,
  ShieldAlert,
  History,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { briefApi } from '@/api/brief';
import type { Claim } from '@/types';

const CLAIM_STATUS_CONFIG = {
  PENDING: { color: 'text-warning-400 bg-warning-600/10 border-warning-500/20' },
  ACCEPTED: { color: 'text-evidence-supporting bg-accent-600/10 border-accent-500/20' },
  REJECTED: { color: 'text-danger-400 bg-danger-600/10 border-danger-500/20' },
  EDITED: { color: 'text-primary-400 bg-primary-600/10 border-primary-500/20' },
};

const EVIDENCE_CLASSIFICATION_STYLES = {
  SUPPORTING: {
    color: 'text-evidence-supporting bg-accent-600/10 border-accent-500/30',
    border: 'border-l-accent-500',
    label: 'SUPPORTING',
  },
  CONFLICTING: {
    color: 'text-danger-400 bg-danger-600/10 border-danger-500/30',
    border: 'border-l-danger-500',
    label: 'CONFLICTING',
  },
  INSUFFICIENT: {
    color: 'text-warning-400 bg-warning-600/10 border-warning-500/30',
    border: 'border-l-warning-500',
    label: 'WEAK / INSUFFICIENT',
  },
};

function ClaimCard({ claim, briefId }: { claim: Claim; briefId: string }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(claim.content);

  const updateMutation = useMutation({
    mutationFn: ({ status, content }: { status: string; content?: string }) =>
      briefApi.updateClaim(briefId, claim.id, status, content),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brief'] });
      toast.success('Claim updated');
      setEditing(false);
    },
    onError: () => toast.error('Failed to update claim'),
  });

  const cfg = CLAIM_STATUS_CONFIG[claim.status];

  return (
    <div className="glass rounded-xl overflow-hidden border border-border/80">
      <div className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {editing ? (
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-surface-800 border border-primary-500/40 rounded-lg text-foreground text-sm focus:outline-none resize-none"
              />
            ) : (
              <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">{claim.content}</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-xs px-2.5 py-0.5 rounded-full border shrink-0 font-medium whitespace-nowrap ${cfg.color}`}>
                {claim.status}
              </span>
              {claim.evidence.length > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1.5 py-0.5 px-2.5 bg-primary-600/10 rounded-full border border-primary-500/20 font-medium transition-colors"
                >
                  <Bookmark className="w-3 h-3" />
                  {claim.evidence.length} Exact Citation{claim.evidence.length === 1 ? '' : 's'}
                  {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 self-end sm:self-start">
            {editing ? (
              <>
                <button
                  onClick={() => updateMutation.mutate({ status: 'EDITED', content: editContent })}
                  disabled={updateMutation.isPending}
                  className="p-1.5 text-accent-400 hover:bg-accent-600/10 rounded-lg transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setEditing(false); setEditContent(claim.content); }}
                  className="p-1.5 text-muted-foreground hover:bg-surface-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                {claim.status !== 'ACCEPTED' && (
                  <button
                    onClick={() => updateMutation.mutate({ status: 'ACCEPTED' })}
                    disabled={updateMutation.isPending}
                    className="p-1.5 text-evidence-supporting hover:bg-accent-600/10 rounded-lg transition-colors"
                    title="Accept Claim"
                  >
                    <CheckCircle className="w-4 h-4" />
                  </button>
                )}
                {claim.status !== 'REJECTED' && (
                  <button
                    onClick={() => updateMutation.mutate({ status: 'REJECTED' })}
                    disabled={updateMutation.isPending}
                    className="p-1.5 text-danger-400 hover:bg-danger-600/10 rounded-lg transition-colors"
                    title="Reject Claim"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setEditing(true)}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-surface-800 rounded-lg transition-colors"
                  title="Edit Claim"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expanded Exact Citations */}
      {expanded && claim.evidence.length > 0 && (
        <div className="border-t border-border/60 bg-surface-900/40 p-4 space-y-3">
          <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary-400" />
            Exact Citations & Document Sources
          </h4>
          <div className="space-y-3">
            {claim.evidence.map((ce) => {
              const ev = ce.evidence;
              const style = EVIDENCE_CLASSIFICATION_STYLES[ev.classification] || EVIDENCE_CLASSIFICATION_STYLES.INSUFFICIENT;
              const docName = ev.chunk?.document?.originalName || 'Source Document';

              return (
                <div
                  key={ce.id}
                  className={`p-3.5 bg-surface-800/90 border-l-4 ${style.border} rounded-r-xl border-y border-r border-border/50 space-y-2`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${style.color}`}>
                        {style.label}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground bg-surface-900 px-2 py-0.5 rounded border border-border/30">
                        {(ev.relevanceScore * 100).toFixed(0)}% Relevance
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground font-mono text-[11px]">
                      <span className="flex items-center gap-1 font-semibold text-primary-300">
                        <FileText className="w-3 h-3" /> {docName}
                      </span>
                      {ev.chunk?.chunkIndex != null && (
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3" /> Chunk #{ev.chunk.chunkIndex + 1}
                        </span>
                      )}
                      {ev.chunk?.pageNumber != null && <span>Page {ev.chunk.pageNumber}</span>}
                    </div>
                  </div>

                  {/* Verbatim Citation Excerpt */}
                  <div className="bg-surface-950/60 p-3 rounded-lg border border-border/30">
                    <p className="text-xs sm:text-sm text-foreground font-mono leading-relaxed">
                      "{ev.content}"
                    </p>
                  </div>

                  {ev.analysis && (
                    <p className="text-xs text-muted-foreground italic">
                      <span className="font-semibold not-italic">AI Rationale:</span> {ev.analysis}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResearchBriefPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [reviewComment, setReviewComment] = useState('');
  const [showReview, setShowReview] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'claims' | 'findings' | 'weak' | 'questions'>('summary');

  const { data, isLoading } = useQuery({
    queryKey: ['brief', projectId],
    queryFn: () => briefApi.get(projectId!),
    enabled: !!projectId,
  });

  const generateMutation = useMutation({
    mutationFn: () => briefApi.generate(projectId!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['brief', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success('Research brief generated');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Failed to generate brief');
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (action: 'APPROVE' | 'REJECT') =>
      briefApi.review(brief!.id, action, reviewComment || undefined),
    onSuccess: (_, action) => {
      qc.invalidateQueries({ queryKey: ['brief', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success(`Brief ${action.toLowerCase()}d`);
      setShowReview(false);
      setReviewComment('');
    },
    onError: () => toast.error('Review failed'),
  });

  const brief = data?.data?.data?.brief;

  const weakEvidenceClaims = brief?.claims.filter((c) =>
    c.evidence.some((ce) => ce.evidence.classification === 'INSUFFICIENT' || ce.evidence.classification === 'CONFLICTING')
  ) ?? [];

  const tabs = [
    { key: 'summary', label: 'Summary' },
    { key: 'claims', label: `Claims (${brief?.claims?.length ?? 0})` },
    { key: 'findings', label: 'Findings' },
    { key: 'weak', label: `Weak Evidence (${weakEvidenceClaims.length})` },
    { key: 'questions', label: 'Remaining Questions' },
  ] as const;

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
            <h1 className="text-2xl font-bold text-foreground">Research Brief</h1>
            <p className="text-muted-foreground mt-1">AI-generated draft brief with exact citations & evidence tracking</p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => navigate(`/projects/${projectId}/versions`)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-3.5 py-2.5 bg-surface-800 hover:bg-surface-700 border border-border text-foreground text-sm font-medium rounded-xl transition-all shrink-0"
            >
              <History className="w-4 h-4 text-primary-400" />
              Version & Review History
            </button>
            <button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-primary-600/20 shrink-0"
            >
              {generateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {brief ? 'Regenerate Brief' : 'Generate Brief'}
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : !brief ? (
        <div className="glass rounded-xl p-12 flex flex-col items-center text-center">
          <BookOpen className="w-10 h-10 text-muted-foreground mb-4" />
          <h3 className="text-sm font-medium text-foreground mb-1">No research brief draft yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Retrieve evidence first, then click "Generate Brief" to create an AI-synthesized brief with citations.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Brief Header */}
          <div className="glass rounded-xl p-5">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-foreground">{brief.title}</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {brief.claims.length} claims · Created {new Date(brief.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 whitespace-nowrap self-start ${
                brief.status === 'APPROVED' ? 'bg-accent-600/10 text-accent-400 border border-accent-500/20' :
                brief.status === 'REJECTED' ? 'bg-danger-600/10 text-danger-400 border border-danger-500/20' :
                brief.status === 'IN_REVIEW' ? 'bg-primary-600/10 text-primary-400 border border-primary-500/20' :
                'bg-warning-600/10 text-warning-400 border border-warning-500/20'
              }`}>
                {brief.status}
              </span>
            </div>

            {brief.status === 'DRAFT' && (
              <div className="mt-4 flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowReview(true)}
                  className="flex items-center justify-center gap-2 px-4 py-2 bg-accent-600/10 hover:bg-accent-600/20 border border-accent-500/20 text-accent-400 text-sm font-medium rounded-xl transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve Draft Brief
                </button>
                <button
                  onClick={() => reviewMutation.mutate('REJECT')}
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
              <div className="glass rounded-xl p-6 w-full max-w-md animate-[scale-in_0.2s_ease-out]">
                <h3 className="text-base font-semibold text-foreground mb-3">Approve Research Brief</h3>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={3}
                  placeholder="Optional review comment..."
                  className="w-full px-3.5 py-2.5 bg-surface-800 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none mb-4"
                />
                <div className="flex gap-3">
                  <button onClick={() => setShowReview(false)} className="flex-1 py-2.5 border border-border text-muted-foreground hover:text-foreground rounded-lg text-sm">
                    Cancel
                  </button>
                  <button
                    onClick={() => reviewMutation.mutate('APPROVED')}
                    disabled={reviewMutation.isPending}
                    className="flex-1 py-2.5 bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  >
                    {reviewMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Approve
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 bg-surface-800 rounded-xl p-1.5 border border-border/40">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 min-w-[120px] py-2 px-3 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                  activeTab === tab.key
                    ? 'bg-surface-700 text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'summary' && (
            <div className="space-y-4">
              {brief.executiveSummary && (
                <div className="glass rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary-400" />
                    Executive Summary
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{brief.executiveSummary}</p>
                </div>
              )}
              {brief.methodology && (
                <div className="glass rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent-400" />
                    Methodology
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{brief.methodology}</p>
                </div>
              )}
              {brief.references && (
                <div className="glass rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Source References
                  </h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed font-mono text-xs">{brief.references}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'claims' && (
            <div className="space-y-3">
              {brief.claims.length === 0 ? (
                <div className="glass rounded-xl p-8 text-center">
                  <p className="text-sm text-muted-foreground">No claims generated</p>
                </div>
              ) : (
                brief.claims.map((claim) => (
                  <ClaimCard key={claim.id} claim={claim} briefId={brief.id} />
                ))
              )}
            </div>
          )}

          {activeTab === 'findings' && (
            <div className="glass rounded-xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary-400" />
                Detailed Findings & Evidence Synthesis
              </h3>
              <div className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed bg-surface-900/60 p-4 rounded-xl border border-border/40 font-sans">
                {brief.findings || 'No findings available.'}
              </div>
            </div>
          )}

          {activeTab === 'weak' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-warning-600/10 border border-warning-500/20 rounded-xl">
                <ShieldAlert className="w-5 h-5 text-warning-400 mt-0.5 shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-warning-400">Weak & Conflicting Evidence Analysis</h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Claims or research steps below are supported by weak (insufficient) or conflicting evidence in the source documents.
                  </p>
                </div>
              </div>

              {weakEvidenceClaims.length === 0 ? (
                <div className="glass rounded-xl p-8 flex flex-col items-center text-center">
                  <CheckCircle className="w-8 h-8 text-accent-400 mb-2" />
                  <p className="text-sm font-medium text-foreground">No weak or conflicting evidence claims flagged</p>
                  <p className="text-xs text-muted-foreground mt-1">All claims are backed by solid supporting evidence.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {weakEvidenceClaims.map((claim) => (
                    <ClaimCard key={claim.id} claim={claim} briefId={brief.id} />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'questions' && (
            <div className="glass rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <HelpCircle className="w-5 h-5 text-warning-400" />
                <h3 className="text-sm font-semibold text-foreground">Remaining Questions & Evidence Gaps</h3>
              </div>
              <p className="text-xs text-muted-foreground">
                These questions highlight areas where document evidence is incomplete or warrants further investigation:
              </p>
              <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed bg-surface-900/60 p-4 rounded-xl border border-border/40 font-mono text-xs">
                {brief.openQuestions || 'No remaining open questions logged.'}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

