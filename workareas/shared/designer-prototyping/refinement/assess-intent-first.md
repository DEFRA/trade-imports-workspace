# Assessment: intent-first routing (Sam's comment 2)

Checked against `trade-imports-plants-prototype` on `feat/NO_JIRA-designer-prototyping` at `abae120` ("fix: act on designer confirmation trials"). Every claim below comes from the files, not from the earlier handover.

## Verdict: partial

Most of the plumbing is there. A designer can already say what they want in their own words, and in Claude Code the request reaches a skill without the skill being "hooked in", because routing lives in always-loaded instructions and points at files by path. Three things are missing:

1. There is **no single entry point a designer can name** ("use the design skill", `/design`).
2. The routing is **keyed on phrases, not outcomes**, and when nothing matches, the fallback **stalls**: "When nothing fits, say so plainly and point at `docs/designers/README.md`" (`CLAUDE.md:54`).
3. On hosts other than Claude Code, **`AGENTS.md` only points at `CLAUDE.md`**. None of the load-bearing rules are written in it.

## How a plain request reaches a skill today

### Claude Code (CLI, desktop, Claude Code on the web)

- `CLAUDE.md` is always loaded. Its "Routing" section (`CLAUDE.md:34-70`) maps designer phrases to 13 skills and says to "follow that skill's `SKILL.md` in `.claude/skills/<skill>/`" (`CLAUDE.md:36`). That is a file path, so routing still works when skill auto-discovery does not fire. **This already meets "don't rely on skills being actively hooked in" for Claude Code.**
- "Requests that fit two skills" (`CLAUDE.md:56-70`) covers compound requests and tells the agent to check whether each part is already true.
- Rule 6 (`CLAUDE.md:26`) sends any list of notes, or four or more changes, to the `design-session` workflow. Its classifier re-reads the same routing table and skill descriptions (`.claude/workflows/design-session.js:262-272`) and refuses vague requests with a plain reason instead of guessing (`:268-271`).
- The skill `description:` frontmatter in every `.claude/skills/*/SKILL.md` carries trigger phrases and "NOT for" exclusions. That makes auto-discovery a second path, not the only one.
- Path-scoped `.claude/rules/*.md` (`ownership.md`, `copy.md`, `templates.md`, `designer-sets.md`, `prototype-seed.md`, each with a `paths:` glob) add guard rules when the matching files are touched. These are Claude Code-only.
- `.claude/settings.json` has only the sonar hooks. No SessionStart or UserPromptSubmit hook injects routing, and none is needed.

### Cursor, Codex, Copilot (hosts that read AGENTS.md)

- `AGENTS.md` (10 lines) says: read `CLAUDE.md` first, route with its table, follow `SKILL.md`, read `.claude/rules/` before certain edits, and run workflows by hand. Routing does reach them, **but only if the host chooses to follow a pointer**. No rule is written in `AGENTS.md` itself (see `AGENTS.md:5-9`).
- The `.claude/rules/` glob loading does not exist on these hosts. `AGENTS.md:7` asks them to read the rules by hand.
- Running workflows by hand is documented (`.claude/workflows/README.md:91-140`). This part is covered.
- `PROTOTYPE.md:48-60` and `docs/designers/your-first-hour.md:37-44` tell designers that Cursor works "because it reads AGENTS.md". That is true, but thinly.
- There is no `.github/copilot-instructions.md` or `.cursor/rules`. The current Cursor, Codex and VS Code Copilot builds all read `AGENTS.md`, so none is needed.

### claude.ai chat without the repo

Nothing reaches it. No repo instructions can fix that. It is out of scope, and the docs should not suggest it works. They currently do not.

### Ownership

`CLAUDE.md`, `AGENTS.md`, `PROTOTYPE.md`, every `.claude/skills/<name>/**`, `.claude/rules/**` and `.claude/workflows/**` are listed in `ours` (`overrides.json:35-52`). The real `trade-imports-plants-frontend` has no `CLAUDE.md` or `AGENTS.md`, so the weekly sync cannot clash with them. **Any new skill (such as `design`) has to be added to `ours` explicitly**, because the list names skills one by one rather than using `.claude/skills/**`.

## Is there a single entry point a designer can name?

**No.** There is no `design`, `prototype` or catch-all skill (checked: `find .claude/skills` lists only the 13 task skills). A designer who says "use the design skill" or types `/design` gets nothing that matches. The docs tell designers to "say what you want in your own words" (`PROTOTYPE.md:19-22`, `docs/designers/README.md:3-6`), which is the right primary message. There is still no named fallback for when the agent seems lost, or for when the session was started somewhere `CLAUDE.md` is not loaded.

