# Assessment: fidelity and designer experience

Theme: Sam's comment 1 (the prototype is as close to the real frontend as possible, so the next page is simply there) and the overall designer experience.

Checked against branch `feat/NO_JIRA-designer-prototyping` of `repos/trade-imports-plants-prototype`, HEAD `abae120`, clean tree. Every claim below comes from reading the files, not the earlier handover.

## Verdict: partial

The core of comment 1 is well covered. A design release is a full copy of the real journey that runs on the real engine, components and layout, and every skill that builds a page does it through the real journey's own recipes. The gaps are in keeping that fidelity over time and in the first-run experience:

- Nobody is told when a release has fallen behind the real journey.
- The first Claude Code session shows an error.
- There are three overlapping entry documents.
- One line in the first-hour guide is wrong.

## 1. Does the suite keep designers on the real journey? Yes (covered)

| Claim | Evidence |
|---|---|
| A release is a full copy of the real journey: every page, question, word and rule | `docs/designers/design-releases.md:26-39`; `scripts/new-set/index.js:105-161` copies the set and records `fromCommit` and `upstreamCommit` |
| Releases share the real engine, model, flow, layout and services, and are never allowed to fork them | `CLAUDE.md:30` (rule 10), `.claude/skills/fake-a-service/SKILL.md:51-53` |
| Only real GOV.UK components. What the toolbox cannot do is logged, not hand-built | `CLAUDE.md:24` (rule 4), `docs/designers/gov-uk/design-gaps.md:30-36` ("Why not just build it?") |
| Journey changes follow the real service's own recipes, not invented patterns | `.claude/skills/change-the-journey/SKILL.md:13`, `references/routes.md:35-37` (add-a-section goes to `high-risk-plants/docs/add-a-section.md`) |
| Old Prototype Kit pages are rebuilt as real pages in a release, not copied as Kit HTML, with a fidelity table | `.claude/skills/port-a-kit-page/SKILL.md:1-12, 89-94` |
| Example data comes from replaying the real pages, never hand-written | `CLAUDE.md:25` (rule 5), `PROTOTYPE.md:132-143` |
| `high-risk-plants` in the prototype is the real service with only data-seam patches | `overrides.json:61-145`: the patches switch stubs on in production and add overlays. None changes pages or flow |
| Fakes are pages inside the release, on the shared layout, and each one is flagged | `.claude/skills/fake-a-service/SKILL.md:47-50, 299-310` |

The answer to "parallel hand-built pages?" is no. The nearest thing is the fake-service pages (address book, templates, transporters). Those are release features on the real engine, and each one is flagged "needs a real service". The separate `prototype-services` registry instead of the real `index/client/stub` pattern belongs to the "real service pattern" theme, not this one.

## 2. Where does a release move away from the real thing, and is that signposted?

| Where it differs | Signposted? | Evidence |
|---|---|---|
| **Staleness.** A release is a snapshot taken on the day it was made. The weekly sync updates `high-risk-plants` but never the release | Explained in the docs, but **nothing tells the designer how far behind their release is**. Drift only appears at hand-off time | `design-releases.md:41-48` explains it. `scripts/designer/release/list.js:14-36` has no drift column. The only drift calculation is `scripts/designer/handoff/build.js:525` (`driftOf`) and `brief.js:330` ("Has the real journey moved on?"). `release.json` already records `fromCommit` (`scripts/new-set/index.js:150`), so the figure costs little to work out |
| Fake services | Yes: design-gaps row, brief, "needs a real service" line | `fake-a-service/SKILL.md:299-345` |
| Toolbox gaps (colours, tabs, header) | Yes: `design-gaps.md` per release, in the brief | `docs/designers/gov-uk/design-gaps.md` |
| Header "Address book" link goes nowhere, because the real one points at ins-frontend | Yes, under Known gaps. It still breaks "the next page is just there" | `PROTOTYPE.md:225-229`; `fake-a-service/references/address-book-pages.md:7-14, 125-126` (the fake address book pages live inside the release; the header link is left dead). `src/config/config.js:378` exposes `TRADE_IMPORTS_INS_FRONTEND_URL` |
| Dashboard Commodity and Arrival are blank on the real journey (a real plants-frontend bug) but work in releases | Only in the earlier handover (`workareas/shared/designer-prototyping/README.md:144`), not in designer docs | A designer who compares `high-risk-plants` with their release sees a difference they did not make |
| Welsh is never shown in the browser | Yes | `PROTOTYPE.md:198-201` |
| Shared data and Reset | Yes | `PROTOTYPE.md:142-162` |

