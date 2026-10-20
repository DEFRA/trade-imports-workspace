# Audit of Sam's auto memory: what should move into shared tooling

Read-only audit, 2026-10-16. I read `MEMORY.md` and all 189 topic files in `~/.claude/projects/-Users-samfarrington-git-defra-trade-imports-workspace/memory/`. Nothing was edited. Repo checks were made against the root checkout, which is on `feat/NO_JIRA-design-release-2-1`. Where it mattered, I confirmed the line on `origin/main`.

## Summary

| Class | Count |
|---|---|
| PROMOTE (team rule, not committed or only partly committed) | 92 |
| ALREADY-COMMITTED (delete from memory) | 38 |
| PROJECT-STATE | 36 (31 stale) |
| PERSONAL (keep) | 15 |
| WRONG-OR-STALE (delete) | 8 |

**Memory reaches fewer runs than the brief assumed.** The docs say the main session's auto memory "isn't loaded into subagents; the exception is a fork" (code.claude.com/docs/en/memory, "How it works"). So Sam's own Agent subagents, Workflow agents and Codex never see these rules either. That is why the rules keep getting copied by hand into GUARD RAILS blocks. (Note from the parent session: run 1 of the code-quality investigation found the MEMORY.md index present in workflow subagent transcripts. That contradicts the docs and needs re-checking.)

**Top conflicts**, where Sam's runs and a colleague's behave differently:
1. **Comments.** Memory says remove them aggressively. `code-style.md` §15 allows "why" comments.
2. **Spy assertions and `vi.mock`.** Memory bans both. `node/testing/frontend.md` teaches both.
3. **Seeding and test data.** Memory says never seed journey tests and never use invented data. The Playwright guide says to seed through the API and to use Faker.
4. **Approval on the workspace repo.** Memory says never set `requireApproval`, workspace included. `BUILD.md` says to keep it on the workspace repo.
5. **A blocked increment.** Memory says park it, re-point its dependants and keep building. `BUILD.md` says every failure stops the whole run.
6. **"Pre-existing" test failures.** Memory says they are always ours to fix. The review and code-style skills stop with `CANNOT START: pre-existing test failures` and hand them back to the user.

## Conflicts

