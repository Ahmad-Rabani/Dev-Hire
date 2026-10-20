import { RequireAuth } from '@/features/auth/RequireAuth';
import { FreelancerProposalsList } from '@/features/proposals/components/FreelancerProposalsList';

export const metadata = {
  title: 'My proposals',
};

export default function FreelancerProposalsPage() {
  return (
    <RequireAuth roles={['freelancer']}>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">My proposals</h1>
        <FreelancerProposalsList />
      </div>
    </RequireAuth>
  );
}
