//
// Which screens does Design Release 1 have?
//
// Read from the prototype's source, never from a browser. That is the whole
// point: an answer that costs nothing, re-runs identically, and cannot be wrong
// about a screen it failed to reach — because it never has to reach one. What
// it cannot tell you is whether a page the router allows is actually linked to
// from anywhere. That is what the capture answers, and `tim parity coverage`
// diffs the two rather than trusting either alone.
//
// CommonJS and hand-authored, the way pairs.js is: this is knowledge about one
// application, not reusable code.
//
// Three facts about the prototype make DR1 readable from source. Each is cited
// where it is used.
//
//   1. One router, three mounts. app/routes.js is a single router; version-mount
//      copies its whole stack under /design-release-2 and /design-release-2.1.
//      The root mount IS DR1, and the route table is identical on all three.
//   2. Views override, they do not replace. versionViewExists renders
//      <release>/<name>.html where one exists and falls through to the root view
//      where it does not. DR1 has no release folder, so DR1's views are exactly
//      the root views.
//   3. A session flag gates the rest. The mount middleware sets
//      _isDesignRelease2Version / _isDesignRelease21Version; a handler guarded
//      by isDesignRelease2SessionData redirects to / when the flag is absent,
//      which at the root mount it always is.
//
const fs = require('fs')
const path = require('path')

// Directories under app/views that hold something other than a screen.
const NOT_A_VIEW = new Set([
  'layouts',
  'partials',
  'design-release-2',
  'design-release-2.1',
  'testing'
])

// The release chooser. Not part of any journey.
const CHOOSER = 'index'

// /address-book is mounted outside every release — version-mount.js,
// isSharedExternalPath — so it is identical in DR1 and DR2.1 and carries no
// release prefix. It is in scope for the comparison but not for this release's
// screen set; the previous run's 13 address-book findings carry over.
const isShared = (name) => name.startsWith('address-book')

// A view file is not a screen if nothing renders it. permanent-address.html has
// a render function, renderPermanentAddressPage (routes.js:2780), and that
// function is never called: the whole file mentions its name exactly once, at
// the declaration. Every route that reaches a permanent address goes through
// renderPermanentAddressAnimalsPage instead, which renders
// permanent-address-animals.html.
//
// Listed rather than detected. A general "is this render function called"
// check is a call-graph over 11,000 lines to remove one screen, and the day it
// gets the answer wrong is the day a real screen disappears from the
// comparison without anyone noticing. A named exclusion carrying its own
// evidence is falsifiable by reading it.
const ORPHANED = new Set(['permanent-address'])

/**
 * Every route the router declares, with the method that declares it.
 *
 * Read with a regex rather than by loading routes.js, which would pull in the
 * whole Prototype Kit. A route table is a list of string literals; a regex over
 * them is exact and costs nothing.
 */
const routesIn = (source) => {
  const found = []
  const pattern = /router\.(get|post)\(\s*'([^']+)'/g
  let match
  while ((match = pattern.exec(source))) {
    found.push({ method: match[1], route: match[2] })
  }
  return found
}

/**
 * The handler body for one route, as text.
 *
 * Bracket-matched from the route declaration rather than line-counted, so a
 * handler that grows does not silently fall out of the window.
 */
const handlerBody = (source, at) => {
  let depth = 0
  for (let i = at; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1
    else if (source[i] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(at, i + 1)
    }
  }
  return source.slice(at)
}

const GATE = 'isDesignRelease2SessionData'

/**
 * The routes a DR1 user is redirected away from.
 *
 * A route is gated either inline or through the render function it delegates
 * to, so both are followed. Fact 3 above.
 *
 * @param {string} source - app/routes.js
 * @returns {Set<string>} Route paths
 */
const gatedRoutes = (source) => {
  // Every named function whose body consults the release flag.
  const gatedFunctions = new Set()
  const declaration = /^function ([A-Za-z0-9_]+) ?\(/gm
  let match
  while ((match = declaration.exec(source))) {
    if (handlerBody(source, source.indexOf('{', match.index)).includes(GATE)) {
      gatedFunctions.add(match[1])
    }
  }

  const gated = new Set()
  const route = /router\.(?:get|post)\(\s*'([^']+)'/g
  while ((match = route.exec(source))) {
    const body = handlerBody(source, source.indexOf('{', match.index))
    const delegates = [...gatedFunctions].some((fn) => body.includes(`${fn}(`))
    if (body.includes(GATE) || delegates) gated.add(match[1])
  }
  return gated
}

/**
 * The view each route renders, where it renders one directly.
 *
 * Only used to attribute a route to a view, so that a route reached under its
 * own name — /create-notification renders origin-of-the-import — is not
 * reported as a screen nothing accounts for.
 */
