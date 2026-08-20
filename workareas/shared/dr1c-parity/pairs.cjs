//
// Which screen answers which, between the live-animals frontend and Design
// release 1.
//
// CommonJS and hand-authored, the way the enumerate*.cjs modules beside it are:
// this is knowledge about two applications, not reusable code.
//
// ---------------------------------------------------------------------------
// What this file is for, and what a mistake in it costs
// ---------------------------------------------------------------------------
//
// A wrong pairing does not fail. It renders two unrelated pages side by side
// under one heading, and it invites a confident finding about a difference that
// is an artefact of this file. Everything downstream — every authoring agent,
// every card in the report — reads the answer here rather than working it out
// privately. So every pair whose correctness is not obvious from the two screen
// names carries a note saying what settled it, and the note cites the rendered
// DOM, the screenshot or the source line that decided it.
//
// Where a pairing could not be settled the note says so in as many words. A
// stated uncertainty is a real answer; a plausible-looking guess is not.
//
// ---------------------------------------------------------------------------
// This file pairs CAPTURED SCREENS, not enumerated pages
// ---------------------------------------------------------------------------
//
// The two enumerators list pages: 31 on the frontend, 28 on Design release 1.
// The captures shot those pages plus their states — 67 frontend ids and 60
// prototype ids. This file works at the CAPTURED level, so all 127 ids appear
// in exactly one of the three lists below.
//
// That matters for two reasons and both are load-bearing:
//
//   - `tim parity slices --strict` resolves one-sided entries against the
//     capture manifests (tim/src/parity/slices.js:190-198). An entry naming a
//     page id that was only ever shot as a state would resolve to no slice.
//   - A finding names the screen it is about, and findings name states
//     constantly — fe-origin-region-code-revealed, dr1-upload-documents-errors.
//     `screenPairsFor` (tim/src/parity/assets/pairs.js:96-102) prints "this
//     screen is not in pairs.js" for any id this file does not carry, which
//     tells a reader nothing. Pairing states removes that outcome entirely.
//
// A state pairs with the screen on the other side that renders the same form.
// Where one side captured a state the other never did, the pair still stands
// and the note names the side that is missing, because "the frontend has no
// empty-dashboard equivalent" is a fact a reader needs and an absent pair
// cannot express.
//
// ---------------------------------------------------------------------------
// Many-to-one, and the direction it runs in
// ---------------------------------------------------------------------------
//
// `indexPairs` collects every counterpart but the report shows the FIRST one
// (tim/src/parity/assets/pairs.js:83-88). So wherever a screen has more than
// one counterpart, the block is ordered to lead with the pair the other side's
// picture was actually taken in. A block led by a role the photograph is not of
// makes a heading difference look like a finding.
//
// Four screens carry more than one counterpart here, each for a stated reason:
//
//   fe-animal-identification    → the identification page, THEN Design release
//                                 1's separate permanent-address page, because
//                                 the frontend renders the permanent address as
//                                 a block inside the identification card.
//   fe-destination-country      → the transit reveal, THEN the transhipment
//                                 reveal, because one frontend page serves both
//                                 import reasons.
//   fe-cph-number               → the CPH page, THEN its details-expander state.
//   fe-documents                → the upload page, THEN its empty state, because
//                                 the frontend's base capture IS its empty state.
//   fe-transporter-commercial   → the transporter list, THEN its searched state.
//   fe-addresses-hub            → the parties hub, THEN its permanent-address
//                                 variant.
//   fe-addresses-hub-complete   → the answered hub, THEN the two "same as"
//                                 variants.
//
// ---------------------------------------------------------------------------
// The five party pickers: five frontend pages against one prototype view
// ---------------------------------------------------------------------------
//
// This is the sharpest structural difference in the corpus and it is worth
// stating precisely, because at the page level and at the capture level it
// looks like two different things.
//
// AT THE PAGE LEVEL it is five-to-one. Design release 1 serves all five
// consignment-party pickers from ONE view. app/routes.js:10914-10918 registers
// the same handleConsignmentAddressSelectGet for every section marked
// `selectable: true` in app/data/consignment-address-sections.js, and
// app/routes.js:3580 renders consignment-address-select.html with a different
// heading and hint each time. The frontend has five separate screens, from one
// template rendered once per party
// (addresses/party-picker/party-picker.controller.js:125-138 over the five
// entries in addresses/parties.js).
//
// AT THE CAPTURE LEVEL it is one-to-one, because this run photographed the
// other four headings as named states. So the pairs below are written
// one-to-one and each names its party. Nothing is lost: a reader comparing
// dr1-consignment-address-select-importer against fe-address-picker-importer is
// looking at the same view Design release 1 renders for place of origin, with
// the importer heading and hint substituted.
//
// The pictures settle that these are the same screen and not merely the same
// name. Both sides caption the page ("Consignment parties" / "Consignment
// addresses"), head it "Place of origin", carry the identical hint "The address
// where the animals begin their journey to Great Britain", label the search
// "Search / Name, address or country", and render a Name / Address / Country
// table of radios with a "View details" link per row. The differences visible
// in that pair — Design release 1 offers "Add a new address" and the frontend
// does not, the frontend paginates and Design release 1 does not — are findings,
// which is exactly what a correct pairing is for.
//
// ---------------------------------------------------------------------------
// Design release 1's exit questions: one page against four frontend pages
// ---------------------------------------------------------------------------
//
// Design release 1 asks for the exit date, the port of exit, the exit border
// control post, the transit/transhipment destination country and the
// internal-market purpose as radio conditionals on /reason-for-import
// (app/routes.js:8944-8990). None of them has a view of its own. The frontend
// gives four of them their own page.
//
// So dr1-reason-for-import and its four reveal states answer SEVEN frontend
// screens between them. The mapping was read off the control names in the
// captured DOM rather than off the headings, because the headings do not agree:
//
//   internalMarketPurpose              → fe-import-purpose
//   transitDestinationCountry          → fe-destination-country
//   transhipmentDestinationCountry     → fe-destination-country
//   temporaryAdmissionExitDate         → fe-exit-date
//   temporaryAdmissionPortOfExit       → fe-port-of-exit
//   transitExitBorderControlPost       → nothing on the frontend
//
// One frontend page serving both destination-country reveals is not a guess:
// the frontend's obligation says so, at
// obligations/sections/import-reason.js:13-15 — "destinationCountry applies when
// reasonForImport is transit or transhipmentOrOnwardTravel".
//
// The exit border control post has no frontend page and no frontend field. That
// is a missing field on a paired screen rather than a missing screen, so it does
// not appear in onlyPrototype; it is left for the import-reason slice to raise
// off the dr1-reason-for-import-transit-revealed pair.
//
// ---------------------------------------------------------------------------
// Claims in the brief that this pass checked, and what it found
// ---------------------------------------------------------------------------
//
// - "dr1-permanent-address-animals may pair with nothing." IT PAIRS. The
//   frontend asks the same question inside the animal-identification card: the
//   captured DOM of fe-animal-identification carries the heading "Permanent
//   address" and the sentence "A permanent address is required for this animal."
//   above nine fields for the dog line — nameOrOrganisationName-2, addressLine1-2,
//   addressLine2-2, townOrCity-2, county-2, postalOrZipCode-2, country-2,
//   telephoneNumber-2, emailAddress-2 — the same field set Design release 1
//   collects as permanentAddressDetails[…]. Both sides gate it on commodity code
//   01061900. A page on one side and a block on the other is still one question,
//   and pairing them is what lets somebody write the finding.
//
// - "fe-delete-notification and fe-cancel-amend appear to have no counterpart."
//   CONFIRMED, and confirmed the hard way rather than from the view list. Both
//   routes DO exist on the single router: app/routes.js:10045 GET
//   /notifications/delete and app/routes.js:9652 GET /notifications/cancel-amend.
//   Neither reaches Design release 1. renderDeleteNotificationPage
//   (app/routes.js:5607-5612) redirects unless isDesignRelease2SessionData
//   passes, and the cancel-amend handler does the same at app/routes.js:9653-9655
//   — a flag the root mount never sets. Neither has a root view either:
//   `ls app/views/*.html` has no delete-notification.html and no
//   cancel-amend.html. Both are one-sided.
//
// - "dr1-additional-animal-details and fe-additional-details look like a pair by
//   name." THEY ARE ONE, and the pictures prove it rather than the names: both
//   ask "What are the animals certified for?" over the same sixteen radios in the
//   same order, Further keeping through Other, then "Does the consignment contain
//   any unweaned animals?" with the same hint. Only the hint on the first
//   question differs.
//
// - The seven name disagreements the brief listed were each re-derived from the
//   evidence rather than accepted. All seven hold. Their notes below say what
//   was checked.
//
// ---------------------------------------------------------------------------
// Where the names lie, and the pairs that are NOT what they look like
// ---------------------------------------------------------------------------
//
// The transporter section is the one place where pairing on names would produce
// three wrong pairs. The two services order the task differently:
//
//   Design release 1:  /transporter (search a list, pick one)
//                      → /transporter/add (choose a type)
//                      → /transporter/add/private | /add/commercial (a form)
//
//   Frontend:          /transporters (choose a type)
//                      → /transporters/select   (pick from the approved list)
//                      or /transporters/private (a form)
//
// So the type chooser is dr1-transporter-ADD, not dr1-transporter; and
// fe-transporter-COMMERCIAL is a list to pick from, not a form to fill in. The
// pairs below follow what each page does. The consequence is that Design release
// 1's commercial form has no frontend counterpart at all, which is in
// onlyPrototype.
//
// ---------------------------------------------------------------------------
// Sourcing
// ---------------------------------------------------------------------------
//
// Read for this pass: both capture manifests; the rendered DOM of all 127
// captured screens (headings, and every input/select/textarea name and type);
// the screenshots of the screens where the DOM alone could not settle it; both
// enumerate*.cjs modules; and, where a claimed absence had to be checked, the
// two applications' own source. The page model was not used — RUN-BRIEF section
// 7 records three ways it is known to be wrong on this corpus, and one of them
// (five checkbox fieldsets collapsed into one) would have corrupted the
// commodities pairing directly.
//
// Nothing was read from dr1-parity, dr1b-parity, either journey-builder run
// directory or parity-archive. SCREEN_PAIRER.md:27 instructs the pairer to read
// workareas/shared/dr1-parity/pairs.cjs as the worked example; that path is
// behind the RUN-BRIEF section 1 firewall and the instruction was not followed.
//

