# Judge 1: verdict on the three design candidates

Written 18 September 2026. The lens is Sam's: does each design honour R1 to R6 as written, and would its requirements and its report be the best he has seen? Scores run from 1 to 10. Inputs: `sam-requirements.md`, `rules-probe.md` and `00-synthesis.md`, plus all three candidates, each read in full. Two facts were checked against source:

- `Bash(tim:*)` is on the project allowlist (`.claude/settings.json:88`), so watcher agents can run `tim`.
- `tools/style/bake-rules-bundle.sh` accepts any key as its first argument, not only `EUDPA-*`. So Quality's `BUILD-<programme>-<inc>` bundle key works, and Reuse's proposed `--list` flag is a small change.

## Scores

| Dimension | Reuse | Quality | Codex |
|---|---|---|---|
| R1: requirement, not recipe; two passes | 9 | 8 | 8 |
| R2: live review and code-style skills | 9 | 9 | 8 |
| R3: path rules | 9 | 9 | 10 |
| R5: backlog does not depend on the executor | 9 | 9 | 9 |
| R6: Codex is a full executor | 8 | 9 | 10 |
| Quality of the requirements | 8 | 10 | 8 |
| Quality of the report | 8 | 10 | 8 |
| Reuse of existing assets | 10 | 7 | 6 |
| Can it run under the rails? | 8 | 7 | 6 |
| Completeness | 9 | 9 | 9 |
| **Total** | **87** | **87** | **82** |

## Reuse (smallest new surface)

**Strengths.** This is the most literal reading of R1: "take the best bits of what exists and make it hang together". It generalises `tim parity` into `tim backlog` with `git mv`, so history is kept. It turns `increment-build-loop.js` into `backlog.js` and absorbs FA's stages. It renames `journey-builder` to `backlog-distiller` and `build-orchestrator` to `backlog-implementor`. A new-file ledger justifies every file it adds.

- **Schema.** Atoms (`requirements[]`) and buildable increments (`increments[]`) sit side by side. Increments hold `members` only, so an increment's acceptance is always its members' current acceptance, never a stale copy.
- **Its own build backlog is the best demonstration of the design.** It has real atoms, real pass-2 groups with rules, ceilings and attributability, a `declined` list, and one blocked row that carries a question. It is honest that its atoms are unverified.
- **Build side.** `run.json` keeps executor bindings out of the backlog. The drain re-reads bindings every iteration, so "Codex for the rest" works with no relaunch and no nested workflow.
- **R2.** It calls the skills' own routers live: `file-topics.sh`, `bake-rules-bundle.sh --list` and `detect-tech.sh`. Each persona gets an "embedded" section that the skill owns.
- **R3.** `tim backlog rules` resolves the rules for planned files and again for changed files.
- **Stage schemas.** They are held once, in the workflow script, and extracted for Codex by a tested command.
- **Nothing succeeds silently.** It has a full table of silent-success fixes.
- **Parity proof.** It cross-checks each executor's findings against the other's build.

**Weaknesses.**

- The Codex courier is an LLM agent that re-emits `run-stage.sh`'s JSON array. It is a smaller version of the lossy relay R6 complains about. The design names the risk but does not remove it.
- It has one consistency reviewer per change, but the review skill's own granularity is one per repo (`review/SKILL.md:66`).
- The judge stays on Opus by default. R6 allows that ("optionally judge"), but it spends Claude usage.
- Distillation quality levers are thinner than Quality's:
  - no adversarial verification of extracts per source;
  - no trace-matrix closure;
  - no question editor or question critic;
  - no audit of the plan against the row.
- Agents report `rulesRead[]` about themselves, and nothing audits the claim.

**Fatal flaws:** none.

## Quality (requirements and report first)

**Strengths.** This has the strongest requirements-gathering and report quality of the three.

