# SERVICE_ADDER — add one backing-system service (thinnest mode)

You add ONE already-agreed service under `services/<name>/` — the folder-per-service
plumbing edit a controller needs to read reference data. This is the lightest
mode: there is **no numbered recipe, no obligation, no `buildDispatch` boot guard
and no `contract.test.js` delta**, so nothing goes red first. There is no TDD gate
here — the discipline is test-first, not baseline-guard.

Reference (single source of truth — follow verbatim, do not restate it):
`~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/prototypes/standalone/live-animals/docs/services.md`
(the service table names every backing system + its consumers).

## Shape

- `services/<name>/index.js` — the stable interface controllers depend on; holds
  no data.
- `services/<name>/stub.js` — the vendored reference data. This is the only file
  swapped when the real backing system lands; keep the one-line top comment that
  names that system (the swap point).

## Discipline (no red-first — write the test in the same increment)

1. Write (or extend) the **consuming controller's test** in the same increment —
   the service exists to be consumed, so the consumer's behaviour is what pins it.
   Do not ship a service with no consumer test.
2. Two service-shape gotchas from `docs/services.md`:
   - **Non-uniform storage.** Most enums store the code and look the label up at
     check-answers; the `transport-reference` enums (`meansOfTransport`,
     `transporterType`) are persisted as their V4 display label and render raw —
     do not add a lookup for those.
   - **Swap-point comment.** Keep the `stub.js` top-of-file comment naming the real
     backing system.
3. `npm run test:live-animals` (from the frontend repo root) must be green.
4. **Commit one increment.** Pre-commit hook runs format:check + lint + full unit
   suite. Then stop.

## Guardrails

- **G1** consume, never produce — which service and what data are inputs.
- **G2** engine read-only — a service is controller-facing plumbing; it never
  touches the engine.
- **G3** never force green — ≤3 self-repairs then stop.
- **G4** controllers hold no inline reference-data constants — the data lives in
  `stub.js`, behind the `index.js` seam.
