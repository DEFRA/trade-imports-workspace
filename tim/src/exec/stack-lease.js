import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'node:path'
import { run } from './exec.js'
import { runStackScriptToLog, stackContainerIds } from './stack.js'
import { serviceFingerprints } from './stack-fingerprints.js'
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

const sameContainers = (recorded, running) =>
  Array.isArray(recorded) &&
  recorded.length === running.length &&
  [...recorded].sort().join('\n') === [...running].sort().join('\n')

/**
 * What an acquire does, given whether the stack is up, which containers it
 * runs and who holds it: reuse it, start it, restart it, or refuse.
 *
 * - No lease: start a stack that is down; refuse one that is up (`unleased`).
 * - Another holder: refuse while their stack is up or their start still runs
 *   (`held`); otherwise the lease is stale, and is replaced.
 * - The same holder: reuse only a stack it finished starting whose containers
 *   are still the ones it recorded. A start of its own still running is
 *   refused (`starting`). A start that died part-way (a Bash timeout killing
 *   the acquire, say) left containers nobody finished: they are its own, so
 *   they are taken down and started again (`restart`). Containers other than
 *   the ones it recorded mean somebody restarted the stack by hand
 *   (`replaced`): never reused, never taken down.
 *
 * @param {{up: boolean, lease: object|null, holder: string, containers?: string[]}} state
 * @returns {'reuse'|'start'|'restart'|'held'|'unleased'|'starting'|'replaced'}
 */
export const acquireDecision = ({ up, lease, holder, containers = [] }) => {
  if (!lease) return up ? 'unleased' : 'start'
  if (lease.holder !== holder) {
    return up || isStarting(lease) ? 'held' : 'start'
  }
  if (isStarting(lease)) return 'starting'
  if (!up) return 'start'
  if (lease.state !== UP) return 'restart'
  return sameContainers(lease.containers, containers) ? 'reuse' : 'replaced'
}

const REFUSALS = {
  unleased: () =>
    'The workspace stack is up and nobody holds a lease on it, so somebody started it by hand (tim docker dev, say), outside any build. Leave it alone: ask whoever started it to take it down.',
  held: (lease) =>
    `The workspace stack is leased to ${describeLease(lease)}. Leave it alone: it is theirs to release.`,
  starting: (lease) =>
    `The workspace stack is leased to ${describeLease(lease)}, and that start is still running (pid ${lease.pid}). Wait for it to finish rather than starting another.`,
  replaced: (lease) =>
    `The workspace stack is leased to ${describeLease(lease)}, but its containers are not the ones that lease started: somebody restarted it by hand since. Nothing was reused or taken down. Find out whose stack it is.`
}

const refusalFor = (decision, lease) => REFUSALS[decision](lease)

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
 * Whether the workspace stack is up, the ids of its running containers, and
 * who, if anyone, holds its lease.
 *
 * @param {object} args
 * @param {string} args.leasePath
 * @param {object} [args.env] - Extra environment for docker
 * @returns {Promise<{up: boolean, containers: string[], lease: object|null}>}
 */
export const stackStatus = async ({ leasePath, env }) => {
  const containers = await stackContainerIds({ env })
  return { up: containers.length > 0, containers, lease: readLease(leasePath) }
}

const LOCK_ATTEMPTS = 10
const LOCK_WAIT_MS = 100
const LOCK_STALE_MS = 60_000

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const lockPathOf = (leasePath) => `${leasePath}.lock`

const isStaleLock = (lockPath) => {
  try {
    return Date.now() - statSync(lockPath).mtimeMs > LOCK_STALE_MS
  } catch {
    return false
  }
}

// mkdir is atomic: only one process creates the lock directory. A lock left
// by a process that died holding it is broken once it is a minute old.
const takeLock = async (lockPath) => {
  for (let attempt = 0; attempt < LOCK_ATTEMPTS; attempt += 1) {
    try {
      mkdirSync(lockPath)
      return true
    } catch (error) {
      if (error.code !== 'EEXIST') throw error
      if (isStaleLock(lockPath)) {
        rmSync(lockPath, { recursive: true, force: true })
      } else {
        await pause(LOCK_WAIT_MS)
      }
    }
  }
  return false
}

