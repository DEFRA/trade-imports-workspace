# Batch 001 — shared/dr1-parity-union

- **Batch number:** 1
- **Budget:** 1 increment
- **Landed:** 0
- **Ended early:** no driver available to build the increment (reported to L0 as `increment-failed`, the closest enumerated value — see "Why I stopped")
- **Driver:** none. Neither drive path in the L1 brief exists on this machine.
- **Script prepared but never run:** `workareas/shared/dr1-parity-union/build-loop.run.js`

---

## Why I stopped — the divergence

**Both of the brief's drive paths are unavailable in this runtime.**

1. **The `Workflow` tool is not in my toolset.** It is absent from the base tool list and
   absent from the deferred-tool list. `ToolSearch` with `select:Workflow` returned
   *"No matching deferred tools found"*, and a keyword search for a workflow/script runner
   returned only unrelated tools (`Monitor`, the Chrome `shortcuts_execute`, `EnterWorktree`).
2. **The `codex` CLI — the brief's documented fallback — is not installed.** `command -v codex`
   returns nothing; `~/.codex`, `/opt/homebrew/bin/codex`, `/usr/local/bin/codex` and
   `~/.local/bin/codex` all do not exist. The briefs and schemas under
   `.claude/workflows/codex/` are present (`implement.md`, `review.md`, `fix.md`,
   `schemas/increment.json`, `schemas/findings.json`) — only the binary that would consume
   them is missing.

So the batch had a validated backlog, a verified plan, a green baseline and a correctly
patched run copy of the loop, and no way to execute it.

### The route I deliberately did NOT take

`increment-build-loop` is exposed in my skill list, and `Skill(skill: "increment-build-loop")`
would have loaded it. **I did not invoke it, on purpose.**

The Skill tool takes a skill name and an args string; it cannot take a `scriptPath`. It would
therefore have run the **tracked** `.claude/workflows/increment-build-loop.js`, not my patched
copy. That file's `FALLBACK` const reads:

```js
workarea: 'shared/plant-products-ched-pp',
scope: 'plant-products',
increments: ['pp-053']
```

The brief's own warning is that `args` plumbing is unreliable in this runtime and `FALLBACK`
is "the real switch" — which is exactly why it instructs L1 to run a patched private copy. If
args had failed to plumb, that invocation would have run a **different programme's increment**
under `lifecycle: full`: raising a Jira ticket on EUDPA, cutting a branch and potentially
opening a PR for `pp-053`. Those are externally visible, hard-to-retract side effects on a
programme this batch has no mandate over.

The one mitigation that would make the skill route safe — correcting `FALLBACK` in the tracked
file — is explicitly forbidden ("Never edit `.claude/workflows/increment-build-loop.js`").

Returning empty is recoverable. A wrong-programme ticket and branch is not. I returned empty.

---

## Increment derived: `inc-003`

**Why it came next.** The buildability query (status not in
`done|deferred|dropped|blocked|rejected`, and all `dependsOn` satisfied) returned `inc-003` as
`.[0]`. It has `dependsOn: []`. `PROGRAMME-NOTES.md` carries a do-not-build list
(`inc-062`, `inc-094`, `inc-030`, `inc-031`, `inc-013`) — `inc-003` is not on it, and array
order was not overridden by any note. Re-derived after my backlog edit: still `inc-003`.

**Title.** Frontend shows no phase banner; Design release 1 carries an Alpha banner with a
feedback link on every page.

**Outcome.** Not started. No ticket raised, no branch cut, no commit, no PR. `inc-003` remains
`status: todo` with `commit: null`, which is correct — the next attempt must build it.

---

## Backlog validation

All four queries clean at the start of the batch, and clean again after my edit:

| Query | Result |
|---|---|
| `jq empty` | exit 0 |
| dangling dependencies | `[]` |
| forward dependencies | `[]` |
| duplicate ids | `161` / `161` |

Status counts, unchanged by this batch: **154 todo, 5 dropped, 2 blocked** (161 total).

