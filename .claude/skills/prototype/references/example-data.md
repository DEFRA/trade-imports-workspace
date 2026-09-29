# Example data

Makes the example notifications a set starts with, and the extra parties,
ports and countries its pages offer. Every example is made by filling in the
set's **real pages**, the way a trader would, so it can never be something the
journey would refuse. Each example has a **slug**, its stable id, and a link
`/examples/<set-id>/<slug>` that keeps working after a restart.

The full guide, with every kind of example written out, is
`~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/docs/designers/example-data.md`.
Read it before your first change in a session.

Talk to the designer in GDS plain English. Say "your design release", not
"set". Say which examples and pages changed, and give the links.

**Read first**: `references/house-conventions.md`, "Kept deliberately" (why
`isStubDataMode()` stays) before touching a prototype-owned service's stub
rows.

## What goes where

| The designer wants                                                   | Change                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| A new example, or a different mix on the dashboard                   | `src/server/prototype-seed/scenarios/<set-id>.js`                                             |
| The same changed answers in several examples                         | a named fixture: `src/server/prototype-seed/fixtures/<set-id>/<file>.json`                    |
| A new party (trader, consignor, consignee, contact), port or country | `src/server/prototype-data/<set-id>/{parties,ports,countries}.json`, or `_all/` for every set |

All of these are the prototype's own. The weekly update never touches them.

Every example you write also becomes one story in that set's walkthrough — a
run through the release's pages that shows up in the published report.
`label` is the story's name, so write it for someone who was not in the
room: "Submitted, then amended", not "test3". Add a one-sentence `story` to
say why it exists, for example `story: 'A trader whose potatoes arrived
yesterday sends the notification late.'` — leave it out and the walkthrough
names the story after the fixture's use case instead.

## Guard rails

- **Replay, never write records.** An example is a list of page answers. Never
  create a record in code, never call the records store, never edit anything
  under `src/server/app/engine/`, or under `src/server/app/services/` other
  than a prototype-owned service's `stub.js` (below).
- **Never edit `happy-path.json` just to make an example.** Use `answers`
  or a named fixture instead. In `high-risk-plants` the file belongs to the
  real service and is never edited. In a design release it is the
  release's own, and it must change when the release's journey changes (a
  new required page, a new walk step): `references/fake-a-service.md`, "Put
  the page in the walk", and `.claude/rules/designer-sets.md` rule 4.
- **Never edit a real service's stub rows** (`src/server/app/services/<name>/stub*`
  for `address-book`, `countries`, `ports` and the other real services).
  Extra rows for those go in `src/server/prototype-data/`. A prototype-owned
  service's `stub.js` (its folder is on its own line in `ours`) is the
  release's to change, through `references/fake-a-service.md` (its starter
  rows, for example).
- **Never rename a slug** someone may have shared. Add a new example instead.
- **Never a frozen release.** If `src/server/app/sets/<set-id>/release.json`
  says `"frozen": true`, the release's examples are frozen too: start a
  working release with `references/design-release.md`.
- **Check ownership first.** Run
  `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:where -- <paths>`
  on every file you will change and follow what it says. If anything is
  "Belongs to the real service", stop and offer "do it in your design
  release" or `references/hand-off.md`. Check `overrides.json` if unsure.
- **One Bash command per call.** No `&&`, `;` or pipes. Never `--no-verify`,
  never force-push, never push or open a pull request without asking.

## Steps

### 1. Pick the set and check ownership

