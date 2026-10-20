# DevHire

A production-minded freelance marketplace that connects **clients**, **freelancers**, and **admins**.

This monorepo keeps the frontend and backend as separate applications so each can be installed, run, tested, and deployed independently.

```text
DevHire/
├── frontend/   # Next.js (App Router) + React + TypeScript
├── backend/    # Express + TypeScript + MongoDB
└── docs/       # Architecture, schema, API, roadmap
```

## Why separate apps?

| Concern | Frontend | Backend |
|---------|----------|---------|
| Responsibility | UI, forms, client caching | Auth, business rules, data |
| Deploy | Vercel (or similar) | Node host (Render, Railway, etc.) |
| Talks via | HTTP + Socket.IO client | REST `/api/v1` + Socket.IO server |

Keeping API routes out of Next.js means authorization, validation, and database logic live in one place — the Express backend — which matches how most real marketplaces are structured.

## Prerequisites

- Node.js 20+ (22 recommended)
- npm 10+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

## Quick start

### 1. Backend

```bash
cd backend
cp .env.example .env
# Edit MONGODB_URI if needed
npm install
npm run dev
```

Health check: [http://localhost:5000/api/v1/health](http://localhost:5000/api/v1/health)

### 2. Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App: [http://localhost:3001](http://localhost:3001)

> **Note:** This project uses port **3001** for the frontend so it does not collide with other apps commonly bound to port 3000.

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/architecture.md](docs/architecture.md) | System design and folder responsibilities |
| [docs/database-schema.md](docs/database-schema.md) | Collections, relationships, indexes |
| [docs/api-reference.md](docs/api-reference.md) | REST endpoints and response shapes |
| [docs/development-roadmap.md](docs/development-roadmap.md) | Phased build plan and learning notes |

## Development phases

1. Foundation — project setup, health API, docs
2. Authentication and profiles
3. Jobs
4. Proposals
5. Contracts, milestones, and reviews
6. Dashboards and administration
7. Notifications, email, and uploads
8. **Production hardening, CI, and deployment readiness** *(current)*
9. Portfolio polish and launch

See [docs/development-roadmap.md](docs/development-roadmap.md) and [docs/deployment.md](docs/deployment.md).

## Scripts overview

| Location | Command | What it does |
|----------|---------|--------------|
| `backend` | `npm run dev` | Start API + Socket.IO + in-process email worker |
| `backend` | `npm run worker:email` | Dedicated email outbox worker (optional) |
| `backend` | `npm run lint` | ESLint flat config |
| `backend` | `npm run build` | Compile TypeScript to `dist/` |
| `backend` | `npm start` | Run compiled server |
| `backend` | `npm test` | Vitest API tests |
| `frontend` | `npm run lint` | Next.js ESLint |
| `frontend` | `npm run typecheck` | TypeScript check |
| `frontend` | `npm run build` | Production build |
| `frontend` | `npm run start` | Serve production build |
| `frontend` | `npm test` | Vitest UI tests |

### Local notes (Phases 7–8)

- Copy `backend/.env.example` → `.env`. Leave SMTP blank for local work without mail.
- Uploads: `STORAGE_DRIVER=local` → `backend/uploads/` (gitignored). Production: `s3`.
- Socket URL: `NEXT_PUBLIC_SOCKET_URL=http://localhost:5000` in `frontend/.env.local`.
- CI: `.github/workflows/ci.yml` runs lint/typecheck/test/build (no deploy).

## Security notes

- Never commit `.env` files or real credentials.
- Admin accounts are **not** creatable via public registration (Phase 2+).
- All protected operations are enforced on the backend, not only in the UI.
- Upload validation checks extensions + magic bytes; it is **not** malware scanning.
- Production JWT secrets must not use development defaults (enforced at startup).
