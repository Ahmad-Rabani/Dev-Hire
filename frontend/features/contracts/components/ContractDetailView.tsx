'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  App,
  Button,
  Input,
  InputNumber,
  Modal,
  Progress,
  Rate,
  Spin,
  Tag,
} from 'antd';
import Link from 'next/link';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { FileUploadField } from '@/components/uploads/FileUploadField';
import { getApiErrorMessage } from '@/lib/api-client';
import {
  addMilestone,
  approveMilestone,
  cancelContract,
  completeContract,
  createReview,
  deleteMilestone,
  getContract,
  listContractReviews,
  requestMilestoneRevision,
  submitMilestone,
} from '@/services/contracts.service';
import { downloadUpload } from '@/services/upload.service';
import { useAuthStore } from '@/stores/auth-store';
import type { ContractDetail, Milestone } from '@/types/contract';
import {
  cancelSchema,
  milestoneFormSchema,
  reviewFormSchema,
  revisionSchema,
  submitMilestoneSchema,
  type CancelValues,
  type MilestoneFormValues,
  type ReviewFormValues,
  type RevisionValues,
  type SubmitMilestoneValues,
} from '../schemas';
import {
  CONTRACT_STATUS_COLORS,
  formatDate,
  formatMoney,
  MILESTONE_STATUS_COLORS,
  toIsoDueDate,
} from '../lib/format';

type Props = {
  contractId: string;
};

function invalidateContractQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  contractId: string,
  freelancerId?: string,
) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['contracts'] }),
    queryClient.invalidateQueries({ queryKey: ['contracts', contractId] }),
    queryClient.invalidateQueries({ queryKey: ['contracts', contractId, 'reviews'] }),
    freelancerId
      ? queryClient.invalidateQueries({ queryKey: ['freelancers', freelancerId] })
      : Promise.resolve(),
    freelancerId
      ? queryClient.invalidateQueries({ queryKey: ['freelancers', freelancerId, 'reviews'] })
      : Promise.resolve(),
  ]);
}

export function ContractDetailView({ contractId }: Props) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const contractQuery = useQuery({
    queryKey: ['contracts', contractId],
    queryFn: () => getContract(contractId),
  });

  const reviewsQuery = useQuery({
    queryKey: ['contracts', contractId, 'reviews'],
    queryFn: () => listContractReviews(contractId),
    enabled: !!contractQuery.data,
  });

  if (contractQuery.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (contractQuery.isError || !contractQuery.data) {
    return (
      <Alert
        type="error"
        showIcon
        message={getApiErrorMessage(contractQuery.error, 'Contract not found')}
      />
    );
  }

  const contract = contractQuery.data;
  const isClient = user?.id === contract.client.id;
  const isFreelancer = user?.id === contract.freelancer.id;
  const myReview = reviewsQuery.data?.find((r) => r.reviewer.id === user?.id);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold text-slate-900">{contract.job.title}</h1>
          <Tag color={CONTRACT_STATUS_COLORS[contract.status]}>{contract.status}</Tag>
        </div>
        <p className="text-slate-600">
          {formatMoney(contract.amount)} · {contract.pricingType} · started{' '}
          {formatDate(contract.startDate)}
          {contract.completedAt ? ` · completed ${formatDate(contract.completedAt)}` : ''}
        </p>
        <p className="text-sm text-slate-500">
          Client:{' '}
          <span className="font-medium text-slate-700">{contract.client.name}</span>
          {' · '}
          Freelancer:{' '}
          <Link
            href={`/freelancers/${contract.freelancer.id}`}
            className="font-medium text-teal-800 hover:underline"
          >
            {contract.freelancer.name}
          </Link>
        </p>
      </header>

      <section className="space-y-2">
        <h2 className="text-lg font-medium text-slate-900">Progress</h2>
        <Progress
          percent={contract.progress.percentComplete}
          format={() =>
            `${contract.progress.approvedMilestones} of ${contract.progress.totalMilestones} milestones approved`
          }
        />
        <p className="text-sm text-slate-500">
          Approved work value (not a payment): {formatMoney(contract.progress.approvedAmount)} /{' '}
          {formatMoney(contract.progress.plannedAmount)} planned
        </p>
      </section>

      <MilestoneSection
        contract={contract}
        isClient={!!isClient}
        isFreelancer={!!isFreelancer}
        onChanged={async () => {
          await invalidateContractQueries(queryClient, contractId, contract.freelancer.id);
        }}
      />

      {contract.status === 'active' && isClient ? (
        <ContractActions
          contract={contract}
          onChanged={async () => {
            await invalidateContractQueries(queryClient, contractId, contract.freelancer.id);
            message.success('Contract updated');
          }}
        />
      ) : null}

      {contract.status === 'active' && (isClient || isFreelancer) ? (
        <CancelPanel
          contractId={contractId}
          disabled={contract.milestones.some(
            (m) =>
              m.status === 'submitted' ||
              m.status === 'revision_requested' ||
              m.status === 'approved',
          )}
          onCancelled={async () => {
            await invalidateContractQueries(queryClient, contractId);
            message.success('Contract cancelled');
          }}
        />
      ) : null}

      {contract.status === 'completed' ? (
        <ReviewsSection
          contract={contract}
          reviews={reviewsQuery.data ?? []}
          reviewsLoading={reviewsQuery.isLoading}
          myReviewExists={!!myReview}
          canReview={!!(isClient || isFreelancer) && !myReview}
          onSubmitted={async () => {
            await invalidateContractQueries(queryClient, contractId, contract.freelancer.id);
            message.success('Review submitted');
          }}
        />
      ) : null}
    </div>
  );
}

