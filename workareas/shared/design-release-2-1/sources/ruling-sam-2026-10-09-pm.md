# Ruling: Sam, 9 October 2026 (afternoon)

9 October, after the re-distil, on search boxes (answers-2026-10-09-pm.md point 1):

> Now we need to be really careful here because the prototype isn't accessible. It's not using some GDS stuff. It's
> using prototype thrown up by AI stuff. At least some of the pages, if not all of the pages in the live animal show,
> only use a version of auto complete or search or whatever that has been deemed accessible and meets our requirements.
>
> If it has been, the sort of precedence needs to be a little bit different than prototype always wins. In terms of
> the component being used, it might be the one that's actually in the frontend or frontends. The content of that
> dropdown, if it's a country dropdown, what's in it? That might still need a bit more input, so it isn't as blunt to
> say the frontend is correct on this, but also the prototype isn't necessarily production-grade with its solution.

On the prototype's JavaScript (point 3):

> I think we're hitting a bit of a theme here where the prototype is doing stuff with JavaScript that is not GDS
> compliant.
>
> This isn't stuff that can just be blindly replicated by chucking a tonne of JavaScript in the frontend. The frontend
> skills know this, but we can't have Infront saying, 'Do things like add all this JavaScript stuff for accessibility
> concerns and maintainability concerns.'
> We really try to strictly head here to GDS components as a toolbox, and where that's not available, use other
> government libraries like a Ministry of Justice or a Scottish Government component that has been tested and meets
> accessibility requirements.
> We've got a graceful degradation requirement on this, like any other GDS project, which means you can use things like
> CSS and JavaScript to enhance behaviour, but you need graceful degradation. It needs to be able to work without
> JavaScript, and that means that the way things are done in the prototype may not be possible or even desired in the
> real thing.
> Almost as a pre-step for some of these increments, we need to get answers to that stuff:
> - Is it possible using off-the-shelf GDS?
> - If it isn't, is it using available, off-the-shelf, other complementary components?
> - If it isn't, why is this atypical thing strongly required?
> At that point, we go back to design and say, 'Come on, we don't need this.' Rather than, 'This isn't a startup where
> you can do anything'

On the "ask design" rows (point 3a):

> I think with the ask design rows, they need individual check-ins. If there are functionality changes, that sort of
> purely adding JS stuff, then that needs questioning, and it is blocked on design. I really don't know. Almost both
> implement the no-JS version and have another increment which is blocked waiting on design, and the design block stuff
> its own theme.

On live filtering (point 3b):

> Yeah, that live filtering has to wait on design.

On row lists (point 3b):

> Why come back to me with that shit?

On commodities (point 2):

> for the Wave 2 stuff, the stuff that goes big on commodities and commodity codes, the integration to MDM on that sort
> of blocks almost anything in that area. There's work going on where we're going to get those list commodities from
> MDM, and then we're going to need to build the thing and structure the thing to behave correctly on that. That can't
> be done as part of this factory work. We are not able to do that yet. Almost like the address lookup stuff, I think
> this needs to be recognised as work or potential work, but [it] is blocked.

On documents (point 4):

> Documents page, that stuff seems fine. It seems like it's correctly realised that it can't handle a change to the 50
> MB upload limit, but there's an existing ticket on the backlog, which we'll tackle up.

On transporters (point 5):

> Transporter's thing, where you can add a transporter and all that, is all blocked pending further requirements. We
> don't know if that transporter management should be handled by the address book functionality or some different
> functionality, and if we're even going to handle the management of those transporters or not. Again, keep all the
> stuff. It could be useful for future work, but that's not something we can work on yet.

On amend, cancel amendment, copy as new and delete (point 6; the transcript's last sentence is unclear and nothing
below rests on it):

> Amend, cancel amendment, copy as new and delete. This section definitely needs JavaScript checks. It feels very
> non-GDS to have popups, so I'm leaning towards we won't do this. If there's anything in there that isn't around
> adding popups, then maybe that survives.

On who owns the overview, check answers, declaration and confirmation (point 7):

> I think that overview page isn't necessarily owned by a set or a journey. If it is owned by a set or a journey, then
> brilliant, we can crack on. We can do what we want, and I kind of hope that is the case. … If it's owned outside of
> a journey or outside of a set, then we need to be more mindful of changes we make.

On matching the plants frontend (point 7a):

> Okay, good news on the overview. Check your answers: declaration and confirmation pages each being owned by an
> individual set. That doesn't mean we only want to apply this to live animals. Make these consistent as a starting
> point. [In plants] as well. It just enables us to have differing designs if that becomes required, but step one
> should be consistency. If you're implementing changes here to animals, match it up on plants.

On how plants changes are made (point 7b):

> On what to do about [plants], it's massive overkill to double the number of increments to see if there's an
> [plants] equivalent. A workflow: go through and identify common pages, common behaviour, and where it's required.
> [Plants] and animals get that change at the same time. The overhead of adding an increment is relatively expensive,
> so we don't want to be needlessly separating things.

On the INS front door (points 8 and 8a, ruled on in full in ruling:sam-2026-10-09-templates):

> Something we could potentially do, maybe as a separate theme, is changes to the animals dashboard, so the animals
> dashboard looks more like the animals dashboard on the prototype. That'd be good.
>
> I block the dashboard, as in the fucking dashboardy bit. Not a button on there to create a template. Do I need to be
> that explicit? The dashboard, as in the summary information that you have this many notifications or this many
> status changes. That's all massive stuff. Has not been sort of bounced off anyone.

On the order of work and waves (point 9):

> I know I want the report to go: 'Here's the stuff that's ready to go versus here's the stuff that's blocked.'

