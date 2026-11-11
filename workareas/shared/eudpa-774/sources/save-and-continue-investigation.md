# Save and continue: where it goes today

Read on `trade-imports-animals-frontend` origin/main `2038fc3a`. Paths are under `src/server/app/` unless they say otherwise, and `linear/` means `src/server/app/sets/live-animals/journeys/linear/`. I re-read the core routing lines myself. Everything else comes from the page-group research and the verifier's corrections. Nothing was edited and no tests were run.

## 1. The short answer

Save and continue only goes to the next page during the **opening run**. That is a new notification's first unbroken pass, from "Create new notification" until Overview or the review page is shown for the first time. After that, every Save and continue goes to Overview. There are two exceptions: a page opened from a review Change link goes back to the review, and CPH number goes back to Roles and addresses.

The BA's arrival details example already works, but only in the opening run: Rail or Road goes to transit countries, and Air or Sea goes to Transporter details. It does not work from Overview, on a reopened draft, a copy, a new session, or Save and continue while amending. It also stops working for good once the BA presses Back on arrival details, Cancel, Save and return to overview, or Cancel in the address book. Each of those shows Overview, which ends the run. This is specified and ruled behaviour, not a defect.

## 2. How it works today

`kit.nextTarget` (`shared/kit.js:298-304`) decides. The first rule that applies wins:

1. **Save and return to overview** (`exit=hub`) goes to Overview (`kit.js:229-235`, via `hubExitTarget`).
2. **`?change=1`** (opened from a review Change link) goes to the review page (`kit.js:235`).
3. **Opening run active**: the next step in `RUN_STEPS` whose gate passes (`kit.js:243-246`; `linear/flow/run.js:29-74`, `76-91`). If no later step passes, it goes to Overview (`run.js:90`).
4. **Otherwise** `nextInTaskRow` (`flow/navigation.js:55-60`): the next page of the same flow section, but only if it is in the **same Overview task row**. If not, it goes to Overview. Every task row holds one page, except Roles and addresses, which also holds CPH number (`linear/flow/task-rows.js:27-68`). So in practice rule 4 means "go to Overview".

**The opening run** is a per-notification flag in the session cookie (`flow/run-state.js:3-26`). Only the dashboard's create POST starts it (`linear/features/dashboard/controller.js:137-141`). Any GET of Overview ends it for good (`linear/features/hub/controller.js:117-119`), and so does any GET of the review page (`linear/features/check-answers/controller.js:195-203`). Nothing starts it again.

**Run order:** origin → What are you importing? → main import reason → commodity details → identification details → additional details → arrival details → transit countries → transporter list → upload documents → roles and addresses → contact → review (`run.js:29-74`).

**Gates:** a step is skipped when its gate fails (`flow/gates.js:16-32`). A derived gate needs the earlier `countryOfOrigin` and `commodityCode` answered (`flow/prerequisites.js:13-27`; `bridge/obligation-source.js:29-32`). It also needs the page to collect at least one in-scope answer, or to collect nothing at all.

## 3. Page by page

"Amend S&C" means the secondary Save and continue button while amending. Amend never starts a run (`dashboard/controller.js:130-135`), and that button drops `change=1` (`shared/amend-form-actions.js:31-41`). The amend "Save and return" button goes to the review on every page unless a row says otherwise.

### Import details and goods

