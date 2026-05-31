import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface NavItem { label: string; to: string; icon: React.ReactNode; }

interface Props { items: NavItem[]; }

export function DashboardSidebar({ items }: Props) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          end
          className={({ isActive }) => cn(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
            isActive
              ? 'bg-accent/15 text-accent font-medium'
              : 'text-text-secondary hover:bg-card hover:text-text',
          )}
        >
          {item.icon}{item.label}
        </NavLink>
      ))}
    </nav>
  );
}