Sam said not to bring him lists of row ids to confirm. So the orchestrator has applied his principles to the rows
itself, and its calls are recorded here (answers-2026-10-09-pm.md sections 3c, 7, 7a, 7c and 8). Where a claim is the
orchestrator's application of a principle and not Sam's own ruling, it says "applied by the orchestrator from Sam's
principle (point N)". Where it says "Sam (point N)", his words above make the decision.

ruling:sam-2026-10-09-templates is a separate ruling made the same day. It covers:

- narrowing the dashboard block to the summary information
- the notification lists staying in each frontend
- templates going ahead, and template mode
- the plants calls for the templates theme

This ruling does not restate those claims. It refers to them where it builds on them.

The evidence is:

- search-component/findings-2026-10-09.md: where the accessible autocomplete is in use, read from each repo's
  `origin/main` on 9 October
- js-triage/triage-2026-10-09.md: the per-row triage, the library check and the 12 questions for design
- overview-ownership/findings-2026-10-09.md: who owns the overview, review, declaration and confirmation, and which
  parts are shared
- plants-common-mapping-2026-10-09.json: for each row, whether the plants frontend has the same page or behaviour, and
  the plants work if it does

Design question numbers below are the triage file's numbers. Question 13 is new in this ruling.

## (a) Search boxes: the component against the content

1. Sam (point 1): the prototype's search controls are not production grade and are not accessible. A search box
   uses the component the real frontends already use and have found accessible. The prototype does not win by
   default on how a search box works. Replaces, for search boxes, claim 16 of ruling:sam-2026-10-09, which gives the
   prototype "components" under look and feel. New.
2. Applied by the orchestrator from Sam's principle (points 1 and 3):
   - **Component and behaviour:** a long list is an accessible-autocomplete (alphagov `accessible-autocomplete`,
     wrapped by the `appAccessibleAutocomplete` macro) over a native `govukSelect`. Without JavaScript, the native
     select is the whole control. The autocomplete behaves as the real frontend configures it: EUDPA-635 and the
     openspec REQ-ORIGIN scenario. That covers whether the whole list opens on focus, how the typed text matches,
     how matches are shown, the arrow or icon, and its own screen-reader announcements.
   - **List entries:** they are whatever MDM serves through reference-data (claim 25 of ruling:sam-2026-10-09
     stands).
   - **How the list reads:** labels, option order, hint, placeholder and the field's label follow the prototype
     wherever the component can show them.
   - **Not copied:** the prototype's search mechanics. Anything beyond the component's own options (a separate
     Search button, custom announcements) waits on design as its own increment (claims 8 and 12).

   This replaces c-009's outcome: the hint and placeholder follow the prototype, and opening on focus, the arrow,
   match highlighting and announcements follow the component. It also replaces c-006's clause that the origin
   control matches "the prototype's ... search icon and search behaviour". New.
3. Applied by the orchestrator from Sam's principle (point 1), row by row:
   - **inc-009, built now:** req-015 (no hint) and req-016 (placeholder 'Search for a country') on a labelled
     'Country of origin' autocomplete.
   - **inc-009, waiting on design:** req-018's search icon button (design question 1) and req-020's custom 'Selected
     <country>' announcement (design question 13). The results label and the count use the component's own
     announcements.
   - **inc-009, not copied:** req-017 (no list on focus) and req-019 (contains-matching with bold matches), because
     they are prototype mechanics.
   - **inc-027, built now:** req-295 ('<port name> - <port code>' labels).
   - **inc-027, waiting on design:** req-296 (the Search button, design question 1).
   - **inc-027, not copied:** req-299 (bold matches).
   - The look of the box, such as EUDPA-635's decorative magnifying glass (animals frontend PR #395, AC15), is
     EUDPA-635's.

   Narrows claim 23 of ruling:sam-2026-10-09 for inc-009. The plants half of both rows follows claim 45. New.
4. Applied by the orchestrator from Sam's principle (point 1): rolling the component out to more screens is
   EUDPA-635's work, not this programme's.
   - The three country selects EUDPA-635 does not cover go in deferred.md for a follow-on ticket: the transhipment
     destination country, the animals party address country and the INS address book country.
   - A field the prototype shows as a plain select stays a plain select in this programme. That includes the import
     reason's exit fields (inc-020), the private transporter's country (inc-008, inc-040) and the INS add-address
     Country (inc-078, inc-082).
   - Where EUDPA-635 has already put the component on a field when its row is built, the row's copy (such as
     inc-020's 'Select one') follows the prototype as far as the component can show it.
   - inc-089's country search may use the component over a native select (claim 16).

   New.

## (b) The JavaScript rule

5. Sam (point 3): a behaviour the prototype gives with JavaScript is built only if it passes these tests, in this
   order:
   - GOV.UK Frontend's components and patterns are used first.
   - Where they have nothing, another tested government library is used, such as the Ministry of Justice's,
     HMRC's or the Scottish Government's.
   - Where neither has anything, the behaviour goes back to design, which must say why it is strongly needed.

   No increment tells a builder to write custom JavaScript to copy the prototype. Replaces c-190's reasoning that
   keeping to GOV.UK components is "house practice, not one of the ruling's overrides". New.
6. Sam (point 3): every page works fully without JavaScript. CSS and JavaScript may only enhance a page that already
   works (graceful degradation). Every state change is a form post, every search and filter a form with a button that
   submits it, and nothing a trader needs is shown only by script. Extends c-006's accessibility and no-JavaScript
   override from "where DR2.1 falls short" to every page. New.
