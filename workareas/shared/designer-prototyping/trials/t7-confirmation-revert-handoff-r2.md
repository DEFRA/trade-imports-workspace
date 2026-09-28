# Trial t7-confirmation-revert-handoff, round 2

Branch: `feat/NO_JIRA-designer-prototyping-trial-t7-confirmation-revert-handoff-r2` (from `feat/NO_JIRA-designer-prototyping` at 9d83243)

## What I asked (as a designer)

1. "Put the reference number in a green panel on the confirmation page with a 'What happens next' section under it."
2. (After seeing it) "Actually, undo that, go back to how it was."
3. "The 'Consignment addresses' wording is agreed: send it to the real plants team."

## Outcome

**Partial.** All three parts work end to end, and every success criterion holds. But a real designer would have been **blocked at the first save**. The prototype's own pre-commit hook failed as soon as any design release existed. I had to fix a test helper in `scripts/` to get past it, and a designer could not have done that.

| Criterion | Result |
| --- | --- |
| Panel change uses govukPanel only; show gives a before/after pair | Holds. The panel was already `govukPanel` (step 2b found that part already true), and the "What happens next" section uses only `govuk-heading-m` / `govuk-body`. `--before` gave a before/after pair. |
| Undo produces a revert commit and a clean tree; no history rewritten | Holds. `bb3607e Revert "plants-working: add a 'What happens next'…"`, `git status --porcelain` empty afterwards. |
| Hand-off folder has brief.md, brief.jira.txt, screenshots, upstream.patch passing `git apply --check` against high-risk-plants | Holds. `handoffs/2026-09-28-consignment-addresses/` has all four plus report.json and 8 screenshots. `git apply --check --verbose` passes for all 6 files. The 6 copy files also match `upstream/main` (plants-frontend) exactly, so the patch applies there too. |
| Brief lists pinned tests and Welsh still needed; nothing pushed | Holds. 6 pinned test lines across 4 test files (a grep confirms that is every test file with the old words), and 3 Welsh strings. Upstream push is `DISABLED`; nothing was pushed. |

Commits on the trial branch:

```
b858ea3 Hand-off brief: Rename Consignment parties to Consignment addresses
42ee146 plants-working: rename 'Consignment parties' to 'Consignment addresses' on 4 pages; Welsh needed
bb3607e Revert "plants-working: add a 'What happens next' section to confirmation; Welsh needed"
ae98204 plants-working: add a 'What happens next' section to confirmation; Welsh needed
9d4a6bb Start design release plants-working from high-risk-plants
dead00c fix(designer:release): prune releases the test repo lacks before its first commit   <- my unblock, not designer work
```

Every commit went through the pre-commit hook without `--no-verify` (the revert ran no pre-commit, which is how git works). No separate `trial(...)` commit was needed: the skills saved everything and nothing was left unsaved.

## Screenshots

(under `repos/trade-imports-plants-prototype/.cache/designer/show/plants-working/`)

- Starting state (step 2b): `2026-09-28T03-43-29/confirmation--now--page--desktop.png`. The green panel with the reference is already there.
- Panel change, before/after: `2026-09-28T03-44-51/confirmation--before--page--desktop.png`, `…/confirmation--now--page--desktop.png`. The "What happens next" h2 and 2 paragraphs sit under the date line.
- After undo (`--before-commit HEAD~1`): `2026-09-28T03-46-13/confirmation--before--page--desktop.png` (with section), `…/confirmation--now--page--desktop.png` (back to original).
- Wording before/after: `2026-09-28T03-47-01/*.png` (hub, consignors-select, identification-numbers, notification-view). I opened hub and consignors-select: both show "Consignment addresses".
- Compare with the real journey: `2026-09-28T03-48-06/`, copied into `handoffs/2026-09-28-consignment-addresses/screenshots/`.

## Steps taken

1. Read CLAUDE.md and PROTOTYPE.md. Routing sent the panel to `change-the-journey` (confirmation-variant), the undo to `share-my-change`, and the hand-off to `hand-off`.
2. `change-the-journey` step 1: `designer:release -- list` showed only high-risk-plants and sample-journey. That triggers `design-release` section B for `plants-working`.
3. `new:set` worked, and so did `designer:format`. **`designer:check --full` FAILED** on `scripts/designer/release/remount.test.js`. The tool said "Not caused by your change: tell the maintainer. It still has to be fixed before anything can be saved." A commit attempt confirmed the husky pre-commit blocks the save.
4. Unblocked (maintainer work): `makeTestRepo` copies the live `overrides.json` and prototype-sets mount files (which now name `plants-working`) into a scratch repo, but not the release folder. So `remount` sees a mounted release with no folder. My first fix (copy every release folder) broke `list.test.js`. The fix I kept calls `remountReleases({ repoRoot })` in the scratch repo before its first commit, so it prunes releases it does not hold. All 687 script tests and all 3105 unit tests pass. Committed as `dead00c`.
5. Saved the release (`9d4a6bb`).
6. Step 2b: showed the confirmation page. The green panel with the reference already holds, so I did only the "What happens next" part.
7. Read the recipe and release files, checked ownership with `designer:where` (3 yours), got a green baseline check, then edited copy.en.js, copy.cy.js (`[Welsh needed]`) and template.njk exactly as the recipe says.
8. Format, then `--full` check: green. `designer:show --pages changed --errors --before` gave the before/after pair, and I looked at both.
9. Undo: saved first (`ae98204`), then `git revert --no-edit HEAD`. Status was clean, the quick check green, and I pictured the page with `--before-commit HEAD~1`.
10. Hand-off step 4: the words did not exist (`designer:words find "Consignment addresses"` found 0). Following CLAUDE.md's "Hand off a change that was never made", I made it with `change-the-words`: 3 strings, 4 pages, Welsh marked. Quick check green, before/after pictures taken, saved (`42ee146`).
11. `hand-off` route 1: dry run with `--since bb3607e`, `--compare high-risk-plants` gallery, then the real write, read brief.md, my own `git apply --check`, format, and a commit (`b858ea3`).
12. Switched back to `feat/NO_JIRA-designer-prototyping`. `status --short` is clean.