| Memory file | Committed doc + line | How runs differ | Fix |
|---|---|---|---|
| `feedback_remove_explanatory_comments` | `docs/best-practices/node/code-style.md:409` "Comments are appropriate for **why**, not **what**" | Sam's agents delete rationale comments. A colleague's agents, and the code-style skill's reviewers, keep or add them. | Rewrite §15 to "near-bare; rationale goes in `docs/`". Add the no-migration-comments rule. |
| `feedback_test_behaviour_not_implementation` | `node/testing/frontend.md:216` `expect(fetch).toHaveBeenCalledWith(`; `:247` "Place all `vi.mock()` calls at the top"; `:312` "Always assert the shape of the call" | Sam: mock at the network boundary, no spy assertions. Colleague: module mocks plus `toHaveBeenCalledWith` (this is what `tim/CLAUDE.md` already bans). | Bring `frontend.md` in line with `tim/.claude/rules/test-patterns.md`. |
| `feedback_never_seed_journey_tests`, `feedback_testdata_page_submits_real_canned_data` | `playwright/BEST_PRACTICES.md:110-115` "Set Up Data via API"; `:125` "Use Realistic Data (Faker)"; `:190` "Hardcoded test data in UI → Slow - use API seeding" | A colleague's agent seeds journey specs with made-up data. Sam's keeps journeys in the browser and uses canned data. | Add a "When to seed" section and a "Test data is copied, never invented" section. Drop the `:190` row. |
| `feedback_never_auto_merge_wait_for_sam` (6 Oct bullet) | `.claude/skills/requirements-pipeline/references/BUILD.md:138` `workspace: {… requireApproval: true }`; `:146` "Keep it on the workspace" (same on `origin/main`) | Following the skill, workspace rows stop at `awaiting-approval`. Sam's sessions strip the setting. | Decide once and edit `BUILD.md`. Then delete the memory bullet. |
| `feedback_platform_blocked_increment_park_and_move_on`, `feedback_defer_access_blocked_increments` | `BUILD.md:598` "Every failure stops the whole run"; `:603` "`ci-red` … not yours to repair. Report the URL" | Sam's runs park the row, re-chain it and relaunch. A colleague's stop and report. | Add a "Platform or access stop" step to `BUILD.md` §3/§4. |
| `feedback_dont_ignore_test_failures` | `review/references/BATCH_IMPLEMENTOR.md:83,122` `CANNOT START: pre-existing test failures` "Ask user to resolve"; `code-style/SKILL.md:471` | Sam's agents fix the failure. A colleague's skill run stops and hands it back. | Make `CANNOT START` mean "fix first, then continue". Add the rule to `CLAUDE.md`. |
| `project_e2e_journey_specs_flaky` vs `feedback_dont_ignore_test_failures` | `BUILD.md:582` "only a transient 500 in `beforeEach` that recovers counts as a pass" | Memory contradicts itself: one file says "don't investigate", the other says "flaky is never an excuse". The loop accepts the narrow case. | Delete the flaky memory. `BUILD.md` already holds the narrow rule. |
| `feedback_prefer_over_nesting` | `code-style.md:275` "Group related utilities in a single module rather than scattering single-function files" | The two produce opposite folder shapes. | Rule on it, then edit §10. |
| `feedback_subagent_permission_prompts` (Cause 1, Cause 4), `reference_prettier_must_run_from_repo_cwd` | `docs/best-practices/skills/patterns.md:66` "Use Glob + Read"; `:63-65` "direct paths to binaries (`<dir>/node_modules/.bin/...`)"; `.claude/settings.json` allows `repos/*/node_modules/.bin/*` | Memory bans the Grep/Glob tools and direct `.bin` binaries, and says prettier run from outside the repo formats differently. The committed guide recommends both. | Re-test the Glob prompt claim. Then fix `patterns.md` §4/§5 and require formatting through `npm --prefix <repo> run format`. |
| `feedback_no_compound_commands`, `feedback_run_tests_to_file` | `.claude/hooks/guard-bash.sh:184-187` "';' and '\|' are intentionally NOT guarded"; `patterns.md:62` "No `&&` / `;` / `\|`" | Colleagues' agents pipe test runs through `tail`, which loses the failure header and reports exit 0. | Add "never pipe a test run; redirect to a file and read it" to `patterns.md` §4. Optionally guard `\| tail` and `\| head` in the hook. |
| `feedback_worktree_when_sharing_branch`, `feedback_explore_main_not_working_checkout`, `feedback_canonical_checkout_is_mine` | Not in `CLAUDE.md`. `docs/reference/openspec.md:28` journey-builder uses `workspace-worktree` | Memory says no worktrees, then "fresh clone of main", then "no side clones". The memories contradict each other, and the skill uses a worktree. | One rule in `CLAUDE.md` rule 2/3: branches in `repos/`, a read-only clone for exploration, the journey-builder worktree as the named exception. |

## PROMOTE, grouped by destination

**`docs/best-practices/node/code-style.md`**

| Memory | Rule | Says today |
|---|---|---|
| `feedback_remove_explanatory_comments` | Code near-bare of comments; rationale lives in `docs/` | Conflicts (§15) |
| `feedback_no_migration_comments` | No "renamed from" or "used to be" notes in code, config or docs | Nothing |
| `feedback_explicit_names_no_metaphors` | Name by behaviour, not metaphor (`excludeGhPagesFromFetch`, not `lightenRemote`) | §6 says "reveal intent", but has no metaphor rule |
| `feedback_prefer_over_nesting` | Prefer deeper folders | Conflicts (§10) |
| `feedback_npx_use_scoped_names` | `npx @scope/pkg` only; unscoped names are squatted | Nothing |

