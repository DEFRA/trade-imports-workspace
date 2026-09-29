# Hand off

Prepares a change made in a design release so the real plants-frontend team
can build it: a folder `handoffs/<yyyy-mm-dd>-<slug>/` (inside
`~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/`)
with

- `brief.jira.txt`: the story in Jira wiki markup. It starts with the story
  itself: the summary, _As_, _I want_ and _So that_, the description, the
  acceptance criteria as _Given_, _When_, _Then_, and a Tech Notes panel
  (patch, drift, services, tests, recipe, branch). Then: "See the prototype"
  (links and how to run it locally, plus `[See it walked through|<url>]`,
  the demo page's `#set-<id>` link for this release, once
  `scripts/designer/prototype.json` has a `siteUrl`), "Journey flow"
  (page order before and after, and gate changes, linking the release's
  published service map and quoting each affected page's "Asked when"
  line), "Validation" (one row per
  rule, with the English and Welsh error), "Service to build" for each new
  service, "Tests to add" and "For the developer or agent". Everything else
  follows under "Detail": each page with screenshots and a table of changed
  words, Welsh needed, tests and spec files that quote the old words, what
  cannot ship as it is, what was left out and why, drift, and how to apply.
- `brief.md`: the same in Markdown, for the repository and a pull request.
- `ticket.json`: the same story as a `tim-ticket/1` manifest (project, type
  Story, summary, `descriptionFile`, parent, labels `['UCD']`, priority,
  attachments, relates), for `references/raise-the-story.md` to raise for
  real.
- `upstream.patch`: the change as the real team's files, in `git apply`
  format, checked against the real journey. There is none for a brief only.
- `report.json`: the same facts as data, including which story placeholders
  are still to fill in.
- `screenshots/`: at most 2 MB of pictures from `designer:show`.

Talk to the designer in GDS plain English. Say "the real team" or "the
plants-frontend team", "your design release", "the story", "the brief". Never
say "upstream" without explaining it once ("the real service's code").

**Two ways onward once the folder is written**: "raise it as a Jira story"
(`references/raise-the-story.md`, dry run first) or "make it real and build
it properly" (`references/build-it-for-real.md`, which never pushes and
never launches a build on its own). This reference only writes the folder;
it never sends anything anywhere by itself.

## Guard rails

- **Never invent the designer's words.** _As_, _I want_, _So that_ and the
  description come only from what the designer said. The acceptance criteria
  are drafted by you. Until the designer confirms them, pass
  `--criteria-draft` too, so the story shows them as "Draft acceptance
  criteria, to confirm" and lists them as a placeholder. What they did not
  give stays a placeholder the brief shows in square brackets.
- **Nothing is ever pushed to plants-frontend from here.** The prototype's
  tools set the `upstream` remote's push address to `DISABLED` on purpose (a
  fresh clone has no `upstream` remote until step 1 of route 1 adds it).
  Never change that, never add any other remote. `references/build-it-for-real.md`
  writes to the real `trade-imports-plants-frontend` checkout directly (not
  through this remote) and never pushes either.
- **Never edit high-risk-plants on a `design/*` branch or `main`.** Only
  `references/build-it-for-real.md` changes real journey code, and only in
  the real `trade-imports-plants-frontend` checkout, never in the prototype's
  own copy.
- **Check ownership first.** Run
  `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:where -- --changed`
  and check `overrides.json`: a hand-off starts from the designer's own saved
  files. A prototype-owned service (a folder under
  `src/server/app/services/` with its own line in `ours`) is the designer's
  own too.
- **One Bash command per call.** Never `--no-verify`, never
  `git reset --hard`, never force anything, never push or open a pull request
  without asking.
- **Never edit `.claude/settings.json`, `.claude/settings.local.json` or
  anything under `.claude/hooks/`**, in either the prototype or the workspace.

## Before writing the folder

1. Find the design release (the set the change is in). If the designer names
   `high-risk-plants`, explain it is the real journey itself: the change must
   be made in a design release first (default), or they want
   `references/build-it-for-real.md` directly for a change already agreed.
2. Run
   `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype status --porcelain`.
   If anything is unsaved, save it first with `references/share-my-change.md`,
   so the hand-off matches what is saved.
