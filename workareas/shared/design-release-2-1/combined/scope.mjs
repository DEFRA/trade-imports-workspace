/**
 * Which rows a scoped copy of a tracking page shows, and where it reads its
 * inputs from.
 *
 * Both tracking pages come in a whole-programme copy and one copy per journey.
 * The journey copies run the same generator and the same renderer over a
 * smaller set of rows, so there is one place to fix a count or a layout.
 *
 * A page directory declares its scope in build/scope.json. A directory with no
 * scope.json shows the whole programme.
 */

import fs from 'node:fs'
import path from 'node:path'

/** Everything, for a page that declares no scope of its own. */
const WHOLE_PROGRAMME = {
  id: 'all',
  title: null,
  of: null,
  keeps: () => true
}

/**
 * Reads the scope a build directory declares.
 *
 * A row is in scope when it touches one of the scope's own repos, or touches
 * none of the journeys it excludes. The second half is what makes shared work
 * communal: a row that only changes the tests repo, the stub, reference data or
 * the address book API belongs to every journey that depends on it, so every
 * journey copy shows it. A row whose only journey repo is another journey's is
 * out.
 */
export function readScope(buildDir) {
  const file = path.join(buildDir, 'scope.json')
  if (!fs.existsSync(file)) return WHOLE_PROGRAMME

  const scope = JSON.parse(fs.readFileSync(file, 'utf8'))
  for (const field of ['id', 'title', 'of', 'repos', 'excludes', 'rule']) {
    if (scope[field] === undefined) throw new Error(file + ' has no "' + field + '"')
  }

  const own = new Set(scope.repos)
  const excluded = new Set(Object.values(scope.excludes).flat())

  return {
    ...scope,
    keeps: (row) => {
      const repos = row.repos || []
      return repos.some((repo) => own.has(repo)) || !repos.some((repo) => excluded.has(repo))
    }
  }
}

/**
 * Where a build directory reads a shared input from: its own copy when it has
 * one, else the whole-programme copy beside it. A journey copy therefore holds
 * only its scope.json, and theme names, editorial copy and pull request states
 * stay in one place.
 */
export function inputFile(buildDir, canonicalBuildDir, name) {
  const own = path.join(buildDir, name)
  return fs.existsSync(own) ? own : path.join(canonicalBuildDir, name)
}

/**
 * Writes a scoped page's index.html: the whole-programme page's markup with its
 * title replaced, so the two read as different pages in a list of artifacts
 * while sharing one renderer. Does nothing for the whole-programme page itself.
 */
export function writeScopedPage(pageDir, canonicalPageDir, scope) {
  if (path.resolve(pageDir) === path.resolve(canonicalPageDir)) return null

  const source = path.join(canonicalPageDir, 'index.html')
  const markup = fs.readFileSync(source, 'utf8')
  const titled = markup.replace(/<title>[^<]*<\/title>/, '<title>' + scope.title + '</title>')
  if (titled === markup) throw new Error('no <title> to replace in ' + source)

  const out = path.join(pageDir, 'index.html')
  fs.writeFileSync(out, titled)
  return out
}
