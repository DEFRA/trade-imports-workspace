# Handover — build the findings report (EUDPA-328 report v2)

Written 2026-08-18, end of session, for a fresh agent picking this up overnight.
Sam is asleep. **Do not stop to ask questions.** Make the call, record it, keep
going. Everything he needs to see goes in the morning report (below).

---

## Your first three actions

1. Read `REPORT-V2-PLAN.md` in this directory. It is the plan. 58 increments.
2. Read `report-v2-backlog.json` beside it. That is the work, ordered, with
   `dependsOn` already topological and verified free of dangling references.
3. Create `MORNING-REPORT.md` in this directory and start appending to it as you
   go. Bullet points. Sam reads it first thing.

Then start at the first `todo` increment whose dependencies are met and work
down. Commit as you go. Push often.

## The morning report

`workareas/shared/dr21-parity/MORNING-REPORT.md`. Append, never rewrite. Bullets
only. It must carry, in this order:

- **Decisions you made** that Sam would plausibly have made differently, each
  with one line of reasoning. This is the most important section.
- **What is built and working**, with how you proved it — a command he can run,
  a test count, a screenshot path.
- **What broke or surprised you**, including anything where reality contradicted
  this handover.
- **What you did not do** and why.
- **The two canaries** (below) laid out for his review.

Write it in GDS plain English. Technical is fine; padding is not.

## Where everything is

- **Workspace:** `~/git/defra/trade-imports-workspace`, branch
  `feat/EUDPA-328-dr21-parity`, pushed and in sync. This is a real clone, not a
  symlink. `~/git/defra/trade-imports-animals` is the STALE old clone — do not
  work there.
- **The findings backlog:** `workareas/journey-builder/EUDPA-328/backlog.json` —
  97 increments, 1 withdrawn, 22 carrying revalidation notes, 49 gated on Sam,
  21 on backend. This is the canonical input the report renders.
- **Deferred leads:** `workareas/journey-builder/EUDPA-328/deferred.json` — 8
  prototype capabilities with prototype-side evidence only. Not backlog items.
  The report should show them as deferred, not mix them in.
- **The current generator:** `workareas/shared/dr21-parity/compare/build-page.js`
  (440 lines). The plan says delete it, not deprecate it.
- **Captured corpus:** `harness/capture/` (70 prototype page models + raw HTML),
  `fe-miner/capture/` (34 frontend). 104 models total.
- **The published report today:** an artifact at
  `https://claude.ai/code/artifact/f089a914-2ae2-4732-9f60-f3ec12bf9734`. Sam
  owns it. You can read it with WebFetch. Do not assume it is the target shape —
  it is the thing being replaced.

## Decisions already made — do not relitigate

- **Photograph the latest of both sides**, not the pinned corpus commits
  (`32f6106c` frontend, `7da4f70` prototype). Sam's call. Consequence to carry:
  a finding written against the old commit may describe markup the picture no
  longer shows. That is a signal to re-verify the finding, not a capture bug.
  One finding (inc-014) was already withdrawn for exactly this.
- **The report becomes the batch ruling surface.** Sam wants to rule on many
  findings in one pass, not one at a time through `next-decision.sh`.
- **It need not be one page.** A small web app you step through is explicitly
  welcome. He said he is happy to explore that.
- **It is not called `tim parity`.** Sam is uneasy about that name and he is
  right: this is not about parity. It renders a backlog of findings whose
  sources happen to be two today and may be several tomorrow. Pick a name built
  around the backlog or the findings, not the comparison.
- **Sources are data, plural.** The requirements side will not always be the
  prototype. There may be the prototype and another source, or several. A first
  pass need not solve this, but must not foreclose it. Mirror the pattern in
  `tools/journey-builder/targets.json`, where the build loop's target became
  data — its own comment is the precedent.

## The two canaries — produce, do not block

The plan gates two things on Sam. He has said not to stop. So **produce both,
put them in the morning report, and carry on with everything that does not
depend on them.**

- **inc-031** — author ONE `decisionRequired` question for one finding, and show
  it beside the frozen original.
- **inc-034** — rewrite ONE finding into GDS plain English, and show the diff
  against the frozen original.

Do not write the other 47 questions or rewrite the other 96 findings until he
has seen these. That is the whole point of a canary.

