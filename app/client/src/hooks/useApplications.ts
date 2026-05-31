import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi } from '@/api/applications';
import { ApplicationStatus } from '@/types';

export function useMyApplications(params = {}) {
  return useQuery({
    queryKey: ['my-applications', params],
    queryFn: () => applicationsApi.myApplications(params),
  });
}

export function useJobApplications(jobId: string, params: { status?: ApplicationStatus; page?: number } = {}) {
  return useQuery({
    queryKey: ['job-applications', jobId, params],
    queryFn: () => applicationsApi.jobApplications(jobId, params),
    enabled: !!jobId,
  });
}

export function usePipeline(params = {}) {
  return useQuery({
    queryKey: ['pipeline', params],
    queryFn: () => applicationsApi.allForEmployer(params),
  });
}

export function useApply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, data }: { jobId: string; data: { coverLetter?: string; resumeUrl: string } }) =>
      applicationsApi.apply(jobId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-applications'] }),
  });
}

export function useUpdateStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ appId, status, note }: { appId: string; status: ApplicationStatus; note?: string }) =>
      applicationsApi.updateStatus(appId, status, note),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job-applications'] });
      qc.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}
