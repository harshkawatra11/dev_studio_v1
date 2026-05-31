import { Link, useNavigate } from 'react-router-dom';
import { Briefcase, LogOut, User, ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/auth.store';
import { Avatar } from '@/components/ui/Avatar';
import { authApi } from '@/api/auth';
import { cn } from '@/lib/utils';

export function Navbar() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const logout = () => {
    authApi.logout().catch(() => {});
    clearAuth();
    navigate('/');
  };

  const dashboardLink =
    user?.role === 'EMPLOYER' ? '/employer' :
    user?.role === 'ADMIN'    ? '/admin'    : '/candidate';

  return (
    <nav className="sticky top-0 z-40 h-14 bg-surface/80 backdrop-blur-md border-b border-border flex items-center px-6">
      <Link to="/" className="flex items-center gap-2 mr-8">
        <div className="p-1.5 bg-accent rounded-lg">
          <Briefcase className="h-4 w-4 text-white" />
        </div>
        <span className="text-sm font-bold text-text tracking-tight">JobBoard</span>
      </Link>

      <div className="flex items-center gap-1 flex-1">
        <Link to="/" className="text-sm text-text-secondary hover:text-text px-3 py-1.5 rounded-lg hover:bg-card transition-colors">
          Browse Jobs
        </Link>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <div className="relative">
            <button
              onClick={() => setOpen(o => !o)}
              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-card transition-colors"
            >
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              <span className="text-sm text-text-secondary">{user.name.split(' ')[0]}</span>
              <ChevronDown className={cn('h-3 w-3 text-text-muted transition-transform', open && 'rotate-180')} />
            </button>
            {open && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-48 bg-card border border-border rounded-xl shadow-xl z-20 overflow-hidden animate-slide-up">
                  <Link to={dashboardLink} onClick={() => setOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-text-secondary hover:bg-surface hover:text-text transition-colors">
                    <User className="h-4 w-4" /> Dashboard
                  </Link>
                  <div className="border-t border-border my-1" />
                  <button onClick={logout}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-surface transition-colors">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link to="/login" className="btn-ghost text-sm px-3 py-1.5">Sign in</Link>
            <Link to="/register" className="btn-primary text-sm px-3 py-1.5">Get started</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
