import type { Types } from 'mongoose';
import type { IReviewDocument } from './review.model';
import type { PublicReview } from './review.types';

type PopulatedReviewer = {
  _id: Types.ObjectId;
  name: string;
  avatarUrl?: string;
};

function isPopulatedReviewer(value: unknown): value is PopulatedReviewer {
  return (
    typeof value === 'object' &&
    value !== null &&
    '_id' in value &&
    'name' in value &&
    typeof (value as PopulatedReviewer).name === 'string'
  );
}

export function toPublicReview(doc: IReviewDocument): PublicReview {
  const reviewer = isPopulatedReviewer(doc.reviewer)
    ? {
        id: doc.reviewer._id.toString(),
        name: doc.reviewer.name,
        avatarUrl: doc.reviewer.avatarUrl,
      }
    : {
        id: String(doc.reviewer),
        name: 'User',
      };

  return {
    id: doc._id.toString(),
    contractId: doc.contract.toString(),
    reviewer,
    revieweeId: doc.reviewee.toString(),
    rating: doc.rating,
    comment: doc.comment,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}
