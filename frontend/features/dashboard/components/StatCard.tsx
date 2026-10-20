'use client';

import Link from 'next/link';

type Props = {
  label: string;
  value: number | string;
  href?: string;
  hint?: string;
};

export function StatCard({ label, value, href, hint }: Props) {
  const inner = (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600">
        {inner}
      </Link>
    );
  }
  return inner;
}
