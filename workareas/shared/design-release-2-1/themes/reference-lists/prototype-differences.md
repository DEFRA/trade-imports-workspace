# Reference lists: where we differ from the prototype

Theme: Reference lists (EUDPA-692), branch `feat/EUDPA-692-design-release-2-1-reference-lists`.
Prototype: Design Release 2.1, commit `04a073b`. It decides how a list reads (labels, order), not what a list contains.

## Summary

| | Count |
|---|---|
| Differences we keep, with a reason | 11 |
| Brought in line on this branch | 1 |

Almost every difference comes from one ruling: a list holds whatever MDM serves through reference-data. Where MDM differs from the prototype, MDM has to change. Nobody edits a list in code.

## Animals

| Page | Prototype | Ours | Why | Source |
|---|---|---|---|---|
| Import reason: destination country | 41 hand-typed places (EU states, outermost regions, Crown Dependencies) | MDM's GBNAG_SPS_EX block: 40 entries. Adds Iceland, Liechtenstein, Norway, Switzerland; no Ceuta, Melilla or Crown Dependencies; MDM's names ("Czechia"). Order and "<territory> (<parent>)" labels match | Ruling: list content is MDM's | Ruling 9 Oct claims 25, 26, 29. Code `services/countries/index.js` |
| Import reason: Saint Martin | "Saint Martin (France)" | "Saint Martin (French part) (France)" | MDM's name already has a bracket; we never respell MDM's names | Ruling 9 Oct claims 25, 26 |
| Import reason: port of exit, which ports | 10 border control posts approved for animals | All 78 ports MDM holds | MDM has no "approved for animals" flag. Narrow the list if MDM adds one | Ruling 9 Oct claim 31; deferred.md |
| Import reason: port of exit, labels | "Holyhead POE - GBHLY" ("(animals)" tag, post code) | "Port of Dover - GB DVR": MDM's name and code, same "Name - CODE" form | The tag and post codes belong to a list MDM doesn't hold | inc-007; ruling 9 Oct claims 25, 31 |
| Import reason: port of exit, order | One A to Z list | Airports, then seaports, then rail, each A to Z | Ruling: that order for every port list | Ruling 9 Oct claims 31, 33. Code reference-data `PortListOrder.java` |
| Check your answers: port of exit | Shows the option text as picked | Was "Port of Dover (GB DVR)" against the dropdown's "Port of Dover - GB DVR". **Now matches the dropdown and the prototype**: one label for both ports, "Name - CODE" | Brought in line | Code `services/ports/index.js` displayName (animals `88929d14`, plants `d5388c6`, ins-tests `9358624`) |
| Arrival details: port of entry, airport order | Busiest first ("London Heathrow", "London Gatwick", …) | A to Z | Ruling: each group A to Z | Ruling 9 Oct claim 33 |
| Arrival details and import reason: rail ports | Folkestone sits among the seaports | Rail is its own group after seaports | Ruling: rail is its own group | Ruling 9 Oct claim 33. Code reference-data `PortType.java` |
| Arrival details: port of entry, which ports | 28 airports, about 177 seaports | MDM's 78 real GB ports, duplicates and misspellings included ("Teestort") | Ruling: content is MDM's. Data errors reported to the MDM team | Ruling 9 Oct claims 25, 30, 32; deferred.md |
| Origin: country of origin | 41 hand-typed places | MDM's GBNAG_SPS_EX block, MDM's names. Labels are the origin-page theme's work | Ruling: content is MDM's | Ruling 9 Oct claims 25, 29, 30 |
| Party address: country | UK plus the 41 places | MDM's unfiltered list, about 249 places; UK still first | Ruling: the Country select is reference-data's unfiltered list | Ruling 9 Oct claims 25, 28, 30 |

## INS

| Page | Prototype | Ours | Why | Source |
|---|---|---|---|---|
| Address book: country | UK plus the 41 places | MDM's unfiltered list, about 249 places; UK still first | Ruling, as animals | Ruling 9 Oct claims 25, 28, 30. Code ins-frontend `services/countries/stub.js` |

## Plants

No prototype. Plants takes the same MDM lists, the same port order and the same "Name - CODE" port label as animals.
