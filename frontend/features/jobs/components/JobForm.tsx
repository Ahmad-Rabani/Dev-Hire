'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Button, DatePicker, Input, Radio } from 'antd';
import dayjs from 'dayjs';
import { Controller, useForm } from 'react-hook-form';
import type { Job } from '@/types/job';
import { jobFormSchema, skillsFromText, type JobFormValues } from '../schemas';

type JobFormProps = {
  initial?: Job;
  submitLabel: string;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (values: {
    title: string;
    description: string;
    skills: string[];
    budgetType: 'fixed' | 'hourly';
    budgetMin: number;
    budgetMax: number;
    currency: string;
    deadline: string;
    status: 'draft' | 'open';
  }) => Promise<void> | void;
};

export function JobForm({
  initial,
  submitLabel,
  isSubmitting,
  errorMessage,
  onSubmit,
}: JobFormProps) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      skillsText: initial?.skills.join(', ') ?? '',
      budgetType: initial?.budgetType ?? 'fixed',
      budgetMin: initial?.budgetMin ?? 100,
      budgetMax: initial?.budgetMax ?? 500,
      currency: initial?.currency ?? 'USD',
      deadline: initial?.deadline
        ? dayjs(initial.deadline).toISOString()
        : dayjs().add(14, 'day').toISOString(),
      status: initial?.status === 'open' ? 'open' : 'draft',
    },
  });

  const submit = handleSubmit(async (values) => {
    await onSubmit({
      title: values.title,
      description: values.description,
      skills: skillsFromText(values.skillsText),
      budgetType: values.budgetType,
      budgetMin: values.budgetMin,
      budgetMax: values.budgetMax,
      currency: values.currency,
      deadline: new Date(values.deadline).toISOString(),
      status: values.status,
    });
  });

  return (
    <form onSubmit={submit} className="mx-auto max-w-2xl space-y-4" noValidate>
      {errorMessage ? <Alert type="error" showIcon message={errorMessage} /> : null}

      <div>
        <label htmlFor="title" className="mb-1 block text-sm font-medium">
          Title
        </label>
        <Controller
          name="title"
          control={control}
          render={({ field }) => <Input {...field} id="title" size="large" />}
        />
        {errors.title ? <p className="mt-1 text-sm text-red-600">{errors.title.message}</p> : null}
      </div>

      <div>
        <label htmlFor="description" className="mb-1 block text-sm font-medium">
          Description
        </label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => <Input.TextArea {...field} id="description" rows={6} />}
        />
        {errors.description ? (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        ) : null}
      </div>

      <div>
        <label htmlFor="skills" className="mb-1 block text-sm font-medium">
          Skills (comma-separated)
        </label>
        <Controller
          name="skillsText"
          control={control}
          render={({ field }) => (
            <Input {...field} id="skills" size="large" placeholder="React, Node.js" />
          )}
        />
        {errors.skillsText ? (
          <p className="mt-1 text-sm text-red-600">{errors.skillsText.message}</p>
        ) : null}
      </div>

      <div>
        <span className="mb-1 block text-sm font-medium">Budget type</span>
        <Controller
          name="budgetType"
          control={control}
          render={({ field }) => (
            <Radio.Group {...field} optionType="button" buttonStyle="solid">
              <Radio.Button value="fixed">Fixed</Radio.Button>
              <Radio.Button value="hourly">Hourly</Radio.Button>
            </Radio.Group>
          )}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="budgetMin" className="mb-1 block text-sm font-medium">
            Min budget
          </label>
          <Controller
            name="budgetMin"
            control={control}
            render={({ field }) => (
              <Input {...field} id="budgetMin" type="number" size="large" />
            )}
          />
          {errors.budgetMin ? (
            <p className="mt-1 text-sm text-red-600">{errors.budgetMin.message}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="budgetMax" className="mb-1 block text-sm font-medium">
            Max budget
          </label>
          <Controller
            name="budgetMax"
            control={control}
            render={({ field }) => (
              <Input {...field} id="budgetMax" type="number" size="large" />
            )}
          />
        </div>
      </div>

      <div>
        <label htmlFor="deadline" className="mb-1 block text-sm font-medium">
          Deadline
        </label>
        <Controller
          name="deadline"
          control={control}
          render={({ field }) => (
            <DatePicker
              id="deadline"
              showTime
              size="large"
              className="w-full"
              value={field.value ? dayjs(field.value) : null}
              onChange={(value) => field.onChange(value ? value.toISOString() : '')}
            />
          )}
        />
        {errors.deadline ? (
          <p className="mt-1 text-sm text-red-600">{errors.deadline.message}</p>
        ) : null}
      </div>

      {!initial || initial.status === 'draft' || initial.status === 'open' ? (
        <div>
          <span className="mb-1 block text-sm font-medium">Initial status</span>
          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <Radio.Group {...field} optionType="button">
                <Radio.Button value="draft">Save as draft</Radio.Button>
                <Radio.Button value="open">Publish open</Radio.Button>
              </Radio.Group>
            )}
          />
        </div>
      ) : null}

      <Button type="primary" htmlType="submit" size="large" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
