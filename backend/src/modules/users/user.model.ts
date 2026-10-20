import mongoose, { Schema, type Document, type Model, type Types } from 'mongoose';
import {
  ACCOUNT_STATUSES,
  AVAILABILITY_STATUSES,
  USER_ROLES,
  type AccountStatus,
  type AvailabilityStatus,
  type UserRole,
} from './user.types';

export type PortfolioItemDocument = {
  _id?: Types.ObjectId;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
};

export interface IUser {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: AccountStatus;
  bio?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  emailVerificationTokenHash?: string | null;
  emailVerificationExpires?: Date | null;
  passwordResetTokenHash?: string | null;
  passwordResetExpires?: Date | null;
  professionalTitle?: string;
  about?: string;
  skills: string[];
  hourlyRate?: number;
  availability?: AvailabilityStatus;
  portfolio: PortfolioItemDocument[];
  averageRating: number;
  completedContracts: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  _id: Types.ObjectId;
}

const portfolioSchema = new Schema<PortfolioItemDocument>(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000 },
    url: { type: String, trim: true, maxlength: 500 },
    imageUrl: { type: String, trim: true, maxlength: 500 },
  },
  { _id: true },
);

const userSchema = new Schema<IUserDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 255,
    },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: USER_ROLES, required: true },
    status: { type: String, enum: ACCOUNT_STATUSES, default: 'active' },
    bio: { type: String, trim: true, maxlength: 500 },
    avatarUrl: { type: String, trim: true, maxlength: 500 },
    emailVerified: { type: Boolean, default: false },
    emailVerificationTokenHash: { type: String, select: false, default: null },
    emailVerificationExpires: { type: Date, select: false, default: null },
    passwordResetTokenHash: { type: String, select: false, default: null },
    passwordResetExpires: { type: Date, select: false, default: null },
    professionalTitle: { type: String, trim: true, maxlength: 120 },
    about: { type: String, trim: true, maxlength: 5000 },
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (skills: string[]) => skills.length <= 30,
        message: 'A maximum of 30 skills is allowed',
      },
    },
    hourlyRate: { type: Number, min: 0, max: 10000 },
    availability: { type: String, enum: AVAILABILITY_STATUSES, default: 'available' },
    portfolio: { type: [portfolioSchema], default: [] },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    completedContracts: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

userSchema.index({ role: 1, status: 1 });
userSchema.index({ skills: 1 });
userSchema.index({ professionalTitle: 'text', about: 'text', name: 'text' });

export const User: Model<IUserDocument> =
  mongoose.models.User ?? mongoose.model<IUserDocument>('User', userSchema);
