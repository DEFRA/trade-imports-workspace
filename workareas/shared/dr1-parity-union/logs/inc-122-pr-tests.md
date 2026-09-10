## What broke

Frontend PR [#310](https://github.com/DEFRA/trade-imports-animals-frontend/pull/310) (increment inc-122, EUDPA-562) replaced the run-on radio list on the transporter page with a table: the radio now sits in a leading column and its own label is the visually hidden `Select <name>`, while the plain name is the cell under the Name column.

The tests repo's `TransporterPage.transporter()` still matched the radio on the bare name with `exact: true`, so it found nothing. Every journey that picks a transporter timed out — 24 E2E tests failed across all three shards of run [34458595312](https://github.com/DEFRA/trade-imports-animals-frontend/actions/runs/34458595312), all with the same error:

```
locator.check: Test timeout exceeded.
  - waiting for getByRole('radio', { name: 'García Livestock Transport SL', exact: true })
```

## What changed

`page-objects/notification/transporter-page.ts` — `transporter(name)` now matches `Select ${name}` exactly, the same shape `PartyPickerPage.party()` and the plants pickers already use for their results tables. One line, plus a comment saying why the accessible name is not the transporter's name.

Nothing was weakened or skipped: the specs still assert on the same transporters, still check visibility, checked state and the pick-and-continue path.

## Verification

- `npm run typecheck` — clean
- `npm run lint` — clean
- The frontend's own FIT suite passed on PR #310 while matching the radio non-exactly (`getByRole('radio', { name: commercialRecord.name })`), which confirms the accessible name *contains* the transporter name rather than equalling it.

## Belongs to

Increment `inc-122`, ticket EUDPA-562. Cross-repo branch parity with the frontend PR: same branch name, `feat/EUDPA-562-frontend-lists-each-transporter-as-a-rad`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
