# Worker references (per-skill fan-out personas)

Long-running fan-out workers live as `references/<NAME>.md` prose inside
the owning skill and are spawned as `general-purpose` Task subagents
(`Follow ~/git/defra/trade-imports-workspace/.claude/skills/<owner>/references/<NAME>.md.`).
`general-purpose` carries `Tools: *` so workers can write the on-disk
artifacts that downstream `tools/` scripts consume.

| Owner skill | Worker reference | Used for |
|---|---|---|
| `review` | `references/FILE_REVIEWER.md` | Per-file review (parallel, up to 10) |
| `review` | `references/CONSISTENCY_REVIEWER.md` | Per-repo consistency check |
| `review` | `references/REVIEW_ITEM_FIXER.md` | One Fix-disposition item at a time |
| `code-style` | `references/STYLE_FILE_REVIEWER.md` | Per-`.js` file style review |
| `code-style` | `references/STYLE_WALKER.md` | Batch triage walker for pending items |
| `code-style` | `references/STYLE_IMPLEMENTOR.md` | Per-file batched style fixes |
| `npm-upgrade` | `references/PACKAGE_PLANNER.md` | Per-package research + auto/manual classification |
| `npm-upgrade` | `references/WALKER.md` | Batch triage walker over manual + failed-auto packages |
| `npm-upgrade` | `references/MANUAL_UPGRADE_IMPLEMENTOR.md` | One manual package upgrade at a time (edit + test + commit + rollback) |
| `govuk-upgrade` | `references/VERSION_PLANNER.md` | Per-version CHANGELOG analysis + per-repo plan |
| `govuk-upgrade` | `references/PLAN_WALKER.md` | Batch triage of pending version plans before Phase 3 |
| `skill-creator` | `references/AUDITOR.md` | Per-skill 8-pattern audit (parallel fan-out across all skills) |
| `skill-creator` | `references/INTERVIEWER.md` | Parent-loaded CREATE-mode interview (8 shape questions → `decisions.json`) |
| `understanding-check` | `references/ANALYST.md` | Per-repo diff analyst — emits `analysis.{repo}.json` (one per repo, parallel) |
| `understanding-check` | `references/QUESTION_GENERATOR.md` | One-shot — combines all per-repo analyses into `questions.json` |
| `understanding-check` | `references/SCORER.md` | Per-question scorer — must quote the rubric clause that fired (one per question, parallel) |
| `journey-builder` | `references/SOURCE_EXTRACTOR.md` | Per-source extraction of a target's requirement sources into `extract.<source>.json` (one per source, parallel) |
| `journey-builder` | `references/SPEC_RECONCILER.md` | One-shot — reconciles the extracts into `journey-spec.json` and `conflicts.json` |
| `journey-builder` | `references/INCREMENT_PLANNER.md` | Per-increment plan into the build loop's shape, written through `backlog-plan-increment.sh` (ten at a time, in dependency order) |
| `journey-builder` | `references/MODEL_EXTENDER.md` | One gated `model-extension` increment — grows the engine's obligation vocabulary |
| `requirements-pipeline` | `workflow/distil/briefs/extract.md` + `extract-<kind>.md` | Per-source extraction into `distil/extract/<slug>.json`, one brief per source kind (run by `workflow/distil.js`, one per source, pipelined) |
| `requirements-pipeline` | `references/TRACE_EXTRACTOR.md` | The trace method `extract-trace.md` points at: mine a trace corpus or read a mined set |
| `requirements-pipeline` | `workflow/distil/briefs/verify.md` | Per-range refutation of one extract's claims into `distil/verify/<slug>.part<N>.json` (parallel within a source) |
| `requirements-pipeline` | `workflow/distil/briefs/reconcile.md` | One-shot — the working set into `requirements.json` and `conflicts.json`, keeping every id on a re-distil |
| `requirements-pipeline` | `workflow/distil/briefs/consolidate.md` | One-shot — requirements into `backlog.json` thin full-stack slices, `todo` and `blocked` rows rewritten to the latest rulings, every other row held fixed |
| `requirements-pipeline` | `references/REPORT.md` | One-shot — drafts the decision-led DISTIL report, returned as text |
| `spec-catchup` | `references/CAPABILITY_JUDGE.md` | Per-capability judgement against the suite report and source — `judge-<capability>.json` only, parent applies |
| `spec-cover` | `references/GAP_JUDGE.md` | Per-gap Then-to-assert mapping and test proposal — `judge-<id>.json` only, parent writes and probes |

Cursor reads `.claude/skills/` natively (per
<https://cursor.com/docs/context/skills>). It has no parallel subagent
primitive, so worker prose still works but runs serially in the active
session rather than fanning out.
