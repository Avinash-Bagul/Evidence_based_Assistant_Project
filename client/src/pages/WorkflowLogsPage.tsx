import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Activity, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import apiClient from '@/api/client';
import type { WorkflowLog } from '@/types';

const STATUS_CONFIG = {
  COMPLETED: { icon: CheckCircle, color: 'text-evidence-supporting' },
  FAILED: { icon: XCircle, color: 'text-danger-400' },
  STARTED: { icon: Clock, color: 'text-warning-400' },
};

export default function WorkflowLogsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['workflow-logs', projectId],
    queryFn: () => apiClient.get<{ success: boolean; data: { logs: WorkflowLog[] } }>(`/workflow/${projectId}/logs`),
    enabled: !!projectId,
    refetchInterval: 10000,
  });

  const logs: WorkflowLog[] = data?.data?.data?.logs ?? [];

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
        <h1 className="text-2xl font-bold text-foreground">Workflow Logs</h1>
        <p className="text-muted-foreground mt-1">Structured logs for every workflow stage</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
        </div>
      ) : logs.length === 0 ? (
        <div className="glass rounded-xl p-12 flex flex-col items-center text-center">
          <Activity className="w-10 h-10 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No workflow logs yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => {
            const cfg = STATUS_CONFIG[log.status] ?? STATUS_CONFIG.STARTED;
            return (
              <div key={log.id} className="glass rounded-xl p-4 flex items-start gap-4">
                <cfg.icon className={`w-4 h-4 mt-0.5 shrink-0 ${cfg.color}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-sm font-medium text-foreground">{log.stage}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${cfg.color} bg-surface-800`}>
                      {log.status}
                    </span>
                    {log.duration != null && (
                      <span className="text-xs text-muted-foreground">{log.duration}ms</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(log.createdAt).toLocaleString()}
                  </p>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <pre className="mt-2 text-xs text-muted-foreground bg-surface-800 rounded-lg p-2 overflow-auto max-h-32 whitespace-pre-wrap">
                      {JSON.stringify(log.metadata, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
