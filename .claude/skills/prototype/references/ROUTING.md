# Routing: working out what a designer wants

This is the one routing source for the `prototype` skill. Every table below
points at a `references/<name>.md` file (or a subfile under
`references/<name>/`) to open and follow step by step. Never copy these
tables anywhere else — update them here and every route stays correct.

## Working out what they want

Designers describe outcomes in their own words. They never need a reference
name. For every request:

0. **Make sure it is the prototype.** With no designer marker in the
   workspace's `CLAUDE.local.md` (written by `tim prototype setup`) and a
   request that names only a page several services have ("the dashboard",
   "the address page") with no word for the prototype, a release or a
   `design/*` branch, ask one plain question first: "Is this for the plants
   prototype, or for one of the real services?" Offer `tim prototype setup`
   once the answer is the prototype, so the next session knows.

1. **Name the outcome.** Say to yourself, in one line, what the designer
   wants to be true when you finish ("a dashboard that shows which
   notifications are late", "a story the developers can build from").
2. **Split it into parts.** Most requests have more than one: a page and the
   words on it, a feature and the examples that show it, a change and then
   a save.
3. **Map each part with the Outcomes table, then the Phrases table.** A goal
   ("a demo", "a research round", "a ticket") matches the Outcomes table. A
   single change matches a row of the Phrases table. Match on meaning, not
   the exact words: "overdue" is "late", "attach" is "upload", "the devs"
   are "the real team".
4. **Check what already holds.** Look at the picture, or run
   `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:release -- orders <release> <pages>`
   for a move. Say which parts are already true and do only the rest.
5. **Do the parts in order.** Follow each part's reference, one after
   another in the same run, and report the parts together. A list of notes,
   or four or more changes, goes to the `design-session` workflow (see
   "Workflows" below).
6. **Ask one plain question only when the request is truly ambiguous**, that
   is, when two readings lead to different work and nothing in the
   conversation picks one. Otherwise pick the likelier reading, do it, and
   say which reading you took in one line.

## Outcomes

When the designer names a goal rather than one change, do these parts in
order.

| They want | They say things like | Do this, in order |
| --- | --- | --- |
| A demo or stakeholder review | "we've got a demo on Thursday", "get it ready for the playback", "show and tell", "stakeholder review" | 1. Pick the release to show: the designer's working release, or `plants-working` made now (rule 9 in `SKILL.md`'s neighbour, `references/design-release.md` section B) with a title such as "Stakeholder demo". 2. Examples on the pages to be shown, with links (`references/example-data.md`). 3. A review pack (`references/show-my-change.md`, "make a review pack"), without `--before` when the release has no saved changes of its own yet. 4. Offer to save and open a pull request (`references/share-my-change.md`), and say it must merge before the demo to be seen on the deployed prototype. Until it is deployed, demo from a laptop with `designer:fresh`. |
| A research round | "user testing next week", "get ready for research", "the researcher needs…" | `references/research-session.md`. It starts the research release and adds one example per task through the other references. |
| Crit notes, feedback or any list of changes | "here are my notes from the crit", "work through this feedback", "do all of these" | The `design-session` workflow (see "Workflows"). |
| I'm new, or what can I do here | "I'm new", "what can I do here?", "where do I start?", "how does this work?" | `references/run-the-prototype.md`, "New here": `tim prototype setup`, start the prototype, then show what they can ask for. |
| A new feature the real service lacks | "the real service can't do that yet", "save a vehicle they use a lot", "let them upload a certificate", "a lookup for…" | `references/fake-a-service.md`. It builds a prototype-owned service in the real `index.js`/`client.js`/`stub.js` pattern, then the pages that use it. Add examples with `references/example-data.md`. |
| A ticket, story or Jira for the developers | "the devs need a ticket", "write this up as a story", "put it in the backlog", "raise a Jira" | `references/hand-off.md`. A change that was never made is made first, with its own reference, then saved, then handed off. See `references/raise-the-story.md` for the Jira dry-run-first flow. |
| Stay current with the real service | "has the real service changed since I made my copy?", "I want the latest", "is my release out of date?" | 1. `designer:release -- list`: "Real journey changed since" says how far behind. `designer:release -- drift <release>` names the pages. 2. To catch up, `references/design-release.md` section E. |
| Start from scratch | "start something new", "a blank prototype", "a brand new idea" | A fresh working release from the real journey (`references/design-release.md` section B). Only a journey that is not a plants notification at all starts from the placeholder (`new:set -- <id> --purpose working`, no `--from`), then `references/change-the-journey.md` adds its pages. |
| Make this real / build it properly | "make it real and start building it on the real service", "build this properly" | `references/build-it-for-real.md`. Route C1 (words or up to three frontend-only elements) or C2 (a new service, four or more elements, or a clash with a standing ruling). Never launches BUILD in a designer session. |

