import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi } from '@/api/jobs';
import { JobFilters } from '@/types';

export function useJobs(filters: JobFilters = {}) {
  return useQuery({
    queryKey: ['jobs', filters],
    queryFn: () => jobsApi.list(filters),
  });
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id),
    enabled: !!id,
  });
}

export function useMyJobs(params = {}) {
  return useQuery({
    queryKey: ['my-jobs', params],
    queryFn: () => jobsApi.myJobs(params),
  });
}

export function useSavedJobs() {
  return useQuery({
    queryKey: ['saved-jobs'],
    queryFn: jobsApi.savedJobs,
  });
}

export function useCreateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: jobsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-jobs'] }),
  });
}

export function useUpdateJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => jobsApi.update(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['job', id] });
      qc.invalidateQueries({ queryKey: ['my-jobs'] });
    },
  });
}

export function useDeleteJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: jobsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-jobs'] }),
  });
}

export function useSaveJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, saved }: { id: string; saved: boolean }) =>
      saved ? jobsApi.unsaveJob(id) : jobsApi.saveJob(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['saved-jobs'] }),
  });
}
