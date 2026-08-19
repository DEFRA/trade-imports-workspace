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
    .filter((name) => !(gatedViews.has(name) && !reachableViews.has(name)))
    .sort()
    .map((name) => ({ screen: `dr1-${name}`, why: `app/views/${name}.html` }))
}

module.exports = {
  enumerators: {
    // The frontend has no enumerator yet. Coverage says so on the side rather
    // than reporting it as covered, which is the honest answer until somebody
    // writes one from the journey definition.
    prototype: dr1Screens
  },
  gatedRoutes,
  routesIn
}
