# DevHire Frontend

Next.js (App Router) client for the DevHire freelance marketplace.

## Setup

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001). The home page calls `GET /api/v1/health` on the backend — start the API first.

Dev server uses port **3001** (`next dev -p 3001`) to avoid clashes with other local apps on 3000.

## Stack

- Next.js + React + TypeScript
- Tailwind CSS (layout / branding)
- Ant Design (reusable UI)
- TanStack Query (server state)
- Axios (HTTP client)
- React Hook Form + Zod (forms — Phase 2+)
- Zustand (UI state when needed)
- Socket.IO client (Phase 7)

## Folder guide

| Path | Role |
|------|------|
| `app/` | Routes and layouts |
| `features/` | Feature-specific UI (e.g. health card) |
| `components/` | Shared layout / providers / UI |
| `services/` | API call functions |
| `lib/` | Clients, env, query factory |
| `types/` | Shared TypeScript types |
| `hooks/`, `stores/`, `utils/` | Filled as features need them |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Serve production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Phase 1

Working pieces: root layout, providers (Query + Ant Design), Axios client, health status card on the landing page.

Auth pages and dashboards start in Phase 2.
