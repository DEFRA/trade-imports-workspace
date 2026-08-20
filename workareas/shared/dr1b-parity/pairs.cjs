/**
 * Which frontend screen answers which Design Release 1 screen.
 *
 * Corpus `dr1b`, run EUDPA-328-DR1B. The implementation side is the DEFRA
 * live-animals import notification frontend (`fe-`, 40 screens, app sha
 * 76a864ba). The requirements side is Design Release 1 of the GOV.UK
 * prototype (`dr1-`, 42 screens, app sha 491b3926) — the root mount of
 * GB-notification-service, `app/views/x.html`, never the design-release-2.1
 * subtree. DR1 is the signed-off definition; the frontend is on trial.
 *
 * Written from the captured evidence alone: the two manifests under
 * `evidence/`, and for every one of the 82 screens the page model, the
 * rendered DOM and the full-page screenshot, all from a single page visit.
 * Where the evidence could not settle a question — whether a rule exists at
 * all on the other side, as opposed to whether it was photographed — the
 * source was read: `src/server/app/sets/live-animals/` on the frontend,
 * `app/views/` and `app/routes.js` on the prototype.
 *
 * ---------------------------------------------------------------------------
 * The judgement calls, and what settled each
 * ---------------------------------------------------------------------------
 *
 * 1. DR1 asks five address questions through one view; the frontend gives
 *    each its own page.
 *
 *    `app/views/consignment-address-select.html` is rendered for five section
 *    ids — `CONSIGNMENT_SECTION_TYPE_ALIASES` in routes.js names them:
 *    place-of-origin, consignor-or-exporter, consignee, importer,
 *    place-of-destination. The heading and the filtered address list change
 *    per role; the view does not. The capture was taken at `/place-of-origin`,
 *    so that pair leads the block. The other four rows read for the question,
 *    not for the picture's heading.
 *
 * 2. DR1 asks the whole "reason for import" branch on one page; the frontend
 *    splits it across five.
 *
 *    This is the largest structural difference in the corpus and the easiest
 *    to mis-pair. DR1's `/reason-for-import` carries the reason radios plus
 *    four conditional reveals, and the capture pass photographed each reveal
 *    separately. The frontend asks the reason on `/import-reason` and then
 *    routes to a separate page per revealed field, gated by obligations in
 *    `obligations/sections/import-reason.js`:
 *
 *      internalMarketPurpose        ← internal market
 *        → fe-import-purpose
 *      transhipmentDestinationCountry / transitDestinationCountry
 *        ← transhipment or transit  → fe-destination-country
 *      transitExitBorderControlPost / temporaryAdmissionPortOfExit
 *        ← transit or temporary admission horses → fe-port-of-exit
 *      temporaryAdmissionExitDate   ← temporary admission horses
 *        → fe-exit-date
 *
 *    So two DR1 reveals each answer to two frontend pages, and two frontend
 *    pages each answer to two DR1 reveals. Each block is led by the pair whose
 *    field appears first in the photographed reveal: transit shows Port of
 *    exit above Destination country, temporary admission shows Exit date above
 *    Port of exit.
 *
 * 3. A view file's absence is not a question's absence — the permanent
 *    address.
 *
 *    `dr1-permanent-address-animals` is a page of its own in DR1, asking per
 *    animal whether the permanent address is the place of destination or a new
 *    address. There is no frontend page by that name and no capture that shows
 *    the question, which makes it look one-sided. It is not. The frontend has
 *    the same rule as an obligation — `permanentAddress` in
 *    `obligations/sections/commodities/identifiers.js`, applying to the
 *    commodities in `PERMANENT_ADDRESS_COMMODITIES` (Cat and Dog) — and
 *    renders it inline on the animal identification page, under a "Permanent
 *    address" heading with a full address form
 *    (`animal-identification/_identification-card.njk`). The corpus captured
 *    cow, horse and fish, none of which trigger it, so the frontend side of
 *    this pair is simply unphotographed. Pairing it to fe-animal-identification
 *    is what puts the difference — a page versus a conditional block — in front
 *    of somebody.
 *
 * 4. States pair; missing rules do not.
 *
 *    DR1's capture pass is state-rich and the frontend's is not: seven upload
 *    states against two, four dashboard states against two, three
 *    roles-and-addresses states against one. Every one of those DR1 states is
 *    paired to the frontend screen that renders the same form, with a note
 *    saying the frontend side is the uncaptured one, because the frontend has
 *    the rule behind each: `documents/copy/copy.en.js` carries scanTags
 *    (safe / checking / virusFound), maxDocuments, cannotContinue and the
 *    per-field required errors.
 *
 *    Two DR1 screens are not states of anything the frontend has, and those are
 *    in `onlyPrototype` rather than paired. Guessing a counterpart for either
 *    would have hidden the finding.
 *
 * 5. Two frontend screens are one-sided, and the same question hangs over both.
 *
 *    Delete and cancel-amend. DR1's dashboard offers "Copy as new" and "View"
 *    and no delete; its `/notification-submitted` page tells you how to amend
 *    but defines no amend journey and no cancel-amend page. Whether these are
 *    out of DR1's scope or missing from it is a designer's call, not one the
 *    evidence can make.
 *
 * 6. Names were never the reason for a pair.
 *
 *    Several pairs are right despite the names disagreeing —
 *    fe-consignment-details against dr1-consignment-details, whose headings are
 *    "Consignment details" and "Commodity details"; fe-transporter-commercial
 *    ("Search for an approved commercial transporter") against dr1-transporter
 *    ("Transporter details"). And one pair is right despite the name promising
 *    something the screen does not do: fe-commodity-search has no search box at
 *    all, only a static grouped checkbox list.
 *
 * ---------------------------------------------------------------------------
 * Shape
 * ---------------------------------------------------------------------------
 *
 * 54 pair rows over 38 distinct frontend screens and 40 distinct DR1 screens;
 * 2 in `onlyFrontend`, 2 in `onlyPrototype`. All 82 captured screens appear.
 *
 * Blocks are ordered so that the first row naming a screen is the pair that
 * screen should default to in the report — for DR1 screens, the pair the DR1
 * capture was actually taken in.
 */

