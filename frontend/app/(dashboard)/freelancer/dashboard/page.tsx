import { RequireAuth } from '@/features/auth/RequireAuth';
import { FreelancerDashboard } from '@/features/dashboard/components/FreelancerDashboard';

export const metadata = {
  title: 'Freelancer dashboard',
};

export default function FreelancerDashboardPage() {
  return (
    <RequireAuth roles={['freelancer']}>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Freelancer dashboard</h1>
        <FreelancerDashboard />
      </div>
    </RequireAuth>
  );
}
