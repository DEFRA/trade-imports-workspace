---
name: theme-ticket
description: 'Write and maintain the business-facing Jira tickets for a theme that has already been built: one Story per service domain, with a background, a plain-English description of what changes for the user, and acceptance criteria copied from the openspec behaviour specification, for the BAs, POs and SMEs who validate the theme in a test environment. Also reports which tickets openspec has since moved on from. Triggers: "write the theme ticket", "theme ticket for EUDPA-X", "write the business tickets for <theme>", "split the theme ticket by domain", "regenerate the theme tickets", "which theme tickets are stale". NOT for raising a brand-new ticket from a conversation — that is ticket-creator, which interviews the user and drafts for iteration; this derives its content from work that already exists and owns the per-domain split. NOT for judging whether a ticket is ready for refinement (ticket-refiner), NOT for planning or implementing a ticket (the ticket skill — this writes no code), NOT for changing openspec itself (spec-catchup, spec-cover — this only reads it), and NOT for editing a backlog (requirements-pipeline owns that; this reads a theme backlog for row titles and repos but never writes to it).'
---

A theme's rows are built across every repo they touch, on one branch, and the
business never sees any of it. The only artefact a BA, PO or SME can open is the
Jira ticket. This skill writes that ticket from what actually shipped — the
openspec behaviour specification — and splits it by domain, because the people
who own live animals, high-risk plants and the Import notification service front
door are different people with different questions.

One Story per domain, each containing only that domain's changes. Branches and
pull requests stay at theme level; only the tickets split.

## Path conventions

Cross-workspace paths use the literal home-relative form —
`~/git/defra/trade-imports-workspace/tools/<domain>/`,
`~/git/defra/trade-imports-workspace/docs/best-practices/`,
`~/git/defra/trade-imports-workspace/workareas/`. Bash
expands `~` automatically. Skill-internal references stay
relative (`references/<NAME>.md`, `assets/<NAME>.md`).

**Bash call hygiene** — one command per Bash call. Full rule
table: [`docs/agent-skills.md`](../../../docs/agent-skills.md)
→ "Bash call hygiene".

## When to use

| Trigger | What to follow |
|---------|----------------|
| "write the theme ticket", "write the business tickets for `<theme>`", "theme ticket for EUDPA-X" | WRITE flow |
| "split the theme ticket by domain" | WRITE flow — it always splits |
| "regenerate the theme tickets" | WRITE flow against a theme whose tickets exist; descriptions are rewritten in place |
| "raise the theme stub", a theme being split off | STUB flow |
| "the build loop is starting on `<theme>`" | START flow |
| "`<theme>` has merged", "the theme merged to main" | MERGE flow |
| "which theme tickets are stale", "are the tickets out of date" | STALE flow |

NOT for raising a ticket from scratch (`ticket-creator`), assessing refinement
readiness (`ticket-refiner`), planning or building a ticket's code (`ticket`),
editing openspec (`spec-catchup`, `spec-cover`) or editing a backlog
(`requirements-pipeline`).

## Where this runs in the theme's life

A theme's ticket is filled in automatically from the development work, at four
points. Nothing here waits for a person.

| When | Flow | What happens |
|---|---|---|
| The theme is split off a backlog | STUB | One Story per theme, titled from the theme, status `Ready for Dev`. It exists to supply the branch name — there is no openspec for the theme's rows yet, so there is nothing to describe. |
| The build loop starts on the theme | START | Status → `In Dev`. No description change; openspec is still being written row by row. |
| The loop drains the theme | WRITE | Derive, split by domain, update the stub as one domain and create the others, each `In Dev`. This is the real fill-in. |
| The theme merges to `main` | MERGE | Regenerate against `main` so the spec links do not point at a deleted branch, then status → `Deskcheck`. |

**Why the loop itself does not call this.** The theme builds run
`lifecycle: "branch"`, which BUILD.md guarantees "makes no Jira call of any
kind" and which "refuses a value" in any Jira field. Driving a ticket from
inside the loop would break that contract. The orchestrating session, which
launches the loop per theme, runs START before it and WRITE after it instead —
same effect, contract intact. A programme's own
`workareas/<workarea>/themes/HOW-TO-BUILD.md` is where those steps belong, next
to the phrase that starts each theme's loop.