**`docs/best-practices/node/testing/frontend.md`, `java/testing/*.md`**

| Memory | Rule | Says today |
|---|---|---|
| `feedback_test_behaviour_not_implementation` | Test input and output; mock at the network boundary | Conflicts |
| `feedback_no_coverage_padding_tests` | An assertion must pin what the test name claims; check JaCoCo phase binding first | Nothing |
| `feedback_no_per_enum_round_trip_tests` (`java/testing/unit.md`) | One round-trip test plus one unknown-value test per enum | Nothing |

**`docs/best-practices/playwright/BEST_PRACTICES.md`**

| Memory | Rule | Says today |
|---|---|---|
| `feedback_never_seed_journey_tests` | Seed only the set-up for a one-page assertion; behave the same on compose and CDP | Conflicts |
| `feedback_testdata_page_submits_real_canned_data` | One builder per page; values copied from real canned data | Conflicts (Faker) |
| `feedback_assert_full_dom_dont_filter_dividers` | Assert the full rendered list, divider included | Nothing |
| `feedback_preserve_assertion_intent` | Fix a flake with `expect.poll`; never delete the assertion | Nothing |
| `feedback_no_tolerance_based_layout_tests` | Visual baselines or binary checks, never pixel tolerances | Nothing |
| `feedback_keep_real_env_coverage_over_speed` | Never drop CDP coverage for time; give a slow test its own timeout | Nothing |
| `feedback_merge_ported_specs_need_live_dom_verification` | Run each ported spec live, serially, in the same pass | Nothing |
| `feedback_e2e_test_results` | Diagnose from `test-results/*/error-context.md`, not console output (fix the stale `test:local` name) | Nothing |
| `feedback_never_skip_e2e` | Never skip E2E as "test-only" or "pure refactor" | Nothing (personas only) |
| `project_e2e_worker_scaling_matrix` | 16 workers; never raise timeouts to fix queueing | Nothing |

**`docs/best-practices/java/modern-java.md`**

| Memory | Rule | Says today |
|---|---|---|
| `feedback_java_record_null_guards` | Public boundary records get `requireNonNull` compact constructors | `:37-42` shows the pattern but not when it is required |

**`docs/best-practices/node/govuk-frontend.md` or `gds/components.md`**

| Memory | Rule | Says today |
|---|---|---|
| `feedback_govuk_toolbox_only` (the JS part) | Pages work fully without JS. Triage each prototype JS behaviour: GOV.UK Frontend, then another government library, then "do we need it?" | `.claude/rules/gds.md` covers "no custom CSS". `gds/accessibility.md:26` lists progressive enhancement. No triage rule. |

**`docs/best-practices/jira/ticket-conventions.md`, `ticket-creator`, `ticket-refiner`**

| Memory | Rule | Says today |
|---|---|---|
| `feedback_tickets_problem_and_recommendation_not_history` | Need, short background, recommendation, scope, acceptance criteria; link the audit | Template only (`assets/templates/task.md`) |
| `feedback_tickets_list_open_questions_not_done` | Acceptance criteria hold open items only; findings go in the description | Nothing |
| `feedback_architecture_tickets_pose_questions_not_moves` | Architecture tickets: scope is questions, acceptance criteria is an ADR | Nothing |
| `feedback_jira_wiki_not_markdown` (escaping) | Escape `[`, `]` and `\|`; never start `{{` with a hyphen; grep for `class="error"` | Wiki markup is used; the escape rules are missing |
| `reference_jira_no_wont_do_transition` | No "Won't Do" transition on EUDPA; never close as Done to tidy the board | Nothing |
| `project_eudpa_board_no_sprints` | Scope by date range, not sprint | Nothing |
| `feedback_refinement_plan_heavy_apply_light` (`ticket-refiner` verdict table) | Plan-heavy, apply-light work is READY, not SPIKE REQUIRED | `:172` "Too many unknowns" only |
| `feedback_dont_defer_obvious_improvements`, `feedback_no_manual_browser_verification` (`ticket` plan template) | Pick the free better option now; verify with E2E, never manual browser steps | Nothing |

