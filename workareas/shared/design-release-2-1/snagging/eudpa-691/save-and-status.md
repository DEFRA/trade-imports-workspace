# Save and continue, and the Transit countries status: two tester points on the journey foundation

Two tester comments on the Design Release 2.1 journey foundation (Jira EUDPA-691). It merged to main on 13 October and the tester saw it on the CDP test environment, in the live animals frontend.

The reference is the Design Release 2.1 prototype plus Sam's recorded rulings, not the tester's comments.

Main was judged from its code and tests. The docker stack was not run. The prototype was run with the prototype-specs harness: 4 of 4 checks passed, and the screenshots are in `screens/`.

## Summary

| | Tester said | Verdict | Change needed |
|---|---|---|---|
| A | "Save and continue keeps taking me back to the overview" | **Matches the prototype, with one gap that is already planned.** A page opened from Overview goes back to Overview, which is what the prototype and the 9 October ruling ask for. The gap is that main's Back link mid-journey goes to Overview and quietly ends the guided journey. | No new row. Add 1 criterion to each of the 3 Back-link rows that are already planned. |
| B | "Transit countries stays 'To do' after Save and continue with no countries added" | **Matches the prototype.** It reads To do until a country is added. That rule was adopted on purpose. | None. One question for the designers or BAs. |

Questions to post on the ticket are at the end.

## A. Where "Save and continue" goes

### How main decides

Main does not mark the page address. Instead it keeps an "opening run" flag in the session, one per notification.

- **The run starts** only when you choose "Start a new notification" on the animals dashboard (`features/dashboard/controller.js:120-124`, `beginOpeningRun`).
- **While the run is on,** Save and continue goes to the next step: origin, what you are importing, reason, commodity details, identification, additional details, arrival, transit countries, transporter, documents, roles and addresses, contact, then review (`flow/run.js`, `RUN_STEPS`).
- **The run ends as soon as Overview or the review page is shown,** however you got there (`features/hub/controller.js:114`, `check-answers/controller.js:181`, `completeOpeningRun`). It never starts again for that notification.
- **After the run,** Save and continue moves on only inside the same Overview task, which in practice means the CPH number page. Otherwise it goes back to Overview (`shared/kit.js:137-146`, `nextTarget`, then `nextInTaskRow`).

These are all under `repos/trade-imports-animals-frontend/src/server/app/`.

Plants uses the same mechanism (`plants shared/kit.js:136`, plants `hub/controller.js:140`), so this applies to both services.

### Does main tell the two cases apart correctly?

| Check | Result |
|---|---|
| Does a brand-new notification return to Overview from its first pages? | No. The create action redirects to origin with the run already on. Tests cover each step moving to the next (`flow/opening-run.test.js:150-440`). |
| Does "opened from Overview" leak into a new notification? | No. The flag is stored per notification id, and a new id starts its own run (`opening-run.test.js:724-735`). |
| Does the run end too early on its own? | No. Only showing Overview or the review page ends it. Roles and addresses ends on Overview only when every task is complete, and the prototype does the same (`routes.js:1588-1590`). |
| What can end it without the user meaning to? | **The Back link.** On every guided page except origin, main's Back link goes to Overview: import reason, commodity search, commodity details, identification, additional details, arrival, transit countries, transporter, documents and contact (for example `import-reason/controller.js:61` and `transit-countries.controller.js:61`). One click on Back shows Overview and ends the run. From then on, every Save and continue returns to Overview. |
| Anything else | Opening a draft from the dashboard, or from the Import Notification Service dashboard (`ins-frontend dashboard/view-model/list.js:94`), opens Overview. "Save and return to overview", "Cancel and return to overview", a copy, a template, or a session older than 4 hours all lead to the same result. Each of these is intended. |

### What the prototype does

The prototype tells the two cases apart with a `?from=hub` marker on each Overview task link (`app/routes.js:441-443`, `6732-6820`).

- **Opened from Overview:** the page returns to Overview (`routes.js:1632-1646`, `getSectionContinueRedirect`). Screenshots: `a2-arrival-opened-from-hub.png` and `a2-arrival-from-hub-returns-to-hub.png`. **Main does the same.**
- **Reached in sequence:** the page always goes to the next step, with no flag that ends (`routes.js:1579-1597`).
- **Back link while in sequence:** the prototype goes to the previous page, for example import reason back to what you are importing (`routes.js:489-499`, `10931`, `10953`). The guided sequence carries on. Screenshots: `a1-reason-in-run-back-link.png` and `a1-after-back-save-continues-to-reason.png`. **Main differs here.**
- Arrival details, transporter, documents and roles and addresses send Back to Overview in the prototype as well (`routes.js:4485`, `3422`, `11384`, `3291`).

### The ruling and the backlog row

