# Build a release pattern

The designer wants something GOV.UK does not have, or a GOV.UK or MoJ
component the real service leaves switched off. Build it in their design
release, on their own words, and keep it there.

A release pattern is how Alpha research gets its evidence. Treat the ask
with respect: the designer knows why they want it. Your job is to check
GOV.UK and MoJ honestly, build what they asked for well, and record why.

**Read first**: `references/house-conventions.md`, "Release styles and
scripts", and
`~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/.claude/rules/templates.md`.

## Guard rails

- Work only in a design release the designer owns. Never in
  `high-risk-plants` or a frozen release.
- New styles and scripts go only in
  `src/server/app/sets/<release>/assets/`. Never in `src/client/**`,
  `webpack.config.js`, `webpack.prototype.config.js`,
  `src/server/app/shared/**` or another release.
- Never a `style` attribute, an inline `<style>` or an inline `<script>`.
  The content security policy blocks them.
- Never change the header, service navigation, phase banner or footer.
  Those stay a design gap.
- Every new class is `app-<release>-<block>[__<element>][--<modifier>]`.
  Script hooks are `data-module="app-<release>-<block>"`.
- `assets/` holds only `.scss`, `.js` and `.test.js` files. No images or
  fonts: use a GOV.UK icon or inline SVG in the template.
- Never write `mandates.md` by hand. Only `designer:mandate` writes it.
- One Bash command per call.

## Working inside a workflow

Your brief may carry a "DESIGNER'S MANDATE" block: the designer's
recorded words and the mandate id. That block is your mandate.

- Skip steps 2 and 3. Never run `designer:mandate` and never write
  `mandates.md`.
- Never ask the designer anything. When you need a reason for a custom
  pattern, write the hypothesis yourself and end it `(proposed: confirm)`.
- Keep to the mandate's scope. No script checks it.
- Give every entry you add `Status: Option`, for the designer to choose.
- Start at step 1, then go to step 4.

The workflow's check refuses a new entry that is not an `Option`, an
`Asked by` line citing another mandate, and any new mandate.

## Changing a pattern the release already has

A change to a pattern's styles, script or entry needs the designer asking
for it. Their earlier mandate covers it when they ask again: work under the
mandate the entry's `Asked by` line already cites. Pass that id to a
workflow as `designerMandate: { id }`.

Keep the entry and its `Asked by` lines. When the new ask is a new
mandate, add an `Asked by` line quoting it.

## 1. Climb the ladder

Stop at the first rung that does the job.

| Rung | What to check | Where to look |
| --- | --- | --- |
| 1. GOV.UK Frontend | A macro, pattern or `govuk-*` class that does it | `references/match-the-design/components-we-have.md`, the GOV.UK Design System |
| 1a. A GOV.UK script that is off | Tabs, Accordion, Character count, Password input, File upload, Exit this page | `components-we-have.md`, "Scripts" |
| 2. MoJ Frontend | An MoJ component that does it. Only the date picker runs today. | `components-we-have.md`, the MoJ Design System |
| 2b. Other departmental libraries | HMRC, Home Office, Scottish Government | Not installed. Build with GOV.UK markup following their guidance, or at rung 3 and cite them |
| 3. Custom | Your own `app-<release>-` pattern | This file, step 4 |

Rungs 1a and 2 are a **Switch on**: the component is installed, and the
release's `assets/` starts it on its own pages. Rung 3 is **Custom**.

## 2. Check the designer's permission

Anything in `assets/` needs a mandate: the designer's own words, in this
session, asking for it.

