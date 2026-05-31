import { Link } from 'react-router-dom';
import { MapPin, Users, Clock, Bookmark, BookmarkCheck } from 'lucide-react';
import { Job } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { cn, formatSalary, timeAgo, JOB_TYPE_LABELS, JOB_TYPE_COLORS } from '@/lib/utils';

interface Props {
  job: Job;
  saved?: boolean;
  onSaveToggle?: () => void;
}

export function JobCard({ job, saved, onSaveToggle }: Props) {
  return (
    <div className="card p-5 hover:border-accent/40 transition-all duration-200 group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {job.company.logoUrl ? (
            <img src={job.company.logoUrl} alt={job.company.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center shrink-0 text-accent text-sm font-bold">
              {job.company.name[0]}
            </div>
          )}
          <div className="min-w-0">
            <Link to={`/jobs/${job.id}`} className="text-sm font-semibold text-text hover:text-accent transition-colors line-clamp-1">
              {job.title}
            </Link>
            <p className="text-xs text-text-secondary mt-0.5">{job.company.name}</p>
          </div>
        </div>
        {onSaveToggle && (
          <button onClick={onSaveToggle} className="text-text-muted hover:text-accent transition-colors shrink-0 p-1">
            {saved ? <BookmarkCheck className="h-4 w-4 text-accent" /> : <Bookmark className="h-4 w-4" />}
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge className={cn('text-xs', JOB_TYPE_COLORS[job.type])}>{JOB_TYPE_LABELS[job.type]}</Badge>
        {job.tags.slice(0, 3).map(t => (
          <Badge key={t.id} className="bg-surface text-text-secondary text-xs">{t.name}</Badge>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
        {job.company.location && (
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.company.location}</span>
        )}
        <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job._count.applications} applicants</span>
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeAgo(job.createdAt)}</span>
        {(job.salaryMin || job.salaryMax) && (
          <span className="text-text-secondary font-medium">{formatSalary(job.salaryMin, job.salaryMax, job.currency)}</span>
        )}
      </div>
    </div>
  );
}