- **The row:** in the journey foundation backlog, the row "A page opened from an overview task returns to the overview when saved" is done (animals PR #399, plants PR #93, tests PR #21).
- **The ruling:** in the 9 October ruling, claims 196 to 198 (conflict c-243), the return is built from the service's own journey state, with "no from=hub marker on the links or forms". The prototype's marker claims were overruled. The 9 October pm ruling, p3-015, applies the same rule to plants.
- **The spec:** `openspec/specs/live-animals/journey-flow/spec.md` REQ-FLOW-003 (scenarios C to I) and REQ-FLOW-007-C ("Revisiting an opening-sequence page after the run has finished does not resume it").

### Verdict for A

**Same as the prototype for pages opened from Overview.**

**One difference, already planned:** in the prototype, Back during the guided sequence goes to the previous page. On main it goes to Overview and ends the run. Because of the "no marker" ruling, main cannot treat a later page as part of the guided sequence once Overview has been shown. This is probably what the tester did, but we cannot confirm it without their steps.

The spec already asks for the prototype's Back links. For example, import reason's spec says Back goes to "what are you importing" during the opening sequence. These rows still to be built cover it:

| Row | Theme | Status |
|---|---|---|
| Commodity page and Commodity details Back links follow the journey | commodities and reason | to do |
| Main import reason and Additional details Back links follow Design Release 2.1's journey order | commodities and reason | to do |
| Transit countries page: title, Back link and redirect when it does not apply | arrival and transit | to do |

**Proposed criterion to add to each of those three rows** (for animals and plants). None of the rows says yet that the guided journey survives Back:

- Animals: "In the opening run, following the Back link to the previous page and then choosing Save and continue moves to the next step of the run, not to Overview."
- Plants: "In the opening run, following the Back link from a run step to the previous run step and then choosing Save and continue moves to the next run step, not to Overview. Plants' Back links on arrival status, arrival details, identification numbers and the commodity list go to Overview today."

Identification details and arrival details are left as they are. The spec says their Back goes to Overview (identification-details REQ near line 227, arrival-details near line 198), although the prototype sends identification Back to the previous page (`routes.js:1655`). That difference is the spec's choice and is not part of this point.

## B. Transit countries status with none added

### What main does

- The task appears only once a commodity is chosen and the means of transport is Rail or Road (`flow/task-rows.js`, `transitCountries`, conditional).
- Saving with no countries is allowed, because the question is optional (`transit-countries/validate.js`). In the run, it moves on to the transporter.
- The status works like this: no countries means the answer is blank, so the row's status is "optional" (`bridge/status/index.js`, `optionalOrProgressStatus`). Overview shows Complete only for "fulfilled", so any other status reads **To do** (`hub/controller.js:43-51`, `statusTag`).
- An optional row does not block review and submit (journey-flow REQ "every row fulfilled, not applicable or optional"). The review shows "Not applicable" for transit countries (check-your-answers spec, near line 102).
- Additional details, upload documents, and any other row with nothing to answer also read To do until something is entered.

### What the prototype does

- The task shows only for Rail or Road (`routes.js:2376-2382`, `6782`).
- It reads Complete only when at least one country is selected (`routes.js:2411-2413`). The prototype has only Complete and To do (`routes.js:6680-6681`).
- In sequence, saving none goes to the transporter and Overview reads To do. Screenshots: `b1-transit-countries-none-added.png`, `b1-run-continues-to-transporter.png` and `b1-hub-transit-countries-to-do.png`.
- Opened from Overview, saving none returns to Overview, still To do (`b2-hub-after-saving-none-from-hub.png`).
- Upload documents also reads To do until a document is uploaded (`routes.js:6799`).

### Spec and ruling

- Requirement req-372 (adopted, from the prototype at p6-078): "The overview's 'Transit countries' task shows Complete only when at least one country has been added; with none it shows To do."
- `openspec/specs/live-animals/journey-pages/overview/spec.md` REQ-OVERVIEW-012: "MUST show it To do until at least one transit country is saved, then Complete." REQ-OVERVIEW-002 allows only 2 statuses.
- The row that carries req-372, "Arrival and transit task statuses on the overview, and transit countries on the review", is still to be built in the overview and review theme. Main already behaves this way.

### Verdict for B

**Same as the prototype, and the spec says so.** No backlog change.

The tester has a fair point about usability. GOV.UK's task list pattern bases a task's status on whether the user has finished it, not on whether they gave an answer. A task that is legitimately left empty but stays "To do" tells the user there is still work to do when there is none.

The prototype's 2-status design has no way to show this. The workspace's GDS notes only list the component (`docs/best-practices/gds/components.md:61`) and do not cover it. That makes it a design question, not a defect.

Plants differs: it already shows an "Optional" status with no tag (plants `hub/controller.js:51`, `copy.en.js:13`).

## Questions for the designers or BAs, ready to post

Updated 20 Oct: Sam settled the first two, so one question is left to post.

1. **Status of an optional task left empty.** As designed, Transit countries (and other tasks that need no answer, such as Upload documents) reads "To do" until something is added, even after the user saves the page with nothing in it. Should a task the user has saved with nothing in it read "Complete", a different status such as "Not needed", or stay "To do"?

Settled 20 Oct, not posted:

- **Back during a new notification:** no change to the plan. Back goes to the previous page and the run carries on, built in design snagging. The question to the tester is dropped, because the answer would not change what we build.
- **Save and continue from an Overview task:** it returns to Overview, as main and the prototype do.

## Calls I made

- I judged A from code and tests, not from the stack. The cause of the tester's experience is inferred. Their steps would confirm it.
- I proposed criteria for rows that already exist rather than a new row, because the Back-link work is already planned.
- I added a prototype check spec at `prototype-specs/e2e/eudpa-691.fit.spec.js`.
