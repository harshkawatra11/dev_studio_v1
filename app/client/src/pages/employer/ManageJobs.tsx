import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Pencil, Trash2 } from 'lucide-react';
import { useMyJobs, useDeleteJob, useUpdateJob } from '@/hooks/useJobs';
import { PageSpinner } from '@/components/ui/Spinner';
import { Empty } from '@/components/ui/Empty';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { JOB_TYPE_LABELS, timeAgo } from '@/lib/utils';

export function ManageJobs() {
  const { data, isLoading } = useMyJobs();
  const deleteJob = useDeleteJob();
  const updateJob = useUpdateJob();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const jobs = data?.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text">Your Jobs</h1>
        <Link to="/employer/post-job"><Button><Plus className="h-4 w-4" />Post a job</Button></Link>
      </div>

      {isLoading ? <PageSpinner /> : jobs.length === 0 ? (
        <Empty icon={Plus} title="No jobs yet" description="Post your first job to start receiving applications."
          action={<Link to="/employer/post-job" className="btn-primary">Post a job</Link>} />
      ) : (
        <div className="card divide-y divide-border">
          {jobs.map(job => (
            <div key={job.id} className="flex items-center justify-between px-5 py-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link to={`/jobs/${job.id}`} className="text-sm font-semibold text-text hover:text-accent transition-colors">
                    {job.title}
                  </Link>
                  <Badge className={job.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-surface text-text-muted'} dot>
                    {job.isActive ? 'Active' : 'Closed'}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted mt-0.5">{JOB_TYPE_LABELS[job.type]} · Posted {timeAgo(job.createdAt)}</p>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <Link to={`/employer/jobs/${job.id}/pipeline`}
                  className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent transition-colors">
                  <Users className="h-3.5 w-3.5" />{job._count.applications}
                </Link>
                <Button variant="ghost" size="sm"
                  onClick={() => updateJob.mutate({ id: job.id, data: { isActive: !job.isActive } })}>
                  {job.isActive ? 'Close' : 'Reopen'}
                </Button>
                <Button variant="danger" size="sm" onClick={() => setConfirmDelete(job.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete job?" size="sm">
        <p className="text-sm text-text-secondary mb-4">This will permanently delete the job and all applications.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancel</Button>
          <Button variant="danger" loading={deleteJob.isPending}
            onClick={() => deleteJob.mutate(confirmDelete!, { onSuccess: () => setConfirmDelete(null) })}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