## The rules this skill holds to

These are load-bearing. Each one exists because getting it wrong produced a
ticket that told the business something untrue.

1. **Acceptance criteria come from `openspec/specs/`, never from the backlog.**
   The backlog records what was intended; openspec records what shipped. They do
   diverge — on journey foundation the backlog said Continue on an incomplete
   amend review is held with no error, while the shipped behaviour shows an error
   summary naming what is missing. The backlog supplies row titles and repos,
   nothing more.
2. **A ticket carries only its own domain.** Per-domain scenario counts must sum
   to the theme's total. `derive-scenarios.sh` fails rather than emit a split
   that does not sum, because a short ticket looks finished.
3. **Write it after the work is on a branch, not before.** openspec for a row
   only exists once that row is built. A ticket raised at split time is a stub
   whose only job is to supply the branch name.
4. **Status tracks the situation:** `Ready for Dev` when the ticket is created,
   `In Dev` while the theme is being built, `Deskcheck` once it is merged to
   `main`. On the EUDPA board the status `In Dev` is reached by a transition
   named `In Progress` — never assume transition name equals status name. Check
   with `tim jira transition <KEY> --list`.
5. **Spec links point at the branch while the work is unmerged**, and are
   regenerated to `main` on merge. A link to a deleted branch 404s.
6. **Jira wiki markup, not Markdown.** A single newline is a line break, so every
   paragraph is one unwrapped line. Scenario names are `h5.` headings, not bold
   lines — a line starting with `*` is one space from being parsed as a bullet.
   `[label|url]` links work inside table cells. `{expand}` does not work at all:
   `update-ticket.sh` posts to `rest/api/2`, which Jira Cloud converts to its own
   document format and drops macros, so it renders as literal text. There is no
   collapsing on this path; a genuinely collapsible section would need an
   Atlassian Document Format body posted to `rest/api/3`.
7. **Run without asking.** The description is derived from openspec, and it is
   regenerated whenever openspec changes, so a human gate before each push buys
   nothing — it only leaves the ticket stale until somebody gets round to it. The
   ticket exists *to be* the review: it is filled in automatically from the
   development work, and the business reviews the result. Create, update and
   transition without confirmation.

   Two things still hold. Report what you changed, with the keys and the counts,
   so the writes are visible after the fact. And when `derive-scenarios.sh` fails
   — counts that do not sum, an unmapped openspec area — stop and say so rather
   than publishing a ticket you cannot vouch for.

## How a service is attributed to a domain

Two separate mappings, and they answer different questions.

**Scenarios and spec files** are attributed by their path under
`openspec/specs/` — `live-animals/` is animals, `plants/` is plants, `ins/` is
the front door, `admin/` is animals admin. This is what decides which domains
get a ticket. An area with no mapping stops the run rather than being dropped
silently; add it to `SPEC_AREA_DOMAIN` in `derive-scenarios.mjs`.

**Rows** are attributed by the repos they changed. A repository whose name
carries a domain word belongs to that domain. One that carries none —
`trade-imports-reference-data`, `trade-imports-stub`,
`trade-imports-address-book` — is a shared component, and its changes belong in
every domain's ticket.

Two names the bare rule gets wrong, both checked first:

- **A test suite is ignored.** These tickets describe application behaviour a
  business reader can go and check; that the behaviour is tested is already
  proved by the openspec coverage links, so the test repository adds nothing
  here. Any repo ending `-tests` is skipped — which also avoids reading
  `trade-imports-ins-tests` as the front door's, when it holds every domain's
  suites.
- **`animals-admin` is its own domain**, not part of animals, so the longer word
  wins.

That gives three outcomes for a row:

| The services it changed | Where the row appears |
|---|---|
| One or more carrying a domain word | Those domains' tickets |
| Only shared components | Every domain's ticket |
| Only test suites | No ticket — it changed no application behaviour |

