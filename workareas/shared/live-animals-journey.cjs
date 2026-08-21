//
// The journey the live-animals frontend defines, in the corpus's vocabulary.
//
// `tim` imports the frontend's own flow.js for the ORDER — the ten sections,
// their pages, the sequence — so none of that is repeated here. A copy would
// go stale the first time somebody moves a page, and go stale in silence,
// because nothing would be left to disagree with it.
//
// What flow.js cannot supply is the name each page goes by in this comparison.
// The source names a page for the feature that owns it; the captures name a
// screen for what the user sees, and nine of the twenty-three disagree. That
// bridge is knowledge about this comparison rather than about either
// application, so it lives beside the enumerators — which already speak both
// languages — rather than inside tim.
//
// Pure data, read at require time and nothing else. The enumerators beside
// this file do their filesystem reads when called, deliberately, so that
// requiring them is safe when the frontend checkout is missing; this module
// must not be the thing that takes that away.
//

/**
 * Every flow page id, and the corpus screen it is filed under.
 *
 * Written out in full rather than defaulting to `fe-<page id>`, for two
 * reasons. Three page ids are camelCase — consignmentDetails,
 * animalIdentification, cphNumber — while every screen id in the corpus is
 * kebab, so there is no spelling of the default that is right for all of them.
 * And six more are outright renames, where the feature that owns the page and
 * the thing the user is looking at have different names: a page collecting
 * `accompanying-documents` renders the screen the captures call `fe-documents`.
 *
 * The consequence of writing it out is the useful one: a page added to flow.js
 * arrives here unmapped and is reported as such, rather than being guessed at
 * and filed under a screen id that no capture will ever match.
 *
 * Keys are deliberately in alphabetical order. Journey order comes from
 * flow.js and only from flow.js.
 */
const screenOfPage = {
  'accompanying-documents': 'fe-documents',
  'additional-details': 'fe-additional-details',
  addresses: 'fe-addresses-hub',
  animalIdentification: 'fe-animal-identification',
  commodities: 'fe-commodity-search',
  confirmation: 'fe-confirmation',
  'consignment-contact-select': 'fe-contact',
  consignmentDetails: 'fe-consignment-details',
  cphNumber: 'fe-cph-number',
  dashboard: 'fe-dashboard',
  declaration: 'fe-declaration',
  'destination-country': 'fe-destination-country',
  'exit-date': 'fe-exit-date',
  'import-purpose': 'fe-import-purpose',
  'import-reason': 'fe-import-reason',
  'notification-view': 'fe-check-answers',
  origin: 'fe-origin',
  'port-of-entry': 'fe-arrival-details',
  'port-of-exit': 'fe-port-of-exit',
  'private-transporter-details': 'fe-transporter-private',
  'transit-countries': 'fe-transit-countries',
  transporters: 'fe-transporter-type',
  'transporters-select': 'fe-transporter-commercial'
}

/**
 * The heading for each of flow.js's ten sections.
 *
 * Section ids are code identifiers and one of them is camelCase, so none of
 * them can be shown to a person as they stand. These are the words somebody
 * triaging a finding would use for that part of the journey.
 *
 * "Consignment" rather than "Consignment details", because the commodities
 * section already contains a page of that name and two headings a word apart
 * would read as the same place twice.
 */
const sectionLabels = {
  start: 'Start',
  origin: 'Origin',
  commodities: 'Commodities',
  animalIdentification: 'Animal identification',
  consignment: 'Consignment',
  documents: 'Documents',
  addresses: 'Addresses',
  transport: 'Transport',
  contact: 'Contact',
  review: 'Review and submit'
}

/**
 * Screen headings the derivation gets wrong.
 *
 * A heading is otherwise made by dropping the `fe-` prefix and sentence-casing
 * the kebab, which is right for most of the corpus — `fe-arrival-details`
 * becomes "Arrival details" and wants no help. Only the exceptions belong
 * here, because every entry is one more thing to keep in step with a screen id
 * that may be renamed without anybody thinking to look in this file.
 *
 * Three kinds of exception, and nothing else: an initialism the casing rule
 * flattens, a screen id whose words are in the order the code wanted rather
 * than the order English wants, and the five party pickers, where the picker
 * and the party it is for run together into one unreadable phrase.
 */
const screenLabels = {
  'fe-cph-number': 'CPH number',
  'fe-transporter-commercial': 'Commercial transporter',
  'fe-transporter-private': 'Private transporter',
  'fe-address-picker-place-of-origin': 'Address picker: place of origin',
  'fe-address-picker-consignor-or-exporter':
    'Address picker: consignor or exporter',
  'fe-address-picker-consignee': 'Address picker: consignee',
  'fe-address-picker-importer': 'Address picker: importer',
  'fe-address-picker-place-of-destination':
    'Address picker: place of destination'
}

module.exports = {
  side: 'frontend',
  flowPath: 'src/server/app/sets/live-animals/journeys/linear/flow/flow.js',
  screenOfPage,
  sectionLabels,
  screenLabels
}
