import type { IUserDocument } from './user.model';
import type { PublicFreelancer, PublicUser } from './user.types';

export function toPublicUser(user: IUserDocument): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    professionalTitle: user.professionalTitle,
    about: user.about,
    skills: user.skills ?? [],
    hourlyRate: user.hourlyRate,
    availability: user.availability,
    portfolio: (user.portfolio ?? []).map((item) => ({
      _id: item._id?.toString?.() ?? undefined,
      title: item.title,
      description: item.description,
      url: item.url,
      imageUrl: item.imageUrl,
    })),
    averageRating: user.averageRating,
    completedContracts: user.completedContracts,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

/** Public directory/profile — no email or account status. */
export function toPublicFreelancer(user: IUserDocument): PublicFreelancer {
  const full = toPublicUser(user);
  const { email: _email, status: _status, ...rest } = full;
  return rest;
}
