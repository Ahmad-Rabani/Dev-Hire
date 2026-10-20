import { FreelancerPublicProfile } from '@/features/profile/FreelancerPublicProfile';

export const metadata = {
  title: 'Freelancer profile',
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function FreelancerDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <FreelancerPublicProfile id={id} />
    </div>
  );
}
