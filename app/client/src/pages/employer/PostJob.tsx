import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateJob } from '@/hooks/useJobs';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  title:         z.string().min(3, 'Too short'),
  description:   z.string().min(50, 'At least 50 characters'),
  location:      z.string().min(2, 'Required'),
  type:          z.enum(['FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','REMOTE']),
  salaryMin:     z.coerce.number().optional(),
  salaryMax:     z.coerce.number().optional(),
  experienceMin: z.coerce.number().optional(),
});
type Form = z.infer<typeof schema>;

export function PostJob() {
  const navigate = useNavigate();
  const createJob = useCreateJob();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'FULL_TIME' },
  });

  const submit = (data: Form) => {
    createJob.mutate(data as any, { onSuccess: () => navigate('/employer/jobs') });
  };

  return (
    <div className="max-w-2xl">
      <h1 className="text-xl font-bold text-text mb-6">Post a New Job</h1>
      <form onSubmit={handleSubmit(submit)} className="card p-6 space-y-4">
        <Input label="Job title" error={errors.title?.message} {...register('title')} placeholder="e.g. Senior React Developer" />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Location" error={errors.location?.message} {...register('location')} placeholder="e.g. New York, NY" />
          <Select label="Job type" error={errors.type?.message} {...register('type')}>
            <option value="FULL_TIME">Full-time</option>
            <option value="PART_TIME">Part-time</option>
            <option value="CONTRACT">Contract</option>
            <option value="INTERNSHIP">Internship</option>
            <option value="REMOTE">Remote</option>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Min salary (USD, optional)" type="number" error={errors.salaryMin?.message} {...register('salaryMin')} />
          <Input label="Max salary (USD, optional)" type="number" error={errors.salaryMax?.message} {...register('salaryMax')} />
        </div>
        <Input label="Min experience (years, optional)" type="number" error={errors.experienceMin?.message} {...register('experienceMin')} />
        <Textarea label="Job description" error={errors.description?.message} {...register('description')} rows={8}
          placeholder="Describe the role, responsibilities, and requirements..." />

        {createJob.error && (
          <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
            {(createJob.error as any)?.response?.data?.error || 'Failed to create job'}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" type="button" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" loading={createJob.isPending}>Post job</Button>
        </div>
      </form>
    </div>
  );
}
