# Sam's answers after the re-distil (9 October 2026, afternoon)

Verbatim, to be folded into the next ruling once the review round ends.

## 1. Search boxes: component versus content

"Now we need to be really careful here because the prototype isn't accessible. It's not using some GDS stuff. It's using
prototype thrown up by AI stuff. At least some of the pages, if not all of the pages in the live animal show, only use a
version of auto complete or search or whatever that has been deemed accessible and meets our requirements."

"If it has been, the sort of precedence needs to be a little bit different than prototype always wins. In terms of the
component being used, it might be the one that's actually in the frontend or frontends. The content of that dropdown, if
it's a country dropdown, what's in it? That might still need a bit more input, so it isn't as blunt to say the frontend
is correct on this, but also the prototype isn't necessarily production-grade with its solution."

Under research: whether the accessible-component rollout has landed on every screen (agent, 9 Oct).

Agent findings: `search-component/findings-2026-10-09.md`.

## 3. Prototype JavaScript behaviour: toolbox first, graceful degradation, else back to design

Said while on the arrival details and transit countries pages: "I think we're hitting a bit of a theme here where the
prototype is doing stuff with JavaScript that is not GDS compliant."

"This isn't stuff that can just be blindly replicated by chucking a tonne of JavaScript in the frontend. The frontend
skills know this, but we can't have Infront saying, 'Do things like add all this JavaScript stuff for accessibility
concerns and maintainability concerns.'
We really try to strictly head here to GDS components as a toolbox, and where that's not available, use other
government libraries like a Ministry of Justice or a Scottish Government component that has been tested and meets
accessibility requirements.
We've got a graceful degradation requirement on this, like any other GDS project, which means you can use things like
CSS and JavaScript to enhance behaviour, but you need graceful degradation. It needs to be able to work without
JavaScript, and that means that the way things are done in the prototype may not be possible or even desired in the real
thing.
Almost as a pre-step for some of these increments, we need to get answers to that stuff:
- Is it possible using off-the-shelf GDS?
- If it isn't, is it using available, off-the-shelf, other complementary components?
- If it isn't, why is this atypical thing strongly required?
At that point, we go back to design and say, 'Come on, we don't need this.' Rather than, 'This isn't a startup where you
can do anything'"

Triage of every backlog row whose prototype behaviour relies on JavaScript: `js-triage/triage-2026-10-09.md`
(agent, 9 Oct). It includes 12 questions for design.

### 3a. How the "ask design" rows are built

"I think with the ask design rows, they need individual check-ins. If there are functionality changes, that sort of
purely adding JS stuff, then that needs questioning, and it is blocked on design. I really don't know. Almost both
implement the no-JS version and have another increment which is blocked waiting on design, and the design block stuff
its own theme."

Read as: each "ask design" row splits in two.
- The version that works without JavaScript is built now, in the row's own theme.
- The JavaScript-only addition becomes its own increment, blocked on design's answer. Each one is checked in with design
  individually: one increment, one question.
- Every design-blocked increment sits in one new theme of its own.

### 3b. Live filtering waits on design too

"Yeah, that live filtering has to wait on design." The address book list and the address pickers on roles and
addresses split like every other ask-design row: search on Search or Enter is built now, and filtering as the trader
types waits on design. This replaces claim 22 of the morning ruling, and DR1's c-094, on that point.

Sam also said not to bring him lists of row ids to confirm: "Why come back to me with that shit?" From here the
orchestrator applies his principles to the rows itself. Those calls are recorded below as the orchestrator's, made
from his words, and are not his rulings.

### 3c. Orchestrator's calls applying Sam's principles (9 Oct)

- **Search boxes:** the component and how it behaves come from the real frontend (accessible autocomplete over a native
  select). List entries come from MDM. How a list reads (labels, order, hint, placeholder) follows the prototype where
  the component can show it. The prototype's search behaviour is never copied; anything beyond the component's options
  (a separate Search button, custom announcements) goes to design as its own blocked increment.
- **Rolling the component out to more screens** is EUDPA-635's work, not DR2.1's. Three country dropdowns it doesn't
  cover (transhipment destination, the animals address country, the INS address book country) go in deferred.md for a
  follow-on ticket. Fields the prototype shows as plain dropdowns stay plain in DR2.1.
- **Commodities (point 2):** the commodity catalogue and commodity search, live and germinal, are blocked on MDM. The
  commodity pages' wording, their place in the journey, the Commodity details questions, the import reason and the
  species grouping go ahead on today's commodity data.
- **Transporters (point 5):** adding, listing and searching transporters, the transporter type question, the add pages,
  the unused register page and the address book's transporter tab are blocked. The transporter step's place in the
  journey, its buttons when amending or editing a template, and the germinal set's copy of today's step go ahead.

## 6. Amend, cancel amendment, copy as new and delete: no pop-ups

"Amend, cancel amendment, copy as new and delete. This section definitely needs JavaScript checks. It feels very
non-GDS to have popups, so I'm leaning towards we won't do this. If there's anything in there that isn't around adding
popups, then maybe that survives. Anything about replacing a page with 'is us, the designer' with 'me personally,
expecting that it'll be'"

