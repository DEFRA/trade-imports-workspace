# Per-repo notes

Start with [`architecture-overview.md`](architecture-overview.md): how the
services connect, who owns which data, and the event flow from the animals
backend out to the gateway and INS.

Then one page per sub-repo: purpose, responsibilities, integrations, stack,
infrastructure dependencies, and how to run it standalone. Files are named after
the GitHub repo, not the role — the workspace has more than one frontend, so
`frontend.md` was ambiguous.

The **authoritative repo map** — every repo the workspace aggregates, its role
and its stack — lives in the root [`CLAUDE.md`](../../CLAUDE.md).

| Repo | Notes |
|---|---|
| `trade-imports-animals-frontend` | [trade-imports-animals-frontend.md](trade-imports-animals-frontend.md) |
| `trade-imports-animals-backend` | [trade-imports-animals-backend.md](trade-imports-animals-backend.md) |
| `trade-imports-animals-admin` | [trade-imports-animals-admin.md](trade-imports-animals-admin.md) |
| `trade-imports-animals-tests` | [trade-imports-animals-tests.md](trade-imports-animals-tests.md) |
| `trade-imports-stub` | [trade-imports-stub.md](trade-imports-stub.md) |
| `trade-imports-reference-data` | [trade-imports-reference-data.md](trade-imports-reference-data.md) |
| `trade-imports-defra-id-stub` | [trade-imports-defra-id-stub.md](trade-imports-defra-id-stub.md) |
| `trade-imports-dynamics-gateway` | [trade-imports-dynamics-gateway.md](trade-imports-dynamics-gateway.md) |
| `trade-imports-address-book` | [trade-imports-address-book.md](trade-imports-address-book.md) |
| `trade-imports-ins-frontend` | [trade-imports-ins-frontend.md](trade-imports-ins-frontend.md) |
| `trade-imports-ins-backend` | [trade-imports-ins-backend.md](trade-imports-ins-backend.md) |
| `trade-imports-plants-frontend` | [trade-imports-plants-frontend.md](trade-imports-plants-frontend.md) |
| `trade-imports-plants-prototype` | [trade-imports-plants-prototype.md](trade-imports-plants-prototype.md) |
| `trade-imports-plants-backend` | [trade-imports-plants-backend.md](trade-imports-plants-backend.md) |
| `trade-imports-schemas` | [trade-imports-schemas.md](trade-imports-schemas.md) |

The four animals pages predate the Responsibilities and Integrations sections the
newer pages have. Add them when next touching those files. New repo pages copy
the shape of an existing file and are named `<repo-name>.md`.

Related: [`../local-setup.md`](../local-setup.md) for running the whole stack
locally, [`../team-workflow.md`](../team-workflow.md) for the ticket lifecycle.
