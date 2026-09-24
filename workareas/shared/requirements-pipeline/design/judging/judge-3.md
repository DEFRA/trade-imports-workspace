# Judge 3 of 3: the skeptic's verdict

Judged 18 September 2026. Lens: recipe leakage into the backlog, executor-specific fields, silent-success paths, and places where Codex mode would still be worse than Claude mode. All three candidates were read in full, against `sam-requirements.md` (R1 to R6), `rules-probe.md` and `00-synthesis.md`.

**Winner: `reuse.md`**, with specific grafts from `codex.md` (the verification machinery and the Codex parity proof) and `quality.md` (the requirements-side quality gates).

---

## 1. Recipe leakage into the backlog (R1)

| Candidate | What leaks | How bad |
|---|---|---|
| reuse | Nothing on the row. There is no `exemplars` or `hints` slot at all. `consistentWith.ref` is a behaviour ("live-animals: origin, country of origin question"), "never a file to edit". The header's `repos.<key>.knowledge[]` is a reading list of repo-owned docs, which is the closest thing to a leak. It names docs, not files to change. `tim backlog check` lints acceptance text for paths, `()`, file suffixes, commands and CSS classes. | Cleanest of the three |
| quality | `hints.exemplars[{ref: "repos/trade-imports-animals-frontend origin feature"}]` on a row: a path-shaped pointer, forced `binding: false`, read by the planner only. On the other side, it has the strongest mechanical guard: the v2 zod schema is subtractive-strict and **refuses** every recipe key by name, plus a recipe lint with a decision-only override. | Small leak, strongest guard |
| codex | `exemplars[{ref: "repos/trade-imports-animals-frontend/src/server/app/sets/live-animals/features/origin/"}]` in the worked example, and `tim/src/parity/ingest.js` in its own backlog. These are literal file paths on requirement rows. `binding: false` is a flag. It does not stop a planner anchoring on the path, and this is the "treat filesToTouch as a hypothesis" failure the synthesis records (`0baad31f`). Its tooling-programme deviation ("ACs may name tim commands") is honest and recorded. | Real leak through a sanctioned slot |

## 2. Executor-specific or run-config fields in the backlog (R5)

- **reuse:** `run.json` holds everything the implementor owns: executor bindings, cadence, reviewCap, ciFixAttempts, localE2e, opusConcurrency, judgeOn and commitTrailer. The header keeps only ruled delivery policy (`delivery`). One acceptance criterion reads "binding a range to Codex leaves the backlog byte-identical". This is the best R5 separation.
- **quality:** executor state sits in `build/state.json` and `build/run.json`. The header `lifecycle.phases {sync, localE2e, workspaceE2e}` puts run knobs in the backlog. These knobs are executor-neutral, so there is no violation, but they belong to the implementor.
- **codex:** the header `lifecycle` carries `review.cap`, `ciFixAttempts`, `localE2e`, `workspacePr` and `commitScope`. All are executor-neutral, but they are build-run config in the backlog, which R5's spirit gives to the implementor at run time. Rows also **denormalise** `needs` (the full question record) and `rulings[]` from `decisions.json`. That keeps each row self-contained, which is a good R5 point, but it creates a second copy. A header ledger sha guards it. Its test "every v2 field has a class" is excellent.

## 3. Silent-success paths

- **codex (strongest).** `tim build advance` checks the **expected task set**, so a missing receipt is a failed task. `tim stage accept` validates **both** executors' output against the Codex-strict schema, so Claude cannot return a shape Codex could not. Ladder, baseline, CI and Sonar results are **tool facts**, never an agent's claim. A baseline red becomes a discovered hygiene item and never reads as "pre-existing". "Pre-existing" is refused in summaries. Op ids make replays idempotent. The reading audit is mined from transcripts and Codex logs, not self-reported.
- **reuse (good).** It has an explicit table covering reviewer, judge, fixer, report, watcher-empty, Codex-no-output and **Codex committing or pushing on its own**. That last one is unique: a post-Codex check proves HEAD and remote refs are unmoved. Two weaknesses:
  - `run-stage.sh` validates only that the top-level keys the schema requires are present, and does so with `jq`.
  - An LLM courier returns the assembled JSON "verbatim", and paraphrase is a live risk. The design admits this (risk 5).
  - `rulesRead[]` and `siblingsRead[]` are self-reported. The consistency reviewer checks them, but a self-report is weak evidence.
- **quality (good design, bad data).** It has fix-verify, plan-audit and an independent acceptance stage, and the relay validates through `tim build stage-result check`. But **its own build backlog fakes verification**. Every row has `verifiedBy: {agent: "design-panel"}` with `verification: "pending panel review"` and `verdict: "stands"`. Its own writer check P7 (verifiedBy differs from authoredBy, verification non-empty) would accept that. This is exactly the silent-success pattern the design bans, sitting in the first data it would ingest. reuse and codex both honestly leave `verifiedBy: null`.

## 4. Where Codex mode would still be degraded (R6)

| Point | reuse | quality | codex |
|---|---|---|---|
| Same per-file fan-out | yes | yes | yes |
| Same rule and bundle list for both executors | yes (`context.json`) | yes (`build/context`) | yes, plus prompts byte-identical except the profile, checked by the parity report |
| Judge in Codex mode | Opus by default (a knob) | Codex by default (a knob) | Codex by default, measured in the parity proof |
| Codex output path | LLM courier plus jq top-level check | shell plus relay with tim schema check | watcher runs the script, then `tim stage accept`; no relay |
| House rules | not addressed | not addressed | **Found the gap.** The loop inlines Sam's memory HOUSE RULES (`:1195-1197`), which Codex never sees. It proposes a tracked `house-rules.md` and asks Sam |
| Codex-as-orchestrator | handover variant | handover variant | a real third mode driving the same `advance` loop |
| Distiller on Codex | characterise, author and verify can be bound to Codex | not really addressed | same stage machine; bindable |
| Parity proof | good, with a cross-check replay | good, two runs, repeated on a combined row | best: three routing families, prompt parity, reading audit, cross-examination, backlog sha unchanged |

