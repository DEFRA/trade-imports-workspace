## What this changes

Removing the **last** commodity from a notification used to re-render the consignment-details page in an empty state: the selected-commodities table and the quantity blocks vanished, the heading and buttons stayed, and the body read "You have not added any commodities yet." above a link relabelled "Add a commodity". The user was left on a page that asks nothing and had to notice the link to get going again.

Design release 1 never renders that page empty. Its remove branch checks whether anything is left and, where nothing is, redirects to the commodity question before any render — so the user lands on "What are you importing?" with the search box in front of them, which is where the answer has to come from.

This brings the frontend into line.

## How

- **One shared redirect helper for both removal paths.** While a line is left it returns to the consignment-details page; with none left it goes to "What are you importing?". That covers a commodity removal and a per-species removal alike — Design release 1 applies the same escape to both, so the helper does too.
- **A load of the details page with no lines redirects the same way**, so a browser Back, a refresh or a bookmark cannot land on an empty details page either.
- **The empty state is gone.** With no empty render left to serve, the template's empty-state branch, the "You have not added any commodities yet." copy and the "Add a commodity" first-line label are removed, along with the controller branch that chose between the two link labels. The table and the link now render unconditionally.

## Tests

- Controller unit tests cover the redirect on an empty page load and the unconditional render when lines exist.
- The consignment-details FIT spec covers both removal outcomes: last line removed lands on the commodity question, a remaining line returns to the details page.
- The removed copy is dropped from the copy fixtures and the change-context test updated accordingly.

## Provenance

- Increment **inc-095**, ticket **EUDPA-381**, corpus `dr1c`, slice `commodities`.
- Type: flow change. Evidence: `post-remove.js:36-43` (frontend) against `app/routes.js:9377-9388` (Design release 1).
- Falsifier — Design release 1 re-rendering the details page after the last commodity is removed — was run and did not fire: its remove branch redirects to `/what-are-you-importing` before any render, and its remove-species branch does the same.

## Scope

Frontend only. The tests repo was branched for this increment but needed no changes, so it has no PR.
