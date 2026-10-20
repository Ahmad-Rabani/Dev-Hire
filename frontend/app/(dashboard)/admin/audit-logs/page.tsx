import { RequireAuth } from '@/features/auth/RequireAuth';
import { AdminAuditLogs } from '@/features/admin/components/AdminAuditLogs';
import { AdminNav } from '@/features/admin/components/AdminNav';

export const metadata = {
  title: 'Audit logs',
};

export default function AdminAuditLogsPage() {
  return (
    <RequireAuth roles={['admin']}>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="mb-2 text-2xl font-semibold text-slate-900">Audit logs</h1>
        <AdminNav />
        <AdminAuditLogs />
      </div>
    </RequireAuth>
  );
}
