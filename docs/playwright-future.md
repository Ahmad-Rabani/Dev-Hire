# Browser E2E (Playwright) — deferred

Phase 9 evaluated adding Playwright smoke tests. They were **not** added to the repository in this pass because:

1. Critical journeys are already covered by Vitest/Supertest API tests (`journey.test.ts` and module suites).
2. Playwright needs a long-lived MongoDB, seeded users, and both servers running — a second toolchain to maintain for a portfolio monorepo.
3. Fabricating green browser results without running Playwright would violate project honesty rules.

## Suggested later smoke suite (when you add it)

- Open `/` → 200
- Login as `demo-client@devhire.demo` → land on `/client/dashboard`
- Client can open `/client/jobs/new`
- Guest cannot open `/admin` (redirect/login)
- Freelancer cannot accept a proposal via UI (button absent / API 403)

Install sketch (do not treat as done):

```bash
cd frontend
npm init playwright@latest
# configure webServer for next + document backend dependency
```

Keep Vitest as the default `npm test` until Playwright is green in CI with service containers.