## Phrases

For one change, match what the designer says to a row, then open that
reference.

| Reference | The designer says things like | What it does |
| --- | --- | --- |
| `references/run-the-prototype.md` | "run the prototype", "start it", "it won't start", "port in use", "where did my data go", "open the arrival details page", "I'm new", "what can I do here" | Checks the computer, starts the dev server, prints the links, welcomes newcomers |
| `references/design-release.md` | "start a new design release", "make a working copy of the journey", "freeze what we've got as design release 2", "copy this change to release X", "which releases are there", "retire release X", "I want the latest", "is my release out of date", "pick up the real team's changes" | Starts, freezes, carries changes between, catches up and retires releases |
| `references/change-the-words.md` | "change the wording", "reword this", "rename X to Y everywhere", "change the hint", "change the error message", "show me the Welsh" | Finds every place a phrase lives and changes English and Welsh together |
| `references/match-the-design.md` | "make this page match the Figma", "change the spacing", "make it wider", "make it a summary list", "add a tag", "change the header" | Rebuilds a layout with GOV.UK components and logs design gaps |
| `references/port-a-kit-page.md` | "re-create this page from the old prototype", "port the GB notification page for X", "build this Prototype Kit page here", "bring over the transporter page" | Rebuilds an old Prototype Kit page in a release, with a fidelity table |
| `references/change-the-journey.md` | "add a question", "add a page", "add a guidance page", "move this page", "only show this page when", "skip this page if", "regroup the task list", "change the confirmation page", "a green panel with the reference" | Follows the repo's recipes to change the flow |
| `references/example-data.md` | "add an example", "show a late notification", "which ones are overdue", "an example stopped at the X page", "a link straight to the X page", "add a port", "fill the dashboard", "another organisation" | Adds example notifications, parties, ports and countries, with stable links |
| `references/fake-a-service.md` | "add a transporter lookup", "saved transporters", "templates", "change the address book", "add an address manually", "delete an address", "copy as new", "add filters to the dashboard", "add tabs with counts", "filter to only the late ones", "how many are late", "let them upload a file", "attach a document", "confirm before deleting", "a success banner after deleting" | Builds what the real service cannot do yet as a prototype-owned service, flagged "needs a real service" |
| `references/research-session.md` | "get ready for research", "user testing next week", "let participants through", "participants skip the X bit", "participants start past the X page", "turn errors off", "turn errors back on", "print a sheet for the session" | A research release, one link per task, errors off by one revertible commit |
| `references/check-my-change.md` | "check my changes", "did I break anything", "is it ready", "why won't it start", "what does this error mean", "the tests are failing" | Runs the right check and explains every failure plainly |
| `references/show-my-change.md` | "show me", "what does it look like", "before and after", "compare with the Figma", "compare with the real journey", "record a walkthrough", "make a review pack", "pictures for the demo, playback or show and tell" | Takes pictures into a gallery, with error states, phone width and video |
| `references/share-my-change.md` | "save my work", "share this", "make a pull request", "is my pull request merged yet", "merge my pull request", "undo my last change", "throw away what I just did", "go back to how it was" | Branch, commit message from the change, pull request when asked, safe undo |
| `references/hand-off.md` | "hand this to the real team", "send this to the developers", "make this real", "write a brief for the developers", "a ticket for the devs", "write it up as a story", "raise a Jira", "put it in the backlog" | Writes a story and brief, screenshots and a checked patch for plants-frontend |

