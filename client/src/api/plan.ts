import apiClient from './client';
import type { ResearchPlan, ApiResponse } from '@/types';

export const planApi = {
  generate: (projectId: string) =>
    apiClient.post<ApiResponse<{ plan: ResearchPlan }>>(`/research-plan/${projectId}/generate`),

  get: (projectId: string) =>
    apiClient.get<ApiResponse<{ plans: ResearchPlan[] }>>(`/research-plan/${projectId}`),

  review: (planId: string, action: 'APPROVE' | 'REJECT', comment?: string) =>
    apiClient.post<ApiResponse<{ plan: ResearchPlan }>>(`/research-plan/${planId}/review`, { action, comment }),

  updateStep: (planId: string, stepId: string, data: { title?: string; description?: string }) =>
    apiClient.put<ApiResponse<{ step: unknown }>>(`/research-plan/${planId}/steps/${stepId}`, data),
};