**`.claude/skills/review/SKILL.md`**

| Memory | Rule | Says today |
|---|---|---|
| `feedback_verify_head_before_reviewing_and_posting` | Re-fetch `headRefOid` before the review and before posting; state the SHA reviewed | Nothing |
| `feedback_engineering_review_means_patterns_fix_dont_ask` | Engineering review checks house patterns; fix, then report | Nothing |
| `feedback_feature_folders_independent_by_design` | Never DRY across feature controllers; declare duplication to Sonar instead | Nothing (also belongs in animals-frontend `app/docs/decisions.md`) |
| `feedback_spec_stop_conditions_not_self_enforcing` | After a stop-condition build, diff for a changed expected value on an unchanged set-up | Nothing |
| `feedback_dont_defer_build_config_for_feature_bundles` | A new client bundle's webpack entry is load-bearing | Nothing |

**`.claude/skills/requirements-pipeline/references/BUILD.md`, `DISTIL.md`**

| Memory | Rule | Says today |
|---|---|---|
| `feedback_platform_blocked_increment_park_and_move_on` | Park a platform-blocked row and re-point its dependants | Conflicts |
| `feedback_defer_access_blocked_increments` | Defer an access stop, chain its dependants, relaunch | Conflicts |
| `feedback_fix_the_factory_dont_work_around` | Never build a row by hand outside the loop | Nothing |
| `feedback_planning_cost_is_right` | Look for savings in overhead, never in the plan stage | §3c telemetry; nothing on this |
| `feedback_never_idle_between_increments`, `feedback_no_increment_budget_keep_going` | Relaunch before summarising; never hand over because of a count | Nothing |
| `feedback_track_deferred_tickets` | `deferred.md` beside `backlog.json` | §3b sweeps `DEFERRED:` into rows; no register |
| `feedback_no_backporting_new_programmes`, `feedback_sweep_after_every_reversal`, `feedback_prototype_authority_look_and_feel_only` (`DISTIL.md`) | Read old work as a source only; sweep every artefact after a reversal; the prototype governs look and feel only | Nothing |

**`docs/agent-skills.md`, `docs/best-practices/skills/patterns.md`**

| Memory | Rule | Says today |
|---|---|---|
| `feedback_subagent_permission_prompts` | GUARD RAILS block first in every spawn prompt | Partly (patterns §4); conflicts on Glob and `.bin` |
| `feedback_workflow_prompts_leak_abs_paths` | Keep the absolute path out of Bash examples; two constants | Nothing |
| `feedback_subagent_model_selection` | Set `model` on every Agent call: haiku, sonnet or opus | `BUILD.md:80-89` for the loop only |
| `feedback_deterministic_steps_in_tim_cheap_runner` | Mechanical steps become tim commands run by a "run this" Haiku agent | Nothing |
| `feedback_best_output_not_cheapest`, `feedback_build_cost_is_not_a_criterion` | Judge tooling on run-time quality; never on diff size; no gold-plating | Nothing |
| `feedback_verify_subagent_failure_claims` | Reproduce "environmental" claims in the parent shell | Nothing |
| `feedback_never_bypass_deny_rules`, `feedback_dont_smuggle_hacks_back_in` | Never re-route around a denial | Nothing |
| `feedback_git_rm_for_recursive_deletes` | `git rm -r -f -q` is the sanctioned tree delete | Deny exists in settings; no alternative given |
| `reference_new_executables_chmod_and_guard`, `reference_write_tool_drops_execute_bit` | `update-index --chmod=+x`, `checkout --`, commit before running | Hook messages only |
| `feedback_cannot_observe_permission_prompts` | Never claim a command didn't prompt | Nothing |
| `feedback_repo_checkouts_move_mid_session`, `feedback_check_live_branch_before_following_handover` | Pin HEAD before reading; check the live branch before following a handover | Nothing |
| `reference_claude_rules_paths_glob_native` | Rules fire on Read only; Codex gets none of them, so hand Codex the paths | Nothing |
| `feedback_subproject_claude_rails_first` | Phase 0 of a sub-project is `CLAUDE.md`, settings and hooks | Nothing |
| `feedback_run_tests_to_file` | Redirect test output to a file; never pipe it | Conflicts with the hook |

