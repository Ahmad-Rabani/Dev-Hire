'use client';

import { Alert, Button, Spin } from 'antd';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { verifyEmail } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';

export function VerifyEmailPanel() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const setUser = useAuthStore((s) => s.setUser);
  const [error, setError] = useState<string | null>(
    token ? null : 'Missing verification token.',
  );
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    void (async () => {
      try {
        const verifiedUser = await verifyEmail(token);
        if (cancelled) return;
        setSuccess(true);
        const current = useAuthStore.getState().user;
        if (current && current.id === verifiedUser.id) {
          setUser(verifiedUser);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, 'Verification failed'));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, setUser]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spin tip="Verifying email…" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {success ? (
        <Alert type="success" showIcon message="Email verified successfully." />
      ) : null}
      {error ? <Alert type="error" showIcon message={error} /> : null}
      <Link href="/login">
        <Button type="primary" block>
          Continue to login
        </Button>
      </Link>
    </div>
  );
}
