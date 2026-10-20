'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Card, Empty, Input, Spin, Tag } from 'antd';
import Link from 'next/link';
import { useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { listFreelancers } from '@/services/users.service';

export function FreelancerDirectory() {
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const query = useQuery({
    queryKey: ['freelancers', search],
    queryFn: () => listFreelancers({ q: search || undefined, limit: 12 }),
  });

  return (
    <div className="space-y-6">
      <Input.Search
        size="large"
        placeholder="Search freelancers"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onSearch={(value) => setSearch(value.trim())}
        enterButton="Search"
        allowClear
      />

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : null}

      {query.isError ? (
        <Alert type="error" showIcon message={getApiErrorMessage(query.error)} />
      ) : null}

      {query.data && query.data.items.length === 0 ? (
        <Empty description="No freelancers found yet. Register as a freelancer and complete your profile." />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {query.data?.items.map((freelancer) => (
          <Link key={freelancer.id} href={`/freelancers/${freelancer.id}`} className="block">
            <Card hoverable title={freelancer.name} className="h-full">
              <p className="text-sm text-slate-600">
                {freelancer.professionalTitle || 'Freelancer'}
              </p>
              <p className="mt-2 line-clamp-3 text-sm text-slate-500">
                {freelancer.about || freelancer.bio || 'No bio yet.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-1">
                {(freelancer.skills ?? []).slice(0, 4).map((skill) => (
                  <Tag key={skill}>{skill}</Tag>
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-500">
                ★ {freelancer.averageRating.toFixed(1)} · {freelancer.completedContracts} contracts
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
