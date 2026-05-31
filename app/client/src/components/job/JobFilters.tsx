import { Search, MapPin, X } from 'lucide-react';
import { JobFilters as Filters, JobType } from '@/types';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { JOB_TYPE_LABELS } from '@/lib/utils';

interface Props {
  filters: Filters;
  onChange: (f: Filters) => void;
}

export function JobFiltersBar({ filters, onChange }: Props) {
  const set = (patch: Partial<Filters>) => onChange({ ...filters, ...patch, page: 1 });
  const hasFilters = filters.keyword || filters.type || filters.location;

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <Input
          placeholder="Job title, skill, or keyword"
          icon={<Search className="h-4 w-4" />}
          value={filters.keyword || ''}
          onChange={e => set({ keyword: e.target.value })}
        />
      </div>
      <div className="w-40">
        <Input
          placeholder="Location"
          icon={<MapPin className="h-4 w-4" />}
          value={filters.location || ''}
          onChange={e => set({ location: e.target.value })}
        />
      </div>
      <div className="w-36">
        <Select value={filters.type || ''} onChange={e => set({ type: e.target.value as JobType | '' })}>
          <option value="">All types</option>
          {Object.entries(JOB_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </Select>
      </div>
      {hasFilters && (
        <Button variant="ghost" size="md" onClick={() => onChange({ page: 1, limit: 20 })}>
          <X className="h-4 w-4" /> Clear
        </Button>
      )}
    </div>
  );
}
