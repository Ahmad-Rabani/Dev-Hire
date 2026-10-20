# DevHire — technical interview preparation

Use this as a study sheet. Every example maps to code under `frontend/` or `backend/`.

---

## Frontend

### Next.js App Router

1. **Plain English:** Routes are folders under `app/`; each `page.tsx` is a URL.
2. **DevHire:** `/jobs`, `/client/dashboard`, `/contracts/[id]`, `/admin`.
3. **Why:** File-based routing keeps portfolio navigation obvious.
4. **Mistake:** Putting secrets in `NEXT_PUBLIC_*` env vars.
5. **Question:** Why separate `(dashboard)` route groups?
6. **Answer:** Groups organize layouts without changing the URL path; role pages still enforce access via `RequireAuth`.

### Client vs server components

1. UI that uses hooks, Zustand, Ant Design forms is `'use client'`.
2. Example: `SiteHeader`, `JobForm`, `SocketNotificationProvider`.
3. Matters because browser APIs and React Query need a client boundary.
4. Mistake: Marking everything client “just in case.”
5. Q: Can Server Components call your Express API with the user’s cookie?
6. A: Refresh cookie is HttpOnly for the API origin; the browser SPA uses Axios with credentials — SSR would need a deliberate BFF design we did not use.

### TanStack Query

1. Server state lives in the cache keyed by resources (`['jobs']`, `['notifications']`).
2. Mutations invalidate related keys after accept/submit.
3. Avoids stale dashboards after hiring.
4. Mistake: Storing API lists only in Zustand.
5. Q: What happens on Socket `notification:new`?
6. A: Provider invalidates notification queries and shows a toast; REST remains source of truth.

### React Hook Form + Zod

1. Forms validate before submit; backend Zod validates again.
2. Job create, milestone submit, auth forms.
3. Defense in depth for UX and security.
4. Mistake: Trusting only client validation.
5. Q: Why both ends?
6. A: Clients can bypass the UI; API Zod is authoritative.

### Axios client

1. Central instance attaches Bearer token; on 401 refreshes once via cookie.
2. `frontend/lib/api-client.ts`.
3. Consistent auth for all features.
4. Mistake: New Axios instance per feature without interceptors.
5. Q: Where is the access token stored?
6. A: In-memory Zustand — not `localStorage` — to reduce XSS token theft window.

---

## Backend

### Middleware pipeline

1. Request hits Helmet → CORS → JSON limits → route → auth → role → validate → controller.
2. `app.ts` + `authenticate` + `validate`.
3. Cross-cutting security stays consistent.
4. Mistake: Checking roles only in React.
5. Q: How are suspended users blocked?
6. A: `authenticate` reloads `User.status`; suspended → 403; refresh sessions revoked on suspend.

### Controllers vs services

1. Controllers shape HTTP; services own rules and DB.
2. `proposal.controller` → `proposal.service.acceptProposal`.
3. Testable business logic without Express.
4. Mistake: Writing Mongo queries in controllers.
5. Q: Why `app.ts` separate from `server.ts`?
6. A: Tests import `createApp()` without listening on a port.

### JWT + refresh rotation

1. Short access JWT; refresh cookie rotated; reuse of old refresh revokes family.
2. `auth.service` + `refreshsessions`.
3. Limits stolen refresh usefulness.
4. Mistake: Never rotating refresh tokens.
5. Q: CSRF risk with cookies?
6. A: Production `SameSite=None` needs `requireTrustedOrigin` on `/auth/refresh` and `/logout`.

### Validation & errors

1. Zod `.strict()` blocks mass assignment; `AppError` + error middleware formats JSON.
2. User update cannot set `role` from body.
3. Predictable clients; safer APIs.
4. Mistake: Returning stack traces in production.
5. Q: How do you stop Mongo operator injection?
6. A: We never pass raw `req.query` into filters; Zod parses known fields into typed objects.

