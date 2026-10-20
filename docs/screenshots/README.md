# Screenshot checklist

No binary screenshots are committed in this folder yet. Capture them locally for your portfolio site or README gallery. **Do not** commit secrets, real emails of real people, tokens, or private deliverable contents.

Suggested filename prefix: `docs/screenshots/`.

| File suggestion | Route | Role | What should be visible |
|-----------------|-------|------|-------------------------|
| `01-landing.png` | `/` | Guest | Brand + entry CTAs |
| `02-jobs-board.png` | `/jobs` | Guest | Filters + job cards |
| `03-job-detail.png` | `/jobs/[id]` | Freelancer logged in | Description + proposal UI |
| `04-freelancer-profile.png` | `/freelancers/[id]` | Guest | Skills + ratings if any |
| `05-client-dashboard.png` | `/client/dashboard` | Client | Real stats (not empty zeros only) |
| `06-freelancer-dashboard.png` | `/freelancer/dashboard` | Freelancer | Proposals/contracts summary |
| `07-proposals.png` | `/client/jobs/[id]/proposals` | Client | Pending proposal + Accept |
| `08-contract.png` | `/contracts/[id]` | Either party | Milestones + statuses |
| `09-notifications.png` | `/notifications` | Authenticated | List with read/unread |
| `10-admin-dashboard.png` | `/admin` | Admin | Platform aggregations |
| `11-admin-moderation.png` | `/admin/jobs` or `/admin/reports` | Admin | Moderation or report queue |

## How to capture

1. `npm run seed:demo` + create admin.
2. Start backend and frontend.
3. Use a clean browser profile; zoom 100%; hide personal bookmarks.
4. Prefer 1440×900 or 1280×720 windows.
5. Redact any accidental personal data before publishing.

## Status

Screenshots in this repository: **not captured by the Phase 9 automation** (no browser capture run claimed). Add files here when you take them.
