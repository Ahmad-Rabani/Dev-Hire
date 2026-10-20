# DevHire — portfolio case study

## Problem

Freelancers and clients need a shared place to discover work, negotiate via proposals, formalize an engagement, track deliverables, and leave ratings. Off-the-shelf UI kits do not teach **object-level authorization**, **idempotent hiring**, or **reliable side effects** (notifications/email). DevHire is an independent full-stack project that implements those concerns end to end.

**Who benefits in the product model**

- **Clients** — post jobs, review proposals, manage contracts/milestones, rate freelancers.
- **Freelancers** — discover jobs, propose, deliver milestone work, build a public reputation.
- **Admins** — suspend abuse, moderate jobs, handle reports, retain audit history.

## Engineering challenges (from the real codebase)

| Challenge | How DevHire addresses it |
|-----------|--------------------------|
| Multi-role auth | JWT access in memory + HttpOnly refresh cookies; roles loaded from DB on each `authenticate` |
| Job ownership | Client id from token — never from request body |
| Duplicate proposals | Unique `{ job, freelancer }` index |
| Safe hiring | Accept flow + unique accepted-proposal / one-contract-per-job indexes; transaction when available |
| Milestone states | Explicit transitions (`pending` → `submitted` → `approved` / revision loop) |
| Review integrity | Unique `{ contract, reviewer }`; average rating recalculated server-side |
| Dashboards | MongoDB aggregations scoped by role |
| Private files | Upload metadata + ACL on every content fetch |
| Notifications | Persist first; Socket.IO push second |
| Email reliability | Outbox with leases, retries, dedupe keys |
| Admin accountability | Audit log rows for moderation actions |

## Architecture decisions

### 1. Separate Next.js frontend and Express API

- **Problem:** Mixing all business rules into Next.js Route Handlers blurs security boundaries for a learner portfolio.
- **Choice:** Two apps, REST `/api/v1` + Socket.IO.
- **Fit:** Clear “UI vs authority” story in interviews; matches many production marketplaces.
- **Alternative:** Next.js full-stack with server actions.
- **Trade-off:** Two deploys and CORS/cookie configuration; more moving parts locally.

### 2. Access JWT + rotating refresh cookie

- **Problem:** Long-lived tokens in `localStorage` are XSS-risky; short access tokens need renewal.
- **Choice:** Short access JWT in memory (Zustand); refresh in HttpOnly cookie with rotation and reuse detection.
- **Fit:** Demonstrates session hardening without OAuth complexity.
- **Alternative:** Session cookies only, or opaque server sessions in Redis.
- **Trade-off:** Cross-site SPA+API needs `SameSite=None` + Origin checks for CSRF on cookie POSTs.

### 3. Zod at the edge, services for rules

- **Problem:** Controllers become unreadable when validation and business logic mix.
- **Choice:** Routes → validate → controller → service → model.
- **Fit:** Matches the feature-module layout under `backend/src/modules/*`.
- **Alternative:** class-validator / Joi everywhere.
- **Trade-off:** Some schemas duplicated conceptually with frontend Zod (acceptable for independence).

### 4. Uniqueness indexes + conditional updates for hiring

- **Problem:** Two admins/clients double-clicking Accept can create two hires.
- **Choice:** Partial unique index on accepted proposals; unique contract.job; accept uses transactions or atomic fallback.
- **Fit:** Interview-friendly explanation of “DB enforces invariants.”
- **Alternative:** Distributed locks / Redis.
- **Trade-off:** Fallback path without transactions is documented; Atlas replica set preferred.

### 5. Notification outbox pattern for email

- **Problem:** Blocking SMTP on hire APIs makes the product feel broken when mail is down.
- **Choice:** Persist outbox after business success; worker sends with leases/retries.
- **Fit:** Shows reliability thinking beyond “call nodemailer in the controller.”
- **Alternative:** Bull/Redis queues.
- **Trade-off:** Mongo outbox is simpler; not a full job platform.

### 6. Storage abstraction (local | S3)

- **Problem:** Local disk dies on ephemeral hosts.
- **Choice:** `StorageProvider` with local default and S3-compatible driver.
- **Fit:** Production readiness without forcing cloud credentials on day one.
- **Alternative:** Only S3 from the start.
- **Trade-off:** Live S3 path is implemented but **unverified** without a real bucket.

## Testing and reliability

| Layer | What exists |
|-------|-------------|
| Backend integration | Vitest + Supertest + mongodb-memory-server (auth, jobs, proposals, contracts journey, admin, notifications, uploads, email outbox) |
| Frontend unit | Vitest + Testing Library (dashboard/contracts/notification helpers) |
| Static | ESLint + TypeScript + production builds |
| CI | GitHub Actions: lint, typecheck, test, build — **no deploy** |
| Browser E2E | **Not implemented** (Playwright optional later) |

Phase 8 reported **34** backend and **4** frontend tests passing in that environment. Re-run locally before interviews.

## Limitations and future work

- Live SMTP delivery unverified without credentials.
- Live S3 round-trip unverified.
- No malware scanning on uploads.
- Socket.IO multi-instance needs documented Redis adapter / sticky sessions.
- No Playwright smoke suite yet.
- No claim of production users, revenue, or load-test SLAs.

## Outcome

DevHire is a **substantial independent full-stack project** suitable for junior React / full-stack interviews: you can run it locally, walk a hiring flow, and explain how MongoDB and middleware protect the marketplace invariants.
