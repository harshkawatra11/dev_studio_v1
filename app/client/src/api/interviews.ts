import { api } from './axios';
import { ApiResponse, Interview } from '@/types';

export const interviewsApi = {
  schedule: (applicationId: string, data: { scheduledAt: string; meetLink?: string; notes?: string }) =>
    api.post<ApiResponse<Interview>>(`/applications/${applicationId}/interview`, data).then(r => r.data.data),

  update: (id: string, data: { scheduledAt?: string; meetLink?: string; notes?: string }) =>
    api.put<ApiResponse<Interview>>(`/interviews/${id}`, data).then(r => r.data.data),
};
