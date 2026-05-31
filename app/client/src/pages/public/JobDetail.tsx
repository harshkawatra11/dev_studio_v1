import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Clock, Briefcase, DollarSign, Users, ExternalLink } from 'lucide-react';
import { useJob } from '@/hooks/useJobs';
import { useApply } from '@/hooks/useApplications';
import { useAuthStore } from '@/store/auth.store';
import { PageSpinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Textarea } from '@/components/ui/Textarea';
import { Input } from '@/components/ui/Input';
import { formatSalary, timeAgo, JOB_TYPE_LABELS, JOB_TYPE_COLORS } from '@/lib/utils';

export function JobDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: job, isLoading } = useJob(id!);
  const { user } = useAuthStore();
  const applyMut = useApply();
  const navigate = useNavigate();
  const [applyOpen, setApplyOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [resumeUrl, setResumeUrl] = useState(user?.resumeUrl || '');

  if (isLoading) return <PageSpinner />;
  if (!job) return <div className="text-center py-20 text-text-secondary">Job not found.</div>;

  const handleApply = () => {
    if (!user) { navigate('/login'); return; }
    setApplyOpen(true);
  };

  const submitApply = () => {
    applyMut.mutate({ jobId: job.id, data: { coverLetter, resumeUrl } }, {
      onSuccess: () => { setApplyOpen(false); navigate('/candidate/applications'); },
    });
  };

  return (
    <div className="max-w-4xl">
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-text mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>

      <div className="card p-6 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            {job.company.logoUrl ? (
              <img src={job.company.logoUrl} alt={job.company.name} className="h-14 w-14 rounded-xl object-cover" />
            ) : (
              <div className="h-14 w-14 rounded-xl bg-accent/15 flex items-center justify-center text-accent text-xl font-bold">
                {job.company.name[0]}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-text">{job.title}</h1>
              <p className="text-text-secondary mt-0.5">{job.company.name}</p>
            </div>
          </div>
          {user?.role === 'CANDIDATE' && (
            <Button onClick={handleApply} size="lg">Apply now</Button>
          )}
        </div>

        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm text-text-secondary">
          {job.company.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-text-muted" />{job.company.location}</span>}
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-text-muted" />Posted {timeAgo(job.createdAt)}</span>
          <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-text-muted" />{job._count.applications} applicants</span>
          {(job.salaryMin || job.salaryMax) && (
            <span className="flex items-center gap-1.5"><DollarSign className="h-4 w-4 text-text-muted" />{formatSalary(job.salaryMin, job.salaryMax, job.currency)}</span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Badge className={JOB_TYPE_COLORS[job.type]}><Briefcase className="h-3 w-3" />{JOB_TYPE_LABELS[job.type]}</Badge>
          {job.tags.map(t => <Badge key={t.id} className="bg-surface text-text-secondary">{t.name}</Badge>)}
        </div>
      </div>

      <div className="card p-6 mb-4">
        <h2 className="text-base font-semibold text-text mb-4">Job Description</h2>
        <div className="prose prose-invert max-w-none text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
          {job.description}
        </div>
      </div>

      {job.company && (
        <div className="card p-6">
          <h2 className="text-base font-semibold text-text mb-3">About {job.company.name}</h2>
          <div className="text-sm text-text-secondary space-y-1">
            {job.company.industry && <p>Industry: {job.company.industry}</p>}
            {job.company.location && <p>Location: {job.company.location}</p>}
          </div>
        </div>
      )}

      <Modal open={applyOpen} onClose={() => setApplyOpen(false)} title={`Apply — ${job.title}`}>
        <div className="space-y-4">
          <Input label="Resume URL" value={resumeUrl} onChange={e => setResumeUrl(e.target.value)} placeholder="https://..." />
          <Textarea label="Cover letter (optional)" value={coverLetter} onChange={e => setCoverLetter(e.target.value)} rows={5} placeholder="Tell them why you're a great fit..." />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setApplyOpen(false)}>Cancel</Button>
            <Button onClick={submitApply} loading={applyMut.isPending} disabled={!resumeUrl}>Submit application</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
