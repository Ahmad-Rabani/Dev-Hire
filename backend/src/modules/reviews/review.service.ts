import mongoose from 'mongoose';
import { badRequest, conflict, forbidden, notFound } from '../../utils/AppError';
import type { AuthUser } from '../../types/express';
import { Contract } from '../contracts/contract.model';
import { notifyReviewReceived } from '../notifications/notification.events';
import { User } from '../users/user.model';
import { toPublicReview } from './review.mapper';
import { Review } from './review.model';
import type { FreelancerReviewSummary, PublicReview } from './review.types';
import type { CreateReviewInput, FreelancerReviewsQuery } from './review.validation';

const REVIEWER_POPULATE = { path: 'reviewer', select: 'name avatarUrl' };

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: number }).code === 11000
  );
}

/**
 * Recalculate averageRating for a user from all Review documents.
 * Prefer query over trusting client-supplied aggregates.
 */
async function refreshAverageRating(userId: string): Promise<void> {
  const [stats] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { reviewee: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        avg: { $avg: '$rating' },
        count: { $sum: 1 },
      },
    },
  ]);

  const averageRating = stats ? Math.round(stats.avg * 10) / 10 : 0;
  await User.updateOne({ _id: userId }, { $set: { averageRating } });
}

export async function createReview(
  contractId: string,
  user: AuthUser,
  input: CreateReviewInput,
): Promise<PublicReview> {
  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw notFound('Contract not found');
  }

  if (contract.status !== 'completed') {
    throw badRequest('Reviews are only allowed on completed contracts');
  }

  const isClient = contract.client.toString() === user.id;
  const isFreelancer = contract.freelancer.toString() === user.id;
  if (!isClient && !isFreelancer) {
    throw forbidden('Only contract participants can leave a review');
  }

  const revieweeId = isClient ? contract.freelancer.toString() : contract.client.toString();
  if (revieweeId === user.id) {
    throw badRequest('You cannot review yourself');
  }

  try {
    const review = await Review.create({
      contract: contract._id,
      reviewer: user.id,
      reviewee: revieweeId,
      rating: input.rating,
      comment: input.comment,
    });

    await refreshAverageRating(revieweeId);
    await review.populate(REVIEWER_POPULATE);
    await notifyReviewReceived({
      revieweeId,
      reviewerId: user.id,
      contractId: contract._id.toString(),
      rating: input.rating,
      reviewId: review._id.toString(),
    });
    return toPublicReview(review);
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw conflict('You have already reviewed this contract');
    }
    throw error;
  }
}

export async function listContractReviews(
  contractId: string,
  user: AuthUser,
): Promise<PublicReview[]> {
  const contract = await Contract.findById(contractId);
  if (!contract) {
    throw notFound('Contract not found');
  }

  const isClient = contract.client.toString() === user.id;
  const isFreelancer = contract.freelancer.toString() === user.id;
  if (!isClient && !isFreelancer) {
    throw forbidden('You do not have access to this contract');
  }

  const reviews = await Review.find({ contract: contractId })
    .sort({ createdAt: -1 })
    .populate(REVIEWER_POPULATE);
  return reviews.map(toPublicReview);
}

export async function listFreelancerReviews(
  freelancerId: string,
  query: FreelancerReviewsQuery,
): Promise<FreelancerReviewSummary> {
  const freelancer = await User.findById(freelancerId).select('role averageRating');
  if (!freelancer || freelancer.role !== 'freelancer') {
    throw notFound('Freelancer not found');
  }

  const filter = { reviewee: freelancerId };
  const skip = (query.page - 1) * query.limit;
  const [reviews, reviewCount] = await Promise.all([
    Review.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate(REVIEWER_POPULATE),
    Review.countDocuments(filter),
  ]);

  return {
    averageRating: freelancer.averageRating,
    reviewCount,
    reviews: reviews.map(toPublicReview),
  };
}
