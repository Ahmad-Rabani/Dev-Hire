import { Suspense } from 'react';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { ResetPasswordForm } from '@/features/auth/components/ResetPasswordForm';

export const metadata = {
  title: 'Reset password',
};

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" subtitle="Use a strong password you have not used before.">
      <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
