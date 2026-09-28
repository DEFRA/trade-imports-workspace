# The conventions pass

Run this after every part a `design-session` builds, and again immediately
before every `designer:save` (skip the second run only when a pass already
ran in this conversation and nothing has changed since). It is two layers:
deterministic first, then judgement. Never skip the deterministic layer to
save time — it is what `designer:check` runs in CI too, so skipping it here
only means finding out later.

## Layer 1: deterministic (`designer:check`)

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:check -- --set <release>
```

This already includes: custom ESLint rules (`{param}` routes validate
params, release POST handlers call `validate(`, a service's `index.js`/
`client.js` never import `prototype-support`), service conformance (barrel
shape, `contract.json` valid, no floating module doc block), copy checks
over every set, and an advisory GDS wording pass that never fails (the
designer's words win). Follow `references/check-my-change.md` for reading
and repairing a failure.

## Layer 2: judgement (code-style and review, local mode)

Once the deterministic layer is green, run the local modes of the
`code-style` and `review` skills against the branch's changed files in the
prototype. These are the same personas fresh/refresh reviews use elsewhere
in the workspace, reused through a branch-keyed local mode
(`<repo>:<branch>`, state under
`~/git/defra/trade-imports-workspace/workareas/code-style-reviews/local/…`
and `~/git/defra/trade-imports-workspace/workareas/reviews/local/…`), never
copied into this skill.

1. Get the standards bundle for the files this part changed:

   ```bash
   tim backlog standards --files trade-imports-plants-prototype:<path>,trade-imports-plants-prototype:<path> --json
   ```

2. Run the `code-style` skill's local mode with `fix: true` over the
   changed `.js`, `.njk` and `copy.*.js` files. FIX items are applied
   silently — never surface a FIX item to the designer by name or line
   number.
3. Re-run layer 1 (`designer:check`) once, so a style fix that changed
   behaviour is caught before it reaches the designer.
4. Run the `review` skill's local mode over the changed service and
   controller files only (never templates or copy: the review skill judges
   code, not markup or wording).
5. For every finding either skill returns:
   - **FIX** (style): already applied in step 2.
   - **FIX** (review, mechanical and safe — an unused import, a missed
     null guard on a new record shape): apply it, then re-run layer 1.
   - **NEEDS_WORK**: never applied silently. Add one line to the release's
     `design-gaps.md` (or the hand-off folder when there is no release
     file), naming the file and the concern in plain English, and move on.
     Never block the designer's save on it.

## Reporting

Tell the designer only what changes what they see:

- If layer 2 changed nothing the designer would notice: "tidied to house
  style (N changes)" — N being the count of FIX items applied across both
  skills, with no further detail unless asked.
- If a NEEDS_WORK item was parked: nothing changes in the reply to the
  designer beyond what design-gaps.md always carries into a hand-off. Never
  narrate a style or review finding in designer-facing GDS English; that
  detail belongs to the developer who eventually reads the gap.
- If layer 1 failed and could not be repaired within its own retry budget:
  follow `references/check-my-change.md` step 6 exactly — this pass never
  invents its own retry count.

## Guard rails

- Never run this pass on files outside the release, its gateway, its
  example data, `src/server/prototype-support/` or a prototype-owned
  service folder (the same boundary every code-producing reference already
  keeps to).
- Never weaken a test, a validation rule or a copy string to make either
  layer pass.
- One Bash command per call.
