import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, Send, Loader2, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { briefApi } from '@/api/brief';

interface FollowUpResult {
  analysis: {
    requiresNewEvidence: boolean;
    searchQueries: string[];
    updatedSections: string[];
    analysis: string;
  };
  versionId: string;
}

export default function FollowUpPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [question, setQuestion] = useState('');
  const [results, setResults] = useState<FollowUpResult[]>([]);

  const { data: briefData, isLoading: briefLoading } = useQuery({
    queryKey: ['brief', projectId],
    queryFn: () => briefApi.get(projectId!),
    enabled: !!projectId,
  });

  const brief = briefData?.data?.data?.brief;

  const followUpMutation = useMutation({
    mutationFn: (q: string) => briefApi.followUp(brief!.id, q),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['versions'] });
      const result = res.data?.data as FollowUpResult;
      setResults((prev) => [result, ...prev]);
      setQuestion('');
      toast.success('Follow-up processed. New version saved.');
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Follow-up failed');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !brief) return;
    followUpMutation.mutate(question.trim());
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
        <h1 className="text-2xl font-bold text-foreground">Follow-up Questions</h1>
        <p className="text-muted-foreground mt-1">Ask follow-up questions to refine the research brief</p>
      </div>

      {briefLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : !brief ? (
        <div className="glass rounded-xl p-12 flex flex-col items-center text-center">
          <MessageSquare className="w-10 h-10 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No research brief found. Generate a brief first.</p>
        </div>
      ) : (
        <>
          {/* Brief Context */}
          <div className="glass rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Current Brief</p>
            <p className="text-sm font-medium text-foreground">{brief.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${
              brief.status === 'APPROVED' ? 'bg-accent-600/10 text-accent-400' : 'bg-warning-600/10 text-warning-400'
            }`}>
              {brief.status}
            </span>
          </div>

          {/* Question Input */}
          <form onSubmit={handleSubmit} className="glass rounded-xl p-5">
            <label className="block text-sm font-medium text-foreground mb-2">Ask a Follow-up Question</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder="e.g. Only consider studies after 2022. What are the limitations of AI diagnostics?"
              className="w-full px-3.5 py-2.5 bg-surface-800 border border-border rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 resize-none mb-3"
            />
            <button
              type="submit"
              disabled={!question.trim() || followUpMutation.isPending}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-all shadow-lg shadow-primary-600/20 shrink-0"
            >
              {followUpMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {followUpMutation.isPending ? 'Processing...' : 'Submit Question'}
            </button>
          </form>

          {/* Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Follow-up Results</h2>
              {results.map((result, i) => (
                <div key={i} className="glass rounded-xl p-5 space-y-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary-400" />
                    <span className="text-sm font-medium text-foreground">Analysis</span>
                    <span className="text-xs text-muted-foreground ml-auto">Version saved</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{result.analysis.analysis}</p>
                  {result.analysis.requiresNewEvidence && (
                    <div className="bg-warning-600/10 border border-warning-500/20 rounded-lg p-3">
                      <p className="text-xs text-warning-400 font-medium mb-1">Requires New Evidence</p>
                      <p className="text-xs text-muted-foreground">
                        Search queries: {result.analysis.searchQueries.join(', ')}
                      </p>
                    </div>
                  )}
                  {result.analysis.updatedSections.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground">
                        Sections to update: {result.analysis.updatedSections.join(', ')}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