const viewsRendered = (source, route) => {
  const at = source.search(
    new RegExp(`router\\.get\\(\\s*'${route.replace(/[/:]/g, '\\$&')}'`)
  )
  if (at < 0) return []
  const body = handlerBody(source, source.indexOf('{', at))
  return [...body.matchAll(/res\.render\(\s*'([^']+)'/g)].map((m) => m[1])
}

const viewsIn = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
        .map((entry) => entry.name.replace(/\.html$/, ''))
    : []

/**
 * DR1's screens: the root views, less anything a DR1 session cannot reach.
 *
 * @param {object} args
 * @param {string} args.repoPath - The prototype checkout
 * @returns {Array<{screen: string, why: string}>}
 */
const dr1Screens = ({ repoPath }) => {
  const viewsRoot = path.join(repoPath, 'app', 'views')
  const source = fs.readFileSync(
    path.join(repoPath, 'app', 'routes.js'),
    'utf8'
  )

  const gated = gatedRoutes(source)

  // A view is out of DR1's reach when every route that renders it is gated.
  const reachableViews = new Set()
  const gatedViews = new Set()
  for (const { route } of routesIn(source)) {
    for (const view of viewsRendered(source, route)) {
      if (gated.has(route)) gatedViews.add(view)
      else reachableViews.add(view)
    }
  }

  return viewsIn(viewsRoot)
    .filter((name) => !NOT_A_VIEW.has(name))
    .filter((name) => name !== CHOOSER && !isShared(name))
    .filter((name) => !ORPHANED.has(name))
    .filter((name) => !(gatedViews.has(name) && !reachableViews.has(name)))
    .sort()
    .map((name) => ({ screen: `dr1-${name}`, why: `app/views/${name}.html` }))
}

//
// Which screens does the frontend have?
//
// The frontend has no route table worth parsing. It has a journey definition:
// flow/flow.js lists the sections in order, each section lists page identities,
// and every page identity is a two-field object in its feature's page.js. That
// is the file the repo's own docs/add-a-page.md tells an author to edit when
// they add a page, so reading it is reading what the application says it is.
//
// Four facts about the frontend make it readable this way. Each is cited where
// it is used.
//
//   1. A page identity is inert by construction. page.js exports only
//      { id, slug } and imports nothing, so that flow and the controller can
//      share one object without a module cycle. Two string literals is exactly
//      what a regex can read.
//   2. Not every screen is a flow page. The hub, the cancel-amend prompt and
//      the delete prompt have a template and a GET route but no page.js,
//      because they are not steps in the sequence.
//   3. The five address pickers are one controller over a table. parties.js
//      holds the five consignment parties and party-picker.controller.js maps
//      over them, so those five screens are declared as data, not as files.
//   4. Two pages are photographed as two screens each. The dashboard and the
//      documents page each render an empty state and a populated state, and
//      the previous run filed each under its own id. Naming either as one page
//      here would report it missing forever, because nothing is ever captured
//      under the bare name.
//
const SET = 'src/server/app/sets/live-animals'
const FEATURES = `${SET}/journeys/linear/features`
const FLOW = `${SET}/journeys/linear/flow/flow.js`
const PARTIES = `${FEATURES}/addresses/parties.js`

/**
 * The corpus screen id for a page, where it is not the page's own id.
 *
 * The journey names a page for the thing it collects; the captures name it for
 * what the user sees. Where the two differ the corpus id wins — a name that
 * does not match reports one screen as both missing and unexplained.
 *
 * A page with two ids is one that renders two states worth comparing, fact 4.
 */
const SCREENS_OF_PAGE = {
  dashboard: ['dashboard-empty', 'dashboard-populated'],
  commodities: ['commodity-search'],
  consignmentDetails: ['consignment-details'],
  animalIdentification: ['animal-identification'],
  'accompanying-documents': ['documents-empty', 'documents-populated'],
  addresses: ['addresses-hub'],
  cphNumber: ['cph-number'],
  'port-of-entry': ['arrival-details'],
  transporters: ['transporter-type'],
  'transporters-select': ['transporter-commercial'],
  'private-transporter-details': ['transporter-private'],
  'consignment-contact-select': ['contact'],
  'notification-view': ['check-answers']
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

const filesNamed = (dir, name) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) return filesNamed(full, name)
    return entry.name === name ? [full] : []
  })

/**
 * Every page identity the features declare, keyed by the constant that exports
 * it — which is the name flow.js refers to it by.
 *
 * Fact 1 above.
 *
 * @param {string} featuresDir
 * @returns {Record<string, {id: string, slug: string}>}
 */
