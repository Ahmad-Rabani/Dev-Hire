import { FreelancerDirectory } from '@/features/profile/FreelancerDirectory';

export const metadata = {
  title: 'Freelancers',
};

export default function FreelancersPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold text-slate-900">Freelancers</h1>
      <p className="mb-8 text-slate-600">Browse public freelancer profiles on DevHire.</p>
      <FreelancerDirectory />
    </div>
  );
}
