import { Link } from 'react-router-dom';
import { Briefcase, Bookmark, TrendingUp, ArrowRight } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useMyApplications } from '@/hooks/useApplications';
import { useSavedJobs } from '@/hooks/useJobs';
import { PageSpinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/applications/StatusBadge';
import { formatDate } from '@/lib/utils';

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

export function CandidateDashboard() {
  const { user } = useAuthStore();
  const { data: appsData, isLoading: appsLoading } = useMyApplications({ limit: 5 });
  const { data: saved, isLoading: savedLoading } = useSavedJobs();

  if (appsLoading || savedLoading) return <PageSpinner />;

  const apps = appsData?.data || [];
  const total = appsData?.meta?.total || 0;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-xl font-bold text-text">Hey, {user?.name.split(' ')[0]} 👋</h1>
        <p className="text-sm text-text-secondary mt-1">Here's your job search overview</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard icon={Briefcase} label="Total applications" value={total} to="/candidate/applications" />
        <StatCard icon={Bookmark} label="Saved jobs" value={saved?.length || 0} to="/candidate/saved" />
        <StatCard icon={TrendingUp} label="Active pipeline" value={apps.filter(a => !['HIRED','REJECTED'].includes(a.status)).length} to="/candidate/applications" />
      </div>

      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-sm font-semibold text-text">Recent Applications</h2>
          <Link to="/candidate/applications" className="text-xs text-accent hover:text-accent-hover transition-colors">View all</Link>
        </div>
        {apps.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-muted">No applications yet. <Link to="/" className="text-accent">Browse jobs →</Link></div>
        ) : (
          <div className="divide-y divide-border">
            {apps.map(app => (
              <div key={app.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-text">{app.job.title}</p>
                  <p className="text-xs text-text-muted mt-0.5">{app.job.company.name} · {formatDate(app.createdAt)}</p>
                </div>
                <StatusBadge status={app.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
