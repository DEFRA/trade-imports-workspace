## EUDPA-508 — the frontend asks for a tattoo on every cow

Increment `inc-110` of the DR1 parity backlog. Frontend-only: the tests repo was branched for
this increment but needed no changes, so there is no sibling PR and no merge ordering to observe.

### What the parity comparison found

The cow identification record offers three fields — Passport number, Tattoo, Ear tag number —
because `Cow` sits on the tattoo allowlist alongside `Cat` and `Dog` in the live-animals
commodities stub, and that allowlist gates the tattoo obligation.

Design release 1 puts the tattoo on commodity code `01061900`, the cat, dog and ferret code.
Commodity code `0102` — cattle — is given exactly an ear tag and a passport, and nothing else.

### What changed

- `src/server/app/sets/live-animals/services/commodities/stub.js` — remove the tattoo identifier
  from the `Cow` entry in `COMMODITY_IDENTIFIERS`, so the tattoo obligation no longer applies to
  cattle lines.

Tattoo stays in scope for cats and dogs. The at-least-one-identifier rule on the cow unit record
is still satisfiable through the ear tag or the passport, so no cow record becomes unfillable.

### Tests updated to match

- the obligation evaluator and helper tests
- the animal identification controller test
- the identification fit spec
- the commodities whitelist and index tests
- the characterisation oracles fixture

### Not in this increment

With the tattoo gone, the frontend renders Passport then Ear tag where DR1 renders Ear tag then
Passport — the frontend orders identifiers globally, DR1 orders them per commodity. That ordering
difference is tracked separately as `identification--identifier-field-order`.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
