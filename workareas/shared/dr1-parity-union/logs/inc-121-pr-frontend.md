## What this changes

The transporter list page at `/transporters/select` is headed **"Search for an approved commercial transporter"** and, until now, offered nothing to search with — the whole commercial-transporter list rendered at once, no input, no button, no filtering. The promise gets less true as the list grows: two records fit on a screen, two hundred would render the same way.

This adds the search the heading already promises.

- **Copy** — `search.label`, `search.hint` ("Name, address or approval number"), `search.button` and a `noMatches` message, in English and Welsh.
- **`rows.js`** — `matchingTransporters` folds the search term and each record's name, address and approval number the same way (lower case, accents stripped) and filters the list on the joined haystack. An empty term is not a search, so the whole list stands.
- **`transporters.njk`** — the search input and a secondary Search submit above the table, the two submits told apart by their `action` value, and a "no transporters match" paragraph in place of an empty table. The pick rides through a search in a hidden `selected` field, so filtering a chosen row off the list does not drop the answer.
- **Controller** — reads the search term, filters the rows and re-renders on a search submit rather than validating the pick.

Filtering is done on the server, so a trader without JavaScript searches the same list the same way. This deliberately diverges from Design release 1, whose filter is JavaScript-only: its search button is `type="button"` and its `POST /transporter` handler reads the search field and then ignores it. DR1 sets the requirement — a search over name, address and approval number above the list — and this implements it as progressive enhancement rather than copying the prototype's no-JS gap.

## Tests

- `copy.test.js` — the new keys exist in both languages.
- `rows.test.js` — the fold, the empty-term case, and matching across each of the three fields.
- `transporters.controller.test.js` — search submit re-renders filtered, pick submit still validates, the selected answer survives a search.
- `transporters.fit.spec.js` — the rendered page carries the labelled search field, the hint and the button, and filters on submit.

## Provenance

Increment **inc-121**, ticket **EUDPA-563**, corpus `dr1` (Design release 1 parity), slice `transport`.

Frontend-only increment — the tests repo was branched but has no commits, so there is no sibling PR and no cross-repo merge order to observe.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

https://claude.ai/code/session_01WohzXrdxfbRLGSMJxs93GQ
