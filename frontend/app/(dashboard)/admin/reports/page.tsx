import { RequireAuth } from '@/features/auth/RequireAuth';
import { AdminNav } from '@/features/admin/components/AdminNav';
import { AdminReportsManager } from '@/features/admin/components/AdminReportsManager';

export const metadata = {
  title: 'Reports',
};

export default function AdminReportsPage() {
  return (
    <RequireAuth roles={['admin']}>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Reports queue</h1>
        <AdminNav />
        <AdminReportsManager />
      </div>
    </RequireAuth>
  );
}
