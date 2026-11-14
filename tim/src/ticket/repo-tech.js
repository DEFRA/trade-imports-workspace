import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { repoPath } from '../constants/repos.js'
import { detectRepoTech } from '../review/detect-tech.js'

const NO_TECH = { technologies: [], best_practices: [] }

const isDirectory = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false

const detectedOrNone = ({ workspaceRoot, repoDir }) => {
  try {
    return detectRepoTech({ workspaceRoot, repoPath: repoDir })
  } catch {
    return NO_TECH
  }
}

/**
 * The technologies and best-practice files the review routing finds in
 * each named repo, in the order given. A repo not on disk is logged and
 * left out; a repo the routing cannot be read for detects nothing.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string[]} args.repos - Repo names under the workspace's repos folder
 * @param {(line: string) => Promise<void>} args.log - Receives each progress line
 * @returns {Promise<Array<{repo: string, tech: {technologies: string[], best_practices: string[]}}>>}
 */
export const detectTechPerRepo = async ({ workspaceRoot, repos, log }) => {
  const entries = []
  for (const repo of repos) {
    const repoDir = repoPath(workspaceRoot, repo)
    if (!isDirectory(repoDir)) {
      await log(`  ! ${repo}: repo not found at ${repoDir} — skipping`)
      continue
    }
    const tech = detectedOrNone({ workspaceRoot, repoDir })
    await log(`  ✓ ${repo} [${tech.technologies.join(', ')}]`)
    entries.push({ repo, tech })
  }
  return entries
}

const bundleSection = (workspaceRoot, practicePath) => {
  const heading = `\n---\n\n## Source: \`${practicePath}\``
  const sourcePath = join(workspaceRoot, practicePath)
  const source = statSync(sourcePath, { throwIfNoEntry: false })
  if (!source?.isFile()) {
    return `${heading} (missing — check tim review detect-tech)\n`
  }
  return `${heading}\n\n${readFileSync(sourcePath, 'utf8')}`
}

/**
 * One repo's best-practices bundle: a heading, then each best-practice
 * file in full under its own heading, or a marker where the file is
 * missing.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.repo
 * @param {string[]} args.bestPractices - Paths from the workspace root
 * @returns {string}
 */
export const bestPracticesBundle = ({ workspaceRoot, repo, bestPractices }) =>
  [
    `# Best practices applicable to ${repo}\n`,
    '\n',
    'Concatenated from `docs/best-practices/` at prepare-plan time.\n',
    'Apply these standards when planning changes in this repo.\n',
    '\n',
    ...bestPractices
      .filter((practicePath) => practicePath !== '')
      .map((practicePath) => bundleSection(workspaceRoot, practicePath))
  ].join('')
