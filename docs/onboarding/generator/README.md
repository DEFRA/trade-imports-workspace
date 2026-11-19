# Onboarding deck generator

The onboarding decks (`../NN-*.pptx`) and their text pages (`../NN-*.md`)
are generated, not hand-edited. This folder holds the generators so the
decks stay maintainable: change the content in one place, rebuild, and
every deck keeps the same theme.

## What's here

- `build-deck.js` — builds Session 1 (`01-workspace.pptx`). It's bespoke,
  because Session 1 has its own slides (the system-shape grid, the
  running-it-locally pipeline). Uses icons, so it needs `react-icons` and
  `sharp`.
- `build-skill-decks.js` — builds the skill sessions (`02`–`08`, plus the
  ticketing-track sessions `09`–`10`). It reads one content spec per skill
  and emits both the `.pptx` deck and the `.md` page, so the two never
  drift.
- `build-getting-started.js` — builds the ticketing track's BA-first
  on-ramp (`00-getting-started.pptx` + `.md`). It's bespoke (not a skill
  demo): the zero-assumption entry point for BAs and engineers — what the
  assistant is, the one-time engineer-led setup, then open a terminal → `cd`
  → run `claude` → talk to it like a colleague. Content lives in the
  `CONTENT` object at the top of the file; it emits both the deck and the
  page from that one source.
- `build-ticket-walkthrough.js` — builds the Session 2 deep-dive companion
  (`02b-ticket-walkthrough.pptx`). It's bespoke: a transcript-driven
  walkthrough of one real ticket (EUDPA-213) through plan/implement/refactor,
  with terminal-snippet slides lifted from the captured logs under
  `workareas/ticket-skill-demo/`. Its `.md` page is hand-written alongside
  it rather than generated.
- `skill-specs.js` — the content for Sessions 2 to 8 and the ticketing-track
  skill sessions 9 (`ticket-creator`) and 10 (`ticket-refiner`). **This is
  the file you edit.** One object per skill: title, what-it's-for, triggers,
  the demo steps, the outputs, the live-view rows, and the try-it.
- `../slide-theme.md` — the theme the generators implement (palette, slide
  types, the live-view callout). Read it before changing layout.

Both generators write their output back into the parent onboarding folder.

## Rebuild

```
cd docs/onboarding/generator
npm install        # first time only
npm run build      # rebuilds Session 1 and Sessions 2–8
```

Or rebuild one part: `npm run build:session1` / `npm run build:skills` /
`npm run build:walkthrough` / `npm run build:getting-started`.

Then open a deck in PowerPoint to eyeball it. The generators use Arial and
Courier New (both universal) so a deck renders the same on any machine.

## Change the content of a skill session

Edit that skill's object in `skill-specs.js`, then `npm run build:skills`.
The fields map straight onto the slides:

- `oneLiner` — the italic line on the dark title slide.
- `whyTitle` + `why[]` — the "What it's for" slide.
- `liveView[]` — the three rows on the yellow "Live view" slide. Keep the
  left value short (it's mono and shares the row with a description).
- `triggers` + `demo[]` — the "Watch it run" slide (3 to 5 steps).
- `outputsLead` + `outputs[]` — the "Reading the output" slide.
- `anatomy[]` — optional; adds an extra teaching slide (only
  `skill-creator` uses it).
- `tryIt` + `next` / `nextMd` — the green "Try it" slide and the page's
  next-link.

## Add a new skill session

Append an object to `skill-specs.js` with the next `n` and a `file` of
`NN-<skill>`, then `npm run build:skills`. Add the row to the session map
in `../README.md` by hand.

## Keep it honest

Content comes from each skill's `SKILL.md` — the source of truth. If a
skill changes, re-read its `SKILL.md` and update the spec. The decks
deliberately avoid restating exact arguments; they point at the live views
(`tim --help`, the `SKILL.md`) instead, so they don't rot between rebuilds.
