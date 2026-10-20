import type { IUserDocument } from '../users/user.model';
import type { IJobDocument } from './job.model';
import type { PublicJob } from './job.types';

type PopulatedClient = Pick<IUserDocument, '_id' | 'name' | 'avatarUrl'>;

function isPopulatedClient(value: unknown): value is PopulatedClient {
  return (
    typeof value === 'object' &&
    value !== null &&
    'name' in value &&
    '_id' in value
  );
}

export function toPublicJob(job: IJobDocument): PublicJob {
  const clientRef = job.client as unknown;
  const client = isPopulatedClient(clientRef)
    ? {
        id: clientRef._id.toString(),
        name: clientRef.name,
        avatarUrl: clientRef.avatarUrl,
      }
    : {
        id: String(job.client),
        name: 'Client',
      };

  return {
    id: job._id.toString(),
    title: job.title,
    description: job.description,
    skills: job.skills ?? [],
    budgetType: job.budgetType,
    budgetMin: job.budgetMin,
    budgetMax: job.budgetMax,
    currency: job.currency,
    deadline: job.deadline.toISOString(),
    status: job.status,
    moderationStatus: job.moderationStatus ?? 'visible',
    client,
    attachmentUploadIds: (job.attachmentUploadIds ?? []).map((id) => id.toString()),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
