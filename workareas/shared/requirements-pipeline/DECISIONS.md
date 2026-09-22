# Decisions: plumbing the distil and build pieces

Each entry: the choice, then how to reverse it. Written while Sam was asleep, 21–22 September 2026.

## The backlog shape

- **D1. The one shape is the trace backlog's row plus `detail`, `sources`, `repos` and `openQuestions`.** The loop, build-orchestrator and the four trace backlogs already read `id`, `title`, `kind`, `dependsOn`, `acceptanceCriteria` and `status`, so no existing reader changes meaning.
  Reverse: edit `docs/reference/backlog-shape.md` and `tim/src/backlog/shape.js` together.
- **D2. The requirements-v2 atoms/increments profile is left in place but is not the one shape.** It is tested and registered, and nothing on this branch builds from it. Its fields (`members`, `outcome`, `why`, `surface`) are not what the loop reads.
  Reverse: point `tim backlog check` at the v2 parser instead, and teach the loop `outcome`/`why`.
- **D3. `tim backlog check` refuses the four recipe fields (`filesToTouch`, `verification`, `recipe`, `implementorSkill`) on a row.** The loop still reads a legacy backlog that has them, as hints, so no other programme breaks.
  Reverse: delete `RECIPE_FIELDS` from `shape.js`.
- **D4. No deterministic layer-split check.** The stashed attempt (inc-011) was 3,400 lines and unfinished. The distiller's consolidate step and its verifier refuse layer splits in the prompt instead, and `repos` lists every repo a slice touches.
  Reverse: pop the useful parts of `stash@{0}` into `shape.js`.

## The builder

- **D5. The plan stage runs on Claude (heavy tier) in both executor modes.** Implement, review and fix still go to Codex in Codex mode. A Codex plan brief is a suggestion, not built (Codex is available, not preferred).
  Reverse: add a `plan` entry to `CODEX` in the loop and a `codex/plan.md` brief.
