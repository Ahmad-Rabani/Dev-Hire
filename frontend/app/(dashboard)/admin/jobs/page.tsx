import { RequireAuth } from '@/features/auth/RequireAuth';
import { AdminJobsManager } from '@/features/admin/components/AdminJobsManager';
import { AdminNav } from '@/features/admin/components/AdminNav';

export const metadata = {
  title: 'Job moderation',
};

export default function AdminJobsPage() {
  return (
    <RequireAuth roles={['admin']}>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Job moderation</h1>
        <p className="mb-4 text-sm text-slate-500">
          Lifecycle status (open/closed) is separate from moderation (visible/hidden/removed).
        </p>
        <AdminNav />
        <AdminJobsManager />
      </div>
    </RequireAuth>
  );
}
