import { RequireAuth } from '@/features/auth/RequireAuth';
import { EditJobPage } from '@/features/jobs/components/EditJobPage';

export const metadata = {
  title: 'Edit job',
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditJobRoute({ params }: PageProps) {
  const { id } = await params;
  return (
    <RequireAuth roles={['client']}>
      <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Edit job</h1>
        <EditJobPage id={id} />
      </div>
    </RequireAuth>
  );
}
