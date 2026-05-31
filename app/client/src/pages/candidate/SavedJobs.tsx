import { Bookmark } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSavedJobs, useSaveJob } from '@/hooks/useJobs';
import { PageSpinner } from '@/components/ui/Spinner';
import { Empty } from '@/components/ui/Empty';
import { JobCard } from '@/components/job/JobCard';

export function SavedJobs() {
  const { data: saved, isLoading } = useSavedJobs();
  const saveToggle = useSaveJob();

  return (
    <div>
      <h1 className="text-xl font-bold text-text mb-6">Saved Jobs</h1>
      {isLoading ? <PageSpinner /> : !saved?.length ? (
        <Empty icon={Bookmark} title="No saved jobs" description="Bookmark jobs you're interested in to review later."
          action={<Link to="/" className="btn-primary">Browse jobs</Link>} />
      ) : (
        <div className="flex flex-col gap-3">
          {saved.map(job => (
            <JobCard key={job.id} job={job} saved
              onSaveToggle={() => saveToggle.mutate({ id: job.id, saved: true })} />
          ))}
        </div>
      )}
    </div>
  );
}