Note: `PROGRAMME-NOTES.md` describes `inc-094`, `inc-030`, `inc-031` and `inc-013` as
**rejected** and `inc-062` as **dropped**. In `backlog.json` all five carry status `dropped`
and there are **zero** `rejected`. Both are withheld statuses so buildability is unaffected,
but the notes and the data disagree on the wording. Not corrected — it is a documentation
question, not a build blocker.

---

## Baselines I measured myself

Measured, not quoted forward. `npm --prefix repos/trade-imports-animals-frontend test` →
`logs/batch-001-baseline-frontend.log`, read once:

```
Test Files  149 passed | 2 skipped (151)
     Tests  1560 passed | 8 skipped (1568)
  Duration  10.59s
```

**Frontend baseline is GREEN.** Backend and tests repos were not measured — `inc-003` touches
the frontend only.

Frontend `HEAD` is `76a864ba EUDPA-294: link journey parties to a read-only address book
(#194)`, which is **exactly** the programme pin `76a864ba93ac7c60d358c902bd68396731daacf3`.
No citation drift is possible for this increment.

All three repo trees clean (`git status --short` empty for frontend, backend and tests).

---

## Step 1 — plan check, and the two corrections I made

Both corrections are written into `inc-003.notes` in `backlog.json`, with their evidence, so
the next attempt inherits them.

### Correction 1 — `type` was `add-section`, now `general`