7. Applied by the orchestrator from Sam's principle (point 3), from the triage's library check:
   - **Accepted:** accessible-autocomplete (claim 2), and the Ministry of Justice date picker and sub navigation
     from `@ministryofjustice/frontend`.
   - **Where the MoJ package is installed:** it is already in trade-imports-animals-frontend (11.1.0).
     trade-imports-ins-frontend adds it, at the same major version, for inc-067's category tabs. inc-135 and inc-137
     now build on the animals frontend's own list (claim 54), which already has the package. Where the plants
     frontend mirrors a row that uses an MoJ component (claim 55), plants adds the package at the same major version.
   - **Not accepted:** MoJ's Modal dialog and Copy button. Both are Experimental and not in 11.1.0. The modal
     documents no fallback without JavaScript, and the copy button is hidden without it.
   - Any other component needs design's case under claim 5.

   New.

## (c) Rows that ask design: built now without JavaScript, with the JavaScript part waiting on design

8. Sam (point 3a): every row the triage marks "ask design" splits in two.
   - The version that works without JavaScript is built now, in the row's own theme.
   - The JavaScript-only addition becomes its own increment, blocked until design answers. That is one increment
     per design question, each checked in with design on its own.
   - Every design-blocked increment sits in one new theme, `waiting-on-design`, titled "Waiting on design:
     JavaScript-only behaviour from the prototype". Each increment depends on the rows whose no-JavaScript version
     it builds on. When design answers, the increment is built as design says, or dropped if design drops the
     behaviour.
   - Where a row has no new part without JavaScript (today's page already works without it), the whole row moves to
     `waiting-on-design`.
   - Where a row is already blocked for another reason, its design increment stays blocked on that too.
   - Where a design increment's row also changes the plants frontend (claim 43), the design increment changes
     plants too.

   Claims 9 to 22 apply this to the rows; the row choices are the orchestrator's, applied from Sam's principle
   (point 3a). New.
9. Sam (point 3b): live filtering waits on design. Filtering as the trader types is not built in this programme
   until design answers question 5. Search on the Search button or Enter is built now. This replaces the following,
   on the point of live filtering only:
   - claim 22 of ruling:sam-2026-10-09, which kept inc-067 to inc-069's filters with c-169's live behaviour on top
     (the server-side filters still stand)
   - DR1's c-094, which judged a live filter on the party pickers (the one page per role and the server search behind
     a submitting button still stand)
   - c-169's outcome where it says the page re-requests the list as the user types

   New.
10. Design question 1, search buttons. Applied by the orchestrator from Sam's principle (point 3a).
    - **Built now:** inc-009 and inc-027, as claim 3 sets out.
    - **Waits:** the separate 'Search' button beside the country of origin, port of entry and transit country boxes
      (req-018, req-296). It becomes one `waiting-on-design` increment. New.
11. Design question 2, region code. Applied by the orchestrator from Sam's principle (point 3a).
    - **Built now:** inc-010 without req-040 and req-041. The country prefix is added on the server after saving, as
      DR1 shipped it, and req-1743 stands.
    - **Waits:** the live prefix that changes as a country is picked, and the empty prefix slot before one is picked
      (req-040, req-041). New.
12. Design question 13 (new): custom announcements on the country search. Applied by the orchestrator from Sam's
    principle (points 1 and 3a).
    - **Built now:** inc-009 with the component's own result and selection announcements.
    - **Waits:** req-020's custom wording ('Country search results', 'Selected <country>').
    - The question for design: can the component's own announcements stand? New.
13. Design question 3, commodity search as you type. Applied by the orchestrator from Sam's principle (point 3a).
    - **Built now:** nothing new. The page without JavaScript is today's server-side search with its Search button,
      so all of inc-014 moves to `waiting-on-design` as this question's increment (req-072's JavaScript half,
      req-073, req-074), with the germinal set's copy of that behaviour (inc-016 follows inc-014).
    - **Also blocked:** on commodities coming from MDM (claims 28 and 29).
    - Replaces c-012's outcome that "the prototype wins" on live results, and the inc-014 clause of claim 22 of
      ruling:sam-2026-10-09. New.
14. Design question 4, transit countries. Applied by the orchestrator from Sam's principle (point 3a).
    - **Built now:** nothing new. Without JavaScript the page keeps today's native select, the 'Add country' button
      and the Remove buttons that submit the form, so all of inc-030 moves to `waiting-on-design`.
    - **Waits:** adding a country the moment it is picked (req-348), removing one without a page load (req-349),
      and the 'Added' and 'Removed' announcement wording (req-353, req-354). Today's announcements on main stay as
      they are.
    - Replaces c-006's clause that with JavaScript the transit page follows Design Release 2.1. New.
15. Design question 5, live filtering (claim 9). Applied by the orchestrator from Sam's principle (point 3b). The
    question goes to the product owner as well as design.
    - **Built now, inc-069:** search across the whole row (req-1119), 8 a page (req-1141), page number handling
      (req-1144), the stub that behaves like the real list (req-1185) and the end-to-end walk (req-1188). The filter is
      a GET form that the Search button or Enter submits (req-1121 and req-1122 without their JavaScript halves).
    - **Built now, inc-087:** role-filtered pickers, one page per role, no pagination and no 'Selected address' inset
      (req-594, req-595, req-608 to req-613). Search is the server search behind a submitting search button.
    - **Waits:** one `waiting-on-design` increment. It holds the address book list re-requesting as the trader types
      or changes Type (the JavaScript halves of req-1121 and req-1122), and the party pickers' live row filter
      (req-592) in both animals sets and in plants (inc-181 follows inc-087; claim 46).
    - **The transporter list's in-page filter** (req-389's JavaScript half, inc-037) is not lifted out. inc-037 is
      blocked with transporter management (claim 35), and question 5's answer is applied when that area is
      re-distilled. Replaces c-006's transporters clause on the filter.

    New.
