# DevHire — CV and portfolio blurbs

Use only claims you can demo from this repository.

## One-line description

Full-stack freelance marketplace (Next.js, Express, MongoDB) with hiring workflows, contracts, reviews, admin moderation, notifications, and secure uploads.

## Project-card summary (~50 words)

DevHire is an independent marketplace app where clients hire freelancers through proposals and manage milestones and reviews. I implemented JWT auth with refresh rotation, role-based APIs, MongoDB uniqueness for safe hiring, dashboards via aggregation, Socket.IO notifications, an email outbox, and upload ACLs — plus Vitest/Supertest coverage and CI.

## GitHub repository description (≤350 chars)

Freelance marketplace monorepo: Next.js + Express + MongoDB. Features auth, jobs, proposals, contracts/milestones, reviews, admin moderation, notifications/Socket.IO, email outbox, and secure uploads. Includes tests, CI, and interview/demo docs. Local demo seed included; live SMTP/S3 need your credentials.

## CV bullet options (pick 4–6)

- Designed and implemented a full-stack freelance marketplace with separate Next.js and Express apps communicating over REST and Socket.IO.
- Built JWT access tokens with HttpOnly refresh-token rotation, reuse detection, and server-side suspension enforcement.
- Enforced marketplace invariants with Mongoose unique indexes (one proposal per freelancer/job, one hire per job, one review per reviewer/contract).
- Implemented proposal acceptance and contract/milestone state machines with authorization checks on every mutating API.
- Added MongoDB aggregation dashboards for client, freelancer, and admin roles.
- Built persistent notifications with Socket.IO private rooms and an email outbox with lease-based retries.
- Implemented secure file uploads with magic-byte validation and private-file ACL for milestone deliverables.
- Wrote Vitest/Supertest API journey tests and configured GitHub Actions CI for lint, typecheck, test, and build.

## Spoken intro (~30 seconds)

“I built DevHire, a freelance marketplace where clients post jobs and hire freelancers into contracts with milestones and reviews. I cared most about backend authorization and MongoDB constraints so double-hire races and fake ownership cannot slip through the UI. I can walk you through accepting a proposal and show the indexes and notifications that follow.”

## Longer technical follow-up (~90 seconds)

“The frontend is Next.js App Router with TanStack Query and Zod forms. The API is Express modules — routes, Zod validation, services, Mongoose models. Auth uses short JWTs plus rotating refresh cookies; production cookie POSTs check Origin. Hiring uses conditional updates and unique indexes, with transactions when MongoDB supports them. Side effects after success write notifications and email outbox rows so SMTP failures do not roll back a hire. Uploads store metadata and enforce ACL on download. I have not claimed a live production deploy or verified real SMTP/S3 without credentials; local disk and optional SMTP blank mode are intentional for development.”

## What not to say

- Do not invent user counts, revenue, or performance percentages.
- Do not say “I deployed this to production” unless you personally did.
- Do not say “malware-proof uploads” or “fully Playwright-tested.”
- Do not present DevHire as a funded commercial product.
