import { RequireAuth } from '@/features/auth/RequireAuth';
import { AdminDashboardView } from '@/features/admin/components/AdminDashboardView';
import { AdminNav } from '@/features/admin/components/AdminNav';

export const metadata = {
  title: 'Admin dashboard',
};

export default function AdminHomePage() {
  return (
    <RequireAuth roles={['admin']}>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Admin dashboard</h1>
        <AdminNav />
        <AdminDashboardView />
      </div>
    </RequireAuth>
  );
}
