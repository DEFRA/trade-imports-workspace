# Identification details: where we differ from the prototype

Theme: Design snagging, branch `feat/EUDPA-720-design-release-2-1-design-snagging-b`.
Prototype: Design Release 2.1, commit `56371e2`.

## Summary

| | Count |
|---|---|
| Differences we keep, with a reason | 1 |

## Kept

| Page | Prototype | Ours | Why | Source |
|---|---|---|---|---|
| Identification details: the species panel | Draws the species panel with custom CSS and div grids | GOV.UK summary card styling and `govukTable`, which keep table meaning and reflow at 390px | The prototype's grid loses table meaning and breaks at phone width. The tables set the documented `app-table__cell--break-anywhere` class so they stay inside a 390px screen | Snag S16 |