## The risk that matters most

The GDS rewrite softening a claim in a way no checker catches. Mechanical
invariants stop dropped quotes and dropped counts. Nothing mechanical stops
"the frontend enforces" quietly becoming "the frontend checks". Every finding in
this backlog is defensible today and that is its entire value.

Guard: keep `detail` frozen forever as the migration oracle, print a polarity
list, and have an adversarial reader who did not write the text check the
rewrite. Four of the six structured prose slots are a JOIN, not a rewrite — the
upstream findings file already holds `detail`, `correction`, `falsifiedBy` and
`verification` separately and the current build flattens them. Only two slots
carry real rewriting risk. Keep it that way.

## Standing instructions from Sam

- **Best output, never cheapest.** Effort and file size are not constraints. He
  owns every repo and the hardware. Do not offer a cheap tier beside a good one.
  "Luxurious not spartan" — that means the reading experience, generous imagery,
  evidence in reach. Not animation or ornament.
- **The 16MB artifact ceiling is not a design constraint.** It is a fact about
  one delivery channel. If the best report is a locally served page, build that
  and treat publishing a shareable subset as a separate question.
- **Make the call, flag it after.** Never gate on an arbitrary fork.
- **Never end a turn idle.** Launch the next piece before summarising.
- **Backlogs are canonical JSON a loop consumes**, never a markdown document.
  Documents are generated views.
- **Verify against artefacts, not memory.** Both codebases move weekly. A
  plausible-but-stale claim is the main risk to credibility here.
- **Tests and harnesses are ours to change.** Writing new specs whose only job
  is to produce evidence is explicitly sanctioned, up to one per finding.
- **Report progress as N of TOTAL**, and name what you deferred and why.

## Environment rules that cost time to learn

- Bash: ONE command per call. No `&&`, `;`, `|`, no `cd`, no for-loops. Use
  `git -C <path>`.
- `env`, `node`, `bash`, `sh`, `zsh` are denied as commands. `PORT=x npm run ...`
  will not work — put the variable in the npm script instead. There is a
  precedent: `test:fit` in the frontend now defaults its own port.
- Use `~/` in Bash paths, never `/Users/...`. Use absolute paths for
  Read/Write/Edit/Glob/Grep.
- `chmod` is policy-blocked. A new script cannot be made executable — either
  extend an existing executable script or have Sam run the chmod. `rm -rf` is
  blocked; plain `rm` on named files works.
- `git push` works. `gh` works. `shellcheck` works and is the only syntax check
  available for bash, since `bash -n` is denied.
- A guard hook refuses to execute a tracked script that differs from HEAD.
  Commit tool changes before running them.
- Wrap node runs in an npm script. Bare `node -e` is denied.

## Hazards, already paid for once

- `trace snapshot --eval --filename` writes JSON-encoded output. Decode it
  before jsdom sees it, or every class selector silently returns empty while the
  page model still looks healthy. This nearly poisoned the original backlog.
- The prototype builds its spine screens from bespoke `app-*` markup, not
  govuk-frontend components. Compare `taskItems` / `summaryRows` / `allFields`,
  never `taskLists` / `summaryLists`.
- `workareas/` is gitignored except `workareas/shared/` and two explicit
  negations for `backlog.json` and `deferred.json`. **Any new tracked file under
  `workareas/journey-builder/` needs its own negation in `.gitignore`** or
  `git add` will refuse it. Do not use `git add -f`.
- The workspace was renamed today. If you find `trade-imports-animals-workspace`
  anywhere outside `workareas/` and `docs/adr/`, it is a bug — the two adr hits
  are a deliberate historical record.

## Open items Sam already knows about

- **PR #204** on `DEFRA/trade-imports-animals-frontend` — the fit-suite port
  default. Open, unreviewed.
- **The artifact share pin** has not been moved, so anyone Sam sent the link to
  still sees a pre-revalidation version. Only he can move it.
- **The old clone `~/git/defra/trade-imports-animals` is stranded but not
  useless.** The migration captured this branch one commit early, so
  `REPORT-V2-PLAN.md` and `report-v2-backlog.json` existed only there and were
  recovered by hand. Do not delete that clone. If you find anything else
  missing, look there first.
