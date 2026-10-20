import { Suspense } from 'react';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { VerifyEmailPanel } from '@/features/auth/components/VerifyEmailPanel';

export const metadata = {
  title: 'Verify email',
};

export default function VerifyEmailPage() {
  return (
    <AuthShell title="Email verification" subtitle="Confirming your DevHire email address.">
      <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
        <VerifyEmailPanel />
      </Suspense>
    </AuthShell>
  );
}
