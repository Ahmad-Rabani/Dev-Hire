import type { ClientSession, Types } from 'mongoose';
import { AuditLog } from './audit.model';
import type { AuditAction, AuditTargetType, PublicAuditLog } from './audit.types';

type WriteAuditInput = {
  actorId: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string | Types.ObjectId;
  reason?: string;
  summary?: string;
  session?: ClientSession | null;
};

export async function writeAuditLog(input: WriteAuditInput): Promise<void> {
  const payload = {
    actor: input.actorId,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    reason: input.reason,
    summary: input.summary,
  };
  if (input.session) {
    await AuditLog.create([payload], { session: input.session });
  } else {
    await AuditLog.create(payload);
  }
}

type PopulatedActor = {
  _id: Types.ObjectId;
  name: string;
  email?: string;
};

function isPopulatedActor(value: unknown): value is PopulatedActor {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_id' in value &&
    'name' in value &&
    typeof (value as PopulatedActor).name === 'string'
  );
}

export function toPublicAuditLog(doc: {
  _id: Types.ObjectId;
  actor: unknown;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: Types.ObjectId;
  reason?: string;
  summary?: string;
  createdAt: Date;
}): PublicAuditLog {
  const actor = isPopulatedActor(doc.actor)
    ? {
        id: doc.actor._id.toString(),
        name: doc.actor.name,
        email: doc.actor.email,
      }
    : {
        id: String(doc.actor),
        name: 'Admin',
      };

  return {
    id: doc._id.toString(),
    actor,
    action: doc.action,
    targetType: doc.targetType,
    targetId: doc.targetId.toString(),
    reason: doc.reason,
    summary: doc.summary,
    createdAt: doc.createdAt.toISOString(),
  };
}
