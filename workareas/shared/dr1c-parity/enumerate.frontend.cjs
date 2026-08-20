//
// Which screens does the live-animals frontend have?
//
// Read from the frontend's source, never from a browser. That is the whole
// point: an answer that costs nothing, re-runs identically, and cannot be wrong
// about a screen it failed to reach — because it never has to reach one. What
// it cannot tell you is whether a screen is reachable in the state a spec puts
// the application in. That is what the capture answers, and
// `tim parity coverage` diffs the two rather than trusting either alone.
//
// CommonJS and hand-authored, the way pairs.cjs is: this is knowledge about one
// application, not reusable code.
//
// This file is assembled into enumerate.cjs beside the prototype enumerator.
// It exports the frontend function on its own.
//
// ---------------------------------------------------------------------------
// The four facts that make this application readable from source
// ---------------------------------------------------------------------------
//
// 1. EVERY SCREEN IS ONE `const view` DECLARATION, AND THERE ARE NO OTHERS.
//
//    Nothing under src/server/app/ calls `h.view` except a feature controller,
//    and every one of those calls is `h.view(view, …)` against a module-level
//    constant of the form:
//
//        const view = `${TEMPLATES}/features/<path>`
//
//    (origin/controller.js:33, hub/controller.js:28, and twenty-five more —
//    the module lists them all at run time, with line numbers, in each `why`.)
//    TEMPLATES is the one string 'live-animals/journeys/linear', declared at
//    journeys/linear/config.js:1, so the `<path>` after `features/` is the
//    template's own path under the features tree.
//
//    This is a much better handle than the route table. Routes here are built
//    by helpers — kit.pageRoutes(page, {get, post}) at shared/kit.js:137,
//    PARTIES.flatMap(…) at addresses/party-picker/party-picker.controller.js:125
//    — so the paths are computed, not literal, and several GET routes serve no
//    screen at all (fact 4). A view constant is a string literal in every case.
//
// 2. THE VIEW CONSTANTS AND THE TEMPLATE FILES AGREE EXACTLY, SO EACH CHECKS
//    THE OTHER.
//
//    There are 27 view constants and 27 non-partial .njk files under
//    features/, and they are the same 27 paths. Partials are prefixed with an
//    underscore — _address-picker.njk, _identification-card.njk,
//    _selected-commodities-table.njk, _species-quantities.njk — which is the
//    repo's own convention.
//
//    So this module reads both and reconciles them. A template no controller
//    renders is a screen that is not a screen; a view constant with no file is
//    a stale read. Either way it throws rather than quietly returning a shorter
//    list, because a quietly shorter list reads as a screen nobody built.
//
// 3. ONE TEMPLATE SERVES FIVE SCREENS. party-picker.njk is rendered once per
//    consignment party: parties.js:20-57 declares five, and the picker
//    controller maps over them (party-picker.controller.js:125). CONTACT_PARTY
//    sits directly below the array with the same shape and is deliberately not
//    one of them (parties.js:59-61) — contact has its own page and its own
//    template. The array is bracket-matched for exactly that reason.
//
// 4. A GET ROUTE IS NOT ALWAYS A SCREEN, AND A CONTROLLER IS NOT ALWAYS A PAGE.
//
//    - documents/controller.js:322 and :328 register two further GETs, a status
//      fragment and a file download. Neither renders a view, so neither appears
//      here.
//    - notification-actions/controller.js:44-51 registers a POST and nothing
//      else: "copy this notification" is an action, not a page.
//    - dashboard/controller.js:129 and :135 are POST-only (amend, create).
//    - Outside app/, src/server/signout redirects (signout/controller.js:3-7)
//      and src/server/auth/unauthorised.njk is an auth error page. Neither is
//      part of the notification journey and neither has a Design release 1
//      counterpart, so both are out of scope for this comparison — stated here
//      rather than silently dropped.
//
// ---------------------------------------------------------------------------
// Pages, not states
// ---------------------------------------------------------------------------
//
// This lists pages. `tim parity coverage` attributes a captured
// `<screen>-<state>` to `<screen>` by prefix (tim/src/parity/coverage.js:84-91),
// so the empty and populated dashboards, the five animal-identification
// variants and the rest are counted against the page they belong to and are not
// named here. The consequence is deliberate and worth knowing: a capture that
// only ever shoots `fe-dashboard-empty` and `fe-dashboard-populated` leaves
// `fe-dashboard` reported missing. That is the correct report — it says the
// corpus has no picture of the page under its own name — and the fix belongs in
// the capture spec, not in this list.
//
const fs = require('fs')
const path = require('path')