16. Design question 6, place of origin picker. Applied by the orchestrator from Sam's principle (point 3a).
    - **Built now:** inc-089's label, hint and placeholder (req-621 to req-623). Its country search is an
      autocomplete over a native select, or a plain select, with a button that submits the chosen country so the
      server narrows the rows (req-624's half that works without JavaScript).
    - **Waits:** the rows filtering as the trader types (req-624's JavaScript half), for both sets (inc-181 follows
      inc-089). New.
17. Design question 7, CPH number. Applied by the orchestrator from Sam's principle (point 3a).
    - **Built now:** nothing new. The CPH page works as today, with the server's checks, so all of inc-093 moves to
      `waiting-on-design`.
    - **Waits:** dropping non-digits as they are typed (req-711), spreading a pasted number across the boxes
      (req-712), and design's answer on whether one box taking '12/345/6789' replaces the three.
    - Replaces c-006's clause "build the digit filtering and paste spreading". New.
18. Design question 8, copy buttons. Applied by the orchestrator from Sam's principle (point 3a).
    - **Built now:** inc-112 with Amend, Copy as new and Delete (req-895 to req-897), and the 'Import reference
      numbers' section with the reference and customs document code as selectable text (req-898 without its Copy
      buttons).
    - **Waits:** the Copy buttons. MoJ's Copy button is not accepted (claim 7). New.
