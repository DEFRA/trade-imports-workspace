import { existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { TimError } from '../errors.js'

/**
 * The checkout `tim spec lint` reads the Behaviour Spec from. Defaults to
 * the workspace root; `--root` overrides it so a run against a worktree
 * (`journey-builder` writes into `workareas/journey-builder/<run>/workspace-worktree`)
 * validates that tree instead of silently falling back to this checkout.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.root]
 * @returns {string} Absolute path to the spec root
 * @throws {TimError} USAGE when the resolved root has no openspec/specs
 */
export const resolveSpecRoot = ({ workspaceRoot, root }) => {
  const specRoot = root ? resolve(workspaceRoot, root) : workspaceRoot
  if (!existsSync(join(specRoot, 'openspec', 'specs'))) {
    throw new TimError(
      'USAGE',
      `${specRoot} has no openspec/specs — it is not a spec root.`
    )
  }
  return specRoot
}
