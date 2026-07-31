import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft, FileText, ClipboardList, Search, BookOpen,
  History, MessageSquare, ChevronRight, Loader2, AlertCircle
} from 'lucide-react';
import { projectsApi } from '@/api/projects';

const STATUS_STEPS = [
  { key: 'CREATED', label: 'Project Created' },
  { key: 'DOCUMENTS_UPLOADED', label: 'Documents Uploaded' },
  { key: 'PLAN_GENERATED', label: 'Plan Generated' },
  { key: 'PLAN_APPROVED', label: 'Plan Approved' },
  { key: 'EVIDENCE_RETRIEVED', label: 'Evidence Retrieved' },
  { key: 'BRIEF_GENERATED', label: 'Brief Generated' },
  { key: 'BRIEF_APPROVED', label: 'Brief Approved' },
];

const STATUS_ORDER = STATUS_STEPS.map((s) => s.key);

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.getById(id!),
    enabled: !!id,
  });

  const project = data?.data?.data?.project;

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="glass rounded-xl p-8 flex flex-col items-center text-center">
        <AlertCircle className="w-8 h-8 text-danger-400 mb-3" />
        <p className="text-foreground font-medium">Project not found</p>
        <button onClick={() => navigate('/projects')} className="mt-4 text-sm text-primary-400 hover:text-primary-300">
          Back to Projects
        </button>
      </div>
    );
  }

  const currentStatusIndex = STATUS_ORDER.indexOf(project.status);

  const actions = [
    {
      label: 'Documents',
      description: 'Upload and manage source documents',
      icon: FileText,
      to: `/projects/${id}/documents`,
      color: 'accent',
      available: true,
    },
    {
      label: 'Research Plan',
      description: 'Generate and approve research plan',
      icon: ClipboardList,
      to: `/projects/${id}/plan`,
      color: 'primary',
      available: currentStatusIndex >= 1,
    },
    {
      label: 'Evidence Explorer',
      description: 'Retrieve and classify evidence',
      icon: Search,
      to: `/projects/${id}/evidence`,
      color: 'warning',
      available: currentStatusIndex >= 3,
    },
    {
      label: 'Research Brief',
      description: 'Generate and review research brief',
      icon: BookOpen,
      to: `/projects/${id}/brief`,
      color: 'accent',
      available: currentStatusIndex >= 4,
    },
    {
      label: 'Version History',
      description: 'View all approved versions',
      icon: History,
      to: `/projects/${id}/versions`,
      color: 'primary',
      available: currentStatusIndex >= 6,
    },
    {
      label: 'Follow-up Questions',
      description: 'Ask follow-up questions on the brief',
      icon: MessageSquare,
      to: `/projects/${id}/followup`,
      color: 'primary',
      available: currentStatusIndex >= 6,
    },
    {
      label: 'Workflow Logs',
      description: 'View structured workflow execution logs',
      icon: History,
      to: `/projects/${id}/logs`,
      color: 'warning',
      available: true,
    },
  ];

  const colorMap: Record<string, string> = {
    accent: 'text-accent-400 bg-accent-600/10 border-accent-500/20 hover:bg-accent-600/20 hover:border-accent-500/40',
    primary: 'text-primary-400 bg-primary-600/10 border-primary-500/20 hover:bg-primary-600/20 hover:border-primary-500/40',
    warning: 'text-warning-400 bg-warning-600/10 border-warning-500/20 hover:bg-warning-600/20 hover:border-warning-500/40',
  };

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </button>
        <h1 className="text-2xl font-bold text-foreground">{project.title}</h1>
        {project.description && (
          <p className="text-muted-foreground mt-1">{project.description}</p>
        )}
        {project.researchQuestion && (
          <div className="mt-3 p-3 bg-primary-600/10 border border-primary-500/20 rounded-lg">
            <p className="text-xs text-primary-400 font-medium mb-0.5">Research Question</p>
            <p className="text-sm text-foreground">{project.researchQuestion}</p>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="glass rounded-xl p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">Workflow Progress</h2>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-surface-700">
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStatusIndex;
            const current = i === currentStatusIndex;
            return (
              <div key={step.key} className="flex items-center gap-1.5 shrink-0">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  current ? 'bg-primary-600/20 text-primary-300 border border-primary-500/30 font-semibold' :
                  done ? 'bg-accent-600/10 text-accent-400' :
                  'bg-surface-800 text-muted-foreground'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${done ? 'bg-accent-400' : 'bg-surface-600'}`} />
                  {step.label}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${done ? 'text-accent-400' : 'text-surface-600'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {actions.map((action) => (
          action.available ? (
            <Link
              key={action.label}
              to={action.to}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 group ${colorMap[action.color]}`}
            >
              <div className="w-10 h-10 rounded-lg bg-current/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                <action.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground truncate">{action.description}</p>
              </div>
              <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
            </Link>
          ) : (
            <div
              key={action.label}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-surface-800/30 opacity-40 cursor-not-allowed"
            >
              <div className="w-10 h-10 rounded-lg bg-surface-700 flex items-center justify-center">
                <action.icon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-muted-foreground">{action.label}</p>
                <p className="text-xs text-muted-foreground truncate">{action.description}</p>
              </div>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
