import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { run } from './exec.js'
import { runStackScriptToLog, stackContainers } from './stack.js'
import { writeJsonAtomic } from '../backlog/io.js'
import { TimError } from '../errors.js'

export const LEASE_MODES = ['dev', 'up']

// run-stack.sh -d builds the repo-backed services from local source under
// repos/; with no flag it pulls the published images.
const RUN_STACK_ARGS = { dev: ['-d'], up: [] }

const STARTING = 'starting'
const UP = 'up'

/**
 * Where the stack lease lives: one file per machine, because the workspace
 * stack is one compose project per machine whichever checkout started it.
 * TIM_STACK_LEASE overrides it; otherwise it sits under XDG_STATE_HOME, or
 * ~/.local/state, outside every repo.
 *
 * @param {object} [env]
 * @returns {string}
 */
export const defaultLeasePath = (env = process.env) =>
  env.TIM_STACK_LEASE ||
  join(
    env.XDG_STATE_HOME || join(homedir(), '.local', 'state'),
    'tim',
    'stack-lease.json'
  )

/**
 * The lease on the workspace stack, or null when nobody holds one.
 *
 * @param {string} leasePath
 * @returns {object|null}
 * @throws {TimError} PARSE when the file is not valid JSON
 */
export const readLease = (leasePath) => {
  if (!existsSync(leasePath)) return null
  try {
    return JSON.parse(readFileSync(leasePath, 'utf8'))
  } catch (error) {
    throw new TimError(
      'PARSE',
      `The stack lease at ${leasePath} is not valid JSON (${error.message}). Find out who holds the stack, then delete the file.`
    )
  }
}

const describeBranches = (branches = {}) => {
  const entries = Object.entries(branches)
  return entries.length === 0
    ? ''
    : `, repos on ${entries.map(([repo, branch]) => `${repo} ${branch}`).join(', ')}`
}

/**
 * A lease as words: who holds it, its mode, since when and the branches its
 * repos were on, for a refusal a person can act on.
 *
 * @param {object} lease
 * @returns {string}
 */
export const describeLease = ({ holder, mode, acquiredAt, branches, state }) =>
  `"${holder}" (${mode} mode${state === STARTING ? ', still starting' : ''}, since ${acquiredAt}${describeBranches(branches)})`

const isProcessAlive = (pid) => {
  if (!Number.isInteger(pid)) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    return error.code === 'EPERM'
  }
}

const isStarting = (lease) =>
  lease.state === STARTING && isProcessAlive(lease.pid)

/**
 * What an acquire does, given whether the stack is up and who holds it:
 * reuse it, start it, or refuse.
 *
 * @param {{up: boolean, lease: object|null, holder: string}} state
 * @returns {'reuse'|'start'|'held'|'unleased'}
 */
export const acquireDecision = ({ up, lease, holder }) => {
  if (!lease) return up ? 'unleased' : 'start'
  if (lease.holder === holder) return up ? 'reuse' : 'start'
  return up || isStarting(lease) ? 'held' : 'start'
}

const refusalFor = (decision, lease) =>
  decision === 'unleased'
    ? 'The workspace stack is up and nobody holds a lease on it, so somebody started it by hand (tim docker dev, say), outside any build. Leave it alone: ask whoever started it to take it down.'
    : `The workspace stack is leased to ${describeLease(lease)}. Leave it alone: it is theirs to release.`

const currentBranch = async (path) => {
  const result = await run('git', ['-C', path, 'branch', '--show-current'])
  return result.stdout.trim() || '(detached)'
}

/**
 * The branch each repo under repos/ is on: what a stack built from local
 * source serves.
 *
 * @param {string} workspaceRoot
 * @returns {Promise<Record<string, string>>}
 */
