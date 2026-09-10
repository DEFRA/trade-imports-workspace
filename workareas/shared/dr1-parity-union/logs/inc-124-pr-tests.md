## What this changes

Increment **inc-124**, ticket **EUDPA-558** — the tests-repo half of a parity fix against Design release 1.

The frontend's transporter type page is being brought into line with Design release 1: the `h1` becomes "Choose a transporter type" (the question itself drops to a visually hidden legend), the Private radio is relabelled "Private transporter", and the private transporter form is headed "Add private transporter" instead of "Private transporter details". This PR updates the E2E suite to follow those renames.

- `page-objects/notification/transporter-add-page.ts` — follows the new heading and maps the `Commercial` / `Private` keys to their rendered labels, so no call site changes and the label match stays exact.
- `page-objects/notification/private-transporter-page.ts` — follows the renamed private form heading.
- `tests/e2e/features/commercial-transporter-scope.spec.ts` and `tests/e2e/features/private-transporter-scope.spec.ts` — the two remaining hardcoded heading literals now go through the page object rather than repeating the copy.

No behaviour change to the suite: same assertions, same coverage, following the new copy.

## Sibling PR and merge order

This is a cross-repo increment. The sibling PR is in **DEFRA/trade-imports-animals-frontend** on the same branch, carrying the copy and template changes.

**Merge order: this tests PR first, then the frontend PR.** CDP runs this suite against the deployed frontend, so a frontend merged ahead of its own test fixes would be exercised by stale specs and CDP would go red. Both PRs must be green before either merges.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
