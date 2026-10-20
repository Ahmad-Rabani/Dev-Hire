# Development Roadmap

Build DevHire phase by phase. Do not mark a phase complete until the feature works end to end and known limitations are documented.

## Phase 1 — Foundation *(complete)*

- [x] Root repo structure (`frontend/`, `backend/`, `docs/`)
- [x] Architecture and roadmap docs
- [x] Express + TypeScript backend with health endpoint
- [x] MongoDB connection module
- [x] Centralized error handling and API response helpers
- [x] Next.js frontend foundation (Tailwind, Ant Design, TanStack Query)
- [x] `.env.example` files and READMEs
- [x] Verify local run commands

**Learning focus:** separation of concerns, env config, health checks.

### Phase 1 learning notes

1. **Two apps, one product** — frontend and backend have separate `package.json` files so you can deploy and scale them independently.
2. **`createApp()` vs `bootstrap()`** — the Express app is a pure function of middleware/routes; listening happens only in `server.ts`.
3. **Consistent JSON** — every success/error goes through `sendSuccess` / `sendError` so the UI can rely on `{ success, data | message }`.
4. **Health as integration smoke test** — the landing page card is not a feature for users; it proves Query → Axios → Express → MongoDB before auth exists.

## Phase 2 — Authentication and profiles *(complete)*

- [x] Registration / login / refresh / logout / me
- [x] HttpOnly refresh cookies, access tokens, role guards
- [x] Email verification + forgot/reset password flows
- [x] Client & freelancer profiles + public freelancer directory
- [x] Protected layouts and role-aware navigation
- [x] Controlled `create-admin` script
- [x] Auth + profile API tests

**Learning focus:** JWT lifecycle, never trusting client-supplied roles.

### Phase 2 learning notes

1. **Two tokens, two storage places** — access token in JS memory (XSS harder to persist); refresh token in HttpOnly cookie (JS cannot read it).
2. **Rotation + reuse detection** — each refresh issues a new session and revokes the old one; presenting the old cookie again kills all sessions.
3. **Strict profile PATCH** — Zod `.strict()` + explicit field assignment prevent mass-assignment (`role`, ratings, etc.).
4. **SMTP optional** — without credentials, verification/reset tokens are logged in development so you can still test.

## Phase 3 — Jobs *(complete)*

- [x] Job model, indexes, status transitions
- [x] Client CRUD + `/jobs/mine`
- [x] Public browse with search/filter/sort/pagination
- [x] Ownership checks and protected fields
- [x] Frontend listing, detail, create/edit, client manager
- [x] Backend job tests

**Learning focus:** server-side filtering and ownership checks.

### Phase 3 learning notes

1. **Ownership from auth** — `client` on a job is always `req.user.id`, never a body field.
2. **Pagination metadata** — `skip = (page-1)*limit`, `limit`, `countDocuments` for totals; secondary `_id` sort keeps pages stable.
3. **Allowlisted sort** — never pass raw `sortBy` strings into MongoDB.
4. **Public vs mine** — public listings force `status: open`; owners see drafts via `/jobs/mine` or authenticated `GET /jobs/:id`.

## Phase 4 — Proposals *(complete)*

- [x] Submit / edit / withdraw
- [x] Client proposal review
- [x] Accept / reject with contract creation
- [x] Unique `(job, freelancer)` + one-accepted-per-job indexes
- [x] Job `in_progress` after hire
- [x] Frontend apply + proposal management pages
- [x] Backend proposal tests

**Learning focus:** business rules + transactions.

### Phase 4 learning notes

1. **Unique compound index** — DB-level duplicate prevention beats a frontend “already applied” check.
2. **Accept is multi-document** — proposal + job + other proposals + contract must stay consistent; use transactions when available, plus conditional updates and unique indexes.
3. **Idempotent accept** — repeating accept on the same proposal returns the existing contract instead of creating a second hire.
4. **Scope** — Phase 4 creates the contract shell only; milestones and payments are Phase 5.

## Phase 5 — Contracts, milestones, reviews *(complete)*

- [x] Contract list/detail with participant ACL
- [x] Embedded milestones + status machine
- [x] Submit / revise / approve workflows
- [x] Progress from real milestone data
- [x] Client completion + guarded cancellation
- [x] Reciprocal reviews + unique index + rating avg
- [x] Public freelancer reviews on profile
- [x] Backend contract tests + docs

**Learning focus:** status machines and derived stats.

### Phase 5 learning notes

1. **Embedded milestones** — milestones only live inside a contract, so embedding avoids extra joins and keeps ACL simple.
2. **Approve ≠ pay** — approval means work accepted in the app; there is no escrow or transfer in Phase 5.
3. **Compound unique reviews** — `{ contract, reviewer }` lets both parties review once; uniqueness on `contract` alone would block the reciprocal review.
4. **Transactions** — completion updates contract + job + user counters; falls back to conditional updates on standalone MongoDB (no replica set).

## Phase 6 — Dashboards and admin

- Role dashboards via aggregations
- User suspend/reactivate, job moderation

**Learning focus:** aggregation pipelines and admin authorization.

## Phase 7 — Notifications and uploads

- Persistent notifications + Socket.IO
- Nodemailer (graceful if SMTP missing)
- Secure Multer uploads

**Learning focus:** real-time auth and safe file handling.

## Phase 8 — Testing, security, polish

- Critical Vitest/Supertest (and frontend) tests
- Security and responsive review
- Fix build/lint/type errors

## Phase 9 — Deployment preparation

- Atlas, CORS, cookies, env checklists
- Frontend (Vercel) + backend host docs
- Production readiness checklist

---

## How to use this roadmap as a learner

After each phase:

1. Run the app and follow the phase’s manual test steps.
2. Read the “Learning notes” section added to docs for that phase.
3. Trace one feature through form → API → service → MongoDB → UI.
4. Only then move to the next phase.