19. Design question 9, amend and cancel confirmations: no pop-ups. Sam (point 6): the pop-ups are not built, and
    anything in the area that is not a pop-up survives. Sam's "leaning towards we won't do this" is a lean, not yet a
    ruling. Applied by the orchestrator from Sam's principle (points 3a and 6):
    - **Built now:** the confirmation stays a separate page at today's route. It carries the pop-up's wording as page
      content:
      - inc-120: 'Amend notification', 'Are you sure you want to change this notification?', 'Yes, continue', and
        'No, go back' returning to the view page
      - inc-121: 'Are you sure you want to cancel this amendment?', no explanatory paragraph, and 'Go back' (req-1410,
        req-1411, req-1413 on the page)
    - **Still built:** every outcome these rows describe (req-1394, req-1416, req-1417, req-1487, req-1877), and
      inc-122's Amend status bar, whose 'Cancel amend' goes to the cancel confirmation page (req-782, req-1397,
      req-1398). Copy as new (inc-123, inc-124) and delete (inc-125) go ahead unchanged by this claim.
    - **Waits, as one `waiting-on-design` increment:** the pop-ups themselves (req-1391's dialog, req-1392's closing,
      req-1393, and req-1414's dialog half), for both animals sets and plants (inc-185 follows inc-120 and inc-121).
      The expected answer is "we won't do this". The increment is built only if design makes a strong case, and is
      otherwise dropped. MoJ's Modal dialog is not accepted (claim 7).
    - Replaces c-190's outcome "build the dialogs as drawn"; c-189 stands. New.
20. Design question 10, address search. Applied by the orchestrator from Sam's principle (point 3a).
    - **Waits, as one `waiting-on-design` increment:** inc-042's address and contact fields hidden behind the search
      and an 'Enter address manually' button (req-458's JavaScript half). inc-072's search-only layout that reveals
      the fields (req-1214, req-1217's hide and reveal, req-1864).
    - **Stays blocked as it is:** the rest of both rows, until the address lookup is a real feature (claim 34 of
      ruling:sam-2026-10-09 stands). The design increment is blocked on that too. inc-042 is also blocked on
      transporter management (claim 35).
    - The question for design: can address search use the GOV.UK address pattern, with the fields always visible?
      New.
21. Design question 11, templates sort. Applied by the orchestrator from Sam's principle (point 3a).
    - **Built now:** nothing new. Manage templates is built with no 'Sort by' control, because a control that does
      nothing is not shipped. All of inc-162 (req-1299) moves to `waiting-on-design`.
    - **Waits:** the sort control, built as design answers. It is either a GET form whose button really sorts, with
      options design names (an 'Arrival date' sort has no meaning for templates), or nothing, in which case the
      increment is dropped.
    - Replaces c-185's inert select. Consistent with ruling:sam-2026-10-09-templates, which lets templates go ahead.
      New.
22. Design question 12, germinal dates. Applied by the orchestrator from Sam's principle (point 3a).
    - **Built now:** inc-053's single text input for each germinal date, with the hint 'For example, 27/03/2026', and
      V4's date and length checks (req-252, req-254 to req-260, req-1797).
    - **Waits:** the 'Choose date' calendar (req-253, the MoJ date picker). MoJ advises against its date picker for
      dates a user reads from a document.
    - The question for design: will a plain date field or the GOV.UK date input do instead of a calendar? New.

## (d) Rows built with GOV.UK or MoJ, or kept as today

23. Applied by the orchestrator from Sam's principle (point 3), from the triage. Banners stay on screen:
    - **inc-126:** its deletion success banner.
    - **inc-140, inc-157 and inc-159:** each success banner is a GOV.UK notification banner that stays until the
      trader leaves or reloads the page.
    - **Why:** WCAG 2.2.1 rules out a message that leaves on a timer.
    - **What this confirms:** c-271's outcome and c-006's banner clause. inc-126 is kept as today on this point.

    New.
24. Applied by the orchestrator from Sam's principle (point 3): inc-063 is built with GOV.UK Frontend.
    - The 'Filter addresses' disclosure is a GOV.UK details component.
    - The search is a GET form with a submit button, which may be icon-only with the accessible name 'Search'
      (req-1118).
    - The success banner stays (req-1147). The INS frontend's `address-book-success-banner.js`, which hides it, is
      removed. New.
25. Applied by the orchestrator from Sam's principle (point 3): inc-136 is one GET form with a submit button that
    searches and sorts on the server. The icon-only button is a real submit button, and changing a select submits
    nothing by itself. c-157, c-161 and c-162 stand. inc-133's form follows the same rule if that row is unblocked
    (it is blocked by claim 52). New.
26. Applied by the orchestrator from Sam's principle (point 3): MoJ sub navigation is used where pages change by link.
    - **inc-067:** category tabs, each a link that loads the page. The INS frontend adds the MoJ package (claim 7).
      inc-067's Transporter tab waits with transporter management (claim 36).
    - **inc-135:** 'In progress', 'Draft' and 'Completed' tabs on the animals frontend's own list (claim 54).

    New.
27. Applied by the orchestrator from Sam's principle (point 3): inc-137's 'Additional filters' are built inside the
    one GET form, from GOV.UK details, radios and a select, with an MoJ date picker on each end of the date range. The
    date range is a search filter, not a date read from a document, so design question 12 does not apply. c-166's
    checks stand. New.

## (e) Commodities wait on MDM

28. Sam (point 2): commodity catalogue and commodity search work is blocked until commodities come from MDM.
    - Until then, that area is recorded as work but not built in this programme. Once commodities come from MDM, the
      area is re-distilled.
    - Treated like address search (claim 34 of ruling:sam-2026-10-09).
    - Narrows claim 25 of ruling:sam-2026-10-09, "No reference list waits on MDM integration", which stands for
      countries and ports. New.
29. Applied by the orchestrator from Sam's principle (point 2), these rows are blocked:
    - **inc-012:** the live-animal catalogue (req-094 to req-101, req-112). Its req-1754 moves (claim 31).
    - **inc-013:** the search results and the selected panel (req-075, req-076, req-080, req-081). Its req-085 (the
      'Select a commodity' error on the search field), req-088 (Save and return to overview without checks) and
      req-102 (clearing the unweaned answer) are not catalogue or search work. They move to inc-011 and go ahead.
    - **inc-014:** search as you type, also waiting on design (claim 13).
    - **inc-016:** V4's germinal catalogue (req-093, req-1782, req-1783, and c-230's question).

    New.
30. Applied by the orchestrator from Sam's principle (point 2), the rest of the commodities area goes ahead on today's
    commodity data:
    - **Pages and journey:** the commodity pages' wording (inc-011) and their place in the journey (inc-015, inc-166).
    - **Questions and reason:** the Commodity details questions (inc-018), the main import reason and additional
      details (inc-020 to inc-022).
    - **Species grouping:** inc-046, inc-104.
    - **Dependencies dropped:** inc-046, inc-054 and inc-091 no longer depend on inc-012, and are built for the
      commodities today's catalogue holds. inc-054 covers cats and dogs now and ferrets once the catalogue holds them.

    New.
31. Applied by the orchestrator from Sam's principle (point 2), and claim 4 of ruling:sam-2026-10-09, inc-016 is
    split so the germinal set is not blocked.
    - **Goes ahead:** the germinal set's copy of today's commodity page, with the germinal hint (req-069), offers the
      12 germinal lines today's catalogue holds. The live-animals catalogue gives them up (req-092, req-1754, moved
      from inc-012). Splitting today's lines between the sets is set architecture, not list content.
    - **Waits:** V4's 18-item catalogue (claim 29).
    - **Dependencies:** inc-017, inc-024 and inc-052 depend on the part that goes ahead.

    New.
32. Applied by the orchestrator from Sam's principle (point 2): inc-019 waits with the catalogue. It proves a poultry
    journey, and poultry is only in the new catalogue.
    - inc-023 (the unweaned question for pigs) waits with the catalogue.
    - inc-051 (ear tags for pigs, sheep and goats) waits with the catalogue.
    - None of their commodities is in today's five-commodity catalogue. New.
33. Applied by the orchestrator from Sam's principle (point 2): until the MDM catalogue separates embryos from ova,
    today's lines carry interim typeCodes. Sam has not objected to this default.
    - Semen lines carry SEMEN.
    - Today's combined 'Embryos/Ova' lines carry EMBRYO by default.
    - Claim 7 of ruling:sam-2026-10-09 (EMBRYO and OVA as separate items) applies once the catalogue is
      re-distilled. New.

## (f) Transporter management waits on requirements

34. Sam (point 5): transporter management is blocked pending requirements. That covers adding transporters, and
    listing and searching them.
    - It is not decided whether the service manages transporters at all, or, if it does, whether the address book or
      something else does.
    - The rows stay in the backlog, blocked. Once it is decided, that area is re-distilled. New.
35. Applied by the orchestrator from Sam's principle (point 5), these rows are blocked:
    - **The list:** inc-037 (listing and searching transporters, req-386 to req-399, req-470).
    - **Type and add pages:** inc-038 (the type question), inc-039, inc-040 and inc-041 (the add pages and what
      follows a save).
    - **The private transporter's country:** inc-008 (req-432). Replaces claim 28 of ruling:sam-2026-10-09 for
      inc-008; inc-082 is unchanged.
    - **The commercial transporter's address search:** inc-042, already blocked by claim 34 of ruling:sam-2026-10-09.
    - **The unused register page:** inc-044 (req-472). Replaces the inc-044 clause of claim 22 of
      ruling:sam-2026-10-09.
    - **The address book's transporter rows:** inc-074, inc-075 and inc-076 (req-394, req-461 to req-463, req-1135,
      req-1203 to req-1206). Replaces their clause in claim 21 of ruling:sam-2026-10-09.

    These rows are also taken out of claim 23 of ruling:sam-2026-10-09's "unchanged" list. New.