### When no single row fits

Never stop at "nothing fits". Split the request into parts, as in "Working
out what they want", and map each part on its own. Most requests that match
no row are two or three rows together.

- A part that needs something the real service cannot do (a new lookup, a
  saved list, an upload, a status the dashboard cannot filter on) goes to
  `references/fake-a-service.md`.
- A part that names a page or question the journey does not have: never
  invent it. Check with
  `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:words -- page <nearest page>`
  and `references/change-the-journey/page-id-places.md`, and read why in the
  release's `journeys/linear/flow/fixtures/happy-path.json` and the real
  journey's `spec/journey-spec.json`. Say in one line what the journey has
  instead and why, do the other parts, and offer `change-the-journey` to add
  it once the designer gives its options.
- A part that no reference covers at all: say which part in one plain line,
  do the rest, and log the missing part in the release's `design-gaps.md`
  when it is a design the toolbox cannot build.
- Ask one plain question only when the request is truly ambiguous (step 6
  above).

### Requests that fit two references

Do every part in the same turn, one reference after another, and report the
parts together:

- **Words and layout** ("rename X, and drop the extra subheadings"):
  `change-the-words` first, then `match-the-design` for the layout part.
- **Renaming a task list group** (only its words): `change-the-words`.
  Moving tasks between groups, or adding/removing a group:
  `change-the-journey`'s task-list recipe.
- **The confirmation page's panel and reference number**:
  `change-the-journey` (confirmation-variant recipe), never
  `match-the-design`.
- **A branch plus a move, or two journey changes**: `change-the-journey`,
  part by part in one run.
- **A dashboard like a Figma frame, filled with examples**: `example-data`,
  then `fake-a-service` (filters, tabs, counts), then `show-my-change` with
  the frame as `--reference`.
- **A dashboard that shows which notifications are overdue, late or
  behind**: the real dashboard already shows a red Late tag, so first
  `example-data` for late examples if the release has none. Only a late
  filter, count or tab goes on to `fake-a-service`'s dashboard reference.
- **A new page that needs data the stubs do not have**: `fake-a-service` for
  the service and its pages, then `example-data` for rows that show it.
- **Participants who should skip or start past a page in research**:
  `research-session`, with a task link that starts on the later page. It is
  never a flow change unless the designer says the page should leave the
  journey for good.
- **An old Prototype Kit list page**: `port-a-kit-page`, which follows
  `fake-a-service`'s worked example 1 for the page, its add page and its
  card on check your answers.
- **A change, then "save it" or "open a pull request"**: make the change,
  then carry straight on with `share-my-change`.
- **"Hand off", or a ticket or story, for a change that was never made**:
  make it first with its reference, save it, then `hand-off`.
- **Any change to a research release after its sessions**:
  `research-session`, "After the sessions", step 3 picks the release it
  lands in, for every reference. Say where in one line, then carry on.

## Workflows

A workflow runs several agents, one step after another, for one big job.
Every workflow's reference also lists the same steps to run one after
another. Launch every workflow by `scriptPath`, never by name (a named
launch can run an older copy of the script):

```text
Workflow({
  scriptPath: ".claude/skills/prototype/workflow/design-session.js",
  args: { set: "plants-working", requests: ["…", "…"] }
})
```

