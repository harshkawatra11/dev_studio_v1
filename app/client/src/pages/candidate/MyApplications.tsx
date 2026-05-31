import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase } from 'lucide-react';
import { useMyApplications } from '@/hooks/useApplications';
import { PageSpinner } from '@/components/ui/Spinner';
import { Empty } from '@/components/ui/Empty';
import { Pagination } from '@/components/ui/Pagination';
import { StatusBadge } from '@/components/applications/StatusBadge';
import { formatDate } from '@/lib/utils';

export function MyApplications() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useMyApplications({ page, limit: 15 });
  const apps = data?.data || [];

  return (
    <div>
      <h1 className="text-xl font-bold text-text mb-6">My Applications</h1>
      {isLoading ? <PageSpinner /> : apps.length === 0 ? (
        <Empty icon={Briefcase} title="No applications yet" description="Start applying to jobs you're interested in."
          action={<Link to="/" className="btn-primary">Browse jobs</Link>} />
      ) : (
        <>
          <div className="card divide-y divide-border">
            {apps.map(app => (
              <div key={app.id} className="flex items-center justify-between px-5 py-4 hover:bg-surface/50 transition-colors">
                <div className="flex items-center gap-4">
                  {app.job.company.logoUrl ? (
                    <img src={app.job.company.logoUrl} alt="" className="h-9 w-9 rounded-lg object-cover" />
                  ) : (
                    <div className="h-9 w-9 rounded-lg bg-accent/15 flex items-center justify-center text-accent font-bold text-sm">
                      {app.job.company.name[0]}
                    </div>
                  )}
                  <div>
                    <Link to={`/jobs/${app.job.id}`} className="text-sm font-medium text-text hover:text-accent transition-colors">
                      {app.job.title}
                    </Link>
                    <p className="text-xs text-text-muted mt-0.5">{app.job.company.name} · Applied {formatDate(app.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {app.interview && (
                    <span className="text-xs text-blue-300 bg-blue-500/10 px-2 py-0.5 rounded-full">
                      Interview: {formatDate(app.interview.scheduledAt)}
                    </span>
                  )}
                  <StatusBadge status={app.status} />
                </div>
              </div>
            ))}
          </div>
          {data?.meta && <Pagination meta={data.meta} onChange={setPage} />}
        </>
      )}
    </div>
  );
}
