import { JobDetailView } from '@/features/jobs/components/JobDetailView';

export const metadata = {
  title: 'Job details',
};

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <JobDetailView id={id} />
    </div>
  );
}
