import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { writeTextAtomic } from '../review/store.js'
import { isFolder, runFolder } from './state.js'

const RELEVANT_PATHS = [
  'node/hapi.md',
  'node/govuk-frontend.md',
  'node/testing',
  'node/playwright.md'
]

const sourceSection = (label, path) =>
  `\n---\n\n## Source: \`docs/best-practices/${label}\`\n\n${readFileSync(path, 'utf8')}`

const markdownFilesIn = (folder) =>
  readdirSync(folder, { withFileTypes: true })
    .filter((entry) => !entry.isDirectory() && entry.name.endsWith('.md'))
    .map((entry) => entry.name)
    .sort()

const sectionsFor = (docsRoot, relativePath) => {
  const path = join(docsRoot, relativePath)
  if (isFolder(path)) {
    return markdownFilesIn(path).map((name) =>
      sourceSection(`${relativePath}/${name}`, join(path, name))
    )
  }
  return existsSync(path) ? [sourceSection(relativePath, path)] : []
}

const bundleText = (docsRoot, repo) =>
  [
    `# Dependency-relevant best practices for ${repo}\n`,
    '\n',
    'Concatenated at prebake time. PACKAGE_PLANNER consults these\n',
    'when classifying risk for framework-adjacent packages.\n',
    '\n',
    ...RELEVANT_PATHS.flatMap((relativePath) =>
      sectionsFor(docsRoot, relativePath)
    )
  ].join('')

/**
 * Write `best-practices.md` for one repo of an npm upgrade run: the
 * workspace's Hapi, GOV.UK Frontend, testing and Playwright guides, each
 * under a heading naming its file. A guide that is missing is left out.
 *
 * @param {{workspaceRoot: string, runId?: string, repo?: string}} opts
 * @returns {{path: string}} The bundle written
 * @throws {TimError} USAGE when the run id or repo is missing
 */
export const bakeBestPractices = ({ workspaceRoot, runId, repo }) => {
  if (!runId) throw new TimError('USAGE', '--run-id required')
  if (!repo) throw new TimError('USAGE', '--repo required')
  const path = join(runFolder(workspaceRoot, runId), repo, 'best-practices.md')
  const docsRoot = join(workspaceRoot, 'docs', 'best-practices')
  writeTextAtomic(path, bundleText(docsRoot, repo))
  return { path }
}
