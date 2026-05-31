import { ApplicationStatus } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { STATUS_STYLES } from '@/lib/utils';

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const s = STATUS_STYLES[status];
  return (
    <Badge className={`${s.bg} ${s.text}`} dot>
      {s.label}
    </Badge>
  );
}