These differences are listed across four places: PROTOTYPE.md "Known gaps", design-releases.md, gov-uk/design-gaps.md and services-and-dashboards.md. No single page answers "how close is this to the real service?"

## 3. First run from a fresh clone, read as a designer

The path is sound. README line 3 points to `PROTOTYPE.md`. PROTOTYPE.md line 13 points to `your-first-hour.md`, which is ordered and concrete, gives a plain-words ask plus the command at every step, and has a preflight that explains itself (`your-first-hour.md:53-89`). The `upstream` remote needed for hand-offs is covered by the preflight (`scripts/designer/preflight/checks.js:228-251`).

Problems found:

1. **Every prompt errors until Sam applies the settings proposal.** The prototype's `.claude/settings.json` is still plants-frontend's copy. It calls Sonar hook scripts that `overrides.json:3-4` deletes. So a designer's first Claude Code session reports a missing hook script. There is also no edit guard and no allowlist, so every step asks for approval. The docs describe the error as harmless (`PROTOTYPE.md:62-65`, `CLAUDE.md:119`, `README.md:21-29`), but it is the first thing a new designer sees. This is Sam's action: the settings file is out of bounds for agents.
2. **No route for "I'm new" or "what can I do here?"** The routing table (`CLAUDE.md:38-52`) starts at "run the prototype". A designer's first sentence to Claude may well be "help me get started" or "what can I do here". Today that falls through to "When nothing fits, say so plainly" (`CLAUDE.md:54`). No match found for `new here|get started|what can|help me` in CLAUDE.md or run-the-prototype.
3. **`your-first-hour.md:238-239` is wrong for the path most designers take.** It says a release "has no 'before' until you have saved it once (step 10)". But step 6 through Claude (`design-release`) saves the release at once as its own commit ("Start design release …", `design-release/SKILL.md:163`; also `design-releases.md:81-83`). So `--before` works straight away on the Claude path. The note only holds for the manual `new:set` path.
4. **Three overlapping entry documents.**
   - `PROTOTYPE.md` (361 lines) repeats `your-first-hour.md` (running it, installing, the port), `design-releases.md` (sets, releases, freeze/carry, the raw `new:set` command), and `where-changes-go.md` (the weekly sync, "What never to edit", the `ours`/`patched` lists).
   - A designer who reads PROTOTYPE.md first reads roughly twice as much as they need before their first change.
   - It also teaches raw commands (`PROTOTYPE.md:236-253`) and "Where to edit pages" by hand, which works against "just say what you want".
5. **The PROTOTYPE.md table has a "Skill" column** (`PROTOTYPE.md:24-38`). This is harmless, but it suggests designers need to know skill names, the opposite of Sam's intent-first aim. The "Say something like" column is what matters.
6. Wording is inconsistent: "set" in PROTOTYPE.md headings versus "design release" in CLAUDE.md's reply rule (`CLAUDE.md:8`). The glossary covers both (`glossary.md:20, 92`), so this is minor, and the chooser and URLs genuinely say "set".

## 4. Volume: overwhelming, contradictory or duplicated?

