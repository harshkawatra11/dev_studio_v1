import { cn, getInitials } from '@/lib/utils';

interface Props {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Avatar({ name, src, size = 'md', className }: Props) {
  const s = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-12 w-12 text-base' }[size];
  return src ? (
    <img src={src} alt={name} className={cn('rounded-full object-cover', s, className)} />
  ) : (
    <div className={cn('rounded-full bg-accent/20 text-accent font-semibold flex items-center justify-center', s, className)}>
      {getInitials(name)}
    </div>
  );
}
