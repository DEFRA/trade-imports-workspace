import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import {
  detectTechnologies,
  loadReviewRouting
} from '../backlog/standards/review-routing.js'
import { listRepoFiles } from '../backlog/standards/repo-files.js'

const isDirectory = (path) => existsSync(path) && statSync(path).isDirectory()

const isFile = (path) => existsSync(path) && statSync(path).isFile()

/**
 * The review skill's routing data, or null after a warning when it cannot
 * be read, so every bundle is its heading alone.
 *
 * @param {string} workspaceRoot
 * @param {(line: string) => void} warn
 * @returns {object | null}
 */
export const loadRoutingForBundles = (workspaceRoot, warn) => {
  try {
    return loadReviewRouting(workspaceRoot)
  } catch (error) {
    warn(
      `Can't read the review routing data, so each best-practices bundle holds its heading only: ${error.message}`
    )
    return null
  }
}

const bestPracticePathsFor = ({ workspaceRoot, routing, repo }) => {
  const repoDir = join(workspaceRoot, 'repos', repo)
  if (routing === null || !isDirectory(repoDir)) return []
  return detectTechnologies({
    routing,
    repoDir,
    repoFiles: listRepoFiles({ repoDir })
  }).bestPractice
}

const sourceSection = (workspaceRoot, path) =>
  `\n---\n\n## Source: \`${path}\`\n\n${readFileSync(join(workspaceRoot, path), 'utf8')}`

/**
 * The best-practice guides that apply to a workspace repo, one after
 * another under a heading. A repo not cloned under `repos/`, or no
 * routing data, gives the heading alone; a guide that does not exist is
 * left out.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {object | null} args.routing - From {@link loadRoutingForBundles}
 * @param {string} args.repo
 * @returns {string}
 */
export const bestPracticesBundle = ({ workspaceRoot, routing, repo }) => {
  const heading = `# Best practices applicable to ${repo}\n\nConcatenated at prepare-check time. Read these before analysing the diff.\n\n`
  const sections = bestPracticePathsFor({ workspaceRoot, routing, repo })
    .filter((path) => path !== '' && isFile(join(workspaceRoot, path)))
    .map((path) => sourceSection(workspaceRoot, path))
  return `${heading}${sections.join('')}`
}
