import { badRequest, forbidden, notFound } from '../../utils/AppError';
import { env } from '../../config/env';
import { Contract } from '../contracts/contract.model';
import { Job } from '../jobs/job.model';
import { User } from '../users/user.model';
import {
  allowedForPurpose,
  detectImageOrPdf,
  maxBytesForPurpose,
  visibilityForPurpose,
} from './file-signatures';
import { localStorage } from './storage/local.storage';
import { Upload, type IUploadDocument } from './upload.model';
import type { PublicUpload, UploadPurpose } from './upload.types';

function publicUrl(uploadId: string): string {
  // Absolute API URL so browsers (and avatarUrl validators) can load the file.
  // Access control still runs on GET /uploads/:id/content.
  const base = env.PUBLIC_API_URL.replace(/\/$/, '');
  return `${base}/api/v1/uploads/${uploadId}/content`;
}

export function toPublicUpload(doc: IUploadDocument): PublicUpload {
  return {
    id: doc._id.toString(),
    purpose: doc.purpose,
    visibility: doc.visibility,
    originalName: doc.originalName,
    mimeType: doc.mimeType,
    size: doc.size,
    url: publicUrl(doc._id.toString()),
    createdAt: doc.createdAt.toISOString(),
  };
}

export async function createUpload(input: {
  ownerId: string;
  purpose: UploadPurpose;
  originalName: string;
  buffer: Buffer;
  resourceType?: string;
  resourceId?: string;
}): Promise<PublicUpload> {
  const detected = detectImageOrPdf(input.buffer);
  if (!detected) {
    throw badRequest('Unsupported or unrecognized file content');
  }
  if (!allowedForPurpose(input.purpose, detected.mimeType)) {
    throw badRequest(`File type ${detected.mimeType} is not allowed for ${input.purpose}`);
  }

  const maxBytes = maxBytesForPurpose(input.purpose, env.MAX_FILE_SIZE_MB);
  if (input.buffer.length > maxBytes) {
    throw badRequest(`File exceeds the ${Math.round(maxBytes / (1024 * 1024))}MB limit for ${input.purpose}`);
  }
  if (input.buffer.length < 1) {
    throw badRequest('Empty files are not allowed');
  }

  if (input.resourceType && input.resourceId) {
    await assertCanAttach(input.ownerId, input.purpose, input.resourceType, input.resourceId);
  }

  const stored = await localStorage.save({
    buffer: input.buffer,
    purpose: input.purpose,
    extension: detected.extension,
  });

  try {
    const doc = await Upload.create({
      owner: input.ownerId,
      purpose: input.purpose,
      visibility: visibilityForPurpose(input.purpose),
      storageKey: stored.storageKey,
      originalName: input.originalName.slice(0, 255),
      mimeType: detected.mimeType,
      size: input.buffer.length,
      resourceType: input.resourceType,
      resourceId: input.resourceId ?? null,
    });

    // Side-effects for known purposes
    if (input.purpose === 'avatar') {
      await User.updateOne(
        { _id: input.ownerId },
        { $set: { avatarUrl: publicUrl(doc._id.toString()) } },
      );
    }

    return toPublicUpload(doc);
  } catch (error) {
    await localStorage.delete(stored.storageKey);
    throw error;
  }
}

async function assertCanAttach(
  userId: string,
  purpose: UploadPurpose,
  resourceType: string,
  resourceId: string,
): Promise<void> {
  if (purpose === 'job_attachment' && resourceType === 'job') {
    const job = await Job.findById(resourceId);
    if (!job) throw notFound('Job not found');
    if (job.client.toString() !== userId) {
      throw forbidden('You can only attach files to your own jobs');
    }
    return;
  }

  if (purpose === 'milestone_deliverable' && resourceType === 'contract') {
    const contract = await Contract.findById(resourceId);
    if (!contract) throw notFound('Contract not found');
    if (contract.freelancer.toString() !== userId) {
      throw forbidden('Only the assigned freelancer can upload milestone deliverables');
    }
    if (contract.status !== 'active') {
      throw badRequest('Deliverables can only be uploaded on active contracts');
    }
    return;
  }

  if (purpose === 'portfolio') {
    return;
  }

  throw badRequest('Invalid resource association for this upload purpose');
}

export async function getUploadMeta(uploadId: string): Promise<PublicUpload> {
  const doc = await Upload.findById(uploadId);
  if (!doc) throw notFound('Upload not found');
  return toPublicUpload(doc);
}

export async function authorizeAndReadUpload(
  uploadId: string,
  viewer?: { id: string; role: string },
): Promise<{ buffer: Buffer; mimeType: string; originalName: string; visibility: string }> {
  const doc = await Upload.findById(uploadId);
  if (!doc) throw notFound('Upload not found');

  if (doc.visibility === 'public') {
    const buffer = await localStorage.read(doc.storageKey);
    return {
      buffer,
      mimeType: doc.mimeType,
      originalName: doc.originalName,
      visibility: doc.visibility,
    };
  }

  if (!viewer) {
    throw forbidden('Authentication required to access this file');
  }

  if (viewer.role === 'admin' || viewer.id === doc.owner.toString()) {
    const buffer = await localStorage.read(doc.storageKey);
    return {
      buffer,
      mimeType: doc.mimeType,
      originalName: doc.originalName,
      visibility: doc.visibility,
    };
  }

  // Contract participants may access milestone deliverables on their contract.
  if (doc.purpose === 'milestone_deliverable' && doc.resourceId) {
    const contract = await Contract.findById(doc.resourceId);
    if (
      contract &&
      (contract.client.toString() === viewer.id || contract.freelancer.toString() === viewer.id)
    ) {
      const buffer = await localStorage.read(doc.storageKey);
      return {
        buffer,
        mimeType: doc.mimeType,
        originalName: doc.originalName,
        visibility: doc.visibility,
      };
    }
  }

  // Job attachments: owner, or freelancer on a contract for that job.
  if (doc.purpose === 'job_attachment' && doc.resourceId) {
    const job = await Job.findById(doc.resourceId);
    if (job && job.client.toString() === viewer.id) {
      const buffer = await localStorage.read(doc.storageKey);
      return {
        buffer,
        mimeType: doc.mimeType,
        originalName: doc.originalName,
        visibility: doc.visibility,
      };
    }
    const contract = await Contract.findOne({
      job: doc.resourceId,
      freelancer: viewer.id,
      status: { $in: ['active', 'completed'] },
    }).select('_id');
    if (contract) {
      const buffer = await localStorage.read(doc.storageKey);
      return {
        buffer,
        mimeType: doc.mimeType,
        originalName: doc.originalName,
        visibility: doc.visibility,
      };
    }
  }

  throw forbidden('You do not have access to this file');
}
