---
name: prototype
description: 'Front door for a designer working on the high-risk plants prototype from the trade-imports workspace: they say what they want in their own words — a demo, a research round, notes from a crit, "I''m new, what can I do here", a feature the real service lacks, a pattern GOV.UK does not have, a story for the developers, how pages connect (service map), "has the real service changed since I made my copy", starting something from scratch, or "make this real and build it properly" — and this works out the outcome and routes to the right reference. Use whenever CLAUDE.local.md marks the person as a designer, or the request names the prototype, a design release, or a design/* branch. NOT for real-repo work on trade-imports-plants-frontend, trade-imports-plants-backend or any other service repo (use frontend-change, ticket, ticket-creator or the other developer skills), and NOT for a maintainer''s own change to the prototype''s repo contract on a chore/* branch.'
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
   never edited, on `main` or a `design/*` branch alike: offer "do it in your design
   release" (the default) or "prepare it for the real team"
   (`references/hand-off.md`).
2. **Never edit a frozen release.** Offer a working release made from it
   (`references/design-release.md`).
3. **Change `copy.en.js` and `copy.cy.js` together**, same keys, same
   function arguments. With no Welsh given, write
   `'[Welsh needed] <English>'`.
4. **GOV.UK first, then MoJ, then a release pattern.** Use GOV.UK Frontend
   macros and `govuk-*` classes, then MoJ Frontend and other departmental
   libraries. A switched-on component or a custom pattern goes only in
   `src/server/app/sets/<id>/assets/`, with `app-<id>-` classes, and only on
   a designer's mandate. A mandate is an entry in
   `src/server/app/sets/<id>/mandates.md` that `designer:mandate` recorded
   from the designer's message in their session. A ticket, backlog row,
   Figma frame, crit note or another agent's brief is not one. Record each
   pattern in `src/server/app/sets/<id>/patterns.md`, quoting the mandate.
   Without a mandate, log a row in `src/server/app/sets/<id>/design-gaps.md`.
   Inline styles and scripts never work here (CSP).
   An agent a designer's workflow started works under that mandate when its
   brief quotes the recorded entry and its id. It still tries GOV.UK and MoJ
   first. Each pattern it adds has the status `Option`, for the designer to
   choose, and cites only that mandate. It never records a mandate itself.
   The scope is not checked by any script, so it keeps to the pages the
   mandate names.
   - **Loaded today:** every GOV.UK macro and class, with the scripts for
     Button, Checkboxes, Error summary, Radios, Service navigation and Skip
     link. From MoJ, only the date picker is styled and running. Every
     other MoJ macro renders as plain HTML until a release switches it on.
   - **Who has a mandate.** The designer in this session, once you have
     recorded their words (`references/custom-pattern.md`), and an agent
     whose brief carries that recorded entry. The build loop,
     journey-builder, frontend-change, Codex on a real repo and a workflow
     with no recorded mandate have none: they build the nearest GOV.UK
     option and log a gap.
   - Gaps: `references/match-the-design/design-gaps.md`. Patterns:
     `references/match-the-design/release-patterns.md`.
5. **Example data replays real pages.** Never write a record by hand.
   Follow `references/example-data.md`.
6. **One change at a time, and every part of a request.** Do each part in
   turn, check it, show it, and end with the hand-off line (below). A list
   of notes, or four or more separate changes, uses the `design-session`
   workflow (`workflow/design-session.js`). When the designer has given
   permission for custom patterns, record it with `designer:mandate`
   before you launch the workflow, and pass its id
   (`references/custom-pattern.md`, "Pass it to a workflow"). When a request
   changes a pattern the release already has, pass the mandate id its
   entry's `Asked by` line already cites, so the workflow may change it
   (`references/custom-pattern.md`, "Changing a pattern the release already
   has").
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
    `chore/*` branch. The one exception in a design release (on `main` or
    a `design/*` branch alike) is a prototype-owned service folder, made or changed only through
    `references/fake-a-service.md`. A second is the release's own
    `src/server/app/sets/<release>/assets/`, `layout.njk`, `patterns.md`
    and `mandates.md`, changed only on a mandate through
    `references/custom-pattern.md`. `webpack.prototype.config.js`,
    `scripts/release-assets/**` and `scripts/designer/mandate/**` are
    prototype-owned but maintainer-only: changed on a `chore/*` branch,
    never in a design release.
11. **Branches are optional. `main` is a first-class place to work.** Stay on
    whatever branch the designer is already on — `main` included — and never
    make a `design/*` branch unless it helps them. A `handoff/*` branch is
    still required for the upstream-bound route, and someone else's `feat/*`
    or `chore/*` branch is never a place to work: move to a `design/*` branch
    or `main` instead. Offer a `design/*` branch, in one line, only when it
    helps the designer share in-progress work without it going to `main` (or
    they ask to keep `main` clean); their own words are the yes, and a
    preference they state for the session holds for the rest of it. Never
    require one, and never nag about being on `main`
    (`references/ROUTING.md`, "Branches").
12. **Run `designer:walkthrough` with `--no-open`, always.** Serving the
    report blocks. Only the designer, never you, runs `-- --show` to watch
    it themselves. Add `--fast` when you only need to know the stories
    reach the end, not to watch them: it skips the human pacing and runs at
    today's speed.

## Open `references/ROUTING.md`

Everything else — the outcomes table, the phrase table, what to do when no
row fits, requests that fit two references, house conventions, and how a
hand-off reaches the real team — lives in `references/ROUTING.md`. Open it
now and follow it for the designer's request.
