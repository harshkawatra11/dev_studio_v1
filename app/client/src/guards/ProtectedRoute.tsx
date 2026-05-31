import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/auth.store';
import { Role } from '@/types';

interface Props {
  roles?: Role[];
  redirectTo?: string;
}

export function ProtectedRoute({ roles, redirectTo = '/login' }: Props) {
  const { user } = useAuthStore();
  if (!user) return <Navigate to={redirectTo} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <Outlet />;
}