const SET = 'src/server/app/sets/live-animals'
const JOURNEY = `${SET}/journeys/linear`
const FEATURES = `${JOURNEY}/features`
const CONFIG = `${JOURNEY}/config.js`
const FLOW = `${JOURNEY}/flow/flow.js`
const PARTIES = `${FEATURES}/addresses/parties.js`

// Fact 1. The prefix every view constant is built from. Asserted against
// config.js rather than assumed, because the whole read hangs off it.
const TEMPLATES = 'live-animals/journeys/linear'

/**
 * The corpus screen id for a view, where it is not the view's own folder name.
 *
 * The source names a template for the thing it collects; the captures name it
 * for what the user sees, and the two earlier corpora have already fixed that
 * vocabulary. Where they differ the corpus id wins — a name that does not match
 * reports one screen as both missing and unexplained at once.
 */
const SCREEN_OF_VIEW = {
  'addresses/template': 'addresses-hub',
  'commodities/search/search': 'commodity-search',
  'transport/port-of-entry/port-of-entry': 'arrival-details',
  'transport/transporters/transporters': 'transporter-type',
  'transport/transporters-select/transporters-select': 'transporter-commercial',
  'transport/private-transporter-details/private-transporter-details':
    'transporter-private'
}

// The corpus id for each party's picker. Four of the five are the party id in
// kebab case, but consignor is filed as consignor-or-exporter, so the table is
// written out rather than derived.
const SCREEN_OF_PARTY = {
  placeOfOrigin: 'address-picker-place-of-origin',
  consignor: 'address-picker-consignor-or-exporter',
  consignee: 'address-picker-consignee',
  importer: 'address-picker-importer',
  placeOfDestination: 'address-picker-place-of-destination'
}

/**
 * How a user gets to each screen.
 *
 * `coverage` prints this beside a screen that was never captured, and it is the
 * sentence that tells the next person whether the gap is a spec nobody wrote or
 * a screen that genuinely cannot be reached. So it says what a spec would have
 * to arrange, not what the screen contains.
 *
 * Hand-written, one per screen, and deliberately not derived: "what has to be
 * true before this page renders" is the judgement, and a rule that produced it
 * mechanically would be producing it wrongly.
 */
const REACHED_BY = {
  'fe-dashboard':
    'The service root, GET / (dashboard/controller.js:123-124). No journey state needed. Photographed empty and populated in earlier runs.',
  'fe-hub':
    'GET /notifications/{journeyId} (hub/controller.js:172-173). The task list a journey returns to after every save; reached from the dashboard, or from the first save on origin.',
  'fe-origin':
    'The entry page. Any deep link into a journey with no opening run and no committed answer is redirected here (flow/entry-guard.js:45-57), so it is the one journey screen that needs no prior state.',
  'fe-commodity-search':
    'GET /notifications/{id}/commodities. First page of the commodities task; needs a started journey.',
  'fe-consignment-details':
    'GET /notifications/{id}/consignment-details. Follows a committed commodity selection — with no selected lines there is nothing to detail.',
  'fe-animal-identification':
    'GET /notifications/{id}/commodities/identification. Needs at least one commodity line. Species-specific variants (horse, fish) and the saved and at-maximum states are states of this page.',
  'fe-import-reason':
    'GET /notifications/{id}/import-reason. Unconditional step of the consignment section (flow/flow.js:49-58).',
  'fe-import-purpose':
    'GET /notifications/{id}/import-purpose. Follows import reason in the same section.',
  'fe-destination-country':
    'GET /notifications/{id}/destination-country. Behind the conditional exitDetails task row (flow/task-rows.js:35-39) — a spec must first choose an import reason that puts exit details in scope, such as transhipment or transit.',
  'fe-port-of-exit':
    'GET /notifications/{id}/port-of-exit. Same conditional exitDetails row as destination country (flow/task-rows.js:35-39).',
  'fe-exit-date':
    'GET /notifications/{id}/exit-date. Same conditional exitDetails row (flow/task-rows.js:35-39).',
  'fe-additional-details':
    'GET /notifications/{id}/additional-details. Its own hub task row (flow/task-rows.js:40).',
  'fe-documents':
    'GET /notifications/{id}/accompanying-documents. Empty and populated are states of this page; the same controller also serves a status fragment and a file download, which are not screens (documents/controller.js:322, :328).',
  'fe-addresses-hub':
    'GET /notifications/{id}/addresses. The spoke list for the five party pickers, and the only link into the CPH page (addresses/controller.js:29).',
  'fe-cph-number':
    'GET /notifications/{id}/cph-number. Linked from the addresses hub only when a commodity line triggers CPH (obligations/sections/commodities/aggregates.js:18-24), so a spec must pick a CPH-triggering commodity first.',
  'fe-arrival-details':
    'GET /notifications/{id}/port-of-entry. First page of the movement section.',
  'fe-transit-countries':
    'GET /notifications/{id}/transit-countries. Behind the conditional transitCountries task row (flow/task-rows.js:47).',
  'fe-transporter-type':
    'GET /notifications/{id}/transporters. Asks transporterType, which decides which of the two screens below comes next (obligations/sections/transport.js:27-31).',
  'fe-transporter-commercial':
    'GET /notifications/{id}/transporters/select. In scope only when transporterType is Commercial (obligations/sections/transport.js:35-48), so a spec must answer the transporter-type page that way first.',
  'fe-transporter-private':
    'GET /notifications/{id}/transporters/private. In scope only when transporterType is Private (obligations/sections/transport.js:50-63) — the mirror of the commercial screen, and never reachable in the same run.',
  'fe-contact':
    'GET /notifications/{id}/consignment/contact/select. Picks from the same address book as the party pickers but is deliberately not one of them (addresses/parties.js:59-61).',
  'fe-check-answers':
    'GET /notifications/{id}/notification-view. Behind the review gate, scope.readyForCheckYourAnswers (flow/flow.js:83), so every mandatory obligation must be answered first. The submitted view is a state of this page.',
  'fe-declaration':
    'GET /notifications/{id}/declaration. Same review gate as check answers (flow/flow.js:83-84).',
  'fe-confirmation':
    'GET /notifications/{id}/confirmation. Reached only by a successful submit from the declaration page (declaration/controller.js:89).',
  'fe-cancel-amend':
    'GET /notifications/{id}/cancel-amend. The GET redirects away unless the journey is in AMEND (cancel-amend/controller.js:41-45), so a spec must submit a notification and start an amendment before this screen exists at all.',
  'fe-delete-notification':
    'GET /notifications/{id}/delete. The GET redirects to the dashboard unless the journey is DRAFT, SUBMITTED or AMEND (delete-notification/controller.js:37-39).'
}

