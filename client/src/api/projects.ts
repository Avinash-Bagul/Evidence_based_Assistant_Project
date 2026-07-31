import apiClient from './client';
import type { Project, ApiResponse, PaginatedResponse } from '@/types';

export const projectsApi = {
  list: (page = 1, limit = 10) =>
    apiClient.get<PaginatedResponse<Project>>('/projects', { params: { page, limit } }),

  getById: (id: string) =>
    apiClient.get<ApiResponse<{ project: Project }>>(`/projects/${id}`),

  create: (data: { title: string; description?: string; researchQuestion?: string }) =>
    apiClient.post<ApiResponse<{ project: Project }>>('/projects', data),

  update: (id: string, data: Partial<{ title: string; description: string; researchQuestion: string | null; status: string }>) =>
    apiClient.put<ApiResponse<{ project: Project }>>(`/projects/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/projects/${id}`),

  getReviews: (id: string) =>
    apiClient.get<ApiResponse<{ reviews: Array<{ id: string; action: string; comment: string | null; targetType: string; targetId: string; createdAt: string; user: { id: string; name: string; email: string } }> }>>(`/projects/${id}/reviews`),
};
