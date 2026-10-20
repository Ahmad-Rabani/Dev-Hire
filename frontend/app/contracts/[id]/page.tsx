import { RequireAuth } from '@/features/auth/RequireAuth';
import { ContractDetailView } from '@/features/contracts/components/ContractDetailView';

export const metadata = {
  title: 'Contract details',
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContractDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <RequireAuth roles={['client', 'freelancer']}>
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
        <ContractDetailView contractId={id} />
      </div>
    </RequireAuth>
  );
}
