import { Suspense } from 'react';
import { PublicJobsBoard } from '@/features/jobs/components/PublicJobsBoard';

export const metadata = {
  title: 'Jobs',
};

export default function JobsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="mb-2 text-3xl font-semibold text-slate-900">Browse jobs</h1>
      <p className="mb-8 text-slate-600">
        Search open freelance opportunities. Filters and pagination run on the server.
      </p>
      <Suspense fallback={<p className="text-slate-500">Loading jobs…</p>}>
        <PublicJobsBoard />
      </Suspense>
    </div>
  );
}
