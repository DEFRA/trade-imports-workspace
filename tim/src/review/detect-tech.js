import { statSync } from 'node:fs'
import {
  detectTechnologies,
  loadReviewRouting
} from '../backlog/standards/review-routing.js'
import { listRepoFiles } from '../backlog/standards/repo-files.js'

const isDirectory = (path) => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/**
 * The technologies the review skill's routing detects in one repo, and the
 * best-practice files each brings, in routing order and not deduplicated.
 * A missing, empty or non-folder `repoPath` detects nothing and reads no
 * routing.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot - From `resolveWorkspaceRoot`
 * @param {string} [args.repoPath]
 * @returns {{technologies: string[], best_practices: string[]}}
 * @throws {import('../errors.js').TimError} NOT_FOUND or PARSE when the
 *   review routing cannot be read
 */
export const detectRepoTech = ({ workspaceRoot, repoPath }) => {
  if (!repoPath || !isDirectory(repoPath)) {
    return { technologies: [], best_practices: [] }
  }
  const { technologies, bestPractice } = detectTechnologies({
    routing: loadReviewRouting(workspaceRoot),
    repoDir: repoPath,
    repoFiles: listRepoFiles({ repoDir: repoPath })
  })
  return { technologies, best_practices: bestPractice }
}

const jsonArrayText = (values) => JSON.stringify(values, null, 2)

/**
 * The one-line object `tim review detect-tech --no-ui` prints, each array
 * indented by two spaces as `jq -s` writes it.
 *
 * @param {{technologies: string[], best_practices: string[]}} detected
 * @returns {string}
 */
export const renderDetectedTechText = (detected) =>
  `{"technologies":${jsonArrayText(detected.technologies)},"best_practices":${jsonArrayText(detected.best_practices)}}`
