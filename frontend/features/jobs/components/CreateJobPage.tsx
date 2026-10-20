'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { createJob } from '@/services/jobs.service';
import { JobForm } from './JobForm';

export function CreateJobPage() {
  const { message } = App.useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createJob,
    onSuccess: async (job) => {
      message.success('Job created');
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      router.replace(job.status === 'draft' ? '/client/jobs' : `/jobs/${job.id}`);
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error)),
  });

  return (
    <JobForm
      submitLabel="Create job"
      isSubmitting={mutation.isPending}
      errorMessage={errorMessage}
      onSubmit={async (values) => {
        setErrorMessage(null);
        await mutation.mutateAsync(values);
      }}
    />
  );
}