`PROTOTYPE.md:24-38` and `your-first-hour.md` show skill names next to every phrase. That is fine as a peek behind the curtain, but it does teach designers that skill names matter.

## Paper test: 10 phrasings that avoid every skill name

Each one was traced through the `CLAUDE.md` routing table, then the skill descriptions. "Stall" means the agent reaches the "When nothing fits" line or has to ask. "Misroute" means a plausible read of the table sends the request to the wrong skill.

| # | Designer says | Likely route today | Right route | Result |
|---|---|---|---|---|
| 1 | "can the dashboard show which ones are overdue" | `example-data` ("show a late notification", `CLAUDE.md:46`), or `match-the-design` ("add a tag") | `fake-a-service`: `references/dashboard-filters-and-tabs.md` has a late filter, a late count and a red late tag (`:9,:12,:454`), plus `example-data` for late examples | **Misroute risk.** "Overdue" is not a trigger, and "late" is listed under `example-data`, not the dashboard. |
| 2 | "the researcher needs participants to skip the commodity bit" | `change-the-journey` ("skip this page if", `CLAUDE.md:45`) | `research-session`: a task link that starts past commodities, made from an example stopped at that page (`research-session/SKILL.md:80`) | **Misroute risk.** "Skip" matches a permanent flow change. Only "researcher/participants" tips it the other way, and `research-session`'s triggers ("let participants through") are about errors, not start points. |
| 3 | "make this real" | `hand-off` (`CLAUDE.md:52`) | `hand-off` | OK |
| 4 | "the devs need a ticket for this" / "write this up as a story" | nothing: "ticket", "story" and "Jira" are not triggers. On Sam's machine, the workspace's own `ticket-creator` may win if the parent workspace's skills are visible. | `hand-off` (it writes `brief.jira.txt` for a story, `hand-off/SKILL.md:14,289`) | **Stall or misroute.** This also bears on comment 4. |
| 5 | "we've got a stakeholder demo on Thursday, can you get it ready" | nothing matches: "When nothing fits" (`CLAUDE.md:54`) | a composed outcome: freeze or pick a release (`design-release`), example links (`example-data`), a review pack (`show-my-change`), and a merge before the demo (`PROTOTYPE.md:112-114`) | **Stall.** There is no outcome-level route or decomposition fallback. |
| 6 | "traders should be able to upload their phytosanitary certificate here" | `change-the-journey` ("add a page") | `change-the-journey` for the page, plus the service pattern for an upload the stubs lack (comment 3) | **Partial.** The page gets built, but nothing prompts "this needs a service". Upload is not in `fake-a-service`'s list. |
| 7 | "here's the Figma for the new check answers, make ours look like it" | `match-the-design` ("make this page match the Figma") | `match-the-design`, or `change-the-journey`'s check-answers recipe if the order changes | OK. The two-skill rules cover it. |
| 8 | "what does it look like on a phone" | `show-my-change` | `show-my-change` | OK |
| 9 | "the error when you leave the arrival date blank should say 'Enter the arrival date'" | `change-the-words` ("change the error message") | `change-the-words` | OK |
| 10 | "has the real service changed since I made my copy? I want the latest" | `design-release` only through its description ("pick up the real team's changes"). It is **not** in the `CLAUDE.md` table row (`CLAUDE.md:41`). | `design-release` (start a fresh release and carry changes over) | **Weak.** It works through auto-discovery only, so it fails on Cursor/Codex, which route from the table alone. |

**Tally: 4 OK, 3 misroute risk (1, 2, 4), 1 stall (5), 2 partial or weak (6, 10).**

The failures share one cause. The table is a list of **phrases**, and a designer's intent is often an **outcome** (a demo, a research round, a ticket, "stay current") or a **concept** that differs from the listed word (overdue ≠ late, skip ≠ skip-if). A strong model will often reason past the gap, but nothing in the instructions asks it to. The written fallback is to give up and point at a README.

## Options weighed

**A. One uber `design` skill that routes to sub-skills and workflows**

- For: a single name designers can say, matching Sam's "invoke the design skill". One place for "work out the intent, split it into parts, route each, finish with check/show/hand-off".
- Against: on its own it is still a skill, so it depends on being discovered or named, which is what Sam said not to rely on. If it copies the routing table it drifts from `CLAUDE.md`. It adds a hop to every request. On Cursor/Codex it is just another file to be pointed at.

