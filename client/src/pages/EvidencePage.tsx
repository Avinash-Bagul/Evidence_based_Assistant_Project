import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  Filter,
  FileText,
  Bookmark,
  Sparkles,
  Layers,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { evidenceApi } from '@/api/evidence';
import { planApi } from '@/api/plan';
import type { Evidence, EvidenceClassification, ResearchPlan } from '@/types';

const CLASSIFICATION_CONFIG = {
  SUPPORTING: {
    label: 'Supporting Evidence',
    badge: 'SUPPORTING',
    color: 'text-evidence-supporting bg-accent-600/10 border-accent-500/30',
    highlightBorder: 'border-l-accent-500',
    icon: CheckCircle,
    iconColor: 'text-evidence-supporting',
  },
  CONFLICTING: {
    label: 'Conflicting Evidence',
    badge: 'CONFLICTING',
    color: 'text-danger-400 bg-danger-600/10 border-danger-500/30',
    highlightBorder: 'border-l-danger-500',
    icon: AlertCircle,
    iconColor: 'text-danger-400',
  },
  INSUFFICIENT: {
    label: 'Insufficient Evidence',
    badge: 'INSUFFICIENT',
    color: 'text-warning-400 bg-warning-600/10 border-warning-500/30',
    highlightBorder: 'border-l-warning-500',
    icon: MinusCircle,
    iconColor: 'text-warning-400',
  },
};