- **Extraction.** Every source's extraction is verified by a different agent (phase 3). A strict trace matrix proves every unit is cited, ruled not a requirement, a side of a conflict, excluded or a duplicate.
- **Completeness proofs.** Ten of them (P1 to P10), all mechanical, all shown in the report.
- **Writer checks.** Confidence is checked against the source's role (`stated` needs a requirement-role source). The writer refuses a row that rests only on constraint sources, which stops recipes coming in through existing code.
- **Questions.** QUESTION_EDITOR clusters, splits, classes and ranks questions by blast radius. QUESTION_CRITIC checks them, plus a mechanical lint.
- **Combining.** COMBINE_VERIFIER checks every group.
- **Build side.** A plan-audit agent reads the row, not the plan's paraphrase of it, and rejects a plan that drops or narrows an acceptance criterion. A fix-verify stage follows the fixer. An independent acceptance stage runs with fresh context.
- **Report sections.**
  - "How this was checked";
  - "Noticed and not raised";
  - acceptance results per criterion for every landed row;
  - a COPY_EDITOR pass over all machine-written prose, alongside CLAIM_VERIFIER.
- **R2.** It has one consistency review per repo, which matches the skill. It uses the skills' own baker unchanged. The embedding rule lives in the stage brief, so the skills need no edit on day one.
- **R6.** Every heavy role can be bound to Codex, including plan-audit and acceptance in fresh sessions. The relay validates output with `tim build stage-result check`. The parity proof is repeated on a combined row.

**Weaknesses.**

- **Its own build backlog does not follow its own two-pass rule.**
  - All 20 rows are `grain: atomic`, and the combination block is empty.
  - Several atom statements are compound ("create, ingest and validate …, refusing …"), which breaks the "and also means two atoms" rule.
  - Every row carries `verifiedBy: design-panel`, `verification: "pending panel review"`. That fakes the very author-and-verifier record its writer is meant to enforce.

  For a design whose selling point is requirement quality, this is a credibility gap.
- **It builds more new surface than it needs to.** It adds new skill names, three new tim module groups (`backlog`, `distil`, `build`) plus `tim rules`, and new workflows, with no `git mv`. It does not use history-preserving evolution.
- **Feasibility risks.**
  - Authors and verifiers both run on Opus, so the Opus fan-out is heavy.
  - The drain relies on nested `workflow()` (the canary comes first, and the fallback is `cadence: one`).
  - It adds more phases.
- **Weak rules check.** It does not check that rules were read. It infers it from findings.

**Fatal flaws:** none that break the design. The self-backlog's failure to exercise pass 2, and its placeholder verification, are the closest thing to an R1 breach, but they sit in the deliverable, not the mechanism.

## Codex (executor parity and operability first)

**Strengths.** This is the strongest answer to R6 and R3.

- **A stage machine in `tim`.** `tim build advance` works from files on disk. Task folders are file-first, and `tim stage accept` issues a receipt for each. Claude output is checked against the same Codex-strict schema, and there is no relay, so nothing is lost in a relay.
- **Prompt parity.** Each task's `prompt.md` must be byte-identical between executors apart from the profile section, and `tim build parity-report` checks it.
- **Reading audit.** It mines Read calls from the Claude transcripts and command lines from the Codex logs. This is the only design that checks rules were actually read.
- **Wider proof.** It uses three canary increments, one per routing family (Node/Nunjucks, Java, Playwright), and cross-examines each run with the other executor's reviewers.
- **Rules resolution.** `tim standards resolve` also returns memory files and lints dead rule pointers.
- **House rules.** It raises the house rules Claude gets from memory, which Codex never sees, as a question for Sam.
- **Codex-orchestrated mode.** The handover for it is generated from the machine itself.
- **Operation ids.** Replayed writes are idempotent.
- **Sandbox.** Review, verify and judge roles run in a read-only sandbox.
- **Guard rails.** A tim test asserts that every workflow's GUARD RAILS text is byte-identical to the canonical doc.
- **Baseline.** A red baseline becomes a hygiene increment, never "pre-existing".
- **Distiller runs on the same machine**, so its heavy phases can also run on Codex.

**Weaknesses.**

