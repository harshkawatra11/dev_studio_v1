import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMyJobs } from '@/hooks/useJobs';
import { PageSpinner } from '@/components/ui/Spinner';
import { Empty } from '@/components/ui/Empty';
import { Users } from 'lucide-react';

export function EmployerPipeline() {
  const { data, isLoading } = useMyJobs();
  const jobs = data?.data || [];

  if (isLoading) return <PageSpinner />;
  if (!jobs.length) return (
    <Empty icon={Users} title="No jobs yet" description="Post a job to see your applicant pipeline."
      action={<Link to="/employer/post-job" className="btn-primary">Post a job</Link>} />
  );

  return (
    <div>
      <h1 className="text-xl font-bold text-text mb-6">Applicant Pipeline</h1>
      <div className="flex flex-col gap-3">
        {jobs.map(job => (
          <Link key={job.id} to={`/employer/jobs/${job.id}/pipeline`}
            className="card p-4 hover:border-accent/40 transition-colors flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text">{job.title}</p>
              <p className="text-xs text-text-muted mt-0.5">{job._count.applications} applicants</p>
            </div>
            <span className="text-xs text-accent">View pipeline →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
