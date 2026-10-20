# DevHire deployment guide

This guide prepares DevHire for production. **Do not deploy until secrets, storage, and MongoDB are configured.** Phase 8 documents readiness; it does not run deployment commands for you.

## Required infrastructure

| Component | Recommendation |
|-----------|----------------|
| Frontend | Node host or Vercel (Next.js 16) |
| Backend | Long-lived Node process (Render, Railway, Fly, VM) — **not** ephemeral serverless for Socket.IO + outbox |
| Database | MongoDB Atlas (replica set — required for multi-document transactions) |
| Object storage | S3-compatible bucket (`STORAGE_DRIVER=s3`) |
| Email | SMTP provider (SendGrid, SES, Mailgun, …) |
| Optional | Redis only if you run **multiple** API instances and need Socket.IO pub/sub |

## Architecture constraints

1. **Single API instance (default):** Socket.IO works in-memory; set `EMAIL_WORKER_MODE=inline`.
2. **Multiple API instances:** You need sticky sessions **or** a Socket.IO Redis adapter (`REDIS_URL` — wire before enabling). Prefer one email poller: `EMAIL_WORKER_MODE=external` + one `npm run worker:email` process.
3. **Uploads:** Never rely on the container filesystem in production. Use `STORAGE_DRIVER=s3`.
4. **Cookies:** Production uses `Secure` + `SameSite=None`. Cookie POSTs (`/auth/refresh`, `/auth/logout`) require a matching `Origin`/`Referer` (`FRONTEND_ORIGIN`).

## Environment variables

Copy `backend/.env.example` and `frontend/.env.example`. Never commit real values.

### Backend (critical)

- `NODE_ENV=production`
- `MONGODB_URI` — Atlas connection string
- `FRONTEND_ORIGIN` — exact SPA origin, e.g. `https://app.example.com`
- `PUBLIC_API_URL` — public API origin, e.g. `https://api.example.com`
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — random ≥32 chars (startup fails on weak defaults)
- `COOKIE_SECURE=true` (or rely on production auto-Secure)
- SMTP fields when sending mail
- `EMAIL_WORKER_MODE=inline` **or** `external`
- `STORAGE_DRIVER=s3` + `S3_*` credentials

### Frontend

- `NEXT_PUBLIC_API_URL=https://api.example.com/api/v1`
- `NEXT_PUBLIC_SOCKET_URL=https://api.example.com`

Browser-exposed `NEXT_PUBLIC_*` values are not secrets.

## Build and start

```bash
# Backend
cd backend
npm ci
npm run build
npm start

# Optional dedicated email worker (when EMAIL_WORKER_MODE=external)
npm run worker:email

# Frontend
cd frontend
npm ci
npm run build
npm start
# or deploy .next to Vercel
```

## HTTPS and CORS

- Terminate TLS at the load balancer / platform.
- Set `FRONTEND_ORIGIN` to the exact browser origin (scheme + host + port if any).
- Backend `trust proxy` is enabled for correct Secure cookies behind proxies.

## MongoDB

1. Create an Atlas cluster with a **replica set** (transactions for hire/complete flows).
2. Restrict network access to the API host.
3. Indexes are declared in Mongoose schemas and created on first use; verify with Atlas Performance Advisor after load.
4. Backups: enable Atlas continuous backup; test restore quarterly.

## Object storage

1. Create a private bucket (block public ACLs).
2. Create an IAM user/key with least privilege (`s3:PutObject`, `GetObject`, `DeleteObject` on that bucket).
3. Set `STORAGE_DRIVER=s3`, `S3_BUCKET`, region, keys; set `S3_ENDPOINT` + `S3_FORCE_PATH_STYLE=true` for MinIO/R2-style endpoints.
4. Files remain private in the bucket; clients always download through `GET /api/v1/uploads/:id/content` after ACL checks.

**Unverified without your credentials:** real S3 round-trips. The adapter is implemented and selected by env; local tests use `STORAGE_DRIVER=local`.

## Health checks

- Liveness: `GET /api/v1/health` — returns status + DB readyState; **no secrets**.
- Do not expose admin dashboards without auth.

## Post-deployment smoke tests

1. Register client + freelancer; login; refresh page (session restore).
2. Create/publish job; search; apply; accept → one contract.
3. Milestone submit → approve → complete → reviews.
4. Suspend a user; confirm 403 on protected routes.
5. Upload avatar; confirm private deliverable 403 for strangers.
6. With SMTP configured, submit a proposal and confirm outbox → inbox (or provider dashboard).

## Rollback

1. Redeploy the previous known-good image/commit for frontend and backend.
2. Do not run destructive DB migrations as part of DevHire releases (schema is additive Mongoose).
3. If a bad email worker is looping, set `EMAIL_WORKER_MODE=off` temporarily and inspect `emailoutboxes`.

## Backup and recovery checklist

- [ ] Atlas backup enabled
- [ ] Document restore steps for the team
- [ ] Object-storage versioning or cross-region replication (optional)
- [ ] Secrets stored in the host’s secret manager (not git)
- [ ] Incident contacts for SMTP / DNS / TLS

## Known limitations (honest)

- No malware scanning on uploads
- Socket.IO Redis adapter is documented but not enabled until `REDIS_URL` is wired for multi-instance
- Auth verification emails send via direct SMTP (not outbox); transactional marketplace emails use the outbox
- Successful SMTP acceptance ≠ guaranteed inbox delivery
