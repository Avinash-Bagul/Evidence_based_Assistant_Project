import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { FolderOpen, Plus, FileText, ClipboardCheck, TrendingUp, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { projectsApi } from '@/api/projects';
import type { Project } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'text-muted-foreground bg-surface-800',
  DOCUMENTS_UPLOADED: 'text-accent-400 bg-accent-600/10',
  PLAN_GENERATED: 'text-primary-400 bg-primary-600/10',
  PLAN_APPROVED: 'text-primary-300 bg-primary-600/15',
  EVIDENCE_RETRIEVED: 'text-warning-400 bg-warning-600/10',
  BRIEF_GENERATED: 'text-accent-400 bg-accent-600/10',
  BRIEF_APPROVED: 'text-evidence-supporting bg-accent-600/10',
  COMPLETED: 'text-evidence-supporting bg-accent-600/15',
};

const STATUS_LABELS: Record<string, string> = {
  CREATED: 'Created',
  DOCUMENTS_UPLOADED: 'Docs Uploaded',
  PLAN_GENERATED: 'Plan Generated',
  PLAN_APPROVED: 'Plan Approved',
  EVIDENCE_RETRIEVED: 'Evidence Retrieved',
  BRIEF_GENERATED: 'Brief Generated',
  BRIEF_APPROVED: 'Brief Approved',
  COMPLETED: 'Completed',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(1, 50),
  });

  const projects: Project[] = data?.data?.data ?? [];

  const totalDocs = projects.reduce((sum, p) => sum + (p._count?.documents ?? 0), 0);
  const totalBriefs = projects.reduce((sum, p) => sum + (p._count?.researchBriefs ?? 0), 0);
  const approved = projects.filter((p) => p.status === 'BRIEF_APPROVED' || p.status === 'COMPLETED').length;

  const stats = [
    { label: 'Active Projects', value: String(projects.length), icon: FolderOpen, color: 'text-primary-400' },
    { label: 'Documents', value: String(totalDocs), icon: FileText, color: 'text-accent-400' },
    { label: 'Research Briefs', value: String(totalBriefs), icon: ClipboardCheck, color: 'text-warning-400' },
    { label: 'Approved', value: String(approved), icon: TrendingUp, color: 'text-evidence-supporting' },
  ];

  const recentProjects = projects.slice(0, 5);

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.name?.split(' ')[0] || 'Researcher'}
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s an overview of your research workspace
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="glass rounded-xl p-5 hover:border-primary-500/30 transition-all duration-300 group"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`w-5 h-5 ${stat.color} group-hover:scale-110 transition-transform`} />
            </div>
            {isLoading ? (
              <div className="h-8 w-12 bg-surface-700 rounded animate-pulse mb-1" />
            ) : (
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            )}
            <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="glass rounded-xl p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-3 p-4 rounded-lg bg-primary-600/10 border border-primary-500/20 hover:bg-primary-600/20 hover:border-primary-500/40 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-primary-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Plus className="w-5 h-5 text-primary-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">New Project</p>
              <p className="text-xs text-muted-foreground">Start a research project</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-3 p-4 rounded-lg bg-accent-600/10 border border-accent-500/20 hover:bg-accent-600/20 hover:border-accent-500/40 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-accent-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <FileText className="w-5 h-5 text-accent-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Upload Documents</p>
              <p className="text-xs text-muted-foreground">Add source materials</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-3 p-4 rounded-lg bg-warning-600/10 border border-warning-500/20 hover:bg-warning-600/20 hover:border-warning-500/40 transition-all duration-200 group"
          >
            <div className="w-10 h-10 rounded-lg bg-warning-600/20 flex items-center justify-center group-hover:scale-105 transition-transform">
              <ClipboardCheck className="w-5 h-5 text-warning-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">Review Briefs</p>
              <p className="text-xs text-muted-foreground">Approve pending briefs</p>
            </div>
          </button>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="glass rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Projects</h2>
          <Link to="/projects" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
            View all
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-800 flex items-center justify-center mb-4">
              <FolderOpen className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">No projects yet</h3>
            <p className="text-xs text-muted-foreground max-w-sm">
              Create your first research project to start gathering evidence and generating research briefs.
            </p>
            <button
              onClick={() => navigate('/projects')}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {recentProjects.map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-surface-800/50 transition-colors group"
              >
                <div className="w-9 h-9 rounded-lg bg-primary-600/10 border border-primary-500/20 flex items-center justify-center shrink-0">
                  <FolderOpen className="w-4 h-4 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{project.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {project._count?.documents ?? 0} docs · {new Date(project.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 whitespace-nowrap ${STATUS_COLORS[project.status] || 'text-muted-foreground bg-surface-800'}`}>
                  {STATUS_LABELS[project.status] || project.status}
                </span>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 opacity-60 sm:opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
