import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase } from 'lucide-react';
import { useRegister } from '@/hooks/useAuth';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

const schema = z.object({
  name:     z.string().min(2, 'Name too short'),
  email:    z.string().email('Invalid email'),
  password: z.string().min(8, 'At least 8 characters'),
  role:     z.enum(['CANDIDATE', 'EMPLOYER']),
});
type Form = z.infer<typeof schema>;

export function Register() {
  const registerMut = useRegister();
  const { register, handleSubmit, formState: { errors } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { role: 'CANDIDATE' },
  });

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <div className="p-3 bg-accent/15 rounded-2xl">
            <Briefcase className="h-8 w-8 text-accent" />
          </div>
        </div>
        <h1 className="text-xl font-bold text-text text-center mb-1">Create account</h1>
        <p className="text-sm text-text-secondary text-center mb-8">Join thousands of professionals</p>

        <form onSubmit={handleSubmit(d => registerMut.mutate(d))} className="card p-6 space-y-4">
          <Input label="Full name" error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" error={errors.password?.message} {...register('password')} />
          <Select label="I am a…" error={errors.role?.message} {...register('role')}>
            <option value="CANDIDATE">Candidate — looking for work</option>
            <option value="EMPLOYER">Employer — hiring talent</option>
          </Select>

          {registerMut.error && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              {(registerMut.error as any)?.response?.data?.error || 'Registration failed'}
            </p>
          )}

          <Button type="submit" className="w-full" loading={registerMut.isPending}>Create account</Button>
        </form>

        <p className="text-sm text-text-secondary text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-accent hover:text-accent-hover transition-colors">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
