import { RequireAuth } from '@/features/auth/RequireAuth';
import { ClientDashboard } from '@/features/dashboard/components/ClientDashboard';

export const metadata = {
  title: 'Client dashboard',
};

export default function ClientDashboardPage() {
  return (
    <RequireAuth roles={['client']}>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Client dashboard</h1>
        <ClientDashboard />
      </div>
    </RequireAuth>
  );
}
