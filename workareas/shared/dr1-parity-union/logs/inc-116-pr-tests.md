## What changed

The frontend renames the private transporter's contact field from "Telephone number" to "Phone number" (Design release 1 wording). This PR follows that rename so the E2E label lookups keep resolving.

- `page-objects/notification/private-transporter-page.ts` — fill by the "Phone number" label.
- `tests/e2e/features/private-transporter-scope.spec.ts` — the same rename in the inline form fill.

No behaviour change beyond the label the specs look for.

## Increment and ticket

- Increment: `inc-116`
- Ticket: EUDPA-567

## Sibling repo and merge order

The label itself changes in `DEFRA/trade-imports-animals-frontend` (PR [#315](https://github.com/DEFRA/trade-imports-animals-frontend/pull/315)). Merge order is **this tests PR first, then the frontend**: CDP runs this suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by specs still looking for "Telephone number" and CDP would go red. Both PRs must be green — and approved — before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_012xqu2H1rUknc5TnVCTmbFo
