import apiClient from './client';
import type { User, ApiResponse } from '@/types';

export const authApi = {
  profile: () => apiClient.get<ApiResponse<{ user: User }>>('/auth/profile'),
};
