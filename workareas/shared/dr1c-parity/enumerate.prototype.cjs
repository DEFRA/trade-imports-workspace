//
// Which screens does Design Release 1 have?
//
// Read from the prototype's source, never from a browser. `tim parity coverage`
// diffs this list against what the capture actually photographed, and the diff
// is honest for one structural reason: it cannot be wrong about a screen it
// never reached, because it never has to reach one.
//
// CommonJS and hand-authored, the way pairs.cjs is: this is knowledge about one
// application, not reusable code.
//
// ---------------------------------------------------------------------------
// The application, and the five facts that make DR1 readable from its source
// ---------------------------------------------------------------------------
//
// `repoPath` is a checkout of the GOV.UK Prototype Kit app at
// defra-design/GB-notification-service. One codebase serves four journeys:
// Design release 1, Design release 2, Design release 2.1 and a testing version.
// Telling them apart is the whole job — get it wrong and this file describes a
// different release.
//
//   FACT 1 — One router, four mounts, and the ROOT mount is DR1.
//     app/routes.js builds a single router (routes.js:7,
//     `govukPrototypeKit.requests.setupRouter()`) and every route in the file is
//     registered on it. At the very bottom, routes.js:10994-10997 calls
//     mountTestingVersion / mountDesignRelease21Version /
//     mountDesignRelease2Version, and each of those copies the WHOLE route stack
//     under a base path (lib/version-mount.js:336-353, `copyRouterStack`). So
//     the route table is identical on all four mounts; only the root mount, with
//     no prefix, is DR1.
//
//     The application says so itself. app/views/index.html — the release chooser
//     — describes Design release 1 as "The current design release journey at the
//     root URLs" and points its start button at /create-notification, while the
//     other three point at /design-release-2, /design-release-2.1 and /testing.
//
//   FACT 2 — Views override, they do not replace, and DR1 has no folder.
//     The mount middleware wraps res.render so that a view name is rewritten to
//     `<viewFolder>/<name>` only when that release has its own copy
//     (version-mount.js:143-158 `versionViewExists`, applied at
//     version-mount.js:292-303). app/views has folders for design-release-2,
//     design-release-2.1 and testing, and none for DR1 — so DR1's views are
//     exactly the loose .html files at the root of app/views.
//
//   FACT 3 — Two release gates, not one, and both are absent at the root mount.
//     The mount middleware sets a session flag (version-mount.js:226,
//     `nest[versionFlag] = true`) and a set of res.locals
//     (version-mount.js:248, from each release's `setupLocals`). Handlers gate on
//     one of two things:
//       (a) `isDesignRelease2SessionData(req.session.data)` — routes.js:6207,
//           true when _isDesignRelease2Version or _isDesignRelease21Version is
//           set. Gates the templates and dashboard-tab pages.
//       (b) `res.locals.isDesignRelease2Version` — set only by
//           lib/design-release-2-version.js:31 and
//           lib/design-release-2.1-version.js:31. Gates one address-book page.
//     Neither is ever set at the root mount, so every `if (!gate) return
//     res.redirect(...)` fires for a DR1 user. Screens behind those guards are
//     not DR1 screens, and — consistent with FACT 2 — they have no root view
//     file either: create-template, dashboard-templates, dashboard-actions,
//     dashboard-changes, dashboard-inspection, delete-notification,
//     view-template and consignment-add-address exist only under
//     design-release-2/ and design-release-2.1/.
//
//   FACT 4 — The address book is DR1's, and it is in DR1's journey.
//     Reached from the service navigation, whose DR1 default is /address-book
//     (app/views/layouts/main.html:16 — the fallback used when no release has
//     overridden serviceNavAddressBookHref). It is also the DR1 route into the
//     consignment address flow: routes.js:3598-3600 sets the "add an address"
//     link on the party picker to `/address-book/add?from=<section>` for every
//     session that is not DR2.1, and routes.js:3690-3692 makes the DR2.1-only
//     `/<party>/add-address` route redirect there for everyone else.
//
//   FACT 5 — Five party pickers are one page rendered from a table.
//     app/data/consignment-address-sections.js declares seven sections, five of
//     them `selectable: true`. routes.js:10914-10918 loops over exactly those
//     five and registers `router.get(section.path, handleConsignmentAddressSelectGet)`,
//     so /place-of-origin, /consignor-or-exporter, /consignee, /importer and
//     /place-of-destination are the same handler and the same view
//     (consignment-address-select.html) with a different heading. Listed as ONE
//     screen, because that is how the corpus photographs it; the five paths are
//     named in its `why` so a reader can see what one picture stands for.
//
// ---------------------------------------------------------------------------
// Where the screens are listed rather than detected, and why
// ---------------------------------------------------------------------------
//
// The list below is written out, one entry per screen, each citing the route
// that serves it and the line that renders it. It is NOT derived by analysing
// routes.js, and that is deliberate: a general "is this view reachable"
// call-graph over an 11,000-line file is a machine whose first wrong answer
// deletes a real screen from the comparison and nobody notices. A written list
// carrying its own citations is falsifiable by reading it.
//
// What IS derived is a staleness alarm. `assertStillTrue` re-reads app/views and
// app/routes.js on every call and throws if a root view has appeared that this
// file does not classify, if a view it names has gone, or if a route literal it
// cites is no longer declared. The knowledge is hand-written; the check that the
// knowledge still matches the code is automatic and loud.
//
// ---------------------------------------------------------------------------
// A question can be a reveal on another page. Those are not screens.
// ---------------------------------------------------------------------------
//
// DR1 asks for an exit date, a port of exit, an exit border control post, a
// transit/transhipment destination country and an internal-market purpose, and
// none of them has a view file. All five are radio conditionals on
// /reason-for-import: routes.js:8944-8990 pre-renders four partials —
// partials/internal-market-purpose-select.html (internalMarketPurpose),
// partials/transhipment-destination-country-select.html
// (transhipmentDestinationCountry), partials/transit-options-select.html
// (transitExitBorderControlPost, transitDestinationCountry) and
// partials/temporary-admission-horses-select.html (temporaryAdmissionExitDate,
// temporaryAdmissionPortOfExit) — and passes the HTML into buildImportReasonItems
// so each becomes the conditional of one radio.
//
// The same shape appears elsewhere and is likewise not a screen:
//   - region of origin code — partials/region-of-origin-code-input.html,
//     revealed on origin-of-the-import.html:102
//   - county / parish / holding — partials/cph-number-input.html, revealed on
//     cph-number.html:53
//   - manual address fields — partials/address-book-manual-address-fields.html,
//     revealed on address-book-lookup.html:137
//
// The dr1b capture filed these as `<screen>-<state>` ids
// (dr1-reason-for-import-transit-revealed and friends). An enumerator lists
// pages; the specs list states. If you are about to write "DR1 does not ask
// for X", search app/views/partials for the field name first.
//
const fs = require('fs')
const path = require('path')

