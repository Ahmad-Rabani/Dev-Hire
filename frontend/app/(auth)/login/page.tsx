import { Suspense } from 'react';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { LoginForm } from '@/features/auth/components/LoginForm';

export const metadata = {
  title: 'Log in',
};

export default function LoginPage() {
  return (
    <AuthShell title="Log in" subtitle="Welcome back to DevHire.">
      <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