36. Applied by the orchestrator from Sam's principle (point 5): the address book's Transporter tab waits.
    - inc-067 builds three category tabs. The 'Transporter' tab and its columns (req-1123's Transporter tab,
      req-1135) wait with inc-075.
    - inc-061's type choice leaves out Transporter until inc-074 is unblocked.
    - inc-083 no longer depends on inc-075, and its Welsh for the Transporter tab waits with it. New.
37. Applied by the orchestrator from Sam's principle (point 5), these go ahead over today's transporter step:
    - **inc-043:** the step's place in the journey.
    - **inc-170:** its buttons when amending or editing a template.
    - **inc-178:** the germinal set's copy of today's transporter list, type page and add forms. The copy leaves out
      the unused register page.
    - **Dependencies dropped:** these rows no longer depend on inc-037 to inc-041 or inc-044.

    New.

## (g) Documents

38. Sam (point 4): the documents theme stands as distilled (inc-031 to inc-035). inc-036 (req-509, files up to 50 MB)
    stays blocked on the CDP ingress body cap, tracked by EUDPA-518. New.

## (h) Who owns the overview, check answers, declaration and confirmation

39. Sam (point 7): the overview-and-review theme goes ahead, because its four pages are owned by a set. The overview
    (`hub/`), check answers and review (`check-answers/`), declaration and confirmation each sit in the live-animals
    set's own feature folders. The germinal set copies them (claim 1 of ruling:sam-2026-10-09), and the plants set
    has its own (claim 43). The theme's rows change these pages freely inside the set. New.
40. Applied by the orchestrator from Sam's principle (point 7): the shared status strip above the heading
    (`shared/layout.njk`, `shared/kit.js`) is not changed in place.
    - A page that needs a different header switches the strip off (`journeyStrip: null`) and draws its own header in
      the set's template.
    - This covers the submitted view header (inc-111), the draft view header (inc-187) and the declaration with no
      strip (inc-114). Not-found stays caught in the controller.
    - **The one exception is inc-122:** the Amend bar with 'Cancel amend' on every page during an amendment. Every set
      that amends needs it (live animals, germinal products and plants), so inc-122 changes the shared strip itself.
      It adds the Cancel amend control for status AMEND, and changes 'Amending' to 'Amend' in every set at once.

    New.
41. Applied by the orchestrator from Sam's principle (point 7): the shared wording in `shared/copy.en.js`
    (`notificationActions`), which the notification list also uses, is never reworded in place.
    - inc-110 (review end buttons) and inc-112 (view header actions) reuse "Copy as new" and "Delete" as they read
      today, or add keys in the feature's own copy where the wording differs.
    - A set-specific string goes in the feature's own copy. New.
