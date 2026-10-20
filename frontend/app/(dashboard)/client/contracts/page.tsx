import { RequireAuth } from '@/features/auth/RequireAuth';
import { ContractsList } from '@/features/contracts/components/ContractsList';

export const metadata = {
  title: 'My contracts',
};

export default function ClientContractsPage() {
  return (
    <RequireAuth roles={['client']}>
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">My contracts</h1>
        <ContractsList role="client" />
      </div>
    </RequireAuth>
  );
}