const pairs = [
  //
  // Dashboard
  //
  {
    frontend: 'fe-dashboard-populated',
    prototype: 'dr1-dashboard',
    note: 'both photographed with a notification list on screen — this is the pair to read for the list itself. The frontend row carries Resume / Copy as new / Delete and a Draft tag; DR1 carries Copy as new / View, submission statuses, and an "At a glance" alerts-errors-messages panel the frontend has no counterpart for'
  },
  {
    frontend: 'fe-dashboard-empty',
    prototype: 'dr1-dashboard',
    note: 'the same DR1 screen again — DR1 has no empty-dashboard capture, so read this pair for the page furniture around the list (heading, start-a-notification call to action, filter panel), not for the list'
  },
  {
    frontend: 'fe-dashboard-populated',
    prototype: 'dr1-dashboard-after-submission',
    note: 'DR1 photographed the list once more after a notification was submitted, showing the new entry at the top with a submitted status and an arrival date. The frontend capture only ever reaches a Draft row, so the frontend side of this state is uncaptured; the frontend does render submitted rows — its list has Status and Date submitted columns'
  },
  {
    frontend: 'fe-dashboard-populated',
    prototype: 'dr1-dashboard-filters-open',
    note: 'a state, not a page: DR1 collapses its filter panel into Search by / Status / By date accordions and this is all three expanded. The frontend panel is permanently open, so its single capture is already the open state. The frontend offers only a keyword field, against DR1\'s keyword, commodity, consignee, status and date-range'
  },

  //
  // Notification hub
  //
  {
    frontend: 'fe-hub',
    prototype: 'dr1-notification-hub',
    note: 'the task list on both sides, and the pair to read for the commodity-count panel, which both render. DR1 shows every task "To do" and every task reachable; the frontend gates tasks behind each other with "Cannot start yet" — no such status exists anywhere in the DR1 prototype'
  },
  {
    frontend: 'fe-hub-no-commodity',
    prototype: 'dr1-notification-hub',
    note: 'the frontend hub before a commodity is chosen: nine of eleven rows are "Cannot start yet" and the commodity-count panel is absent entirely. DR1 has no equivalent state because it does not gate — read this pair for what the frontend withholds, not for a difference in the DR1 picture'
  },
  {
    frontend: 'fe-hub-exit-details-blocked',
    prototype: 'dr1-notification-hub',
    note: 'the frontend hub with one task blocked by the reason-for-import answer — the exit-details row is "Cannot start yet" while later rows are startable. Same DR1 screen, again because DR1 defines no blocked state'
  },

  //
  // About the consignment
  //
  {
    frontend: 'fe-origin',
    prototype: 'dr1-origin-of-the-import',
    note: 'identical headings and the same four questions — country of origin, whether a region of origin code applies, the code, and an optional internal reference. The country control differs (a 31-country select against an autocomplete), and DR1 puts the country under its own "Country of origin" subheading'
  },
  {
    frontend: 'fe-commodity-search',
    prototype: 'dr1-what-are-you-importing',
    note: 'the same question asked two ways. DR1 lands you on an empty commodity search box; the frontend lands you on the full grouped checkbox list (Cow, Horse, Cat, Dog, Fish) with no search control at all. This is the landing-state pair — both sides as first seen'
  },
  {
    frontend: 'fe-commodity-search',
    prototype: 'dr1-what-are-you-importing-results',
    note: 'the same frontend screen against DR1 after a search has returned results, which is the DR1 state whose checkbox list is closest in content to what the frontend shows on arrival. DR1 returns eleven cattle species for a "cattle" search; the frontend lists eight species across five commodity groups and never filters'
  },
  {
    frontend: 'fe-import-reason',
    prototype: 'dr1-reason-for-import',
    note: 'the reason radios themselves, with nothing revealed. Same five options in the same order on both sides. Everything DR1 reveals below these radios is a separate frontend page — see the four rows that follow'
  },
  {
    frontend: 'fe-import-reason',
    prototype: 'dr1-reason-for-import-error',
    note: 'DR1 with the "There is a problem" summary after continuing without an answer. The frontend validates the same field but no error capture exists on the frontend side'
  },
  {
    frontend: 'fe-import-purpose',
    prototype: 'dr1-reason-for-import-internal-market-revealed',
    note: 'DR1 reveals the purpose-in-the-internal-market radios inline under the "Internal market" option; the frontend asks them on their own page. Identical eleven options in identical order, so the pair is the option list against itself — the difference is one page versus one reveal'
  },
  {
    frontend: 'fe-destination-country',
    prototype: 'dr1-reason-for-import-transhipment-revealed',
    note: 'DR1 reveals transhipmentDestinationCountry under "Transhipment or onward travel". The frontend obligation destinationCountry applies on transit OR transhipment (obligations/sections/import-reason.js), so one frontend page answers two DR1 reveals; this is the first of the two'
  },
  {
    frontend: 'fe-port-of-exit',
    prototype: 'dr1-reason-for-import-transit-revealed',
    note: 'the transit reveal was photographed with Port of exit above Destination country, so this pair leads the block for that DR1 screen. The frontend obligation portOfExit applies on transit OR temporary admission horses'
  },
  {
    frontend: 'fe-destination-country',
    prototype: 'dr1-reason-for-import-transit-revealed',
    note: 'the second half of the same transit reveal — transitDestinationCountry. The frontend asks one destination-country question for both transit and transhipment; DR1 declares two separate fields with the same label and the same 41-country list'
  },
  {
    frontend: 'fe-exit-date',
    prototype: 'dr1-reason-for-import-temporary-admission-horses-revealed',
    note: 'the temporary-admission reveal was photographed with Exit date above Port of exit, so this pair leads the block for that DR1 screen. exitDate is the one frontend field that applies to temporary admission horses alone'
  },
  {
    frontend: 'fe-port-of-exit',
    prototype: 'dr1-reason-for-import-temporary-admission-horses-revealed',
    note: 'the second half of the same reveal — temporaryAdmissionPortOfExit. Note the two sides draw from different lists: the frontend port-of-exit select carries the full 78-entry GB port and airport list, DR1 carries ten animal-approved border control posts'
  },

  //
  // Description of the goods
  //
  {
    frontend: 'fe-consignment-details',
    prototype: 'dr1-consignment-details',
    note: 'the headings disagree — "Consignment details" against "Commodity details" — but the question is the same one: number of animals and number of packages, per species. CORRECTED by the commodities author: this note previously said DR1 renders a "Selected commodities" summary table the frontend does not. The frontend renders it too — same heading, same two columns, a Remove per row and an "Add another commodity" link. Only the commodity name inside it differs'
  },
  {
    frontend: 'fe-animal-identification',
    prototype: 'dr1-animal-identification-details',
    note: 'the per-animal identifier form, and the pair the DR1 capture was taken in (Syncerus spp. 1 of 2, ear tag and passport). The frontend capture is Bos taurus 1 of 1 with passport, tattoo and ear tag — the identifier set is commodity-scoped on both sides, so the field lists differ by species not by design'
  },
  {
    frontend: 'fe-animal-identification-horse',
    prototype: 'dr1-animal-identification-details',
    note: 'the same DR1 screen against the frontend rendered for Equus caballus, where the identifier set becomes passport number and horse name. DR1 has no horse capture'
  },
  {
    frontend: 'fe-animal-identification-fish',
    prototype: 'dr1-animal-identification-details',
    note: 'the same DR1 screen against the frontend rendered for Salmo salar, where the identifier set falls back to identification details and animal description. DR1 has no fish capture'
  },
  {
    frontend: 'fe-animal-identification-saved',
    prototype: 'dr1-animal-identification-details',
    note: 'a state: the frontend after one animal has been saved, counting "2 of 2". DR1 captured only the first-entry state of the same form, so DR1 is the uncaptured side here'
  },
  {
    frontend: 'fe-animal-identification-at-maximum',
    prototype: 'dr1-animal-identification-details',
    note: 'a state: the frontend once details exist for every animal in the line, at which point the entry form is withdrawn entirely and only the saved records remain. CORRECTED by the identification author: this note previously said DR1 defines no cap behaviour. DR1 has the same behaviour — getSpeciesIdentificationState sets isComplete once no animal is left incomplete, and the view then drops the entry form and shows only the saved table. Read this pair for parity, not for an absence'
  },
  {
    frontend: 'fe-animal-identification',
    prototype: 'dr1-permanent-address-animals',
    note: 'DR1 gives the per-animal permanent address a page of its own under the Consignment parties caption; the frontend asks it as a "Permanent address" block inside the identification card (_identification-card.njk), gated by the permanentAddress obligation on the Cat and Dog commodities. The corpus captured cow, horse and fish, none of which trigger it, so the frontend side is unphotographed — this is a placement difference, not a missing question'
  },
  {
    frontend: 'fe-additional-details',
    prototype: 'dr1-additional-animal-details',
    note: 'headings differ ("Additional animal details" against "Additional details") but both ask the same two questions with the same sixteen certification options and the same yes/no unweaned question'
  },

  //
  // Transport and arrival
  //
  {
    frontend: 'fe-arrival-details',
    prototype: 'dr1-arrival-details',
    note: 'same five fields in the same order. CORRECTED by the transport author: this note previously said the frontend picks the port of entry from a plain select where DR1 uses an autocomplete. The frontend field IS an accessible-autocomplete over that select — a portOfEntry combobox in the rendered DOM — so both sides are search-as-you-type and the port control is not a difference. The means of transport does differ: DR1 a select, the frontend radios'
  },
  {
    frontend: 'fe-transporter-type',
    prototype: 'dr1-transporter-add',
    note: 'both ask commercial or private, but at different points in the flow. The frontend asks the type first and routes onward from it; DR1 asks it only after you press "Add a transporter" on the transporter list, so this page is a branch of the add journey rather than its entry'
  },
  {
    frontend: 'fe-transporter-commercial',
    prototype: 'dr1-transporter',
    note: 'both are "pick a transporter from a directory", which is what settles the pair despite the headings. DR1\'s list is one directory holding commercial and private transporters together, with a search box, an approval-status column and per-row detail links; the frontend list is commercial-only, reached after the type question, with two radio options and no search'
  },
  {
    frontend: 'fe-transporter-private',
    prototype: 'dr1-transporter-add-private',
    note: 'the private transporter contact form on both sides — name, address, country, email, phone. Field for field the same question set'
  },
  {
    frontend: 'fe-transit-countries',
    prototype: 'dr1-transit-countries',
    note: 'same question, opposite controls: DR1 offers a one-at-a-time country autocomplete, the frontend offers a 31-country checkbox list. The DR1 capture is the empty state, which is what the frontend capture also shows'
  },
  {
    frontend: 'fe-transit-countries',
    prototype: 'dr1-transit-countries-selected',
    note: 'DR1 after countries have been added, which is where its chosen-countries list appears. The frontend expresses the same state as ticked checkboxes and has no populated capture, so the frontend is the uncaptured side'
  },

  //
  // Documents
  //
  {
    frontend: 'fe-documents-empty',
    prototype: 'dr1-upload-documents',
    note: 'both empty: the add-a-document form with nothing uploaded. DR1 asks for a document type from a thirteen-option select that the frontend form does not ask for at all, and states different limits (50MB and 15 files against 10MB)'
  },
  {
    frontend: 'fe-documents-empty',
    prototype: 'dr1-upload-documents-file-chosen',
    note: 'a state of the same empty form — DR1 after a file has been picked but not yet saved. The frontend has no capture between choosing and saving'
  },
  {
    frontend: 'fe-documents-empty',
    prototype: 'dr1-upload-documents-error',
    note: 'DR1 after pressing "Save and add another" with the form blank: four errors, one per field. The frontend validates the same three fields (referenceRequired, dateRequired, fileRequired in documents/copy/copy.en.js) but has no error capture; its fourth error cannot exist because it has no document-type field'
  },
  {
    frontend: 'fe-documents-empty',
    prototype: 'dr1-upload-documents-continue-error',
    note: 'DR1 after pressing "Save and continue" with a part-filled add form and no documents saved — three errors rather than four. CORRECTED by the documents author: this note previously said the frontend has the same rule as its cannotContinue error. The two are unrelated — cannotContinue fires on unsettled virus scans, not on a part-filled add form, and the frontend has no add-form validation on Continue at all. This is a state the frontend does not have. Distinguished from dr1-upload-documents-error by the error list, not by the page: the two renders are otherwise identical'
  },
  {
    frontend: 'fe-documents-populated',
    prototype: 'dr1-upload-documents-populated',
    note: 'both with one document uploaded and the scan finished — the frontend tags it "Safe", DR1 tags it "Check completed". This is the pair to read for the uploaded-documents table'
  },
  {
    frontend: 'fe-documents-populated',
    prototype: 'dr1-upload-documents-populated-scanning',
    note: 'the mid-scan state, tagged "Scanning for virus" in DR1. The frontend has the same state — scanTags.checking, plus a "Refresh virus scan status" control — but captured only the completed one'
  },
  {
    frontend: 'fe-documents-populated',
    prototype: 'dr1-upload-documents-limit-error',
    note: 'DR1 at its fifteen-file ceiling, refusing a sixteenth. The frontend has the same rule (errors.maxDocuments) at its own limit and no capture of it'
  },

  //
  // Consignment parties
  //
  {
    frontend: 'fe-addresses-hub',
    prototype: 'dr1-roles-and-addresses',
    note: 'both empty: the six address roles with nothing added. Same six roles, same descriptions, same fraud warning. The frontend renders them as a summary list with "Not added yet" and an Add action per row; DR1 renders them as headed sections with an add link'
  },
  {
    frontend: 'fe-addresses-hub',
    prototype: 'dr1-roles-and-addresses-partial',
    note: 'DR1 with some roles filled and others not, which is where its per-role completion treatment shows. The frontend has only the empty capture, so the frontend is the uncaptured side'
  },
  {
    frontend: 'fe-addresses-hub',
    prototype: 'dr1-roles-and-addresses-complete',
    note: 'DR1 with every role filled. Same frontend screen again, same reason'
  },
  {
    frontend: 'fe-address-picker-place-of-origin',
    prototype: 'dr1-consignment-address-select',
    note: 'the DR1 view was photographed in this role, so this pair leads the block. One DR1 view (consignment-address-select.html) serves all five roles, taking the heading and a filtered address list from the section id'
  },
  {
    frontend: 'fe-address-picker-consignor-or-exporter',
    prototype: 'dr1-consignment-address-select',
    note: 'the same DR1 view in the consignor-or-exporter role — read this pair for the question and the controls, not for the heading, which the picture shows as "Place of origin"'
  },
  {
    frontend: 'fe-address-picker-consignee',
    prototype: 'dr1-consignment-address-select',
    note: 'the same DR1 view in the consignee role; the heading in the picture is not this role\'s'
  },
  {
    frontend: 'fe-address-picker-importer',
    prototype: 'dr1-consignment-address-select',
    note: 'the same DR1 view in the importer role; the heading in the picture is not this role\'s'
  },
  {
    frontend: 'fe-address-picker-place-of-destination',
    prototype: 'dr1-consignment-address-select',
    note: 'the same DR1 view in the place-of-destination role; the heading in the picture is not this role\'s'
  },
  {
    frontend: 'fe-cph-number',
    prototype: 'dr1-cph-number',
    note: 'the same value asked two ways: one free-text CPH field on the frontend, three fields (county, parish, holding number) in DR1'
  },
  {
    frontend: 'fe-contact',
    prototype: 'dr1-contact-address-for-consignment',
    note: 'identical heading and identical question — choose the contact address for this consignment from the saved addresses. Only the seeded lists differ'
  },

  //
  // Review, declaration and submission
  //
  {
    frontend: 'fe-check-answers',
    prototype: 'dr1-review-notification',
    note: 'the summary of every answer before submission, complete on both sides. The section structure differs: the frontend groups into three numbered sections, DR1 into six matching its own task list'
  },
  {
    frontend: 'fe-check-answers-submitted',
    prototype: 'dr1-review-notification',
    note: 'the frontend renders the same summary read-only once the notification is submitted — every Change action is gone and a copy-as-new form appears. CORRECTED by the dashboard and review authors, independently: this note previously said DR1 defines no post-submission view because its dashboard "View" links are href="#". That is true only of DR1\'s eight seeded demonstration rows. A notification the user actually submits is stored and linked to /review-notification?submitted=<id>, which renders the same view with readOnly: true — stripping every card\'s change target and suppressing the submit form. So DR1 does specify read-only behaviour, and the frontend retaining its submit call to action in that state is a difference with a rule behind it. No DR1 capture of the state exists; it is read from source'
  },
  {
    frontend: 'fe-check-answers',
    prototype: 'dr1-review-notification-incomplete',
    note: 'DR1 lets you open the review page while the notification is incomplete and flags each gap in an error summary and inline. The frontend cannot reach this state: it gates entry at the hub instead, where "Check and submit" stays "Cannot start yet" until the rest is done. So the frontend side is not merely uncaptured — it is unreachable, and that is the finding this pair exists to surface'
  },
  {
    frontend: 'fe-declaration',
    prototype: 'dr1-declaration',
    note: 'the same declaration and the same single confirmation checkbox; the second numbered clause is worded differently ("...until it has cleared border control checks or reached the place of destination" against "...for this consignment")'
  },
  {
    frontend: 'fe-confirmation',
    prototype: 'dr1-notification-submitted',
    note: 'the submission confirmation panel and the what-happens-next sections. DR1 carries an extra "Before the consignment is imported" section the frontend does not'
  }
]

