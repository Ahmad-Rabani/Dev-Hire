import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';

export interface IReview {
  contract: Types.ObjectId;
  reviewer: Types.ObjectId;
  reviewee: Types.ObjectId;
  rating: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReviewDocument extends IReview, Document {
  _id: Types.ObjectId;
}

/**
 * One review per reviewer per contract.
 * Client and freelancer may each leave one reciprocal review on the same contract.
 */
const reviewSchema = new Schema<IReviewDocument>(
  {
    contract: { type: Schema.Types.ObjectId, ref: 'Contract', required: true },
    reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reviewee: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, minlength: 10, maxlength: 2000 },
  },
  { timestamps: true },
);

reviewSchema.index({ contract: 1, reviewer: 1 }, { unique: true });
reviewSchema.index({ reviewee: 1, createdAt: -1 });

export const Review: Model<IReviewDocument> =
  mongoose.models.Review ?? mongoose.model<IReviewDocument>('Review', reviewSchema);