The house-rules asymmetry is the most important thing any candidate found. Without it, Codex would review against a thinner standard than Claude even with identical personas.

## 5. Feasibility under the rails

- **reuse:** most feasible. It uses `git mv` with history kept and has a new-file ledger that justifies every file. There is one workflow with two modes. The drain has no dependence on nested workflows. Schemas are held once in the script and extracted by tim for Codex. The skills get only an "embedded" section and a `--list` flag. Risk: one large shared workflow file (flagged as S6).
- **quality:** feasible. Three workflows, and the nested child is gated by a canary, with `cadence: one` as a fallback that needs no code change. The distiller is heavy on Opus (author and verifier are both Opus), which makes it costly but within the concurrency cap of 6.
- **codex:** least feasible.
  - `tim build` **re-implements the whole proven lifecycle** in a new tim stage machine: git, push safety, octokit PR, checks, approvals and merge, Jira transitions, CI fixer orchestration and local E2E. That is the most proven half of the estate, rebuilt from zero. It is in tension with R1's "not a build from zero; take the best bits".
  - It also moves both skills' routing out of bash into JSON (`routing.json`), rewriting `file-topics.sh`, `bake-rules-bundle.sh` and `detect-tech.sh` as thin readers. That is legitimate ownership but a sizeable change to two live skills.
  - `tim` pushing internally means the PostToolUse push hook stops firing (acknowledged).

## 6. Two-pass distillation, shown in each candidate's own backlog

- **reuse:** about 24 atoms combined into 20 increments, with `members`, combination rules, `declined[]` and one born-blocked increment. It is a genuine demonstration of R1's two passes.
- **codex:** says honestly "Pass 2 was not run", and records the declined pairs with reasons.
- **quality:** 20 rows, all marked `grain: atomic`, yet many statements are multi-clause "X, Y and Z". That breaks its own "and also means two atoms" grain rule, and pass 2 is never shown.

## 7. Scores (1 to 10)

| Dimension | reuse | quality | codex |
|---|---|---|---|
| R1 requirement not recipe, two-pass | 9 | 7 | 8 |
| R2 live review skills | 9 | 8 | 8 |
| R3 rules | 8 | 7 | 9 |
| R5 executor-agnostic backlog | 10 | 8 | 7 |
| R6 Codex first-class | 7 | 8 | 10 |
| Requirements quality | 8 | 10 | 8 |
| Report quality | 8 | 9 | 8 |
| Reuse | 10 | 7 | 5 |
| Feasibility under the rails | 9 | 7 | 5 |
| Completeness | 9 | 9 | 9 |

## 8. Verdict and grafts

**Winner: reuse.** It has the cleanest backlog: no hint slot, run config fully in `run.json`, and a byte-identical backlog as an acceptance criterion. It has the most feasible path, the only own backlog that really shows both passes, and the honest `verifiedBy: null`. Its Codex mode is close to parity. The gaps are specific and graftable, not structural.

Grafts into reuse:

1. **From codex: receipts and one accept step.** Replace the LLM courier's verbatim re-emit with `tim stage accept`. It validates each task's output file against the one stage schema for **both** executors, writes a receipt, and enforces the expected task set. It keeps reuse's single `STAGE_SCHEMAS` source.
2. **From codex: prompt parity.** Assemble prompts from files, byte-identical between executors apart from the profile section, and check this in the parity proof.
3. **From codex: house rules.** Raise the memory-only house rules as a must-answer question for Sam: promote them to a tracked `docs/best-practices/house-rules.md` read by both executors.
4. **From codex: ladder and baseline as tool facts.** Neither is an agent's claim. A red baseline becomes a discovered hygiene atom that the increment depends on, never "pre-existing".
5. **From codex: a reading audit.** Mine Claude transcripts and Codex logs for the listed rule and bundle files instead of trusting `rulesRead[]`. Also add a `tim standards lint` that fails when a rule pointer names a missing file.
6. **From codex: op ids.** Make every writer call idempotent under replay.
7. **From codex: judge on Codex by default in Codex mode,** with the parity proof comparing judge rulings. Also take its broader parity-proof bar: three routing families, cross-examination, backlog sha unchanged.
8. **From codex: Codex-as-orchestrator** as a generated handover that drives the same writer commands, and a persona seam section named for the harness parts.
9. **From quality: the subtractive-strict v2 schema** that refuses recipe and executor keys by name, alongside reuse's recipe lint.
10. **From quality: requirements gates.** Extract-verify per source by a different agent, the trace-matrix closure check (`trace --strict`), QUESTION_EDITOR plus QUESTION_CRITIC with question lint and blast-radius ranking, and role-to-confidence consistency checks. Also COPY_EDITOR beside CLAIM_VERIFIER.
11. **From quality: build-side checks.** A plan-audit stage by a different agent that reads the row, not the plan's paraphrase of it. A fix-verify stage. An `acProofs` map in the plan, and per-AC acceptance results in the report.
12. **Guard to add in reuse.** Refuse `verifiedBy` values that are not a real run's agent record, so a design-time placeholder like quality's "design-panel / pending" can never pass ingest.