Two row states are also left out of the tables: a **test-only** row as above, and
a **dropped** row, which describes work deliberately not done. A **deferred** row
stays in with its state shown, because work being held is something the business
may want to see. `derived.json` lists what was left out per domain as
`excludedRows`, so the ticket can say a row was dropped rather than leave a
reader wondering where it went.

A row therefore appears in more than one ticket when it changed more than one
service. That is the programme's design, not duplication, and the ticket's row
table should say so. A test-only row is dropped silently from the tables but is
still counted in the theme's row total, so the two will differ — say so rather
than letting a reader think a row went missing.

## Step 0: Start

```bash
~/git/defra/trade-imports-workspace/tools/theme-ticket/start-theme-ticket.sh "<trigger phrase>" --workarea <path under workareas/> --theme <id>
```

First stdout line is `MODE: STUB`, `MODE: START`, `MODE: WRITE`, `MODE: MERGE`
or `MODE: STALE`. Branch on it. Pass `--mode <NAME>` to set it explicitly, which
is what an automated caller should do rather than relying on phrasing. The JSON
payload carries the workarea paths, the branch, and every existing ticket folder
with the Jira key it produced.

---

# STUB flow

Run when a theme is split off a backlog, because the branch name needs a ticket
number. There is no openspec for the theme's rows yet, so there is nothing to
describe and no domains to split into.

Write `<workareaDir>/tickets/<theme>-stub/ticket.json` — type `Story`, the
programme epic as `parent` — and a `description.txt` saying in two or three
lines which theme it is, how many rows it holds, and that the description is
filled in automatically once the build completes. Then:

```bash
tim jira create --from <workareaDir>/tickets/<theme>-stub/ticket.json
```

Re-run with `--confirm <planId>`, then `tim jira transition <KEY> "Ready for Dev"`.

Report the key so the branch can be named `feat/<KEY>-<programme>-<theme>`.

---

# START flow

Run when the build loop is about to work the theme. Move every ticket the theme
already has to `In Dev`:

```bash
tim jira transition <KEY> "In Dev"
```

Change no description — openspec is still being written row by row, and a
ticket regenerated mid-build describes a half-finished theme.

---

# WRITE flow

## Step 1: Derive

```bash
~/git/defra/trade-imports-workspace/tools/theme-ticket/derive-scenarios.sh --workarea <workarea> --theme <id> --out <workareaDir>/tickets/derived.json
```

This does the mechanical work, and it is the only place that should: the
extraction is all `git`, `grep` and file parsing, which Bash call hygiene keeps
out of LLM-typed commands.

It finds the theme's row commits, takes the scenario headings each one added to
each spec file, then reads those scenarios **in full from the current spec** —
a diff hides a `GIVEN` it did not change, so a scenario read from the diff comes
out truncated. It then splits scenarios and files by domain, maps rows to domains
by the rule above, and checks the counts sum.

Read `derived.json`. Note its `warnings` — a scenario added and later renamed is
counted but has no text, and needs looking up by hand.

## Step 2: Write one description per domain

For each domain in `derived.json`, write
`<workareaDir>/tickets/<domain-slug>/description.txt` in Jira wiki markup, in
this order:

- **`h3. Background`** — what changes and why it matters to this domain's users,
  in plain English. Say what this domain is *not* getting if a sibling domain
  behaves differently; on journey foundation, plants kept its own question order
  while animals was reordered, and the combined ticket implied otherwise. Say it
  is not yet merged. Name the sibling tickets.
- **`h3. What changes for the user`** — an `h4.` per behaviour group, a paragraph
  each. The row's `gate` field is the best raw material: it is already written
  for a person about to go and look at the change.
- **`h3. Acceptance criteria`** — `h4.` per behaviour group, `h5.` per scenario,
  then the `GIVEN` / `WHEN` / `THEN` / `AND` steps as a bullet list with the
  keyword bolded. Copy the text; do not paraphrase it.
- **`h3. The work behind this change`** — a table of this domain's rows: id,
  what it changed, state.