**Workspace `CLAUDE.md` (load-bearing rules)**

| Memory | Rule | Says today |
|---|---|---|
| `feedback_dont_ignore_test_failures` | Red on your branch is yours to fix | Nothing |
| `feedback_never_auto_merge_wait_for_sam` | Hand-raised PRs merge only on the user's go | Nothing |
| `feedback_no_ai_on_cdp_platform_repos` | No AI writes to `cdp-app-config` or other CDP platform repos | Nothing |
| `feedback_keep_ticket_prefix_on_split_branches`, `feedback_stack_programme_on_one_branch`, `feedback_worktree_when_sharing_branch` | Branch rules | Rule 2 covers naming and parity only |
| `feedback_canary_first_rollout` | Canary one target, then verify every target | Nothing |
| `feedback_extend_tool_not_oneoff` | Extend tim or `tools/`; no ad-hoc curl | Nothing |
| `feedback_workspace_config_shareable_committed` | Workspace config is committed and portable | Nothing |

**`docker/stack/AGENTS.md`**

| Memory | Rule | Says today |
|---|---|---|
| `feedback_host_docker_internal_routing_essential`, `feedback_keep_host_docker_internal_routing` (duplicates) | Never reroute; fix in the client with a connect timeout and one retry | `:299` documents the hostnames, not the rule |
| `feedback_dont_build_on_broken_stack` | An unhealthy container blocks all work | Nothing |
| `feedback_workspace_stack_dev_mode_for_verification` | Prove dev mode with `docker inspect` before verifying (drop the stale `bounce-backend` advice) | `:52` and `:279` cover the mode, not the proof |
| `project_nunjucks_cache_dev_mode` | Why dev mode turns the cache off; never set `NODE_ENV=production` | Env vars only |

**`docs/best-practices/github-actions.md`, `docs/reference/e2e-domain-coverage.md`**

| Memory | Rule | Says today |
|---|---|---|
| `reference_ci_workflow_run_sha_and_publish_gate` | A `workflow_run` E2E stamps main's SHA; under 15 seconds means a bad tests image; re-run does not refresh the badge | Nothing |
| `reference_cross_repo_latest_image_race` | `:latest` fallback race; prove it with control runs | Nothing |
| `reference_no_pr_runs_when_conflicting` | A conflicting PR gets no runs; `workflow_run` uses main's copy of the workflow | Nothing |
| `reference_lighthouse_red_on_branch_behind_main` | Merge main before diagnosing a Lighthouse seed 400 | Nothing |
| `feedback_pipeline_calls_named_ci_script` | CI calls `npm run test:ci -- <dynamic args>` | Nothing |

**Other destinations**

