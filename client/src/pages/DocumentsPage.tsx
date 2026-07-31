import { useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Upload, FileText, Trash2, Loader2, CheckCircle,
  AlertCircle, Clock, Layers
} from 'lucide-react';
import toast from 'react-hot-toast';
import { documentsApi } from '@/api/documents';
import type { Document } from '@/types';

const STATUS_ICON: Record<string, React.ReactNode> = {
  UPLOADED: <Clock className="w-3.5 h-3.5 text-muted-foreground" />,
  PROCESSING: <Loader2 className="w-3.5 h-3.5 text-primary-400 animate-spin" />,
  CHUNKED: <Layers className="w-3.5 h-3.5 text-warning-400" />,
  EMBEDDED: <CheckCircle className="w-3.5 h-3.5 text-evidence-supporting" />,
  FAILED: <AlertCircle className="w-3.5 h-3.5 text-danger-400" />,
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { id: projectId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['documents', projectId],
    queryFn: () => documentsApi.list(projectId!),
    enabled: !!projectId,
    refetchInterval: (query) => {
      const docs: Document[] = (query.state.data as { data?: { data?: { documents?: Document[] } } })?.data?.data?.documents ?? [];
      return docs.some((d) => d.status === 'PROCESSING' || d.status === 'UPLOADED') ? 3000 : false;
    },
  });

  const uploadMutation = useMutation({
    mutationFn: (files: File[]) => documentsApi.upload(projectId!, files),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      const count = res.data.data?.documents?.length ?? 0;
      toast.success(`${count} document(s) uploaded. Processing started.`);
    },
    onError: (e: { response?: { data?: { message?: string } } }) => {
      toast.error(e.response?.data?.message || 'Upload failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => documentsApi.delete(projectId!, docId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', projectId] });
      toast.success('Document deleted');
    },
    onError: () => toast.error('Failed to delete document'),
  });

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const valid = Array.from(files).filter(
      (f) => f.type === 'application/pdf' ||
        f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
    if (valid.length === 0) {
      toast.error('Only PDF and DOCX files are allowed');
      return;
    }
    uploadMutation.mutate(valid);
  };

  const documents: Document[] = data?.data?.data?.documents ?? [];

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
        <h1 className="text-2xl font-bold text-foreground">Documents</h1>
        <p className="text-muted-foreground mt-1">Upload PDF or DOCX source documents</p>
      </div>

      {/* Upload Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className={`glass rounded-xl p-6 sm:p-10 flex flex-col items-center justify-center cursor-pointer transition-all border-2 border-dashed text-center ${
          dragging ? 'border-primary-500 bg-primary-600/10' : 'border-border hover:border-primary-500/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploadMutation.isPending ? (
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin mb-3" />
        ) : (
          <Upload className="w-8 h-8 text-muted-foreground mb-3" />
        )}
        <p className="text-sm font-medium text-foreground">
          {uploadMutation.isPending ? 'Uploading...' : 'Drop files here or click to upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">PDF and DOCX files, up to 50MB each</p>
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-primary-400" />
        </div>
      ) : documents.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center">
          <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No documents uploaded yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => (
            <div key={doc.id} className="glass rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-lg bg-surface-800 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.originalName}</p>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{formatBytes(doc.size)}</span>
                    {doc.pageCount && <span>• {doc.pageCount} pages</span>}
                    <span>• {new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/40">
                <div className="flex items-center gap-1.5 text-xs">
                  {STATUS_ICON[doc.status]}
                  <span className="text-muted-foreground font-medium">{doc.status}</span>
                </div>
                <button
                  onClick={() => {
                    if (confirm('Delete this document?')) deleteMutation.mutate(doc.id);
                  }}
                  title="Delete document"
                  className="p-1.5 text-muted-foreground hover:text-danger-400 hover:bg-danger-500/10 rounded-lg transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