- **`h3. Where this is specified`** — a table of this domain's spec files, each
  name a link to the file on the branch, with the scenario count it gained. State
  the domain's totals, and that the description is generated and regenerated when
  the specification changes.

**Curating.** A theme can add far more scenarios than a ticket can carry — 74 on
journey foundation. Include every scenario that carries a distinct behaviour, and
collapse a family of near-identical ones into one scenario plus a sentence naming
the pages it also applies to. Always state the domain's full count and link every
file, so nothing is hidden by the curation. Keep the curated count roughly even
across domains: a count skewed to one service leaves another domain's BA unable
to see their own change.

## Step 3: Create or update

A domain whose ticket does not exist yet needs a `ticket.json` manifest beside
its description: `tim-ticket/1`, type `Story`, the epic as `parent`, and
`relates` naming the theme's original ticket. Then:

```bash
tim jira create --from <workareaDir>/tickets/<domain-slug>/ticket.json
```

Dry run by default. Read the plan, check it carries the right parent and
summary, then re-run with `--confirm <planId>` — the dry run is a correctness
check on the manifest, not an approval gate.

A domain whose ticket already exists is updated in place:

```bash
~/git/defra/trade-imports-workspace/tools/theme-ticket/push-description.sh <workareaDir>/tickets/<domain-slug>
```

This posts the description and the manifest's summary in one request, so the two
cannot drift, and refuses a description that is hard-wrapped or uses `{expand}`.
`tim` has no update command — this is why the helper wraps
`tools/jira/update-ticket.sh`.

## Step 4: Set the status

Per rule 4, from the theme's actual situation:

```bash
tim jira transition <KEY> "In Dev"
```

## Step 5: Record

Add each ticket to `<workareaDir>/tickets/README.md` — folder, Jira key, domain,
rows, scenarios, spec files — and state the arithmetic that the per-domain totals
sum to the theme's. That table is how a reader checks the split is whole.

---

# MERGE flow

Run when the theme has merged to `main`. Two things are now wrong: every spec
link points at a branch that may have been deleted, and the status still says
the work is in development.

Re-derive against `main` and rewrite each description so the links resolve:

```bash
~/git/defra/trade-imports-workspace/tools/theme-ticket/derive-scenarios.sh --workarea <workarea> --theme <id> --branch main --out <workareaDir>/tickets/derived.json
```

Push each description, then move each ticket on:

```bash
tim jira transition <KEY> "Deskcheck"
```

The scenarios themselves should not change — a merge moves commits, it does not
rewrite specs. If the counts differ from the pre-merge run, something landed on
`main` in between: say so rather than quietly publishing different numbers.

---

# STALE flow

```bash
~/git/defra/trade-imports-workspace/tools/theme-ticket/check-stale.sh --workarea <workarea>
```

For each ticket folder it compares when its cited spec files last changed on the
branch against when the Jira ticket was last updated, and prints a verdict per
ticket. It reports only.

Show the table, then re-run the WRITE flow for every stale ticket's theme. The
whole point is that the ticket tracks the specification; a stale one left stale
is the failure this skill exists to prevent.

## Completion output

```
theme-ticket complete for <theme>.

Tickets:
  <KEY>  <domain>  <N> scenarios, <F> spec files, <R> rows
  ...

Totals: <sum> scenarios across <files> files — matches the theme.
Status: all <status>.

Next: <what the user should check, or which tickets are still stale>.
```

## Scripts cheat-sheet

All under `~/git/defra/trade-imports-workspace/tools/theme-ticket/`:

| Script | Purpose |
|---|---|
| `start-theme-ticket.sh` | Step 0 dispatcher — emits `MODE: WRITE` or `MODE: STALE` plus the workarea paths, branch and existing ticket keys |
| `derive-scenarios.sh` | Finds the theme's row commits, reads the scenarios they added from the current specs, splits scenarios, files and rows by domain, and fails if the counts do not sum (wraps `derive-scenarios.mjs`) |
| `push-description.sh` | Posts a ticket folder's description and summary together, refusing hard-wrapped prose and `{expand}` |
| `check-stale.sh` | Compares each ticket's cited spec files against its Jira update time and reports what needs regenerating |