1. Use the set the designer names. If they name none, use their working design
   release
   (`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:release -- list`).
   If they name none and have no working release of their own, make
   `plants-working` now without asking (`references/design-release.md`
   section B, saved as its own commit), then come back here: that is the
   default, so the examples sit beside the designer's own changes. Use
   `high-risk-plants` only when they name it (its scenario file is the
   prototype's own, so that is allowed).
2. Run
   `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:where -- <each file you will change>`.
   For a scenario file that does not exist yet, name it anyway: it reports
   "Yours".

### 2. See what is there

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:examples -- list <set-id>
```

It lists each example's slug, label, what it will be (draft, submitted,
amended, deleted) and where it stops. A set with no scenario file shows its four
default examples. To add to them, start the file:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:examples -- init <set-id>
```

To see which fixtures an example can use, what each is for and which pages it
answers:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:examples -- fixtures <set-id>
```

It ends with "Where they differ": the pages only some fixtures visit (the
consignor page is only for plants and wood, for example) and the pages that
ask different questions (arrival details asks potatoes for a time and a place
of landing, plants only for a date). Pick the fixture from this list. When the
designer gives a number of examples or research tasks but does not name them,
propose them from this list, one per kind of journey, and say which you chose.

### 3. Make the change

**An example.** Add one entry to `src/server/prototype-seed/scenarios/<set-id>.js`,
following the grammar at the top of `src/server/prototype-seed/grammar.js`:

| Request                                                                 | Entry                                                                                                                                                         |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "stopped at the X page", "a link straight to X"                         | `fixture` + `through: '<page address>'`                                                                                                                       |
| "every page answered", "ready to check and submit", "not submitted yet" | `fixture` only: no `through` and no `submit`. (`through` stops _on_ that page and leaves it empty.)                                                           |
| "submitted"                                                             | `submit: true`                                                                                                                                                |
| "late"                                                                  | `fixture: 'warePotatoesLate'` + `submit: true`, or any fixture with `answers: { 'arrival-details': { arrivalDate: { daysFromToday: -1 } } }` + `submit: true` |
| "amended"                                                               | `submit: true, amend: true`                                                                                                                                  |
| "amendment cancelled"                                                   | `submit: true, amend: true, cancelAmend: true`                                                                                                                |
| "deleted"                                                               | `delete: true`                                                                                                                                                |
| "copied"                                                                | `copy: '<slug of an earlier example>'`, plus `answers` for what differs                                                                                       |
| "another organisation"                                                  | `organisationId: '<organisation id>'`                                                                                                                         |
| "fill the dashboard"                                                    | several entries, each with a different fixture or `answers`                                                                                                   |
| "an example that takes the other branch"                                | `fixture: '<the scenario that answers the other way>'`: any scenario in the happy path can be an example, not only the first four                             |

Write `fixture` in the short form, `fixture: 'warePotatoes'`, never
`fixture: { file: 'happy-path', name: 'warePotatoes' }`. The long form
repeated on five examples breaks a code rule (`sonarjs/no-duplicate-string`)
and the save is refused. `init` writes the short form.

The same rule counts every string of 10 or more characters written 3 or
more times in the scenarios file: a page address (`'arrival-details'` as the
`through` of three research tasks), an answers key, or a label. When a string
would appear a third time, name it once at the top of the file and use the
name:

```js
const ARRIVAL_DETAILS = 'arrival-details'

export const examples = [
  {
    label: 'Task 1: potatoes, at arrival details',
    slug: 'arrival-task-1',
    fixture: 'warePotatoes',
    through: ARRIVAL_DETAILS
  },
  ...
]
```

Check for this before running `designer:check`:
`grep -c "'<the string>'" <file>` prints how many times it is there.

- Page addresses are the `slug` values in the set's
  `journeys/linear/flow/fixtures/happy-path.json`, for example `origin`,
  `arrival-details`, `commodities/details`. Only pages the fixture visits can
  be used for `through` and `answers`.
- Field names come from that fixture, and from the page's `controller.js`
  (and `fields.js` where it has one) under
  `src/server/app/sets/<set-id>/journeys/linear/features/<page>/`. Never guess
  a field name.
- Give each example a short slug in lower-case words joined by hyphens, and a
  label in the designer's words.
- Say plainly when a request cannot be shown as asked:
  - A deleted notification is never listed on the dashboard; its link shows the
    dashboard's "deleted" banner.
  - The real plants service has no "Copy as new" button; a copied example is a
    new draft with the same answers, and nothing on screen says it was copied.
    To give the designer the button and its page, offer
    `references/fake-a-service.md`
    (`references/fake-a-service/copy-as-new.md`).

**A party, port or country.** Add a row to the right JSON list in
`src/server/prototype-data/<set-id>/` (or `_all/`). The shapes are in the guide
and in `src/server/prototype-data/rows.js`. Every id or code must be new. A
party's `country` is the country's name, such as `France`. To use a new party
or port in an example, give its id or code in `answers`.

### 4. Check the examples

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:examples -- check <set-id>
```

Every example must say "Reached". A "Stopped" line quotes the page:
`Example '<label>' stopped at <page>: the page said '<message>'`. Change that
example's `answers` for that page to satisfy the message, and check again. At
most 3 tries, then stop and explain to the designer what the page wants. An
extra country refused on the origin page is the real rule for that commodity:
suggest another country or another fixture.

### 5. Check the change

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:check -- --set <set-id>
```

It runs the code rules on the scenario file too, and names the file, line and
rule of each error. Explain any failure in plain English and fix it
(`references/check-my-change.md` explains every message).

### 6. Show it

Tell the designer: "Saving restarted the prototype. Open the set while signed
in, or press **Reset this prototype's data** under it on
`http://localhost:3103/`, and the examples are made again."

Then take the pictures: the dashboard (pictured with every example on it,
before and after), and where each new example's link lands:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:show -- --set <set-id> --pages dashboard --examples <new slugs, comma-separated> --before
```

Read the key PNGs yourself before you describe them. Never claim a visual
result you have not looked at. (An example made for another organisation is
not on the dashboard pictures: they are taken as the example-data user.)

### 7. Give the links

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:examples -- links <set-id>
```

Give the designer the new examples' links. For another organisation's example,
the link signs in as that organisation first, on their computer and on the
deployed prototype alike.

A link opens the page the example stopped at. Add `?page=<page>` to open
another page of the same notification: `?page=task-list`, or
`?page=notification-view` for check your answers. Use these in pull requests
and research sheets to link straight to the page that changed.

## Featured journeys (what the demo page shows first)

"put the amend journey first", "take deleted off the demo page", "call it
'Change a sent notification'", "feature this journey", "what shows first
for stakeholders" all mean changing `featured` and `headline` on examples
in `src/server/prototype-seed/scenarios/<set-id>.js`, not writing a new
example:

| The designer says | Change |
| --- | --- |
| "put the X journey first" (or second, third, fourth) | Set `featured: <n>` on X's example. If another example already has that number, renumber it out of the way first (never leave two examples sharing a number). |
| "take X off the demo page" | Remove `featured` (and `headline`) from X's example. It still shows in the full report. |
| "call it '<new title>'" | Set `headline: '<new title>'` on the example. It defaults to `label` when left out. |

Never feature more than 4 examples in one set. The error-messages story is
always featured last, one place after the highest number in use, and it
cannot be moved or removed: say so plainly if the designer asks.

Check the order before calling it done:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:examples -- check <set-id>
```

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:walkthrough -- --set <set-id> --fast --no-open
```

`--fast` skips the human pacing, so this only proves the order and the
headlines, not the finished video. Open the demo page it names
(`.cache/designer/walkthrough/site/index.html`) and read it yourself before
telling the designer what leads it now.

## Verify

- `designer:examples -- check <set-id>` reports every example as "Reached".
- `designer:check -- --set <set-id>` passes.
- The gallery from `designer:show` shows the new example on the dashboard
  (with a red "Late" tag for a late one) and its stop page filled in up to
  that page.
- Each new link opens the right page after a restart.

## Hand-off

Examples never ship: the real service's notifications come from real traders.
New parties, ports or countries the design depends on go in the hand-off brief
as test-data rows for the real team.

End with: "If this should become part of the real service, say 'hand this to
the real team' and I will prepare a brief and a patch for the plants-frontend
team."
