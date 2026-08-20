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
| `parity` | `references/COPY_EDITOR.md` | Per-domain plain-English rewrite of finding prose, under word budgets and the quote/number conservation invariants |
| `parity` | `references/CLAIM_VERIFIER.md` | Per-domain adversarial read of that rewrite — never the domain it wrote |
| `parity` | `references/EVIDENCE_CURATOR.md` | Per-domain choice of frame kind and anchors, including the hand-authored insertion anchors on one-sided findings |
| `parity` | `references/FINDING_AUTHOR.md` | Per-slice authoring of the findings themselves from both sides' captured evidence (one per slice, parallel) |
| `parity` | `references/FINDING_VERIFIER.md` | Per-slice adversarial read asking only whether each finding is correct — never the slice it wrote. Writes `finding.verification`, which the ingest gate requires |
| `parity` | `references/CORPUS_INTERVIEWER.md` | Parent-loaded COMPARE-mode interview for a new corpus (→ `setup.json` → `scaffold-corpus.sh`) |
| `parity` | `references/SCREEN_ENUMERATOR.md` | Per-side static enumeration of an application's screens, written into the corpus's `enumerate.cjs` (one per side, parallel) |
| `parity` | `references/SPEC_AUTHOR.md` | Per-slice Playwright capture specs. Fan out the writing; the running is serialised, one server one session |
| `parity` | `references/SCREEN_PAIRER.md` | One-shot — which screen answers which, plus the two one-sided lists, into `pairs.cjs` |
| `parity` | `references/DUPLICATE_SWEEPER.md` | One-shot — the only pass that sees more than one slice, adjudicating cross-slice duplicate candidates |

Cursor reads `.claude/skills/` natively (per
<https://cursor.com/docs/context/skills>). It has no parallel subagent
primitive, so worker prose still works but runs serially in the active
session rather than fanning out.
