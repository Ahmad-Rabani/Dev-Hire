# API Reference

Base URL (local): `http://localhost:5000/api/v1`

## Response conventions

**Success**

```json
{
  "success": true,
  "message": "Optional human-readable message",
  "data": {}
}
```

**Error**

```json
{
  "success": false,
  "message": "Human-readable error",
  "errors": [{ "field": "email", "message": "Invalid email" }]
}
```

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Liveness + MongoDB connection status |

## Authentication

Refresh tokens are set as HttpOnly cookie `devhire_refresh` (path `/api/v1/auth`). Access tokens are returned in JSON and sent as `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/auth/register` | No | Register client or freelancer |
| `POST` | `/auth/login` | No | Login |
| `POST` | `/auth/refresh` | Cookie | Rotate refresh session; return new access token |
| `POST` | `/auth/logout` | Cookie | Revoke refresh session; clear cookie |
| `GET` | `/auth/me` | Bearer | Current user |
| `POST` | `/auth/verify-email` | No | `{ "token": "..." }` |
| `POST` | `/auth/forgot-password` | No | Always returns generic success message |
| `POST` | `/auth/reset-password` | No | `{ "token", "password" }` — revokes all sessions |

### Register body

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "password": "Password1",
  "role": "client",
  "acceptTerms": true
}
```

`role` must be `client` or `freelancer`. Admin registration is rejected.

### Login body

```json
{
  "email": "ada@example.com",
  "password": "Password1"
}
```

## Users & freelancers

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/users/me` | Bearer | Own profile + completion % |
| `PATCH` | `/users/me` | Bearer | Update permitted fields only (strict schema) |
| `GET` | `/freelancers` | No | Public list (`q`, `skill`, `page`, `limit`) |
| `GET` | `/freelancers/:id` | No | Public profile (no email/status) |

Protected fields such as `role`, `status`, `emailVerified`, `averageRating`, and `completedContracts` cannot be patched by the client.

## Jobs (Phase 3)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/jobs` | Client | Create job (ownership from auth user) |
| `GET` | `/jobs` | No | Public open jobs — search/filter/sort/paginate |
| `GET` | `/jobs/mine` | Client | Owner's jobs (any status) |
| `GET` | `/jobs/:id` | Optional | Public if `open`; owner can view private states |
| `PATCH` | `/jobs/:id` | Owner client | Update content fields (not status) |
| `POST` | `/jobs/:id/status` | Owner client | Allowed transitions only |
| `DELETE` | `/jobs/:id` | Owner client | Only `draft` or `cancelled` |

### Create body example

```json
{
  "title": "Build a React dashboard",
  "description": "Need charts, auth-ready layout, and responsive tables.",
  "skills": ["React", "TypeScript"],
  "budgetType": "fixed",
  "budgetMin": 500,
  "budgetMax": 1500,
  "currency": "USD",
  "deadline": "2026-12-01T00:00:00.000Z",
  "status": "open"
}
```

### List query parameters

| Param | Notes |
|-------|-------|
| `search` | Case-insensitive match on title, description, or skills (max 100 chars) |
| `budgetType` | `fixed` \| `hourly` |
| `minBudget` / `maxBudget` | Range overlap filter |
| `skills` | Comma-separated; matches **any** skill (`$in`) |
| `status` | Owner listings only (`/jobs/mine`). Public list always forces `open`. |
| `sortBy` | `createdAt` \| `deadline` \| `budgetMin` \| `title` |
| `sortOrder` | `asc` \| `desc` (default `desc`) |
| `page` / `limit` | Default page 1, limit 10, max limit 50 |

### Status transitions

`draft → open|cancelled` · `open → paused|closed|cancelled` · `paused → open|closed|cancelled` · `closed`/`cancelled` terminal.

### List response shape

```json
{
  "success": true,
  "data": {
    "jobs": [],
    "pagination": {
      "page": 1,
      "limit": 10,
      "totalItems": 0,
      "totalPages": 0,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

## Postman / manual testing

### Auth (Phase 2)

1. `POST /auth/register` — copy `accessToken`; note `Set-Cookie`.
2. `GET /auth/me` with `Authorization: Bearer <accessToken>`.
3. `POST /auth/refresh` with cookie jar enabled.
4. `POST /auth/logout` then confirm refresh fails.

### Jobs (Phase 3)

1. Register/login as **client**.
2. `POST /jobs` with the create body above.
3. `GET /jobs` — confirm the open job appears; try `?search=React&sortBy=budgetMin&sortOrder=asc&page=1&limit=2`.
4. `GET /jobs/mine` with Bearer token.
5. `POST /jobs/:id/status` with `{ "status": "paused" }`.
6. As another client, `PATCH /jobs/:id` → expect **403**.
7. As freelancer, `POST /jobs` → expect **403**.

## CSRF note

Refresh cookies use `SameSite=Lax` in development and `SameSite=None; Secure` in production, scoped to `/api/v1/auth`. Cross-site form CSRF against cookie-authenticated refresh is mitigated by SameSite; production should still use HTTPS and a strict CORS allow-list.
