import { RequireAuth } from '@/features/auth/RequireAuth';
import { AdminNav } from '@/features/admin/components/AdminNav';
import { AdminUsersManager } from '@/features/admin/components/AdminUsersManager';

export const metadata = {
  title: 'Admin users',
};

export default function AdminUsersPage() {
  return (
    <RequireAuth roles={['admin']}>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">User management</h1>
        <AdminNav />
        <AdminUsersManager />
      </div>
    </RequireAuth>
  );
}
