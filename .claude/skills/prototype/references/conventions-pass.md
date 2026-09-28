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

### When layer 2 runs

Decide from the changed files (`git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype status --short`):

- **Only string values in `copy.en.js`/`copy.cy.js` changed** (a wording
  change, no key added or removed): skip layer 2. Layer 1 already checked
  the shape. The judgement check is the prototype's
  `.claude/rules/copy.md` and
  `~/git/defra/trade-imports-workspace/docs/best-practices/gds/language.md`
  (hint text, dates, error patterns): read both and fix what they flag.
- **Only templates (`.njk`), or templates and copy, changed**: skip the
  code-style and review runs. Read
  `~/git/defra/trade-imports-workspace/docs/best-practices/node/nunjucks.md`,
  `~/git/defra/trade-imports-workspace/docs/best-practices/node/govuk-frontend.md`
  and `~/git/defra/trade-imports-workspace/docs/best-practices/gds/components.md`
  against the changed template, and the prototype's `.claude/rules/templates.md`.
- **Any other `.js` changed** (a controller, a service, `fields.js`, a
  view model, a stub, a test, a fixture script): run the full layer 2 below.

### The full layer 2

Once the deterministic layer is green, run the local modes of the
`code-style` and `review` skills against the branch's changed files in the
prototype. These are the same personas fresh/refresh reviews use elsewhere
in the workspace, reused through a branch-keyed local mode
(`<repo>:<branch>`, state under
`~/git/defra/trade-imports-workspace/workareas/code-style-reviews/local/…`
and `~/git/defra/trade-imports-workspace/workareas/reviews/local/…`), never
copied into this skill.

1. Get the standards bundle for the files this part changed. Give each file
   its own `--files`, or several separated by commas:

   ```bash
   tim backlog standards --files trade-imports-plants-prototype:<path> --files trade-imports-plants-prototype:<path> --json
   ```

2. Run the `code-style` skill's local mode with `fix: true` over the
   changed `.js`, `.njk` and `copy.*.js` files:
   `~/git/defra/trade-imports-workspace/tools/style/start-style.sh --local trade-imports-plants-prototype <branch>`
   (called by its tilde path, never through `bash <script>`). FIX items are
   applied silently — never surface a FIX item to the designer by name or
   line number.
3. Re-run layer 1 (`designer:check`) once, so a style fix that changed
   behaviour is caught before it reaches the designer.
4. Run the `review` skill's local mode
   (`~/git/defra/trade-imports-workspace/tools/review/start-review.sh --local trade-imports-plants-prototype <branch>`)
   over the changed service and controller files only (never templates or
   copy: the review skill judges code, not markup or wording).
5. For every finding either skill returns:
   - **FIX** (style): already applied in step 2.
   - **FIX** (review, mechanical and safe — an unused import, a missed
     null guard on a new record shape): apply it, then re-run layer 1.
   - **NEEDS_WORK**: never applied silently. Add one line to the release's
     `design-gaps.md` (or the hand-off folder when there is no release
     file), naming the file and the concern in plain English, and move on.
     Never block the designer's save on it.

### When the local modes cannot run

The local modes fan out to Task subagents. When this session has no Task
tool, or `start-style.sh`/`start-review.sh` fails to start (for example
"Permission denied" on a prepare script), do the same judgement inline, file
by file, with no subagent. Never fall back to `bash <script>`, and never skip
layer 2 silently. Read the bundle from step 1, then check each changed `.js`
file against:

1. `~/git/defra/trade-imports-workspace/docs/best-practices/node/code-style.md`:
   fat arrows, early returns, no magic numbers or strings, `const`, `??`
   over `||`, named exports, names that say what they hold.
2. `~/git/defra/trade-imports-workspace/docs/best-practices/node/hapi.md`:
   a `{param}` route has Joi `params` whose `failAction` throws
   `Boom.notFound`; a POST that reads `request.payload` validates it with
   `validate(...)` from `lib/validate` and re-renders with a 400.
3. `~/git/defra/trade-imports-workspace/docs/best-practices/doc-comments/jsdoc.md`:
   a doc comment only where it earns its place, and every `@param` matches.
4. A service folder: the real `index.js`/`client.js`/`stub.js` shape of
   `src/server/app/services/countries/` (`references/house-conventions.md`).
5. Copy: every user-facing string, error included, comes from
   `copy.en.js`/`copy.cy.js`, never a literal in a controller.

Apply what is mechanical and safe, re-run layer 1, and park anything else
as NEEDS_WORK (step 5 above). Say once in your own notes (never to the
designer) that layer 2 ran inline and why.

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
