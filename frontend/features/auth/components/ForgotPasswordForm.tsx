'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, Input } from 'antd';
import Link from 'next/link';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { getApiErrorMessage } from '@/lib/api-client';
import { forgotPassword } from '@/services/auth.service';
import { forgotPasswordSchema, type ForgotPasswordFormValues } from '../schemas';

export function ForgotPasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setSuccess(null);
    try {
      const msg = await forgotPassword(values.email);
      setSuccess(msg);
    } catch (error) {
      setFormError(getApiErrorMessage(error));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? <Alert type="error" showIcon message={formError} /> : null}
      {success ? <Alert type="success" showIcon message={success} /> : null}

      <div>
        <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="forgot-email"
              type="email"
              size="large"
              autoComplete="email"
              status={errors.email ? 'error' : undefined}
            />
          )}
        />
        {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
      </div>

      <Button type="primary" htmlType="submit" size="large" block loading={isSubmitting}>
        Send reset link
      </Button>

      <p className="text-center text-sm text-slate-600">
        <Link href="/login" className="text-teal-700 hover:underline">
          Back to login
        </Link>
      </p>
    </form>
  );
}