export const repoBranches = async (workspaceRoot) => {
  const reposDir = join(workspaceRoot, 'repos')
  if (!existsSync(reposDir)) return {}
  const folders = readdirSync(reposDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((name) => existsSync(join(reposDir, name, '.git')))
    .sort()
  const branches = {}
  for (const folder of folders) {
    branches[folder] = await currentBranch(join(reposDir, folder))
  }
  return branches
}

/**
 * Whether the workspace stack is up and who, if anyone, holds its lease.
 *
 * @param {object} args
 * @param {string} args.leasePath
 * @param {object} [args.env] - Extra environment for docker
 * @returns {Promise<{up: boolean, containers: string[], lease: object|null}>}
 */
export const stackStatus = async ({ leasePath, env }) => {
  const containers = await stackContainers({ env })
  return { up: containers.length > 0, containers, lease: readLease(leasePath) }
}

// A stale lease is removed only while it is still the one this acquire read,
// so a lease another process has just written is never removed.
const removeIfUnchanged = (leasePath, previous) => {
  try {
    const current = JSON.parse(readFileSync(leasePath, 'utf8'))
    if (JSON.stringify(current) === JSON.stringify(previous)) {
      rmSync(leasePath, { force: true })
    }
  } catch {
    // Gone already, or rewritten mid-read: the exclusive write below decides.
  }
}

const claimLease = (leasePath, lease, previous) => {
  mkdirSync(dirname(leasePath), { recursive: true })
  if (previous) removeIfUnchanged(leasePath, previous)
  try {
    writeFileSync(leasePath, `${JSON.stringify(lease, null, 2)}\n`, {
      flag: 'wx'
    })
    return true
  } catch (error) {
    if (error.code === 'EEXIST') return false
    throw error
  }
}

const stackScript = ({ workspaceRoot, env }, script, args, logPath) =>
  runStackScriptToLog({ workspaceRoot, script, args, env, logPath })

const scriptFailure = (script, result) =>
  `${script} exited ${result.exitCode}. Read ${result.log}.`

const refused = ({ up, lease, reason }) => ({
  acquired: false,
  refused: true,
  up,
  holder: lease?.holder ?? null,
  lease,
  reason
})

const startUnderLease = async (context, previous) => {
  const { workspaceRoot, holder, mode, leasePath, logPath } = context
  const lease = {
    holder,
    mode,
    workspace: workspaceRoot,
    branches: mode === 'dev' ? await repoBranches(workspaceRoot) : {},
    acquiredAt: new Date().toISOString(),
    state: STARTING,
    pid: process.pid
  }
  if (!claimLease(leasePath, lease, previous)) {
    const winner = readLease(leasePath)
    return refused({
      up: false,
      lease: winner,
      reason: refusalFor('held', winner)
    })
  }
  const upRun = await stackScript(
    context,
    'run-stack.sh',
    RUN_STACK_ARGS[mode],
    logPath
  )
  if (upRun.exitCode === 0) {
    const held = { ...lease, state: UP, pid: null }
    writeJsonAtomic(leasePath, held)
    return {
      acquired: true,
      reused: false,
      started: true,
      lease: held,
      log: upRun.log,
      replaced: previous && previous.holder !== holder ? previous.holder : null
    }
  }
  const downRun = await stackScript(
    context,
    'stop-stack.sh',
    [],
    logPath.replace(/(\.log)?$/, '-down.log')
  )
  rmSync(leasePath, { force: true })
  const takenDown =
    downRun.exitCode === 0
      ? 'It was taken down again and the lease cleared.'
      : `Taking it down again failed too: ${scriptFailure('stop-stack.sh', downRun)} The lease was cleared.`
  return {
    acquired: false,
    refused: false,
    up: false,
    holder: null,
    lease: null,
    log: upRun.log,
    reason: `The workspace stack did not come up (run-stack.sh exited ${upRun.exitCode}). Read ${upRun.log}. ${takenDown}`
  }
}

/**
 * Take the lease on the workspace stack for one holder. A stack that is down
 * is started (built from local source in dev mode) and leased to the holder;
 * one the same holder already leases is reused as it is. A stack leased to
 * anyone else, or up with no lease at all, is refused and left exactly as it
 * is. A lease whose stack has gone, and whose start is not still running, is
 * stale and is replaced.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.holder - Who takes the lease, such as "ibl-20261001T090000Z inc-003 ladder"
 * @param {'dev'|'up'} [args.mode]
 * @param {string} args.leasePath
 * @param {string} args.logPath - Where run-stack.sh writes its output
 * @param {object} [args.env] - Extra environment for docker and the stack scripts
 * @returns {Promise<object>} acquired, and either reused/started with the lease, or refused with the holder and the reason
 */
export const acquireStack = async ({
  workspaceRoot,
  holder,
  mode = 'dev',
  leasePath,
  logPath,
  env
}) => {
  const { up, lease } = await stackStatus({ leasePath, env })
  const decision = acquireDecision({ up, lease, holder })
  if (decision === 'reuse') {
    return { acquired: true, reused: true, started: false, lease, log: null }
  }
  if (decision !== 'start') {
    return refused({ up, lease, reason: refusalFor(decision, lease) })
  }
  return startUnderLease(
    { workspaceRoot, holder, mode, leasePath, logPath, env },
    lease
  )
}

/**
 * Give the lease back: take down the stack the holder started, then clear
 * the lease. A lease held by anyone else is refused and left alone, and so is
 * a stack nobody leases. When stop-stack.sh fails the lease is kept, so
 * nobody takes a stack that is half down.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.holder
 * @param {string} args.leasePath
 * @param {string} args.logPath - Where stop-stack.sh writes its output
 * @param {object} [args.env]
 * @returns {Promise<object>} released, whether the stack was stopped, or the reason nothing was
 */
export const releaseStack = async ({
  workspaceRoot,
  holder,
  leasePath,
  logPath,
  env
}) => {
  const lease = readLease(leasePath)
  if (!lease) {
    return {
      released: false,
      refused: false,
      stoppedStack: false,
      holder: null,
      reason:
        'Nobody holds a lease on the workspace stack, so there is nothing to release. The stack was left as it is.'
    }
  }
  if (lease.holder !== holder) {
    return {
      released: false,
      refused: true,
      stoppedStack: false,
      holder: lease.holder,
      lease,
      reason: `The workspace stack is leased to ${describeLease(lease)}, not to "${holder}". Nothing was released.`
    }
  }
  const containers = await stackContainers({ env })
  if (containers.length > 0) {
    const downRun = await stackScript(
      { workspaceRoot, env },
      'stop-stack.sh',
      [],
      logPath
    )
    if (downRun.exitCode !== 0) {
      return {
        released: false,
        refused: false,
        stoppedStack: false,
        holder,
        lease,
        log: downRun.log,
        reason: `The workspace stack did not come down (stop-stack.sh exited ${downRun.exitCode}). Read ${downRun.log}. The lease is kept so nobody takes a stack that is half down.`
      }
    }
    rmSync(leasePath, { force: true })
    return { released: true, stoppedStack: true, holder, log: downRun.log }
  }
  rmSync(leasePath, { force: true })
  return { released: true, stoppedStack: false, holder, log: null }
}
