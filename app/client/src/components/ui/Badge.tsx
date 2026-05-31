import { cn } from '@/lib/utils';

interface Props {
  children: React.ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ children, className, dot }: Props) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
