# Critique of run 1 (`wf_e406c706-419`)

## Headline

- **Sam is half right on dating.** The DR2.1 evidence is in-window and built with today's factory: every DR2.1 theme ran 9–12 Oct (`themes/journey-foundation/build-args.json` mtime 9 Oct 19:40; plants-frontend `fd51b56` 2026-10-09 → `28baedf` 2026-10-14) on the loop between `2e8500ca` (9 Oct) and `587142f5` (12 Oct), and the five prompt lines the report hangs on (`:3711`, `:3850`, `:4022`, `:4042`) are byte-identical in the 9 Oct version (`:3550`, `:3688`, `:3856`, `:3876`). But three of the six summary bullets lean on pre-window material without saying so: the GWT judge order (bullet 1) is from the **22 Sep Codex proof run** `wf_70eca344-204` (labels `inc-001 codex:implement`), not "a DR2.1 judge"; bullet 4's "Codex read every standard and still wrote comments" is `f96a3cd` 2026-09-22, never landed; §4a's trend uses three phases from 4 Sep–7 Oct built under the pre-`78233fae` (23 Sep) loop; the HOUSE RULES line is dated to `75105948` (22 Sep) when `git log -S'comments are removed aggressively'` shows it landed with `d88676d6` on 2026-08-20.
- **Sam is right on scope.** The brief handed to run 1 named only "comments, naming, readability" and "structural" (script `:31-34`); its CONTEXT said "The executor is 'claude' … or 'codex'" and three of eight angle prompts were written "for BOTH executors" (`:97`, `:138`, `:167-168`; 16 `codex` mentions in the script) before anyone checked that no DR2.1 theme used Codex. Of the 62 causal claims returned, ~50 are about comments, 2 about naming, ~5 structural, **0** about logging, abstraction/decomposition, error handling, dead code or test readability. The report has 0 hits for `logging`, 1 for `duplicat`, ~150 for `comment`.
- **Sam is right on balance, for a different reason than token share.** 15 Opus evidence agents (7 angles were run twice and 13 results were kept and synthesised, so near-identical claims were challenged up to 7 times each) processed ~130M cached-context tokens over 956 turns; 88 Fable sceptics processed ~147M over ~1,400 turns. The sceptic prompt said "Default to 'partly' or 'refuted'" (script `:194`) and returned **60 partly, 2 refuted, 0 confirmed**. The seven "**Confirmed**" labels in the report are the synthesiser's own, not the sceptic's. Roughly half the spend bought almost no discrimination.
- **The headline numbers mostly stand**, with one that needs softening (plans).

## Dating of each headline claim

