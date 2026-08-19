//
// Screen pairing between the live-animals frontend and Design Release 1.
//
// DR1 is the signed-off definition of the service. This file says which frontend
// screen answers which DR1 screen, so that a finding can put the two pictures side
// by side. It is judgement, not a lookup — the two codebases split the same journey
// into different numbers of pages and name almost nothing the same way.
//
// Get a pairing wrong and the report does not fail. It renders two unrelated pages
// under one heading and invites somebody to write a confident finding about a
// difference that is an artefact of the pairing. That is the most expensive mistake
// available in this file, and it is silent. Every pair below whose correctness is
// not obvious from the two screen names carries a note saying what settled it.
//
// Three structural decisions, made deliberately:
//
// 1. Many-to-one is allowed and is used. DR1 renders one `consignment-address-select`
//    view for five different roles; the frontend has five separate pages. Five pairs
//    onto one prototype screen is the honest shape. The order of those pairs matters:
//    the loader's `indexPairs` collects every counterpart but `screenPairsFor` takes
//    the first, so the first pair listed for a screen is the one the report shows by
//    default. Place-of-origin leads the address block because that is the role DR1
//    was photographed in. The populated dashboard leads the dashboard block for the
//    same reason.
//
// 2. A prototype state pairs with the frontend screen that renders the same form,
//    where the frontend renders that state at all. DR1 contributes 17 states —
//    reveals, error states, filters open, file chosen, scanning, selected, complete,
//    results, after submission — and they are states of a page rather than extra
//    pages. Where the frontend shows the same state on the same screen, the state is
//    paired and the note says which side is the uncaptured one. Where the rule behind
//    the state does not exist in the frontend at all, the state is `onlyPrototype`.
//    No screen is left out of all three lists: the report calls that "this screen is
//    not in pairs.js", which tells a reader nothing.
//
// 3. Exit date, port of exit and destination country ARE in DR1. The handover recorded
//    that DR1 has no exit-date, port-of-exit or destination-country view, which is true
//    of the view files and false of the questions. All three are conditional reveals on
//    `reason-for-import`, revealed by the reason the user picks. They are paired, not
//    listed as one-sided. That correction is why `onlyFrontend` holds two entries here
//    rather than the ten the handover expected.
//
module.exports = {
  pairs: [
    // ---- Dashboard -------------------------------------------------------------
    // DR1 photographed its dashboard with four notifications in the list, so the
    // populated frontend dashboard is the like-for-like state and leads the block.
    { frontend: 'fe-dashboard-populated', prototype: 'dr1-dashboard' },
    {
      frontend: 'fe-dashboard-empty',
      prototype: 'dr1-dashboard',
      note: 'the same prototype screen. DR1 has no empty-dashboard capture, so this pair holds an empty frontend list against a populated prototype one — read it for the page furniture around the list, not for the list'
    },
    {
      frontend: 'fe-dashboard-populated',
      prototype: 'dr1-dashboard-filters-open',
      note: 'DR1 keeps its filters in three collapsible sections — Search by, Status, By date — and this is them open. The frontend has no toggle: its one filter is a keyword box that is always on the page, so the populated dashboard is the whole of the frontend filter surface'
    },
    {
      frontend: 'fe-dashboard-populated',
      prototype: 'dr1-dashboard-after-submission',
      note: 'the DR1 dashboard reached by submitting a notification. The frontend capture holds a draft, so its post-submission list is uncaptured rather than absent. Same page, different data'
    },

    // ---- The notification spine ------------------------------------------------
    { frontend: 'fe-hub', prototype: 'dr1-notification-hub' },
    { frontend: 'fe-origin', prototype: 'dr1-origin-of-the-import' },
    { frontend: 'fe-import-reason', prototype: 'dr1-reason-for-import' },
    {
      frontend: 'fe-import-reason',
      prototype: 'dr1-reason-for-import-error',
      note: 'the validation state of the same radio group. The frontend validates the same question on the same page, so this pair compares error handling rather than two pages'
    },

    // The four reveals. DR1 asks four follow-up questions inline on reason-for-import
    // that the frontend asks on four pages of its own. Each reveal is paired to the
    // frontend page for the question it is the sole DR1 home of, so that no frontend
    // page and no reveal is counted twice.
    {
      frontend: 'fe-import-purpose',
      prototype: 'dr1-reason-for-import-internal-market-revealed',
      note: 'DR1 asks the purpose in the internal market as a conditional reveal under the Internal market radio — twelve options, same wording. The frontend asks it on a page of its own'
    },
    {
      frontend: 'fe-destination-country',
      prototype: 'dr1-reason-for-import-transhipment-revealed',
      note: 'destination country is the only field the transhipment reveal adds, which makes it the closest DR1 comes to the frontend page. Destination country also appears in the transit reveal; it is paired here because here it stands alone'
    },
    {
      frontend: 'fe-port-of-exit',
      prototype: 'dr1-reason-for-import-transit-revealed',
      note: 'the transit reveal adds port of exit and destination country together. Paired to port of exit because the transhipment reveal already carries destination country on its own'
    },
    {
      frontend: 'fe-exit-date',
      prototype: 'dr1-reason-for-import-temporary-admission-horses-revealed',
      note: 'the temporary-admission reveal adds exit date and port of exit. Paired to exit date because this is the only screen in DR1 that asks for an exit date at all'
    },

    { frontend: 'fe-commodity-search', prototype: 'dr1-what-are-you-importing' },
    {
      frontend: 'fe-commodity-search',
      prototype: 'dr1-what-are-you-importing-results',
      note: 'DR1 asks for a commodity through a search box that opens a results panel. The frontend renders the whole species list on the page and has no search at all, so its single screen answers both DR1 states. The frontend screen name is misleading — there is nothing to search'
    },
    { frontend: 'fe-consignment-details', prototype: 'dr1-consignment-details' },
    {
      frontend: 'fe-animal-identification',
      prototype: 'dr1-animal-identification-details'
    },
    {
      frontend: 'fe-additional-details',
      prototype: 'dr1-additional-animal-details',
      note: 'the h1s differ — "Additional animal details" against "Additional details" — but both ask what the animals are certified for and whether the consignment holds unweaned animals'
    },
    { frontend: 'fe-arrival-details', prototype: 'dr1-arrival-details' },
    { frontend: 'fe-transit-countries', prototype: 'dr1-transit-countries' },
    {
      frontend: 'fe-transit-countries',
      prototype: 'dr1-transit-countries-selected',
      note: 'DR1 builds the list one country at a time through a type-ahead and shows what has been added with Remove links. The frontend ticks checkboxes on a fixed list, so its selected state is the same screen with boxes ticked'
    },

    // ---- Transport -------------------------------------------------------------
    // The two sides order this task in opposite directions, and the obvious pairing
    // by screen name is the wrong one. DR1 goes list -> add -> type -> form. The
    // frontend goes type -> list, or type -> form. So DR1's /transporter is a
    // selection page and the frontend's /transporters is a branch question.
    {
      frontend: 'fe-transporter-type',
      prototype: 'dr1-transporter-add',
      note: 'both ask commercial or private. DR1 asks it only after you have searched the approved list and want to add a record that is not on it; the frontend asks it first and branches the journey on the answer. Same question, opposite position in the task'
    },
    {
      frontend: 'fe-transporter-commercial',
      prototype: 'dr1-transporter',
      note: 'DR1\'s /transporter is the approved-transporter list — a search box over a table of approved records with a radio per row. The frontend page that does that job is the commercial select page, not fe-transporter-type, which asks a different question'
    },
    {
      frontend: 'fe-transporter-private',
      prototype: 'dr1-transporter-add-private',
      note: 'near-identical field sets — name, five address lines, country, phone, email. DR1 reaches it as an address-book add and the frontend as a journey page, but the form is the same form'
    },

    // ---- Documents -------------------------------------------------------------
    { frontend: 'fe-documents-empty', prototype: 'dr1-upload-documents' },
    {
      frontend: 'fe-documents-populated',
      prototype: 'dr1-upload-documents-populated'
    },
    {
      frontend: 'fe-documents-empty',
      prototype: 'dr1-upload-documents-file-chosen',
      note: 'DR1 uses a drop zone that names the chosen file before the row is saved. The frontend uses a plain file input, which the browser labels itself, so there is no separate frontend state to capture'
    },
    {
      frontend: 'fe-documents-empty',
      prototype: 'dr1-upload-documents-error',
      note: 'the empty-row validation state, reached from Save and add another. The frontend validates the same row on the same page'
    },
    {
      frontend: 'fe-documents-empty',
      prototype: 'dr1-upload-documents-continue-error',
      note: 'DR1 validates the row at two exits, Save and add another and Save and continue, and the messages differ between them. The frontend has one page and one set of messages, so both DR1 states pair to it'
    },
    {
      frontend: 'fe-documents-populated',
      prototype: 'dr1-upload-documents-populated-scanning',
      note: 'DR1 shows a Scanning status on the uploaded row. The frontend row in the capture already reads Safe, so the frontend does carry a scan status and this state is uncaptured rather than absent'
    },

    // ---- Addresses -------------------------------------------------------------
    { frontend: 'fe-addresses-hub', prototype: 'dr1-roles-and-addresses' },
    {
      frontend: 'fe-addresses-hub',
      prototype: 'dr1-roles-and-addresses-complete',
      note: 'the answered state of the same hub. The frontend shot is the unanswered one, so read this pair for how an answered row is presented rather than for the set of rows'
    },

    // One DR1 view, parameterised by role, against five frontend pages. DR1 was
    // photographed at /place-of-origin, so that role leads: it is the pair the report
    // shows when it starts from the prototype side.
    {
      frontend: 'fe-address-picker-place-of-origin',
      prototype: 'dr1-consignment-address-select',
      note: 'DR1 has one address-picker view for all five roles and it was captured in the place-of-origin role. The other four frontend pickers pair to the same screen below'
    },
    {
      frontend: 'fe-address-picker-consignor-or-exporter',
      prototype: 'dr1-consignment-address-select',
      note: 'same DR1 view, consignor role. The DR1 picture is of the place-of-origin role, so read the heading difference as the parameterisation and not as a finding'
    },
    {
      frontend: 'fe-address-picker-consignee',
      prototype: 'dr1-consignment-address-select',
      note: 'same DR1 view, consignee role'
    },
    {
      frontend: 'fe-address-picker-importer',
      prototype: 'dr1-consignment-address-select',
      note: 'same DR1 view, importer role'
    },
    {
      frontend: 'fe-address-picker-place-of-destination',
      prototype: 'dr1-consignment-address-select',
      note: 'same DR1 view, place-of-destination role'
    },

    { frontend: 'fe-contact', prototype: 'dr1-contact-address-for-consignment' },
    { frontend: 'fe-cph-number', prototype: 'dr1-cph-number' },

    // ---- End of the journey ----------------------------------------------------
    {
      frontend: 'fe-check-answers',
      prototype: 'dr1-review-notification',
      note: 'the frontend calls it Check your answers and DR1 calls it Review your notification. Same gate, same position: the last screen before the declaration'
    },
    { frontend: 'fe-declaration', prototype: 'dr1-declaration' },
    { frontend: 'fe-confirmation', prototype: 'dr1-notification-submitted' }
  ],

  // Frontend screens with no DR1 counterpart.
  //
  // Two, not the ten the handover expected. Eight of the candidates turned out to be
  // paired: three are conditional reveals on DR1's reason-for-import rather than
  // absences, and the transporter task splits differently rather than missing pages.
  // What is left is delete and amend, and both are absent for the same reason — the
  // prototype gates them on a design-release-2 session flag that a DR1 user never has,
  // so the handler redirects to `/`. Neither is folded into another DR1 page: DR1's
  // dashboard card offers Copy as new and View only, where the frontend's offers
  // Resume, Copy as new and Delete.
  onlyFrontend: [
    {
      screen: 'fe-delete-notification',
      question:
        'DR1 has not folded delete into another page — a DR1 user cannot delete a notification at all, and the dashboard card carries no Delete link. Is the frontend delete journey in scope for DR1 parity, or is it a DR2 feature that shipped early?'
    },
    {
      screen: 'fe-cancel-amend',
      question:
        'DR1 has no amend journey, so there is nothing to cancel. Amend and cancel-amend sit behind the same design-release-2 session guard as delete. Same question: is the frontend amend journey in scope for DR1 parity?'
    }
  ],

  // DR1 screens with no frontend counterpart. Four, and each is a rule the frontend
  // does not have rather than a picture nobody took.
  onlyPrototype: [
    {
      screen: 'dr1-dashboard-filters-date-picker-open',
      band: 'dashboard filters',
      note: 'the calendar widget inside DR1\'s By date filter. The frontend dashboard filters on a keyword only — no status filter and no date filter — so there is no state to pair'
    },
    {
      screen: 'dr1-permanent-address-animals',
      band: 'permanent address',
      note: 'DR1 asks, per animal, whether its permanent address is the place of destination or a new address. The frontend has no permanent-address question anywhere in the journey. The sibling view permanent-address.html is orphaned in the prototype — nothing renders it — so only this one is in the DR1 screen set'
    },
    {
      screen: 'dr1-transporter-add-commercial',
      band: 'transport',
      note: 'the form that adds a new commercial transporter to the approved list. The frontend can only select a commercial transporter from the list it is given; it has no way to add one'
    },
    {
      screen: 'dr1-upload-documents-limit-error',
      band: 'documents',
      note: 'DR1 caps uploads at fifteen files and says so both in the guidance and in this error. The frontend states no file-count limit at all, so no frontend state can correspond'
    }
  ]
}