42. Applied by the orchestrator from Sam's principle (point 7): new notification statuses are added only, never changed
    or removed. This covers "Submitted action required" (inc-113) and, once unblocked, "Completed" (inc-116).
    - Each status is mapped in the animals frontend (`engine/persistence/records.js`, `real/status.js`, the stub, the
      strip's status copy) before the animals backend sends it, because the frontend throws on a status it does not
      know.
    - The INS dashboard's links (`features/dashboard/view-model/list.js`, which sends only SUBMITTED to the review)
      are updated in the same branch. The animals backend, animals frontend and INS frontend share one branch name.
    - A new status is mirrored in plants only where plants has the same lifecycle. "Submitted action required" rests
      on the ITAHC and is animals only.

    New.

## (i) Plants changes in the same increment

43. Sam (points 7a and 7b): where a row changes a page or behaviour the plants frontend also has, the same increment
    changes both frontends at once.
    - There are no plants twin increments. This replaces the twin reading in answers point 7a.
    - Rows with no plants equivalent leave plants alone.
    - The aim is consistency as a starting point. Each set still owns its pages, so the designs can differ later.
    - This applies across the whole backlog, not only the overview theme.

    New.
44. Applied by the orchestrator from Sam's principle (points 7a and 7b):
    - **Repos:** `trade-imports-plants-frontend` joins the programme's repos as `plantsfrontend`.
    - **What is mirrored:** structure, wording patterns, components and behaviour.
    - **What plants keeps:** its own questions, answers, sections, cards, step order and data.
    - **Plants already matches:** 4 rows (plants-common-mapping-2026-10-09.json); the mirror adds nothing there.
    - **Animals only:** animals-only data such as species, identification, CPH, ITAHC and transit is never mirrored.
    - **Evidence:** the mapping file marks 30 rows "change-both". 27 are listed in claims 45 to 48 and claim 50. The
      other 3 (inc-148, inc-152, inc-171) are the templates theme's, which claim 7 of
      ruling:sam-2026-10-09-templates covers.
    - **Where a row is split by this ruling:** plants gets the half that is built now. The waiting half's increment
      changes plants when it is built.

    New.
45. Applied by the orchestrator from Sam's principle (point 7b), journey-foundation, reference-lists, origin and
    arrival rows that also change plants:
    - **inc-001, the run ends on the review page.** Plants: after its last step, the opening run goes to the review
      page even when incomplete, and the review names what is outstanding. Plants keeps its own step order.
    - **inc-002, a page opened from the overview returns there.** Plants: kit.nextTarget's fallback returns to the
      overview. Plants' multi-page task rows still move within their own row.
    - **inc-003, 'Save and return to overview' saves without required checks.** Plants: the same on its pages with
      exit=hub; malformed answers are still refused. This overlaps EUDPA-667's mandatory-to-submit work.
    - **inc-004, page endings while amending.** Plants: its save actions get the same three amend controls, its
      pickers the same two buttons, and its amend review holds Continue without an error summary.
    - **inc-007, port order.** Plants: its captured ports fixture is recaptured in the new order. Plants has no port of
      exit.
    - **inc-173, the stub tidy-up.** Plants: its capture script is rerun against the tidied stub, and plants specs that
      pin old names or counts are fixed.
    - **inc-009, the country of origin search box.** Plants: its 'Country of origin' control takes the same built-now
      half as animals (claim 3), with no hint and the 'Search for a country' placeholder. The design increments for
      questions 1 and 13 change plants when built. Plants keeps its own list, guidance and errors.
    - **inc-026, arrival details wording.** Plants: arrival labels move to medium, and the place of landing hint
      follows the same pattern.
    - **inc-027, port labels.** Plants: its port labels read 'Name - CODE'. Its Search button waits with design
      question 1, and bold matches are not copied (claim 3).

    New.
46. Applied by the orchestrator from Sam's principle (point 7b), consignment-parties rows that also change plants:
    - **inc-085, 'Consignor or exporter' becomes 'Consignor'.** Plants: the consignor picker's heading, title and
      check-answers label, in English and Welsh.
    - **inc-086, picker layout.** Plants: the consignor, place of destination and contact pickers get the same search
      control, heading, results count, fieldset and address lines, and a blank save no longer raises an error on
      consignor and destination.
    - **inc-087, role-filtered pickers on one page.** Plants: its address-book service asks for one role and gets an
      unpaginated list. Untyped records still show everywhere. Pagination and the 'Selected address' inset go. The
      live filter waits with design question 5 (claim 15).
    - **inc-094, contact address intro.** Plants: the contact picker takes the new intro and the 'Select an address'
      heading.

    New.
47. Applied by the orchestrator from Sam's principle (point 7b), overview-and-review rows that also change plants:
    - **inc-098, regions on the overview.** Plants: each task group and the task list sit in a region named by its
      caption.
    - **inc-109, party cards.** Plants: the cards drop telephone and email and read the address back line by line.
    - **inc-110, review end buttons.** Plants: Delete beside Continue on a draft, 'Cancel amend' as a button during
      an amendment, and no error summary on opening. The heading that changes once answers differ is left out of
      plants, because plants' backend does not yet send that signal (claim 51).
    - **inc-111, submitted view header.** Plants: the reference as the heading with its status tag, the reference
      as page title, 'Date submitted', and a Back link to plants' own list (claim 57).
    - **inc-112, view header actions.** Plants: Amend and Delete, and the 'Import reference numbers' section with
      the reference as selectable text. Copy as new is left out, because plants has parked it. The Copy buttons wait
      with design question 8. Plants' customs document code row is added only once plants' own code is confirmed
      (C640 is the animals code).
    - **inc-114, declaration.** Plants: a small checkbox in a fieldset with a hidden legend, and no status strip.
    - **inc-115, confirmation.** Plants: a notification not yet submitted goes to the declaration, and the return link
      goes to plants' own list (claim 57).
    - **inc-187, draft view header.** Plants: the same header with a Draft tag and 'Date created', keeping its Change
      links and Continue. Copy as new is left out.

    New.
48. Applied by the orchestrator from Sam's principle (points 6 and 7b), manage-notifications rows that also change
    plants:
    - **inc-120, amend lands on the review.** Plants: the landing moves to plants' review page, behind a confirmation
      page with no pop-up (claim 19). A refused amend goes to plants' own list.
    - **inc-121, cancel amendment.** Plants: the same copy on its confirmation page, no success banner after
      cancelling, ?cancelled=1 kept, and the guard redirect.
    - **inc-122, the Amend bar.** Plants picks it up from the shared strip change (claim 40).
    - **inc-125, the delete page.** Plants: the same summary-list layout, wording and buttons, filled with plants' own
      commodity, origin and quantity, and Back and 'No, cancel' go to the view page.

    New.
49. Applied by the orchestrator from Sam's principle (point 7c), on the 5 rows the mapping could not settle:
    - **inc-028, arrival details' own rules:** animals only. Plants gets return to the overview and the lenient save
      from inc-002 and inc-003.
    - **inc-090, picker 'View' links to the INS address book:** animals only. Plants is not wired to the INS address
      book.
    - **inc-116, the 'Completed' status:** stays blocked. Whether plants follows is decided when it unblocks.
    - **inc-129, the notification list:** reframed in place in each frontend, plants in the same increment (claim 54;
      claim 3 of ruling:sam-2026-10-09-templates).
    - **inc-150, Back from the first page to the type question:** animals only, as claim 7 of
      ruling:sam-2026-10-09-templates already says.

    New.
50. Applied by the orchestrator from Sam's principle (point 7b), list rows that also change plants: inc-126 and
    inc-140 move to the `animals-dashboard` theme (claim 54).
    - **inc-126:** plants' ?deleted=1 banner reads 'Notification has been deleted'.
    - **inc-140:** that banner is titled 'Success'.

    New.
51. Applied by the orchestrator from Sam's principle (point 7b): a plants change that needs
    `trade-imports-plants-backend`, which is not one of the programme's repos, is left out of the increment.
    - It is recorded in deferred.md, so plants follows later.
    - Today this covers inc-110's heading for changed answers, and the plants list's search, sort and filters (claim
      55).

    New.

## (j) The INS dashboard and the animals frontend's own dashboard

52. Applied by the orchestrator from Sam's principle (points 8 and 8a; claim 1 of ruling:sam-2026-10-09-templates):
    these ins-dashboard rows are the dashboard's summary information. They are blocked until the INS dashboard's
    requirements firm up, then re-distilled.
    - **The overall home:** inc-128 replaces the INS table with sections per category. Those sections hold the glance
      cards and link to INS lists this programme no longer builds.
    - **The Action needed drill-down and its search and sort:** inc-132, inc-133.
    - **Glance cards:** inc-134 (Live animals' Action needed card) and inc-139 (the list's Summary cards).
    - **The germinal section on the home:** inc-145.
    - **Already blocked:** inc-142 (authorities' outcomes), inc-143 (status updates), inc-144 (inspection required)
      and inc-146 (plants' glance cards), which now also wait on the INS dashboard's requirements.
    - **Home controls go ahead:** a row that needs only the INS home's controls (Create new, Use template, the type
      question) depends on today's INS home, as claim 2 of ruling:sam-2026-10-09-templates says.

    New.
53. Applied by the orchestrator from Sam's principle (point 8a): inc-127 (INS page titles in the GOV.UK pattern) is
    not summary information and goes ahead. It is the one ready row left in the `ins-dashboard` theme. New.
54. Applied by the orchestrator from Sam's principle (point 8): a new theme, `animals-dashboard`, "The animals
    frontend's own notification list, reframed to the prototype's animals dashboard". It reframes the live-animals
    set's own list in place, and plants' own list in the same increments. These rows move into it, rewritten to build
    on the animals frontend and animals backend instead of the INS frontend and INS read model:
    - **inc-129, the list's frame:**
      - the 'Dashboard' title and caption, and the 'Live animals' heading
      - 'Create new' starting a notification, and 'Use template'
      - the 'Notifications' heading, and cards named for screen readers
      - the list stays at the live-animals set root, and the k6 suite's list request does not move
    - **inc-130:** the card facts and status styles, from the animals backend's record.
    - **inc-131:** Action required on a card, from the status inc-113 records.
    - **inc-135, inc-136, inc-137 and inc-138:** the tabs, search and sort, additional filters, and paging 8 at a
      time.
    - **inc-126 and inc-140:** where a delete lands, and the banner.
    - **inc-147:** the outstanding items, with 'Information is missing' on the card.

    The INS read model's part of these rows is dropped. Replaces the INS frontend, INS backend and INS read model
    parts of inc-129 to inc-131 and inc-135 to inc-138, and c-149's "carried into the INS read model". New.
55. Applied by the orchestrator from Sam's principle (point 7b), on plants' list in `animals-dashboard`: plants' own
    list is reframed in the same increments. It takes the same frame, the same card layout with plants' own facts,
    the tabs, the paging, the delete message and the banner.
    - Search, sort and filters need `trade-imports-plants-backend` to query plants notifications, so they wait under
      claim 51.
    - Plants' card facts come from what plants' list already formats.

    New.
56. Applied by the orchestrator from Sam's principle (point 8): inc-133's search and sort stay with the blocked
    Action needed drill-down (claim 52). Nothing in `animals-dashboard` depends on a blocked summary row. inc-130 no
    longer depends on inc-132, and inc-132 no longer gates inc-131. New.
57. Applied by the orchestrator from Sam's principle (point 8), and claim 3 of ruling:sam-2026-10-09-templates: every
    page that Design Release 2.1 sends to "the overall dashboard" goes to the set's own notification list. That covers:
    - the view's Back link
    - the confirmation's 'Return to your dashboard'
    - where a delete lands
    - where a refused amend, copy or cancel goes

    This is the morning ruling's "wherever the list lives" (claim 21 of ruling:sam-2026-10-09, req-972, req-987). The
    INS front door is reached through the service navigation as today. Replaces c-143's outcome, the INS landing in
    c-198 and inc-126, and req-1417 and req-1487's "overall dashboard". New.
58. Applied by the orchestrator from Sam's principle (point 8), on the germinal set's list: with the list staying in
    the animals frontend, each set's root renders its own list. This replaces claim 6 of ruling:sam-2026-10-09's "each
    set's root redirects to its INS list".
    - **inc-141:** becomes the germinal set's own copy of the reframed live-animals list, at the germinal set root,
      whose 'Create new' starts a germinal notification. It moves to the `germinal-products` theme and depends on the
      `animals-dashboard` rows it copies.
    - **inc-172:** the germinal cards, built on that copy from the animals backend's record (category, species,
      product type and packages). It moves to `germinal-products` too.
    - **inc-176:** depends on inc-129's reframed list instead of the INS list (inc-141's old form) and inc-130.
    - **inc-184:** depends on the new inc-141 and inc-172.
    - **The INS germinal list's 'Create new' and the INS home's germinal section:** they leave this programme with
      the INS home (claim 52). The type question's Germinal option stays the way in (claims 10 and 11 of
      ruling:sam-2026-10-09, as narrowed).

    New.
