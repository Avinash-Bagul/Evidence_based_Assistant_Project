import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plus,
  FolderOpen,
  Trash2,
  ChevronRight,
  Loader2,
  Search,
  LayoutGrid,
  List,
  X,
  FileText,
  ClipboardList,
  BookOpen,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { projectsApi } from '@/api/projects';
import type { Project } from '@/types';

const PROJECT_STATUS_LABELS: Record<string, string> = {
  CREATED: 'Created',
  DOCUMENTS_UPLOADED: 'Docs Uploaded',
  PLAN_GENERATED: 'Plan Generated',
  PLAN_APPROVED: 'Plan Approved',
  EVIDENCE_RETRIEVED: 'Evidence Retrieved',
  BRIEF_GENERATED: 'Brief Generated',
  BRIEF_APPROVED: 'Brief Approved',
  COMPLETED: 'Completed',
};

const STATUS_COLORS: Record<string, string> = {
  CREATED: 'text-muted-foreground bg-surface-800 border-surface-700',
  DOCUMENTS_UPLOADED: 'text-accent-400 bg-accent-600/10 border-accent-500/20',
  PLAN_GENERATED: 'text-primary-400 bg-primary-600/10 border-primary-500/20',
  PLAN_APPROVED: 'text-primary-300 bg-primary-600/20 border-primary-500/30',
  EVIDENCE_RETRIEVED: 'text-warning-400 bg-warning-600/10 border-warning-500/20',
  BRIEF_GENERATED: 'text-accent-400 bg-accent-600/10 border-accent-500/20',
  BRIEF_APPROVED: 'text-evidence-supporting bg-accent-600/15 border-accent-500/30',
  COMPLETED: 'text-evidence-supporting bg-accent-600/20 border-accent-500/30',
};

const createSchema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().max(5000).optional(),
  researchQuestion: z.string().max(2000).optional(),
});
type CreateForm = z.infer<typeof createSchema>;

