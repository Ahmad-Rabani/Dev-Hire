'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Input, Progress, Select, Spin } from 'antd';
import { Controller, useForm } from 'react-hook-form';
import { getApiErrorMessage } from '@/lib/api-client';
import { fetchMyProfile, updateMyProfile } from '@/services/users.service';
import { useAuthStore } from '@/stores/auth-store';
import { profileSchema, type ProfileFormValues } from './schemas';

export function ProfileEditForm() {
  const { message } = App.useApp();
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['users', 'me'],
    queryFn: fetchMyProfile,
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    values: profileQuery.data
      ? {
          name: profileQuery.data.user.name,
          bio: profileQuery.data.user.bio ?? '',
          avatarUrl: profileQuery.data.user.avatarUrl ?? '',
          professionalTitle: profileQuery.data.user.professionalTitle ?? '',
          about: profileQuery.data.user.about ?? '',
          skillsText: (profileQuery.data.user.skills ?? []).join(', '),
          hourlyRate: profileQuery.data.user.hourlyRate,
          availability: profileQuery.data.user.availability ?? 'available',
        }
      : undefined,
  });

  const mutation = useMutation({
    mutationFn: updateMyProfile,
    onSuccess: (data) => {
      setUser(data.user);
      void queryClient.setQueryData(['users', 'me'], data);
      message.success('Profile saved');
    },
  });

  if (profileQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Alert
        type="error"
        showIcon
        message="Could not load profile"
        description={getApiErrorMessage(profileQuery.error)}
      />
    );
  }

  const user = profileQuery.data.user;
  const isFreelancer = user.role === 'freelancer';

  const onSubmit = form.handleSubmit(async (values) => {
    const skills = (values.skillsText ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    await mutation.mutateAsync({
      name: values.name,
      bio: values.bio,
      avatarUrl: values.avatarUrl,
      ...(isFreelancer
        ? {
            professionalTitle: values.professionalTitle,
            about: values.about,
            skills,
            hourlyRate:
              values.hourlyRate === undefined || Number.isNaN(values.hourlyRate)
                ? null
                : values.hourlyRate,
            availability: values.availability,
          }
        : {}),
    });
  });

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-2xl space-y-5" noValidate>
      {!user.emailVerified ? (
        <Alert
          type="warning"
          showIcon
          message="Email not verified"
          description="Check your inbox (or backend logs if SMTP is unset) for a verification link."
        />
      ) : null}

      <div>
        <p className="mb-1 text-sm font-medium text-slate-700">Profile completion</p>
        <Progress percent={profileQuery.data.profileCompletion} strokeColor="#0f766e" />
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>
          <span className="font-medium text-slate-800">Email:</span> {user.email}
        </p>
        <p>
          <span className="font-medium text-slate-800">Role:</span> {user.role}
        </p>
        <p className="text-xs text-slate-500">Email and role cannot be changed here.</p>
      </div>

      <div>
        <label htmlFor="profile-name" className="mb-1 block text-sm font-medium">
          Name
        </label>
        <Controller
          name="name"
          control={form.control}
          render={({ field }) => <Input {...field} id="profile-name" size="large" />}
        />
        {form.formState.errors.name ? (
          <p className="mt-1 text-sm text-red-600">{form.formState.errors.name.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="bio" className="mb-1 block text-sm font-medium">
          Short bio
        </label>
        <Controller
          name="bio"
          control={form.control}
          render={({ field }) => <Input.TextArea {...field} id="bio" rows={3} />}
        />
      </div>

      <div>
        <label htmlFor="avatarUrl" className="mb-1 block text-sm font-medium">
          Avatar URL
        </label>
        <Controller
          name="avatarUrl"
          control={form.control}
          render={({ field }) => (
            <Input {...field} id="avatarUrl" size="large" placeholder="https://…" />
          )}
        />
        <p className="mt-1 text-xs text-slate-500">
          File uploads arrive in Phase 7. Use a public image URL for now.
        </p>
      </div>

      {isFreelancer ? (
        <>
          <div>
            <label htmlFor="title" className="mb-1 block text-sm font-medium">
              Professional title
            </label>
            <Controller
              name="professionalTitle"
              control={form.control}
              render={({ field }) => (
                <Input {...field} id="title" size="large" placeholder="Full-stack developer" />
              )}
            />
          </div>

          <div>
            <label htmlFor="about" className="mb-1 block text-sm font-medium">
              About
            </label>
            <Controller
              name="about"
              control={form.control}
              render={({ field }) => <Input.TextArea {...field} id="about" rows={5} />}
            />
          </div>

          <div>
            <label htmlFor="skills" className="mb-1 block text-sm font-medium">
              Skills (comma-separated)
            </label>
            <Controller
              name="skillsText"
              control={form.control}
              render={({ field }) => (
                <Input {...field} id="skills" size="large" placeholder="React, Node.js, MongoDB" />
              )}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="rate" className="mb-1 block text-sm font-medium">
                Hourly rate (USD)
              </label>
              <Controller
                name="hourlyRate"
                control={form.control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="rate"
                    type="number"
                    size="large"
                    value={field.value ?? ''}
                    onChange={(e) =>
                      field.onChange(e.target.value === '' ? undefined : Number(e.target.value))
                    }
                  />
                )}
              />
            </div>
            <div>
              <label htmlFor="availability" className="mb-1 block text-sm font-medium">
                Availability
              </label>
              <Controller
                name="availability"
                control={form.control}
                render={({ field }) => (
                  <Select
                    {...field}
                    id="availability"
                    size="large"
                    className="w-full"
                    options={[
                      { value: 'available', label: 'Available' },
                      { value: 'busy', label: 'Busy' },
                      { value: 'unavailable', label: 'Unavailable' },
                    ]}
                  />
                )}
              />
            </div>
          </div>
        </>
      ) : null}

      {mutation.isError ? (
        <Alert type="error" showIcon message={getApiErrorMessage(mutation.error)} />
      ) : null}

      <Button type="primary" htmlType="submit" size="large" loading={mutation.isPending}>
        Save profile
      </Button>
    </form>
  );
}