const onlyFrontend = [
  {
    screen: 'fe-delete-notification',
    question:
      'The frontend lets you delete a draft notification from the dashboard and confirms it on its own page. DR1 offers only "Copy as new" and "View" on a dashboard row and defines no delete anywhere. Is deleting a draft in scope for DR1, and if so what should the confirmation say and which statuses may be deleted?'
  },
  {
    screen: 'fe-cancel-amend',
    question:
      'The frontend has an amend journey for a submitted notification and a "Cancel this amendment?" confirmation page for abandoning it. DR1\'s submitted page tells the user how to view or amend a notification but defines no amend journey and no cancellation. Is amending a submitted notification in scope for this comparison at all — and if it is, DR1 needs a rule for what abandoning an amendment does to the submitted version'
  }
]

const onlyPrototype = [
  {
    screen: 'dr1-dashboard-filters-date-picker-open',
    band: 'dashboard',
    note: 'the calendar opened on the dashboard filter\'s "Start date" field. The frontend dashboard filter offers a keyword box and a sort control and nothing else — no status filter, no commodity filter, no consignee filter and no date range — so there is no date field for a picker to attach to. The missing filters themselves surface in the fe-dashboard-populated / dr1-dashboard-filters-open pair; this screen is here because the component behind it has no frontend state that could correspond'
  },
  {
    screen: 'dr1-transporter-add-commercial',
    band: 'transport',
    note: 'entering a new commercial transporter by hand — authorisation number, address, contact details — plus the "Important" and "Help with transporter authorisation" guidance around it. The frontend has no such page and no route to one: src/.../features/transport holds transporters (the type question), transporters-select (choose from the approved commercial list) and private-transporter-details only. On the frontend a commercial transporter can only be chosen from the approved directory, never added, so no frontend state corresponds'
  }
]

module.exports = { pairs, onlyFrontend, onlyPrototype }
