# Slide theme

One theme for every onboarding deck, so the recorded sessions read as a
single programme. Build each deck to this spec; do not restyle per
session.

## Look

A clean, modern, white-and-blue theme. Light throughout — white
backgrounds, blue accents, plenty of whitespace. Not tied to any house
style; the aim is clear and professional.

Palette:

| Use | Colour | Hex |
|-----|--------|-----|
| Text and titles | Ink (slate-900) | `#0f172a` |
| Primary accent | Muted steel blue | `#2e5077` |
| Emphasis blue | Steel blue (deeper) | `#22405f` |
| Panels / cards | Light grey (slate-100) | `#f1f5f9` |
| Live-view & try-it panels | Light blue-grey tint | `#eaeff5` |
| Muted / descriptions | Slate | `#64748b` |
| Secondary categorical (e.g. Java) | Amber | `#d97706` |
| Page background | White | `#ffffff` |

Type: a single sans-serif throughout (Arial — universal across machines),
with Courier New for commands, paths and skill names (mono signals
"something you type"). Sentence case for every heading — never title case.
Large type, few words; the detail is spoken to camera, not printed on the
slide.

## Slide types

Each deck is built from the same small set of slide types, all on white:

1. **Title** — programme name, session number, the skill name (large, in
   blue mono) and a one-line objective. A bold blue side band carries the
   structure; no thin rule under the title.
2. **Content** — a blue label, an ink heading, then cards or a small
   diagram on a blue left band. If it won't fit comfortably, split it.
3. **Live-view callout** — the recurring device that keeps the decks from
   going stale (see below): a blue "Live view" chip and blue-tint rows.
4. **Try it** — a blue-tint panel with the one thing the viewer should do
   themselves before the next session.

## The live-view callout

This is the load-bearing pattern. Whenever a slide would otherwise list
arguments, outputs or a target table that will drift, replace it with a
callout: a blue **Live view** chip and the single command or prompt that
shows current reality, in blue mono on a light blue-tint row. For example
"Run `tim --help`", "Read `CLAUDE.md`", or "Ask Claude: read the SKILL.md
for this skill and tell me how to drive it".

The slide shows the *door*, not the contents behind it. Recordings then
stay correct even as the underlying mechanics change, and the text pages
in this folder use the same prompts, so live and text stay in lockstep.

## Per-session running order

Every skill demo deck follows the same beat, which is also how the text
pages are structured:

1. Title slide — what this skill is for, in one sentence.
2. What it's for — the problem it removes, plus a "what you get" strip.
3. Live view — how to see its current surface (the callout).
4. Watch it run — the facilitator drives a real run on screen; slides here
   are prompts and checkpoints, not transcripts.
5. Reading the output — what came back and how to interpret it.
6. How you use it — when to reach for it, where you decide, how it fits.
7. Try it — the one thing to do before the next session.

Session 1 (the workspace, and running it locally) drops the skill-specific
beats but keeps the title / what-and-why / live-view / try-it spine.
Sessions 2 to 8 are each a single skill demo, titled by the skill name.

## Production notes

- Build decks as `.pptx` so they open in the team's usual tooling.
- One deck per session, named `NN-<slug>.pptx`, stored alongside the
  matching text page in this folder.
- Keep speaker detail in the notes pane, not on the slide.
- 16:9, since everything is screenshared and recorded.
