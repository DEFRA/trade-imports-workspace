## What broke

`feat/EUDPA-502-...` on the frontend (DEFRA/trade-imports-animals-frontend#272) takes
the identification page's primary button off its "Save and finish" override and back
onto the shared `saveActions` default, "Save and continue" — the wording every other
page in the journey already uses, and the wording Design release 1 ends this page on.

Every spec in this suite that drove that page still clicked a button named
"Save and finish", so all three E2E shards went red: shard 2 on
`tests/e2e/pages/animal-identification.spec.ts` failing to find the control at all,
and 19 further failures across shards 1, 2 and 3 as click timeouts downstream of the
same missing button (declaration, notification-dashboard, promoted-notification,
amend-resubmit, identifiers-cap, change-from-cya, hub-groups-and-cya-rows,
promoted-lifecycle, persistence, and the admin and INS specs that build a
notification through the shared journey flow).

## What changed

- `page-objects/notification/animal-identification-page.ts` — the locator is renamed
  `saveAndFinish` → `saveAndContinue` and targets "Save and continue", matching how
  every other page object in the suite names its primary button.
- The eight call sites follow the rename: `flows/journey.ts`, the two a11y journey
  specs, `tests/e2e/features/animal-identifiers-cap.spec.ts` and
  `tests/e2e/pages/animal-identification.spec.ts`.

No assertion changes. The button does what it always did — the controller has always
fallen through to `nextTarget` for this submit, so the flows that expect the overview
after the click still expect it.

## Verified

- `npm run typecheck` and `npm run lint` clean.
- Against the local docker-compose stack:
  `tests/e2e/pages/animal-identification.spec.ts` (3 passed),
  `tests/e2e/features/animal-identifiers-cap.spec.ts` and
  `tests/e2e/features/change-from-cya.spec.ts` (2 passed).

## Provenance

Increment inc-108 of the dr1 parity union backlog. Ticket EUDPA-502. Travels with the
frontend PR DEFRA/trade-imports-animals-frontend#272 — same branch name, cross-repo
branch parity.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
