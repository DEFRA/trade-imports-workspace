import { existsSync, statSync } from 'node:fs'
import { dirname, resolve, join } from 'node:path'
import { homedir } from 'node:os'
import { TimError } from '../errors.js'

const MARKER_FILES = ['.git', 'docs/best-practices']

/**
 * The default clone location, which `resolveWorkspaceRoot` falls back on
 * when nothing else names a workspace.
 */
export const CANONICAL_WORKSPACE_PATH = resolve(
  homedir(),
  'git',
  'defra',
  'trade-imports-workspace'
)

const looksLikeWorkspaceRoot = (path) =>
  MARKER_FILES.some((marker) => existsSync(join(path, marker))) &&
  (existsSync(join(path, 'repos.json')) || existsSync(join(path, 'repos')))

const walkUp = (start) => {
  let current = resolve(start)
  while (true) {
    if (looksLikeWorkspaceRoot(current)) return current
    const parent = dirname(current)
    if (parent === current) return null
    current = parent
  }
}

let canonicalFallbackWarned = false

const warnOnceOnStderr = (message) => {
  if (canonicalFallbackWarned) return
  canonicalFallbackWarned = true
  process.stderr.write(`${message}\n`)
}

export const canonicalFallbackWarning = (canonical) =>
  `Warning: you are not inside a workspace clone, so tim is using ${canonical}. Set TIM_WORKSPACE or pass --workspace to choose a clone.`

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
 * the canonical path. Falling back on the canonical path passes a warning
 * naming TIM_WORKSPACE to `warn`, which by default prints it to stderr once
 * per process.
 *
 * @param {object} [opts]
 * @param {string} [opts.explicit] - Explicit path passed via --workspace
 * @param {string} [opts.env] - Value of TIM_WORKSPACE env var
 * @param {string} [opts.cwd] - Working directory to walk up from
 * @param {string} [opts.canonical] - Path to fall back on when the walk-up finds nothing
 * @param {(message: string) => void} [opts.warn] - Receives the fallback warning
 * @returns {string} Absolute path to the workspace root
 * @throws {TimError} When no valid workspace root is found
 */
export const resolveWorkspaceRoot = ({
  explicit,
  env = process.env.TIM_WORKSPACE,
  cwd = process.cwd(),
  canonical = CANONICAL_WORKSPACE_PATH,
  warn = warnOnceOnStderr
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
        `Workspace path ${resolved} does not look like a trade-imports workspace. It needs a .git or docs/best-practices folder, and a repos.json file or a repos folder.`
      )
    }
    return resolved
  }
  const found = walkUp(cwd)
  if (found) return found
  if (looksLikeWorkspaceRoot(canonical)) {
    warn(canonicalFallbackWarning(canonical))
    return canonical
  }
  throw new TimError(
    'USAGE',
    `Cannot find the workspace root. Run from inside the trade-imports workspace checkout, set TIM_WORKSPACE, or clone the workspace to ${canonical}.`
  )
}
