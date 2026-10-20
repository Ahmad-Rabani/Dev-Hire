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

## Phase 6 — Dashboards and admin *(complete)*

- [x] Client / freelancer / admin dashboards (real aggregations)
- [x] Admin user search, suspend / reactivate + last-admin guard
- [x] Job moderation (`visible` | `hidden` | `removed`) separate from lifecycle
- [x] User reports + admin report queue
- [x] Persistent audit logs for admin actions
- [x] Suspension enforced on every authenticated request (Phase 2 middleware)
- [x] Backend + frontend tests / docs

**Learning focus:** aggregation pipelines and admin authorization.

### Phase 6 learning notes

1. **Aggregation** — `$match` early, then `$group` by status/role; count in MongoDB instead of loading every document into Node.
2. **Lifecycle ≠ moderation** — a job can stay `open` while `hidden` from public discovery.
3. **Audit from Phase 6 onward** — older events are not backfilled; admin dashboards mix live entity timestamps with new audit rows.
4. **Suspension** — `authenticate` re-reads `User.status` on each request; refresh sessions are revoked on suspend.

## Phase 7 — Notifications and uploads *(complete)*

- [x] Persistent MongoDB notifications + unread count / mark-read APIs
- [x] Business-event hooks (proposals, contracts, milestones, reviews)
- [x] Socket.IO with JWT handshake auth + private `user:{id}` rooms
- [x] Notification bell, list page, live toast on `notification:new`
- [x] Nodemailer + email outbox worker (auth + transactional)
- [x] Secure uploads (magic-byte checks, local storage, public/private ACL)
- [x] Avatar, portfolio, job attachments, milestone deliverables

**Learning focus:** real-time auth and safe file handling.

### Phase 7 learning notes

1. **MongoDB is the source of truth** — Socket.IO only pushes updates; offline users catch up via REST.
2. **Handshake auth** — put the access token in `socket.handshake.auth.token`, never in the query string.
3. **Rooms are server-assigned** — the backend joins `user:{verifiedId}`; clients cannot pick another user’s room.
4. **Outbox pattern** — queue emails after the business write succeeds; a worker retries SMTP without blocking the API.
5. **Upload ACL** — store metadata + opaque storage keys; authorize every private download from ownership/contract participation.

## Phase 8 — Production hardening *(complete)*

- [x] Security audit (JWT prod secrets, CSRF origin checks, upload meta ACL, outbox leases)
- [x] Backend ESLint flat config + frontend lint fixes
- [x] Email worker mode (`inline` | `external` | `off`) + stale lease reclaim
- [x] S3-compatible storage adapter (`STORAGE_DRIVER=local|s3`)
- [x] CI workflow (lint, typecheck, test, build — no auto-deploy)
- [x] Deployment guide (`docs/deployment.md`)
- [x] Regression checks executed and reported

**Learning focus:** production secrets, CSRF with cookie auth, and honest deployment limits.

### Phase 8 learning notes

1. **Fail closed on secrets** — production must refuse known default JWT secrets at startup.
2. **HttpOnly ≠ CSRF-proof** when `SameSite=None` — validate `Origin`/`Referer` on cookie POSTs.
3. **Lease the outbox** — a crash mid-send must not leave jobs stuck in `processing` forever.
4. **Ephemeral disks lose uploads** — local storage is for development; production needs object storage.
5. **CI validates; humans deploy** — automated checks should not push to production by default.

## Phase 9 — Portfolio polish & launch

- Final accessibility / responsive pass on real devices
- Optional monitoring (uptime, error reporting)
- Public demo environment with seed data (no real user PII)

---

## How to use this roadmap as a learner

After each phase:

1. Run the app and follow the phase’s manual test steps.
2. Read the “Learning notes” section added to docs for that phase.
3. Trace one feature through form → API → service → MongoDB → UI.
4. Only then move to the next phase.
