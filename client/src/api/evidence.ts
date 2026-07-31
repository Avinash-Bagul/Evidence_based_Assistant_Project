import apiClient from './client';
import type { Evidence, ApiResponse } from '@/types';

export const evidenceApi = {
  retrieve: (projectId: string) =>
    apiClient.post<ApiResponse<{ totalEvidence: number }>>(`/evidence/${projectId}/retrieve`),

  list: (projectId: string, classification?: string) =>
    apiClient.get<ApiResponse<{ evidence: Evidence[] }>>(`/evidence/${projectId}`, {
      params: classification ? { classification } : {},
    }),

  getById: (projectId: string, evidenceId: string) =>
    apiClient.get<ApiResponse<{ evidence: Evidence }>>(`/evidence/${projectId}/${evidenceId}`),
};