---

## MongoDB

### References vs embedded

1. Shared entities referenced; contract-only milestones embedded.
2. Job.client vs Contract.milestones[].
3. Correct loading and ownership models.
4. Mistake: Embedding users inside every job.
5. Q: Why not embed proposals in jobs?
6. A: Many freelancers propose; uniqueness and freelancer dashboards need a Proposal collection.

### Indexes & uniqueness

1. Indexes speed filters; unique indexes enforce business laws.
2. `{ job, freelancer }` unique; one accepted proposal per job; one contract per job; one review per reviewer+contract.
3. Race-safe hiring/reviews.
4. Mistake: “We’ll check in code only.”
5. Q: What if two Accept requests race?
6. A: Second write fails unique index / conditional update → conflict; client sees safe error.

### Aggregations

1. `$match` early, `$group` for counts — dashboards.
2. Client/freelancer/admin dashboard services.
3. Avoid loading entire collections into Node.
4. Mistake: `find()` everything then count in JS.
5. Q: How is averageRating maintained?
6. A: After review create, service recalculates `$avg` for the reviewee — not a client field.

### Transactions

1. Multi-document hire/complete prefer sessions when replica set supports them.
2. Accept/complete services with unsupported-transaction fallback.
3. Honesty about deployment (Atlas replica set).
4. Mistake: Claiming two sequential writes are atomic.
5. Q: What does the fallback guarantee?
6. A: Atomic findOneAndUpdate + unique indexes still prevent double contracts; full multi-doc atomicity needs transactions.

---

## Advanced workflows

### Proposal acceptance

1. Client accepts → proposal accepted, others rejected, job `in_progress`, contract created, notifications queued.
2. `proposal.service.acceptProposal`.
3. Core marketplace moment.
4. Mistake: Creating contracts from the frontend only.
5. Q: Can a freelancer accept their own proposal?
6. A: No — role and job ownership checks forbid it.

### Milestones

1. State machine; approve ≠ payment.
2. Contract UI copy and API messages say work accepted, not paid.
3. Sets correct product expectations.
4. Mistake: Auto-approving on file upload.
5. Q: Who can submit deliverables?
6. A: Assigned freelancer on active contract; uploads associated after ownership checks.

### Notifications vs sockets

1. Persist notification; emit if online.
2. `notification.service` + `realtime/socket.ts`.
3. Offline users still see history via REST.
4. Mistake: Toast-only “notifications.”
5. Q: Can a client join another user’s room?
6. A: No — server joins `user:{verifiedId}` from JWT only.

### Email outbox

1. Queue after success; worker leases jobs; retries with backoff.
2. `email-outbox.service`.
3. API stays up when SMTP is down.
4. Mistake: Marking sent before transport accepts.
5. Q: Stuck `processing`?
6. A: Lease expiry allows reclaim after crash.

### Private uploads

1. Metadata in Mongo; bytes in storage; ACL on read.
2. `upload.service.authorizeAndReadUpload`.
3. Prevents IDOR via guessing ids.
4. Mistake: Public `/uploads` static hosting for deliverables.
5. Q: Are avatars public?
6. A: Yes by purpose/visibility — portfolio/avatar; job/milestone files are private.

### Admin moderation

1. Lifecycle status ≠ moderationStatus; audit log on actions.
2. Admin jobs/users/reports modules.
3. Hide from discovery without inventing fake job statuses.
4. Mistake: Deleting jobs to “moderate.”
5. Q: Does hiding break the owner’s view?
6. A: Owner/admin can still fetch; public list filters `visible` + `open`.

---

## Quick practice prompts

- Walk me through accepting a proposal from Network tab to MongoDB.
- How would you add payments without breaking milestone semantics?
- What breaks if we run two API instances today?
- How do you demo this in six minutes?

Answers: use [demo-script.md](./demo-script.md) and [architecture.md](./architecture.md).
