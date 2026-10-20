import { Suspense } from 'react';
import { ApiStatusCard } from '@/features/health/ApiStatusCard';

export default function HomePage() {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#ccfbf1_0%,_transparent_55%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)]"
      />

      <section className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-16 sm:px-6 lg:py-24">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">
            Freelance marketplace
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            DevHire
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-slate-600">
            Hire skilled developers or find your next contract. Register as a client
            or freelancer, manage your profile, and browse the public directory.
          </p>
        </div>

        <div className="max-w-xl">
          {/* Suspense keeps client Query/Ant Design off the static prerender path */}
          <Suspense fallback={<div className="rounded-lg border border-slate-200 bg-white p-6 text-slate-500">Loading API status…</div>}>
            <ApiStatusCard />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
