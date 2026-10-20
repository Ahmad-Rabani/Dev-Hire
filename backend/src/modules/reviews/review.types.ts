export type PublicReview = {
  id: string;
  contractId: string;
  reviewer: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  revieweeId: string;
  rating: number;
  comment: string;
  createdAt: string;
  updatedAt: string;
};

export type FreelancerReviewSummary = {
  averageRating: number;
  reviewCount: number;
  reviews: PublicReview[];
};
