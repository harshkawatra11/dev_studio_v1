import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase } from 'lucide-react';
import { useLogin } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(1, 'Required'),
});
type Form = z.infer<typeof schema>;

export function Login() {
  const login = useLogin();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({ resolver: zodResolver(schema) });

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="p-3 bg-accent/15 rounded-2xl">
            <Briefcase className="h-8 w-8 text-accent" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-text text-center mb-1">Welcome back</h1>
        <p className="text-sm text-text-secondary text-center mb-8">Sign in to your account</p>

        <form onSubmit={handleSubmit(d => login.mutate(d))} className="card p-6 space-y-4">
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />

          {login.error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              {(login.error as any)?.response?.data?.error || 'Invalid credentials'}
            </p>
          )}

          <Button type="submit" className="w-full" loading={login.isPending}>Sign in</Button>
        </form>

        <p className="text-sm text-text-secondary text-center mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-accent hover:text-accent-hover transition-colors">Create one</Link>
        </p>
      </div>
    </div>
  );
}
