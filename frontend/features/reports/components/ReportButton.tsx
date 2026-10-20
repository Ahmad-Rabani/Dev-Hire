'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { App, Button, Input, Modal, Select } from 'antd';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { getApiErrorMessage } from '@/lib/api-client';
import { createReport } from '@/services/dashboard.service';
import { useAuthStore } from '@/stores/auth-store';

const schema = z.object({
  category: z.enum(['spam', 'harassment', 'inappropriate', 'scam', 'other']),
  explanation: z.string().trim().min(10).max(2000),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  targetType: 'job' | 'user' | 'review';
  targetId: string;
};

export function ReportButton({ targetType, targetId }: Props) {
  const { message } = App.useApp();
  const status = useAuthStore((s) => s.status);
  const [open, setOpen] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'spam', explanation: '' },
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      createReport({
        targetType,
        targetId,
        category: values.category,
        explanation: values.explanation,
      }),
    onSuccess: () => {
      message.success('Report submitted — thank you');
      setOpen(false);
      reset();
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  if (status !== 'authenticated') {
    return null;
  }

  return (
    <>
      <Button size="small" onClick={() => setOpen(true)}>
        Report
      </Button>
      <Modal
        title="Report content"
        open={open}
        onCancel={() => setOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <form
          onSubmit={handleSubmit(async (values) => mutation.mutateAsync(values))}
          className="space-y-3"
          noValidate
        >
          <div>
            <label className="mb-1 block text-sm font-medium">Category</label>
            <Controller
              name="category"
              control={control}
              render={({ field }) => (
                <Select
                  className="w-full"
                  value={field.value}
                  onChange={field.onChange}
                  options={[
                    { value: 'spam', label: 'Spam' },
                    { value: 'harassment', label: 'Harassment' },
                    { value: 'inappropriate', label: 'Inappropriate' },
                    { value: 'scam', label: 'Scam' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              )}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Explanation</label>
            <Controller
              name="explanation"
              control={control}
              render={({ field }) => <Input.TextArea {...field} rows={4} />}
            />
            {errors.explanation ? (
              <p className="mt-1 text-sm text-red-600">{errors.explanation.message}</p>
            ) : null}
          </div>
          <Button type="primary" htmlType="submit" loading={mutation.isPending} block>
            Submit report
          </Button>
        </form>
      </Modal>
    </>
  );
}