const VIEWS = path.join('app', 'views')
const ROUTES = path.join('app', 'routes.js')

/**
 * Every screen Design Release 1 has, in journey order.
 *
 * `view` is the file under app/views that renders it (FACT 2). `route` is the
 * GET path on the root mount that reaches it (FACT 1) — quoted exactly as
 * routes.js declares it, so the staleness check can find it.
 */
const SCREENS = [
  {
    screen: 'dr1-dashboard',
    view: 'dashboard',
    route: '/',
    why:
      "The service's landing page, served at the bare root URL — routes.js:9552 " +
      'calls renderDashboardPage, which renders dashboard.html at routes.js:7266. ' +
      'Unlike every other dashboard tab it carries no release gate, so it is the ' +
      "one dashboard DR1 has. /dashboard is an alias that redirects to '/' " +
      '(routes.js:9696).'
  },
  {
    screen: 'dr1-notification-hub',
    view: 'notification-hub',
    route: '/notification-hub',
    why:
      'The task list for one notification. routes.js:9702 calls ' +
      'renderNotificationHubPage, which renders notification-hub.html at ' +
      'routes.js:5848. Every journey page links back to it.'
  },
  {
    screen: 'dr1-origin-of-the-import',
    view: 'origin-of-the-import',
    route: '/origin-of-the-import',
    why:
      'First page of the journey — /create-notification resets the session and ' +
      'redirects straight here (routes.js:9223-9227). routes.js:9229 calls ' +
      'renderOriginPage, which renders origin-of-the-import.html at ' +
      'routes.js:8829. The region-of-origin code is a reveal on this page ' +
      '(origin-of-the-import.html:102), not a page of its own.'
  },
  {
    screen: 'dr1-what-are-you-importing',
    view: 'what-are-you-importing',
    route: '/what-are-you-importing',
    why:
      'Commodity search. routes.js:9284 leads to the render at routes.js:8845. ' +
      'The search-results state is the same page and was captured separately as ' +
      'dr1-what-are-you-importing-results.'
  },
  {
    screen: 'dr1-reason-for-import',
    view: 'reason-for-import',
    route: '/reason-for-import',
    why:
      'Main reason for import. routes.js:9542 calls renderReasonForImportPage, ' +
      'which renders reason-for-import.html at routes.js:8981. Four conditional ' +
      'reveals hang off its radios (routes.js:8944-8990) and cover exit date, ' +
      'port of exit, exit BCP, destination country and internal-market purpose — ' +
      'all states of this screen, none a screen of its own. ' +
      '/prototype/reason-for-import (routes.js:9536) seeds a session and ' +
      'redirects here; it is a shortcut, not a page.'
  },
  {
    screen: 'dr1-consignment-details',
    view: 'consignment-details',
    route: '/consignment-details',
    why:
      'Quantity, packaging and purpose for the chosen commodity. routes.js:9342 ' +
      'leads to the render at routes.js:8858.'
  },
  {
    screen: 'dr1-animal-identification-details',
    view: 'animal-identification-details',
    route: '/animal-identification-details',
    why:
      'Per-animal identifiers. routes.js:10297 leads to the render at ' +
      'routes.js:8909. Saved animals are re-listed inside the same page via ' +
      'partials/animal-identification-saved-animals.html, so the populated state ' +
      'is a state, not a second screen.'
  },
  {
    screen: 'dr1-additional-animal-details',
    view: 'additional-animal-details',
    route: '/additional-animal-details',
    why:
      'Follow-on animal questions. routes.js:9451 leads to the render at ' +
      'routes.js:8872.'
  },
  {
    screen: 'dr1-arrival-details',
    view: 'arrival-details',
    route: '/arrival-details',
    why:
      'Point of entry and arrival date and time. routes.js:10428 leads to the ' +
      'render at routes.js:3997. The date picker is a reveal on this page ' +
      '(arrival-details.html:48).'
  },
  {
    screen: 'dr1-transit-countries',
    view: 'transit-countries',
    route: '/transit-countries',
    why:
      'Countries the consignment passes through. routes.js:10481 leads to the ' +
      'render at routes.js:1954. The selected-countries state is the same page.'
  },
  {
    screen: 'dr1-transporter',
    view: 'transporter',
    route: '/transporter',
    why:
      'Transporter list and search. routes.js:10564 calls renderTransporterPage, ' +
      'which renders transporter.html at routes.js:2932. /transport-details ' +
      '(routes.js:10560) is an alias that redirects here.'
  },
  {
    screen: 'dr1-transporter-add',
    view: 'transporter-add',
    route: '/transporter/add',
    why:
      'Chooses private or commercial before collecting details. routes.js:10572 ' +
      'leads to the render at routes.js:2974.'
  },
  {
    screen: 'dr1-transporter-add-private',
    view: 'transporter-add-private',
    route: '/transporter/add/private',
    why:
      'Private transporter details. routes.js:10607 renders it, but only after ' +
      'redirectIfTransporterAddTypeNot(req, res, "private") passes — a spec must ' +
      "pick 'private' on /transporter/add first, or this redirects away."
  },
  {
    screen: 'dr1-transporter-add-commercial',
    view: 'transporter-add-commercial',
    route: '/transporter/add/commercial',
    why:
      'Commercial transporter details, including the authorisation banner ' +
      '(transporter-add-commercial.html:43). routes.js:10660 renders it behind ' +
      'redirectIfTransporterAddTypeNot(req, res, "commercial"), so a spec must ' +
      "pick 'commercial' on /transporter/add first."
  },
  {
    screen: 'dr1-upload-documents',
    view: 'upload-documents',
    route: '/upload-documents',
    why:
      'Supporting documents. routes.js:10117 leads to the render at ' +
      'routes.js:9212. Empty, populated, scanning and four error states were all ' +
      'captured separately in dr1b; they are states of this one page.'
  },
  {
    screen: 'dr1-roles-and-addresses',
    view: 'roles-and-addresses',
    route: '/roles-and-addresses',
    why:
      'Hub listing every consignment party, built from ' +
      'data/consignment-address-sections.js. routes.js:10554 calls ' +
      'renderRolesAndAddressesPage, which renders roles-and-addresses.html at ' +
      'routes.js:2803. Which rows appear depends on the commodity code, so the ' +
      'partial and complete states are states of this page.'
  },
  {
    screen: 'dr1-consignment-address-select',
    view: 'consignment-address-select',
    route: '/place-of-origin',
    why:
      'The party address picker. ONE screen serving five paths — ' +
      '/place-of-origin, /consignor-or-exporter, /consignee, /importer and ' +
      '/place-of-destination — because routes.js:10914-10918 registers the same ' +
      'handleConsignmentAddressSelectGet for every section marked ' +
      'selectable: true in data/consignment-address-sections.js, and ' +
      'routes.js:3580 renders the same view with a different heading and hint ' +
      '(FACT 5). If the comparison needs one screen per party, split this entry ' +
      'five ways rather than assuming one picture covers all five headings.'
  },
  {
    screen: 'dr1-cph-number',
    view: 'cph-number',
    route: '/cph-number',
    why:
      'County parish holding number, shown only for commodity codes 0102 and ' +
      "0103 and the default set (the 'cph' section in " +
      'data/consignment-address-sections.js:71-78). routes.js:10749 leads to the ' +
      'render at routes.js:2871; county, parish and holding are three inputs ' +
      'revealed inside it (cph-number.html:53), not three pages.'
  },
  {
    screen: 'dr1-permanent-address-animals',
    view: 'permanent-address-animals',
    route: '/permanent-address/select',
    why:
      'Permanent address per animal, shown only for commodity code 01061900 ' +
      '(data/consignment-address-sections.js:124-131). routes.js:10821 leads to ' +
      'renderPermanentAddressAnimalsPage at routes.js:10828, which renders ' +
      'permanent-address-animals.html at routes.js:2770. Both /permanent-address ' +
      'and /permanent-address/enter-address redirect here (routes.js:10801, ' +
      'routes.js:10900), so this is the only permanent-address page DR1 shows.'
  },
  {
    screen: 'dr1-contact-address-for-consignment',
    view: 'contact-address-for-consignment',
    route: '/contact-address-for-consignment',
    why:
      'Who to contact about the consignment. routes.js:10540 leads to the render ' +
      'at routes.js:1971.'
  },
  {
    screen: 'dr1-review-notification',
    view: 'review-notification',
    route: '/review-notification',
    why:
      'Check your answers. routes.js:10006 falls through its DR2-only branches to ' +
      'renderReviewNotificationPage at routes.js:10042, which renders ' +
      'review-notification.html at routes.js:5604. The incomplete state — ' +
      'reached by POSTing before the notification is complete ' +
      '(routes.js:10071-10072) — is a state of this page.'
  },
  {
    screen: 'dr1-declaration',
    view: 'declaration',
    route: '/declaration',
    why:
      'The declaration the user confirms before submitting. routes.js:10078 leads ' +
      'to the render at routes.js:5697.'
  },
  {
    screen: 'dr1-notification-submitted',
    view: 'notification-submitted',
    route: '/notification-submitted',
    why:
      'Confirmation panel. routes.js:10107 renders it only when ' +
      'hasDeclarationConfirmed passes, otherwise it redirects to /declaration — ' +
      'so a spec has to submit the declaration to reach it.'
  },
  {
    screen: 'dr1-address-book',
    view: 'address-book',
    route: '/address-book',
    why:
      "Address book list, reached from the service navigation's DR1 default of " +
      '/address-book (layouts/main.html:16). routes.js:9706 calls ' +
      'renderAddressBookPage, which renders address-book.html at routes.js:8274. ' +
      'Ungated (FACT 4).'
  },
  {
    screen: 'dr1-address-book-add',
    view: 'address-book-add',
    route: '/address-book/add',
    why:
      "Address type chooser, headed 'What is the new address for?' in DR1 and " +
      "'Choose an address type' in DR2 (routes.js:8505). routes.js:9710 renders " +
      'it only when no ?from= is supplied; arriving from a party picker skips ' +
      'straight to the lookup page (routes.js:9713-9725).'
  },
  {
    screen: 'dr1-address-book-lookup',
    view: 'address-book-lookup',
    route: '/address-book/add/lookup',
    why:
      'Search for an address, with manual entry as a reveal ' +
      '(address-book-lookup.html:137). routes.js:9795 falls past its ' +
      'DR2-only branch (routes.js:9808) to renderAddressBookLookupPage at ' +
      'routes.js:9812, rendering address-book-lookup.html at routes.js:8579. ' +
      'This is where the DR1 party-picker "add an address" link ends up ' +
      '(routes.js:3598-3600, then routes.js:9713-9725).'
  },
  {
    screen: 'dr1-address-book-view',
    view: 'address-book-view',
    route: '/address-book/:addressId',
    why:
      'One saved address. routes.js:10002 calls renderAddressBookViewPage, which ' +
      'renders address-book-view.html at routes.js:7805. Needs a real address id, ' +
      'so a spec must click through from the list rather than guess a URL.'
  },
  {
    screen: 'dr1-address-book-edit',
    view: 'address-book-lookup',
    route: '/address-book/:addressId/edit',
    why:
      'Edit a saved address. Shares address-book-lookup.html with the add flow ' +
      'but is a different page: routes.js:9942 calls renderAddressBookEditPage, ' +
      'which renders the same view at routes.js:7877 with isEditMode true, the ' +
      "heading 'Edit address and contact details', the search hidden and the " +
      'manual fields already open (routes.js:7881-7889). Listed separately ' +
      'because one picture of the add page would not show any of that.'
  }
]