const pageIdentities = (featuresDir) => {
  const found = {}
  for (const file of filesNamed(featuresDir, 'page.js')) {
    const source = fs.readFileSync(file, 'utf8')
    const pattern =
      /export const (\w+)\s*=\s*\{\s*id:\s*'([^']+)',\s*slug:\s*'([^']*)'/g
    let match
    while ((match = pattern.exec(source))) {
      found[match[1]] = { id: match[2], slug: match[3] }
    }
  }
  return found
}

/**
 * The journey's sections, each with the page constants it sequences.
 *
 * The section id is read backwards from its `pages:` list rather than by
 * matching a whole section object, so a section that grows a gate or any other
 * key still reads.
 *
 * @param {string} source - flow/flow.js
 * @returns {Array<{sectionId: string, pageConstants: string[]}>}
 */
const flowSections = (source) => {
  const found = []
  const pattern = /pages:\s*\[([^\]]*)\]/g
  let match
  while ((match = pattern.exec(source))) {
    const preceding = [
      ...source.slice(0, match.index).matchAll(/id:\s*'([^']+)'/g)
    ]
    found.push({
      sectionId: preceding[preceding.length - 1]?.[1] ?? '',
      pageConstants: match[1]
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean)
    })
  }
  return found
}

/**
 * The body of one array literal, as text.
 *
 * Bracket-matched so that PARTIES stops where PARTIES stops. CONTACT_PARTY sits
 * directly below it and has the same shape; reading past the closing bracket
 * would add a sixth picker that no address hub links to.
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
 * The five consignment parties, in the order the hub lists them. Fact 3.
 *
 * @param {string} source - addresses/parties.js
 * @returns {string[]} Party ids
 */
const partyIds = (source) => {
  const body = arrayBody(
    source,
    source.indexOf('[', source.indexOf('export const PARTIES'))
  )
  return [...body.matchAll(/id:\s*'([^']+)',\s*role:/g)].map((match) => match[1])
}

/**
 * The screens that are not journey pages. Fact 2.
 *
 * A feature folder holding a template and a controller that serves a GET, but
 * no page identity, is a screen off the flow. A feature that ever ships a
 * template before its page.js would be listed here under its folder name,
 * which reads as an unexplained screen rather than as silence.
 *
 * @param {string} featuresDir
 * @returns {string[]} Folder names, which are the corpus ids
 */
const offFlowScreens = (featuresDir) =>
  fs
    .readdirSync(featuresDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => {
      const dir = path.join(featuresDir, name)
      const controller = path.join(dir, 'controller.js')
      if (!fs.existsSync(path.join(dir, 'template.njk'))) return false
      if (fs.existsSync(path.join(dir, 'page.js'))) return false
      return (
        fs.existsSync(controller) &&
        fs.readFileSync(controller, 'utf8').includes("method: 'GET'")
      )
    })

/**
 * The frontend's screens: the journey's pages, the screens beside the journey,
 * and one picker per consignment party.
 *
 * @param {object} args
 * @param {string} args.repoPath - The frontend checkout
 * @returns {Array<{screen: string, why: string}>}
 */
// Screen ids are kebab-case throughout the corpus, but a page identity in the
// journey is whatever its author typed — `importTypeFilter` sits beside
// `additional-details`. Kebab-casing the fallback keeps one convention without
// needing a table entry per camelCase page, and a screen id that does not match
// the convention is worse than it looks: the capture files a picture under it,
// the pairing looks for it under the other spelling, and the screen reads as
// both missing and unexplained at once.
const kebab = (id) =>
  id.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()

const frontendScreens = ({ repoPath }) => {
  const featuresDir = path.join(repoPath, FEATURES)
  const identities = pageIdentities(featuresDir)
  const found = []

  for (const { sectionId, pageConstants } of flowSections(
    fs.readFileSync(path.join(repoPath, FLOW), 'utf8')
  )) {
    for (const constant of pageConstants) {
      const page = identities[constant]
      // flow.js can only sequence a page identity that exists, so no match
      // means the parse has gone stale rather than that the page has gone. Say
      // so: a quietly shorter list would read as a screen nobody built.
      if (!page) {
        throw new Error(
          `${FLOW} sequences "${constant}", which no page.js under ${FEATURES} declares.`
        )
      }
      for (const screen of SCREENS_OF_PAGE[page.id] ?? [kebab(page.id)]) {
        found.push({
          screen: `fe-${screen}`,
          why: `${FLOW}, section "${sectionId}", page "${page.id}"`
        })
      }
    }
  }

  for (const name of offFlowScreens(featuresDir)) {
    found.push({
      screen: `fe-${name}`,
      why: `${FEATURES}/${name}/template.njk, routed outside the flow`
    })
  }

  for (const party of partyIds(
    fs.readFileSync(path.join(repoPath, PARTIES), 'utf8')
  )) {
    found.push({
      screen: `fe-${SCREEN_OF_PARTY[party] ?? party}`,
      why: `${PARTIES}, party "${party}"`
    })
  }

  return found.sort((a, b) => a.screen.localeCompare(b.screen))
}

module.exports = {
  enumerators: {
    prototype: dr1Screens,
    frontend: frontendScreens
  },
  gatedRoutes,
  routesIn
}
