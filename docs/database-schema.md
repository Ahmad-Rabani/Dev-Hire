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
| status | `draft` \| `open` \| `paused` \| `closed` \| `cancelled` |
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

## Relationships

```text
User (client) ──< Job
User ──< RefreshSession
```

Proposals / contracts arrive in Phase 4+.

## Seed / admin

```bash
cd backend
npm run create-admin -- --email admin@devhire.local --password 'AdminPass1' --name 'Platform Admin'
```

Never commit real production passwords.
