# Trial T4: vague request ("get the prototype into good shape for Thursday's stakeholder demo")

Host: Claude Code, in `repos/trade-imports-plants-prototype`, branch
`feat/NO_JIRA-designer-prototyping-refine-trial-T4-vague` (from
`feat/NO_JIRA-designer-prototyping` at c4a686a). Two commits were made: 2167ac9
and 4a543eb. Nothing was pushed and no PR was opened, as the trial brief said.
Afterwards I switched back to `feat/NO_JIRA-designer-prototyping`, and
`git status --short` came back clean.

## How I found the guidance

- `CLAUDE.md` loads `AGENTS.md`. Its "Working out what they want" section
  and **Outcomes** table have a row, "A demo or stakeholder review", whose
  example phrase is "we've got a demo on Thursday". That matched straight
  away. I did not need a skill name, a phrase table or a search.
- That row gives 4 parts: (1) pick or freeze the release (design-release),
  (2) add examples with links (example-data), (3) make a review pack
  (show-my-change), (4) save and open a PR (share-my-change). I read the three
  SKILL.md files that row names by path. I skipped share-my-change because the
  brief bans a push or PR.
- Rule 9 ("No working release yet? Make one, then carry on") covered the
  missing release, so I did not have to ask.

## Outcome and parts (named up front)

Outcome: a demo-ready release on Thursday, with realistic notifications in
every status, stable links, a clean check and a gallery with a walkthrough.

## Steps and evidence

1. **What already held.** Preflight passed. Port 3103 was already serving a
   prototype, and nothing was stopped.
   - `designer:release -- list` showed only `high-risk-plants` and
     `sample-journey`. So there was **no working release**.
   - I fetched `origin/main` and `upstream/main`. The branch was 0 commits
     behind prototype main.
   - `git log HEAD..upstream/main -- src/server/app/sets/high-risk-plants` was
     empty, so the real journey is current.
2. **Made the release** (design-release section B):
   - Ran `new:set -- plants-working --from high-risk-plants --title
     "Stakeholder demo" --describe ... --purpose working`.
   - `designer:format` tidied 1 file.
   - `designer:check --full` passed everything: 149 files, all mine, and 3,380
     unit tests.
   - Saved as 2167ac9 "Start design release plants-working from
     high-risk-plants".
   - `designer:release -- drift plants-working` said "The real team has not
     changed any page since".
3. **Examples** (example-data):
   - `designer:where` said the scenario file was "Yours".
   - `examples -- init` started it with 4 defaults.
   - I added `ready-to-submit` (plantsForPlanting, every page answered),
     `late` (warePotatoesLate, submitted) and `submitted-wood`.
   - `examples -- check` reached 7 of 7.
   - `designer:check --full` passed.
   - Saved as 4a543eb "plants-working: examples for the stakeholder demo".
4. **Review pack** (show-my-change):
   - Ran `designer:show --pages all,dashboard,chooser --before --errors
     --mobile --video --examples ready-to-submit,late,amended`. It produced 86
     pictures of 18 pages and `walk.webm`, and the automatic accessibility
     check found no problems.
   - A second run, `--pages chooser,dashboard --examples
     ready-to-submit,amended`, took the chooser picture and the fixed
     ready-to-submit picture.
   - I opened and read these pictures:
     - dashboard: 9 cards, showing Draft, Submitted, "Submitted + Late" (red
       tag), Amending, and Amend buttons
     - the late example's confirmation page: green panel plus an "outside the
       required timing" warning
     - the ready-to-submit example: overview with every task Completed
     - the chooser: "Stakeholder demo", tagged "Working release", with 7
       example links
   - Galleries:
     - `.cache/designer/show/plants-working/2026-09-28T11-04-45/index.html`
       (full pack)
     - `.../2026-09-28T11-07-08/index.html` (chooser and fix)
5. **Links**: `designer:examples -- links plants-working` printed 7 stable
   links under `http://localhost:3103/examples/plants-working/<slug>`.
6. **"Needs a real service"**: nothing in this release uses a
   prototype-owned service. `designer:service -- list` flags 4 services
   (transporters, templates, ins-address-book, notification-search). If the
   demo strays into those pages, they need that caveat.

## What I would say to the designer (no skill names)

"Your demo release, 'Stakeholder demo', is ready. It is a fresh copy of the
real journey, and the real team has changed nothing since. It has 7 example
notifications covering every status, including a late one and one ready to
submit live, all with links that keep working after a restart. Every check
passed, and there is a gallery and a walkthrough video. One question: is there
a particular story or set of pages you want to lead with? If not, I suggest
dashboard, then 'Ready to check and submit', then submit, then the late
confirmation. Until the pull request is merged and deployed, demo from your
laptop with `npm run designer:fresh`. I can freeze it so nothing changes before
Thursday."

That is one plain question, and it does not block anything: I took the likely
reading, the whole journey with a dashboard full of examples.

## Friction

1. **Minor. The outcome row does not say what to name a demo release, or
   whether to freeze one that has only just been made.** The row says "Pick
   the release to show; freeze it if it must stay put", and rule 9 says to use
   `plants-working`. There is no guidance on a demo-specific id or title. The
   row also does not say that a working release already ignores the weekly
   update, so freezing only guards against the team's own edits. Freezing
   (section C) also makes a second working copy, which is heavy before a demo.
   I did not freeze, and offered to instead.
2. **Major. The example-data table has no row for "every page answered, not
   submitted".** I first used `through: 'consignment/contact/select'`, reading
   it as "stops after". The grammar says "stop on this page, leaving it to fill
   in", so the contact page was left empty. You can only find out that
   dropping `through` without `submit` gives a fully answered draft by
   experimenting.
3. **Major. `designer:show --pages all,dashboard,chooser` silently left out
   the chooser.** There was no picture and no note. A separate
   `--pages chooser,dashboard` run did produce it.
4. **Minor. `examples -- init` on a new release starts from 4 generic
   defaults.** It does not copy the real journey's 9 richer examples (copied,
   deleted, another organisation, cancelled amendment). A demo release looks
   thinner than the real journey's chooser entry.
5. **Minor. The review-pack preset includes `--before`.** On a release made a
   minute earlier, every before/after pair is identical. That is noise for a
   demo.
6. **Minor. Step 4 of the outcome says "save and open a pull request".** That
   contradicts rule 8 (ask first) unless the designer asked. The brief banned
   it here, so it did not bite, but the row should say "offer".
7. **Observation (real service, not changed).** On the overview, "Check and
   submit" shows "Optional" even when every task is complete. It looks odd in
   a demo. It belongs to the real service, so it is a hand-off candidate.

## Against the success criteria

- Named the outcome and split it into parts: yes.
- Checked what already holds (release, drift, examples, clean check): yes.
- At most one plain question: yes, one, and it did not block.
- Demo-ready result:
  - fresh examples with stable links: yes
  - clean full check: yes
  - gallery plus video: yes
  - "needs a real service" flagged: yes (none used in this release; the 4
    listed as a caveat)
- No skill names reach the designer: yes.