export default function EvidencePage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<EvidenceClassification | ''>('');
  const [selectedStepId, setSelectedStepId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['evidence', projectId, filter],
    queryFn: () => evidenceApi.list(projectId!, filter || undefined),
    enabled: !!projectId,
  });

  const { data: planData } = useQuery({
    queryKey: ['plan', projectId],
    queryFn: () => planApi.get(projectId!),
    enabled: !!projectId,
  });

  const retrieveMutation = useMutation({
    mutationFn: () => evidenceApi.retrieve(projectId!),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['evidence', projectId] });
      qc.invalidateQueries({ queryKey: ['plan', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      toast.success(`${res.data.data?.totalEvidence ?? 0} evidence items retrieved & classified`);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Evidence retrieval failed');
    },
  });

  const rawEvidenceList: Evidence[] = data?.data?.data?.evidence ?? [];
  const plans: ResearchPlan[] = planData?.data?.data?.plans ?? [];
  const steps = plans[0]?.steps ?? [];

  const counts = rawEvidenceList.reduce(
    (acc, e) => {
      acc[e.classification] = (acc[e.classification] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const filteredEvidence = useMemo(() => {
    return rawEvidenceList.filter((item) => {
      if (selectedStepId && item.stepId !== selectedStepId) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const contentMatch = item.content.toLowerCase().includes(q);
        const analysisMatch = item.analysis.toLowerCase().includes(q);
        const stepMatch = item.step?.title.toLowerCase().includes(q);
        const docMatch = item.chunk?.document?.originalName.toLowerCase().includes(q);
        return contentMatch || analysisMatch || stepMatch || docMatch;
      }
      return true;
    });
  }, [rawEvidenceList, selectedStepId, searchQuery]);

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
            <h1 className="text-2xl font-bold text-foreground">Evidence Explorer</h1>
            <p className="text-muted-foreground mt-1">
              Retrieve, search, classify, and trace evidence linked to your research plan steps
            </p>
          </div>
          <button
            onClick={() => retrieveMutation.mutate()}
            disabled={retrieveMutation.isPending}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-primary-600/20 shrink-0"
          >
            {retrieveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            {retrieveMutation.isPending ? 'Retrieving Evidence...' : 'Retrieve Evidence'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {rawEvidenceList.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {(Object.keys(CLASSIFICATION_CONFIG) as EvidenceClassification[]).map((cls) => {
            const cfg = CLASSIFICATION_CONFIG[cls];
            return (
              <button
                key={cls}
                onClick={() => setFilter(filter === cls ? '' : cls)}
                className={`glass rounded-xl p-4 text-left transition-all border ${
                  filter === cls ? cfg.color : 'border-border hover:border-primary-500/30'
                }`}
              >
                <cfg.icon className={`w-5 h-5 mb-2 ${cfg.iconColor}`} />
                <p className="text-2xl font-bold text-foreground">{counts[cls] ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{cfg.label}</p>
              </button>
            );
          })}
        </div>
      )}

      {/* Controls & Filter Bar */}
      {rawEvidenceList.length > 0 && (
        <div className="glass rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search evidence content, steps, document names..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 bg-surface-800 border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Step Filter Dropdown */}
            {steps.length > 0 && (
              <select
                value={selectedStepId}
                onChange={(e) => setSelectedStepId(e.target.value)}
                className="px-3 py-2 bg-surface-800 border border-border rounded-xl text-foreground text-xs focus:outline-none focus:ring-2 focus:ring-primary-500/40 shrink-0"
              >
                <option value="">All Research Steps ({steps.length})</option>
                {steps.map((st, idx) => (
                  <option key={st.id} value={st.id}>
                    Step {idx + 1}: {st.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Classification Pills */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/40">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground mr-1">Classification:</span>
            {(['', 'SUPPORTING', 'CONFLICTING', 'INSUFFICIENT'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1 rounded-full transition-all ${
                  filter === f
                    ? 'bg-primary-600/20 text-primary-400 border border-primary-500/30 font-medium'
                    : 'bg-surface-800 text-muted-foreground hover:text-foreground'
                }`}
              >
                {f || 'All Types'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Evidence List */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : filteredEvidence.length === 0 ? (
        <div className="glass rounded-xl p-12 flex flex-col items-center text-center">
          <Search className="w-10 h-10 text-muted-foreground mb-4" />
          <h3 className="text-sm font-medium text-foreground mb-1">
            {rawEvidenceList.length === 0 ? 'No evidence retrieved yet' : 'No matching evidence found'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            {rawEvidenceList.length === 0
              ? 'Approve your research plan, then click "Retrieve Evidence" to run semantic search across source documents.'
              : 'Try clearing your search query or step filter to see all evidence.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredEvidence.map((item) => {
            const cfg = CLASSIFICATION_CONFIG[item.classification];
            const isExpanded = expanded === item.id;
            const docName = item.chunk?.document?.originalName || 'Source Document';

            return (
              <div
                key={item.id}
                className="glass border border-border/80 rounded-2xl overflow-hidden transition-all duration-200 hover:border-primary-500/30"
              >
                {/* Evidence Item Header */}
                <button
                  onClick={() => setExpanded(isExpanded ? null : item.id)}
                  className="w-full flex items-start gap-3 sm:gap-4 p-4 sm:p-5 text-left hover:bg-surface-800/20 transition-colors"
                >
                  <cfg.icon className={`w-5 h-5 mt-0.5 shrink-0 ${cfg.iconColor}`} />
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Content snippet */}
                    <p className="text-sm sm:text-base text-foreground font-medium leading-relaxed">
                      "{item.content}"
                    </p>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground pt-1">
                      <span
                        className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold shrink-0 whitespace-nowrap ${cfg.color}`}
                      >
                        {cfg.badge}
                      </span>

                      <span className="flex items-center gap-1 px-2 py-0.5 bg-surface-800/80 rounded-lg border border-border/40 font-mono text-[11px]">
                        {(item.relevanceScore * 100).toFixed(0)}% Relevance
                      </span>

                      {item.step && (
                        <span className="flex items-center gap-1 px-2.5 py-0.5 bg-primary-600/10 border border-primary-500/20 text-primary-300 rounded-lg truncate max-w-[280px]">
                          <Bookmark className="w-3 h-3 text-primary-400 shrink-0" />
                          Step: {item.step.title}
                        </span>
                      )}

                      <span className="flex items-center gap-1 text-muted-foreground truncate max-w-[200px]">
                        <FileText className="w-3 h-3 shrink-0" />
                        {docName}
                      </span>
                    </div>
                  </div>

                  <div className="p-1 rounded-lg hover:bg-surface-800 text-muted-foreground shrink-0 mt-0.5">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </button>

                {/* Expanded Details & Source Highlighting */}
                {isExpanded && (
                  <div className="px-4 sm:px-5 pb-5 pt-3 border-t border-border/60 bg-surface-900/40 space-y-4">
                    {/* Highlighted Source Quote */}
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary-400" />
                        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                          Source Document & Highlighted Excerpt
                        </p>
                      </div>
                      <div
                        className={`p-3.5 bg-surface-800/90 border-l-4 ${cfg.highlightBorder} rounded-r-xl border-y border-r border-border/50`}
                      >
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span className="font-semibold text-primary-300">{docName}</span>
                          <span className="flex items-center gap-2 font-mono text-[11px]">
                            {item.chunk?.chunkIndex != null && (
                              <span className="flex items-center gap-1">
                                <Layers className="w-3 h-3" /> Chunk #{item.chunk.chunkIndex + 1}
                              </span>
                            )}
                            {item.chunk?.pageNumber != null && <span>Page {item.chunk.pageNumber}</span>}
                          </span>
                        </div>
                        <div className="text-xs sm:text-sm text-foreground font-mono leading-relaxed bg-surface-950/60 p-3 rounded-lg border border-border/30">
                          <p>{item.content}</p>
                        </div>
                      </div>
                    </div>

                    {/* AI Classification Analysis */}
                    {item.analysis && (
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-accent-400" />
                          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                            AI Classification Rationale
                          </p>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground bg-surface-800/60 p-3 rounded-xl border border-border/40 leading-relaxed">
                          {item.analysis}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

