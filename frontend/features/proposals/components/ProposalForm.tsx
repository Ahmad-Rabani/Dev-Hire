'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Input } from 'antd';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { getApiErrorMessage } from '@/lib/api-client';
import { submitProposal } from '@/services/proposals.service';
import { proposalFormSchema, type ProposalFormValues } from '../schemas';

type ProposalFormProps = {
  jobId: string;
  onSubmitted?: () => void;
};

export function ProposalForm({ jobId, onSubmitted }: ProposalFormProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: { coverLetter: '', bidAmount: 100, deliveryDays: 7 },
  });

  const mutation = useMutation({
    mutationFn: (values: ProposalFormValues) => submitProposal(jobId, values),
    onSuccess: async () => {
      message.success('Proposal submitted');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['proposals'] }),
        queryClient.invalidateQueries({ queryKey: ['jobs', jobId] }),
        queryClient.invalidateQueries({ queryKey: ['proposals', 'mine-for-job', jobId] }),
      ]);
      onSubmitted?.();
    },
    onError: (error) => setFormError(getApiErrorMessage(error)),
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    await mutation.mutateAsync(values);
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      {formError ? <Alert type="error" showIcon message={formError} /> : null}

      <div>
        <label htmlFor="coverLetter" className="mb-1 block text-sm font-medium">
          Cover letter
        </label>
        <Controller
          name="coverLetter"
          control={control}
          render={({ field }) => <Input.TextArea {...field} id="coverLetter" rows={5} />}
        />
        {errors.coverLetter ? (
          <p className="mt-1 text-sm text-red-600">{errors.coverLetter.message}</p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="bidAmount" className="mb-1 block text-sm font-medium">
            Bid amount (USD)
          </label>
          <Controller
            name="bidAmount"
            control={control}
            render={({ field }) => <Input {...field} id="bidAmount" type="number" size="large" />}
          />
          {errors.bidAmount ? (
            <p className="mt-1 text-sm text-red-600">{errors.bidAmount.message}</p>
          ) : null}
        </div>
        <div>
          <label htmlFor="deliveryDays" className="mb-1 block text-sm font-medium">
            Delivery (days)
          </label>
          <Controller
            name="deliveryDays"
            control={control}
            render={({ field }) => (
              <Input {...field} id="deliveryDays" type="number" size="large" />
            )}
          />
          {errors.deliveryDays ? (
            <p className="mt-1 text-sm text-red-600">{errors.deliveryDays.message}</p>
          ) : null}
        </div>
      </div>

      <Button
        type="primary"
        htmlType="submit"
        size="large"
        loading={isSubmitting || mutation.isPending}
        disabled={mutation.isPending}
      >
        Submit proposal
      </Button>
    </form>
  );
}