| Memory | Rule | Destination | Says today |
|---|---|---|---|
| `project_frontend_alignment_no_extraction` | Three frontends stay duplicated; manage drift | `docs/repos/architecture-overview.md` | Nothing |
| `project_sandbox_breaks_dev_loop` | Bash sandbox rejected; deny list plus hooks instead | ADR under `docs/adr/` | Nothing |
| `reference_frontend_pinned_npm_version` | Install under the pinned `npm@11.6.2` | `docs/repos/trade-imports-animals-frontend.md` | Not checked in detail |
| `reference_cdp_local_run_needs_developer_api_key` | `CDP_LOCAL` plus `DEVELOPER_API_KEY` | Tests repo README | README omits it, per the memory |
| `reference_cdp_new_service_redeploy_for_routing`, `reference_nojs_cdp_uploader_pattern` | CDP runbook facts | `docs/` runbook, `node/hapi.md` | Nothing |
| `reference_jira_assign_mechanism` | No assign path exists | Add `tim jira assign` | tim has no assign command |
| `project_gb_notification_playwright_demo` | Prototype Kit driving gotchas | `prototype/references/port-a-kit-page.md` | Not checked |

## ALREADY-COMMITTED (delete from memory)

- `feedback_build_loop_rollback_non_destructive`: `increment-build-loop.js:1423`.
- `feedback_parent_orchestrates_never_implements`: `BUILD.md:859`.
- `feedback_unattended_build_no_human_gates`: `BUILD.md:609-613`.
- `feedback_full_stack_slices_not_layer_increments`, `feedback_big_design_up_front_not_the_way`: `SHAPE.md:92`.
- `feedback_distil_depth_per_source`: `DISTIL.md:255`.
- `feedback_question_is_not_a_ruling`: `DISTIL.md:358` (rulings recorded verbatim).
- `feedback_codex_first_class_executor`, `reference_codex_orchestration_pattern`: requirements-pipeline `SKILL.md` and `workflow/codex/`.
- `reference_workflow_name_uses_stale_snapshot`, `reference_workflow_session_limit_resume`: `scriptPath` and `resumeFromRunId` in `BUILD.md` and `DISTIL.md`.
- `reference_opus_session_limit_under_fanout`: `DISTIL.md` "six at a time".
- `feedback_reports_gds_succinct`: requirements-pipeline `references/REPORT.md`.
- `feedback_lean_skill_means_narrow_scope`: `skills/patterns.md:164`.
- `feedback_claude_rules_are_rules_not_catalogues`: `CLAUDE.md` "Reference catalogues".
- `feedback_libraries_not_cli_wrappers`: `tim/CLAUDE.md` hard rules.
- `feedback_no_compound_commands`: `guard-bash.sh:202` and `patterns.md:62` (the pipe nuance is in the conflicts table).
- `feedback_use_tilde_in_bash`: `guard-bash.sh:160`.
- `feedback_use_standard_test_script`: `guard-bash.sh:165` and `.claude/rules/playwright.md`.
- `feedback_no_workspace_envvar`: `CLAUDE.md` rule 1 and `skills/anti-patterns.md` A10.
- `feedback_node_over_python`, `feedback_node_via_npm_script`: `settings.json` deny list.
- `feedback_no_sonar_cd_in_workflow_agents`: `patterns.md:63` and the pre-push hook.
- `feedback_use_stack_scripts_not_raw_compose`: `docker/stack/AGENTS.md`.
- `feedback_use_tim_for_stack_ops`: `CLAUDE.md` tim section.
- `feedback_rest_nouns_not_action_paths`: `rest-api.md:29-31`.
- `feedback_review_check_merge_conflicts`: review `SKILL.md:483-519`.
- `feedback_no_display_logic_in_the_model`: `app/docs/obligation-model.md:54` and frontend-change `SKILL.md:214`.
- `feedback_pipelines_need_named_helpers`: `code-style.md` §5 and §9. The memory's "17-rule guide" is wrong; it has 16 rules.
- `feedback_jira_blocks_link_direction`: `tools/jira/link-tickets.sh:55-56` (`tim jira link` only does Relates).
- `feedback_no_seo_in_lighthouse`: `lighthouserc.cjs:43-45`.
- `reference_backend_mvn_verify_for_its`: `java/testing/integration.md:9-21`.
- `reference_floci_latest_dropped_curl`: `infrastructure.compose.yml:44`.
- `reference_reference_data_needs_mdm_stub`: `backend.compose.yml:83`.
- `reference_sonar_analyze_unavailable`: `CLAUDE.md` SonarCloud section.
- `reference_playwright_trace_cli`: `playwright-trace` skill.
- `project_oidc_single_origin`: `AGENTS.md:291-325`.
- `project_rosetta_translation_cache_oom`: arm64 fix landed.