## Friction

### Blocker

1. **Pre-commit hook fails as soon as any design release exists.** `remount.test.js > Should change nothing when every release is mounted` fails because `scripts/designer/release/test-repo.js` copies the live mount files but not the release folders they name. It fires on the very first thing every designer does (design-release B step 6/8). The tool's advice is "tell the maintainer", and a designer cannot save anything at all. Fixed on the trial branch in `dead00c`. **That fix is not on `feat/NO_JIRA-designer-prototyping`**: it needs cherry-picking, or the next trial hits the same wall. Suggested guard: the PR canary makes a throwaway release but evidently never runs `npm test` with it in the tree. Make the canary run the full unit suite with the release present.

### Major

2. **"Undo that" straight after a change leads to throwing away unsaved work, not a revert.** share-my-change: "the change skills do not save, so 'undo that' straight after a change is usually this one" (unsaved edits). That leaves no record. It also contradicts change-the-journey step 8, which says "suggest saving it … Then 'undo that' later leaves a record". Both paths also say "Ask when both could be meant … get a yes before doing it". An unattended run cannot ask, and a designer gets asked twice. I saved, then reverted. Suggested fix: pick one default. For example, say a change shown to the designer is saved automatically before any undo, or have the change skill end with a save so that undo is always a revert.
3. **Branch rules clash.** change-the-journey step 1: "On any other branch that does not start with handoff/ (a design/ branch, or a feat/ or trial branch), stay on it." share-my-change step 3: "On main (or any branch that is not design/*, handoff/* or maintain/*): make a new branch named design/<set-id>-<slug>". A literal follower would have split the work across branches mid-request. I stayed on the trial branch. Suggested fix: align share-my-change with change-the-journey (stay on any non-main branch).
4. **The hand-off brief does not mention the requirement spec files.** `high-risk-plants/spec/journey-spec.json`, `decisions.json`, `panel/rulings.json` and `backlog-extras.json` all still say "Consignment parties". The brief's pinned-words section only lists tests. The real team will ship the words with a spec that disagrees. Suggested fix: add a "Spec and requirement files that quote the old words" section to `designer:handoff` (it already knows about `spec/` as a left-out category in new:set).

### Minor

5. **The confirmation-variant recipe runs both checks.** "How to check it: 1. `--full` 2. `--walk`". CLAUDE.md says "`--walk` includes `--full`: never run both." Change-the-journey step 7 says `--walk` only for order, branch or new-page changes. Suggested fix: the recipe should say `--full` only for a section or wording change.
6. **Commit output floods the terminal.** design-release B step 8 and share-my-change redirect to `.cache/designer/commit.log`, but hand-off step 5 (`git commit -m "Hand-off brief: <title>"`) does not. That commit prints the full coverage table, hundreds of lines. Suggested fix: add the same redirect in hand-off.
7. **The reference number changes between before and after pictures** (GBN-HRP-26-3CSNAS vs 3JJ19R vs SJ4N22). A designer comparing the pair sees a spurious difference. Suggested fix: pin the example reference for `--before` runs, or note it in the gallery.
8. **`--errors` on the confirmation page does nothing, silently.** The page has no form. change-the-journey step 7 still says to always pass it for one or two pages. Harmless but confusing: the gallery just has no error pictures.
9. **The hand-off brief says "No recipe named"** for a wording change, which reads like something is missing. Suggested fix: say "Words only (change-the-words)".
10. **"The patch applies cleanly to the real journey as it is in the prototype today"** checks against the prototype's copy of high-risk-plants, not plants-frontend `main`. Here they matched (I diffed against `upstream/main`: identical). But the brief cannot tell a developer whether upstream has moved since the last weekly sync. Suggested fix: when `upstream/main` is fetched, also run `git apply --check` against that tree and say which one was checked.
11. **The hand-off `--why` placeholder.** The designer gave only "the wording is agreed", which the skill correctly uses verbatim. That makes a thin "What and why" for the real team. Suggested fix: the skill could prompt for the research or crit evidence as a separate optional line, rather than leaving it to a follow-up.
12. **Content-sense note.** Under the new "3. Consignment addresses" task-list group sit "Identification numbers" and "Contact address for consignment". "Identification numbers" is not an address. change-the-words step 5 asks me to note this for the content designer, which I did here; the brief does not carry it.

## Time-wasters

- Diagnosing the remount test failure and making two attempts at a fix: the biggest cost by far, and impossible for a designer.
- The hook printing the full coverage table on 2 commits before I switched to redirecting.
- A wrong `git commit --output=` flag attempt (my error, while trying to capture output without a shell redirect).

## Does the change work?

Yes. The confirmation section rendered as designed and was then fully reverted. The wording change renders on the task list and the consignor caption, and the hand-off patch applies to both the prototype's high-risk-plants and plants-frontend `upstream/main`.
