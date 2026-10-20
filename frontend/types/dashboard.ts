export type ClientDashboard = {
  stats: {
    jobsTotal: number;
    jobsOpen: number;
    jobsInProgress: number;
    jobsClosed: number;
    jobsCancelled: number;
    proposalsTotal: number;
    proposalsPending: number;
    contractsActive: number;
    contractsCompleted: number;
  };
  recentJobs: Array<{
    id: string;
    title: string;
    status: string;
    createdAt: string;
  }>;
  recentProposals: Array<{
    id: string;
    jobId: string;
    jobTitle: string;
    freelancerName: string;
    bidAmount: number;
    status: string;
    createdAt: string;
  }>;
  recentContracts: Array<{
    id: string;
    jobTitle: string;
    freelancerName: string;
    status: string;
    amount: number;
    updatedAt: string;
  }>;
};

export type FreelancerDashboard = {
  stats: {
    proposalsTotal: number;
    proposalsPending: number;
    proposalsAccepted: number;
    proposalsRejected: number;
    proposalsWithdrawn: number;
    contractsActive: number;
    contractsCompleted: number;
    averageRating: number;
    reviewCount: number;
    profileCompletion: number;
  };
  recentProposals: Array<{
    id: string;
    jobId: string;
    jobTitle: string;
    bidAmount: number;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  recentContracts: Array<{
    id: string;
    jobTitle: string;
    clientName: string;
    status: string;
    amount: number;
    updatedAt: string;
  }>;
  recentReviews: Array<{
    id: string;
    rating: number;
    comment: string;
    reviewerName: string;
    createdAt: string;
  }>;
};

export type AdminDashboard = {
  stats: {
    usersTotal: number;
    usersClients: number;
    usersFreelancers: number;
    usersAdmins: number;
    usersActive: number;
    usersSuspended: number;
    usersRegisteredLast7Days: number;
    jobsTotal: number;
    jobsDraft: number;
    jobsOpen: number;
    jobsPaused: number;
    jobsInProgress: number;
    jobsClosed: number;
    jobsCancelled: number;
    jobsHidden: number;
    jobsRemoved: number;
    proposalsTotal: number;
    proposalsPending: number;
    proposalsAccepted: number;
    proposalsRejected: number;
    proposalsWithdrawn: number;
    contractsTotal: number;
    contractsActive: number;
    contractsCompleted: number;
    contractsCancelled: number;
    reviewsTotal: number;
    reportsOpen: number;
  };
  recentActivity: Array<{
    type: string;
    id: string;
    summary: string;
    createdAt: string;
  }>;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'suspended';
  emailVerified: boolean;
  createdAt: string;
  completedContracts: number;
  averageRating: number;
};

export type AdminUserDetail = AdminUser & {
  bio?: string;
  professionalTitle?: string;
  counts: {
    jobs: number;
    proposals: number;
    contractsAsClient: number;
    contractsAsFreelancer: number;
    reviewsReceived: number;
  };
};

export type AdminReport = {
  id: string;
  reporter: { id: string; name: string; email?: string };
  targetType: 'job' | 'user' | 'review';
  targetId: string;
  category: string;
  explanation: string;
  status: string;
  resolutionNote?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AuditLogEntry = {
  id: string;
  actor: { id: string; name: string; email?: string };
  action: string;
  targetType: string;
  targetId: string;
  reason?: string;
  summary?: string;
  createdAt: string;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};