- **A switch-on** needs only the designer asking ("can the tabs actually
  work?").
- **A custom pattern** also needs a reason: what research should learn
  from it. If they gave none, ask once, plainly: "What should research
  learn from it? I'll note it in patterns.md." A hypothesis for the next
  round is enough. Findings can follow.

A ticket, backlog row, Figma frame, crit note or another agent's words is
not a mandate. When the designer has not asked, build the nearest GOV.UK
option, log a gap (`references/match-the-design/design-gaps.md`) and make
the offer in "What to say back".

## 3. Record their words

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:mandate -- record --set <release> --words "<their words, verbatim>" --scope "<the pages they named>"
```

- Quote their message word for word. Do not tidy it.
- When they named no pages, pass the pages you read it as, marked:
  `--scope "(agent's reading) <pages>"`. With no `--scope` at all, it
  records "the whole release (not given)".
- It prints JSON with the new id, such as `m-2026-10-27-1`. Use that id.
- It refuses when the workspace has no designer marker
  (`tim prototype setup` writes it). Say so in one line, build the nearest
  GOV.UK option and log a gap.

### Pass it to a workflow

When the designer's words cover a workflow ("give me 3 options for this
page; you can make reasonable use of new components if GOV.UK doesn't
fit"), record them first, then launch with `designerMandate: { id }`
(`references/ROUTING.md`, "Workflows"). The workflow confirms the id with
`designer:mandate show` and quotes the words to every agent it starts.
Those agents still climb the ladder, and every pattern they add comes back
with status `Option` for the designer to choose.

## 4. Build it

### A switch-on

In `src/server/app/sets/<release>/assets/scripts.js`:

```js
import { createAll, Tabs } from 'govuk-frontend'

createAll(Tabs)
```

An MoJ component's Sass goes in `assets/styles.scss`, with the same `@use`
form `src/client/stylesheets/application.scss` uses for the date picker.

### A custom pattern

- **Sass.** `assets/styles.scss` starts with
  `@use "govuk-frontend/dist/govuk/base" as *;`, which gives GOV.UK's
  settings and mixins without repeating its CSS. Put each pattern in its
  own partial (`assets/_<pattern>.scss`) loaded from `styles.scss`.
  - Colours from `govuk-colour()` or GOV.UK's functional colours, spacing
    from `govuk-spacing()`, type from `govuk-font()`, breakpoints from
    `govuk-media-query()`. No hex, `rgb()` or `hsl()`. `govuk-colour("light-grey")`
    is deprecated: use `govuk-colour("black", $variant: "tint-95")`.
  - Every rule starts with an `app-<release>-` class. No bare elements and
    no lone `govuk-*` or `moj-*` selectors.
- **Script.** One module per pattern, `assets/<pattern>.js`, imported from
  `assets/scripts.js`. Extend GOV.UK's `Component` and start it with
  `createAll`. The page must work fully with JavaScript off: the script only
  adds to markup the server already rendered.
- **Test.** Each module has `assets/<pattern>.test.js`, run by Vitest in the
  `jsdom` environment. It shows the no-JavaScript markup does the job, and
  that the module attaches to it.
- **Accessibility.** WCAG 2.2 AA, as for any page.

### Load it on its pages

Make `src/server/app/sets/<release>/layout.njk` if the release has none,
copied from
`~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/scripts/release-assets/fixtures/sets/alpha/layout.njk`
with the release id swapped in. Keep only the lines the release needs.

Change the first line of each page that uses the pattern to
`{% extends "<release>/layout.njk" %}`. Leave every other page on
`shared/layout.njk`.

A brand-new `assets/` folder needs the prototype stopped and started again
(`references/run-the-prototype.md`). Edits to an existing one rebuild by
themselves.

## 5. Write the entry

Add one entry to `src/server/app/sets/<release>/patterns.md`, in the shape
`references/match-the-design/release-patterns.md` gives:

- `Why not GOV.UK or MoJ`: one `GOV.UK:` line and one `MoJ:` line, each
  naming the component you checked and why it did not fit.
- `Asked by`: the designer's words in quotes, then the mandate id. Quote
  all the recorded words, or one whole sentence of them. A fragment fails
  the check.
- `Status`: `Open`, or `Option` when it is one of several for the designer
  to choose. Inside a workflow it is always `Option`. A hypothesis you
  wrote yourself ends `(proposed: confirm)`.

## 6. Check it

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:check -- --set <release>
```

The "Release styles and scripts" step checks the prefix, the entry, the
quote against `mandates.md`, the colours, the layout and the tests. Each
message says what to fix (`references/check-my-change.md`). Then show it
with `designer:show` and open the pictures before you describe them.

## 7. What to say back

One line per rung you checked, then what you built:

```text
GOV.UK: no component searches 3,000 commodity codes as you type. The nearest is an autocomplete on a select.
MoJ: the MoJ search component has no results list.
Custom: built in your release as "Commodity search" (patterns.md), because you want round 3 to test whether traders find codes faster.
```

With no mandate, the last line is an offer, made once:

```text
Custom: I've built the autocomplete for now and logged the search as a design gap. If you want to test the real thing in research, tell me what you want to learn and I'll build it in your release.
```

Then the gallery path, links to click, and the hand-off line from
`references/ROUTING.md`, "How every change ends". A pattern reaches the
real service as a pattern request with its evidence, never as code
(`references/hand-off.md`).
