'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Rate, Spin, Tag } from 'antd';
import { getApiErrorMessage } from '@/lib/api-client';
import { ReportButton } from '@/features/reports/components/ReportButton';
import { listFreelancerReviews } from '@/services/contracts.service';
import { getFreelancer } from '@/services/users.service';

type Props = {
  id: string;
};

export function FreelancerPublicProfile({ id }: Props) {
  const query = useQuery({
    queryKey: ['freelancers', id],
    queryFn: () => getFreelancer(id),
  });

  const reviewsQuery = useQuery({
    queryKey: ['freelancers', id, 'reviews'],
    queryFn: () => listFreelancerReviews(id, { limit: 10 }),
  });

  if (query.isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (query.isError || !query.data) {
    return <Alert type="error" showIcon message={getApiErrorMessage(query.error, 'Not found')} />;
  }

  const f = query.data;
  const reviewSummary = reviewsQuery.data;

  return (
    <article className="space-y-6">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{f.name}</h1>
            <p className="mt-1 text-lg text-teal-800">{f.professionalTitle || 'Freelancer'}</p>
            <p className="mt-2 text-sm text-slate-500">
              ★ {f.averageRating.toFixed(1)}
              {reviewSummary ? ` (${reviewSummary.reviewCount} reviews)` : ''} ·{' '}
              {f.completedContracts} completed contracts · {f.availability ?? 'available'}
              {f.hourlyRate != null ? ` · $${f.hourlyRate}/hr` : ''}
            </p>
          </div>
          <ReportButton targetType="user" targetId={id} />
        </div>
      </header>

      <section>
        <h2 className="text-lg font-medium text-slate-900">About</h2>
        <p className="mt-2 whitespace-pre-wrap text-slate-600">
          {f.about || f.bio || 'This freelancer has not added an about section yet.'}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Skills</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {(f.skills ?? []).length ? (
            f.skills.map((skill) => <Tag key={skill}>{skill}</Tag>)
          ) : (
            <p className="text-sm text-slate-500">No skills listed.</p>
          )}
        </div>
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Reviews</h2>
        {reviewsQuery.isLoading ? (
          <Spin className="mt-2" />
        ) : !reviewSummary || reviewSummary.reviews.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No reviews yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {reviewSummary.reviews.map((review) => (
              <li key={review.id} className="rounded-lg border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-slate-900">{review.reviewer.name}</span>
                  <Rate disabled value={review.rating} />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{review.comment}</p>
                <p className="mt-1 text-xs text-slate-400">
                  {new Date(review.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-medium text-slate-900">Portfolio</h2>
        {(f.portfolio ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">No portfolio items yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {f.portfolio.map((item) => (
              <li key={item._id ?? item.title} className="rounded-lg border border-slate-200 p-4">
                <p className="font-medium text-slate-900">{item.title}</p>
                {item.description ? (
                  <p className="mt-1 text-sm text-slate-600">{item.description}</p>
                ) : null}
                {item.url ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm text-teal-700 hover:underline"
                  >
                    View project
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </article>
  );
}