const writeExclusive = (leasePath, lease) => {
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

const unchangedSince = (leasePath, previous) => {
  const current = readLease(leasePath)
  return (
    current === null || JSON.stringify(current) === JSON.stringify(previous)
  )
}

// A fresh lease is one exclusive create. Taking over a stale lease is a
// remove then a create, so it runs under a lock: two processes that read the
// same stale lease cannot both remove it and both start the stack.
const claimLease = async (leasePath, lease, previous) => {
  mkdirSync(dirname(leasePath), { recursive: true })
  if (!previous) return writeExclusive(leasePath, lease)
  const lockPath = lockPathOf(leasePath)
  if (!(await takeLock(lockPath))) return false
  try {
    if (!unchangedSince(leasePath, previous)) return false
    rmSync(leasePath, { force: true })
    return writeExclusive(leasePath, lease)
  } finally {
    rmSync(lockPath, { recursive: true, force: true })
  }
}

const stackScript = ({ workspaceRoot, env }, script, args, logPath) =>
  runStackScriptToLog({ workspaceRoot, script, args, env, logPath })

const scriptFailure = (script, result) =>
  `${script} exited ${result.exitCode}. Read ${result.log}.`

const downLogFor = (logPath) => logPath.replace(/(\.log)?$/, '-down.log')

const refused = ({ up, lease, reason }) => ({
  acquired: false,
  refused: true,
  up,
  holder: lease?.holder ?? null,
  lease,
  reason
})

const startFailed = ({ log, reason }) => ({
  acquired: false,
  refused: false,
  up: false,
  holder: null,
  lease: null,
  log,
  reason
})

const startUnderLease = async (context, previous) => {
  const { workspaceRoot, holder, mode, leasePath, logPath, env } = context
  const lease = {
    holder,
    mode,
    workspace: workspaceRoot,
    branches: mode === 'dev' ? await repoBranches(workspaceRoot) : {},
    acquiredAt: new Date().toISOString(),
    state: STARTING,
    pid: process.pid,
    containers: [],
    fingerprints: mode === 'dev' ? await serviceFingerprints(workspaceRoot) : {}
  }
  if (!(await claimLease(leasePath, lease, previous))) {
    const winner = readLease(leasePath)
    return refused({
      up: false,
      lease: winner,
      reason: winner
        ? refusalFor('held', winner)
        : 'Another acquire is taking the workspace stack lease over right now. Try again once it has finished.'
    })
  }
  const upRun = await stackScript(
    context,
    'run-stack.sh',
    RUN_STACK_ARGS[mode],
    logPath
  )
  if (upRun.exitCode === 0) {
    const containers = await stackContainerIds({ env })
    const held = { ...lease, state: UP, pid: null, containers }
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
    downLogFor(logPath)
  )
  rmSync(leasePath, { force: true })
  const takenDown =
    downRun.exitCode === 0
      ? 'It was taken down again and the lease cleared.'
      : `Taking it down again failed too: ${scriptFailure('stop-stack.sh', downRun)} The lease was cleared.`
  return startFailed({
    log: upRun.log,
    reason: `The workspace stack did not come up (run-stack.sh exited ${upRun.exitCode}). Read ${upRun.log}. ${takenDown}`
  })
}

// The holder's own start died part-way, so the containers up now are its
// own half-started stack: take them down, then start again cleanly.
const restartUnderLease = async (context, lease) => {
  const downRun = await stackScript(
    context,
    'stop-stack.sh',
    [],
    downLogFor(context.logPath)
  )
  if (downRun.exitCode !== 0) {
    return startFailed({
      log: downRun.log,
      reason: `An earlier start of the workspace stack under this lease did not finish, and the half-started stack did not come down (${scriptFailure('stop-stack.sh', downRun)}) The lease is kept.`
    })
  }
  return startUnderLease(context, lease)
}

/**
 * Take the lease on the workspace stack for one holder. A stack that is down
 * is started (built from local source in dev mode) and leased to the holder,
 * recording its container ids; one the same holder already leases, with
 * those same containers, is reused as it is. A stack leased to anyone else,
 * up with no lease at all, or restarted by hand under a lease, is refused
 * and left exactly as it is. A lease whose stack has gone, and whose start is
 * not still running, is stale and is replaced under a lock.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.holder - Who takes the lease, such as a build run's id, "ibl-20261001T150000Z"
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
  const { up, containers, lease } = await stackStatus({ leasePath, env })
  const decision = acquireDecision({ up, lease, holder, containers })
  const context = { workspaceRoot, holder, mode, leasePath, logPath, env }
  if (decision === 'reuse') {
    return { acquired: true, reused: true, started: false, lease, log: null }
  }
  if (decision === 'start') return startUnderLease(context, lease)
  if (decision === 'restart') return restartUnderLease(context, lease)
  return refused({ up, lease, reason: refusalFor(decision, lease) })
}

/**
 * Give the lease back: take down the stack the holder started, then clear
 * the lease. A lease held by anyone else is refused and left alone, and so is
 * a stack nobody leases. A stack whose containers are not the ones the lease
 * recorded was restarted by hand: it is left up, never taken down, and the
 * lease that no longer describes it is cleared. When stop-stack.sh fails the
 * lease is kept, so nobody takes a stack that is half down.
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
  const containers = await stackContainerIds({ env })
  if (containers.length === 0) {
    rmSync(leasePath, { force: true })
    return { released: true, stoppedStack: false, holder, log: null }
  }
  if (lease.state === UP && !sameContainers(lease.containers, containers)) {
    rmSync(leasePath, { force: true })
    return {
      released: false,
      refused: false,
      foreign: true,
      stoppedStack: false,
      holder,
      reason: `The workspace stack running now is not the one "${holder}" started: its containers changed, so somebody restarted it by hand. It was left up, and the lease that no longer describes it was cleared.`
    }
  }
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

/**
 * Record the stack's containers on the holder's own lease again, after the
 * holder rebuilt the stack under it (a rebuild recreates containers, giving
 * them new ids). A lease somebody else holds is left alone.
 *
 * @param {object} args
 * @param {string} args.holder
 * @param {string} args.leasePath
 * @param {object} [args.env]
 * @returns {Promise<boolean>} whether the lease was the holder's and was updated
 */
export const recordLeaseContainers = async ({ holder, leasePath, env }) => {
  const lease = readLease(leasePath)
  if (!lease || lease.holder !== holder) return false
  const containers = await stackContainerIds({ env })
  writeJsonAtomic(leasePath, { ...lease, containers })
  return true
}

/**
 * Record what each dev service now serves on the holder's own lease, after
 * the holder rebuilt or restarted services under it. A lease somebody else
 * holds is left alone.
 *
 * @param {object} args
 * @param {string} args.holder
 * @param {string} args.leasePath
 * @param {Record<string, {build: string|null, source: string|null}>} args.fingerprints
 * @returns {boolean} whether the lease was the holder's and was updated
 */
export const recordLeaseFingerprints = ({
  holder,
  leasePath,
  fingerprints
}) => {
  const lease = readLease(leasePath)
  if (!lease || lease.holder !== holder) return false
  writeJsonAtomic(leasePath, { ...lease, fingerprints })
  return true
}
