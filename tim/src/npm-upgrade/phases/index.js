import { auditPhase } from './audit-phase.js'
import { discoverPhase } from './discover-phase.js'
import { handoffPhase } from './handoff-phase.js'
import { automatedPhase, resetOverridesPhase } from './runner-phases.js'
import {
  PhaseStopped,
  refuseReposOffBranch,
  selectNpmRepos,
  UPGRADE_USAGE
} from './run-repos.js'

const PHASES = {
  0: auditPhase,
  1: discoverPhase,
  2: automatedPhase,
  3: handoffPhase,
  4: resetOverridesPhase
}

const READS_STATE_ONLY = '3'

const stopWith = async (warn, message) => {
  await warn(message)
  throw new PhaseStopped(message)
}

const ticketOf = async (operands, warn) => {
  const unknown = operands.find((operand) => !operand.startsWith('EUDPA-'))
  if (unknown !== undefined) {
    await stopWith(warn, `Unknown option: ${unknown}\n${UPGRADE_USAGE}`)
  }
  return operands.at(-1)
}

/**
 * Run one phase of an npm upgrade run across its repos. Text mode prints
 * `text`; `--json` puts `result` in the envelope.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string[]} request.operands - The ticket, and anything else given that is not an option
 * @param {string} [request.phase] - 0, 1, 2, 3 or 4
 * @param {string[]} [request.repos] - Defaults to the roster's npmUpgradeDefault repos
 * @param {string} [request.strategy='latest']
 * @param {string} [request.branch=''] - Refuse unless every repo is on it
 * @param {string} [request.allowlistOwner]
 * @param {string} [request.expiryDays]
 * @param {(line: string) => Promise<void>} request.warn
 * @returns {Promise<{exitCode: number, result: unknown, text: string}>}
 * @throws {PhaseStopped} for a usage error or a refusal, once it is written to stderr
 */
export const runUpgradePhase = async ({
  operands,
  phase,
  repos = [],
  strategy = 'latest',
  branch = '',
  ...request
}) => {
  const { warn } = request
  const runId = await ticketOf(operands, warn)
  if (!runId || !phase) await stopWith(warn, UPGRADE_USAGE)
  const npmRepos = await selectNpmRepos({
    workspaceRoot: request.workspaceRoot,
    requested: repos,
    warn
  })
  if (npmRepos.length === 0 && phase !== READS_STATE_ONLY) {
    await stopWith(
      warn,
      'No npm repos left to run after skipping the ones above. Check --repo.'
    )
  }
  await refuseReposOffBranch({
    workspaceRoot: request.workspaceRoot,
    repos: npmRepos,
    branch,
    warn
  })
  if (!Object.hasOwn(PHASES, phase)) {
    await stopWith(warn, `Invalid --phase: ${phase}\n${UPGRADE_USAGE}`)
  }
  return PHASES[phase]({
    ...request,
    runId,
    repos: npmRepos,
    strategy,
    branch
  })
}
