# E2E domain coverage

Which Playwright domain(s) (`animals`, `animals-admin`, `ins`, `plants` — the
`PROJECT_NAMES` in `trade-imports-ins-tests`) each service's PR-triggered E2E
check runs. Each service's own `.github/workflows/e2e-tests.yml` sets this via
the `project:` input it passes to the shared reusable workflow
(`.github/workflows/e2e-tests.yml` in this repo).

| Service | `project` | Why |
|---|---|---|
| address-book | `ins,animals` | Its specs live under `tests/animals/.../address-book/` and `tests/ins/security/address-book/`. |
| animals-admin | `animals,animals-admin` | Admin operates directly on live-animals notifications — coupled both ways. |
| animals-backend | `ins,animals,animals-admin` | Feeds the live-animals journey, admin's operator actions, and ins-backend's cross-journey aggregate. Not `plants` — separate backend. |
| animals-frontend | `animals,animals-admin` | Mirrors animals-admin. Not `ins` — a frontend-only change is unlikely to break the aggregate read model. |
| ins-backend | `ins` | Pure cross-journey aggregator — a regression surfaces in the `ins` dashboard suite, not the originating journeys' own suites. |
| ins-frontend | `ins` | Its own dedicated frontend. |
| plants-backend | `ins,plants` | Symmetric to animals-backend; no plants-admin project exists. |
| plants-frontend | `plants` | Its own dedicated frontend. |
| dynamics-gateway | *(empty — every domain)* | Shared cross-cutting event router, unpredictable blast radius. |
| defra-id-stub | *(empty — every domain)* | Cross-cutting sign-in stub used by every journey's auth. |
| reference-data | *(empty — every domain)* | Shared reference data, consumed broadly. |
| stub | *(empty — every domain)* | Stub of upstream services, broadly consumed. |

Update this table whenever a service's `project:` value changes, or a new
service repo gets its own E2E check.