- **It rebuilds more than any other candidate.** The whole lifecycle moves into `tim build`: git, octokit, `jira-client`, the ladder, land, push, CI and merge, instead of evolving the loop's proven lifecycle. That is the largest new surface of the three and the most at risk from a big-bang build.
- **Pushes bypass the push hook.** `tim` pushes internally, so the `PostToolUse` push hook no longer fires.
- **Its Sonar stages lean on `sonar`.** The synthesis records `sonar` as not allowlisted for agents, unusable with `--staged` from agents, and returning 403 for the org. The design has a fallback ("owed"), but stage 17 may never run.
- **It rewrites the skills' routing.** The logic in `file-topics.sh`, `bake-rules-bundle.sh` and `detect-tech.sh` moves into `routing.json` files. That touches the review and code-style skills' own tooling, a regression risk those skills do not need in order to satisfy R2.
- **Its own backlog has no pass 2.** Like Quality's, the rows are atoms only, but it says so and lists what it declined to combine.
- **The report and the requirements are good, but not as rich as Quality's.**

**Fatal flaws:** none strictly, but the Sonar stage is probably not runnable as specified.

## Verdict

Reuse and Quality tie on total. **Winner: Reuse.** Two reasons:

1. It honours R1's instruction to build on what exists most literally. Its own build backlog is the only one that actually shows two-pass distillation.
2. Its architecture is the easiest base to graft onto. Quality's levers (extra phases, personas, report sections, build stages) and Codex's (task-folder receipts, prompt parity, reading audit) are additive and fit its skeleton. Grafting Reuse's `git mv` discipline onto Quality or Codex would mean re-architecting them.

With the grafts below, the requirements and report reach Quality's standard, and the Codex path reaches Codex's.

## Grafts into Reuse

From **Quality**:

1. Add an `extract-verify` phase: a different agent per source, a verdict per unit, and "what I searched for".
2. Add `tim backlog trace --strict`, the trace-matrix closure: every unit is cited, ruled not a requirement, a side of a conflict, excluded or a duplicate.
3. Add QUESTION_EDITOR and QUESTION_CRITIC, plus a mechanical question lint. Rank questions by blast radius (increments blocked times reversal cost).
4. Have the writer check confidence against source role, and refuse rows whose evidence comes only from constraint or current-behaviour sources.
5. Add a plan-audit stage in which a different agent reads the row, not the plan, and rejects dropped, narrowed or widened acceptance criteria or lifecycle content.
6. Add a fix-verify stage after fix.
7. Add COMBINE_VERIFIER, and COPY_EDITOR alongside CLAIM_VERIFIER.
8. Run the consistency reviewer once per touched repo, as the review skill does, not once per change.
9. Add report sections "How this was checked" and "Noticed and not raised", show acceptance results per criterion for landed rows, and publish the P1 to P10 proof table.
10. Repeat the parity proof on one combined row as well as an atomic one.
11. Treat "pre-existing" claims as unaccepted unless the failure is reproduced on base.

From **Codex**:

12. Replace the LLM courier's re-emitted array with file-first task folders: `prompt.md`, `output.draft.json`, and `tim stage accept` issuing receipts. Nothing is carried in a relay; the script checks receipts on disk.
13. Check prompt parity: identical prompts apart from the executor profile, checked in the parity report.
14. Audit reading: mine Claude Read calls and Codex log commands against the standards list, instead of trusting `rulesRead[]` self-reports.
15. Use three canary families (Node/Nunjucks, Java, Playwright) for the parity proof, and add the backlog sha check before and after.
16. Include memory and `CLAUDE.md` files in rules resolution. Lint dead rule pointers. Raise the house-rules-in-memory asymmetry as a question for Sam.
17. Add `--op-id` idempotency to every writer command.
18. Run review, verify and judge Codex roles in a read-only sandbox.
19. Add a tim test asserting that the workflow's GUARD RAILS equals the canonical doc.
20. Turn a red baseline into a hygiene increment and hold the current one, never "pre-existing".
21. Generate the Codex-orchestrated handover from the same commands.
22. Put `review.cap` with overflow-with-reason under writer control, never silently clamped.
23. Make the per-role executor profiles named presets (`codex-plan-on-claude`, `codex-review-only`).
