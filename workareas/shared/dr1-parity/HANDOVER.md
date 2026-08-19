# Handover — bring the frontend up to Design Release 1

Everything below the line is the prompt. Copy it whole.

---

You are comparing the DEFRA live-animals import notification frontend against
**Design Release 1** of the GOV.UK prototype, and turning the differences into
a work list.

**Why this exists.** The frontend was built against an out-of-date prototype.
DR1 is the signed-off visual definition of the application. Your output is the
work needed to bring the frontend up to match it.

That framing governs everything. This is not a negotiation — the design is
settled. Where the frontend differs from DR1 the frontend is wrong, unless the
finding itself is mistaken. Findings are born as work. A ruling is needed only
where a finding's *correctness* is in doubt, never where its desirability is.

A previous run against Design Release 2.1 worked the other way round, because
that release was in flux and half the differences were open design questions.
Its band names and ruling vocabulary — `needs-design-decision`,
accept/reject/defer — were built for that other job and are probably the wrong
shape for this one. Raise it once you have counts; do not re-plumb it up front.

## The one rule that governs every finding

**You are comparing functionality, not code.** Prototype code is Nunjucks views
and a 9,000-line `routes.js`. The frontend is Hapi with a journey engine. They
are not expected to match and never will. What is expected to match is *what a
user can see and do*.

A finding says "DR1 asks the user to choose a document type; the frontend infers
it from the filename". A finding never says "`routes.js:9014` differs from
`controller.js:130`". If a finding's substance is a code difference, it is not a
finding — drop it.

Code references are supporting context, not the comparison. Frontend-side ones
earn their place: they tell whoever does the work where it lands. Prototype-side
ones are mostly noise — a line number in throwaway prototype code helps nobody.
On the previous run 416 of 819 citations pointed into the prototype and consumed
most of the citation effort. Do not repeat that.

## The architecture, and the two pivots that produced it

Read this before you touch anything, because a lot of code in the repo predates
it and is to be deleted.

**Dumb tools, smart agents.** The line is drawn at exactly one place:

> Code is deterministic **only where its entire job is to be identical across
> two runs.** Everything above that line is judgement, and judgement is an LLM
> with tools.

Deterministic, and staying that way:

- content hashes, capture manifests, the seal store, pins-versus-captures
- screenshot mechanics — device scale factor, clipping, motion off, caret hidden
- file placement, the report renderer, the artifact emitter

That is integrity, not interpretation. It is what stops a picture changing
silently under a ruling somebody is about to make. Do not put judgement in it
and do not take determinism out of it.

Everything else is an agent with dumb tools underneath — drive to a URL,
screenshot, dump the DOM, list the controls and their attributes. Raw and
complete, with no semantic vocabulary. Agents read that and decide what a screen
*is*, then compare paired screens and author the finding directly.

**Pivot one: stop crawling, start writing.** An earlier attempt built a
general-purpose cartographer that discovered a journey with no prior knowledge —
a frontier, session replay, a value ladder that inferred what to type from hint
text and input patterns. Its first live run took eleven minutes and produced
five defects, every one a judgement failure wearing a code bug's clothes: it
emitted the locator `[name=""]` and waited thirty seconds for it, twice; it
tried to fill a select that was hidden behind a collapsed filter panel; it drove
a date picker through its calendar instead of typing into the input. An agent
reading those pages would have made none of those mistakes.

So agents write the navigation. Plain Playwright, not a plan format — a spec is
readable, diffable and hand-editable, and Playwright is more expressive than any
step vocabulary worth inventing.

**Pivot two: the extractor's vocabulary was the ceiling.** The page-model
extractor pulls a fixed set of keys — headings, fields, labels, summary rows,
task items. Three of those keys exist *only* because the two sides build the
same concept from different markup; the comment on `taskItems` says comparing
`taskLists` to `taskLists` "reads as 'one side has no task list at all', which
is a false finding on the two most important screens". That is semantic
matching, hand-coded, one special case at a time.

And because the extractor is a fixed vocabulary, the differ over it is a JSON
diff — a *structural* comparison. That is why it produced 472 deltas that then
needed agents to turn into 97 findings. The deltas exist only to serve a
mechanism nobody needs. Agents compare the two sides' evidence and author
findings directly.

**The cost, so you can weigh it honestly.** Two runs will produce differently
worded findings. Reproducibility moves from the process to the artefact: what
was ruled on stays fixed because `detail` is frozen and the backlog is canonical
JSON, even though re-running the analysis would phrase things differently. That
is the right trade, but know that you are making it.

## What to delete

All of it under `tim/src/parity/capture/`:

- the frontier, session replay and transcripts, the stopping rules, the value
  ladder, the `remember`/`interpolate` route-plan vocabulary
- `tim parity map` as a crawler

And the mechanical comparison:

- `compare/diff.js`, `diff-all.js`, the delta format
- anchors-derived-from-deltas, insertion-points-derived-from-deltas

Keep the *concepts* those last two produced — element crops, and showing where a
missing control would sit. An agent authoring a finding just says which control
it is about, which is better than the current `anchorsNamedIn` hack that infers
it by whole-word matching against the finding's own prose.

## What is proven, and what is not

- **The report pipeline is proven.** It rendered 97 findings with permalinks,
  snippets, screenshots, element crops, insertion captions and a drift panel.
  `tim parity citations|evidence|report|check|check-evidence|repoint` all work.
  Keep them; they know nothing about how findings were produced.
- **Recording screens is proven in its old form** — the retired DR2.1 harness
  captured 70 prototype screens and 33 frontend ones. It is unproven in its new
  home inside `tim`.
