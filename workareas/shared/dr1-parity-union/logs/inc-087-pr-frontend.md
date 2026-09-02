## What this changes

Increment `inc-087` from the `shared/dr1-parity-union` backlog. Ticket: EUDPA-373.

The commodity page ("What are you importing?") printed the whole commodity reference list as one `govukCheckboxes` group per commodity, with a tick box per species inside each. Nothing narrowed the list and nothing summarised what had been picked. Design release 1 asks the user to search for a commodity and shows nothing until they do.

This replaces the printed tick-box list with a search:

- Adds a labelled search box above the reference list, with a hint naming the ways a user can search and the three-character minimum.
- Adds `search/matching.js`, which matches on commodity name, commodity code and species name, and only returns results once at least three characters are entered.
- Renders results grouped under their commodity heading with a tick box per matching species, and nothing at all before the threshold.
- Adds a selected-species summary headed with a running count, listing each chosen species, with a way to clear the selection.
- Keeps the existing "Select a commodity" error for an empty submission, and keeps selections across a re-render.
- Adds unit tests for the matcher and extends the controller and fit specs to cover the search, the results panel and the summary.

## Deferred

The shipped hint wording differs from the acceptance criteria ("commodity name" / "Cow" / "species name" plus the three-character sentence) because the reference data carries no species common names until `inc-090` lands. Recorded as an open question on the increment for design and content to rule on.

## Repos

Frontend only. The tests repo was branched for this increment but needed no change, so it has no PR — there is nothing to order against and this PR merges on its own once green.
