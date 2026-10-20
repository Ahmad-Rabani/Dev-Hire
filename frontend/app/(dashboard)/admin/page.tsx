import { Alert } from 'antd';
import { RequireAuth } from '@/features/auth/RequireAuth';

export const metadata = {
  title: 'Admin',
};

export default function AdminHomePage() {
  return (
    <RequireAuth roles={['admin']}>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="mb-4 text-2xl font-semibold text-slate-900">Admin area</h1>
        <Alert
          type="info"
          showIcon
          message="Admin analytics and moderation arrive in Phase 6."
          description="Your admin account is authenticated. Use create-admin only in trusted environments."
        />
      </div>
    </RequireAuth>
  );
}
