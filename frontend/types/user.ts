export type UserRole = 'client' | 'freelancer' | 'admin';
export type AccountStatus = 'active' | 'suspended';
export type AvailabilityStatus = 'available' | 'busy' | 'unavailable';

export type PortfolioItem = {
  _id?: string;
  title: string;
  description?: string;
  url?: string;
  imageUrl?: string;
};

export type User = {
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

export type PublicFreelancer = Omit<User, 'email' | 'status'>;