/** The sentence for one party picker. All five differ only in copy. */
const reachedByPicker = (party) =>
  `GET /notifications/{id}/${party.slug}, one of the five consignment-party pickers declared as data in addresses/parties.js and served by one controller (party-picker.controller.js:125-138). Reached from the addresses hub.`

/** Every file under a directory, recursively. */
const filesUnder = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? filesUnder(full) : [full]
  })

const lineOf = (source, index) => source.slice(0, index).split('\n').length

/**
 * Every view a feature controller declares, with the file and line that
 * declares it. Fact 1.
 *
 * Read with a regex rather than by importing anything: a view constant is a
 * string literal, and importing the controller would pull in hapi, the
 * obligation model and the whole engine.
 *
 * @param {string} featuresDir
 * @returns {Array<{view: string, file: string, line: number}>}
 */
const viewsDeclared = (featuresDir) => {
  const found = []
  for (const file of filesUnder(featuresDir)) {
    if (!file.endsWith('.js') || file.endsWith('.test.js')) continue
    const source = fs.readFileSync(file, 'utf8')
    const pattern = /const view = `\$\{TEMPLATES\}\/features\/([^`]+)`/g
    let match
    while ((match = pattern.exec(source))) {
      found.push({
        view: match[1],
        file: path.relative(featuresDir, file),
        line: lineOf(source, match.index)
      })
    }
  }
  return found
}

/**
 * Every template file that is not a partial. Fact 2.
 *
 * @param {string} featuresDir
 * @returns {string[]} Paths relative to features/, without the extension
 */
const templateFiles = (featuresDir) =>
  filesUnder(featuresDir)
    .filter((file) => file.endsWith('.njk'))
    .filter((file) => !path.basename(file).startsWith('_'))
    .map((file) => path.relative(featuresDir, file).replace(/\.njk$/, ''))

/**
 * The body of one array literal, as text.
 *
 * Bracket-matched so that PARTIES stops where PARTIES stops. CONTACT_PARTY sits
 * directly below it and has the same shape; reading past the closing bracket
 * would add a sixth picker that no address hub links to. Fact 3.
 */
const arrayBody = (source, at) => {
  let depth = 0
  for (let i = at; i < source.length; i += 1) {
    if (source[i] === '[') depth += 1
    else if (source[i] === ']') {
      depth -= 1
      if (depth === 0) return source.slice(at, i + 1)
    }
  }
  return source.slice(at)
}

/**
 * The five consignment parties, in the order the addresses hub lists them.
 *
 * @param {string} source - addresses/parties.js
 * @returns {Array<{id: string, slug: string}>}
 */
const parties = (source) => {
  const body = arrayBody(
    source,
    source.indexOf('[', source.indexOf('export const PARTIES'))
  )
  const entry = /id:\s*'([^']+)',\s*role:\s*'[^']+',\s*slug:\s*'([^']+)'/g
  return [...body.matchAll(entry)].map((match) => ({
    id: match[1],
    slug: match[2]
  }))
}

/** The feature folders the journey definition sequences a page from. */
const flowFeatures = (source) =>
  new Set(
    [...source.matchAll(/from '\.\.\/features\/(.+)\/page\.js'/g)].map(
      (match) => match[1]
    )
  )

/**
 * The corpus screen id for a view path.
 *
 * A single-page feature keeps its template in `<feature>/template.njk`, so the
 * name is the folder above it; a feature with several pages names each template
 * for itself. Both reduce to "the last segment that is not `template`".
 */
const screenOfView = (view) => {
  if (SCREEN_OF_VIEW[view]) return SCREEN_OF_VIEW[view]
  const segments = view.split('/')
  const last = segments[segments.length - 1]
  return last === 'template' ? segments[segments.length - 2] : last
}

/**
 * Refuse to answer on a stale read.
 *
 * Three things would make this module quietly wrong, and each of them makes it
 * throw instead: the template prefix moving, a view constant with no file
 * behind it, and a template no controller renders.
 */
const reconcile = ({ repoPath, declared, templates }) => {
  const config = fs.readFileSync(path.join(repoPath, CONFIG), 'utf8')
  if (!config.includes(`export const TEMPLATES = '${TEMPLATES}'`)) {
    throw new Error(
      `${CONFIG} no longer declares TEMPLATES = '${TEMPLATES}'. Every view constant is read through that prefix, so update this module before trusting its answer.`
    )
  }

  const onDisk = new Set(templates)
  const rendered = new Set(declared.map((entry) => entry.view))

  const missingFile = [...rendered].filter((view) => !onDisk.has(view)).sort()
  if (missingFile.length > 0) {
    throw new Error(
      `${FEATURES}: a controller renders ${missingFile.join(', ')}, but no such .njk file exists. The read has gone stale.`
    )
  }

  const unrendered = [...onDisk].filter((view) => !rendered.has(view)).sort()
  if (unrendered.length > 0) {
    throw new Error(
      `${FEATURES}: ${unrendered.join(', ')}.njk exists but no controller declares it as a view. Either it is a partial that needs an underscore prefix, or it is a screen this module cannot see.`
    )
  }
}

/**
 * The frontend's screens: one per view a feature controller renders, with the
 * address-book picker expanded once per consignment party.
 *
 * @param {object} args
 * @param {string} args.repoPath - The frontend checkout
 * @returns {Array<{screen: string, why: string}>}
 */
const frontendScreens = ({ repoPath }) => {
  const featuresDir = path.join(repoPath, FEATURES)
  const declared = viewsDeclared(featuresDir)
  reconcile({ repoPath, declared, templates: templateFiles(featuresDir) })

  const sequenced = flowFeatures(
    fs.readFileSync(path.join(repoPath, FLOW), 'utf8')
  )
  const onJourney = (view) =>
    [...sequenced].some(
      (feature) => view === feature || view.startsWith(`${feature}/`)
    )

  const partyList = parties(
    fs.readFileSync(path.join(repoPath, PARTIES), 'utf8')
  )
  if (partyList.length === 0) {
    throw new Error(
      `${PARTIES}: no consignment parties parsed. Five pickers would silently disappear from the comparison.`
    )
  }

  const found = []
  for (const { view, file, line } of declared) {
    const source = `${FEATURES}/${file}:${line}`
    const off = onJourney(view)
      ? ''
      : ' flow/flow.js sequences no page from this feature, so it sits beside the journey rather than being a step in it.'

    // Fact 3: this one view is rendered once per party.
    if (view.endsWith('party-picker/party-picker')) {
      for (const party of partyList) {
        found.push({
          screen: `fe-${SCREEN_OF_PARTY[party.id] ?? party.id}`,
          why: `${reachedByPicker(party)} Rendered by ${source}.`
        })
      }
      continue
    }

    const screen = `fe-${screenOfView(view)}`
    // A screen with no note is a screen nobody has thought about the reach of.
    // Say so in the output rather than printing an empty sentence.
    const note =
      REACHED_BY[screen] ??
      `No reachability note for ${screen}. It renders, but nobody has written down what a spec must arrange to reach it — treat a gap here as unexplained rather than expected.`
    found.push({ screen, why: `${note} Rendered by ${source}.${off}` })
  }

  return found.sort((a, b) => a.screen.localeCompare(b.screen))
}

module.exports = frontendScreens
module.exports.frontendScreens = frontendScreens