The last sentence is as transcribed and unclear. Read as: wherever the prototype replaces a confirmation page with a
pop-up, the page stays. Sam leans towards not doing pop-ups at all, which is a lean and not yet a ruling. So:
- The pop-ups are not built. They stay as one design question (design question 9), with "we won't do this" as the
  expected answer. They are not built unless design makes a strong case.
- Everything in the theme that isn't a pop-up goes ahead: the confirmation pages carry the pop-ups' wording, plus the
  outcomes, the amend status bar, copy as new and delete.

This matches claim 19 of the draft ruling.

## 7. Overview, check answers, the view header, declaration and confirmation: who owns them

Sam: "I think that overview page isn't necessarily owned by a set or a journey. If it is owned by a set or a journey,
then brilliant, we can crack on. We can do what we want, and I kind of hope that is the case. … If it's owned outside of
a journey or outside of a set, then we need to be more mindful of changes we make."

Checked (`overview-ownership/findings-2026-10-09.md`): the overview, review, declaration and confirmation are owned by
the live-animals set, so the theme goes ahead. The orchestrator's calls for the few shared parts, applied from Sam's
principle:
- **Status strip:** the shared strip above the heading is not changed in place. Pages that need a different header turn
  it off and draw their own in the set.
- **Shared wording:** "Copy as new" and "Delete" are reused or given set-owned keys, never reworded in shared copy.
- **New notification statuses** ("Submitted action required", later "Completed"):
  - added only, never changed or removed
  - mapped in the animals frontend before the backend sends them
  - the INS dashboard's links updated in the same branch

### 7a. Match the plants frontend

"Okay, good news on the overview. Check your answers: declaration and confirmation pages each being owned by an
individual set. That doesn't mean we only want to apply this to live animals. Make these consistent as a starting point.
[In plants] as well. It just enables us to have differing designs if that becomes required, but step one should be
consistency. If you're implementing changes here to animals, match it up on plants."

Read as: the overview, check answers, declaration and confirmation pages stay set-owned, but every change made to them
in the animals sets is matched in the plants frontend's high-risk plants set. Being set-owned allows the designs to
differ later; for now they are consistent. The orchestrator's calls, applied from this principle:
- `trade-imports-plants-frontend` joins the programme's repos.
- Each change to these four pages, the status strip and how statuses read gets a plants twin increment in the same
  theme. The twin depends on the animals row, so plants matches what landed.
- **What is mirrored:** structure, wording patterns, components and behaviour.
- **What stays plants' own:** the questions and answers (plants' sections, cards and data).
- A plants twin is dropped where plants already matches, or where the change is animals-only data (species,
  identification, CPH and the like).
- New statuses are mirrored only where plants has the same lifecycle.

### 7b. Plants changes go in the same increment, not twins (replaces the twin reading in 7a)

"On what to do about [plants], it's massive overkill to double the number of increments to see if there's an [plants]
equivalent. A workflow: go through and identify common pages, common behaviour, and where it's required. [Plants] and
animals get that change at the same time. The overhead of adding an increment is relatively expensive, so we don't want
to be needlessly separating things."

No plants twin increments. A workflow finds which rows change pages or behaviour that plants has too. Where the change
is needed there, the same increment changes both frontends at once. Rows with no plants equivalent are left alone.
This applies across the backlog, not only to the overview theme.

### 7c. Plants mapping and the orchestrator's calls on it

`plants-common-mapping-2026-10-09.json` holds the per-row result.
- **32 rows change both frontends in the same increment.** They are mostly:
  - the shared journey behaviour: run ends on review, return to overview, lenient save, amend page endings
  - port order
  - the overview, review, declaration and confirmation
  - amend, cancel, copy and delete
  - two dashboard rows
  - three templates rows
- **The rest** are animals-only data, have no plants equivalent, or already match.

The orchestrator's calls on the 5 unsure rows:
- **Arrival details' own rules:** animals only. Plants gets return-to-overview and lenient save from the shared-behaviour
  rows.
- **Picker "View" links to the INS address book:** animals only. Plants isn't wired to the INS address book.
- **"Completed" status:** decided when it unblocks.
- **The notification list:** stays in each frontend and is reframed in place to the prototype's look, in the new
  animals dashboard theme. Plants' list is reframed in the same increment.
- **Back from the first page to the type question:** animals only. Plants' first page is its own type question.

## 8. INS dashboard is blocked; the animals dashboard matches the prototype instead

"INS front door: overall dashboard, drill-downs and the notification lists. Here, the dashboard stuff is really early.
The INS dashboard requirements are still really early days. That stuff's blocked. We can't be making changes. Something
we could potentially do, maybe as a separate theme, is changes to the animals dashboard, so the animals dashboard looks
more like the animals dashboard on the prototype. That'd be good."

Read as: the INS front door theme (overall dashboard, drill-downs, notification lists) stays in the backlog, blocked
until the INS dashboard's requirements firm up, then that area is re-distilled. A new theme makes the animals frontend's
own dashboard look like the prototype's animals dashboard. Knock-on effects to work through, not settled here:
- Moving the live animals list to the INS frontend (a DR1 judgement, kept by the morning ruling) sits in the blocked
  theme, so the animals dashboard stays where it is.
