'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, App, Button, Input } from 'antd';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { getApiErrorMessage } from '@/lib/api-client';
import { resetPassword } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { resetPasswordSchema, type ResetPasswordFormValues } from '../schemas';

export function ResetPasswordForm() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const clearSession = useAuthStore((s) => s.clearSession);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    if (!token) {
      setFormError('Missing reset token. Open the link from your email (or backend logs).');
      return;
    }
    try {
      const msg = await resetPassword(token, values.password);
      clearSession();
      message.success(msg);
      router.replace('/login');
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? <Alert type="error" showIcon message={formError} /> : null}
      {!token ? (
        <Alert type="warning" showIcon message="No reset token found in the URL." />
      ) : null}

      <div>
        <label htmlFor="new-password" className="mb-1 block text-sm font-medium text-slate-700">
          New password
        </label>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input.Password
              {...field}
              id="new-password"
              size="large"
              autoComplete="new-password"
              status={errors.password ? 'error' : undefined}
            />
          )}
        />
        {errors.password ? (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="confirm-new" className="mb-1 block text-sm font-medium text-slate-700">
          Confirm password
        </label>
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field }) => (
            <Input.Password
              {...field}
              id="confirm-new"
              size="large"
              autoComplete="new-password"
              status={errors.confirmPassword ? 'error' : undefined}
            />
          )}
        />
        {errors.confirmPassword ? (
          <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>
        ) : null}
      </div>

      <Button type="primary" htmlType="submit" size="large" block loading={isSubmitting}>
        Update password
      </Button>

      <p className="text-center text-sm text-slate-600">
        <Link href="/login" className="text-teal-700 hover:underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}