## WRONG-OR-STALE (delete)

- `feedback_npm_prefix_symlink_lockfile`: the workspace has been a real clone, not a symlink, since 18 Aug (`project_workspace_repo_migration`).
- `feedback_repo_shorthand`: says "tests" means `trade-imports-animals-tests`; the repo is now `trade-imports-ins-tests`.
- `feedback_e2e_is_quick`: names the retired `test:local` and the old tests repo; folded into `never_skip_e2e`.
- `feedback_mirror_existing_frontend_no_gold_plating`: about the standalone prototype, which has been retired.
- `feedback_unattended_merge_on_green`: per-programme ruling, superseded by `BUILD.md:97`.
- `project_dev_mode`: describes `make docker-compose-dev`, `local.dev.compose.yml` and no backend hot-reload; `AGENTS.md:274` now says DevTools hot-reloads.
- `project_frontend_test_3100_duplicate`: `:3100` and `test-target` no longer exist in `docker/stack` or `scripts/stack`.
- `project_e2e_journey_specs_flaky`: contradicts the test-failure rule; `BUILD.md:582` holds the narrow version.

## PROJECT-STATE

These belong in a workarea `HANDOVER.md` or Jira, not memory.

- **Stale (31):**
  - `project_address_book_eudpa58`: superseded.
  - `project_cdp_e2e_timeouts_mask_and_root_cause`: says "awaiting merge" as of 15 Sep.
  - `project_chedd_trace_requirements`, `project_chedp_trace_requirements`, `project_chedpp_trace_requirements`, `project_iuu_trace_requirements`: parked since July; handovers are in `workareas/shared/trace-requirements/`.
  - `project_design_release_2_1_parity`: superseded by `project_dr21_combined_review`.
  - `project_design_release_2_parity`, `project_dr1_parity_run`, `project_dr1_build_loop_throughput`, `project_eudpa328_decision_visual_evidence`, `project_report_v2_answers_and_branch_collision`: all historical.
  - `project_designer_prototyping_suite`, `project_plants_prototype_setup`, `project_distil_workflow`, `project_frontend_alignment_run`: merged.
  - `project_requirements_pipeline`: says "#56 awaiting approval", but #56 merged as `545f5fbb` on 22 Sep.
  - `project_high_risk_plants_build_phase`: says 36/62; the backlog now shows 57 done.
  - `project_high_risk_plants_digest_eudpa409`: historical.
  - `project_ins_performance_testing`: says 10/19; the backlog now shows 19 done of 23.
  - `project_live_animals_cleanup_v2_decisions`, `project_live_animals_m1_decisions`, `project_live_animals_persistence_build_decisions`, `project_live_animals_prototype_programme`: prototype retired.
  - `project_model_retrofit_eudpa288_phase7`, `project_parity_restore_apiseed_cannot_save`, `project_plant_products_chedpp`, `project_promotion_p101_option_e`, `project_import_type_selection_move`: historical.
  - `project_workspace_repo_migration`: done; the old checkout and the old memory directory both still exist on disk.
  - `reference_build_loop_local_lifecycle_snagging`: its handover `workareas/shared/plants-snagging/README.md` no longer exists (only `logs/` remains).
- **Probably stale (unverified):**
  - `project_eudpa130_validation_two_prs`: which of the two PRs the team picked is unknown.
  - `project_obligation_graph_exporter`: the script was uncommitted on 10 Sep.
