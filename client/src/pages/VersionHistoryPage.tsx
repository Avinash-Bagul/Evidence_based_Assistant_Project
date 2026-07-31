import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  History,
  Loader2,
  ChevronDown,
  ChevronUp,
  Plus,
  GitCompare,
  RotateCcw,
  CheckCircle,
  XCircle,
  Edit3,
  User,
  MessageSquare,
  FileText,
  Bookmark,
  Calendar,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { briefApi } from '@/api/brief';
import { projectsApi } from '@/api/projects';
import type { BriefVersion, ResearchBrief } from '@/types';

interface ParsedSnapshot {
  title?: string;
  executiveSummary?: string;
  methodology?: string;
  findings?: string;
  openQuestions?: string;
  references?: string;
  claims?: Array<{ content: string; status: string }>;
  [key: string]: unknown;
}

export default function VersionHistoryPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [activeTab, setActiveTab] = useState<'versions' | 'reviews'>('versions');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [briefId, setBriefId] = useState<string | null>(null);

  // Save Version Modal state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [changeLogNote, setChangeLogNote] = useState('');

  // Compare Versions Modal state
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareV1Id, setCompareV1Id] = useState<string>('');
  const [compareV2Id, setCompareV2Id] = useState<string>('');

  // Restore Modal state
  const [restoreTargetVersion, setRestoreTargetVersion] = useState<BriefVersion | null>(null);

  // Get Brief data
  const { data: briefData, isLoading: briefLoading } = useQuery({
    queryKey: ['brief', projectId],
    queryFn: () => briefApi.get(projectId!),
    enabled: !!projectId,
    select: (d) => {
      const id = d.data?.data?.brief?.id;
      if (id) setBriefId(id);
      return d;
    },
  });

  const activeBrief: ResearchBrief | undefined = briefData?.data?.data?.brief;

  // Get Versions
  const { data: versionsData, isLoading: versionsLoading } = useQuery({
    queryKey: ['versions', briefId],
    queryFn: () => briefApi.getVersions(briefId!),
    enabled: !!briefId,
  });

  // Get Reviews
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', projectId],
    queryFn: () => projectsApi.getReviews(projectId!),
    enabled: !!projectId,
  });

  const versions: BriefVersion[] = versionsData?.data?.data?.versions ?? [];
  const reviews = reviewsData?.data?.data?.reviews ?? [];

  // Mutations
  const saveMutation = useMutation({
    mutationFn: () => briefApi.saveVersion(briefId!, changeLogNote || undefined),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['versions', briefId] });
      toast.success(res.data.message || 'Version snapshot saved!');
      setShowSaveModal(false);
      setChangeLogNote('');
    },
    onError: () => toast.error('Failed to save version snapshot'),
  });

  const restoreMutation = useMutation({
    mutationFn: (versionId: string) => briefApi.restoreVersion(briefId!, versionId),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['brief', projectId] });
      qc.invalidateQueries({ queryKey: ['versions', briefId] });
      toast.success(res.data.message || 'Brief restored to selected version!');
      setRestoreTargetVersion(null);
    },
    onError: () => toast.error('Failed to restore version'),
  });

  const parseContent = (content: string): ParsedSnapshot => {
    try {
      return JSON.parse(content);
    } catch {
      return { executiveSummary: content };
    }
  };

  const getSnapshotObj = (vId: string): ParsedSnapshot | null => {
    if (vId === 'current' && activeBrief) {
      return {
        title: activeBrief.title,
        executiveSummary: activeBrief.executiveSummary,
        methodology: activeBrief.methodology,
        findings: activeBrief.findings,
        openQuestions: activeBrief.openQuestions,
        references: activeBrief.references,
        claims: activeBrief.claims.map((c) => ({ content: c.content, status: c.status })),
      };
    }
    const target = versions.find((v) => v.id === vId);
    return target ? parseContent(target.content) : null;
  };

  const snapshot1 = compareV1Id ? getSnapshotObj(compareV1Id) : null;
  const snapshot2 = compareV2Id ? getSnapshotObj(compareV2Id) : null;

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
            <h1 className="text-2xl font-bold text-foreground">Version & Review History</h1>
            <p className="text-muted-foreground mt-1">
              Save snapshots, compare versions, restore previous drafts, and audit full review history
            </p>
          </div>
          {briefId && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => {
                  if (versions.length >= 2) {
                    setCompareV1Id(versions[1].id);
                    setCompareV2Id(versions[0].id);
                  } else if (versions.length === 1) {
                    setCompareV1Id(versions[0].id);
                    setCompareV2Id('current');
                  }
                  setShowCompareModal(true);
                }}
                disabled={versions.length === 0}
                className="flex items-center gap-2 px-3.5 py-2 bg-surface-800 hover:bg-surface-700 disabled:opacity-40 border border-border text-foreground text-xs font-medium rounded-xl transition-all"
              >
                <GitCompare className="w-4 h-4 text-primary-400" />
                Compare Versions
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium rounded-xl transition-all shadow-lg shadow-primary-600/20"
              >
                <Plus className="w-4 h-4" />
                Save New Version
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-800 rounded-xl p-1.5 border border-border/40 w-full sm:w-auto self-start">
        <button
          onClick={() => setActiveTab('versions')}
          className={`flex-1 sm:flex-initial px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            activeTab === 'versions'
              ? 'bg-surface-700 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Version Snapshots ({versions.length})
        </button>
        <button
          onClick={() => setActiveTab('reviews')}
          className={`flex-1 sm:flex-initial px-4 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
            activeTab === 'reviews'
              ? 'bg-surface-700 text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Full Review History ({reviews.length})
        </button>
      </div>

      {/* Versions Tab */}
      {activeTab === 'versions' && (
        <>
          {briefLoading || versionsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
            </div>
          ) : !briefId ? (
            <div className="glass rounded-xl p-12 flex flex-col items-center text-center">
              <History className="w-10 h-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium text-foreground">No research brief found</p>
              <p className="text-xs text-muted-foreground mt-1">Generate a research brief first to track versions.</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="glass rounded-xl p-12 flex flex-col items-center text-center">
              <History className="w-10 h-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium text-foreground">No versions saved yet</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">Click "Save New Version" to capture a snapshot.</p>
              <button
                onClick={() => setShowSaveModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-xs font-medium rounded-xl"
              >
                <Plus className="w-4 h-4" /> Save Initial Version
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => {
                const parsed = parseContent(version.content);
                const isExpanded = expanded === version.id;

                return (
                  <div key={version.id} className="glass rounded-2xl overflow-hidden border border-border/80 transition-all hover:border-primary-500/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-5 gap-3">
                      <button
                        onClick={() => setExpanded(isExpanded ? null : version.id)}
                        className="flex-1 flex items-start sm:items-center gap-3 sm:gap-4 text-left min-w-0"
                      >
                        <div className="w-10 h-10 rounded-xl bg-primary-600/20 border border-primary-500/30 flex items-center justify-center shrink-0">
                          <span className="text-sm font-bold text-primary-400">v{version.versionNumber}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-foreground">Version {version.versionNumber}</p>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(version.createdAt).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate font-mono">
                            {version.changeLog || 'Version snapshot'}
                          </p>
                        </div>
                      </button>

                      <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40 justify-end">
                        <button
                          onClick={() => {
                            setCompareV1Id(version.id);
                            setCompareV2Id('current');
                            setShowCompareModal(true);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 bg-surface-800 hover:bg-surface-700 text-foreground text-xs font-medium rounded-lg transition-colors border border-border/40"
                        >
                          <GitCompare className="w-3.5 h-3.5 text-primary-400" />
                          Compare
                        </button>
                        <button
                          onClick={() => setRestoreTargetVersion(version)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-accent-600/10 hover:bg-accent-600/20 text-accent-400 text-xs font-medium rounded-lg transition-colors border border-accent-500/20"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                        <button
                          onClick={() => setExpanded(isExpanded ? null : version.id)}
                          className="p-1.5 text-muted-foreground hover:text-foreground rounded-lg"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Snapshot Content Details */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-border/60 bg-surface-900/40 space-y-4">
                        {parsed.title && (
                          <div>
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Title</span>
                            <p className="text-xs font-semibold text-foreground">{parsed.title}</p>
                          </div>
                        )}
                        {parsed.executiveSummary && (
                          <div>
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Executive Summary</span>
                            <p className="text-xs text-muted-foreground bg-surface-800/80 p-3 rounded-xl border border-border/40 whitespace-pre-wrap leading-relaxed">
                              {parsed.executiveSummary}
                            </p>
                          </div>
                        )}
                        {parsed.findings && (
                          <div>
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Findings</span>
                            <p className="text-xs text-muted-foreground bg-surface-800/80 p-3 rounded-xl border border-border/40 whitespace-pre-wrap leading-relaxed">
                              {parsed.findings}
                            </p>
                          </div>
                        )}
                        {parsed.openQuestions && (
                          <div>
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Open Questions</span>
                            <p className="text-xs text-muted-foreground bg-surface-800/80 p-3 rounded-xl border border-border/40 whitespace-pre-wrap leading-relaxed font-mono">
                              {parsed.openQuestions}
                            </p>
                          </div>
                        )}
                        {parsed.claims && parsed.claims.length > 0 && (
                          <div>
                            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Claims ({parsed.claims.length})</span>
                            <div className="space-y-2">
                              {parsed.claims.map((c, idx) => (
                                <div key={idx} className="p-2.5 bg-surface-800/60 rounded-lg text-xs text-foreground border border-border/30">
                                  <span className="text-primary-400 font-mono mr-2">#{idx + 1}</span>
                                  {c.content}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Full Review History Audit Log Tab */}
      {activeTab === 'reviews' && (
        <div>
          {reviewsLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
            </div>
          ) : reviews.length === 0 ? (
            <div className="glass rounded-xl p-12 flex flex-col items-center text-center">
              <History className="w-10 h-10 text-muted-foreground mb-4" />
              <p className="text-sm font-medium text-foreground">No review history logged yet</p>
              <p className="text-xs text-muted-foreground mt-1">Review actions (approvals, rejections) on research plans and briefs will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((rev) => {
                const isApprove = rev.action === 'APPROVE';
                const isReject = rev.action === 'REJECT';
                const isEdit = rev.action === 'EDIT';

                return (
                  <div key={rev.id} className="glass rounded-xl p-4 sm:p-5 border border-border/80 flex items-start gap-4">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      isApprove ? 'bg-accent-600/20 text-accent-400 border border-accent-500/30' :
                      isReject ? 'bg-danger-600/20 text-danger-400 border border-danger-500/30' :
                      'bg-primary-600/20 text-primary-400 border border-primary-500/30'
                    }`}>
                      {isApprove && <CheckCircle className="w-5 h-5" />}
                      {isReject && <XCircle className="w-5 h-5" />}
                      {isEdit && <Edit3 className="w-5 h-5" />}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                            isApprove ? 'bg-accent-600/10 text-accent-400 border-accent-500/30' :
                            isReject ? 'bg-danger-600/10 text-danger-400 border-danger-500/30' :
                            'bg-primary-600/10 text-primary-400 border-primary-500/30'
                          }`}>
                            {rev.action}D
                          </span>
                          <span className="text-xs font-semibold text-foreground flex items-center gap-1">
                            <Bookmark className="w-3.5 h-3.5 text-primary-400" />
                            {rev.targetType === 'ResearchPlan' ? 'Research Plan' : 'Research Brief'}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3" />
                          {new Date(rev.createdAt).toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>Reviewed by <strong className="text-foreground">{rev.user.name}</strong> ({rev.user.email})</span>
                      </div>

                      {rev.comment && (
                        <div className="flex items-start gap-2 bg-surface-900/60 p-3 rounded-lg border border-border/30 text-xs text-foreground mt-2">
                          <MessageSquare className="w-3.5 h-3.5 text-primary-400 shrink-0 mt-0.5" />
                          <p className="leading-relaxed">"{rev.comment}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Save Version Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="glass rounded-xl p-5 sm:p-6 w-full max-w-md animate-[scale-in_0.2s_ease-out] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Plus className="w-4 h-4 text-primary-400" />
                Save Version Snapshot
              </h3>
              <button onClick={() => setShowSaveModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              Capture a new version snapshot of the current research brief draft, executive summary, findings, and claims.
            </p>

            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">Change Log Note</label>
              <textarea
                value={changeLogNote}
                onChange={(e) => setChangeLogNote(e.target.value)}
                rows={3}
                placeholder="e.g., Updated executive summary with diagnostic performance metrics..."
                className="w-full px-3 py-2 bg-surface-800 border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2.5 border border-border text-muted-foreground hover:text-foreground rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                className="flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compare Versions Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="glass rounded-2xl p-5 sm:p-6 w-full max-w-5xl max-h-[90vh] flex flex-col animate-[scale-in_0.2s_ease-out] space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-primary-400" />
                <h3 className="text-base font-bold text-foreground">Compare Version Side-by-Side</h3>
              </div>
              <button onClick={() => setShowCompareModal(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-surface-900/60 p-3 rounded-xl border border-border/40">
              <div>
                <label className="block text-xs font-semibold text-primary-400 mb-1">Version A (Left Side)</label>
                <select
                  value={compareV1Id}
                  onChange={(e) => setCompareV1Id(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-800 border border-border rounded-xl text-foreground text-xs focus:outline-none"
                >
                  <option value="">Select Version A...</option>
                  <option value="current">Current Active Brief</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} — {v.changeLog || 'Version snapshot'} ({new Date(v.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-accent-400 mb-1">Version B (Right Side)</label>
                <select
                  value={compareV2Id}
                  onChange={(e) => setCompareV2Id(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-800 border border-border rounded-xl text-foreground text-xs focus:outline-none"
                >
                  <option value="">Select Version B...</option>
                  <option value="current">Current Active Brief</option>
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      v{v.versionNumber} — {v.changeLog || 'Version snapshot'} ({new Date(v.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison Grid */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {!snapshot1 || !snapshot2 ? (
                <div className="p-8 text-center text-muted-foreground text-xs">
                  Select two versions above to perform a side-by-side comparison.
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Title Diff */}
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Title</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-surface-900/60 border border-border/60 rounded-xl text-xs text-foreground font-semibold">
                        {snapshot1.title || 'Untitled'}
                      </div>
                      <div className="p-3 bg-surface-900/60 border border-border/60 rounded-xl text-xs text-foreground font-semibold">
                        {snapshot2.title || 'Untitled'}
                      </div>
                    </div>
                  </div>

                  {/* Executive Summary Diff */}
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Executive Summary</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-surface-900/60 border border-border/60 rounded-xl text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {snapshot1.executiveSummary || 'No summary'}
                      </div>
                      <div className="p-3 bg-surface-900/60 border border-border/60 rounded-xl text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {snapshot2.executiveSummary || 'No summary'}
                      </div>
                    </div>
                  </div>

                  {/* Findings Diff */}
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Findings</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-surface-900/60 border border-border/60 rounded-xl text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {snapshot1.findings || 'No findings'}
                      </div>
                      <div className="p-3 bg-surface-900/60 border border-border/60 rounded-xl text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {snapshot2.findings || 'No findings'}
                      </div>
                    </div>
                  </div>

                  {/* Open Questions Diff */}
                  <div>
                    <h4 className="text-xs font-bold text-foreground uppercase tracking-wider mb-2">Open Questions</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3 bg-surface-900/60 border border-border/60 rounded-xl text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {snapshot1.openQuestions || 'None'}
                      </div>
                      <div className="p-3 bg-surface-900/60 border border-border/60 rounded-xl text-xs font-mono text-muted-foreground whitespace-pre-wrap leading-relaxed">
                        {snapshot2.openQuestions || 'None'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {restoreTargetVersion && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="glass rounded-xl p-5 sm:p-6 w-full max-w-md animate-[scale-in_0.2s_ease-out] space-y-4">
            <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-accent-400" />
              Restore Version v{restoreTargetVersion.versionNumber}?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Restoring will revert the active research brief title, executive summary, findings, methodology, and open questions back to version <strong>v{restoreTargetVersion.versionNumber}</strong>.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setRestoreTargetVersion(null)}
                className="flex-1 py-2.5 border border-border text-muted-foreground hover:text-foreground rounded-xl text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => restoreMutation.mutate(restoreTargetVersion.id)}
                disabled={restoreMutation.isPending}
                className="flex-1 py-2.5 bg-accent-600 hover:bg-accent-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              >
                {restoreMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