export default function ProjectsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const { data, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.list(1, 50),
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateForm) => projectsApi.create(d),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created successfully');
      setShowCreate(false);
      reset();
      const newId = res.data?.data?.project?.id;
      if (newId) navigate(`/projects/${newId}`);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Failed to create project');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project deleted');
    },
    onError: () => toast.error('Failed to delete project'),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateForm>({
    resolver: zodResolver(createSchema),
  });

  const allProjects: Project[] = data?.data?.data ?? [];

  // Filter projects by search query and status
  const projects = allProjects.filter((project) => {
    const matchesSearch =
      project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (project.researchQuestion && project.researchQuestion.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || project.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-[fade-in_0.3s_ease-out]">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and track all your research projects ({allProjects.length})
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-xl shadow-lg shadow-primary-600/20 transition-all shrink-0 active:scale-95"
        >
          <Plus className="w-4 h-4" />
          New Project
        </button>
      </div>

      {/* Toolbar: Search, Status Filter & View Switcher */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 p-2 bg-surface-900/60 border border-border/80 rounded-xl backdrop-blur-sm">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by title, description, or question..."
            className="w-full pl-9 pr-8 py-2 bg-surface-800/80 border border-border/60 rounded-lg text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded-md"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filter Dropdown & View Mode Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 bg-surface-800/80 border border-border/60 rounded-lg text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all"
          >
            <option value="ALL">All Statuses</option>
            {Object.entries(PROJECT_STATUS_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>

          {/* View Toggle */}
          <div className="flex items-center p-1 bg-surface-800/80 border border-border/60 rounded-lg">
            <button
              onClick={() => setViewMode('grid')}
              title="Grid View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'grid'
                  ? 'bg-primary-600/20 text-primary-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="List View"
              className={`p-1.5 rounded-md transition-all ${
                viewMode === 'list'
                  ? 'bg-primary-600/20 text-primary-400 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setShowCreate(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="glass border border-border/80 rounded-2xl p-5 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto animate-[scale-in_0.2s_ease-out] shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Research Project</h2>
              <button
                onClick={() => {
                  setShowCreate(false);
                  reset();
                }}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Project Title *</label>
                <input
                  {...register('title')}
                  className="w-full px-3.5 py-2.5 bg-surface-800 border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 transition-all"
                  placeholder="e.g. AI in Healthcare Diagnostics"
                />
                {errors.title && <p className="mt-1 text-xs text-danger-400">{errors.title.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Description</label>
                <textarea
                  {...register('description')}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-surface-800 border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 resize-none transition-all"
                  placeholder="Brief summary or objective of this research"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Research Question</label>
                <textarea
                  {...register('researchQuestion')}
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-surface-800 border border-border rounded-xl text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500 resize-none transition-all"
                  placeholder="What core question do you want to answer with evidence?"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    reset();
                  }}
                  className="w-full sm:flex-1 py-2.5 border border-border text-muted-foreground hover:text-foreground rounded-xl text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || createMutation.isPending}
                  className="w-full sm:flex-1 py-2.5 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
                >
                  {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Projects Display */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      ) : projects.length === 0 ? (
        <div className="glass border border-border/80 rounded-2xl p-8 sm:p-12 flex flex-col items-center text-center">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-surface-800 border border-border/60 flex items-center justify-center mb-4 text-muted-foreground shadow-inner">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            {allProjects.length === 0 ? 'No projects yet' : 'No matching projects found'}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mb-4">
            {allProjects.length === 0
              ? 'Create your first research project to start uploading documents and generating evidence briefs.'
              : 'Try clearing your search query or selecting a different status filter.'}
          </p>
          {allProjects.length === 0 ? (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-xl transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          ) : (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
              className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW: 1 col on mobile, 2 cols on md, 3 cols on lg */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <div
              key={project.id}
              className="glass border border-border/80 rounded-2xl p-5 hover:border-primary-500/40 transition-all duration-300 flex flex-col justify-between group shadow-sm hover:shadow-glow"
            >
              <div className="space-y-3">
                {/* Header: Title + Status Badge */}
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-primary-300 transition-colors line-clamp-2 leading-snug">
                    {project.title}
                  </h3>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border shrink-0 whitespace-nowrap ${
                      STATUS_COLORS[project.status] || 'text-muted-foreground bg-surface-800 border-surface-700'
                    }`}
                  >
                    {PROJECT_STATUS_LABELS[project.status] || project.status}
                  </span>
                </div>

                {/* Description */}
                {project.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {project.description}
                  </p>
                )}

                {/* Research Question */}
                {project.researchQuestion && (
                  <div className="p-2.5 bg-surface-800/60 border border-border/50 rounded-xl">
                    <p className="text-[11px] text-primary-400 font-medium line-clamp-2">
                      <span className="font-semibold mr-1">Q:</span>
                      {project.researchQuestion}
                    </p>
                  </div>
                )}
              </div>

              {/* Card Footer */}
              <div className="pt-4 mt-3 border-t border-border/60 space-y-3">
                {/* Document & Artifact Counts */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 px-2 py-1 bg-surface-800/80 rounded-lg border border-border/40">
                    <FileText className="w-3.5 h-3.5 text-accent-400" />
                    {project._count?.documents ?? 0} docs
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-surface-800/80 rounded-lg border border-border/40">
                    <ClipboardList className="w-3.5 h-3.5 text-primary-400" />
                    {project._count?.researchPlans ?? 0} plans
                  </span>
                  <span className="flex items-center gap-1 px-2 py-1 bg-surface-800/80 rounded-lg border border-border/40">
                    <BookOpen className="w-3.5 h-3.5 text-warning-400" />
                    {project._count?.researchBriefs ?? 0} briefs
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    {new Date(project.updatedAt).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        if (confirm('Are you sure you want to delete this project and all associated documents?')) {
                          deleteMutation.mutate(project.id);
                        }
                      }}
                      title="Delete project"
                      className="p-2 text-muted-foreground hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <Link
                      to={`/projects/${project.id}`}
                      className="flex items-center gap-1 px-3 py-1.5 bg-primary-600/10 hover:bg-primary-600/20 text-primary-400 border border-primary-500/20 rounded-lg text-xs font-medium transition-all"
                    >
                      Open
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST VIEW: Responsive rows */
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="glass border border-border/80 rounded-2xl p-4 sm:p-5 hover:border-primary-500/40 transition-all duration-200 group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-base font-semibold text-foreground group-hover:text-primary-300 transition-colors truncate max-w-full">
                    {project.title}
                  </h3>
                  <span
                    className={`text-[11px] px-2.5 py-0.5 rounded-full font-medium border shrink-0 whitespace-nowrap ${
                      STATUS_COLORS[project.status] || 'text-muted-foreground bg-surface-800 border-surface-700'
                    }`}
                  >
                    {PROJECT_STATUS_LABELS[project.status] || project.status}
                  </span>
                </div>

                {project.description && (
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{project.description}</p>
                )}

                {project.researchQuestion && (
                  <p className="text-xs text-primary-400 truncate">
                    <span className="font-semibold">Q:</span> {project.researchQuestion}
                  </p>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pt-1">
                  <span>{project._count?.documents ?? 0} documents</span>
                  <span>•</span>
                  <span>{project._count?.researchPlans ?? 0} plans</span>
                  <span>•</span>
                  <span>{project._count?.researchBriefs ?? 0} briefs</span>
                  <span>•</span>
                  <span>Updated {new Date(project.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-border/50">
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    if (confirm('Are you sure you want to delete this project and all associated data?')) {
                      deleteMutation.mutate(project.id);
                    }
                  }}
                  title="Delete project"
                  className="p-2 text-muted-foreground hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>

                <Link
                  to={`/projects/${project.id}`}
                  className="flex items-center gap-1 px-3.5 py-2 bg-primary-600/10 hover:bg-primary-600/20 text-primary-400 border border-primary-500/20 rounded-xl text-xs sm:text-sm font-medium transition-all"
                >
                  Open
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
