import { RequireAuth } from '@/features/auth/RequireAuth';
import { ClientJobsManager } from '@/features/jobs/components/ClientJobsManager';

export const metadata = {
  title: 'My jobs',
};

export default function ClientJobsPage() {
  return (
    <RequireAuth roles={['client']}>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">My jobs</h1>
        <ClientJobsManager />
      </div>
    </RequireAuth>
  );
}
