import { api } from './axios';
import { ApiResponse, Company } from '@/types';

export const companiesApi = {
  get: (id: string) =>
    api.get<ApiResponse<Company>>(`/companies/${id}`).then(r => r.data.data),

  my: () =>
    api.get<ApiResponse<Company>>('/companies/my').then(r => r.data.data),

  create: (data: Partial<Company>) =>
    api.post<ApiResponse<Company>>('/companies', data).then(r => r.data.data),

  update: (id: string, data: Partial<Company>) =>
    api.put<ApiResponse<Company>>(`/companies/${id}`, data).then(r => r.data.data),
};
