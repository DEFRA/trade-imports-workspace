import { existsSync, statSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { homedir } from 'node:os'
import { TimError } from '../errors.js'

const MARKER_FILES = ['Makefile', '.git', 'docs/best-practices']

/**
 * Where CLAUDE.md rule 1 mandates the workspace lives. `tools/*.sh` hardcode
 * this path, so a checkout elsewhere is expected to be symlinked here.
 */
export const CANONICAL_WORKSPACE_PATH = resolve(
  homedir(),
  'git',
  'defra',
  'trade-imports-workspace'
)

const looksLikeWorkspaceRoot = (path) =>
  MARKER_FILES.some((marker) => existsSync(join(path, marker))) &&
  existsSync(join(path, 'repos'))

const walkUp = (start) => {
  let current = resolve(start)
  while (true) {
    if (looksLikeWorkspaceRoot(current)) return current
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

const isDirectory = (path) => {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/**
 * Resolves the workspace root with precedence: explicit option, TIM_WORKSPACE
 * env var, walking up from cwd looking for the workspace marker files, then
 * the canonical path. The canonical fallback is what lets tim run from
 * anywhere on a machine set up per CLAUDE.md rule 1; it comes last so a
 * checkout you are standing in always wins over it.
 *
 * @param {object} [opts]
 * @param {string} [opts.explicit] - Explicit path passed via --workspace
 * @param {string} [opts.env] - Value of TIM_WORKSPACE env var
 * @param {string} [opts.cwd] - Working directory to walk up from
 * @param {string} [opts.canonical] - Path to fall back on when the walk-up finds nothing
 * @returns {string} Absolute path to the workspace root
 * @throws {TimError} When no valid workspace root is found
 */
export const resolveWorkspaceRoot = ({
  explicit,
  env = process.env.TIM_WORKSPACE,
  cwd = process.cwd(),
  canonical = CANONICAL_WORKSPACE_PATH
} = {}) => {
  const candidate = explicit ?? env
  if (candidate) {
    const resolved = resolve(candidate)
    if (!isDirectory(resolved)) {
      throw new TimError(
        'USAGE',
        `Workspace path ${resolved} is not a directory.`
      )
    }
    if (!looksLikeWorkspaceRoot(resolved)) {
      throw new TimError(
        'USAGE',
        `Workspace path ${resolved} does not look like a trade-imports workspace (missing Makefile, .git or repos/).`
      )
    }
    return resolved
  }
  const found = walkUp(cwd)
  if (found) return found
  if (looksLikeWorkspaceRoot(canonical)) return canonical
  throw new TimError(
    'USAGE',
    `Cannot find the workspace root. Run from inside the trade-imports workspace checkout, set TIM_WORKSPACE, or symlink your checkout to ${canonical}.`
  )
}