function MilestoneSection({
  contract,
  isClient,
  isFreelancer,
  onChanged,
}: {
  contract: ContractDetail;
  isClient: boolean;
  isFreelancer: boolean;
  onChanged: () => Promise<void>;
}) {
  const { message } = App.useApp();
  const [showAdd, setShowAdd] = useState(false);

  const addMutation = useMutation({
    mutationFn: (values: MilestoneFormValues) =>
      addMilestone(contract.id, {
        ...values,
        dueDate: toIsoDueDate(values.dueDate),
      }),
    onSuccess: async () => {
      setShowAdd(false);
      message.success('Milestone added');
      await onChanged();
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium text-slate-900">Milestones</h2>
        {isClient && contract.status === 'active' ? (
          <Button type="primary" onClick={() => setShowAdd(true)}>
            Add milestone
          </Button>
        ) : null}
      </div>

      {contract.milestones.length === 0 ? (
        <p className="text-sm text-slate-500">
          No milestones yet.
          {isClient ? ' Add at least one before you can complete the contract.' : ''}
        </p>
      ) : (
        <ul className="space-y-4">
          {contract.milestones.map((m) => (
            <MilestoneCard
              key={m.id}
              contract={contract}
              milestone={m}
              isClient={isClient}
              isFreelancer={isFreelancer}
              onChanged={onChanged}
            />
          ))}
        </ul>
      )}

      <Modal
        title="Add milestone"
        open={showAdd}
        onCancel={() => setShowAdd(false)}
        footer={null}
        destroyOnHidden
      >
        <MilestoneForm
          remainingHint={
            contract.pricingType === 'fixed'
              ? `Remaining budget: ${formatMoney(
                  Math.max(0, contract.amount - contract.progress.plannedAmount),
                )}`
              : 'Hourly contract — amounts are planning only.'
          }
          submitting={addMutation.isPending}
          onSubmit={async (values) => {
            await addMutation.mutateAsync(values);
          }}
        />
      </Modal>
    </section>
  );
}

function MilestoneForm({
  remainingHint,
  submitting,
  onSubmit,
  defaultValues,
}: {
  remainingHint?: string;
  submitting: boolean;
  onSubmit: (values: MilestoneFormValues) => Promise<void>;
  defaultValues?: Partial<MilestoneFormValues>;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<MilestoneFormValues>({
    resolver: zodResolver(milestoneFormSchema),
    defaultValues: {
      title: '',
      description: '',
      amount: 100,
      dueDate: '',
      ...defaultValues,
    },
  });

  return (
    <form
      onSubmit={handleSubmit(async (values) => onSubmit(values))}
      className="space-y-3"
      noValidate
    >
      {remainingHint ? <p className="text-sm text-slate-500">{remainingHint}</p> : null}
      <div>
        <label className="mb-1 block text-sm font-medium">Title</label>
        <Controller
          name="title"
          control={control}
          render={({ field }) => <Input {...field} />}
        />
        {errors.title ? <p className="mt-1 text-sm text-red-600">{errors.title.message}</p> : null}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Description</label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => <Input.TextArea {...field} rows={3} />}
        />
        {errors.description ? (
          <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium">Amount</label>
          <Controller
            name="amount"
            control={control}
            render={({ field }) => (
              <InputNumber {...field} className="w-full" min={0} max={1_000_000} />
            )}
          />
          {errors.amount ? (
            <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">Due date</label>
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => <Input {...field} type="date" />}
          />
          {errors.dueDate ? (
            <p className="mt-1 text-sm text-red-600">{errors.dueDate.message}</p>
          ) : null}
        </div>
      </div>
      <Button type="primary" htmlType="submit" loading={submitting} block>
        Save milestone
      </Button>
    </form>
  );
}

function MilestoneCard({
  contract,
  milestone,
  isClient,
  isFreelancer,
  onChanged,
}: {
  contract: ContractDetail;
  milestone: Milestone;
  isClient: boolean;
  isFreelancer: boolean;
  onChanged: () => Promise<void>;
}) {
  const { message, modal } = App.useApp();
  const [submitOpen, setSubmitOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);

  const submitMutation = useMutation({
    mutationFn: (values: SubmitMilestoneValues) =>
      submitMilestone(contract.id, milestone.id, {
        submissionNotes: values.submissionNotes,
        deliverableUrl: values.deliverableUrl || undefined,
        deliverableUploadIds: values.deliverableUploadIds?.length
          ? values.deliverableUploadIds
          : undefined,
      }),
    onSuccess: async () => {
      setSubmitOpen(false);
      message.success('Work submitted');
      await onChanged();
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const approveMutation = useMutation({
    mutationFn: () => approveMilestone(contract.id, milestone.id),
    onSuccess: async () => {
      message.success('Milestone approved (work accepted — not a payment)');
      await onChanged();
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const revisionMutation = useMutation({
    mutationFn: (values: RevisionValues) =>
      requestMilestoneRevision(contract.id, milestone.id, values),
    onSuccess: async () => {
      setRevisionOpen(false);
      message.success('Revision requested');
      await onChanged();
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteMilestone(contract.id, milestone.id),
    onSuccess: async () => {
      message.success('Milestone removed');
      await onChanged();
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const canSubmit =
    isFreelancer &&
    contract.status === 'active' &&
    (milestone.status === 'pending' || milestone.status === 'revision_requested');
  const canReview =
    isClient && contract.status === 'active' && milestone.status === 'submitted';
  const canDelete = isClient && contract.status === 'active' && milestone.status === 'pending';

  return (
    <li className="rounded-lg border border-slate-200 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-slate-900">{milestone.title}</p>
          <p className="mt-1 text-sm text-slate-600">{milestone.description}</p>
          <p className="mt-2 text-sm text-slate-500">
            {formatMoney(milestone.amount)} · due {formatDate(milestone.dueDate)}
          </p>
        </div>
        <Tag color={MILESTONE_STATUS_COLORS[milestone.status]}>
          {milestone.status.replace('_', ' ')}
        </Tag>
      </div>

      {milestone.submissionNotes ? (
        <div className="mt-3 rounded bg-slate-50 p-3 text-sm">
          <p className="font-medium text-slate-800">Submission</p>
          <p className="mt-1 whitespace-pre-wrap text-slate-600">{milestone.submissionNotes}</p>
          {milestone.deliverableUrl ? (
            <a
              href={milestone.deliverableUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-block text-teal-700 hover:underline"
            >
              Deliverable link
            </a>
          ) : null}
          {(milestone.deliverableUploadIds ?? []).length > 0 ? (
            <ul className="mt-2 space-y-1">
              {milestone.deliverableUploadIds!.map((uploadId, index) => (
                <li key={uploadId}>
                  <DeliverableDownloadButton uploadId={uploadId} label={`File ${index + 1}`} />
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {milestone.revisionFeedback ? (
        <div className="mt-3 rounded border border-orange-200 bg-orange-50 p-3 text-sm">
          <p className="font-medium text-orange-900">Revision feedback</p>
          <p className="mt-1 whitespace-pre-wrap text-orange-800">{milestone.revisionFeedback}</p>
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {canSubmit ? (
          <Button type="primary" onClick={() => setSubmitOpen(true)}>
            {milestone.status === 'revision_requested' ? 'Resubmit work' : 'Submit work'}
          </Button>
        ) : null}
        {canReview ? (
          <>
            <Button
              type="primary"
              loading={approveMutation.isPending}
              onClick={() =>
                modal.confirm({
                  title: 'Approve this milestone?',
                  content:
                    'This marks the work as accepted in DevHire. It does not transfer money.',
                  onOk: () => approveMutation.mutateAsync(),
                })
              }
            >
              Approve
            </Button>
            <Button onClick={() => setRevisionOpen(true)}>Request revision</Button>
          </>
        ) : null}
        {canDelete ? (
          <Button
            danger
            loading={deleteMutation.isPending}
            onClick={() =>
              modal.confirm({
                title: 'Delete this milestone?',
                okButtonProps: { danger: true },
                onOk: () => deleteMutation.mutateAsync(),
              })
            }
          >
            Delete
          </Button>
        ) : null}
      </div>

      <Modal
        title="Submit milestone work"
        open={submitOpen}
        onCancel={() => setSubmitOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <SubmitForm
          contractId={contract.id}
          submitting={submitMutation.isPending}
          onSubmit={async (values) => {
            await submitMutation.mutateAsync(values);
          }}
        />
      </Modal>

      <Modal
        title="Request revision"
        open={revisionOpen}
        onCancel={() => setRevisionOpen(false)}
        footer={null}
        destroyOnHidden
      >
        <RevisionForm
          submitting={revisionMutation.isPending}
          onSubmit={async (values) => {
            await revisionMutation.mutateAsync(values);
          }}
        />
      </Modal>
    </li>
  );
}

function DeliverableDownloadButton({ uploadId, label }: { uploadId: string; label: string }) {
  const { message } = App.useApp();
  const [loading, setLoading] = useState(false);
  return (
    <Button
      type="link"
      className="!px-0"
      loading={loading}
      onClick={() => {
        setLoading(true);
        void downloadUpload(uploadId, label)
          .catch((error) => message.error(getApiErrorMessage(error)))
          .finally(() => setLoading(false));
      }}
    >
      {label}
    </Button>
  );
}

function SubmitForm({
  contractId,
  submitting,
  onSubmit,
}: {
  contractId: string;
  submitting: boolean;
  onSubmit: (values: SubmitMilestoneValues) => Promise<void>;
}) {
  const [files, setFiles] = useState<
    import('@/services/upload.service').PublicUpload[]
  >([]);
  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SubmitMilestoneValues>({
    resolver: zodResolver(submitMilestoneSchema),
    defaultValues: { submissionNotes: '', deliverableUrl: '', deliverableUploadIds: [] },
  });

  return (
    <form
      onSubmit={handleSubmit(async (values) => onSubmit(values))}
      className="space-y-3"
      noValidate
    >
      <div>
        <label className="mb-1 block text-sm font-medium">What did you deliver?</label>
        <Controller
          name="submissionNotes"
          control={control}
          render={({ field }) => <Input.TextArea {...field} rows={4} />}
        />
        {errors.submissionNotes ? (
          <p className="mt-1 text-sm text-red-600">{errors.submissionNotes.message}</p>
        ) : null}
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Deliverable URL (optional)</label>
        <Controller
          name="deliverableUrl"
          control={control}
          render={({ field }) => <Input {...field} placeholder="https://" />}
        />
        {errors.deliverableUrl ? (
          <p className="mt-1 text-sm text-red-600">{errors.deliverableUrl.message}</p>
        ) : null}
      </div>
      <FileUploadField
        purpose="milestone_deliverable"
        resourceType="contract"
        resourceId={contractId}
        label="Deliverable files (optional)"
        multiple
        maxFiles={5}
        value={files}
        onChange={(next) => {
          setFiles(next);
          setValue(
            'deliverableUploadIds',
            next.map((f) => f.id),
            { shouldDirty: true },
          );
        }}
      />
      <Button type="primary" htmlType="submit" loading={submitting} block>
        Submit for review
      </Button>
    </form>
  );
}

function RevisionForm({
  submitting,
  onSubmit,
}: {
  submitting: boolean;
  onSubmit: (values: RevisionValues) => Promise<void>;
}) {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RevisionValues>({
    resolver: zodResolver(revisionSchema),
    defaultValues: { feedback: '' },
  });

  return (
    <form
      onSubmit={handleSubmit(async (values) => onSubmit(values))}
      className="space-y-3"
      noValidate
    >
      <div>
        <label className="mb-1 block text-sm font-medium">Feedback for the freelancer</label>
        <Controller
          name="feedback"
          control={control}
          render={({ field }) => <Input.TextArea {...field} rows={4} />}
        />
        {errors.feedback ? (
          <p className="mt-1 text-sm text-red-600">{errors.feedback.message}</p>
        ) : null}
      </div>
      <Button type="primary" htmlType="submit" loading={submitting} block>
        Send revision request
      </Button>
    </form>
  );
}

function ContractActions({
  contract,
  onChanged,
}: {
  contract: ContractDetail;
  onChanged: () => Promise<void>;
}) {
  const { message, modal } = App.useApp();
  const completeMutation = useMutation({
    mutationFn: () => completeContract(contract.id),
    onSuccess: async () => {
      await onChanged();
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const allApproved =
    contract.milestones.length > 0 &&
    contract.milestones.every((m) => m.status === 'approved');

  return (
    <section className="rounded-lg border border-slate-200 p-4">
      <h2 className="text-lg font-medium text-slate-900">Complete contract</h2>
      <p className="mt-1 text-sm text-slate-600">
        Only available when every milestone is approved
        {contract.pricingType === 'fixed'
          ? ' and planned amounts equal the contract total'
          : ''}
        . Approval means work accepted — not money transferred.
      </p>
      <Button
        className="mt-3"
        type="primary"
        disabled={!allApproved}
        loading={completeMutation.isPending}
        onClick={() =>
          modal.confirm({
            title: 'Mark this contract completed?',
            content: 'Both parties will then be able to leave reviews.',
            onOk: () => completeMutation.mutateAsync(),
          })
        }
      >
        Complete contract
      </Button>
    </section>
  );
}

function CancelPanel({
  contractId,
  disabled,
  onCancelled,
}: {
  contractId: string;
  disabled: boolean;
  onCancelled: () => Promise<void>;
}) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: (values: CancelValues) => cancelContract(contractId, values),
    onSuccess: async () => {
      setOpen(false);
      await onCancelled();
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CancelValues>({
    resolver: zodResolver(cancelSchema),
    defaultValues: { reason: '' },
  });

  return (
    <section className="rounded-lg border border-dashed border-slate-300 p-4">
      <h2 className="text-lg font-medium text-slate-900">Cancel contract</h2>
      <p className="mt-1 text-sm text-slate-600">
        Allowed only while all milestones are still pending (or none exist).
      </p>
      <Button className="mt-3" danger disabled={disabled} onClick={() => setOpen(true)}>
        Cancel contract
      </Button>
      <Modal title="Cancel contract" open={open} onCancel={() => setOpen(false)} footer={null}>
        <form
          onSubmit={handleSubmit(async (values) => mutation.mutateAsync(values))}
          className="space-y-3"
          noValidate
        >
          <Controller
            name="reason"
            control={control}
            render={({ field }) => (
              <Input.TextArea {...field} rows={3} placeholder="Why are you cancelling?" />
            )}
          />
          {errors.reason ? (
            <p className="text-sm text-red-600">{errors.reason.message}</p>
          ) : null}
          <Button type="primary" danger htmlType="submit" loading={mutation.isPending} block>
            Confirm cancellation
          </Button>
        </form>
      </Modal>
    </section>
  );
}

function ReviewsSection({
  contract,
  reviews,
  reviewsLoading,
  myReviewExists,
  canReview,
  onSubmitted,
}: {
  contract: ContractDetail;
  reviews: Awaited<ReturnType<typeof listContractReviews>>;
  reviewsLoading: boolean;
  myReviewExists: boolean;
  canReview: boolean;
  onSubmitted: () => Promise<void>;
}) {
  const { message } = App.useApp();
  const mutation = useMutation({
    mutationFn: (values: ReviewFormValues) => createReview(contract.id, values),
    onSuccess: async () => {
      await onSubmitted();
    },
    onError: (error) => message.error(getApiErrorMessage(error)),
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { rating: 5, comment: '' },
  });

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-medium text-slate-900">Reviews</h2>
      {reviewsLoading ? <Spin /> : null}
      {reviews.length === 0 && !canReview ? (
        <p className="text-sm text-slate-500">No reviews yet.</p>
      ) : null}
      <ul className="space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-slate-900">{r.reviewer.name}</span>
              <Rate disabled value={r.rating} />
            </div>
            <p className="mt-2 whitespace-pre-wrap text-slate-600">{r.comment}</p>
            <p className="mt-1 text-xs text-slate-400">{formatDate(r.createdAt)}</p>
          </li>
        ))}
      </ul>

      {canReview ? (
        <form
          onSubmit={handleSubmit(async (values) => mutation.mutateAsync(values))}
          className="space-y-3 rounded-lg border border-teal-100 bg-teal-50/40 p-4"
          noValidate
        >
          <h3 className="font-medium text-slate-900">Leave a review</h3>
          <div>
            <label className="mb-1 block text-sm font-medium">Rating</label>
            <Controller
              name="rating"
              control={control}
              render={({ field }) => (
                <Rate value={field.value} onChange={field.onChange} />
              )}
            />
            {errors.rating ? (
              <p className="mt-1 text-sm text-red-600">{errors.rating.message}</p>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Comment</label>
            <Controller
              name="comment"
              control={control}
              render={({ field }) => <Input.TextArea {...field} rows={3} />}
            />
            {errors.comment ? (
              <p className="mt-1 text-sm text-red-600">{errors.comment.message}</p>
            ) : null}
          </div>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Submit review
          </Button>
        </form>
      ) : null}

      {myReviewExists ? (
        <p className="text-sm text-slate-500">You have already reviewed this contract.</p>
      ) : null}
    </section>
  );
}
