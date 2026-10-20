'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Input, Progress, Select, Spin } from 'antd';
import { useState } from 'react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { FileUploadField } from '@/components/uploads/FileUploadField';
import { getApiErrorMessage } from '@/lib/api-client';
import { fetchMyProfile, updateMyProfile } from '@/services/users.service';
import type { PublicUpload } from '@/services/upload.service';
import { useAuthStore } from '@/stores/auth-store';
import { profileSchema, type ProfileFormValues } from './schemas';

export function ProfileEditForm() {
  const { message } = App.useApp();
  const setUser = useAuthStore((s) => s.setUser);
  const queryClient = useQueryClient();
  const [avatarPreview, setAvatarPreview] = useState('');

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
          portfolio: (profileQuery.data.user.portfolio ?? []).map((item) => ({
            title: item.title,
            description: item.description ?? '',
            url: item.url ?? '',
            imageUrl: item.imageUrl ?? '',
          })),
        }
      : undefined,
  });

  const portfolioFields = useFieldArray({ control: form.control, name: 'portfolio' });

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
  const previewSrc = avatarPreview || user.avatarUrl || '';

  const onAvatarUploaded = async (files: PublicUpload[]) => {
    const uploaded = files[0];
    if (!uploaded) return;
    form.setValue('avatarUrl', uploaded.url, { shouldDirty: true });
    setAvatarPreview(uploaded.url);
    await queryClient.invalidateQueries({ queryKey: ['users', 'me'] });
    message.success('Avatar uploaded');
  };

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
            portfolio: (values.portfolio ?? []).map((item) => ({
              title: item.title,
              description: item.description || undefined,
              url: item.url || undefined,
              imageUrl: item.imageUrl || undefined,
            })),
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
          description="Check your inbox (or start the email worker with SMTP configured) for a verification link."
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

      <div className="space-y-3">
        <p className="text-sm font-medium text-slate-700">Profile photo</p>
        {previewSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={previewSrc}
            alt="Current avatar"
            className="h-20 w-20 rounded-full object-cover ring-1 ring-slate-200"
          />
        ) : null}
        <FileUploadField
          purpose="avatar"
          label="Upload avatar"
          maxFiles={1}
          onChange={(files) => void onAvatarUploaded(files)}
        />
        <Controller
          name="avatarUrl"
          control={form.control}
          render={({ field }) => (
            <Input {...field} id="avatarUrl" size="large" placeholder="Or paste https://…" />
          )}
        />
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

          <div className="space-y-3 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium text-slate-800">Portfolio</p>
              <Button
                type="dashed"
                onClick={() =>
                  portfolioFields.append({ title: '', description: '', url: '', imageUrl: '' })
                }
              >
                Add project
              </Button>
            </div>
            {portfolioFields.fields.length === 0 ? (
              <p className="text-sm text-slate-500">No portfolio items yet.</p>
            ) : null}
            {portfolioFields.fields.map((field, index) => (
              <div key={field.id} className="space-y-2 border-t border-slate-100 pt-3">
                <Controller
                  name={`portfolio.${index}.title`}
                  control={form.control}
                  render={({ field: f }) => (
                    <Input {...f} placeholder="Project title" size="large" />
                  )}
                />
                <Controller
                  name={`portfolio.${index}.description`}
                  control={form.control}
                  render={({ field: f }) => (
                    <Input.TextArea {...f} rows={2} placeholder="Short description" />
                  )}
                />
                <Controller
                  name={`portfolio.${index}.url`}
                  control={form.control}
                  render={({ field: f }) => <Input {...f} placeholder="Project URL (optional)" />}
                />
                <FileUploadField
                  purpose="portfolio"
                  resourceType="portfolio"
                  label="Portfolio image"
                  maxFiles={1}
                  onChange={(files) => {
                    const uploaded = files[0];
                    if (uploaded) {
                      form.setValue(`portfolio.${index}.imageUrl`, uploaded.url, {
                        shouldDirty: true,
                      });
                    }
                  }}
                />
                <Controller
                  name={`portfolio.${index}.imageUrl`}
                  control={form.control}
                  render={({ field: f }) => (
                    <Input {...f} placeholder="Or paste image URL" />
                  )}
                />
                <Button danger type="link" onClick={() => portfolioFields.remove(index)}>
                  Remove project
                </Button>
              </div>
            ))}
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