| Workflow | Started by | Use it for |
| --- | --- | --- |
| `workflow/wording-sweep.js` | `references/change-the-words.md` | A wording change across more than 5 pages, or a pasted content document |
| `workflow/port-kit-page.js` | `references/port-a-kit-page.md` | Every Prototype Kit page port |
| `workflow/prepare-handoff.js` | `references/hand-off.md`, `references/build-it-for-real.md` route C1 | Building a hand-off for real: route C1 builds it in `trade-imports-plants-frontend` on a local `feat/EUDPA-N-<slug>` branch through `frontend-change` (never pushed); route C2 writes a `requirements-pipeline` DISTIL request. `dryRun: true` touches nothing |
| `workflow/design-session.js` | this file (rule 6 in `SKILL.md`) | Any list of notes, however many, or four or more changes at once |

See `workflow/README.md` for the args contract and how models are chosen.

## Branches

- `design/<release>-<slug>`: a designer's work, made from `main` before the
  first change. Prototype-only, `dockerStack: null`.
- `handoff/<slug>`: the upstream-bound route only, where the real journey's
  own files (`high-risk-plants`) are changed in the prototype to make a
  checked `upstream.patch` for plants-frontend (`hand-off` route 2; the
  patch is then the starting point `build-it-for-real` route C1 applies in
  plants-frontend on `feat/EUDPA-N-<slug>`). Never merged into the prototype's own
  `main`. A hand-off *folder* for a design release lands on the designer's
  own `design/*` branch, not here.
- `chore/NO_JIRA-<slug>` (or `chore/EUDPA-N-<slug>`): a maintainer's work on
  the prototype itself, following the workspace branch-naming rule (not
  this skill's concern).
- One rule for every reference: **stay only on a `design/*` branch, or on a
  `handoff/*` branch for the upstream-bound route. From any other branch —
  `main`, a `feat/*`, `chore/*` or trial branch — make
  `design/<release>-<slug>` before the first change**, from `main`; from the
  current branch instead only when `main` does not yet have something the
  release needs (the designer suite itself, a release saved elsewhere), and
  say so in one line. Starting a release, making the change and saving it
  all happen on that one branch, so nothing lands on someone else's branch.

## How every change ends

0. Before the first edit, take a plain picture of the pages it will touch:
   `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:show -- --set <id> --pages <the pages>`.
   That is the "before" for a release with no saved commit yet (a new
   release, or one a failed save never committed), where `--before` has
   nothing to compare with.
1. Check it:
   `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:check -- --set <id>`
   and its plain-English result.
2. Show it:
   `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:show -- --set <id> --pages <the pages it is on>`,
   adding `--before` only when the release has a saved commit
   (`git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype log -1 --format=%h -- src/server/app/sets/<id>`
   prints one); otherwise put step 0's picture beside it. Give the gallery
   path and links to click. Open the key pictures yourself before
   describing them.
3. The hand-off line, word for word: "If this should become part of the
   real service, say 'hand this to the real team' and I will prepare a
   brief and a patch for the plants-frontend team."

## The designer commands

All run as
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run <name> -- <arguments>`:

- `designer:where` whose file is it · `designer:check` check a release ·
  `designer:fresh` runs like the prototype's `dev` script but keeps no release data across
  a restart
- `designer:show` pictures and gallery · `designer:release` list, drift,
  orders, changes, freeze, carry, retire, remount · `designer:examples`
  list, check, links, init, fixtures
- `designer:words` find words, page, Welsh report · `designer:research`
  research mode on, off, status, sheet · `designer:handoff` brief and patch
- `designer:service` new, list and retire prototype-owned services
- `designer:format` tidies changed files · `designer:save -- -m "<line>"`
  saves what is staged as one commit
- `designer:kit` finds the old Prototype Kit prototype and copies a page
  from it
- `new:set -- <id> --from high-risk-plants --title "<name>" --describe "<text>" --purpose working|frozen|research`
  starts a release

`tim prototype setup` (workspace-only) writes the designer marker, checks
the fetch-only `upstream` remote, installs, and gives a `tim auth`
readiness summary — run it once at the start of a session with a new
designer (`references/run-the-prototype.md`, "New here").
