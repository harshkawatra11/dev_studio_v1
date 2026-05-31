import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Users, Calendar } from 'lucide-react';
import { useJobApplications } from '@/hooks/useApplications';
import { useUpdateStatus } from '@/hooks/useApplications';
import { interviewsApi } from '@/api/interviews';
import { Application, ApplicationStatus } from '@/types';
import { PageSpinner } from '@/components/ui/Spinner';
import { StatusBadge } from '@/components/applications/StatusBadge';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Empty } from '@/components/ui/Empty';
import { formatDate, STATUS_STYLES } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';

const PIPELINE_STAGES: ApplicationStatus[] = ['APPLIED','SCREENING','INTERVIEW','OFFER','HIRED','REJECTED'];

interface CardProps { app: Application; onAction: () => void; }

function AppCard({ app, onAction }: CardProps) {
  return (
    <div className="card p-4 hover:border-accent/40 transition-colors cursor-pointer" onClick={onAction}>
      <div className="flex items-start gap-3">
        <Avatar name={app.candidate.name} src={app.candidate.avatarUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text truncate">{app.candidate.name}</p>
          <p className="text-xs text-text-muted mt-0.5 truncate">{app.candidate.email}</p>
        </div>
      </div>
      {app.interview && (
        <div className="mt-2 flex items-center gap-1 text-xs text-blue-300 bg-blue-500/10 rounded px-2 py-1">
          <Calendar className="h-3 w-3" />{formatDate(app.interview.scheduledAt)}
        </div>
      )}
    </div>
  );
}

export function Pipeline() {
  const { jobId } = useParams<{ jobId: string }>();
  const { data, isLoading } = useJobApplications(jobId || '');
  const updateStatus = useUpdateStatus();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<Application | null>(null);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('APPLIED');
  const [schedOpen, setSchedOpen] = useState(false);
  const [interviewDate, setInterviewDate] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [notes, setNotes] = useState('');

  if (isLoading) return <PageSpinner />;
  const apps = data?.data || [];

  const byStage = (stage: ApplicationStatus) => apps.filter(a => a.status === stage);

  const handleMove = () => {
    if (!selected) return;
    updateStatus.mutate({ appId: selected.id, status: newStatus }, {
      onSuccess: () => setSelected(null),
    });
  };

  const handleSchedule = () => {
    if (!selected) return;
    interviewsApi.schedule(selected.id, { scheduledAt: interviewDate, meetLink, notes }).then(() => {
      qc.invalidateQueries({ queryKey: ['job-applications'] });
      setSchedOpen(false);
    });
  };

  if (apps.length === 0) {
    return <Empty icon={Users} title="No applications yet" description="Applications for this job will appear here." />;
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-text mb-6">Applicant Pipeline</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map(stage => {
          const stageApps = byStage(stage);
          const style = STATUS_STYLES[stage];
          return (
            <div key={stage} className="flex-shrink-0 w-64">
              <div className={`flex items-center gap-2 mb-3 px-2 py-1.5 rounded-lg ${style.bg}`}>
                <span className={`text-xs font-semibold ${style.text}`}>{style.label}</span>
                <span className={`ml-auto text-xs font-bold ${style.text} bg-black/20 px-1.5 py-0.5 rounded-full`}>
                  {stageApps.length}
                </span>
              </div>
              <div className="flex flex-col gap-2">
                {stageApps.map(app => (
                  <AppCard key={app.id} app={app} onAction={() => { setSelected(app); setNewStatus(app.status); }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={!!selected && !schedOpen} onClose={() => setSelected(null)} title={selected?.candidate.name}>
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar name={selected?.candidate.name || ''} src={selected?.candidate.avatarUrl} size="lg" />
            <div>
              <p className="text-sm font-semibold text-text">{selected?.candidate.name}</p>
              <p className="text-xs text-text-muted">{selected?.candidate.email}</p>
            </div>
          </div>
          {selected?.coverLetter && (
            <div>
              <p className="text-xs font-medium text-text-secondary mb-1">Cover Letter</p>
              <p className="text-sm text-text-secondary bg-surface rounded-lg p-3 text-xs">{selected.coverLetter}</p>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Select value={newStatus} onChange={e => setNewStatus(e.target.value as ApplicationStatus)} className="flex-1">
              {PIPELINE_STAGES.map(s => <option key={s} value={s}>{STATUS_STYLES[s].label}</option>)}
            </Select>
            <Button onClick={handleMove} loading={updateStatus.isPending} size="sm">Move</Button>
          </div>
          <Button variant="outline" className="w-full" onClick={() => setSchedOpen(true)}>
            <Calendar className="h-4 w-4" /> Schedule interview
          </Button>
        </div>
      </Modal>

      <Modal open={schedOpen} onClose={() => setSchedOpen(false)} title="Schedule Interview" size="sm">
        <div className="space-y-3">
          <Input label="Date & time" type="datetime-local" value={interviewDate} onChange={e => setInterviewDate(e.target.value)} />
          <Input label="Meet link (optional)" value={meetLink} onChange={e => setMeetLink(e.target.value)} placeholder="https://meet.google.com/..." />
          <Textarea label="Notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setSchedOpen(false)}>Cancel</Button>
            <Button onClick={handleSchedule} disabled={!interviewDate}>Schedule</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