3. If `src/server/app/sets/<set-id>/research-mode.md` exists, say research mode
   is on and its rules can never ship. Offer to switch it off first
   (`designer:research -- off <set-id>`, `references/research-session.md`).
   If they keep it on, the brief lists each rule under "cannot ship".
4. **Check the change exists.** The designer names a change ("hand off the
   Consignment addresses wording"). Look for it in the release: for words,
   `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:words -- find "<the new words>" --set <set-id>`;
   for anything else,
   `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype log --oneline -- src/server/app/sets/<set-id>`.
   If it is not there, it was never made, or it was made in another release:
   say so, and offer to make it now with the right reference
   (`references/change-the-words.md` for words), save it, and then hand it
   off. Never hand off an empty change: `designer:handoff` refuses one in
   plain words.

   A **pure concept** (an idea with pages in a release, but nothing the real
   team should apply as it is) and a release made from `sample-journey` are
   handed off as a **brief only**: the story, pictures, links and service
   contracts, with no patch. A release made from `sample-journey` is always
   brief only; for a concept, add `--brief-only`.

5. Agree a slug for the folder, two to four words with hyphens, for example
   `consignment-addresses`.
6. **Ask for the story in the designer's own words**, in one message, unless
   the conversation already says:
   - who it is for (_As_ …), for example "an importer of high-risk plants":
     `--as`
   - what they need to do (_I want_ …): `--want`
   - why they need it (_So that_ …): `--so-that`
   - what the change is and why, in one or two sentences: `--why`

   Use only their words, lightly tidied for grammar. Never make up a user, a
   need or a reason ("traders read parties as legal jargon") they did not
   give. If they give none of it and you cannot ask, leave the options out:
   the story then shows placeholders, which is honest, and the script lists
   them.

7. **Acceptance criteria.** For a change of words only, leave `--criteria`
   out: the script writes one criterion per changed string, and one for the
   Welsh, from the copy files. For anything else, draft them from the change
   (the pages it adds or changes, the fields, each validation rule and its
   error, any flow or gate change), write them to
   `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/.cache/designer/handoff/<slug>.criteria.txt`
   (git ignores it), show them to the designer and ask them to confirm or
   change them. Their changes win. Use only what the prototype really does,
   on pages that really exist. If the designer has not confirmed them yet
   (they are away, or have not answered), add `--criteria-draft` to the
   `designer:handoff` command, and run it again without that flag once they
   confirm. The file format:

   ```
   Scenario: The plants were grown under glass
   Given I am on the origin of the import page
   When I choose "Yes" for grown under glass
   And I continue
   Then check your answers shows "Grown under glass: Yes"

   Given I have not answered whether the plants were grown under glass
   When I continue
   Then I see "Select yes if the plants were grown under glass"
   And the error summary links to the question
   ```

   Each criterion is a block of `Given`, `When`, `Then`, `And` or `But`
   lines; a blank line starts the next. `Scenario:` and lines starting `#`
   are optional. Pass it as
   `--criteria ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/.cache/designer/handoff/<slug>.criteria.txt`.

8. **Links to see it.** If the design branch is already on GitHub, pass
   `--link https://github.com/DEFRA/trade-imports-plants-prototype/tree/<branch>`,
   and `--link <pull request address>` when there is one
   (`gh pr view --repo DEFRA/trade-imports-plants-prototype --json url`).
   Never push only to get a link: ask first
   (`references/share-my-change.md`, step 6). When the branch is not on
   GitHub yet, the script says so and the brief's "Run it on your own
   computer" asks for it to be pushed first: tell the designer in one line
   that a developer cannot open it until it is. The brief always adds example
   links for each changed page, the deployed prototype's address once
   `scripts/designer/prototype.json` has a `deployedUrl`, and the steps to
   run it locally.
9. Ask whether all of the release's changes go, or only some. Some pages
   means `--features <feature folders>` (the folder names under
   `journeys/linear/features/`). Only the latest change means
   `--since <commit>`, the commit before it (for a release whose first commit
   only copied the journey, `--since` that commit hands off everything after
   the copy). Default: everything (`--all`).

## Writing the folder

1. So the brief can say whether the patch still fits plants-frontend itself,
   fetch it first (read only; nothing is sent). A fresh clone of the
   prototype has no `upstream` remote, so check for it:

   ```
   git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype remote get-url upstream
   ```

   If git says there is no such remote, add it, then lock its push address,
   one command per call and without asking (this only lets the prototype
   read plants-frontend):

   ```
   git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype remote add upstream https://github.com/DEFRA/trade-imports-plants-frontend.git
   ```

   ```
   git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype remote set-url --push upstream DISABLED
   ```

   Check
   `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype remote get-url --push upstream`
   prints `DISABLED` whenever the remote already existed too; if it does not,
   run the `set-url --push` command above. Then fetch:

   ```
   git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype fetch upstream main
   ```

   If the fetch fails (no network, or no access to plants-frontend), carry
   on, and tell the designer in one line: the brief will say it was not
   checked against plants-frontend itself, only against the prototype's copy
   of the real journey. (`references/build-it-for-real.md` works against the
   real, live checkout under `repos/trade-imports-plants-frontend` directly,
   so this fetch is only for the brief's own honesty check, never a
   substitute for that route.)

   Dry run, to see which pages change and what stands in the way:

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:handoff -- --set <set-id> --slug <slug> --all --dry-run
   ```

   Read
   `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/.cache/designer/handoff/<yyyy-mm-dd>-<slug>/report.json`
   and `brief.md`. Note the page slugs in `pages[].slugs`, the rules in
   `validation` and any `servicesToBuild`: they help you draft the criteria
   (step 7 above).

   If it says there is nothing to hand over, go back to step 4 above.

2. Photograph those pages beside the real journey:

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:show -- --set <set-id> --pages <slug,slug> --compare high-risk-plants
   ```

   (Add `--errors` when error messages or validation changed.) A change
   across the journey (a section caption, the task list, flow) has no page
   slugs in the report: picture the pages the words are on
   (`designer:words -- find` lists them). The brief then takes every picture
   in the gallery for that part.

3. Write the hand-off folder:

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:handoff -- --set <set-id> --slug <slug> --all --title "<short summary>" --why "<what and why>" --as "<who>" --want "<what they need>" --so-that "<why they need it>" --criteria ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/.cache/designer/handoff/<slug>.criteria.txt --link <design branch address>
   ```

   Add `--criteria-draft` while the designer has not confirmed the criteria.
   Leave out any option the designer did not give. Use `--features <a,b>` or
   `--since <commit>` in place of `--all` for only some of the change,
   `--recipe <name>` for a recipe the commit messages do not name, and
   `--brief-only` for a pure concept. The script prints what it wrote and
   which story placeholders are left.

4. **Check the story.** Read
   `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype/handoffs/<yyyy-mm-dd>-<slug>/brief.jira.txt`
   from the top. It must have:
   - a story line (_As_, _I want_, _So that_) that is not a placeholder in
     square brackets, and
   - at least one acceptance criterion that is not a placeholder.

   The script's "Still to fill in" line, and `story.placeholders` in
   `report.json`, name what is left. Tell the designer which placeholders
   remain, in one line, and ask for those words. When they answer, run step 3
   again with them: never type their words into the brief yourself, and never
   fill a placeholder with words of your own. When the designer also asked
   for a ticket, do not stop here: finish steps 5 and 6, go on to
   `references/raise-the-story.md`, and ask for the missing words there,
   beside the dry-run plan, in one message.

5. Read `brief.md` in full. Look at the screenshots it links. Tell the
   designer, in plain words:
   - the pages and words that change, and the journey flow (whether the page
     order or a gate changes),
   - the validation rules on the changed pages, and any whose Welsh error
     still says `[Welsh needed]`,
   - any service to build: the patch carries its `index.js` and `client.js`
     as proposed, and the story asks the real team for the backend endpoint
     and a plain `stub.js`; the open questions (which backend owns the data,
     whether the endpoints are right) are for the team to answer, not you,
   - the tests the real team adds ("Tests to add") and the ones that still
     expect the old words,
   - which requirement files still quote the old words (the real journey's
     `spec/` folder and, when the brief found it on this computer, the real
     team's plants behaviour spec under
     `~/git/defra/trade-imports-workspace/openspec/specs/plants/`, which the
     brief names by path),
   - any standing ruling that chose the words this change replaces ("Standing
     ruling c-002 chose the words…" under "What cannot ship as it is"): name
     the ruling and its reason, and say the product owner should confirm the
     new words still meet it,
   - what cannot ship as it is, and why. A file that uses the prototype's own
     example data or stub plumbing is left out of the patch, and so is every
     file that imports it ("Imports …, which is left out"),
   - whether the patch applies cleanly, to the prototype's copy of the real
     journey and, when `upstream/main` has been fetched, to plants-frontend
     itself (the brief says which). If it does not, the real journey has
     moved on in the same place since the release was made: the "Has the real
     journey moved on?" section names the files. Say the team will merge those
     by hand, or offer to start a fresh release and carry the change across
     (`references/design-release.md`).

6. Save the folder on the designer's branch:

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:format
   ```

   ```
   git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype add handoffs/<yyyy-mm-dd>-<slug>
   ```

   ```
   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run designer:save -- -m "Hand-off story: <title>"
   ```

   The checks run first; it prints one line when the save worked, or the end
   of the log when it did not.

7. Explain what comes next, and offer both routes:
   - **"Raise it as a Jira story"**: `references/raise-the-story.md`. It uses
     `tim` to show a dry run of the exact ticket before creating anything,
     and needs the designer's own yes.
   - **"Make this real and build it properly"**: `references/build-it-for-real.md`.
     It writes the change into the real `trade-imports-plants-frontend`
     checkout on its own branch, through the same recipes a developer would
     follow, and stops before anything is pushed, opened as a pull request or
     merged.
   - **Hand it over by hand instead**: paste the `*Summary:*` line into
     Jira's Summary field and the rest of `brief.jira.txt` into the
     description of a new story, with `upstream.patch` and the screenshots
     attached, or give the folder to a developer directly: `git apply --3way
upstream.patch` in their own clone of `trade-imports-plants-frontend`, write
     the tests the brief lists, run `npm test`, and raise the pull request
     there. Ask before sending the branch to GitHub
     (`references/share-my-change.md`, step 6).

## Verify

1. `brief.jira.txt` starts with the story: a `*Summary:*` line, a story line
   that is not a placeholder, and at least one acceptance criterion that is
   not a placeholder. Any placeholder left is one you have named to the
   designer.
2. The brief carries a link to see it walked through, page by page
   (`[See it walked through|<url>]` in `brief.jira.txt`, ending
   `#set-<id>` for this release), when `scripts/designer/prototype.json`
   has a `siteUrl`: `reports/pr-<n>/#set-<id>` while the change is on an
   open pull request, `#set-<id>` on the site root once it is merged (or
   pushed straight to `main`). If `siteUrl` is not set yet, say there is no
   link yet rather than inventing one.
3. `upstream.patch` applies: the Tech Notes panel says "applies cleanly", or
   you have told the designer why not. A brief only has no patch, and says
   why.
4. `brief.md`, `brief.jira.txt` and `ticket.json` all exist.
5. The brief's "Validation", "Welsh needed" and "Tests that pin the old
   words" sections match what you told the designer.
6. The screenshots folder is under 2 MB (the script keeps it there and lists
   anything it left out).
7. `git -C ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype status --porcelain`
   prints nothing, and you are back on the designer's branch.

## Hand-off note

Finish with: "Nothing has been sent anywhere yet. Say 'raise this as a story'
to create the Jira ticket, or 'make this real' to build it properly on the
real service. Or hand the folder to a developer yourself: `handoffs/README.md`
says more. When the real team merges it, the weekly update brings it back
into this prototype, and your design release can be retired or refreshed."

When the designer later says "I sent it", "it's ticket EUDPA-123" or "it was
merged", add or update the status lines at the top of that hand-off's
`brief.md` (see "Keeping track" in `handoffs/README.md`), then save with
`references/share-my-change.md`. `references/raise-the-story.md` does this
for you automatically when it creates the ticket.
