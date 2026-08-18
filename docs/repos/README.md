# Per-repo notes

One page per sub-repo: purpose, stack, infrastructure dependencies, and how to
run it standalone. Files are named after the GitHub repo, not the role — the
workspace has more than one frontend, so `frontend.md` was ambiguous.

The **authoritative repo map** — every repo the workspace aggregates, its role
and its stack — lives in the root [`CLAUDE.md`](../../CLAUDE.md). This folder
only holds the longer per-repo write-ups, and not every repo has one yet.

| Repo | Notes |
|---|---|
| `trade-imports-animals-frontend` | [trade-imports-animals-frontend.md](trade-imports-animals-frontend.md) |
| `trade-imports-animals-backend` | [trade-imports-animals-backend.md](trade-imports-animals-backend.md) |
| `trade-imports-animals-admin` | [trade-imports-animals-admin.md](trade-imports-animals-admin.md) |
| `trade-imports-animals-tests` | [trade-imports-animals-tests.md](trade-imports-animals-tests.md) |

The remaining repos in the map have no page here yet. Add one by copying the
shape of an existing file and naming it `<repo-name>.md`.

Related: [`../local-setup.md`](../local-setup.md) for running the whole stack
locally, [`../team-workflow.md`](../team-workflow.md) for the ticket lifecycle.
