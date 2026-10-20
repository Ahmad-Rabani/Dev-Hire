import { RequireAuth } from '@/features/auth/RequireAuth';
import { CreateJobPage } from '@/features/jobs/components/CreateJobPage';

export const metadata = {
  title: 'Post a job',
};

export default function NewJobPage() {
  return (
    <RequireAuth roles={['client']}>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Post a job</h1>
        <CreateJobPage />
      </div>
    </RequireAuth>
  );
}
