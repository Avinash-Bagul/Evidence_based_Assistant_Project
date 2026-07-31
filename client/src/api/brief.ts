import apiClient from './client';
import type { ResearchBrief, BriefVersion, ApiResponse } from '@/types';

export const briefApi = {
  generate: (projectId: string) =>
    apiClient.post<ApiResponse<{ brief: ResearchBrief }>>(`/research-brief/${projectId}/generate`),

  get: (projectId: string) =>
    apiClient.get<ApiResponse<{ brief: ResearchBrief }>>(`/research-brief/${projectId}`),

  review: (briefId: string, action: 'APPROVE' | 'REJECT', comment?: string) =>
    apiClient.post<ApiResponse<{ brief: ResearchBrief }>>(`/research-brief/${briefId}/review`, { action, comment }),

  updateClaim: (briefId: string, claimId: string, status: string, content?: string) =>
    apiClient.put(`/research-brief/${briefId}/claims/${claimId}`, { status, content }),

  followUp: (briefId: string, question: string) =>
    apiClient.post(`/follow-up/${briefId}`, { question }),

  getVersions: (briefId: string) =>
    apiClient.get<ApiResponse<{ versions: BriefVersion[] }>>(`/versions/${briefId}`),

  getVersion: (briefId: string, versionId: string) =>
    apiClient.get<ApiResponse<{ version: BriefVersion }>>(`/versions/${briefId}/${versionId}`),

  saveVersion: (briefId: string, changeLog?: string) =>
    apiClient.post<ApiResponse<{ version: BriefVersion }>>(`/versions/${briefId}/save`, { changeLog }),

  restoreVersion: (briefId: string, versionId: string) =>
    apiClient.post<ApiResponse<{ brief: ResearchBrief }>>(`/versions/${briefId}/restore/${versionId}`),
};
