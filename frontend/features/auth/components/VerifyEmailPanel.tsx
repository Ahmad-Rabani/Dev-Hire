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
  const user = useAuthStore((s) => s.user);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('Missing verification token.');
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const verifiedUser = await verifyEmail(token);
        if (!cancelled) {
          setSuccess(true);
          if (user && user.id === verifiedUser.id) {
            setUser(verifiedUser);
          }
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
  }, [token, setUser, user]);

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
