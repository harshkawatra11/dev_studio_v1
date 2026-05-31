import { api } from './axios';
import { ApiResponse, Application, ApplicationStatus } from '@/types';

export const applicationsApi = {
  apply: (jobId: string, data: { coverLetter?: string; resumeUrl: string }) =>
    api.post<ApiResponse<Application>>(`/jobs/${jobId}/apply`, data).then(r => r.data.data),

  myApplications: (params: { page?: number; limit?: number } = {}) =>
    api.get<ApiResponse<Application[]>>('/applications/my', { params }).then(r => r.data),

  jobApplications: (jobId: string, params: { status?: ApplicationStatus; page?: number } = {}) =>
    api.get<ApiResponse<Application[]>>(`/jobs/${jobId}/applications`, { params }).then(r => r.data),

  updateStatus: (appId: string, status: ApplicationStatus, note?: string) =>
    api.patch<ApiResponse<Application>>(`/applications/${appId}/status`, { status, note }).then(r => r.data.data),

  get: (appId: string) =>
    api.get<ApiResponse<Application>>(`/applications/${appId}`).then(r => r.data.data),

  allForEmployer: (params: { status?: ApplicationStatus; page?: number; limit?: number } = {}) =>
    api.get<ApiResponse<Application[]>>('/applications/pipeline', { params }).then(r => r.data),
};
