'use client';

import { useQuery } from '@tanstack/react-query';
import { Alert, Button, Empty, Input, Pagination, Select, Spin } from 'antd';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getApiErrorMessage } from '@/lib/api-client';
import { listJobs } from '@/services/jobs.service';
import type { BudgetType, JobListParams, JobSortField } from '@/types/job';
import { JobCard } from './JobCard';

function readParams(searchParams: URLSearchParams): JobListParams {
  return {
    search: searchParams.get('search') ?? undefined,
    budgetType: (searchParams.get('budgetType') as BudgetType | null) ?? undefined,
    minBudget: searchParams.get('minBudget') ? Number(searchParams.get('minBudget')) : undefined,
    maxBudget: searchParams.get('maxBudget') ? Number(searchParams.get('maxBudget')) : undefined,
    skills: searchParams.get('skills') ?? undefined,
    sortBy: (searchParams.get('sortBy') as JobSortField | null) ?? 'createdAt',
    sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc' | null) ?? 'desc',
    page: Number(searchParams.get('page') ?? 1),
    limit: Number(searchParams.get('limit') ?? 9),
  };
}

export function PublicJobsBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const params = useMemo(() => readParams(searchParams), [searchParams]);

  const [searchInput, setSearchInput] = useState(params.search ?? '');
  const [skillsInput, setSkillsInput] = useState(params.skills ?? '');
  const [minBudget, setMinBudget] = useState(params.minBudget?.toString() ?? '');
  const [maxBudget, setMaxBudget] = useState(params.maxBudget?.toString() ?? '');

  useEffect(() => {
    setSearchInput(params.search ?? '');
    setSkillsInput(params.skills ?? '');
    setMinBudget(params.minBudget?.toString() ?? '');
    setMaxBudget(params.maxBudget?.toString() ?? '');
  }, [params]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      if ((params.search ?? '') === searchInput.trim()) return;
      pushParams({ ...params, search: searchInput.trim() || undefined, page: 1 });
    }, 400);
    return () => window.clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const query = useQuery({
    queryKey: ['jobs', 'public', params],
    queryFn: () => listJobs(params),
  });

  function pushParams(next: JobListParams) {
    const sp = new URLSearchParams();
    Object.entries(next).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        sp.set(key, String(value));
      }
    });
    router.replace(`${pathname}?${sp.toString()}`);
  }

  function applyFilters() {
    pushParams({
      ...params,
      skills: skillsInput.trim() || undefined,
      minBudget: minBudget ? Number(minBudget) : undefined,
      maxBudget: maxBudget ? Number(maxBudget) : undefined,
      page: 1,
    });
  }

  function resetFilters() {
    setSearchInput('');
    setSkillsInput('');
    setMinBudget('');
    setMaxBudget('');
    router.replace(pathname);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <Input.Search
          size="large"
          placeholder="Search title, description, skills"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onSearch={(value) =>
            pushParams({ ...params, search: value.trim() || undefined, page: 1 })
          }
          allowClear
          className="sm:col-span-2"
        />
        <Select
          size="large"
          allowClear
          placeholder="Budget type"
          value={params.budgetType}
          options={[
            { value: 'fixed', label: 'Fixed' },
            { value: 'hourly', label: 'Hourly' },
          ]}
          onChange={(value) => pushParams({ ...params, budgetType: value, page: 1 })}
        />
        <Select
          size="large"
          value={`${params.sortBy}:${params.sortOrder}`}
          options={[
            { value: 'createdAt:desc', label: 'Newest' },
            { value: 'createdAt:asc', label: 'Oldest' },
            { value: 'budgetMin:asc', label: 'Budget ↑' },
            { value: 'budgetMin:desc', label: 'Budget ↓' },
            { value: 'deadline:asc', label: 'Deadline soonest' },
            { value: 'title:asc', label: 'Title A–Z' },
          ]}
          onChange={(value) => {
            const [sortBy, sortOrder] = value.split(':') as [JobSortField, 'asc' | 'desc'];
            pushParams({ ...params, sortBy, sortOrder, page: 1 });
          }}
        />
        <Input
          size="large"
          placeholder="Skills (comma-separated)"
          value={skillsInput}
          onChange={(e) => setSkillsInput(e.target.value)}
        />
        <Input
          size="large"
          type="number"
          placeholder="Min budget"
          value={minBudget}
          onChange={(e) => setMinBudget(e.target.value)}
        />
        <Input
          size="large"
          type="number"
          placeholder="Max budget"
          value={maxBudget}
          onChange={(e) => setMaxBudget(e.target.value)}
        />
        <div className="flex gap-2">
          <Button type="primary" size="large" onClick={applyFilters}>
            Apply
          </Button>
          <Button size="large" onClick={resetFilters}>
            Reset
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex justify-center py-16">
          <Spin size="large" />
        </div>
      ) : null}

      {query.isError ? (
        <Alert type="error" showIcon message={getApiErrorMessage(query.error)} />
      ) : null}

      {query.data && query.data.jobs.length === 0 ? (
        <Empty description="No open jobs match your filters." />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {query.data?.jobs.map((job) => (
          <JobCard key={job.id} job={job} href={`/jobs/${job.id}`} />
        ))}
      </div>

      {query.data && query.data.pagination.totalPages > 1 ? (
        <div className="flex justify-center">
          <Pagination
            current={query.data.pagination.page}
            pageSize={query.data.pagination.limit}
            total={query.data.pagination.totalItems}
            onChange={(page) => pushParams({ ...params, page })}
            showSizeChanger={false}
          />
        </div>
      ) : null}
    </div>
  );
}