| Claim | Evidence date | Factory in force | Verdict |
|---|---|---|---|
| Rule 15 permits "why" comments; Java guides mandate GWT | `code-style.md:409`, `unit.md:283` — last changed `c894351d` 2026-04-28 | Still current | Stands, but the "DR2.1 judge ordered GWT comments" example is the 22 Sep Codex run (`06e52828…/wf_70eca344-204`, `fix-now … Add // Given, // When and // Then`), pre-window, pre-current loop |
| Verifier refutes ~3 in 4 | DR2.1 journals in `bec925b7…` 9–12 Oct | Current | In window |
| Planner writes comments, implementor follows verbatim | 40 plans mtime 9–12 Oct; `3b06ece` 12 Oct, `d2f668a` 11 Oct | Current | In window |
| 0 of 47 implementors read code-style.md | 47 `inc-NNN implement` agents, all in `bec925b7…` (9–12 Oct) | Current | In window |
| Heaviest comment commits are interactive sessions | `a8e093d` 13 Oct (Claude-Session trailer, Opus 5.5), `75b06e3` 13 Oct, `913a18d` 12 Oct (colleague's PR #90), `e6c74a2` 13 Oct | n/a (not loop) | In window |
| Self-reinforcement / trend | `dba9c35` 5 Sep, `615efca` 8 Sep, `3d03865` 10 Sep, phases 4 Sep–7 Oct | Older loop (pre-`78233fae` 23 Sep, pre-`94417aa3` 24 Sep) | Out of window, unlabelled as such |
| Codex (bullet 4, §1 row 2, §2 last row, §6) | `f96a3cd` 22 Sep, `wf_70eca344-204` 22 Sep | Older loop | Out of window; run 1 itself concedes "no causal role" |
| Colleague's EUDPA-573 clean-up (`696c5e8`, `a918b7f`) | 22 Sep, `Co-Authored-By: Claude Opus 4.7` on `c69acf0` | Not loop | Pre-window but is the colleague's primary case; run 1 cites it in one clause only |

## Numbers re-checked

| Report figure | Re-check | Verdict |
|---|---|---|
| "36–40 of 40 plans contain comment or JSDoc instructions" | `grep -l -i 'comment\|jsdoc'` = 40/40. But of 246 matching lines, 54 delete/forbid/keep a comment (`inc-026.md:175` "No new explanatory or migration comments", `inc-020.md:51` "Add no comment", `inc-027.md:35-37`, `inc-022.md:90`), and three plans point at rule 15 by name (`inc-001.md:13`, `inc-002.md:13`, `inc-005.md:11`). Plans with an explicit add/word-a-comment instruction: **28 of 40**. | **Weakened.** Direction right, number inflated, and the report hides that the planner is also the only stage that carries the anti-comment rule into the build. |
| "verifier refutes ~3 in 4" | DR2.1 journals (`bec925b7…/wf_*`): `"real":false` 665 / `"real":true` 208 = 76%. All 150 journals on disk: 1188/631 = 65%. | **Stands as a base rate for all findings.** The sampled refutations (`wf_11a9d6a5-051`: "stylistic preference", "taste", "rule-of-three") are about test structure and duplication, not comments. Comment-specific 254/83 "across 137 journals" mixes 67 pre-2 Oct journals from other programmes; the report's own "DR2.1 alone ~140/44" is the figure to use. |
| "0 of 47 implementors read code-style.md via Read; 4 via shell" | Read-tool opens of `code-style.md` in `bec925b7…`: 18 agents, none an implementor (all planners/reviewers). Shell reads: 5 agents, 4 are implementors (`a3b2ee14…`, `a7f3526d…`, `a683e4c8…`, `adf68b64…`). 0 of 47 opened `frontend-change/SKILL.md` (34 openers, all non-implementors). | **Stands.** |
| "~200–340 style findings across DR2.1 journals" | Not independently recounted. | Plausible, unproven. |
| "`a8e093d`: 72 comment lines to 42 code; `service-time-zone.js` 18/19" | `service-time-zone.js` is 18 comment lines + 1 export; `calendar.js` adds ~30 comment lines for ~15 code lines. | **Stands.** Note it is Sam's own session, 13 Oct. |
| MEMORY.md index reaches workflow subagents | `Remove explanatory comments aggressively` appears once in `wf_9a087df6-646/agent-aab979399253cdc15.jsonl` (inc-187 implementor, sonnet). | **Stands** (contradicts the memory-audit's doc-based doubt). |

## Method

- **Evidence/challenge balance:** 15 evidence agents (8 angles, 7 re-run; results kept from both batches for 5 angles) vs 88 challenge agents plus 1 synthesis; 956 vs ~1,400 turns; ~130M vs ~147M cache-read tokens. Challenge verdicts: 60 partly / 2 refuted / 0 confirmed. The two refutations were the MACHINE-DRAFT marker claim and a Codex-causation claim. Net: the challenge phase changed two of 62 conclusions.
- **Sampling bias:** every code sample is plants-frontend or animals-frontend on DR2.1 branches, plus three Sam commits. Nothing from the Java backends in the window (`15ae53f` EUDPA-660, `019aa15` EUDPA-310, `ceba567` EUDPA-664, `feb6aa1` EUDPA-676 in animals-backend; `e9ca98e` EUDPA-639 plants-backend), nothing from address-book (`f977582`–`65f50b9` EUDPA-644), ins-backend (`a5990fc` EUDPA-390), or the ins-tests window (EUDPA-688, EUDPA-670, EUDPA-660). The colleague's complaint is about interactive/ticket-skill output; run 1 excluded `913a18d` (PR #90) as "human-driven" despite its own CONTEXT saying every line is AI-written.
- **Plausible but unproven:** "style reviewer flags about one in four added comments"; "77 of 78 comment findings reaching the judge were fix-now"; "4 of 47 planners hit 'Can't find repo key'"; the whole §4a density series (phase boundaries chosen by hand, no per-author split).

## Verdict per run-1 summary bullet

1. Standard permits the comments; house rule lives in one prompt — **stands**, with two dating corrections (GWT example is the 22 Sep Codex run; HOUSE RULES dates from 20 Aug `d88676d6`, not 22 Sep).
2. Verifier is where findings die — **weakened**: it is a 76% base rate for every finding category in DR2.1, not a comment/naming mechanism; the report's own row 3 admits this but the summary does not.
3. Planner writes comments, implementor follows verbatim — **weakened**: 28/40 not 36–40; the plans are also the only build-stage carrier of rule 15 and of explicit "add no comment" lines.
4. Standards hand-off broken; fixing delivery alone won't help — delivery half **stands** (0/47); the "won't help" half rests on `f96a3cd` (22 Sep, Codex, never landed) and is **out of date** as evidence, though `a8e093d` (13 Oct) supports it in-window.
5. Self-reinforcement — mechanism **stands** (`wf_11a9d6a5-051` journal:197→257, in window); trend figures **out of date** (three of four phases pre-window, mixed authorship in "hardening").
6. Structural drift small; `tim backlog standards` omits repo docs — **stands** as far as it goes, but structure was examined only through the lens of "did it cause comments"; abstraction, decomposition, duplication, logging, error handling were never measured.

## What run 2 should not repeat

- Do not seed the brief with comments as the symptom; give equal angles to naming, structure/conformance, abstraction/decomposition, logging, error handling, duplication, test readability, each with its own evidence agent and its own sample.
- Drop Codex from the brief; `executor: "claude"` in every `themes/*/build-args.json` and `wf_70eca344-204` (22 Sep) is the only Codex run.
- Window = commits ≥ 2026-10-02; label anything older as contrast with its date. Sample all repos with window commits (both backends, address-book, ins-backend, ins-tests), and include colleagues' AI-assisted PRs (`913a18d`, `be713f6f`, `115821d2`, `5f0f3117`, `19bedfbb`, `e9ca98e`, `f977582`) since those are the colleague's actual source.
- Do not re-run angles and keep both result sets; de-duplicate claims before challenge.
- Replace "default to partly/refuted" sceptics with fewer sceptics given a confirm/partly/refute rubric and a requirement to produce counter-evidence, or spend that budget on more evidence; have the synthesiser keep the sceptic's verdict rather than relabel.
- Count plans/findings by instruction type (add vs delete vs keep), not by regex presence; cite DR2.1-only journal counts, never the 137-journal mix.