**B. Always-loaded instructions plus trigger words (today's approach, improved)**

- For: works with no invocation at all, which is the actual goal (designers never need to know a name). It is already 80% built.
- Against: there is no name to reach for when things go wrong, phrase tables never cover every wording, and on non-Claude hosts the "always loaded" part is only a pointer.

**C. Both: always-loaded, intent-first routing as the single source, plus a thin nameable front door (recommended)**

1. **Make `AGENTS.md` the single source of the instructions, and make `CLAUDE.md` import it** (`@AGENTS.md` at the top, then only the Claude-Code-only notes: the Workflow tool, hooks and rule globs). Every host (Claude Code, Cursor, Codex, Copilot) then loads the full load-bearing rules and routing with no pointer-following, and there is one copy to maintain. This is what "don't rely on skills being hooked in" needs off Claude Code.
2. **Rewrite routing as intent-first.** Before the phrase table, add a short "Work out what they want" step: name the outcome, split it into parts, map each part to a skill, and check what already holds. Add an **outcomes table** for requests that name a goal, not a change: demo or stakeholder review, research round, crit or feedback notes, "a new feature the real service doesn't have", "a ticket or story for the developers", "stay up to date with the real service", "start something new from scratch". Widen the phrase table with the missing synonyms (overdue/late/behind, ticket/story/Jira/backlog, demo/playback/show-and-tell, upload/attach, "latest"/"out of date", "start page", participants/"skip to").
3. **Replace the stall fallback.** "When nothing fits" becomes: split the request into parts the skills do cover and say which part has no skill. Anything the real service cannot do goes to `fake-a-service` (or the real-service pattern, comment 3). Ask one plain question only when the request is truly ambiguous (for example, #2: "Should participants start past commodities, or should the commodity pages go from the journey?").
4. **Add a thin `design` skill** (`.claude/skills/design/SKILL.md`, name `design`) as the named front door. Designers can say "use the design skill" or `/design <what I want>`. It contains **no routing table of its own**: it reads the routing and outcomes sections of `AGENTS.md`, applies the intent-first step, sends lists to `design-session`, and always ends with check, show and the hand-off line. Its description has broad triggers ("I want…", "can we…", "design", "prototype this", "help me with the prototype"), so auto-discovery catches vague openers as well. Add it to `overrides.json` `ours`.
5. **Docs:** in `PROTOTYPE.md` and `your-first-hour.md`, lead with "just say what you want". Add one line: "If Claude seems lost, say 'use the design skill'". Move the skill-name column to a "behind the scenes" note so designers are not taught that names matter.

Why C and not A or B alone: B is what makes naming unnecessary, and it has to reach non-Claude hosts in full, not by pointer. A gives Sam's "invoke the design skill" affordance and a recovery handle for free, as long as it is a thin router over the one source rather than a second copy. Together they cover both paths (no invocation, and explicit invocation) with one routing source and no drift.

## Test to add once changed

Re-run the 10 phrasings above, plus the 10 in the handover trials if any, through `design-session`'s classify step, or by hand on Cursor with only `AGENTS.md`. Each should route or decompose without a stall. #2 should either ask the single disambiguating question or pick `research-session`.

## Re-run after change C1 (intent-first front door)

Traced on the uncommitted C1 working tree over `abae120`. Two traces per phrasing:

- **AGENTS.md alone**: what a host that loads nothing else (Cursor, Codex) does, following "Working out what they want" (name the outcome, split into parts, Outcomes table, then Phrases table, check what holds, do the parts, one question only if truly ambiguous).
- **classify**: the rewritten Step 2 prompt in `.claude/workflows/design-session.js` (reads AGENTS.md, splits vague notes into parts, never refuses for vagueness; a part that needs a skill outside the session is refused *with the words to say next*, and the other parts still build). Traced by hand against the prompt text, because the Workflow tool cannot run from this builder; the prompt and the split and refuse-one-part paths are covered by `design-session.test.js`.

"Routed" means the request reaches the right steps file(s) with no "nothing fits" and no question the designer must answer first.

| # | Designer says | AGENTS.md alone | classify (design-session) | Result |
|---|---|---|---|---|
| 1 | "can the dashboard show which ones are overdue" | Phrases: `fake-a-service` row now lists "which ones are overdue", "show the late ones on the dashboard", "which are behind". "Requests that fit two skills": *dashboard that shows which are overdue, late or behind* = `example-data` for late examples if none, then `fake-a-service`'s late filter, count and red late tag | Split into 2 parts: `example-data` (late examples) and `fake-a-service` (late filter, count, tag); "overdue" read as "late" per the meaning-not-words rule | **Routed** (was misroute risk) |
| 2 | "the researcher needs participants to skip the commodity bit" | Outcomes: "A research round" ("the researcher needs…"). Phrases: `research-session` row now lists "participants skip the X bit", "participants start past the X page". Two-skills rule: *participants who should skip or start past a page* = `research-session` task link starting on the later page, never a flow change unless the page should leave the journey for good | One part, refused with the pointer "say 'get ready for research'" (research-session is not a session skill), so the designer gets the right next step, not a stall | **Routed** (was misroute risk). Step 6's example question is exactly this case if the designer adds "for good" |
| 3 | "make this real" | Phrases: `hand-off` | Refused with "say 'hand this to the real team'" | **Routed** |
| 4 | "the devs need a ticket for this" / "write this up as a story" | Outcomes: "A ticket, story or Jira for the developers" = `hand-off`. Phrases: `hand-off` row lists "a ticket for the devs", "write it up as a story", "raise a Jira", "put it in the backlog". A change never made is made first | Refused with "say 'hand this to the real team'" (hand-off is outside the session by design) | **Routed** (was stall or misroute). The workspace's own `ticket-creator` no longer wins, because the repo's always-loaded AGENTS.md names `hand-off` for "ticket" |
| 5 | "we've got a stakeholder demo on Thursday, can you get it ready" | Outcomes: "A demo or stakeholder review", four ordered parts: pick or freeze the release (`design-release`), examples with links (`example-data`), a review pack (`show-my-change`), save + PR + merge before the demo, or demo from a laptop with `designer:fresh` until deployed (`share-my-change`) | Split: the `example-data` part builds; the freeze, review pack and PR parts are refused each with its own "say …" pointer | **Routed** (was stall). No question needed unless there are two working releases |
| 6 | "traders should be able to upload their phytosanitary certificate here" | Phrases: `fake-a-service` lists "let them upload a file", "attach a document". Outcomes: "A new feature the real service lacks" ("let them upload a certificate"). Two-skills: *a new page that needs data the stubs do not have (an upload)* = `fake-a-service` then `example-data`. "When no single row fits" also sends it to `fake-a-service` | One `fake-a-service` part (a prototype-owned service in the real index/client/stub shape plus its page), optionally an `example-data` part | **Routed** (was partial). Residual: `fake-a-service` (C2) has no upload worked example yet; `govukFileUpload` is in the toolbox (`components-we-have.md`) |
| 7 | "here's the Figma for the new check answers, make ours look like it" | Phrases: `match-the-design`; two-skills rules cover a check-answers order change | One `match-the-design` part | **Routed** |
| 8 | "what does it look like on a phone" | Phrases: `show-my-change` ("what does it look like") | Refused with "say 'show me on a phone'" (showing is the session's own Show phase, not a request) | **Routed** |
| 9 | "the error when you leave the arrival date blank should say 'Enter the arrival date'" | Phrases: `change-the-words` ("change the error message") | One `change-the-words` part | **Routed** |
| 10 | "has the real service changed since I made my copy? I want the latest" | Outcomes: "Stay current with the real service" = `designer:release -- list` ("Real journey changed since" column, from C4) and `drift <release>`, then `design-release` section E (fresh release, carry changes), `remount` for a merge clash. Phrases: `design-release` row now lists "I want the latest", "is my release out of date" | Refused with "say 'I want the latest'" (design-release is outside the session) | **Routed** (was weak, auto-discovery only) |

**Tally: 10 of 10 routed, 0 stalled, 0 misrouted.** Every phrasing now reaches the right steps file from AGENTS.md alone, with no skill name from the designer and no dependence on skill auto-discovery. Through classify, 5 build inside the session and 5 are session-external skills, each refused with the exact words to say next rather than a dead end.

Also traced, the plan's four trials (designer words, no skill names):

1. *New service* ("save a vehicle… the real service can't do that yet"): Outcomes "A new feature the real service lacks" = `fake-a-service` (`npm run designer:service -- new <name>`), then the transport page, then `example-data`. Routed.
2. *Ticket for the devs* (hint change + yes/no question + "write it up as a story"): split into `change-the-words`, `change-the-journey`, save (`share-my-change`), then Outcomes "ticket, story or Jira" = `hand-off`. Routed; the two-skills rule "Hand off, or a ticket or story, for a change that was never made" sets the order.
3. *No-skills host* ("I'm new… show me the dashboard with a few overdue notifications"): Outcomes "I'm new" = `run-the-prototype` "New here" (preflight, start, the no-skill-names table), then the overdue part as #1. Routed from AGENTS.md alone.
4. *Vague demo*: as #5. Routed.

Residual risks, not blockers: the `fake-a-service` upload example (C2's references); five skills outside C1 (`change-the-journey`, `change-the-words`, `design-release`, `fake-a-service`, `share-my-change`) still cite "CLAUDE.md" for rules and branches. In Claude Code that resolves through `@AGENTS.md`; on other hosts the agent opens CLAUDE.md and follows the import. They should say AGENTS.md when their owners next touch them.
