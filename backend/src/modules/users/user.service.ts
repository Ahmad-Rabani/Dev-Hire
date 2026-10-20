import { notFound } from '../../utils/AppError';
import { toPublicFreelancer, toPublicUser } from './user.mapper';
import { User } from './user.model';
import type { PublicFreelancer, PublicUser } from './user.types';
import type { FreelancerListQuery, UpdateMeInput } from './user.validation';

export async function getMe(userId: string): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw notFound('User not found');
  }
  return toPublicUser(user);
}

export async function updateMe(userId: string, input: UpdateMeInput): Promise<PublicUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw notFound('User not found');
  }

  // Explicit allow-list only — never spread raw body into MongoDB.
  if (input.name !== undefined) user.name = input.name;
  if (input.bio !== undefined) user.bio = input.bio;
  if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl || undefined;

  if (user.role === 'freelancer') {
    if (input.professionalTitle !== undefined) {
      user.professionalTitle = input.professionalTitle;
    }
    if (input.about !== undefined) user.about = input.about;
    if (input.skills !== undefined) user.skills = input.skills;
    if (input.hourlyRate !== undefined) {
      user.hourlyRate = input.hourlyRate ?? undefined;
    }
    if (input.availability !== undefined) user.availability = input.availability;
    if (input.portfolio !== undefined) {
      user.portfolio = input.portfolio.map((item) => ({
        title: item.title,
        description: item.description,
        url: item.url || undefined,
        imageUrl: item.imageUrl || undefined,
      }));
    }
  }

  await user.save();
  return toPublicUser(user);
}

export async function listFreelancers(query: FreelancerListQuery): Promise<{
  items: PublicFreelancer[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}> {
  const filter: Record<string, unknown> = {
    role: 'freelancer',
    status: 'active',
  };

  if (query.skill) {
    filter.skills = { $in: [query.skill] };
  }

  if (query.q) {
    filter.$text = { $search: query.q };
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    User.find(filter).sort({ averageRating: -1, createdAt: -1 }).skip(skip).limit(query.limit),
    User.countDocuments(filter),
  ]);

  return {
    items: items.map(toPublicFreelancer),
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.limit)),
  };
}

export async function getFreelancerById(id: string): Promise<PublicFreelancer> {
  const user = await User.findOne({ _id: id, role: 'freelancer', status: 'active' });
  if (!user) {
    throw notFound('Freelancer not found');
  }
  return toPublicFreelancer(user);
}

/** Rough profile completion for freelancers (UI hint only). */
export function getProfileCompletion(user: PublicUser): number {
  if (user.role !== 'freelancer') {
    const checks = [Boolean(user.name), Boolean(user.bio), Boolean(user.avatarUrl)];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }

  const checks = [
    Boolean(user.name),
    Boolean(user.professionalTitle),
    Boolean(user.about || user.bio),
    (user.skills?.length ?? 0) > 0,
    user.hourlyRate != null,
    Boolean(user.availability),
    (user.portfolio?.length ?? 0) > 0,
    Boolean(user.avatarUrl),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
