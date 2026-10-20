'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Spin } from 'antd';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { getJob, updateJob } from '@/services/jobs.service';
import { JobForm } from './JobForm';

type EditJobPageProps = {
  id: string;
};

export function EditJobPage({ id }: EditJobPageProps) {
  const { message } = App.useApp();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const jobQuery = useQuery({
    queryKey: ['jobs', id],
    queryFn: () => getJob(id),
  });

  const mutation = useMutation({
    mutationFn: (input: Parameters<typeof updateJob>[1]) => updateJob(id, input),
    onSuccess: async (job) => {
      message.success('Job updated');
      await queryClient.invalidateQueries({ queryKey: ['jobs'] });
      router.replace(`/jobs/${job.id}`);
    },
    onError: (error) => setErrorMessage(getApiErrorMessage(error)),
  });

  if (jobQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (jobQuery.isError || !jobQuery.data) {
    return <Alert type="error" showIcon message={getApiErrorMessage(jobQuery.error)} />;
  }

  return (
    <JobForm
      initial={jobQuery.data}
      submitLabel="Save changes"
      isSubmitting={mutation.isPending}
      errorMessage={errorMessage}
      onSubmit={async (values) => {
        setErrorMessage(null);
        await mutation.mutateAsync({
          title: values.title,
          description: values.description,
          skills: values.skills,
          budgetType: values.budgetType,
          budgetMin: values.budgetMin,
          budgetMax: values.budgetMax,
          currency: values.currency,
          deadline: values.deadline,
          attachmentUploadIds: values.attachmentUploadIds,
        });
      }}
    />
  );
}