59. Applied by the orchestrator from Sam's principle (point 8): c-272 is not needed in this programme. c-272 put the
    notification's category on the outbox event envelope, with an optional property in trade-imports-schemas, for the
    INS backend to read.
    - **Why:** every reader of the category in the INS read model is now blocked (inc-128, inc-134, inc-139, inc-145)
      or moved to the animals frontend, which reads the category from the animals backend's own record (claim 6 of
      ruling:sam-2026-10-09).
    - **What changes:** the category is stored on the notification record, and is not published. trade-imports-schemas
      does not change in this programme. This replaces c-272's outcome and claim 6 of ruling:sam-2026-10-09's
      "published on the notification event the INS backend reads".
    - **Known gap:** until the INS dashboard is re-distilled, today's INS table lists germinal notifications without
      their category.
    - **What happens later:** c-272 is reopened when the INS dashboard area is re-distilled.

    New.

## (k) Ready against blocked

60. Sam (point 9): the backlog's report and themes page group work as ready to go or blocked, not by waves.
    - **Ready to go:** builds now, with only row-to-row "this lands first" dependencies.
    - **Blocked:** names what each row waits on. That means design, MDM commodities, the address lookup, transporter
      requirements, INS dashboard requirements, CDP, PIMS outcomes or the plants read model.

    New.
