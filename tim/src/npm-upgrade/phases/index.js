import { isTimError } from '../../errors.js'
import { putReposOnUnattendedBranch } from '../unattended/branch.js'
import { NO_JIRA, unattendedRunIdOf } from '../unattended/run.js'
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
const SWITCHES_BRANCHES = '0'

const stopWith = async (warn, message) => {
  await warn(message)
  throw new PhaseStopped(message)
}

const isTicketOperand = (operand) =>
  operand.startsWith('EUDPA-') || operand === NO_JIRA

const ticketOf = async (operands, warn) => {
  const unknown = operands.find((operand) => !isTicketOperand(operand))
  if (unknown !== undefined) {
    await stopWith(warn, `Unknown option: ${unknown}\n${UPGRADE_USAGE}`)
  }
  return operands.at(-1)
}

const unattendedRunIdFor = async (request) => {
  try {
    return unattendedRunIdOf(request)
  } catch (error) {
    if (!isTimError(error)) throw error
    return stopWith(request.warn, error.message)
  }
}

const runIdFor = async ({ unattended, ...request }) => {
  if (unattended) return unattendedRunIdFor(request)
  if (request.ticket === NO_JIRA) {
    await stopWith(
      request.warn,
      'NO_JIRA is for --unattended runs only. Give the ticket key, such as EUDPA-500.'
    )
  }
  return request.ticket
}

/**
 * Run one phase of an npm upgrade run across its repos. Text mode prints
 * `text`; `--json` puts `result` in the envelope.
 *
 * An unattended run takes a ticket key or NO_JIRA, needs a branch named
 * for it, refuses an allowlist owner and keeps its state under the branch
 * name without its chore/, fix/ or feat/. Its phase 0 first puts every
 * repo on that branch.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string[]} request.operands - The ticket, and anything else given that is not an option
 * @param {string} [request.phase] - 0, 1, 2, 3 or 4
 * @param {string[]} [request.repos] - Defaults to the roster's npmUpgradeDefault repos
 * @param {string} [request.strategy='latest']
 * @param {string[]} [request.packages] - Phase 1 discovers only these packages, with * as a wildcard
 * @param {string} [request.branch=''] - Refuse unless every repo is on it
 * @param {boolean} [request.unattended=false]
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
  packages = [],
  branch = '',
  unattended = false,
  ...request
}) => {
  const { warn } = request
  const ticket = await ticketOf(operands, warn)
  if (!ticket || !phase) await stopWith(warn, UPGRADE_USAGE)
  const runId = await runIdFor({ ...request, ticket, branch, unattended })
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
  if (unattended && phase === SWITCHES_BRANCHES) {
    await putReposOnUnattendedBranch({
      workspaceRoot: request.workspaceRoot,
      repos: npmRepos,
      branch,
      warn
    })
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
    packages,
    branch,
    unattended
  })
}
