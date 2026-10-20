# DevHire Backend

Express + TypeScript API for the DevHire freelance marketplace (Phases 1–8).

## Setup

```bash
cp .env.example .env
npm install
```

Ensure MongoDB is running, or set `MONGODB_URI` to an Atlas connection string.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | API + Socket.IO + inline email worker |
| `npm run worker:email` | Dedicated outbox worker (`EMAIL_WORKER_MODE=external`) |
| `npm run build` | Compile to `dist/` |
| `npm start` | Run compiled `dist/server.js` |
| `npm run typecheck` | TypeScript check only |
| `npm run lint` | ESLint (flat config) |
| `npm test` | Vitest + Supertest |
| `npm run create-admin` | Provision an admin account |

## Health

```bash
curl http://localhost:5000/api/v1/health
```

## Production notes

See [docs/deployment.md](../docs/deployment.md).

- Production rejects weak JWT secret defaults at startup.
- Prefer `STORAGE_DRIVER=s3` for durable uploads.
- Prefer one email poller (`EMAIL_WORKER_MODE=inline` **or** external worker).
- Cookie refresh/logout require a trusted `Origin` matching `FRONTEND_ORIGIN`.