- **D6. The plan is written to `<workarea>/plans/<id>.md` and re-planned on every attempt.** The path is fixed, so there is no pointer to lose (frontend-alignment's `planFile` defect). A retry plans against the live tree, which is the point of planning just in time.
  Reverse: skip the plan stage when the file exists.
- **D7. Every changed file is still reviewed.** frontend-alignment's `reviewFocus` cap was not lifted: it trades review coverage for cost, and the loop's reviewers are already per file.
  Reverse: add `reviewFocus` to `PLAN_SCHEMA` and slice `reviewTargets` by it.
- **D8. The ladder is the plan's section 6, which must include each touched repo's own gate and the slice's integration proof.** The row carries no commands. The ladder agent refuses a plan whose ladder leaves out a touched repo.
  Reverse: restore the `verification` wording in the ladder stage.
- **D9. A row's repos come from `repos`, else legacy `repo`, else all three configured repos.** The `band` routing is gone: over-listing a repo costs nothing (no change, no commit, no PR), and a slice should not be narrowed by a guess.
  Reverse: restore STEP 7's band table in the ticket stage.
- **D10. New required arg `planOnly`.** `true` runs the plan stage and stops, with no ticket, branch, baseline or build. It is how the plan stage is proved without building product.
  Reverse: remove `planOnly` from `ALWAYS_REQUIRED` and the early return.
- **D11. Loop stages write the backlog through `tim backlog set`, not by hand-editing JSON.**
  Reverse: restore the Edit-and-`jq empty` wording.
- **D20. The ladder checks every red rung against the baseline logs, owns the workspace stack, and review fans out per (repo, language) group, not per file.** From the hrp-origin-v2 inc-001 post-mortem. The implementor started the stack for E2E and left it up; `errors.test.js` (expects nothing on :8086) went red and the stack's plants-frontend held :3003, so FIT could not start. The fixer diagnosed both, but its notes never reached the ladder, which called the red "pre-existing", made no repair, backgrounded `tim docker dev &`, never re-ran E2E and ran `format` in write mode. Review spawned a style and a code reviewer per file: 87 agents, 81% of fresh tokens, 29 empty results. Now: the ladder is the only stage that starts the stack (foreground `tim docker dev`, then `tim docker down`), checks the ports a unit or FIT rung needs and stops the stack if it holds them; it is given the baseline log paths, the implementor's and fixer's notes, re-runs every rung after any repair, never backgrounds, and runs format in check mode. "Pre-existing" needs the same failure in the baseline log. The planner's section 6 uses the repo's CI-named scripts and reads the ports from playwright/vitest config. Review is one style reviewer (none for docs) and one code reviewer per group, split at 12 files, verifiers grouped the same way: `16 + 3g` agents, typically 22–34.
  Reverse: restore per-file `styleReviews`/`codeReviews` and the per-file verifier map in `increment-build-loop.js`, drop `STACK_RULE`, `baselineLog`, `earlierFindings` and the ladder bullets that use them, and revert the matching lines in `codex/{fix,implement,review}.md`, `README.md` and `BUILD.md`.
- **D21. Codex keeps to the run's branch, reviews at Claude's granularity, and every stop after implement preserves the attempt.** From the hrp-origin-codex inc-001 run (executor codex, lifecycle local, branch `spike/hrp-origin-codex`). Implement and a green ladder (backend verify, frontend unit and FIT, E2E 67 passed) were good, but the Codex fix stage cut `spike/hrp-origin-codex-inc-001` in the backend "because no separate increment branch existed" and staged its fixes there; land correctly refused, and the loop only recorded `land-failed`, leaving staged work the next baseline would refuse. Codex review was one run over the whole change and returned 1 finding, where the grouped Claude review of the same increment returned 21 raw and 3 confirmed. Now: `codex/fix.md` and `codex/review.md` carry `implement.md`'s rule (every repo is on `<branch>`; never switch or create one); a light branch guard runs after every codex stage and before land in both executors, moves a repo that is on another branch at the same commit back with `git checkout <branch>`, and otherwise stops; land-failed, off-branch, and a codex review or fix with no result all go through `preserveWork`, like ladder-red. Codex review fans out one run per (repo, language) group with that group's personas (style and code; code alone for docs) bound as `<personas>` and its files as `<reviewFiles>`, plus one consistency run, all relayed through the findings schema into the same verify and judge path (R6). Codex is at most `23 + 3g` agents, Claude `17 + 3g`.
  Reverse: restore the single `codexStage(id, 'review', …)` call and `codexResult` throws, drop `branchGuard`, `offBranch`, `preserveAttempt` and the land-failed preserve in `increment-build-loop.js`, drop the branch rule and `<personas>`/`<reviewFiles>` from `codex/{fix,review}.md`, and revert the counts in `README.md` and `BUILD.md`.

## The distiller

- **D12. `distil` is a skill run from the main session with Agent subagents, not a new Workflow script.** Extract and verify fan out one agent per source; reconcile, consolidate and report are one agent each. The main session checks each step on disk.
  Reverse: wrap sections 1–5 of `.claude/skills/distil/SKILL.md` in a workflow script.
- **D13. A trace set is read from its mined, verified output, not re-mined.** The trace-to-requirements workflow stays the trace extractor; `distil` runs it only for a set that has not been mined.
  Reverse: have the extractor re-run the trace workflow every time.
- **D14. Journey-builder's extractor method and reconciler ground rules are reused by path; its obligations-model mapping and `journey-spec.json` store are not.** That store has no home for backend, tooling or cross-repo requirements (synthesis §2.1 step 3).
  Reverse: have the reconcile step write `journey-spec.json` through the `spec-add-*.sh` scripts.
- **D15. Every question carries a default, and a row whose question has a default is `todo`, not `blocked`.** The trace runs over-gated (CHED-P blocked 74 of 108 rows). A row is `blocked` only when there is no safe default.
  Reverse: the consolidate rule in section 4 of the skill.
- **D16. Rows carry optional `requirements` ids, and coverage (each adopted requirement in exactly one increment) is two `jq` lines in the skill.** A candidate for `tim backlog check --requirements`, not built.
  Reverse: drop the field and the two checks.

- **D18. The target code and its rulings ledger are always a DISTIL source, and every adopted requirement carries a `delta` (`new`, `change`, `exists`); `exists` rows go to the report as already met, never into an increment.** The hrp-origin proof distilled a trace slice and a Confluence page without reading `repos/trade-imports-plants-frontend`: the plan stage found inc-001 and inc-002 mostly built, and inc-002's "choose one of 4 categories" contradicted the 9 statutory categories already ruled there (d-019, d-026, d-029, c-007). A clash with a ruling defaults to keeping the ruling.
  Reverse: drop the "target is always a source" intake rule, the target extract rule, `delta`/`deltaNote` and the "Already met" report section from `references/DISTIL.md`, and the line in `SKILL.md`'s phase table.
- **D19. The skill works out the target repos and the precedence; the person prompting gives only the goal and the sources, plus the lifecycle and, under `full`, the epic.** Sam: "Why should the person prompting need to know what repos are building? The workspace has all the context of all the repos and what they do." DISTIL intake derives `repos` from `CLAUDE.md`'s repo map, `docs/repos/` and each candidate's README and CLAUDE.md, always adds the tests repo, records a `reposWhy` line, and states the choice in the report's first lines so a wrong guess is caught. It asks only when two repo families fit the goal equally. Precedence defaults to the target's rulings, then policy, then signed-off design, then an old system's traces or behaviour. The backlog envelope carries an optional `repos` table (path and GitHub slug per key, the slug from the repo's origin remote), so BUILD passes it to the loop without asking; `scope` is the programme name, and a local run's `spike/<programme>` branch is cut by the orchestrator in each target repo, because the loop refuses to start unless every repo is already on it.
  Reverse: restore the `repos` and `precedence` questions in `references/DISTIL.md` intake, drop the envelope `repos` from `references/backlog.schema.json` (and the `additionalProperties` phrase in `tim/src/backlog/shape.js`), the derive rules in `references/BUILD.md`, and put the repos and precedence back in `QUICKSTART.md`'s prompts.

## The layout

- **D17. The shape doc, the distil skill, the build-orchestrator skill, the build loop and its Codex briefs are one skill, `.claude/skills/requirements-pipeline/`, with a DISTIL and a BUILD phase.** They were one coupled system in five places; the paths D1–D16 name are the pre-D17 ones (`docs/reference/backlog-shape.md` → `references/SHAPE.md`, `skills/distil/SKILL.md` → `references/DISTIL.md`, `skills/build-orchestrator/SKILL.md` → `references/BUILD.md`, `.claude/workflows/{increment-build-loop.js,codex/}` → `workflow/`).
  Reverse: `git mv` each file back, restore the two SKILL.md frontmatters and the `distil` row in `CLAUDE.md`, and drop the skill-workflow scan from `tim/src/backlog/workflow-contract.test.js` and the path from `tim-ci.yml`.

## Suggestions, not built

- A Codex plan brief (D5).
- More than three repo keys in the loop's `repos` table (reference-data, stub, gateway). R7 wants any repo a slice needs; the loop only has frontend, backend and tests. No slice has needed a fourth yet.

## Waiting for Sam

- Nothing. The `distil` row went into `CLAUDE.md`'s skill index in `d73a42ed`. PR #56 is raised.
