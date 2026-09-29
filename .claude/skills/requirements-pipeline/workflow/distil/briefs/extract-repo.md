# Extract: a repo

A `repo` source is a repo in the workspace, at the workspace-relative `locator` (such as
`repos/trade-imports-plants-frontend`). It is read for **what it does today and what has already been ruled**.
Read [`extract.md`](extract.md) first: its rules all hold here.

Read the repo in place. Never write in it, never switch its branch and never run its build. It is read-only to
you.

## Characterise the repo

Before any claim, find the parts the source's `scope` names:

1. Read its `README.md` and `CLAUDE.md`, and `docs/repos/<repo folder>.md` in the workspace where one exists.
2. List its folders with `find <repo> -maxdepth 3 -type d -not -path '*/node_modules/*' -not -path '*/.git/*'`.
3. Find the code, config and specs for the area the scope names with Bash `grep -rln`.
4. Look for a rulings ledger, such as `spec/decisions.json`. A ruling outranks any default the distiller would
   otherwise invent, so every ruling in scope gets a claim.

Write what you found into `structure`: the areas in scope, the files that hold them, and what you left out.

## What a claim says

- Each claim is **current observable behaviour** or an **existing ruling**. "The origin page asks for the country
  of origin" is a claim. "originController.js exists" is not.
- `ref` is the file and line, such as `src/server/origin/controller.js:42`. Files are fine as provenance here.
- `quote` is the code, config value, copy string or ruling text the claim rests on, verbatim. For a ruling, quote
  its id and words.
- A behaviour you can see is only partly built, such as a route with no page, is `inferred`, and the statement
  says what you saw.
- Something the scope expects and the repo does not have is a `gap`. Say where you looked.

## The tests repo

The tests repo (`repos/trade-imports-ins-tests`) holds every service's end-to-end suite. Its role is **what is
already proven end to end**. A claim from it says what a spec proves a user can do, or what rule it holds the suite
to, with the spec file and test name as `ref`.

## Security findings

A weakness you find, such as an unscoped query, missing authorisation or a leaked secret, gets a claim whose
statement names the area in general terms only. The report may be published in a public repo. Put nothing in it
that tells a reader how to exploit the weakness.
