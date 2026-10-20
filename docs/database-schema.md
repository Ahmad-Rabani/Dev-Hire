# Database Schema

## Collections

### users (Phase 2)

| Field | Notes |
|-------|-------|
| name, email | Email unique + lowercase |
| passwordHash | `select: false` — never returned in API |
| role | `client` \| `freelancer` \| `admin` |
| status | `active` \| `suspended` |
| emailVerified | Boolean |
| emailVerificationTokenHash / Expires | Hashed opaque tokens |
| passwordResetTokenHash / Expires | Hashed opaque tokens |
| bio, avatarUrl | Common profile |
| professionalTitle, about, skills, hourlyRate, availability, portfolio | Freelancer fields |
| averageRating, completedContracts | Server-maintained (not user-writable) |
| timestamps | createdAt / updatedAt |

**Indexes:** unique email; `{ role, status }`; skills; text on name/title/about.

### refreshsessions (Phase 2)

| Field | Notes |
|-------|-------|
| user | ObjectId ref |
| tokenHash | SHA-256 of refresh JWT (unique) |
| expiresAt | TTL index |
| revokedAt | Set on logout/rotation/reuse response |
| replacedBy | Points to successor session after rotation |
| userAgent, ip | Optional audit metadata |

### jobs (Phase 3)

| Field | Notes |
|-------|-------|
| title, description | Required, length-limited |
| skills | 1–20 strings |
| budgetType | `fixed` \| `hourly` |
| budgetMin, budgetMax | Numbers; min ≤ max |
| currency | Default `USD` |
| deadline | Future date on create/update |
| status | Lifecycle: `draft` \| `open` \| `paused` \| `in_progress` \| `closed` \| `cancelled` |
| moderationStatus | `visible` (default) \| `hidden` \| `removed` — independent of lifecycle |
| moderationReason / moderatedAt / moderatedBy | Set by admin moderation |
| client | ObjectId → User (set from auth, never from body) |
| timestamps | createdAt / updatedAt |

**Indexes and why**

| Index | Purpose | Trade-off |
|-------|---------|-----------|
| `{ status: 1, createdAt: -1 }` | Public open-job feed newest-first | Extra write cost on status/date changes |
| `{ client: 1, status: 1, createdAt: -1 }` | Client dashboard filtered lists | Compound size grows with jobs per client |
| `{ status: 1, budgetMin: 1, budgetMax: 1 }` | Budget range filters on public lists | Helps overlap queries; not perfect for all ranges |
| `{ status: 1, deadline: 1 }` | Deadline sort/filter | Useful for “ending soon” sorts |
| text on `title`, `description` | Reserved for future text-rank search | Current search uses validated regex `$or` (Atlas Search can replace later) |

### proposals (Phase 4)

| Field | Notes |
|-------|-------|
| job, freelancer | ObjectId refs |
| coverLetter, bidAmount, deliveryDays | Validated |
| status | `pending` \| `accepted` \| `rejected` \| `withdrawn` |

**Indexes:** unique `{ job, freelancer }`; partial unique `{ job }` where `status: accepted`; freelancer/date and job/status lists.

### contracts (Phase 4 create + Phase 5 lifecycle)

| Field | Notes |
|-------|-------|
| job, client, freelancer, proposal | Refs; unique `job`, unique `proposal` |
| amount | From accepted bid |
| pricingType | Copied from job `budgetType` (`fixed` \| `hourly`) on hire |
| status | `active` \| `completed` \| `cancelled` |
| startDate / completedAt / cancelledAt / cancelReason | Lifecycle timestamps |
| milestones[] | Embedded subdocuments (see below) |

**Embedded milestones**

| Field | Notes |
|-------|-------|
| title, description, amount, dueDate | Planning fields (client-owned while `pending`) |
| status | `pending` → `submitted` ⇄ `revision_requested` → `approved` |
| submissionNotes, deliverableUrl, submittedAt | Freelancer submission |
| revisionFeedback, revisionRequestedAt | Client revision request |
| approvedAt | Client approval timestamp |

**Milestone amount rules**

- **Fixed-price:** sum of milestone amounts must not exceed `contract.amount`; must **equal** `contract.amount` before completion.
- **Hourly:** amounts are planning/tracking only — not treated as a fixed budget.

