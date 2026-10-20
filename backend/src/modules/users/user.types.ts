export const USER_ROLES = ['client', 'freelancer', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const PUBLIC_REGISTER_ROLES = ['client', 'freelancer'] as const;
export type PublicRegisterRole = (typeof PUBLIC_REGISTER_ROLES)[number];

export const ACCOUNT_STATUSES = ['active', 'suspended'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const AVAILABILITY_STATUSES = ['available', 'busy', 'unavailable'] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

export type PortfolioItem = {
  _id?: string;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  bio?: string;
  avatarUrl?: string;
  emailVerified: boolean;
  professionalTitle?: string;
  about?: string;
  skills: string[];
  hourlyRate?: number;
  availability?: AvailabilityStatus;
  portfolio: PortfolioItem[];
  averageRating: number;
  completedContracts: number;
  createdAt: string;
  updatedAt: string;
};

export type PublicFreelancer = Omit<PublicUser, 'email' | 'status'> & {
  email?: never;
};
