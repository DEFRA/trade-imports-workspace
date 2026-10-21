import { existsSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { join } from 'node:path'

const PLATFORM_DOCS_DIR = 'src/server/app/docs'
const SETS_DIR = 'src/server/app/sets'
const NAMED_DOCS = [
  'README.md',
  'architecture.md',
  'features.md',
  'flow-and-gates.md',
  'journey-flow-and-gates.md'
]
const RECIPE_FILENAME = /^add-a-.+\.md$/

const isFile = (abs) => existsSync(abs) && statSync(abs).isFile()

const isFolder = (abs) => existsSync(abs) && statSync(abs).isDirectory()

const recipesIn = (repoAbs, docsDir) => {
  const abs = join(repoAbs, docsDir)
  if (!isFolder(abs)) return []
  return readdirSync(abs)
    .filter((name) => RECIPE_FILENAME.test(name))
    .sort()
    .map((name) => `${docsDir}/${name}`)
}

const platformDocCandidates = (repoAbs) => [
  ...NAMED_DOCS.filter((name) => name !== 'README.md').map(
    (name) => `${PLATFORM_DOCS_DIR}/${name}`
  ),
  ...recipesIn(repoAbs, PLATFORM_DOCS_DIR)
]

const setDocCandidates = (repoAbs, set) => {
  const docsDir = `${SETS_DIR}/${set}/docs`
  return [
    ...NAMED_DOCS.map((name) => `${docsDir}/${name}`),
    ...recipesIn(repoAbs, docsDir)
  ]
}

const setOwningPath = (relPathInRepo) => {
  const match = relPathInRepo.match(/^src\/server\/app\/sets\/([^/]+)\//)
  return match ? match[1] : null
}

const setsInRepo = (repoAbs) => {
  const abs = join(repoAbs, SETS_DIR)
  if (!isFolder(abs)) return []
  return readdirSync(abs, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
}

const setsForPath = (repoAbs, relPathInRepo) => {
  const owningSet = relPathInRepo ? setOwningPath(relPathInRepo) : null
  return owningSet ? [owningSet] : setsInRepo(repoAbs)
}

const homePrefixes = (homeDir) => {
  const prefixes = [homeDir]
  if (existsSync(homeDir)) prefixes.push(realpathSync(homeDir))
  return [...new Set(prefixes)]
}

/**
 * An absolute path written from the home folder as `~/…`, or unchanged
 * when it is outside the home folder.
 *
 * @param {string} abs
 * @param {string} homeDir
 * @returns {string}
 */
export const tildePath = (abs, homeDir) => {
  const prefix = homePrefixes(homeDir).find((home) =>
    abs.startsWith(`${home}/`)
  )
  return prefix ? `~${abs.slice(prefix.length)}` : abs
}

/**
 * The repo's own docs an agent must follow before changing a file in it,
 * as absolute paths, each one a file that exists. In order: the file's
 * topics' `repoRelativeBestPractice`, the platform docs and recipes under
 * `src/server/app/docs/`, then each set's docs and recipes. A file inside
 * `src/server/app/sets/<set>/` gets that set's docs only; any other file,
 * or the repo as a whole, gets every set's.
 *
 * @param {object} args
 * @param {string} args.repoAbs
 * @param {string} [args.relPathInRepo] - Omit for the repo as a whole
 * @param {string[]} [args.topicRepoDocs] - Repo-relative paths from the
 *   file's topics
 * @returns {string[]}
 */
export const repoDocsFor = ({ repoAbs, relPathInRepo, topicRepoDocs = [] }) =>
  [
    ...new Set([
      ...topicRepoDocs,
      ...platformDocCandidates(repoAbs),
      ...setsForPath(repoAbs, relPathInRepo).flatMap((set) =>
        setDocCandidates(repoAbs, set)
      )
    ])
  ]
    .map((relPath) => join(repoAbs, relPath))
    .filter(isFile)
