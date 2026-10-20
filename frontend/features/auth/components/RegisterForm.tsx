'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, App, Button, Checkbox, Input, Radio } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { getApiErrorMessage } from '@/lib/api-client';
import { register as registerUser } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth-store';
import { registerSchema, type RegisterFormValues } from '../schemas';
import { dashboardPathForRole } from '../lib/redirects';

export function RegisterForm() {
  const { message } = App.useApp();
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'client',
      acceptTerms: undefined as unknown as true,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const session = await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
        role: values.role,
        acceptTerms: true,
      });
      setSession(session.accessToken, session.user);
      if (session.emailDelivery?.verificationEmailQueued) {
        message.success('Account created. Check your email to verify.');
      } else {
        message.success(
          'Account created. Check the backend console for a verification token if SMTP is not configured.',
        );
      }
      router.replace(dashboardPathForRole(session.user.role));
    } catch (error) {
      setFormError(getApiErrorMessage(error, 'Unable to register'));
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? <Alert type="error" showIcon message={formError} /> : null}

      <div>
        <label htmlFor="name" className="mb-1 block text-sm font-medium text-slate-700">
          Full name
        </label>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input {...field} id="name" size="large" autoComplete="name" status={errors.name ? 'error' : undefined} />
          )}
        />
        {errors.name ? <p className="mt-1 text-sm text-red-600">{errors.name.message}</p> : null}
      </div>

      <div>
        <label htmlFor="reg-email" className="mb-1 block text-sm font-medium text-slate-700">
          Email
        </label>
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              id="reg-email"
              type="email"
              size="large"
              autoComplete="email"
              status={errors.email ? 'error' : undefined}
            />
          )}
        />
        {errors.email ? <p className="mt-1 text-sm text-red-600">{errors.email.message}</p> : null}
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium text-slate-700">Account type</span>
        <Controller
          name="role"
          control={control}
          render={({ field }) => (
            <Radio.Group {...field} optionType="button" buttonStyle="solid">
              <Radio.Button value="client">Client</Radio.Button>
              <Radio.Button value="freelancer">Freelancer</Radio.Button>
            </Radio.Group>
          )}
        />
        {errors.role ? <p className="mt-1 text-sm text-red-600">{errors.role.message}</p> : null}
      </div>

      <div>
        <label htmlFor="reg-password" className="mb-1 block text-sm font-medium text-slate-700">
          Password
        </label>
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input.Password
              {...field}
              id="reg-password"
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
        <label htmlFor="confirmPassword" className="mb-1 block text-sm font-medium text-slate-700">
          Confirm password
        </label>
        <Controller
          name="confirmPassword"
          control={control}
          render={({ field }) => (
            <Input.Password
              {...field}
              id="confirmPassword"
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

      <Controller
        name="acceptTerms"
        control={control}
        render={({ field: { value, onChange, ...rest } }) => (
          <Checkbox
            {...rest}
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked ? true : undefined)}
          >
            I agree to the DevHire terms of use for this learning project
          </Checkbox>
        )}
      />
      {errors.acceptTerms ? (
        <p className="text-sm text-red-600">{errors.acceptTerms.message}</p>
      ) : null}

      <Button type="primary" htmlType="submit" size="large" block loading={isSubmitting}>
        Create account
      </Button>

      <p className="text-center text-sm text-slate-600">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-teal-700 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
