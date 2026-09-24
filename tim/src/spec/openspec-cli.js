import { run as runProcess } from '../exec/exec.js'
import { TimError } from '../errors.js'

const OPENSPEC_PACKAGE = '@fission-ai/openspec@latest'

/**
 * Checks 1 and 2, delegated. Shells out to `openspec validate --specs
 * --strict --json` (or one capability, scoped) and turns every issue on an
 * invalid item into a finding. Does not reimplement Purpose-presence or the
 * >=1-scenario rule — two sources of truth for one error is worse than
 * none.
 *
 * @param {object} args
 * @param {string} args.specRoot
 * @param {string} [args.capability]
 * @param {Function} [args.run] - The subprocess seam; defaults to tim's exec.run
 * @returns {Promise<object[]>}
 * @throws {TimError} MISSING_DEP when npx is not on PATH; PARSE when the CLI's
 *   own stdout is not JSON
 */
export const validateWithOpenspecCli = async ({
  specRoot,
  capability,
  run = runProcess
}) => {
  const args = [
    '--yes',
    OPENSPEC_PACKAGE,
    'validate',
    ...(capability ? [capability] : ['--specs']),
    '--strict',
    '--json'
  ]
  const result = await run('npx', args, { cwd: specRoot })

  let parsed
  try {
    parsed = JSON.parse(result.stdout)
  } catch (error) {
    throw new TimError(
      'PARSE',
      `openspec validate's output was not JSON: ${error.message}`
    )
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !Array.isArray(parsed.items)
  ) {
    const first = parsed?.status?.[0]?.message
    throw new TimError(
      'PARSE',
      first
        ? `openspec validate did not return items: ${first}`
        : 'openspec validate did not return an items array.'
    )
  }

  return parsed.items
    .filter((item) => !item.valid)
    .flatMap((item) =>
      (item.issues ?? []).map((issue) => ({
        check: 'openspec-validate',
        capability: item.id,
        message: `[${issue.level}] ${issue.path}: ${issue.message}`
      }))
    )
}