- **Current (3):**
  - `project_dr21_combined_review`: 13 Oct; `LAYERS-PLAN.md` already holds the state.
  - `project_mandatory_proceed_vs_submit_eudpa667`: the ticket owns it.
  - `project_parallel_alt_stacks_eudpa359`: the plan is in Jira, plus an uncommitted plan file.

Two problems in the memories themselves:
- One live-animals memory carries an open security finding. It belongs in a Jira ticket, not memory (details kept out of this public file).
- Dangling links: `project_unattended_workflows_stall_on_ask`, `project_eudpa_161_lighthouse_ci` and `project-career-evidence-dossier` do not exist.

## PERSONAL (keep)

- `user_career_positioning_renewal_2026`
- `feedback_cv_headline_altitude`
- `reference_voicemode_whisper_welsh_fix`
- `feedback_reference_by_headline_not_ticket_number`
- `feedback_updates_stand_alone`
- `feedback_report_progress_count_on_landing`
- `feedback_reports_open_items_only_at_top`
- `feedback_no_time_estimates`
- `feedback_headless_make_calls_dont_gate`
- `feedback_diff_first_dont_investigate`
- `feedback_block_narrowly_build_for_change`
- `feedback_tim_keep_ink_ui`
- `feedback_canonical_checkout_is_mine`
- `feedback_user_owns_all_repos`
- `feedback_perftests_repo_merge_without_asking`

## Growth

**Count.** 189 topic files plus `MEMORY.md`, about 900 KB in total. The index is 119 lines and 19.5 KB, against a load limit of 200 lines or 25 KB. Past that limit, entries are dropped at load without warning.

**Files by month of last write.** Claude rewrites files in place, so these are write dates, not creation dates.

| Apr | May | Jun | Jul | Aug | Sep | Oct (1–16) |
|---|---|---|---|---|---|---|
| 6 | 21 | 14 | 38 | 31 | 57 | 22 |

That is about 2 files per working day since July. Two duplicates were written in the same minute on 11 Oct (`host_docker_internal_routing_essential` and `keep_host_docker_internal_routing`).

**What the settings allow** (code.claude.com/docs/en/memory, "Enable or disable auto memory"):
- `"autoMemoryEnabled": false` works in user settings (the `/memory` toggle writes it to `~/.claude/settings.json`) or in a project's settings to turn it off for that project.
- The environment variable `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` does the same.
- `autoMemoryDirectory` relocates the store. Do not point it into the repo: the workspace repo is public.
- There is **no setting that limits memory to some types**. The four types (`user`, `feedback`, `project`, `reference`) are all written.
- The main session's memory never loads into subagents, only into forks.

**Recommendation:**
1. **Setting.** Put `"autoMemoryEnabled": false` in the committed workspace `.claude/settings.json`, so it is the same for everyone. Move the 15 PERSONAL items into `~/.claude/CLAUDE.md`. That file is hand-owned, loads every session, and is never written mid-session.
2. **Hook, if Sam wants to keep auto memory on.** Add a committed `PreToolUse` hook on `Write|Edit` that denies writes under `~/.claude/projects/*/memory/` when the frontmatter `type` is `feedback`, `project` or `reference`. The deny reason names where the rule goes instead: a `docs/best-practices/` section, `.claude/rules/`, a skill, or a workarea `HANDOVER.md`. This is the same pattern `guard-bash.sh` uses to redirect unattended agents.
3. **Habit.** Add a `CLAUDE.md` load-bearing rule: "A correction about code, tests, tooling or process is a repo edit — propose the change to its committed home and commit it. A programme's state goes in its workarea handover." The docs say Claude skips saving anything `CLAUDE.md` already says, so promoting the rules also stops new duplicates.

**Out of scope, but noticed:**
- `.claude/rules/k6.md` says "no k6 scripts exist yet", but `trade-imports-performance-tests` exists.
- `CLAUDE.md` names `tools/sonar/sonar-push-check.sh`, while `settings.json` runs `scripts/sonar/sonar-push-gate.sh`.