/**
 * Root views that are NOT DR1 screens, each excluded by name and carrying its
 * own evidence.
 *
 * Named rather than detected, on purpose. Two of the three would need a
 * different analysis to find automatically, and the day a general check gets one
 * wrong is the day a real screen leaves the comparison silently.
 */
const NOT_A_SCREEN = {
  index:
    'The prototype release chooser, above all four journeys — it links to ' +
    '/create-notification, /design-release-2, /design-release-2.1 and /testing. ' +
    'Served at /index (routes.js:9692) and reachable from the service navigation ' +
    "on every release (layouts/main.html:14). It is the shell around the " +
    'comparison, not a page of the service.',

  'permanent-address':
    'A view nothing renders. Its render function, renderPermanentAddressPage ' +
    '(routes.js:2780), is never called: the whole of routes.js mentions that ' +
    'name exactly once, at the declaration. Both routes that could reach it ' +
    'redirect instead — GET /permanent-address to /permanent-address/select ' +
    '(routes.js:10801) and GET /permanent-address/enter-address to the same ' +
    '(routes.js:10900) — and the select page renders ' +
    'permanent-address-animals.html. Excluded by name with its own evidence ' +
    'rather than by a call-graph over 11,000 lines.',

  'address-book-add-usage':
    'What the address can be used for. Gated on the SECOND release flag: ' +
    'routes.js:9879 does `if (!res.locals.isDesignRelease2Version) return ' +
    'res.redirect(basePath + "/add")`, and that local is set only by ' +
    'design-release-2-version.js:31 and design-release-2.1-version.js:31, never ' +
    'at the root mount (FACT 3b). A DR1 user is bounced back to ' +
    '/address-book/add every time. The root view file exists because DR2 ' +
    'inherits it — presence of a view is not presence of a screen.'
}

