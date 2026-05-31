import { api } from './axios';
import { ApiResponse, Job, JobFilters } from '@/types';

export const jobsApi = {
  list: (filters: JobFilters = {}) => {
    const params = new URLSearchParams();
    if (filters.keyword)  params.set('keyword', filters.keyword);
    if (filters.type)     params.set('type', filters.type);
    if (filters.location) params.set('location', filters.location);
    if (filters.salaryMin) params.set('salaryMin', String(filters.salaryMin));
    if (filters.salaryMax) params.set('salaryMax', String(filters.salaryMax));
    if (filters.tags?.length) params.set('tags', filters.tags.join(','));
    if (filters.page)  params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));
    return api.get<ApiResponse<Job[]>>(`/jobs?${params}`).then(r => r.data);
  },

  get: (id: string) =>
    api.get<ApiResponse<Job>>(`/jobs/${id}`).then(r => r.data.data),

  create: (data: Partial<Job>) =>
    api.post<ApiResponse<Job>>('/jobs', data).then(r => r.data.data),

  update: (id: string, data: Partial<Job>) =>
    api.put<ApiResponse<Job>>(`/jobs/${id}`, data).then(r => r.data.data),

  delete: (id: string) =>
    api.delete(`/jobs/${id}`),

  myJobs: (params: { page?: number; limit?: number } = {}) =>
    api.get<ApiResponse<Job[]>>('/jobs/my', { params }).then(r => r.data),

  savedJobs: () =>
    api.get<ApiResponse<Job[]>>('/jobs/saved').then(r => r.data.data),

  saveJob: (id: string) =>
    api.post(`/jobs/${id}/save`),

  unsaveJob: (id: string) =>
    api.delete(`/jobs/${id}/save`),
};
