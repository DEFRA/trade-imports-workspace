## What broke

Increment `inc-115` (EUDPA-560) adds an add-commercial-transporter page to the
frontend, for a trader whose commercial transporter is not one of the records
the service ships. It re-points the add route's commercial arm: choosing
**Commercial** on the transporter type question used to land on the approved
commercial register (`transporters/select`), because that was the only way to
record a commercial transporter; it now lands on the new form
(`transporters/add/commercial`).

Six E2E tests in this repo still expected the register there, and failed on
`pages.transporterSelection.heading` never rendering — on
[frontend PR 309](https://github.com/DEFRA/trade-imports-animals-frontend/pull/309):

- `tests/e2e/features/commercial-transporter-scope.spec.ts:6:3`
- `tests/e2e/features/private-transporter-scope.spec.ts:17:3`
- `tests/e2e/pages/transporter-add.spec.ts:23:3`
- `tests/e2e/pages/transporter-selection.spec.ts:8:3`, `:14:3`, `:18:3`

One regression in the journey, six symptoms.

## What changed

- **New page object** `page-objects/notification/commercial-transporter-page.ts`
  for `transporters/add/commercial` — heading, the fields the form asks in
  order, and the Country control, which is fixed to Northern Ireland rather
  than asked.
- **`flows/journey.ts`** — `toCommercialTransporter()` walks the list, the type
  question and the new form. `toTransporterSelection()` reaches the register by
  its own URL through that arm, since nothing links to the register any more
  and the transporter type still has to be answered for the commercial answer
  to be in scope. This is the route the frontend's own FIT suite takes.
- **`page-objects/factory.ts`** — registers `pages.commercialTransporter`.
- **`tests/e2e/features/commercial-transporter-scope.spec.ts`** — proves the
  same scope contract against the new form: the record is owed only for the
  commercial type, persists when the trader walks back in, and is wiped when
  the type changes.
- **`tests/e2e/features/private-transporter-scope.spec.ts`** and
  **`tests/e2e/pages/transporter-add.spec.ts`** — expect the add-commercial
  form where they expected the register.
- **`tests/e2e/pages/transporter-selection.spec.ts`** — unchanged assertions;
  a note records how the register is reached now.
- **The three a11y journey walks** — scan and fill the new form in place of the
  register.

Nothing is skipped, weakened or deleted: the assertions moved to the page the
service now shows.

## Verification

`npm run typecheck`, `npm run lint` and `npm run format:check` all clean.

## Increment and ticket

- Increment: `inc-115` (workarea `dr1-parity-union`)
- Ticket: EUDPA-560
- Paired frontend PR: DEFRA/trade-imports-animals-frontend#309 — same branch
  name, per the cross-repo branch parity rule.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