/**
 * The loose .html files at the root of app/views. Subdirectories are excluded
 * because none of them holds a DR1 screen: layouts/ and partials/ are not
 * pages at all, and design-release-2/, design-release-2.1/ and testing/ are the
 * other three releases (FACT 2).
 */
const rootViews = (repoPath) =>
  fs
    .readdirSync(path.join(repoPath, VIEWS), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => entry.name.replace(/\.html$/, ''))

/**
 * Every route literal the root router declares, as a Set.
 *
 * Read with a regex rather than by loading routes.js, which would pull in the
 * whole Prototype Kit. A route table is a list of string literals; a regex over
 * them is exact and costs nothing.
 *
 * The five party pickers are registered from a loop over
 * data/consignment-address-sections.js rather than as literals
 * (routes.js:10914-10918), so their paths are read from that file and added.
 */
const declaredRoutes = (repoPath) => {
  const source = fs.readFileSync(path.join(repoPath, ROUTES), 'utf8')
  const found = new Set(
    [...source.matchAll(/router\.get\(\s*'([^']+)'/g)].map((m) => m[1])
  )

  const sections = fs.readFileSync(
    path.join(repoPath, 'app', 'data', 'consignment-address-sections.js'),
    'utf8'
  )
  for (const [, route] of sections.matchAll(/path:\s*'([^']+)'/g)) {
    found.add(route)
  }

  return found
}

