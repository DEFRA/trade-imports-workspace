//
// Which screens does each side of this comparison have?
//
// Read from the source tree, never from a browser. That is the whole point: an
// answer that costs nothing, re-runs identically, and cannot be wrong about a
// screen it failed to reach — because it never had to reach one. What it
// cannot know is whether a page the router allows is actually linked to from
// anywhere, which is what the capture answers. `tim parity coverage` diffs the
// two rather than trusting either alone.
//
// CommonJS, and hand-authored, the way pairs.js is: this is knowledge about one
// application, not reusable code.
//
// It enumerates VIEWS ONLY. A screen the harness named after the route that
// reaches it rather than after the view it renders — dr21-create-notification,
// the five dr21-address-select-<role> variants of consignment-address-select,
// dr21-notifications-amend — therefore comes back as unexplained rather than as
// covered. That is a real limit and not a defect in the coverage tool: this
// corpus is retired, and enumerating its route table as well would be fitting
// work to a comparison nobody is going to run again. A live corpus wants both
// halves.
//
const fs = require('fs')
const path = require('path')

// Directories under app/views that hold something other than a release's own
// screens.
const NOT_A_RELEASE_VIEW = new Set([
  'layouts',
  'partials',
  'design-release-2',
  'design-release-2.1',
  'testing'
])

// The release chooser, which is not part of any journey.
const CHOOSER = 'index'

// /address-book is mounted outside every release — version-mount.js,
// isSharedExternalPath — so its screens carry no release prefix and belong to
// no release's screen set.
const isShared = (name) => name.startsWith('address-book')

const viewsIn = (dir) =>
  fs.existsSync(dir)
    ? fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
        .map((entry) => entry.name.replace(/\.html$/, ''))
    : []

/**
 * The views one release renders.
 *
 * A release does not replace the view set, it overrides it: versionViewExists
 * renders <release>/<name>.html where one exists and falls through to the root
 * view where it does not. So a release's screens are its own views plus every
 * root view it did not override.
 *
 * @param {string} viewsRoot - app/views
 * @param {string|null} release - Release folder, or null for the root release
 * @returns {Array<{screen: string, why: string}>}
 */
const releaseViews = ({ viewsRoot, release, prefix, gatedOut = new Set() }) => {
  const own = release ? viewsIn(path.join(viewsRoot, release)) : []
  const root = viewsIn(viewsRoot).filter(
    (name) => !NOT_A_RELEASE_VIEW.has(name)
  )

  const seen = new Map()
  for (const name of own) {
    seen.set(name, `${release}/${name}.html`)
  }
  for (const name of root) {
    if (!seen.has(name)) seen.set(name, `${name}.html`)
  }

  return [...seen.entries()]
    .filter(([name]) => name !== CHOOSER && !isShared(name))
    .filter(([name]) => !gatedOut.has(name))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, why]) => ({ screen: `${prefix}${name}`, why }))
}

module.exports = {
  enumerators: {
    // The frontend has no enumerator yet. Coverage says so on the side rather
    // than reporting it as covered, which is the honest answer until somebody
    // writes one from its journey definition.
    prototype: ({ repoPath }) =>
      releaseViews({
        viewsRoot: path.join(repoPath, 'app', 'views'),
        release: 'design-release-2.1',
        prefix: 'dr21-'
      })
  },

  // Exported so a sibling corpus — DR1, which is the root URLs — can reuse the
  // override rule rather than restating it.
  releaseViews
}
