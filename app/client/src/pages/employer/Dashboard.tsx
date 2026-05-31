import { Link } from 'react-router-dom';
import { Briefcase, Users, Plus, ArrowRight, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useMyJobs } from '@/hooks/useJobs';
import { usePipeline } from '@/hooks/useApplications';
import { PageSpinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { JOB_TYPE_LABELS, timeAgo } from '@/lib/utils';

function StatCard({ icon: Icon, label, value, to }: { icon: any; label: string; value: number | string; to: string }) {
  return (
    <Link to={to} className="card p-5 hover:border-accent/40 transition-colors group">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 bg-accent/10 rounded-lg"><Icon className="h-4 w-4 text-accent" /></div>
        <ArrowRight className="h-4 w-4 text-text-muted group-hover:text-accent transition-colors" />
      </div>
      <p className="text-2xl font-bold text-text">{value}</p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </Link>
  );
}

export function EmployerDashboard() {
  const { user } = useAuthStore();
  const { data: jobsData, isLoading: jobsLoading } = useMyJobs({ limit: 5 });
  const { data: pipelineData, isLoading: pipelineLoading } = usePipeline({ limit: 5 });

  if (jobsLoading || pipelineLoading) return <PageSpinner />;

  const jobs = jobsData?.data || [];
  const pipeline = pipelineData?.data || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-text">Employer Hub</h1>
          <p className="text-sm text-text-secondary mt-1">Manage your jobs and pipeline</p>
        </div>
        <Link to="/employer/post-job"><Button><Plus className="h-4 w-4" />Post a job</Button></Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Briefcase} label="Active jobs" value={jobs.filter(j => j.isActive).length} to="/employer/jobs" />
        <StatCard icon={Users} label="Total applicants" value={jobs.reduce((s, j) => s + j._count.applications, 0)} to="/employer/pipeline" />
        <StatCard icon={TrendingUp} label="In pipeline" value={pipeline.filter(a => !['HIRED','REJECTED'].includes(a.status)).length} to="/employer/pipeline" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-sm font-semibold text-text">Your Job Listings</h2>
          <Link to="/employer/jobs" className="text-xs text-accent hover:text-accent-hover transition-colors">View all</Link>
        </div>
        {jobs.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">
            No jobs yet. <Link to="/employer/post-job" className="text-accent">Post your first job →</Link>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {jobs.map(job => (
              <div key={job.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <Link to={`/employer/jobs/${job.id}/pipeline`} className="text-sm font-medium text-text hover:text-accent transition-colors">
                    {job.title}
                  </Link>
                  <p className="text-xs text-text-muted mt-0.5">{JOB_TYPE_LABELS[job.type]} · Posted {timeAgo(job.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-text-secondary">{job._count.applications} applicants</span>
                  <Badge className={job.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-surface text-text-muted'} dot>
                    {job.isActive ? 'Active' : 'Closed'}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
