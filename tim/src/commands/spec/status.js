import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { computeSpecStatus } from '../../spec/status.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const shortSha = (sha) => sha?.slice(0, 12) ?? 'unknown'

const repoLine = (entry) => {
  if (!entry.cloned) return `  ${entry.repo.padEnd(34)} not cloned`
  const status =
    entry.changedLinkedFiles.length === 0
      ? 'unchanged'
      : `${entry.changedLinkedFiles.length} linked file${entry.changedLinkedFiles.length === 1 ? '' : 's'} changed: ${entry.changedLinkedFiles.join(', ')}`
  return `  ${entry.repo.padEnd(34)} ${shortSha(entry.baselineSha)} -> ${shortSha(entry.headSha)}  ${status}`
}

/**
 * The plain-text report of `tim spec status`.
 *
 * @param {object} result
 * @returns {string}
 */
export const renderStatusText = (result) =>
  [
    `Behaviour Spec verified ${result.verifiedAt} (${result.verifiedBy}).`,
    ...result.repos.map(repoLine),
    `${result.totalChangedLinkedFiles} linked test file${result.totalChangedLinkedFiles === 1 ? '' : 's'} changed across ${result.capabilitiesAffected} of ${result.capabilityCount} capabilities.`
  ].join('\n')

export const register = (program, { timVersion }) => {
  program
    .command('status')
    .description(
      'Per repo, the baseline the Behaviour Spec was last verified against, current HEAD, and how many linked test files changed since'
    )
    .addHelpText('after', '\nExample:\n  tim spec status --json')
    .action(async function statusAction() {
      const globalOpts = this.optsWithGlobals()
      try {
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const result = await computeSpecStatus({ workspaceRoot })
        emit(
          globalOpts.json
            ? JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
            : renderStatusText(result)
        )
        process.exit(OK)
      } catch (error) {
        if (globalOpts.json) {
          emit(
            JSON.stringify(
              jsonEnvelope({
                ok: false,
                error: errorPayloadFor(error),
                timVersion
              })
            )
          )
        } else {
          emitError(error.message ?? String(error))
        }
        process.exit(exitCodeFor(error))
      }
    })
}
