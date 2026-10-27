# Worked example: a spacing ask and a colour ask

This is what a good run of `references/match-the-design.md` looks like for
two common asks. Use it to check your own mapping.

## The ask

The designer, working in their release `plants-working`, says:

> On the dashboard, reduce the gap under the heading to 10px and make the
> status blue. Here is the Figma frame: `dashboard-v4.png`.

## 1. Whose file is it?

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:where -- src/server/app/sets/plants-working/journeys/linear/features/dashboard/template.njk
```

The answer starts "Yours: safe to change." Carry on. (Had it named
`high-risk-plants`, the reference would stop and offer the release or
`references/hand-off.md`.)

## 2. The starting pair

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:show -- --set plants-working --pages dashboard --reference dashboard=dashboard-v4.png
```

## 3. The differences, one row each

1. The gap under the page heading is 50px; the design has 10px. It comes from
   `h1.govuk-heading-xl`, whose bottom margin is spacing step 8.
2. The status tags are green or yellow; the design has them blue. They come
   from the `govukTag({ text: row.status.text, classes: row.status.classes })`
   call.

## 4. The mapping

1. A 10px gap is step 2 on the spacing scale at every width. Add
   `govuk-!-margin-bottom-2` to the heading (`figma-to-govuk.md`, "Spacing").
2. Blue is the default tag colour. The codebase's name for it is
   `govuk-tag--blue` (`figma-to-govuk.md`, "Colour").

## 5. The edit (template only)

In `src/server/app/sets/plants-working/journeys/linear/features/dashboard/template.njk`:

```diff
-  <h1 class="govuk-heading-xl">{{ copy.title }}</h1>
+  <h1 class="govuk-heading-xl govuk-!-margin-bottom-2">{{ copy.title }}</h1>
```

```diff
-            {{ govukTag({ text: row.status.text, classes: row.status.classes }) }}
+            {{ govukTag({ text: row.status.text, classes: "govuk-tag--blue" }) }}
```

No `.scss` file, no `src/client` file and no controller changed. The "Late"
tag keeps its red: it is a separate `govukTag` call, and the designer did not
ask about it.

If the designer had wanted only one status blue (say "Submitted"), the colour
per status is set where the row is built. In a release that is
`journeys/linear/features/dashboard/view-model/row/index.js`, which is the
designer's own file: override `classes` there for that status. In
`high-risk-plants` the colours come from `src/server/app/shared/kit.js`, which
belongs to the real service.

## 6. A bespoke colour: build the nearest and log the gap

The designer follows up:

> Actually the status should be navy, #1d3f6e, like the Figma.

GOV.UK tags come in 9 fixed colours and there is no navy. The nearest is the
default blue, which is already built. Nothing changes in the template. One row
goes at the end of `src/server/app/sets/plants-working/design-gaps.md`
(creating the file with its heading and table header if it is the first gap):

```text
| dashboard | Status tag in navy (#1d3f6e) | `govukTag` with `govuk-tag--blue` (default blue) | GOV.UK tags come in 9 fixed colours; a new colour needs Sass in the real service. | dashboard-v4.png |
```

## 7. Check, show, tell

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:check -- --set plants-working
```

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:show -- --set plants-working --pages dashboard --reference dashboard=dashboard-v4.png
```

Then tell the designer, in plain words:

- "On the dashboard, the heading now has a 10px gap below it, and every status
  tag is blue."
- "Navy is not a GOV.UK tag colour, so the tags use GOV.UK blue. I have logged
  navy as a design gap for the plants team."
- the gallery path and the link, for example
  `http://localhost:3103/plants-working`
- any new accessibility findings from the gallery
- the hand-off line

## 8. The designer asks for navy, with a reason

Later the designer says:

> We're testing whether navy reads as submitted in round 3, so can the tag
> really be navy?

That is a mandate for a custom pattern, with its reason. Follow
`references/custom-pattern.md`.

Record the words, verbatim:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:mandate -- record --set plants-working --words "We're testing whether navy reads as submitted in round 3, so can the tag really be navy?" --scope "dashboard"
```

It prints the id, say `m-2026-10-27-1`.

`src/server/app/sets/plants-working/assets/styles.scss`:

```scss
@use "govuk-frontend/dist/govuk/base" as *;
@use "submitted-tag";
```

`src/server/app/sets/plants-working/assets/_submitted-tag.scss`:

```scss
@use "govuk-frontend/dist/govuk/base" as *;

.app-plants-working-submitted-tag {
  color: govuk-colour("white");
  background-color: govuk-colour("blue", $variant: "shade-50");
}
```

GOV.UK's darkest blue is the navy here. It is close to #1d3f6e, and it keeps
the colour on the GOV.UK palette.

The dashboard template's first line becomes
`{% extends "plants-working/layout.njk" %}`, and the release's
`layout.njk` loads only `release-plants-working.css`, because there is no
script. The row's `classes` for the Submitted status become
`govuk-tag app-plants-working-submitted-tag`.

The design gap row from section 6 becomes
`Closed: built as the "Navy submitted tag" release pattern`, and
`patterns.md` gains:

```markdown
## Navy submitted tag

- Kind: Custom
- Pages: dashboard
- Classes: app-plants-working-submitted-tag
- Files: assets/styles.scss, assets/_submitted-tag.scss
- Why not GOV.UK or MoJ:
  - GOV.UK: Tag. 9 fixed colours, none of them navy.
  - MoJ: Badge. Its colours are the GOV.UK ones.
- Need or hypothesis: traders read a navy tag as "submitted" more readily than GOV.UK blue.
- Research round: Round 3 (next round)
- Findings: none yet
- Asked by: "We're testing whether navy reads as submitted in round 3, so can the tag really be navy?" (m-2026-10-27-1)
- Status: Open
```

Then tell the designer:

```text
GOV.UK: Tag has 9 fixed colours, and none is navy.
MoJ: Badge uses the same GOV.UK colours.
Custom: built in your release as "Navy submitted tag" (patterns.md), because you want round 3 to test whether navy reads as submitted.
```