| Page | Situation | Save and continue goes to | Proven by |
|---|---|---|---|
| Origin | Opening run | What are you importing? | `opening-run.test.js:144`, `:161`; `run.test.js:55`; e2e `opening-run.spec.ts:52` |
| Origin | After the run, from Overview, reopened, copy | Overview | `opening-run.test.js:153`, `:457`; `journey-smoke.fit.spec.js:57` |
| Origin | Review Change link | Review | `opening-run.test.js:427`, `:465`; `check-answers.fit.spec.js:321` |
| Origin | Amend S&C | Overview | e2e `amend-endings.spec.ts:68` |
| What are you importing? | Opening run | Main import reason | `opening-run.test.js:166`; `run.test.js:61` |
| What are you importing? | After the run / from Overview | Overview (not Commodity details) | `dispatch.test.js:30`; e2e `overview-task-return.spec.ts:10` |
| What are you importing? | Opened from Commodity details or Identification details ("add/change commodity", `?return=`) | Back to the page that opened it, in the run too (`commit-selection.js:51-56`) | `search.controller.test.js:490`, `:497`, `:516` |
| What are you importing? | Amend S&C with a return marker | The page that opened it, without `change` (verifier correction) | not tested |
| What are you importing? | Reached by removing the last commodity, mid-run | Main import reason again (no return marker, `post-remove.js:23`) | not tested |
| Main import reason | Opening run | Commodity details, whatever the reason | `run.test.js:79`; `opening-run.test.js:221` |
| Main import reason | After the run / from Overview | Overview | `opening-run.test.js:478`; `dispatch.test.js:37`; e2e `overview-task-return.spec.ts` |
| Main import reason | Review Change link | Review | not tested on this page |
| Main import reason | Amend S&C | Overview | `features/save-actions.test.js:234` |
| Commodity details | Opening run | Identification details. If no species needs identifiers, that page redirects on to Additional details. | `run.test.js:73`; `opening-run.test.js:176`, `:206` |
| Commodity details | After the run / from Overview | Overview | `opening-run.test.js:176`; `change-context.test.js:204`; e2e `overview-task-return.spec.ts:40-45` |
| Commodity details | Review Change link | Review | `change-context.test.js:170` |
| Commodity details | Amend S&C | Overview | not tested on this page |
| Identification details | Opening run | Additional details | `run.test.js:87`; `opening-run.test.js:194` (Enter key, not the button) |
| Identification details | After the run / from Overview | Overview | `animal-identification.controller.test.js:631`, `:764`; e2e `overview-task-return.spec.ts:47-51` |
| Identification details | `change=1` (only reachable from the count-drop error) | Review | `change-context.test.js:182` (Enter path); the button itself is not tested |
| Identification details | Amend S&C | Overview | not tested on this page |
| Additional details | Opening run | Arrival details | `run.test.js:93`; `opening-run.test.js:229` |
| Additional details | After the run / from Overview | Overview | `opening-run.test.js:484`; `additional-details.fit.spec.js:202` |
| Additional details | Review Change link | Review | e2e `change-from-cya.spec.ts:6` |
| Additional details | Amend S&C | Overview | not tested on this page |

### Transport

| Page | Situation | Save and continue goes to | Proven by |
|---|---|---|---|
| Arrival details | Opening run, Rail or Road | Transit countries | `run.test.js:121`, `:136`; `opening-run.test.js:496` (Road only). No fit or e2e test. |
| Arrival details | Opening run, Air or Sea | Transporter details | `run.test.js:127`; e2e via `journey.ts:685-694` (Air) and `:745-754` (Sea) |
| Arrival details | After the run / from Overview, any means | Overview | `dispatch.test.js:44`; `opening-run.test.js:496`; `arrival-transit.fit.spec.js:595`; e2e `transit-means-scope.spec.ts:17` |
| Arrival details | Review Change link, any means, including a switch to Rail or Road | Review. Transit countries is not asked; the review gains a transit card. | not tested on this page |
| Arrival details | Amend S&C | Overview, even for Rail or Road | not tested on this page |
| Arrival details | Any validation error (means, date, port, text over 58 characters) | Stays on the page with a 400 | `port-of-entry.controller.test.js:55` (means only) |
| Transit countries | Opening run | Transporter details | `run.test.js:142` only (unit) |
| Transit countries | After the run / from Overview | Overview | `dispatch.test.js:51`; `transit-countries.controller.test.js:380`; `arrival-transit.fit.spec.js:767` |
| Transit countries | Gate fails (Air, Sea, no means, or country or commodity missing) | Overview on GET and on every POST, saving nothing. This beats `change` and the run. | `transit-countries.controller.test.js:657`, `:667`, `:693` (POST: Air and missing answers only) |
| Transit countries | Review Change link | Review | not tested on this page |
| Transit countries | Amend S&C | Overview | not tested on this page |
| Transporter list | Opening run (from transit or straight from arrival) | Upload documents | `run.test.js:148` only (unit) |
| Transporter list | After the run / from Overview | Overview | e2e `transporter.spec.ts:29`, `overview-task-return.spec.ts:82-86`; `transporters.fit.spec.js:354` |
| Transporter list | Review Change link | Review | not tested |
| Transporter list | Amend S&C | Overview | not tested |
| Add a transporter (type question) | Any | Commercial or private details form, or back to the list. Never Overview. | `transporter-add.controller.test.js:64`, `:75`, `:86`, `:94` |
| Commercial / private details | Opening run | Upload documents (it continues as if the list had been saved) | `opening-run.test.js:258`, `:271` |
| Commercial / private details | After the run | Overview | `commercial-transporter-details.fit.spec.js:220`; `transporters.fit.spec.js:862` |
| Commercial / private details | `change=1` | Review | commercial: `controller.test.js:183`; private: not tested |
| Select a transporter (no page links to it) | Run / after / `change` | Documents / Overview / review | `opening-run.test.js:248`; `transporters-select.controller.test.js:45` |

