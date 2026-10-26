# Journey foundation: where we differ from the prototype

Theme: Journey foundation (EUDPA-691), branch `feat/EUDPA-691-design-release-2-1-journey-foundation`.
Prototype: Design Release 2.1, commit `04a073b`. It decides look and feel, not architecture or field names.

## Summary

| | Count |
|---|---|
| Differences we keep, with a reason | 13 |
| Brought in line on this branch | 5 |
| Held for other work ("Save and return" for EUDPA-667 in animals and plants; INS home for the INS dashboard) | 3 |

The two save buttons while amending, in short:

| Button | Prototype | Ours |
|---|---|---|
| "Save and return to overview" | Saves without checking anything | Blank answers allowed. Invalid answers (an impossible date, a port not on the list) refused |
| "Save and return" | Saves without checking anything | Full checks: blank required answers and invalid answers both refused. Held for EUDPA-667 |

## Animals

| Page | Prototype | Ours | Why | Source |
|---|---|---|---|---|
| Question pages while amending: "Save and return" | Saves without checks, goes to the review | Runs the page's full checks, then goes to the review | Held for EUDPA-667, which decides what may be left blank and when | Prototype `app/routes.js` isJourneySoftSaveAction (~1555-1585). Code `shared/amend-form-actions.js` |
| Question pages: "Save and return to overview" | Saves without checks | Blank answers allowed, invalid answers refused | Ruling: the service can't store a value that breaks its field's format | Ruling 7 Oct claim 10; c-211. Code `lib/validate/run.js` (allowMissing) |
| Question pages while amending: position of "Save and return to overview" | Its own line, below the buttons | Was inline in the button group. **Now matches the prototype** | Brought in line | Prototype `partials/design-release-2.1/journey-form-actions.html:88-96`. Code `shared/save-actions.njk` (`f5c98fd1`) |
| Question pages: position of the cancel link | Its own line, below the buttons | Was inline in the button group. **Now matches the prototype** | Brought in line; GDS allows links in a button group but doesn't require it | Prototype `journey-form-actions.html:97-100`. Code `shared/save-actions.njk` (`b9bb4893`) |
| Page opened from a Change link on the amend review: "Save and continue" | Goes to the next page of the whole journey | Goes to the next page of the same task row, then the Overview | Engineering: one rule for every save outside the opening run | `plans/inc-004.md` D10; c-243. Code `shared/kit.js` nextTarget |
| Status bar while amending: "Cancel amend" | Button that opens a pop-up | Link to a confirmation page; works without JavaScript | Ruling: no pop-ups, GOV.UK Frontend has no modal | Ruling 9 Oct pm claim 19; c-190, c-127 |
| What are you importing? while amending: "Save and return" | Goes straight to the review | Goes to Commodity details first | Engineering: a new commodity line needs its number of animals before review | `plans/inc-004.md` D9 |
| Party pickers, CPH number, contact address while amending | Three buttons, including "Save and return to overview" | Two buttons, no "Save and return to overview" | Ruling: DR1 rule (b), no return-to-overview on pages reached from another page | Ruling 7 Oct claim 9; c-210, c-208 |
| Any page saved outside the opening run | Returns to the Overview only when marked `?from=hub` | No marker; goes through the task row, then to the Overview | Ruling: the prototype doesn't decide query names | Ruling 9 Oct claim 39; c-243. Code `flow/navigation.js` |
| Journey form buttons | Post `action=continue/hub/review` | Post the service's own fields (`exit=hub`, `?change=1`) | Ruling: field names are architecture | Ruling 9 Oct p1-089; c-267, c-275 |
| End of the opening run | Contact address always goes to the review | Goes to the review once a commodity is chosen, otherwise the Overview | Engineering: the review keeps its gate, so it never opens empty | Code `flow/run.js` |

## INS

| Page | Prototype | Ours | Why | Source |
|---|---|---|---|---|
| Home page | Caption "Dashboard", h1 "Import notification service" | Title changed; h1 still "Dashboard", no caption | Held with the INS dashboard's summary information | Ruling 9 Oct pm p3-064; c-146 |

## Plants

Plants has no prototype of its own. "Prototype" here means the animals behaviour plants copies.

| Page | Prototype | Ours | Why | Source |
|---|---|---|---|---|
| Question pages while amending: "Save and return" | Saves without checks | Full checks | Held for EUDPA-667, as animals | Code plants `shared/amend-form-actions.js` |
| "Save and return to overview" | Saves without checks | Blank allowed, invalid refused | Ruling, as animals | Ruling 9 Oct pm p3-016; c-313, c-211 |
| Position of "Save and return to overview" while amending | Its own line below the buttons | **Now matches** | Brought in line, as animals | Code plants `shared/save-actions.njk` (`bb5cd2a`) |
| Position of the cancel link | Its own line below the buttons | **Now matches**, as animals | Brought in line | Code plants `shared/save-actions.njk` (`e6f5d7e`) |
| Party pickers while amending | Three buttons | Two buttons | Ruling, as animals | Ruling 9 Oct pm p3-017; c-210 |
| "Cancel amend" | Pop-up | Confirmation page | Ruling, as animals | Ruling 9 Oct pm claim 19; c-190 |
| Page opened from an Overview task row | Returns only when marked `?from=hub` | Goes through the task row, then the Overview | Ruling, as animals | Ruling 9 Oct pm p3-015; c-243 |
| End of the opening run | Always goes to check your answers | Goes there once commodity type and origin are answered | Engineering: the page keeps its gate | Code plants `flow/run.js`; d-085 |
| Check your answers error summary | "Complete <card title>", linking to the card | Was plants' own wording, linking to the row's first page. **Now matches animals**: "Complete <card title>", linking to the card, which gets a red border | Brought in line (ruling 7a) | Code plants `check-answers/view-model/incomplete-cards.js` (`75b06e3`) |

For the BAs: the plants contact card is titled just "Contact", so its error reads "Complete contact". Animals' card is "Contact address for this consignment". A clearer plants card title would fix both.