**The defect.** `add-section` is one of `frontend-change`'s four *recipe triggers*
(`SKILL.md:3`, and Step 1 at `SKILL.md:73-78`: "For the four recipe triggers, Read the recipe
end-to-end BEFORE editing anything"). The workspace skill index defines add-section as
"feature group + flow section + task row". That would have sent the implementor to a
set-journey recipe.

**The evidence it is wrong.** The increment's own `finding.difference` names three files, all
in `src/server/app/shared/`: `layout.njk`, `copy.en.js`, `copy.cy.js`. That is outside
`sets/live-animals` entirely. There is no feature group, no flow section and no task row in
this change. `frontend-change` has a "routed general change" path, which is the correct route.

**Note on blast radius:** the build loop routes the implementor on the increment's `repo`
field, **not** on `type` (`increment-build-loop.js:836-848`), so `type` misdirects
`frontend-change` once it is invoked, not the loop itself.

### Correction 2 — added `repo: "frontend"`

**The defect.** `jq '[.increments[] | has("repo")]'` returns `false` for **all 161
increments**. No increment in this backlog carries a `repo` field. The loop depends on it
twice:

- Baseline guard (`increment-build-loop.js:806`): *"Determine the increment's repo(s) from its
  'repo' field and confirm each one is clean"* — a guard that cannot determine the repo may
  report `ok:false` and abort the increment as `baseline-red` before anything is built.
- Implementor (`increment-build-loop.js:839`): *"route on the increment's 'repo' field:
  frontend → ... backend → ... tests →"*.

**The evidence for the value `frontend`.** `PROGRAMME-NOTES.md` Target section names
`repos/trade-imports-animals-frontend`; `band` is `frontend-work`; `evidence.frontend` cites
`src/server/app/shared/layout.njk`, which exists in that tree at the pin. Citation `c2` carries
`repo: "prototype"` — that is the comparison side, not a repo to edit, and it is **not cloned**
(`ls repos/` has no prototype checkout).

**This is systemic, not local to `inc-003`.** I corrected only the increment I derived, per
remit. All 160 others still lack `repo`. Raised on the `owed-to-human` line.

### Claims I checked that HELD

1. **`layout.njk:19-53`** — read it. Line 19 is `{% block govukHeader %}`; line 53 is the
   `{% endblock %}` closing `beforeContent`. The span is exactly header → service navigation →
   `containerStart` (signed-in bar) → `beforeContent`. `beforeContent` holds `govukBreadcrumbs`
   then `govukBackLink` with nothing above them, so the increment's "above the breadcrumbs and
   back link" is reachable. **Citation exact and current.**
2. **No phase banner anywhere.** `grep -rniE "phase-banner|phasebanner"` across
   `repos/trade-imports-animals-frontend/src` → no matches. **The finding holds.**
3. **`copy.en.js:10-21`** — line 10 is `layout: {`, and the block runs through the `footer`
   sub-object to line 21. This is the layout copy block the increment names as the banner
   text's home. Citation `c3` was a hand-resolved bare `:10-21`; it resolves correctly.
4. **`copy.cy.js` exists** with a structurally matching Welsh `layout` block, carrying a
   MACHINE-DRAFT warning at line 1.
5. **The verification ladder is real.** All four scripts exist in the frontend `package.json`:
   `test:live-animals`, `format:check`, `lint`, `test:fit:features`.

---

## Ruling made — the feedback link's destination

`inc-003` has no `openQuestions` field, but its `detail` and `finding.difference` both state
that DR1's feedback href is a placeholder and *"this service needs a real destination — a
feedback form or a mailto address — decided before the work lands"*. Headless, so I ruled it
rather than asking, and wrote the ruling into `inc-003.notes`.

**Ruled: `href="mailto:APHAServiceDesk@apha.gov.uk"`.**

**Evidence.** `grep -rniE "mailto|feedback"` across `src/` returns exactly two addresses, both
in `sets/live-animals/journeys/linear/features/confirmation/template.njk`:

- `:34` — `APHAServiceDesk@apha.gov.uk`, presented under a general help list. This is the
  general-purpose service-desk address the codebase **already ships to users**.
- `:30` — `importsriskmanagement@apha.gov.uk`, introduced by `copy.help.importsEmailPrefix`.
  Topic-specific (imports risk), so not appropriate for generic service feedback.

There is no `/feedback` route in the application and no survey URL anywhere in the repo, so
inventing one would breach "never invent data". The service desk is the only evidenced real
destination.

**This is a decision a human should confirm** — a service desk is not the same thing as a
feedback channel, and a real Alpha banner usually points at a feedback form. Raised on the
`owed-to-human` line. The increment itself notes the banner does not depend on it.

---

## Decisive mutation

**Skipped — the batch landed nothing.** There is no landing to mutate. Per Step 5, recorded
rather than substituted with a mutation against unrelated code.

---

## Tracked-loop integrity

```
git -C ~/git/defra/trade-imports-workspace status --short .claude/workflows/increment-build-loop.js
```

Empty output. **The shared loop was not modified.** I copied it to
`workareas/shared/dr1-parity-union/build-loop.run.js` and patched only the `FALLBACK` const in
that copy (workarea `shared/dr1-parity-union`, scope `parity-dr1`, epic `EUDPA-328`,
`increments: ['inc-003']`). Nothing else in the copy was touched. The copy was never executed.

`git check-ignore -q` on the run copy exits **0** — it is already gitignored, so no
`.gitignore` change is owed.

---

## Deviations and under-delivery

- **Zero of a budget of one.** Not under-delivery in the sense the brief warns about — nothing
  landed that did less than it claimed. The batch could not start.
- **No `sonar analyze --staged` owed** — no code was staged or changed in any repo.
- The only files this batch wrote are `backlog.json` (two evidenced corrections plus `notes` on
  `inc-003`), this report, `logs/batch-001-baseline-frontend.log`, and the gitignored
  `build-loop.run.js`.

---

## Owed to a human

1. **Install a driver, or expose the `Workflow` tool to spawned L1 agents.** Until one of the
   two exists, every L1 in this programme will return empty for the same reason. This is the
   blocker.
2. **No increment in this backlog carries a `repo` field** (0 of 161). The loop's baseline
   guard and implementor both route on it. I fixed `inc-003` only. The other 160 need the same
   field before they will build cleanly.
3. **Confirm the phase banner's feedback destination.** I ruled
   `mailto:APHAServiceDesk@apha.gov.uk` on the evidence available; the service team may want a
   feedback form instead.
4. **`PROGRAMME-NOTES.md` says `rejected` for four increments that `backlog.json` records as
   `dropped`.** Harmless to buildability, but the notes and the data should agree.
