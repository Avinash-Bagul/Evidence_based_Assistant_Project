import apiClient from './client';
import type { Document, DocumentChunk, ApiResponse } from '@/types';

export const documentsApi = {
  list: (projectId: string) =>
    apiClient.get<ApiResponse<{ documents: Document[] }>>(`/documents/${projectId}`),

  getById: (projectId: string, docId: string) =>
    apiClient.get<ApiResponse<{ document: Document }>>(`/documents/${projectId}/${docId}`),

  getChunks: (projectId: string, docId: string) =>
    apiClient.get<ApiResponse<{ chunks: DocumentChunk[] }>>(`/documents/${projectId}/${docId}/chunks`),

  upload: (projectId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return apiClient.post<ApiResponse<{ documents: Document[] }>>(
      `/documents/${projectId}/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
  },

  delete: (projectId: string, docId: string) =>
    apiClient.delete<ApiResponse<null>>(`/documents/${projectId}/${docId}`),
};