module.exports = {
  pairs: [
    // -----------------------------------------------------------------------
    // Dashboard
    // -----------------------------------------------------------------------
    {
      frontend: 'fe-dashboard',
      prototype: 'dr1-dashboard',
      note: 'Both are the signed-in landing page under the same h1, "Import notification service", both offer a start-a-notification button, a "Filter notifications" panel, a "Sort by" select and a card per notification. The names agree and so do the pictures.'
    },
    {
      frontend: 'fe-dashboard-populated',
      prototype: 'dr1-dashboard',
      note: 'The frontend with one notification listed against the only dashboard Design release 1 photographed, which has four. Read this pair for what a card carries, not for how many there are: the frontend card shows Commodity, Origin, Arrival at destination, Consignee, Consignor, Status, Date created and Date submitted with Resume / Copy as new / Delete, and the Design release 1 card shows Commodity, Status, Origin and Arrival date at destination with Copy as new / View.'
    },
    {
      frontend: 'fe-dashboard-empty',
      prototype: 'dr1-dashboard',
      note: 'The frontend with no notifications. Design release 1 photographed no empty dashboard — its fixtures always seed four — so the prototype side of this pair is the populated page and only the furniture around the list is comparable.'
    },
    {
      frontend: 'fe-dashboard-new-draft',
      prototype: 'dr1-dashboard',
      note: 'The frontend immediately after a draft is created. Design release 1 captured no equivalent moment; the prototype side stands in for the page, not the state.'
    },
    {
      frontend: 'fe-dashboard-deleted',
      prototype: 'dr1-dashboard',
      note: 'The frontend after deleting a notification. Design release 1 has no delete affordance on this page at all — its cards offer only "Copy as new" and "View" — so there is no state on that side to correspond, and this pair exists so the absence is visible rather than silent. The deletion journey itself is one-sided; see fe-delete-notification in onlyFrontend.'
    },
    {
      frontend: 'fe-dashboard-sorted',
      prototype: 'dr1-dashboard',
      note: 'Sorting is on both sides — a "Sort by" select above the list — so the pair is sound. The frontend needs an "Update sort" button beside the select and Design release 1 does not, which is visible in this pair.'
    },
    {
      frontend: 'fe-dashboard-search-no-results',
      prototype: 'dr1-dashboard-filters-open',
      note: 'PAIRED ON THE FILTER SURFACE, NOT ON THE STATE, and the weakest pair in this file. The frontend screen is a keyword search that returned nothing; the prototype screen is the filter accordion expanded. They are paired because these are the two captures that show each side\'s full filtering surface: the frontend offers one field, "Keyword or reference" with a Search button, and Design release 1 offers keyword, commodity, consignee, status, a date-range radio with start and end dates, under three accordion sections Search by / Status / By date. Read this pair for which filters exist, never for the results. If the report needs an empty-results comparison, neither side has one.'
    },

    // -----------------------------------------------------------------------
    // Notification hub
    // -----------------------------------------------------------------------
    {
      frontend: 'fe-hub',
      prototype: 'dr1-notification-hub',
      note: 'The names disagree and the pages do not: both are the task list for one notification and both are headed "Overview". Checked in the rendered DOM of both, not inferred from the file names.'
    },
    {
      frontend: 'fe-hub-part-answered',
      prototype: 'dr1-notification-hub-partly-complete',
      note: 'The same task list with some sections answered. Different words for the same state.'
    },

    // -----------------------------------------------------------------------
    // Origin
    // -----------------------------------------------------------------------
    {
      frontend: 'fe-origin',
      prototype: 'dr1-origin-of-the-import',
      note: 'Both headed "Origin of the import" and both the journey entry page. Both carry a country of origin, a region-of-origin-required radio, a region code and an internal reference.'
    },
    {
      frontend: 'fe-origin-region-code-revealed',
      prototype: 'dr1-origin-of-the-import-region-revealed',
      note: 'The same conditional reveal on both sides: answering yes to the region-of-origin question opens a code field. The frontend calls it regionOfOriginCode and Design release 1 calls it regionOfOriginCodeSuffix (revealed at app/views/origin-of-the-import.html:102).'
    },
    {
      frontend: 'fe-origin-error',
      prototype: 'dr1-origin-of-the-import',
      note: 'The frontend page with its error summary shown. Design release 1 captured no error state for this page, so the prototype side is the clean page and the error presentation is one-sided in this pair.'
    },

    // -----------------------------------------------------------------------
    // Commodities
    // -----------------------------------------------------------------------
    {
      frontend: 'fe-commodity-search',
      prototype: 'dr1-what-are-you-importing',
      note: 'The names disagree, the h1 does not: both are "What are you importing?". The pages are built very differently and that is the point of the pair — the frontend renders the whole reference list up front as checkbox fieldsets (one `species` checkbox group, no search box and no hidden input), while Design release 1 renders a `commoditySearch` box over a hidden `selectedSpecies` field and shows nothing until a search runs.'
    },
    {
      frontend: 'fe-commodity-search-selected',
      prototype: 'dr1-what-are-you-importing-results',
      note: 'Both are the page with something choosable on screen: the frontend with a species checkbox ticked, Design release 1 after a search has returned rows and rendered its `commodity-selection` checkboxes. This is the pair that shows the frontend needs no search to get here.'
    },
    {
      frontend: 'fe-commodity-search-error',
      prototype: 'dr1-what-are-you-importing',
      note: 'The frontend with a validation error. Design release 1 captured no error state for this page.'
    },
    {
      frontend: 'fe-consignment-details',
      prototype: 'dr1-consignment-details',
      note: 'The headings differ — "Consignment details" against "Commodity details" — but the questions are the same: a number of animals and a number of packages per commodity line. The frontend indexes them numberOfAnimalsQuantity-N / numberOfPackages-N, Design release 1 keys them by species, numberOfAnimals[cattle-bos-taurus].'
    },
    {
      frontend: 'fe-consignment-details-error',
      prototype: 'dr1-consignment-details',
      note: 'The frontend with a validation error. Design release 1 captured no error state for this page.'
    },
    {
      frontend: 'fe-consignment-details-count-drop-error',
      prototype: 'dr1-consignment-details',
      note: 'The frontend refusing a reduction in the animal count after identifiers have been entered. Design release 1 has no captured equivalent, and whether it enforces the rule at all is a question for the commodities slice rather than for this file.'
    },

    // -----------------------------------------------------------------------
    // Animal identification
    // -----------------------------------------------------------------------
    {
      frontend: 'fe-animal-identification',
      prototype: 'dr1-animal-identification-details',
      note: 'Headed "Animal identification details" and "Identification details". Both collect per-animal identifiers grouped by species — the frontend as animalIdentifierPassport-N / animalIdentifierTattoo-N / animalIdentifierEarTag-N, Design release 1 as identifiers[cattle-bos-taurus][ear-tag] and [passport]. Listed first so it leads the block: this is the counterpart the prototype picture was taken of.'
    },
    {
      frontend: 'fe-animal-identification-saved',
      prototype: 'dr1-animal-identification-details-saved',
      note: 'Both the same page after an animal has been saved and re-listed within it.'
    },
    {
      frontend: 'fe-animal-identification-error',
      prototype: 'dr1-animal-identification-details',
      note: 'The frontend with a validation error. Design release 1 captured no error state for this page.'
    },
    {
      frontend: 'fe-animal-identification-at-maximum',
      prototype: 'dr1-animal-identification-details-saved',
      note: 'The frontend once every animal in the consignment has been identified and no further entry is offered. Paired with the prototype\'s saved state as the nearest thing on that side; Design release 1 was not observed to have an at-maximum state, so read this pair for the saved list, not for the ceiling behaviour.'
    },
    {
      frontend: 'fe-animal-identification',
      prototype: 'dr1-permanent-address-animals',
      note: 'A PAGE ON ONE SIDE, A BLOCK ON THE OTHER. Design release 1 gives the animals\' permanent address its own page for commodity code 01061900 (app/data/consignment-address-sections.js:124-131, rendered at app/routes.js:2770); the frontend asks the same question inside the animal-identification card. The frontend\'s captured DOM carries the heading "Permanent address" and the sentence "A permanent address is required for this animal." above nine fields on the dog line — nameOrOrganisationName-2 through emailAddress-2 — which is the same field set as Design release 1\'s permanentAddressDetails[dog-canis-familiaris:0][…]. Design release 1 additionally offers a choice the frontend does not, "Same as the place of destination (POD)" or "Enter a new address"; that is a finding, not a pairing problem. Listed after the identification pair so that one leads.'
    },
    {
      frontend: 'fe-animal-identification',
      prototype: 'dr1-permanent-address-animals-new-address-revealed',
      note: 'The same block against Design release 1\'s page with the "Enter a new address" reveal open, which is the state in which the two sides ask for the same nine fields. The frontend has no equivalent radio, so its fields are always visible and it has no reveal to photograph.'
    },
    {
      frontend: 'fe-additional-details',
      prototype: 'dr1-additional-animal-details',
      note: 'Settled from the screenshots, not the names. Both ask "What are the animals certified for?" over the same sixteen radios in the same order — Further keeping, Slaughter, Confined establishment, Germinal products, Registered equine animal, Travelling circus/animal act, Exhibition, Event or activity near borders, Release into the wild, Dispatch centre, Relaying area / purification centre, Ornamental aquaculture establishment, Technical use, Quarantine or similar establishment, Live aquatic animals for human consumption, Other — then "Does the consignment contain any unweaned animals?" with the identical hint. Only the first question\'s hint differs: "You\'ll find this on the health certificate." against "This information can be found on the ITAHC."'
    },

    // -----------------------------------------------------------------------
    // Reason for import, and the four questions Design release 1 reveals on it
    // -----------------------------------------------------------------------
    {
      frontend: 'fe-import-reason',
      prototype: 'dr1-reason-for-import',
      note: 'Headed "What is the main reason for importing the animals?" and "Main reason for import". The frontend\'s reasonForImport radio against Design release 1\'s importReason radio. Everything Design release 1 hangs off those radios is captured as a state of this screen; see the pairs below.'
    },
    {
      frontend: 'fe-import-reason-transit-selected',
      prototype: 'dr1-reason-for-import-transit-revealed',
      note: 'Both the reason page with transit chosen. Listed first among the counterparts of the transit reveal so it leads: this is the frontend screen the prototype picture actually corresponds to. Design release 1 opens transitExitBorderControlPost and transitDestinationCountry inline here; the frontend opens nothing and sends the user to separate pages instead.'
    },
    {
      frontend: 'fe-import-purpose',
      prototype: 'dr1-reason-for-import-internal-market-revealed',
      note: 'A whole page against a conditional reveal. The frontend asks the purpose in the internal market on its own page (purposeInInternalMarket radio, h1 "Purpose in the internal market"); Design release 1 asks it as internalMarketPurpose revealed under the internal-market radio on the reason page, pre-rendered from app/views/partials/internal-market-purpose-select.html at app/routes.js:8944-8990. Matched on the control name, not the heading.'
    },
    {
      frontend: 'fe-destination-country',
      prototype: 'dr1-reason-for-import-transit-revealed',
      note: 'A whole page against a conditional reveal. The frontend asks the destination country on its own page (destinationCountry select); Design release 1 asks it as transitDestinationCountry inside the transit reveal. One frontend page serves two of Design release 1\'s reveals — see the next pair — and that is not an inference: obligations/sections/import-reason.js:13-15 states "destinationCountry applies when reasonForImport is transit or transhipmentOrOnwardTravel".'
    },
    {
      frontend: 'fe-destination-country',
      prototype: 'dr1-reason-for-import-transhipment-revealed',
      note: 'The same frontend page against Design release 1\'s other destination-country reveal, transhipmentDestinationCountry, pre-rendered from app/views/partials/transhipment-destination-country-select.html. Second in the block, so the transit pair leads.'
    },
    {
      frontend: 'fe-destination-country-error',
      prototype: 'dr1-reason-for-import-transit-revealed',
      note: 'The frontend page with a validation error. Design release 1 has no separate page to show an error on, so there is no state on that side to correspond.'
    },
    {
      frontend: 'fe-exit-date',
      prototype: 'dr1-reason-for-import-temporary-admission-revealed',
      note: 'A whole page against a conditional reveal. The frontend asks the exit date on its own page (exitDate); Design release 1 asks it as temporaryAdmissionExitDate inside the temporary-admission reveal, pre-rendered from app/views/partials/temporary-admission-horses-select.html. Listed first among that reveal\'s counterparts because the exit date is the first field in it.'
    },
    {
      frontend: 'fe-port-of-exit',
      prototype: 'dr1-reason-for-import-temporary-admission-revealed',
      note: 'The second question inside the same reveal: Design release 1\'s temporaryAdmissionPortOfExit against the frontend\'s own portOfExit page. The reveal therefore answers two frontend pages, and this file states which control maps to which page so that neither is compared against the wrong half.'
    },
    {
      frontend: 'fe-port-of-exit-error',
      prototype: 'dr1-reason-for-import-temporary-admission-revealed',
      note: 'The frontend page with a validation error. Design release 1 has no separate page to show an error on.'
    },

    // -----------------------------------------------------------------------
    // Transport
    // -----------------------------------------------------------------------
    {
      frontend: 'fe-arrival-details',
      prototype: 'dr1-arrival-details',
      note: 'The one pair where the names agree and the pages do too. Both collect arrivalDateAtPort, portOfEntry, meansOfTransport, transportIdentification and transportDocumentReference under the same five names. The frontend renders portOfEntry and meansOfTransport as a select and radios, Design release 1 as a hidden field behind a search widget and a select.'
    },
    {
      frontend: 'fe-arrival-details-date-picker',
      prototype: 'dr1-arrival-details-datepicker-open',
      note: 'The same page with the MoJ date picker dialog open on both sides. Note before comparing: the open calendar is a volatile value — it draws the current month with today highlighted, and both sides derive data-min-date and data-max-date from the clock.'
    },
    {
      frontend: 'fe-transit-countries',
      prototype: 'dr1-transit-countries',
      note: 'Both headed "Which countries will the consignment travel through?" — the only screen in this corpus where the two sides use the same sentence. The mechanism differs: the frontend renders a transitedCountries checkbox list, Design release 1 posts a hidden transitCountries field from a search widget.'
    },
    {
      frontend: 'fe-transit-countries-selected',
      prototype: 'dr1-transit-countries-selected',
      note: 'The same page with countries chosen on both sides.'
    },
    {
      frontend: 'fe-transit-countries-error',
      prototype: 'dr1-transit-countries',
      note: 'The frontend with a validation error. Design release 1 captured no error state for this page.'
    },
    {
      frontend: 'fe-transporter-type',
      prototype: 'dr1-transporter-add',
      note: 'NOT THE PAIR THE NAMES SUGGEST, and the pair the control settles. Both pages ask one question — which type of transporter — through a radio literally named transporterType, with the values Commercial/Private on the frontend and commercial/private on Design release 1. The headings differ ("What type of transporter will move the animals?" against "Choose a transporter type") and so does the position in the journey: the frontend asks it first, Design release 1 asks it after the list. Pairing dr1-transporter here on the strength of its name would have been wrong.'
    },
    {
      frontend: 'fe-transporter-commercial',
      prototype: 'dr1-transporter',
      note: 'Settled from the screenshots. Both are a table of transporters to pick one from — the frontend under "Search for an approved commercial transporter" with a commercialTransporter radio per row, Design release 1 under "Transporter details" with a "Select a transporter" table and a transporterId radio per row. Both show name, address and approval number. Two differences are visible in the pair and both are findings: Design release 1 offers a search box and the frontend offers none despite its heading saying "Search for", and Design release 1\'s list carries Type and Status columns and an "Add a transporter" button that the frontend has no equivalent of.'
    },
    {
      frontend: 'fe-transporter-commercial',
      prototype: 'dr1-transporter-results',
      note: 'The same list after a search on the Design release 1 side. The frontend has no search on this page, so its side of the pair is the unfiltered list; read this for the search behaviour, not for the rows.'
    },
    {
      frontend: 'fe-transporter-private',
      prototype: 'dr1-transporter-add-private',
      note: 'Both a form for a private transporter\'s name, address and contact details, field for field: nameOrOrganisationName / addressLine1 / addressLine2 / townOrCity / county / postalOrZipCode / country / telephoneNumber / emailAddress against transporterPrivateName / …AddressLine1 / …AddressLine2 / …TownOrCity / …County / …Postcode / …Country / …Phone / …Email.'
    },
    {
      frontend: 'fe-transporter-private-error',
      prototype: 'dr1-transporter-add-private',
      note: 'The frontend form with a validation error. Design release 1 captured no error state for this form.'
    },

    // -----------------------------------------------------------------------
    // Documents
    // -----------------------------------------------------------------------
    {
      frontend: 'fe-documents',
      prototype: 'dr1-upload-documents',
      note: 'The names disagree, the h1 does not: both are "Upload documents". Both take a reference, a date of issue and a file. The difference visible in the pair is that Design release 1 also asks for a documentType from a select and the frontend does not.'
    },
    {
      frontend: 'fe-documents',
      prototype: 'dr1-upload-documents-empty',
      note: 'The frontend\'s base capture IS its empty state — no documents uploaded — so it answers Design release 1\'s explicit empty capture as well as the base one. Listed second so the base pair leads.'
    },
    {
      frontend: 'fe-documents-populated',
      prototype: 'dr1-upload-documents-populated',
      note: 'Both with documents uploaded and listed. Do not compare the ids in the rows: the frontend mints a randomUUID per upload and Design release 1 mints doc-${Date.now()}-N, so both are volatile.'
    },
    {
      frontend: 'fe-documents-scanning',
      prototype: 'dr1-upload-documents-scanning',
      note: 'Both with an uploaded file still being virus-scanned.'
    },
    {
      frontend: 'fe-documents-error',
      prototype: 'dr1-upload-documents-errors',
      note: 'Both with upload validation errors shown. Singular on one side and plural on the other; the same state.'
    },

    // -----------------------------------------------------------------------
    // Consignment addresses hub
    // -----------------------------------------------------------------------
    {
      frontend: 'fe-addresses-hub',
      prototype: 'dr1-roles-and-addresses',
      note: 'The names disagree, the h1 does not: both are "Consignment addresses". Both list the same five parties in the same order — Place of origin, Consignor, Consignee, Importer, Place of destination — followed by a conditional County Parish Holding row. Verified by extracting the row labels from both captured DOMs rather than from the file names.'
    },
    {
      frontend: 'fe-addresses-hub-empty',
      prototype: 'dr1-roles-and-addresses',
      note: 'The frontend hub with nothing answered and no CPH row — five "Add" links and no "Change". Design release 1\'s base capture is likewise unanswered, so the two states correspond; only the conditional sixth row differs.'
    },
    {
      frontend: 'fe-addresses-hub-complete',
      prototype: 'dr1-roles-and-addresses-answered',
      note: 'The frontend hub with all six rows answered — six "Change" links and no "Add" — against Design release 1\'s answered hub.'
    },
    {
      frontend: 'fe-addresses-hub-complete',
      prototype: 'dr1-roles-and-addresses-same-as-consignee',
      note: 'Design release 1 offers a shortcut the frontend does not: on an unanswered Importer or Place of destination row it renders a "Same as consignee" link beside "Add an importer". The frontend carries the same hint sentence — "This is usually the same as the consignee. You can select a different person if needed." appears in both captured DOMs — but offers no such link, only "Add". Paired with the answered frontend hub because that is where the frontend shows what it does once those rows are filled. Second in the block, so the answered pair leads.'
    },
    {
      frontend: 'fe-addresses-hub-complete',
      prototype: 'dr1-roles-and-addresses-same-as-place-of-origin',
      note: 'The same shortcut offered against the place of origin rather than the consignee. Same reasoning as the pair above.'
    },
    {
      frontend: 'fe-addresses-hub',
      prototype: 'dr1-roles-and-addresses-permanent-address',
      note: 'Design release 1\'s hub with a Permanent address row in place of the CPH row, which is what it shows for commodity code 01061900. The frontend\'s hub never carries a permanent-address row at all — it collects that inside the animal-identification card instead — so the frontend side of this pair is its ordinary hub and the missing row is the point. Second in the block, so the base pair leads.'
    },

    // -----------------------------------------------------------------------
    // The five consignment-party pickers.
    //
    // One Design release 1 view, five headings, captured as five ids. The
    // place-of-origin pair leads because that is the heading the prototype's
    // base picture was taken under. See the header for the full reasoning.
    // -----------------------------------------------------------------------
    {
      frontend: 'fe-address-picker-place-of-origin',
      prototype: 'dr1-consignment-address-select',
      note: 'Settled from the two screenshots side by side: same caption pattern, same h1 "Place of origin", identical hint "The address where the animals begin their journey to Great Britain", identical search label "Search / Name, address or country", and a Name / Address / Country table of radios with a "View details" link per row on both. Design release 1 renders this view for all five parties (app/routes.js:3580, registered for each selectable section at app/routes.js:10914-10918); the frontend renders its own template once per party (addresses/party-picker/party-picker.controller.js:125-138). Leads the block.'
    },
    {
      frontend: 'fe-address-picker-place-of-origin-selected',
      prototype: 'dr1-consignment-address-select',
      note: 'The frontend picker with an address chosen, which it carries as a hidden `selected` field alongside the party radio. Design release 1 captured no chosen state, so the prototype side is the unchosen list.'
    },
    {
      frontend: 'fe-address-picker-place-of-origin-page-2',
      prototype: 'dr1-consignment-address-select',
      note: 'The frontend\'s second page of results. Design release 1 has no pagination — its picture shows "Showing 9 out of 9 results" with every row on one page, while the frontend shows "Showing 5 of 13 addresses" over three numbered pages. There is no prototype state to correspond and that difference is the reason this pair exists.'
    },
    {
      frontend: 'fe-address-picker-place-of-origin-no-matches',
      prototype: 'dr1-consignment-address-select-search-filtered',
      note: 'PAIRED ON THE SEARCH HAVING RUN, NOT ON THE RESULT. Both are the picker after a search, but the frontend\'s returned nothing — its whole empty-state copy is the single sentence "No addresses match your search." — while Design release 1\'s returned rows and reports "Showing 3 out of 9". These are the only two post-search captures in the corpus, so they are paired to make the search behaviour comparable; read this pair for the results-count copy and the empty state, never for the rows. Design release 1 photographed no empty search and the frontend photographed no search with results.'
    },
    {
      frontend: 'fe-address-picker-consignor-or-exporter',
      prototype: 'dr1-consignment-address-select-consignor-or-exporter',
      note: 'The same Design release 1 view under the heading "Consignor". The frontend heads it "Consignor or exporter" — a copy difference on a correctly matched pair, not a mismatched pair.'
    },
    {
      frontend: 'fe-address-picker-consignor-or-exporter-error',
      prototype: 'dr1-consignment-address-select-consignor-or-exporter',
      note: 'The frontend picker with a validation error — continuing without choosing an address. Design release 1 captured no error state for the picker.'
    },
    {
      frontend: 'fe-address-picker-consignee',
      prototype: 'dr1-consignment-address-select-consignee',
      note: 'The same Design release 1 view under the heading "Consignee", which both sides use. Design release 1 names its radio consigneeAddressId; the frontend names all five `party`, which is why the pairing has to come from the route and the heading rather than the control.'
    },
    {
      frontend: 'fe-address-picker-importer',
      prototype: 'dr1-consignment-address-select-importer',
      note: 'The same Design release 1 view under the heading "Importer", which both sides use.'
    },
    {
      frontend: 'fe-address-picker-place-of-destination',
      prototype: 'dr1-consignment-address-select-place-of-destination',
      note: 'The same Design release 1 view under the heading "Place of destination", which both sides use.'
    },

    // -----------------------------------------------------------------------
    // CPH and contact address
    // -----------------------------------------------------------------------
    {
      frontend: 'fe-cph-number',
      prototype: 'dr1-cph-number',
      note: 'Both collect the county parish holding number. The shape differs and is comparable: the frontend takes it as one text field, countyParishHoldingCph, and Design release 1 takes it as three, cphNumber-county / -parish / -holding, under the hint "For example 12/345/6789". The headings differ, "County Parish Holding (CPH)" against "Add the county parish holding number (CPH)".'
    },
    {
      frontend: 'fe-cph-number',
      prototype: 'dr1-cph-number-details-open',
      note: 'Design release 1 has a "What is a CPH number?" details expander above the field, shown open here, explaining that a CPH is a unique 9-digit number and where to find it. The frontend page has no details element at all, so its side of the pair is the plain page and the missing explanation is the point. Second in the block, so the base pair leads.'
    },
    {
      frontend: 'fe-cph-number-error',
      prototype: 'dr1-cph-number',
      note: 'The frontend with a validation error. Design release 1 captured no error state for this page.'
    },
    {
      frontend: 'fe-contact',
      prototype: 'dr1-contact-address-for-consignment',
      note: 'The file names disagree but both pages are headed "Contact address for consignment" and both pick one address by radio — contactAddress on the frontend, contactAddressId on Design release 1. This is deliberately not one of the five party pickers on either side: the frontend declares CONTACT_PARTY separately from PARTIES (addresses/parties.js:59-61) and Design release 1 serves it from its own route and view.'
    },

    // -----------------------------------------------------------------------
    // Review, declaration and confirmation
    // -----------------------------------------------------------------------
    {
      frontend: 'fe-check-answers',
      prototype: 'dr1-review-notification',
      note: 'The names disagree, the job does not: both are the check-your-answers page for the whole notification, headed "Check your answers" and "Review your notification". Neither carries any input beyond the form crumb.'
    },
    {
      frontend: 'fe-check-answers-incomplete',
      prototype: 'dr1-review-notification-incomplete',
      note: 'Both the review page reached before the notification is complete. Design release 1 reaches it by POSTing early (app/routes.js:10071-10072).'
    },
    {
      frontend: 'fe-check-answers-submitted',
      prototype: 'dr1-review-notification',
      note: 'The frontend\'s read-only view of a submitted notification, which carries idempotencyKey and copyOrigin hidden fields the draft view does not. Design release 1 captured no submitted review, so the prototype side is the draft review; read this pair for the summary content, not for the read-only treatment.'
    },
    {
      frontend: 'fe-declaration',
      prototype: 'dr1-declaration',
      note: 'Both headed "Declaration" and both gate submission on a single checkbox — `declaration` on the frontend, `declarationConfirmed` on Design release 1. A checkbox on both sides, not a radio. Both print today\'s date, which is volatile and must not be compared.'
    },
    {
      frontend: 'fe-declaration-error',
      prototype: 'dr1-declaration-error',
      note: 'Both the declaration page after submitting without ticking the box. The only error state Design release 1 captured anywhere.'
    },
    {
      frontend: 'fe-confirmation',
      prototype: 'dr1-notification-submitted',
      note: 'The file names disagree and the h1 is identical on both: "Import notification submitted". Both are the confirmation panel after a successful submit, and neither carries any input. The reference shown in the panel is volatile on both sides.'
    }
  ],

  // -------------------------------------------------------------------------
  // Screens the frontend has and Design release 1 does not
  //
  // Two, and both were checked against the prototype's routes rather than
  // against its view list, because both DO have a route on the single router
  // and neither reaches Design release 1. The finding contract already rules
  // that a frontend-only feature is a one-sided observation rather than a
  // defect: Design release 1 says nothing about it, so it cannot be said to
  // disagree.
  // -------------------------------------------------------------------------
  onlyFrontend: [
    {
      screen: 'fe-delete-notification',
      question:
        'Is deleting a notification in scope for this comparison? Design release 1 does not describe it. GET /notifications/delete exists on the prototype\'s router (app/routes.js:10045) but renderDeleteNotificationPage redirects to the dashboard unless isDesignRelease2SessionData passes (app/routes.js:5611-5613), a flag the root mount never sets, and the view it would render has no root copy — app/views/delete-notification.html does not exist, only design-release-2/ and design-release-2.1/ versions. So the frontend deletes and Design release 1 is silent. This absence also shows up on the dashboard: the frontend\'s notification cards offer Resume / Copy as new / Delete and Design release 1\'s offer Copy as new / View.',
      note: 'Checked at the route and the view, not from the file listing alone, because the brief flagged this as a claim to verify rather than repeat.'
    },
    {
      screen: 'fe-cancel-amend',
      question:
        'Is amending a submitted notification in scope for this comparison? Design release 1 offers no amend action anywhere, so cancelling one cannot arise. GET /notifications/cancel-amend exists (app/routes.js:9652) but returns res.redirect("/") unless isDesignRelease2SessionData passes (app/routes.js:9653-9655), and it renders no view even on the releases where it does run — it clears the amend session and redirects. There is no cancel-amend.html at the root of app/views. The frontend has a real page here, headed "Cancel this amendment?".',
      note: 'The prototype has a cancel-amend modal partial, but only under app/views/partials/design-release-2/ and design-release-2.1/, which are other releases\' documents and out of scope for this comparison.'
    }
  ],

  // -------------------------------------------------------------------------
  // Screens Design release 1 has and the frontend does not
  //
  // Nine: the eight address-book captures and Design release 1's form for
  // adding a commercial transporter.
  //
  // THE ADDRESS BOOK IS DELIBERATELY HERE AND MUST NOT BE DROPPED. Both
  // previous runs of this comparison excluded these screens on reasoning that
  // does not survive reading the code, and both then reported complete coverage
  // against a list short by five. This run photographed them. Deciding they are
  // out of scope is a legitimate answer for a person to give; inheriting an
  // exclusion whose stated reason is wrong is not. The entries below carry the
  // evidence either way, and the address-book slice owns the decision.
  //
  // The evidence, stated once here rather than repeated per entry:
  //
  //   - The frontend has no address-book screen of any kind. Its 31 enumerated
  //     screens are the notification journey.
  //   - The frontend's picker offers no way to add an address.
  //     addresses/party-picker/_address-picker.njk is the whole form — a search
  //     input, a Search button, a results table, pagination and Save and
  //     continue — and addresses/copy/copy.en.js has no add-an-address key. The
  //     empty state's only copy is "No addresses match your search.", a dead
  //     end. This is visible in the paired pictures: Design release 1's picker
  //     carries an "Add a new address" button under the table and the
  //     frontend's does not.
  //   - src/server/app/services/address-book/index.js:17-19 states the design:
  //     "This service reads and never writes. The notification journey selects
  //     from the organisation's book; adding, changing and removing the records
  //     in it belongs to the INS frontend, which is the only writer." The module
  //     exposes search, all and party, and nothing that creates or edits.
  //   - Design release 1's address book is unmistakably Design release 1's. The
  //     service navigation's address-book link defaults to /address-book
  //     (app/views/layouts/main.html:16) and the party picker's "add an address"
  //     link points at /address-book/add?from=<section> for every session that
  //     is not DR2.1 (app/routes.js:3598-3600).
  //
  // So the code says where the writer lives; it does not say whether Design
  // release 1 intended these screens to belong to this service. An absence
  // cannot be photographed, so whichever way the slice rules, the frontend side
  // of it has to be argued in words from the citations above.
  // -------------------------------------------------------------------------
  onlyPrototype: [
    {
      screen: 'dr1-address-book',
      band: 'address-book',
      note: 'The saved address book as a page in its own right, headed "Address book", with a search box and a type filter. The frontend has no such page: its journey reads the organisation\'s book through a service that never writes (src/server/app/services/address-book/index.js:17-19) and exposes it only inside the five party pickers. Reached from the service navigation, whose Design release 1 default is /address-book (app/views/layouts/main.html:16).'
    },
    {
      screen: 'dr1-address-book-add',
      band: 'address-book',
      note: 'The address-type chooser, headed "What is the new address for?", a single addressType radio. Rendered only when no ?from= is supplied; arriving from a party picker skips it (app/routes.js:9713-9725). No frontend counterpart — the frontend has no add-an-address route at all.'
    },
    {
      screen: 'dr1-address-book-lookup',
      band: 'address-book',
      note: 'The add-an-address form, headed "Add address details", with an address search over a hidden addressBookLookupAddressId and eleven manual fields behind a reveal (app/views/address-book-lookup.html:137). No frontend counterpart. This is where Design release 1\'s party-picker "add an address" link ends up.'
    },
    {
      screen: 'dr1-address-book-lookup-results',
      band: 'address-book',
      note: 'The same add form after the address search has returned candidates. A state of dr1-address-book-lookup, listed separately because it was captured separately and every captured id must be accounted for. No frontend counterpart, for the same reason as its parent.'
    },
    {
      screen: 'dr1-address-book-lookup-manual',
      band: 'address-book',
      note: 'The same add form with the manual-entry reveal open, showing all eleven fields — name, two address lines, town or city, county, postcode, country, email and phone. A state of dr1-address-book-lookup. No frontend counterpart.'
    },
    {
      screen: 'dr1-address-book-add-from-party-picker',
      band: 'address-book',
      note: 'THE SHARPEST OF THE EIGHT, and the one to read first if the slice is deciding scope. This is the add form reached from a consignment party picker rather than from the address book — the destination of the "add an address" link Design release 1 puts on every picker (app/routes.js:3598-3600, then app/routes.js:9713-9725, which skips the type chooser because ?from= is set). The frontend\'s picker has no such link, so a frontend user whose address is not in the list has nowhere to go. If the finding turns out to be about the missing route out of the picker rather than about five missing pages, this is the screen that shows it.'
    },
    {
      screen: 'dr1-address-book-view',
      band: 'address-book',
      note: 'One saved address, headed with the address\'s own name — "Green Valley Farm" in the capture, so the heading is fixture-derived and not comparable copy. Carries no form controls at all; it is a read-only detail page reached from the list. No frontend counterpart. Note that the frontend\'s pickers do have a per-row "View details" expander, which is a different thing from a page and belongs to the addresses slice, not here.'
    },
    {
      screen: 'dr1-address-book-edit',
      band: 'address-book',
      note: 'Editing a saved address, headed "Edit address and contact details". Shares address-book-lookup.html with the add flow but is a different screen: rendered with isEditMode true, the search hidden and the manual fields already open (app/routes.js:7881-7889). Captured separately because a picture of the add page would show none of that. No frontend counterpart — the frontend never writes to the book.'
    },
    {
      screen: 'dr1-transporter-add-commercial',
      band: 'transport',
      note: 'NOT AN ADDRESS-BOOK SCREEN, and the one genuinely one-sided journey page outside that group. Design release 1 lets a user enter a commercial transporter that is not already in the list: a form headed "Add commercial transporter" collecting an authorisation number and then name, address, country and contact details (transporterCommercialAuthorisationNumber and ten more). The frontend has no equivalent. Its commercial branch is select-only — fe-transporter-commercial is a list of approved transporters with a radio per row and nothing else, and its private branch (fe-transporter-private) collects no authorisation number. So a frontend user whose commercial transporter is not in the reference list cannot proceed. Established by reading the controls on both sides and confirmed in the two screenshots; this is why fe-transporter-commercial is paired with dr1-transporter rather than with this screen.'
    }
  ]
}
