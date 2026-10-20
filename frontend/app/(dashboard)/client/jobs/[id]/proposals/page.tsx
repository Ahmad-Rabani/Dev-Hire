import Link from 'next/link';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { ClientJobProposalsList } from '@/features/proposals/components/ClientJobProposalsList';

export const metadata = {
  title: 'Job proposals',
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ClientJobProposalsPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <RequireAuth roles={['client']}>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold text-slate-900">Proposals</h1>
          <Link href={`/jobs/${id}`} className="text-sm text-teal-700 hover:underline">
            View job
          </Link>
        </div>
        <ClientJobProposalsList jobId={id} />
      </div>
    </RequireAuth>
  );
}
