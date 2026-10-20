'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, App, Button, Input } from 'antd';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { getApiErrorMessage } from '@/lib/api-client';
import { login } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { loginSchema, type LoginFormValues } from '../schemas';
import { dashboardPathForRole, sanitizeReturnTo } from '../lib/redirects';

export function LoginForm() {
  const { message } = App.useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const setSession = useAuthStore((s) => s.setSession);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const session = await login(values);
      setSession(session.accessToken, session.user);
      message.success('Welcome back');
      const fallback = dashboardPathForRole(session.user.role);
      const returnTo = sanitizeReturnTo(searchParams.get('returnTo'), fallback);
      router.replace(returnTo);
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to sign in'));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? <Alert type="error" showIcon message={formError} /> : null}

      <div>
        <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="email"
              type="email"
              autoComplete="email"
              size="large"
              status={errors.email ? 'error' : undefined}
            />
          )}
        />
        {errors.email ? (
          <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input.Password
              {...field}
              id="password"
              autoComplete="current-password"
              size="large"
              status={errors.password ? 'error' : undefined}
            />
          )}
        />
        {errors.password ? (
          <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
        ) : null}
      </div>

      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm text-teal-700 hover:underline">
          Forgot password?
        </Link>
      </div>

      <Button type="primary" htmlType="submit" size="large" block loading={isSubmitting}>
        Log in
      </Button>

      <p className="text-center text-sm text-slate-600">
        New to DevHire?{' '}
        <Link href="/register" className="font-medium text-teal-700 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