### Documents, addresses and contact

| Page | Situation | Save and continue goes to | Proven by |
|---|---|---|---|
| Upload documents | Opening run | Roles and addresses | `run.test.js:163`; e2e `opening-run.spec.ts:9` |
| Upload documents | After the run / from Overview | Overview | `documents/controller.test.js:461` (`it.each`), `:502`; e2e `documents-save-buttons.spec.ts:96` |
| Upload documents | Review Change link | Review | `documents/controller.test.js:531` |
| Upload documents | Amend S&C, including from a Change link | Overview | `documents/controller.test.js:461`, `:552` |
| Roles and addresses | Opening run | Contact. It never goes to CPH. If every task is already complete, it goes to Overview (`run.js:81-83`). | `run.test.js:169`, `:177`; `opening-run.test.js:286`, `:296` |
| Roles and addresses | After the run / from Overview | Overview, even when a CPH number is needed | `opening-run.test.js:515`; `dispatch.test.js:58`; e2e `overview-task-return.spec.ts:107` |
| Roles and addresses | Review Change link | Review. But after a trip through CPH (its link drops `change`, `addresses/controller.js:57`) or an address-book add (the handshake drops `change`), it goes to Overview. | `addresses/controller.test.js:306`; the round trips are not tested |
| Roles and addresses | Amend S&C | Overview | not tested on this page |
| Party picker | Any | Roles and addresses (keeps `change`). Amend Save and return goes to the review. | `party-picker.controller.test.js:200`, `:489`, `:549`, `:571` |
| CPH number | Any draft | Roles and addresses. Amend Save and return goes to the review. | `opening-run.test.js:304`; `dispatch.test.js:62`; `cph-number/controller.test.js:192`, `:213` |
| Contact | Opening run | Review page, even with tasks outstanding. Showing it ends the run. | `run.test.js:185`, `:191`; `opening-run.test.js:322`; e2e `opening-run.spec.ts:71` |
| Contact | After the run / from Overview | Overview | `contact.fit.spec.js:84`; e2e `contact-address.spec.ts:26`, `:49` |
| Contact | Review Change link | Review. After an address-book add, Overview (`change` is lost). | not tested |
| Contact | Amend S&C | Overview | not tested on this page |

### End of the journey

| Page | Situation | Goes to | Proven by |
|---|---|---|---|
| Review ("Continue") | Any draft or amend | Declaration. If anything is outstanding, back to review `?refused=1`. Never Overview. | `declaration/controller.test.js:138`, `:165`; `check-answers.fit.spec.js:471` |
| Declaration ("Continue") | Any | Confirmation. Not ready: review `?refused=1`. Unticked: stays with a 400. | `declaration/controller.test.js:236`, `:250`, `:317` |
| Confirmation | Any | Links only (dashboard, Create a new notification, which starts a new run) | `confirmation.fit.spec.js:136`, `:147` |

## 4. The BA's example: arrival details

**In the opening run** (created from the dashboard this session, with Overview and the review not shown yet):
- **Rail or Road** goes to "Which countries will the consignment travel through?" (`run.js:56-61`). Transit countries is in scope only for `RAILWAY` or `ROAD_VEHICLE` (`sets/live-animals/obligations/sections/transport.js:96-111`). Tested: `run.test.js:121` (road), `:136` (rail), `opening-run.test.js:496` (road). No fit or e2e test walks this path; every e2e opening-run walker goes by Air or Sea.
- **Air or Sea** goes to Transporter details, because the transit gate fails and the run skips that step (`run.js:84-89`). Tested: `run.test.js:127`; e2e Air (`opening-run.spec.ts:10`), Sea (`horse-temporary-admission.spec.ts:21`).

