import { useState } from 'react';
import { Briefcase } from 'lucide-react';
import { useJobs } from '@/hooks/useJobs';
import { JobFilters } from '@/types';
import { JobCard } from '@/components/job/JobCard';
import { JobFiltersBar } from '@/components/job/JobFilters';
import { PageSpinner } from '@/components/ui/Spinner';
import { Pagination } from '@/components/ui/Pagination';
import { Empty } from '@/components/ui/Empty';

export function Home() {
  const [filters, setFilters] = useState<JobFilters>({ page: 1, limit: 20 });
  const { data, isLoading } = useJobs(filters);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-text mb-1">Find your next role</h1>
        <p className="text-text-secondary text-sm">{data?.meta?.total ?? '...'} open positions</p>
      </div>

      <JobFiltersBar filters={filters} onChange={setFilters} />

      <div className="mt-6">
        {isLoading ? (
          <PageSpinner />
        ) : !data?.data?.length ? (
          <Empty icon={Briefcase} title="No jobs found" description="Try adjusting your filters." />
        ) : (
          <>
            <div className="flex flex-col gap-3">
              {data.data.map(job => <JobCard key={job.id} job={job} />)}
            </div>
            {data.meta && <Pagination meta={data.meta} onChange={page => setFilters(f => ({ ...f, page }))} />}
          </>
        )}
      </div>
    </div>
  );
}