**Progress:** `approvedMilestones / totalMilestones` (0% when empty; never auto-completes).

**Indexes:** unique job; unique proposal; `{ client, status, createdAt }`; `{ freelancer, status, createdAt }`.

### reviews (Phase 5)

| Field | Notes |
|-------|-------|
| contract, reviewer, reviewee | ObjectId refs |
| rating | Integer 1–5 |
| comment | 10–2000 chars |
| timestamps | createdAt / updatedAt |

**Indexes:** unique `{ contract, reviewer }` (one review per person per contract; both parties may review); `{ reviewee, createdAt }` for public profile lists.

**Rating aggregation:** after each review create, `User.averageRating` for the reviewee is recalculated with `$avg` over Review documents (not client-writable). `completedContracts` increments on contract completion for both parties.

### reports (Phase 6)

| Field | Notes |
|-------|-------|
| reporter | Authenticated user |
| targetType | `job` \| `user` \| `review` |
| targetId | ObjectId of target |
| category | `spam` \| `harassment` \| `inappropriate` \| `scam` \| `other` |
| explanation | 10–2000 chars |
| status | `open` \| `under_review` \| `resolved` \| `dismissed` |
| resolutionNote / resolvedBy / resolvedAt | Admin resolution |

**Indexes:** status+date; target; partial unique open/under_review per reporter+target.

### auditlogs (Phase 6)

| Field | Notes |
|-------|-------|
| actor | Admin user ObjectId |
| action | e.g. `user.suspended`, `job.hidden`, `report.resolved` |
| targetType / targetId | `user` \| `job` \| `report` |
| reason / summary | Safe short text — no secrets |
| timestamps | Server-generated |

Audit logging starts when Phase 6 is deployed; historical actions before that are not reconstructed.

### notifications (Phase 7)

| Field | Notes |
|-------|-------|
| recipient | User who owns the notification (always scoped in queries) |
| actor | Optional user who caused the event |
| type | Controlled enum (`proposal.submitted`, `milestone.approved`, …) |
| title / message | Short display text |
| resourceType / resourceId | Optional navigation target (`job`, `proposal`, `contract`, `milestone`, `review`) |
| readAt | `null` until marked read |
| dedupeKey | Unique sparse — prevents duplicate event noise |
| timestamps | createdAt / updatedAt |

**Indexes:** `{ recipient, createdAt: -1 }` (newest-first lists); `{ recipient, readAt, createdAt }` (unread filters); unique sparse `dedupeKey`.

### uploads (Phase 7)

| Field | Notes |
|-------|-------|
| owner | Uploader user id |
| purpose | `avatar` \| `portfolio` \| `job_attachment` \| `milestone_deliverable` |
| visibility | Derived from purpose (`public` for avatar/portfolio; `private` otherwise) |
| storageKey | Server-generated opaque key (not a client path) |
| originalName / mimeType / size | Sanitized metadata |
| resourceType / resourceId | Optional association after ownership checks |

Files live under `UPLOAD_DIR` (gitignored). Binary content is **not** embedded in User/Job/Contract documents — only ObjectId references (`attachmentUploadIds`, `deliverableUploadIds`, `avatarUrl`).

### emailoutboxes (Phase 7)

| Field | Notes |
|-------|-------|
| to / subject / text / html | Outbound message (no secrets in logs) |
| status | `pending` \| `processing` \| `sent` \| `failed` |
| attempts / maxAttempts / scheduledAt | Bounded retry with backoff |
| dedupeKey | Unique sparse — worker-safe idempotency |

## Relationships

```text
User (client) ──< Job
Job ──< Proposal >── User (freelancer)
Proposal (accepted) ── 1 Contract
Contract ──< embedded Milestone
Contract ──< Review >── User (reviewer / reviewee)
User ──< RefreshSession
User ──< Notification
User ──< Upload
Job.attachmentUploadIds → Upload
Milestone.deliverableUploadIds → Upload
```

## Seed / admin

```bash
cd backend
npm run create-admin -- --email admin@devhire.local --password 'AdminPass1' --name 'Platform Admin'
```

Never commit real production passwords.