- The germinal set's list and its category on the event (c-272) lean on that move.
- Rows elsewhere that wait on the INS theme need their dependencies rechecked.

### 8a. What "the dashboard" means, and templates (replaces the broad reading of point 8)

"I block the dashboard, as in the fucking dashboardy bit. Not a button on there to create a template. Do I need to be
that explicit? The dashboard, as in the summary information that you have this many notifications or this many status
changes. That's all massive stuff. Has not been sort of bounced off anyone. 'Create a template' is fucking crud. That's
simple. About template mode, walking through the journey, and this changing that. Guess what? There are going to be
changes again in the future. You can't be fucking implementing something in such a way that it can't handle journey
changes. Mate, this needs to be another way of walking through the same pages, maybe capturing the same data with
different validation. I don't know, but you can't fucking go, 'Right, we're just going to finish development forever,
and then we'll take a coffee.'"

- **Blocked:** only the dashboard's summary information. That means the counts of notifications, the status-change
  cards and the drill-downs from them. The home page's buttons and links ("Create new", "Use template", the type
  question, the Templates item) are not blocked.
- **Templates are CRUD and go ahead.** Template mode is another way of walking through the same journey pages,
  capturing the same data, perhaps with different validation. It is built so that later journey changes carry into it
  without rework. Template rows don't wait for other themes' page changes; they work on whatever the pages are when
  they're built.
- **What Sam wants:** the templates theme split off and built on a second laptop while the rest is still being ruled
  on.

## 9. Order of work, and ready against blocked instead of waves

"Feel like the right order is to do the full redistil, then split off templates. And yeah, after the next distil, this
concept of waves, I don't think it really works. … I basically want to identify what stuff is blocked and cannot be
built yet, based on wider things, and just, 'Oh, this increment uses this increment's land first.' I mean more like the
JavaScript stuff, which is blocked in its entirety, but I need to go and have conversations with design.
Essentially, it's Friday afternoon. I think the template stuff I can kick off building over the weekend. I'm wondering
if there's anything else. I know I want the report to go: 'Here's the stuff that's ready to go versus here's the stuff
that's blocked.'"

- **Order:** the full re-distil runs first, on everything since the last one, the templates ruling included. Then the
  templates theme is split off for the second machine.
- **No waves.** The report and the themes page group work by:
  - **Ready to go:** builds now, with only row-to-row "this lands first" dependencies.
  - **Blocked:** waits on something outside the build, and what it waits on. That means design, MDM commodities, the
    address lookup, transporter requirements, INS dashboard requirements, CDP, PIMS outcomes and the plants read
    model.
- **What else could run this weekend:** after the re-distil, list any other theme that is ready to go and doesn't clash
  with templates.

## 4. Documents theme is fine; the 50 MB limit stays blocked

"Documents page, that stuff seems fine. It seems like it's correctly realised that it can't handle a change to the 50 MB
upload limit, but there's an existing ticket on the backlog, which we'll tackle up."

No change to the documents rows. inc-036 (req-509) stays blocked on the CDP ingress body cap, tracked by the existing
ticket the backlog cites (EUDPA-518).

## 5. Transporter management is blocked pending requirements

"Transporter's thing, where you can add a transporter and all that, is all blocked pending further requirements. We
don't know if that transporter management should be handled by the address book functionality or some different
functionality, and if we're even going to handle the management of those transporters or not. Again, keep all the stuff.
It could be useful for future work, but that's not something we can work on yet."

Read as: the rows stay in the backlog, blocked until it is decided whether transporters are managed at all, and if so
whether by the address book or something else. That area is re-distilled once it is decided. Rows proposed (to confirm
with Sam):
- Blocked, as transporter management: inc-008, inc-037, inc-038, inc-039, inc-040, inc-041, inc-042 (already
  blocked), inc-044, and the address book's transporter rows inc-074, inc-075 and inc-076.
- Kept, as journey flow over today's transporter step: inc-043 (the step's place in the run), inc-170 (its buttons when
  amending or editing a template) and inc-178 (the germinal set's copy of today's step).

## 2. Commodity lists wait on MDM

"for the Wave 2 stuff, the stuff that goes big on commodities and commodity codes, the integration to MDM on that sort of
blocks almost anything in that area. There's work going on where we're going to get those list commodities from MDM,
and then we're going to need to build the thing and structure the thing to behave correctly on that. That can't be done
as part of this factory work. We are not able to do that yet. Almost like the address lookup stuff, I think this needs to
be recognised as work or potential work, but [it] is blocked."

Read as: treat commodity catalogue and commodity search work like address search (claim 34 of the 9 October ruling).
The rows stay in the backlog, blocked until commodities come from MDM, and that area is re-distilled once they do.
Which rows count as "that area" is to be confirmed with Sam. Candidates: inc-012, inc-013, inc-014 and inc-016 (the
catalogue and the search). Possibly also inc-011, inc-046, inc-104 and inc-166.
