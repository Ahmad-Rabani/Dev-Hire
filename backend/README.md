# DevHire Backend

Express + TypeScript API for the DevHire freelance marketplace.

## Setup

```bash
cp .env.example .env
npm install
```

Ensure MongoDB is running locally, or set `MONGODB_URI` to an Atlas connection string.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start with hot reload (`tsx watch`) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled `dist/server.js` |
| `npm run typecheck` | TypeScript check only |
| `npm test` | Run Vitest (tests added in later phases) |

## Health check

```bash
curl http://localhost:5000/api/v1/health
```

## Structure

```text
src/
├── config/       # env + database
├── middleware/   # errors (auth/rate-limit later)
├── modules/      # domain modules (health, auth, jobs, …)
├── utils/        # logger, AppError, apiResponse, asyncHandler
├── app.ts        # Express app factory (no listen)
└── server.ts     # DB connect + HTTP listen
```

## Auth (Phase 2)

```bash
npm run create-admin -- --email admin@devhire.local --password 'AdminPass1'
```

Key routes: `/api/v1/auth/*`, `/api/v1/users/me`, `/api/v1/freelancers`.

Without SMTP, verification and password-reset tokens are printed in the backend console in non-production environments.

## Notes

- Email/SMTP and file uploads remain optional until later phases.
- Jobs, proposals, and contracts start in Phase 3+.