/**
 * Re-check, on every call, that the five facts above still describe the code.
 *
 * The screen list is hand-written knowledge; this is the alarm that says when
 * the knowledge has drifted. It throws rather than returning a quietly shorter
 * or longer list, because a wrong picture of the application is worse than no
 * picture.
 *
 * @param {string} repoPath - The prototype checkout
 */
const assertStillTrue = (repoPath) => {
  const source = fs.readFileSync(path.join(repoPath, ROUTES), 'utf8')
  const complaints = []

  // FACT 1. If the mounts stop being copies of one router, "the root mount is
  // DR1" stops meaning anything and this whole file has to be rewritten.
  for (const mount of [
    'mountTestingVersion',
    'mountDesignRelease21Version',
    'mountDesignRelease2Version'
  ]) {
    if (!source.includes(`${mount}(govukPrototypeKit, router)`)) {
      complaints.push(
        `${ROUTES} no longer mounts a release with ${mount}(govukPrototypeKit, router). ` +
          'FACT 1 — one router, four mounts, root is DR1 — may no longer hold.'
      )
    }
  }

  // FACT 2. A DR1 view folder would mean DR1 stops being the root views.
  if (fs.existsSync(path.join(repoPath, VIEWS, 'design-release-1'))) {
    complaints.push(
      `${VIEWS}/design-release-1 now exists. FACT 2 — DR1 has no folder of its ` +
        'own, so its views are the root views — no longer holds.'
    )
  }

  // Every root view is either a screen or an explained exclusion. A new one is
  // a new screen nobody has ruled on.
  const classified = new Set([
    ...SCREENS.map((entry) => entry.view),
    ...Object.keys(NOT_A_SCREEN)
  ])
  for (const view of rootViews(repoPath)) {
    if (!classified.has(view)) {
      complaints.push(
        `${VIEWS}/${view}.html is a root view this enumerator does not classify. ` +
          'Add it to SCREENS with the route that serves it, or to NOT_A_SCREEN ' +
          'with the evidence that DR1 cannot reach it.'
      )
    }
  }

  // Every view this file names still exists.
  for (const view of classified) {
    if (!fs.existsSync(path.join(repoPath, VIEWS, `${view}.html`))) {
      complaints.push(
        `${VIEWS}/${view}.html is named by this enumerator but no longer exists.`
      )
    }
  }

  // Every route this file cites is still declared.
  const routes = declaredRoutes(repoPath)
  for (const { screen, route } of SCREENS) {
    if (!routes.has(route)) {
      complaints.push(
        `${screen} cites GET ${route}, which ${ROUTES} no longer declares.`
      )
    }
  }

  if (complaints.length) {
    throw new Error(
      `The DR1 screen enumeration has gone stale against ${repoPath}:\n` +
        complaints.map((line) => `  - ${line}`).join('\n')
    )
  }
}

/**
 * Design Release 1's screens.
 *
 * @param {object} args
 * @param {string} args.repoPath - The GB-notification-service checkout
 * @returns {Array<{screen: string, why: string}>}
 */
const prototypeScreens = ({ repoPath }) => {
  assertStillTrue(repoPath)

  return SCREENS.map(({ screen, view, route, why }) => ({
    screen,
    why: `${why} Route GET ${route}, view ${VIEWS}/${view}.html.`
  })).sort((a, b) => a.screen.localeCompare(b.screen))
}

module.exports = prototypeScreens
module.exports.prototypeScreens = prototypeScreens
module.exports.SCREENS = SCREENS
module.exports.NOT_A_SCREEN = NOT_A_SCREEN
