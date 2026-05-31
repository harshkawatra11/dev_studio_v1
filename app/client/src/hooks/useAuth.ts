import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/auth';
import { useAuthStore } from '@/store/auth.store';

export function useLogin() {
  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      setAuth(data.user as any, data.accessToken, data.refreshToken);
      const role = data.user.role;
      if (role === 'EMPLOYER') navigate('/employer');
      else if (role === 'ADMIN') navigate('/admin');
      else navigate('/candidate');
    },
  });
}

export function useRegister() {
  const setAuth = useAuthStore(s => s.setAuth);
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      setAuth(data.user as any, data.accessToken, data.refreshToken);
      const role = data.user.role;
      if (role === 'EMPLOYER') navigate('/employer');
      else navigate('/candidate');
    },
  });
}

export function useLogout() {
  const clearAuth = useAuthStore(s => s.clearAuth);
  const navigate = useNavigate();
  return () => {
    authApi.logout().catch(() => {});
    clearAuth();
    navigate('/');
  };
}
