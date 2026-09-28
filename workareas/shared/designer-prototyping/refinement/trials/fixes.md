# Fixes from the refinement trials (T1 to T4)

Branch: `feat/NO_JIRA-designer-prototyping` in `repos/trade-imports-plants-prototype`. Nothing is committed. `overrides.json` has not changed, and every file edited is already in `ours`.

Verified:

- `npm test -- scripts/designer src/server/prototype-seed .claude --coverage.enabled=false`: 79 files, 1053 tests, all passed.
- `npm run lint:js`: clean.
- `npm run designer:format`: tidied 4 files.

## Majors: all fixed

| Trial | Problem | Fix |
|---|---|---|
| T1 | `designer:check` reported an unreadable service `CONTRACT` as "A real journey page saves the wrong answers … not caused by your change". | New `service-contract` signature in `scripts/designer/check/translate.js` (skill `fake-a-service`), placed ahead of `contract`. The `contract` pattern now matches only `src/server/app/contract.test.js`. The test title in `handoff/contract.test.js` now names `src/server/app/services/<name>/index.js`, so attribution says "yours". Each expect carries a plain `service CONTRACT:` message. Added a fixture and an attribution test, and a matching section in `docs/designers/checks-and-errors.md` (a test keeps them in step). The plain-values rule now also sits in `fake-a-service.md` "Making a new service" step 2 and in `service/templates/index.js.tmpl`. |
| T2 | No guidance for a request that names an element the journey does not have (reason for import). | `change-the-words` step 2 now has a "does not exist" branch: check with `designer:words page` and page-id-places, quote `high-risk-plants/spec/journey-spec.json`, never invent the element, offer `change-the-journey`. There is a matching bullet in `AGENTS.md` "When no single row fits", with the one exception: a page a new feature needs (T1's transport page) is added and announced. The hand-off example criteria now use the real origin page. |
| T2 | Drafted criteria were labelled "from the designer", with no way to mark them unconfirmed. Also "criterions". | New `designer:handoff --criteria-draft` flag (it refuses to run without `--criteria`). The story shows "Draft acceptance criteria, to confirm" in both the Jira and Markdown output, the source is "a draft, not yet confirmed by the designer", and it is listed in `story.placeholders`. The plural is now "criteria". `hand-off` SKILL guard rail, step 7 and route 1 step 3 say when to pass it. Tests are in `brief.test.js` and `cli.test.js`. |
| T4 | No example-data row for "every page answered, not submitted". | New row in the `example-data` SKILL table ("fixture only: no through, no submit"), and a line in the `prototype-seed/grammar.js` header. Checked against `cutAt`: with no `through`, it returns every step. |
| T4 | `designer:show --pages all,dashboard,chooser` silently dropped the chooser. | `parsePages` now keeps the names given beside `all`, so the chooser is pictured. `resolveWanted` also reports a name beside `all` that is not a page, where before it was dropped silently. Tests are in `options.test.js`, `targets.test.js` and `run.test.js`. |

## Minors fixed (cheap and clearly right)

- **T1 missing page:** `fake-a-service` "Requests that need more than this skill" item 4 now covers this: add it in the worked example 1 shape, at the likeliest place in the flow, and say so in one line.
- **T1 reference or copy:** new "Store a reference or a copy?" section in `fake-a-service.md`. A copy is the default for saved lists. An id alone needs the release's `withoutUnresolvedPartyRefs` sanitiser to know it. Checked against `parties/index.js`.
- **T1 save split:** the `fake-a-service` step 8 reply template now has a `Saved:` line ("Your new working release is saved; this change is not yet") and a "Choices I made" line.
- **T1 lean picker:** `fake-a-service.md` notes that `address-book-picker/pagination.js` `paginationFor(slug)` works for any slug. Checked against the code.
- **T1 required or optional:** new "Required or optional?" section in `fake-a-service.md`. It picks from the obligation, and says an optional page has no `--errors` picture.
- **T1 order of steps:** `fake-a-service` step 3 now runs `designer:service new` first, then `designer:where`. Step 5 no longer repeats it.
- **T2 where a new question goes:** new section in `change-the-journey/references/routes.md`. The question goes on the named page, else the closest-subject page (origin) with add-a-field, else add-a-page when it has more than one field.
- **T2 recipe line:** `designer:handoff` now reads `Recipe:` lines from commit bodies (`git.js` `messagesTouching`, `%B`). "Recipe used" now comes from the same `recipesFor` as Tech Notes, named plus worked out.
- **T2 validation table:** each row carries its copy `key`. New or changed rules come first, marked `New:` or `Changed:` in the Rule column, with one line saying how many. The header is unchanged, so no Jira template breaks.
- **T2 journey flow:** flow rows carry `moved`. When nothing moved, the brief says "The page order does not change". The `journey-flow-and-gates` recipe and the `test:fit:journeys` line are no longer added for a page that only kept its place (`story.js` `changesFlow`).
- **T2 unpushed branch:** the brief's "Run it on your own computer" step 2 adds "(this branch is not on GitHub yet: ask the designer to push it first)" when `refs/remotes/origin/<branch>` is missing. The CLI summary says so too, and hand-off step 8 tells the designer.
- **T3 overdue routing:** the `AGENTS.md` bullet now says the real dashboard already shows the red Late tag. Only a late filter, count or tab goes to `fake-a-service`. "which ones are overdue" moved from the `fake-a-service` phrase row to `example-data`. The `fake-a-service` description and step 2 table are updated to match. The late tag was checked in `high-risk-plants/.../dashboard/`.
- **T3 default release:** `AGENTS.md` rule 9 and `example-data` step 1 now say that no release named and none of their own means `plants-working`, never `high-risk-plants`.
- **T3 newcomer order:** `run-the-prototype` "New here": do the change first, then give the table at the end, before the hand-off line.
- **T3 checks twice:** `AGENTS.md` "How every change ends" step 1 says `designer:save` runs the pre-commit checks. Quick check plus save equals the full check, so there is no separate `--full`.
- **T4 demo row:** the `AGENTS.md` demo outcome suggests a "Stakeholder demo" title and says a working release already ignores the weekly update. Freezing is an offer, not a step. The review pack leaves out `--before` for a release with no saved changes (also noted in the `show-my-change` preset row). Step 4 is now "offer to save and open a pull request" (rule 8).

## Not done, and why

- **T4 "`examples init` copies high-risk-plants' 9 scenarios with the ids rewritten":** this is a behaviour change to `designer:examples init` and `new:set` seeding. It is not a doc fix, and it needs a decision on which examples a demo release should start with, because some carry other-organisation and cancelled-amendment state. Worth a follow-up. It is not needed to meet the purpose.
- **T2 "drop validation rows with no English error":** I kept them, because they are real rules (a date or format check whose words are set in code), and dropping them would hide a rule from a developer. Putting changed rules first, and marking them, answers the readability complaint.

## Sam's four refinement comments

The earlier run's commit `c4a686a` already covers all four, and the trials confirm it: routing was correct in all 4 trials, including the no-skills host.

1. **Purpose:** high fidelity, and the next page is the real one. Covered by `AGENTS.md` "What this repo is". The trials added pages to the real journey copy, not to mocks.
2. **Intent first:** no skill names needed. `AGENTS.md` holds all the routing and works with or without skills. `design` is the single "use the design skill" handle, and it routed every trial without a skill name.
3. **Real service pattern:** T1 built `src/server/app/services/saved-vehicles/{index,client,stub}.js` with `isStubDataMode`, plus one `ours` line. Its only major is now fixed.
4. **Prototype to ticket:** T2 produced a Jira-ready story and a patch that applied cleanly to plants-frontend `main`. The honesty gaps (draft criteria, noise in the validation and flow sections, the unpushed branch) are fixed above.