**From Overview** (and after the run in general): Overview for every means of transport (`navigation.js:55-60`). The arrival details task row holds only that page (`task-rows.js:62-64`). For Rail or Road, transit countries then appears as its own conditional task on Overview. Tested: `dispatch.test.js:44`, `arrival-transit.fit.spec.js:595`, e2e `overview-task-return.spec.ts:67-73`, e2e `transit-means-scope.spec.ts:17`.

**From the review page** (Change link, `?change=1`): back to the review for every means, even when switching from Air to Rail. Transit countries is not asked; the review shows a Transit countries card with its own Change link (`check-answers/view-model/cards/movement/transit-countries.js:12-27`). The redirect is not tested on this page.

**Transit countries needs a country of origin and a commodity.** The transit page's derived gate needs `countryOfOrigin` and `commodityCode`, as well as Rail or Road (`gates.js:23-32`; `prerequisites.js:13-27`). If either is missing, the run skips transit countries and transporters. Arrival details then falls through to Overview whatever the means (`run.js:90`). The transit page itself sends any GET or POST to Overview (`transit-countries.controller.js:128-142`; tested at `transit-countries.controller.test.js:657`, `:667`). Through the UI this only happens if the BA types an address, because the run collects both answers first. The arrival details path with them missing is not tested.

**Why the BA is probably seeing Overview:** arrival details' own Back link always goes to Overview, even mid-run (`linear/features/transport/port-of-entry/port-of-entry.controller.js:64`; spec REQ-ARRIVAL-010, `journey-pages/arrival-details/spec.md:197-205`). If Monica presses Back once, or reopens the draft from the dashboard, every later save goes to Overview. No test walks "Back to Overview, then save".

## 5. Where the current behaviour came from