- **The crawler is disproven.** See above.
- **Nothing has ever run browser-side from `tim`** except that one eleven-minute
  crawl.

## What Design Release 1 is

Verified — do not re-derive:

- DR1 is **the root URLs**. There is no `/design-release-1` directory.
  `app/views/index.html` is a release chooser and describes DR1 as *"The current
  design release journey at the root URLs. Use this for stable reference work"*,
  starting at `/create-notification`. `app/routes.js` mounts only `testing`,
  `design-release-2` and `design-release-2.1`; the root router **is** DR1.
- DR2 is a copy of DR1, DR2.1 a copy of DR2, both since drifted.
- **DR1's screen set is smaller than DR2.1's.** The root views have no
  `create-template`, `view-template`, `dashboard-actions`, `dashboard-changes`,
  `dashboard-inspection`, `consignment-add-address` or `delete-notification`.
  Drop the templates and germinal slices.
- **`/address-book` is shared across all releases** —
  `app/lib/version-mount.js:45-52`. Those screens are identical in DR1 and
  DR2.1, so the previous run's 13 address-book findings carry over. Check them
  rather than re-deriving them.
- Start the prototype with `npm run dev` in
  `~/git/defra/defra-design/GB-notification-service`, **not** `serve`:
  production forces https on a plaintext server and sets secure-only cookies,
  which breaks the kit's sessions over http. It accepts TCP connections before
  an HTTP probe settles under Node 24, so wait on the port, not on a request.

## Where you are

- Workspace: `~/git/defra/trade-imports-workspace`. **Never**
  `~/git/defra/trade-imports-animals` — a stale clone. `tim` walks up from the
  current directory, so pass `--workspace ~/git/defra/trade-imports-workspace`
  unless your shell is already inside the right checkout.
- Frontend: `repos/trade-imports-animals-frontend`
- Prototype: `~/git/defra/defra-design/GB-notification-service`
- Your workarea: `workareas/shared/dr1-parity/`
- The retired DR2.1 corpus is on tag `archive/dr21-parity-corpus`, and its
  harness is still in `workareas/shared/dr21-parity/harness/`. **Read its ten
  specs before writing any of your own** — they encode hard-won Prototype Kit
  knowledge and they are the existence proof that hand-written specs work.
- `workareas/journey-builder/EUDPA-328/backlog.json` holds the previous run's 97
  findings. Read a dozen. They are the standard for what a good finding looks
  like: functional, falsifiable, and about what a user sees.

## How the workspace works

- **Work on `main`.** No PRs, no review. Commit directly and push.
- **No tickets** for anything outside `repos/`. Repos under `repos/` keep branch
  and ticket discipline; the workspace does not.
- **The Makefile is deprecated.** Never add to it. Use
  `npm --prefix ~/git/defra/trade-imports-workspace/tim run <script>` and
  `tim … --workspace ~/…/trade-imports-workspace`.
- `npm install` is blocked by a guard hook. If you need a dependency, edit
  `package.json` and ask Sam to install it.
- One Bash command per call. No `&&`, no `;`. Write `~/git/defra/…`, not
  `/Users/samfarrington/…`.

## Rules you must not violate

- **`detail` is frozen forever.** It is the only oracle proving a language pass
  lost nothing. Never edit it.
- **A citation is immutable from the moment it stops being queued.**
- **Never `--reseal` on Sam's behalf.** The seal store records the picture he was
  last shown; resealing says "I have looked at these and accept them", which is
  his statement.
- **A whole-page shot may not stand in for a finding about one control.**
- **Backlogs are canonical JSON**, never prose documents. Write through the
  setters so a fan-out worker cannot reformat the file or touch a second
  increment.
- **A fix belongs in the tool, not in a workaround.** If you find yourself
  copying a file or hardcoding a path in your workarea, stop and fix the tool.

## Two gates — stop and ask

- Before writing decision questions for more than one finding, author exactly
  one, show it beside the frozen original, and wait.
- Before rewriting more than one finding into plain English, do exactly one,
  show it beside the original, and wait.

Both exist because they are 40+ and 96 irreversible judgement calls. Produce the
canary, then carry on with everything that does not depend on it.

## Your first five steps

1. Read this file, then `MERGE-PLAN.md` beside it, then
   `.claude/skills/parity/SKILL.md`. Then read the retired harness's ten specs
   and a dozen findings from the previous run.
2. **Write the architecture up as a short design note and show Sam before
   deleting anything.** Two pivots happened fast; he has not seen the shape
   written down. Name what becomes a tool, what becomes an agent, and what the
   pipeline is end to end.
3. Delete what the "What to delete" section names, in its own commit, so the
   deletion is reviewable separately from the replacement.
4. Build the spec-writing stage for **one slice only** — the origin-and-reason
   screens are a good first slice, small and self-contained. Agents read the
   views and routes, write plain Playwright, and the specs record screens
   through the existing capture tools. Prove that slice end to end before
   writing a second.
5. Add the coverage check: enumerate the prototype's views and route mounts
   *statically* and diff against what the specs actually captured. That answers
   "did we get everything" without crawling, which is cheaper and more reliable
   than the thing it replaces.

Then stop and show Sam the screen counts for both sides before authoring a
single finding. That is the point where you learn whether DR1 is a small
comparison or a large one, and it changes everything downstream.

## What nobody has decided

Raise these rather than choosing:

- Does the frontend need re-capturing at all? It has not changed since the
  previous run, and its screenshots and page models are corpus-independent.
- Which run id and ticket does DR1 get? Every downstream path depends on it, and
  two shell scripts only accept an `EUDPA-*` glob.
- The band taxonomy and ruling vocabulary, per the top of this file.
