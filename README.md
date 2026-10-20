# DevHire

**DevHire** is a full-stack freelance marketplace where **clients** post jobs, **freelancers** submit proposals, clients hire, and both parties manage **contracts**, **milestones**, and **reviews**. An **admin** role supports moderation, reports, and audit history.

This repository is a learning and portfolio project (Phases 1–9). It demonstrates real authorization, MongoDB constraints, aggregations, notifications, email outbox, and secure uploads — not a commercial product with live customers.

```text
DevHire/
├── frontend/   # Next.js 16 (App Router) + React 19 + TypeScript
├── backend/    # Express 5 + TypeScript + MongoDB/Mongoose
├── docs/       # Architecture, API, demo, interview, deployment
└── .github/    # CI (lint, typecheck, test, build — no auto-deploy)
```

## Implemented features

| Area | What works |
|------|------------|
| Auth | Register/login, JWT access + HttpOnly refresh rotation, email verify / password reset hooks, suspension checks |
| Profiles | Client & freelancer profiles, public freelancer pages, portfolio fields |
| Jobs | Create/edit, public search/filter/sort/pagination, ownership rules, moderation status |
| Proposals | Submit, withdraw, accept/reject; unique freelancer-per-job; one accepted hire per job |
| Contracts | Initial contract on accept, milestones, submit/revision/approve, complete/cancel |
| Reviews | Bidirectional reviews after completion, unique per reviewer+contract, average rating |
| Dashboards | Client / freelancer / admin aggregations |
| Admin | User suspend, job moderation, reports, audit logs |
| Notifications | MongoDB persistence + Socket.IO `notification:new` to private rooms |
| Email | Nodemailer + outbox worker (requires SMTP for real delivery) |
| Uploads | Magic-byte validation, metadata ACL, local disk or S3-compatible driver |
| Quality | Vitest/Supertest API tests, frontend unit tests, ESLint, TypeScript, CI |

## Honest limitations

- **SMTP**: real inbox delivery needs configured credentials and has not been verified against a live provider in this handoff.
- **S3**: `STORAGE_DRIVER=s3` adapter exists; a live bucket round-trip is **unverified** without your credentials.
- **Malware scanning**: not implemented — type/size checks only.
- **Multi-instance Socket.IO**: single-instance in-memory adapter is the supported default; Redis adapter is documented, not wired.
- **Browser E2E**: no Playwright suite; critical flows are covered by API integration tests.
- **Deployment**: guides exist; this project has **not** been claimed as deployed to production here.

## Technology stack (from package manifests)

**Frontend:** Next.js 16, React 19, TypeScript, Ant Design 6, TanStack Query 5, Axios, React Hook Form, Zod, Zustand, Socket.IO client, Vitest + Testing Library.

**Backend:** Express 5, TypeScript, Mongoose 9, Zod, JWT, bcryptjs, Helmet, CORS, express-rate-limit, Multer, Nodemailer, Socket.IO, optional `@aws-sdk/client-s3`, Vitest + Supertest + mongodb-memory-server.

**Database:** MongoDB (local or Atlas).

## Architecture (short)

The **frontend** is presentation and client caching. The **backend** owns authentication, authorization, validation, and persistence. They talk over REST (`/api/v1`) and Socket.IO. Security decisions are never trusted from the UI alone.

Details and Mermaid diagrams: [docs/architecture.md](docs/architecture.md) · Schema: [docs/database-schema.md](docs/database-schema.md) · API: [docs/api-reference.md](docs/api-reference.md)

## Local setup

**Prerequisites:** Node.js 20+ (22 recommended), npm 10+, MongoDB local or Atlas.

### 1. Backend

```bash
cd backend
cp .env.example .env
# Set MONGODB_URI (default mongodb://127.0.0.1:27017/devhire)
npm install
npm run seed:demo          # optional synthetic accounts
npm run create-admin -- --email admin@devhire.local --password 'AdminPass1' --name 'Platform Admin'
npm run dev
```

- Health: http://localhost:5000/api/v1/health  
- Leave SMTP blank for local work without mail.  
- Email worker: inline by default (`EMAIL_WORKER_MODE=inline`). For a separate process: `EMAIL_WORKER_MODE=external` then `npm run worker:email`.

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App: http://localhost:3001 (port **3001** on purpose).

### Demo accounts (after `npm run seed:demo`)

| Role | Email | Password |
|------|-------|----------|
| Client | `demo-client@devhire.demo` | `DemoPass1!` |
| Freelancer | `demo-freelancer@devhire.demo` | `DemoPass1!` |

These are **local synthetic** accounts only. Provision admin with `create-admin` (never via public register).

### Quality commands

```bash
# Backend
cd backend
npm run lint
npm run typecheck
npm test
npm run build

# Frontend
cd frontend
npm run lint
npm run typecheck
npm test
npm run build
```

CI: [`.github/workflows/ci.yml`](.github/workflows/ci.yml) runs the same class of checks on push/PR (no deploy).

## Documentation map

| Doc | Purpose |
|-----|---------|
| [docs/demo-script.md](docs/demo-script.md) | 5–8 minute interview demo |
| [docs/portfolio-case-study.md](docs/portfolio-case-study.md) | Case study narrative |
| [docs/interview-preparation.md](docs/interview-preparation.md) | Explain decisions in interviews |
| [docs/portfolio-summary.md](docs/portfolio-summary.md) | CV / GitHub / spoken blurbs |
| [docs/deployment.md](docs/deployment.md) | Production checklist (do not assume deployed) |
| [docs/screenshots/README.md](docs/screenshots/README.md) | Screenshot capture checklist |
| [docs/playwright-future.md](docs/playwright-future.md) | Why browser E2E is deferred |
| [docs/development-roadmap.md](docs/development-roadmap.md) | Phases 1–9 learning path |

## Project status

Phases **1–8** built the product and hardening. Phase **9** adds portfolio docs, demo seed, and interview materials.

Phase 8 local checks were reported passing in that handoff (**backend 34 tests**, **frontend 4 tests**, lint/typecheck/build). Phase 9 re-runs checks at the end of the finalization pass — see the Phase 9 report in chat / commit notes. Compilation and CI readiness are **not** proof of a production deployment.

## Security reminders

- Never commit `.env` or real credentials.
- Admins are not creatable via public registration.
- Upload checks are not malware scanning.
- Production JWT secrets must not use development defaults (enforced at startup).
