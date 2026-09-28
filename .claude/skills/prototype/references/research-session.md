# Research session

Gets a design release ready for a round of user research, then puts it back
afterwards. Four things, in this order:

1. a **research release** (a design release made for research),
2. one **stable link** per research task,
3. how **errors** behave: realistic (the default) or switched off on chosen
   pages ("research mode"),
4. a **participant sheet** for the facilitator.

Research mode is one commit titled exactly `Research mode on for <set-id>`. It
relaxes only the save rules the designer chose, and logs each one in
`src/server/app/sets/<set-id>/research-mode.md`. While that file exists, the
chooser shows a "Research mode on" tag. Afterwards `designer:research -- off <set-id>`
reverts the commit, which puts every rule back and removes the file and the
tag.

Talk to the designer in GDS plain English. Say "your research release", not
"set". Say which pages changed and give links.

## Guard rails

- **Never high-risk-plants.** It is the real journey. `designer:research -- on`
  refuses it. If the designer is working there, make a research release first.
- **Never a frozen release.** Start a research release from it instead.
- **Only inside the research release.** Every change stays in
  `src/server/app/sets/<set-id>/`. Before any edit, run
  `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:where -- <paths>`
  and follow what it says. Never edit the engine,
  `src/server/app/lib/`, `src/server/app/shared/`, another set, or any file
  `overrides.json` does not list as `ours` — if a request needs one, stop and
  offer `references/hand-off.md` instead.
- **Research mode changes save rules only.** Controllers' `fields`, and
  obligations' `status`. No wording, template or flow changes in the same
  commit: make those separately with the usual references, before or after.
- **One Bash command per call.** No `&&`, `;` or pipes. Never `--no-verify`,
  never `git reset --hard`, never force-push, never push or open a pull
  request without asking.
- **Never write the research-mode commit by hand.** Always use
  `designer:research -- on <set-id>`, so the title is exact and `off` can
  find it.

## Steps

### 1. Make or pick the research release

1. List the releases:

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:release -- list
   ```

2. If there is a research release for this round, use it. If not, follow
   `references/design-release.md` to make one from `high-risk-plants` with
   purpose `research`. Name it `plants-research-<topic>-<yyyymm>`, for example
   `plants-research-arrival-202610`:

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run new:set -- plants-research-arrival-202610 --from high-risk-plants --describe "Research round on arrival dates, October 2026" --purpose research
   ```

   A research release made from a working release uses `--from <that release>`.

### 2. Agree the tasks and give each a stable link

1. Ask the designer for the tasks, in order, and the page each one starts on.
   Keep to what they asked for. If they are unsure, or give a number of tasks
   without naming them ("three tasks"), propose them yourself from
   `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:examples -- fixtures <set-id>`:
   it lists each fixture's kind of journey, the pages it answers and where
   fixtures differ (potatoes are asked for a time and a place of landing,
   plants only for a date). Pick one task per difference that matters to the
   round's topic, at most 5, and say which you picked and why.
2. For each task that does not start on the dashboard, follow
   `references/example-data.md` to add an example **stopped at the task's
   starting page**, with a short example id (for example `arrival-task`). The
   example fills in every earlier page, so the participant starts exactly
   there. Three or more tasks that start on the same page repeat its address
   as `through`, which the code rules refuse
   (`sonarjs/no-duplicate-string`): name it once as a `const` at the top of
   the scenarios file, as `references/example-data.md` step 3 shows.
3. Check every example reaches its page, then print the links:

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:examples -- check <set-id>
   ```

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:examples -- links <set-id>
   ```

   Each link is `/examples/<set-id>/<example-id>`. It keeps working after the
   prototype restarts.

4. Write `src/server/app/sets/<set-id>/research-session.json` with the tasks
   (see `references/research-session/session-file.md`). Leave `deployedUrl`
   out: the sheet reads the deployed address from
   `scripts/designer/prototype.json` (in the prototype repo). When that says
   `null`, the prototype is not deployed yet: tell the designer the sessions
   run from a laptop with `designer:fresh` (step 5).
5. Save the examples and the session file with `references/share-my-change.md`
   before going on. They are not part of research mode.

### 3. Choose how errors behave

Ask once: "Should participants see errors exactly as the real service shows
them (the default), or should some pages let them through?"

- **Realistic** (default): change nothing. Go to step 4.
- **Let participants through**: agree which pages, and on each page which
  answers may be left blank. Then:

1. Check research mode is not already on:

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:research -- status <set-id>
   ```

   If it is on and the designer wants different pages, turn it off first
   (see "After the sessions").

2. Check `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype status`
   shows nothing else changed in the release. If something is, save it or
   undo it first (`references/share-my-change.md`).
3. Relax each chosen rule by following
   `references/research-session/relax-a-save-rule.md`. Swap required rules
   for their blank-allowed twins in the page's `controller.js`. If a task
   goes as far as submitting, also make the same answers `optional` in the
   release's `obligations/sections/*.js`. Tell the designer plainly what
   cannot be relaxed (commodity type, country of origin, commodity lists,
   check your answers' own errors).
4. Write `src/server/app/sets/<set-id>/research-mode.md` from
   `references/research-session/research-mode-template.md`: one row per
   relaxed rule, naming its file.
5. Check the release still works. Fix anything it reports before going on:

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:check -- --set <set-id> --full
   ```

6. Save research mode as its one commit:

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:research -- on <set-id>
   ```

   It refuses high-risk-plants, frozen releases, a changed rule file the log
   does not name, deletions, and other files already staged for a save
   (unstage them with
   `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype restore --staged <file>`:
   the edits stay). It stages and commits only the controllers, obligations
   and `research-mode.md` inside the release, and lists anything it left
   unsaved. The checks that run before every commit run here too, so it takes
   a few minutes. If it says the commit did not go through, read the reason it
   prints under that line: it is the pre-commit check's own message.

### 4. Make the participant sheet

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:research -- sheet <set-id>
```

It takes the deployed address from `scripts/designer/prototype.json`
(`--deployed-url <address>` overrides it for one sheet). It writes
`~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/.cache/designer/research/<set-id>/sheet.html`:
the local and deployed links for each task, how to sign in, the errors
switched off, how to Reset, and a checklist. Read the file and tell the
designer what is on it. Give them the path so they can open or print it. Say
plainly that the sheet is only on this computer: `.cache/` is never saved in
git, so it is not in a pull request and a clean checkout loses it. Run the
same command again for a fresh copy, or print it or attach the file to share
it. The session plan it is made from (`research-session.json`) is saved with
the release.

### 5. Remind the designer before the session

Run the walkthrough as a dry run first:

```
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:walkthrough -- --set <set-id> --no-open
```

Each task's example is a story, so every story that walks to its end means
every task link works. With errors off, the error story shows no messages —
that is expected, not a failure.

Say both of these, every time. When `deployedUrl` in
`scripts/designer/prototype.json` is `null`, say instead: "The prototype is
not deployed yet, so run the sessions from this laptop. Start it with
`designer:fresh`, so every restart starts from the examples, and open each
task link once before the first participant." and the Reset line with
"everyone using this laptop's prototype".

- "The deployed prototype only changes after your work is merged to `main`.
  Share it and get it merged the day before the session, then open each task
  link on the deployed prototype once."
- "Reset clears this release's data for everyone using the deployed prototype,
  including anyone in another session at the same time. Every participant opens
  the same example notification, so Reset between participants: on the
  prototypes page, under your release, select 'Reset this prototype's data'."

## After the sessions

1. Switch errors back on:

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:research -- off <set-id>
   ```

   It finds the `Research mode on for <set-id>` commit by its title and reverts
   it with a new commit. Every rule comes back, `research-mode.md` goes, and the
   chooser tag disappears. It refuses while the release has unsaved changes.
   If a later change touched the same lines, it changes nothing and says so:
   then put each rule in `research-mode.md` back by hand, delete the file, and
   save one change titled `Research mode off for <set-id>`.

   Link the walkthrough report in the write-up of the round too, so anyone
   who was not there can see what participants saw: read `reportsUrl` from
   `scripts/designer/prototype.json` and give
   `<reportsUrl>main/#?q=@<set-id>` once it is merged.

2. If the designer shares findings, draft them as a change list for the **next
   working release**, not this research release. Write
   `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/.cache/designer/research/<set-id>/findings.md`
   with one row per change: page, what to change, why (the finding), and the
   reference that makes it (`references/change-the-words.md`,
   `references/change-the-journey.md`, `references/match-the-design.md`,
   `references/example-data.md`, `references/fake-a-service.md`). Offer to
   start with the first row.
3. **Where a change after the round goes.** This is the one rule;
   `references/change-the-words.md`, `references/change-the-journey.md` and
   `references/match-the-design.md` all follow it. Any change asked for after
   the sessions (a wording change, a moved page) goes in a working release,
   picked in this order:
   1. the release this research release was made from (`from` in its
      `release.json`), when that is a working release that is not frozen;
   2. otherwise, a new working release made from this research release, so
      it starts from what participants saw: `references/design-release.md`
      section B with `--from <set-id> --purpose working` and the id
      `<set-id>-next` (or the name the designer gives).

   Before acting, tell the designer in one line where the change will land,
   and that option 2 makes a full copy of the release (about 150 files, saved
   as its own commit). Then carry on without waiting. The research release
   stays exactly as participants saw it, as the record of the round. Change
   the research release itself only when the designer says so ("change it in
   the research release", "fix the typo on task 2 before Thursday"): their
   words are the yes.

## Verify

1. Run the fast check:

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:check -- --set <set-id>
   ```

2. Photograph each task's starting page with its error state, where each
   task link lands, and the chooser:

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:show -- --set <set-id> --pages <start pages, comma-separated>,chooser --examples <task example ids, comma-separated> --errors
   ```

   It runs its own copy of the prototype on a free port from 3203, so it
   works even when something else holds 3103. The command prints a note per
   page ("Note on arrival-details: Sending this page empty moved on to the
   next page, so it has no error state to show"): with research mode on, that
   note is the proof a relaxed page lets participants through. Read the key
   PNGs yourself. With research mode off (or after `off`), the error state
   must be back. Never claim either without looking.

3. Open the sheet at
   `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/.cache/designer/research/<set-id>/sheet.html`
   and check every task has a link.
4. In the chooser picture, the release shows the "Research mode on" tag while
   `research-mode.md` exists, and not after `off`. Each `example:<id>` picture
   is the page a participant starts on.

## Hand-off

Research rules never ship. If the designer later says "hand this to the real
team", `designer:handoff` lists every row of `research-mode.md` under "cannot
ship", so turn research mode off first.

End with: "If this should become part of the real service, say 'hand this to
the real team' and I will prepare a brief and a patch for the plants-frontend
team."

## Before every save

Run the conventions pass (`references/conventions-pass.md`) before
`designer:save`.
