import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { createCliWorkspace } from './tim-cli.js'
import { prettierJson } from '../deps/json-layout.js'

export const CHECKOUT_WORKSPACE_ROOT = fileURLToPath(
  new URL('../../../', import.meta.url)
)

const FIXTURE_PATH = fileURLToPath(
  new URL('../deps/fixtures/dependency-sets.json', import.meta.url)
)

export const fixtureDependencySetsText = () =>
  readFileSync(FIXTURE_PATH, 'utf8')

export const fixtureDependencySets = () =>
  JSON.parse(fixtureDependencySetsText())

export const AXE_HOLD = {
  package: '@axe-core/playwright',
  versions: '4.14.x',
  repos: ['trade-imports-animals-frontend'],
  reason:
    "axe 4.14 flags govuk-frontend's enhanced file upload button, which no govuk-frontend release fixes yet.",
  failingTest: 'FIT accessibility tests (label-content-name-mismatch)',
  clashesWith: 'govuk-frontend',
  link: 'https://github.com/DEFRA/trade-imports-animals-frontend/pull/492',
  since: '2026-11-19'
}

/**
 * The fixture dependency sets with these holds.
 *
 * @param {object[]} holds
 * @returns {object}
 */
export const fixtureDependencySetsHolding = (holds) => ({
  ...fixtureDependencySets(),
  holds
})

const REPOS_JSON = {
  reposDir: 'repos',
  githubOrg: 'DEFRA',
  repos: [
    { name: 'trade-imports-animals-frontend', npmUpgradeDefault: true },
    { name: 'trade-imports-animals-backend', npmUpgradeDefault: false },
    { name: 'trade-imports-plants-prototype', npmUpgradeDefault: false }
  ]
}

/**
 * A temporary workspace holding dependency sets (the fixture unless given),
 * a small `repos.json` and a clone folder for each repo named in `cloned`.
 *
 * @param {object} [options]
 * @param {object} [options.dependencySets]
 * @param {string} [options.dependencySetsText] - The file's text byte for byte, in place of `dependencySets`
 * @param {string[]} [options.cloned]
 * @returns {string} The workspace root
 */
export const createDepsWorkspace = ({
  dependencySets = fixtureDependencySets(),
  dependencySetsText = prettierJson(dependencySets),
  cloned = ['trade-imports-animals-frontend']
} = {}) => {
  const root = createCliWorkspace('tim-deps-')
  mkdirSync(join(root, 'config'))
  writeFileSync(
    join(root, 'config', 'dependency-sets.json'),
    dependencySetsText
  )
  writeFileSync(join(root, 'repos.json'), JSON.stringify(REPOS_JSON))
  for (const repo of cloned) mkdirSync(join(root, 'repos', repo))
  return root
}

const writeFiles = (folder, files) => {
  for (const [path, contents] of Object.entries(files)) {
    mkdirSync(dirname(join(folder, path)), { recursive: true })
    writeFileSync(join(folder, path), contents)
  }
}

/**
 * Make `repos/<repo>` in a workspace a git repo whose index holds the
 * `tracked` files, with the `untracked` files beside them. Nothing is
 * committed.
 *
 * @param {string} workspaceRoot
 * @param {string} repo
 * @param {object} files
 * @param {Record<string, string>} files.tracked - Contents by relative path
 * @param {Record<string, string>} [files.untracked]
 * @returns {Promise<string>} The repo's path
 */
export const createEvidenceRepo = async (
  workspaceRoot,
  repo,
  { tracked, untracked = {} }
) => {
  const repoPath = join(workspaceRoot, 'repos', repo)
  mkdirSync(repoPath, { recursive: true })
  await execa('git', ['init', '--quiet'], { cwd: repoPath })
  writeFiles(repoPath, tracked)
  await execa('git', ['add', '--', ...Object.keys(tracked)], {
    cwd: repoPath
  })
  writeFiles(repoPath, untracked)
  return repoPath
}

export const EVIDENCE_REPO = 'trade-imports-animals-frontend'
export const OLD_HEADER_CLASS = 'govuk-header__link--service-name'

export const layoutUsing = (linkClass) =>
  '{% from "govuk/components/header/macro.njk" import govukHeader %}\n' +
  `<a class="${linkClass}">One</a>\n<a class="${linkClass}">Two</a>\n`

/**
 * A workspace whose `repos/trade-imports-animals-frontend` tracks a layout
 * using the old header class on two lines, and two `package-lock.json`
 * files naming it, with an untracked file naming it too.
 *
 * @returns {Promise<{root: string, repoPath: string}>}
 */
export const createHeaderEvidenceWorkspace = async () => {
  const root = createDepsWorkspace({ cloned: [] })
  const lockfile = `{ "packages": { "${OLD_HEADER_CLASS}": {} } }\n`
  const repoPath = await createEvidenceRepo(root, EVIDENCE_REPO, {
    tracked: {
      'src/layout.njk': layoutUsing(OLD_HEADER_CLASS),
      'package-lock.json': lockfile,
      'nested/package-lock.json': lockfile
    },
    untracked: { 'untracked.txt': `${OLD_HEADER_CLASS}\n` }
  })
  return { root, repoPath }
}

/**
 * Overwrite files in a repo made by `createEvidenceRepo`, as an edit
 * would, without staging them.
 *
 * @param {string} repoPath
 * @param {Record<string, string>} files - Contents by relative path
 */
export const editEvidenceRepo = (repoPath, files) => writeFiles(repoPath, files)
