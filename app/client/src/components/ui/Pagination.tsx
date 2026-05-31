import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PaginationMeta } from '@/types';
import { Button } from './Button';

interface Props {
  meta: PaginationMeta;
  onChange: (page: number) => void;
}

export function Pagination({ meta, onChange }: Props) {
  if (meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-6">
      <p className="text-xs text-text-muted">
        Showing {(meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange(meta.page - 1)} disabled={!meta.hasPrev}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-text-secondary px-2">
          {meta.page} / {meta.totalPages}
        </span>
        <Button variant="outline" size="sm" onClick={() => onChange(meta.page + 1)} disabled={!meta.hasNext}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
