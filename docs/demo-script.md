# DevHire demo script (5–8 minutes)

Use a **dedicated development database**. Run `npm run seed:demo` and `npm run create-admin` first. Do not use production data.

## Opening (45 seconds)

> “DevHire is a freelance marketplace I built end to end. Clients post jobs, freelancers propose, hiring creates a contract with milestones, and both sides leave reviews. The interesting part is not the screens alone — it is that ownership, uniqueness, and state transitions are enforced on the Express API and in MongoDB indexes.”

Roles: **client**, **freelancer**, **admin**.

## Frontend tour (90 seconds)

| Step | Route | What to say |
|------|-------|-------------|
| 1 | `/` | Landing / entry into the product |
| 2 | `/jobs` | Public discovery: search, filters, sort, pagination |
| 3 | `/jobs/[id]` | Job detail + proposal panel for freelancers |
| 4 | `/freelancers` → `/freelancers/[id]` | Public profiles and ratings when reviews exist |
| 5 | Login as demo client → `/client/dashboard` | Aggregated stats from MongoDB, not hard-coded cards |
| 6 | Login as demo freelancer → `/freelancer/dashboard` | Role-appropriate navigation |

## Business workflow (3–4 minutes)

Use seeded accounts:

- Client: `demo-client@devhire.demo` / `DemoPass1!`
- Freelancer: `demo-freelancer@devhire.demo` / `DemoPass1!`

1. **Client** opens `/client/jobs` → seeded open job (or `/client/jobs/new` to create one).
2. **Freelancer** opens `/jobs` → job detail → submit proposal (or show pending proposal from seed).
3. **Client** opens `/client/jobs/[id]/proposals` → **Accept**.
4. Show `/contracts/[id]` — contract created; job moves to `in_progress`.
5. Client adds a milestone; freelancer **Submit work**; client **Request revision** or **Approve**.
6. When milestones allow, client **Complete** contract.
7. Both leave reviews; show `/freelancer/dashboard` or public profile rating update.
8. Open `/notifications` (or bell) — acceptance / milestone events persisted even if the socket was offline.

**If SMTP is unset:** registration still works; verification email is not “delivered” — say that honestly.

**If you skip live hiring:** say “acceptance is covered by API tests that assert one contract and rejected competitors.”

## Engineering deep-dive (60–90 seconds)

Pick **one** path and narrate it:

1. Browser Network tab: `POST /api/v1/proposals/:id/accept` with `Authorization: Bearer …`.
2. Backend: `authenticate` → client role → ownership check → service orchestration.
3. MongoDB: unique indexes stop double-accept; optional transaction when replica set available.
4. Side effects after success: `notifications` document + Socket.IO room `user:{id}` + email outbox row.
5. Optional: `GET /api/v1/uploads/:id/content` as another user → **403** for private deliverables.

## Administration (45 seconds)

1. Log in as admin (from `create-admin`).
2. `/admin` dashboard aggregations.
3. `/admin/jobs` — hide a job; confirm it disappears from public `/jobs`.
4. `/admin/users` — suspend a test user; refresh → protected actions fail.
5. `/admin/reports` + `/admin/audit-logs` — moderation leaves an audit trail.

## Closing (30 seconds)

> “The stack is Next.js + Express + MongoDB with JWT refresh cookies, TanStack Query, Zod validation, Socket.IO notifications, and an email outbox. Limitations I am upfront about: live SMTP and S3 need real credentials, there is no malware scanning, Socket.IO is single-instance by default, and browser Playwright E2E is not in the repo yet — journeys are covered with Vitest/Supertest.”

## Demo checklist

- [ ] MongoDB running; backend + frontend `npm run dev`
- [ ] `npm run seed:demo`
- [ ] Admin created
- [ ] Two browser profiles or private windows (client vs freelancer)
- [ ] Know which features need SMTP/S3 (usually skip live email/S3 in interview)