- **Before 13 Oct 2026**, a save outside the run used `nextInSection`. Arrival details opened from Overview then went on to transit countries and the transporter, which is what the BA wants (`workareas/shared/design-release-2-1/snagging/navigation.md:186-201`).
- **EUDPA-691** (animals PR #399, commit `6760aee8`, 13 Oct, inc-002 "A page opened from an overview task returns to the overview when saved") switched the fallback to `nextInTaskRow`. The ticket gives the reason: *"so a task opened to change one answer does not reopen the whole section"*.
- **The ruling:** `workareas/shared/design-release-2-1/sources/ruling-sam-2026-10-09.md:251-253`, claim 39: *"A page opened from its overview task returns to the overview on Save and continue (req-1615)… No ?from=hub marker is added; only the live flow's fallback changes."* This feeds req-1615 and req-808, and conflicts c-243 and c-276.
- **The prototype** behaves the same way for hub-opened pages (claim p1-071, `routes.js:1588-1602`; harness `prototype-specs/e2e/eudpa-691.fit.spec.js:52-61`: *"A2 opened from the hub: Arrival details returns to the hub on Save and continue"*). One difference: the prototype has no run flag, so a page reached any other way always continues in step order.
- **Settled again on 20 Oct** after a tester raised the same complaint: *"Save and continue from an Overview task: it returns to Overview, as main and the prototype do"* (`snagging/eudpa-691/save-and-status.md`).
- **Still open:** *"Should Save and continue from a task go on to the next unfinished task instead?"* (`snagging/navigation.md:203`).
- **The spec** (`openspec/specs/live-animals/journey-flow/spec.md`): REQ-FLOW-003 (`:36-38`) says that outside the opening sequence and outside a review change, continuing *"MUST otherwise return them to Overview — never on into a page another Overview task opens"*. SCN-FLOW-003-C (`:52-56`) names arrival details explicitly. SCN-FLOW-007-C (`:200-205`) covers the run being over. The BA's example is SCN-FLOW-007-J (`:251-257`), scoped to "in the opening sequence".

## 6. What changing it would mean

"Always the next page, never Overview" contradicts REQ-FLOW-003, the 9 Oct ruling, EUDPA-691's accepted criteria and the prototype's hub behaviour. The owner would have to overturn claim 39.

**Page by page, in summary:**
- Every page that goes to Overview today after the run, from Overview or on Amend S&C would go somewhere else. That is origin, What are you importing?, import reason, commodity details, identification details, additional details, arrival details, transit countries, transporter list and its add pages, upload documents, roles and addresses, and contact.
- No change for pages that never go to Overview: the party picker, edit details, CPH number, the transporter type question, review, declaration and confirmation.

**"Next" has to be defined first.** Three orders disagree:
- **Run order** (`run.js`): import reason → commodity details; transporters → documents → addresses → contact.
- **Section order** (`linear/flow/flow.js:26-68`): import reason → additional details; documents → addresses → transport.
- **Overview row order** (`task-rows.js`): documents last.

`nextInSection` already gives the BA's arrival details routing, because transport is one section (`dispatch.test.js:46`). Elsewhere, section order does not match the run.

**The end of the journey:** under run order, contact would go to the review page. Under Overview order, it would go to upload documents and then the review. The review's own Continue already goes forward.

**Risks:**
- A trader who opens one task from Overview to fix one answer gets walked through every later page. That is exactly what EUDPA-691 removed.
- Amend Save and continue would no longer be "go back to Overview", and the two amend buttons would need rethinking.
- From a review Change link, switching to Rail or Road would need a rule: return to the review, or ask transit countries.
- A fallback is still needed when no later gate passes (`run.js:90`).
- Back links to Overview on arrival details, identification details, the transporter list, upload documents, roles and addresses and contact, plus Cancel in the address book for roles, would still end the run, unless the run is made to survive Overview.

**Tests and spec that would flip:**
- spec: REQ-FLOW-003 and SCN-FLOW-003-B, C, D, E, G, H and I; SCN-FLOW-007-C and F; SCN-FLOW-007-J's scope; the transporter-details page specs (`journey-pages/commercial-transporter-details/spec.md:22-28`, `private-transporter-details/spec.md:29-35`)
- unit: `dispatch.test.js:30-75`; `opening-run.test.js:153`, `:166`, `:176`, `:296`, `:457`, `:477-524`; `run.test.js:177`; `features/save-actions.test.js:234`; `change-context.test.js:204`, `:215`; around eight `animal-identification.controller.test.js` cases
- fit: `arrival-transit.fit.spec.js:595`, `:767`; `additional-details.fit.spec.js:202`; `journey-smoke.fit.spec.js:57`
- e2e: `overview-task-return.spec.ts` (whole file), `transit-means-scope.spec.ts:17`, `amend-endings.spec.ts:68`, `transporter.spec.ts:29`, `contact-address.spec.ts:26`, `:49`

**Options:**

| Option | What it does | Size |
|---|---|---|
| **(a) Keep today's rule** | Tell the BA that SCN-FLOW-007-J holds in the opening run. Give them a test recipe: create a new notification and never press Back, Cancel or Save and return to overview, or open Overview. | Small: a run-aware Back on arrival details (add `backCandidates` like transit countries has, `run.js:57-61`), so Back no longer ends the run. Add a Rail-into-transit e2e. |
| **(b) Transport continues as one block** | Arrival details → transit countries (Rail or Road) → transporter list, then Overview. For example, put transit countries in the same task row as arrival details, or add a per-row "continue in section" exception. Every other page keeps today's rule. | Medium: `task-rows.js` or `navigation.js:55-60`, SCN-FLOW-003-C, `dispatch.test.js:44`, `:51`, two e2e specs, Overview row and status display. |
| **(c) Always the next page in run order, ending at the review** | Drop the run flag from routing: `runTarget` always applies (`kit.js:243-246`), or `nextInTaskRow` falls back to `nextRunTarget`. | Code small (a few lines), spec and tests large (the list above). Needs owner sign-off overturning claim 39. Brings back the problem EUDPA-691 fixed. |

**Recommendation:** (b), plus the Back-link fix from (a). It gives the BA exactly the arrival details behaviour they asked for, in every situation, without walking a trader through the whole journey from any task. It needs the owner to amend claim 39 for the transport section only.

## 7. Open questions

1. Does the BA mean only arrival details → transit countries → transporter, or every page? Their example is transport only. "Always" may come from losing the run after one Back.
2. If every page, which order counts as "next": run order, section order or Overview order? They differ at import reason, documents and contact.
3. From a review Change link, should switching arrival details to Rail or Road go to transit countries or back to the review?
4. While amending, should the secondary Save and continue also walk forward, or stay as it is?
5. Will the owner overturn ruling claim 39 (req-1615), in whole or for the transport section? And should the open designer question at `snagging/navigation.md:203` ("next unfinished task") be answered at the same time?