- **13 skills and 4 workflows: keep them.** Each one has a clear, separate trigger set and "NOT for" boundaries (see the frontmatter of every SKILL.md), and designers never have to choose one: `CLAUDE.md` routes by phrase, and AGENTS.md sends Cursor to the same table. The cross-skill orders ("Requests that fit two skills", `CLAUDE.md:56-70`; `fake-a-service/SKILL.md:108-134`) join them up. Merging would make skill files that are already 200 to 520 lines long even longer, without helping designers, who never see them.
- **Agent-facing and designer-facing twins are deliberate, not duplicates.** For example, `docs/designers/gov-uk/design-gaps.md` (why gaps exist, for designers) and `match-the-design/references/design-gaps.md` (the table format, for agents). Leave them.
- **The one real duplication is PROTOTYPE.md** against the first-hour guide and the topic docs (section 3, item 4).
- **Contradiction found:** only the `your-first-hour.md` "before" note (section 3, item 3).
- `docs/designers/README.md` says plainly "You do not need to read them all. Claude Code follows them for you" (lines 3-6). That is the right framing for 3,000+ lines of docs.

## Recommended changes (clear improvements only)

1. **Show how far behind the real journey a release is.**
   - `designer:release list` gets a "Real journey changed since" column: the pages or files in `src/server/app/sets/high-risk-plants/` changed between the release's `fromCommit` and HEAD. Reuse the hand-off's `driftOf` logic.
   - `design-release` and `run-the-prototype` mention it in one line when it is more than zero, and offer "pick up the real team's changes".
   - Optional: a tag on the chooser.
   - Why: comment 1's "the next page is simply there because it is the real thing" is only true on the day a release is made. Today a designer finds out only when they hand off.
2. **Add a newcomer route.** Add a `CLAUDE.md` routing row, and a short section in `run-the-prototype`, for "I'm new", "help me get started", "what can I do here" and "what can you do". It runs the preflight and start, then prints the "You want to / Say something like" table in plain words (no skill names).
   - Why: intent-first from the first sentence.
3. **Fix `your-first-hour.md:238-239`.** Say `--before` works as soon as Claude has started the release (it saves it). Only a release made by hand with `new:set` needs a save first.
4. **Make PROTOTYPE.md a short front door** of about 100 lines:
   - what this is
   - "say what you want" with the table, with the Skill column dropped or moved to a footnote
   - a link to your-first-hour
   - a new "How close is this to the real service?" section listing every difference in one place: releases are snapshots, fakes, design gaps, the dead Address book link, the dashboard Commodity/Arrival bug, Welsh not shown, shared data
   - known gaps
   - deployment and merging

   Move or cut the sections already held in design-releases.md ("Your design releases", "Adding a set", "What a set is"), where-changes-go.md ("How the weekly sync works", "What never to edit") and your-first-hour.md ("Running it on your computer" detail). Check each moved fact exists in its target before cutting it.

   Why: one entry path, less to read, divergence signposted in one place.
5. **Sam's action (not agent-editable): apply `scripts/designer/hooks/settings-proposal.json`** on a `maintain/` branch before any designer's first run. It removes the missing-hook error on every prompt, turns on the edit guard, and adds the allowlist that stops approval prompts. This is the biggest first-run experience fix, and it is already documented in `README.md:21-29`.

## Gaps not recommended as changes here (trade-offs or other themes)

- **The dead header "Address book" link.** It could point at a prototype stand-in through `TRADE_IMPORTS_INS_FRONTEND_URL` (config only, no shared-layout edit). But the fake address book pages are per release, so there is no obvious single target. This belongs with the "real service pattern" theme (an INS-like address book service in the index/stub pattern), and it is Sam's call.
- **Fakes in `src/server/prototype-services/` with their own registry.** This is the "real service pattern" theme.
- **The dashboard Commodity/Arrival bug on the real journey.** The fix belongs to plants-frontend, raised by Sam (handover item 6). Meanwhile, recommendation 4's "How close" section should mention it.
- **The workflows have never run under the real Workflow tool** (handover README:131). This is a reliability risk for "do all of these", not a fidelity issue. The design-session manual steps in `.claude/workflows/README.md:91-140` are the fallback.
