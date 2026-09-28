---
name: prototype
description: 'Front door for a designer working on the high-risk plants prototype from the trade-imports workspace: they say what they want in their own words — a demo, a research round, notes from a crit, "I''m new, what can I do here", a feature the real service lacks, a story for the developers, "has the real service changed since I made my copy", starting something from scratch, or "make this real and build it properly" — and this works out the outcome and routes to the right reference. Use whenever CLAUDE.local.md marks the person as a designer, or the request names the prototype, a design release, or a design/* branch. NOT for real-repo work on trade-imports-plants-frontend, trade-imports-plants-backend or any other service repo (use frontend-change, ticket, ticket-creator or the other developer skills), and NOT for a maintainer''s own change to the prototype''s repo contract on a chore/* branch.'
---

# Prototype

You are helping an interaction or content designer work on the high-risk
plants prototype (`trade-imports-plants-prototype`), from a Claude Code
session opened at the workspace root
(`~/git/defra/trade-imports-workspace`). This skill is the one front door:
it holds no steps of its own beyond routing — every change is made by a
`references/<name>.md` file this skill opens for you.

## Who you are working with

Interaction and content designers. They know HTML, Nunjucks and the GOV.UK
Design System. They use git lightly and are not JavaScript architects.

- Reply in GDS plain English: short sentences, active voice, no jargon.
  Explain any term that is not already familiar.
- Say "your design release", never "set" or "plugin". Say what changed on
  which pages, and give links to click.
- Run every command yourself. Never ask a designer to type a command you
  could run.
- Never ask a designer to name a skill, a reference or a file. They say what
  they want; you work out the rest from `references/ROUTING.md`.

## The workspace-first premise

The prototype **runs** standalone:
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run dev`
(or `designer:fresh`) on its own stubs, no docker stack, no backend, no Jira
access needed to see a change. Nothing in this skill ever waits on the
workspace stack to show a result.

The workspace is where things are **built sympathetically with the real
service**. Every reference in this skill has you read the real
`trade-imports-plants-frontend`, its recipes, the owning backend's
controllers and contracts, `openspec/`, and
`~/git/defra/trade-imports-workspace/docs/best-practices/`, so what a
designer's request produces — a stub service, a client, a controller, a
template, `copy.en.js`/`copy.cy.js`, a validation rule, a test — reads as
though the real team wrote it. The designer never has to ask for this: see
`references/house-conventions.md`, which every code-producing reference
opens with.

## Load-bearing rules

Read these before any change, whatever the request:

1. **Ask whose file it is before any edit.** Run
   `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:where -- <paths>`
   and follow the answer. A file that "Belongs to the real service" is
   never edited on a `design/*` branch: offer "do it in your design
   release" (the default) or "prepare it for the real team"
   (`references/hand-off.md`).
2. **Never edit a frozen release.** Offer a working release made from it
   (`references/design-release.md`).
3. **Change `copy.en.js` and `copy.cy.js` together**, same keys, same
   function arguments. With no Welsh given, write
   `'[Welsh needed] <English>'`.
4. **Stay in the GOV.UK toolbox.** Nunjucks macros and `govuk-*` classes
   only (`moj-*` only through the date picker macro). No Sass, inline
   styles, new client JavaScript or webpack entries. Log what the toolbox
   cannot do in the release's `design-gaps.md`
   (`references/match-the-design/design-gaps.md` has the format).
5. **Example data replays real pages.** Never write a record by hand.
   Follow `references/example-data.md`.
6. **One change at a time, and every part of a request.** Do each part in
   turn, check it, show it, and end with the hand-off line (below). A list
   of notes, or four or more separate changes, uses the `design-session`
   workflow (`workflow/design-session.js`).
7. **Install only with `tim workspace install --repo trade-imports-plants-prototype`.**
   Never `npm install`, a bare `npm ci`, or any other install command. One
   Bash command per call: no `&&`, `;` or `|`.
8. **Never use `--no-verify`, never force-push, and never push or open a
   pull request unless the designer asked.** An explicit request in their
   own message ("save it and open a pull request") is the yes: do not ask
   again. Otherwise ask first.
9. **Bash paths are always tilde-form**
   (`~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/...`);
   Read/Write/Edit tools use the absolute form. Commands are always
   `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run <script> -- ...`
   and
   `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype ...`.
   A bare `npm run` or a bare `git` command from the workspace root acts on
   the **workspace** repo, which is the most dangerous failure here.
10. **Never edit** `.claude/settings.json`,
    `src/client/**`, `webpack.config.js`, `vitest.config.js`,
    `src/server/app/{engine,model,bridge,flow,shared,services,lib}/**` or
    `src/server/app/shared/layout.njk` in the prototype, except on a
    `handoff/*` branch (the upstream-bound route) or a maintainer's
    `chore/*` branch. The one exception on `design/*` branches is a
    prototype-owned service folder, made or changed only through
    `references/fake-a-service.md`.
11. **Work on a `design/*` branch.** Stay only on a `design/*` branch (or a
    `handoff/*` branch for the upstream-bound route). From any other branch,
    `main` or someone's `feat/*` or `chore/*` included, make
    `design/<release>-<slug>` before the first change (`references/ROUTING.md`,
    "Branches").
12. **Run `designer:walkthrough` with `--no-open`, always.** Serving the
    report blocks. Only the designer, never you, runs `-- --show` to watch
    it themselves.

## Open `references/ROUTING.md`

Everything else — the outcomes table, the phrase table, what to do when no
row fits, requests that fit two references, house conventions, and how a
hand-off reaches the real team — lives in `references/ROUTING.md`. Open it
now and follow it for the designer's request.
