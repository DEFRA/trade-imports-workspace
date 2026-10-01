import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runToLog } from '../exec/exec.js'
import { runStackScriptToLog } from '../exec/stack.js'
import {
  acquireStack,
  releaseStack,
  recordLeaseContainers,
  readLease,
  describeLease,
  defaultLeasePath
} from '../exec/stack-lease.js'
import { backlogPathFor } from '../commands/backlog/rows.js'
import { readEnvelopeRepos } from './envelope-repos.js'
import { loadGates, planRungs, MVN_VERIFY } from './gates.js'
import { isPortHeld, portHolder, describeHolder } from './ports.js'

export const GATE_PHASES = ['unit', 'fit', 'e2e', 'all']

/**
 * Who the gate takes the stack lease as when no holder is given: this gate
 * run, by its workarea and process.
 *
 * @param {string} workarea
 * @returns {string}
 */
export const defaultGateHolder = (workarea) =>
  `tim build gate ${workarea} (pid ${process.pid})`

// run-stack.sh -d builds the repo-backed services from local source under
// repos/, so the stack serves the branch each repo is on.
const DEV_STACK_ARGS = ['-d']

/**
 * The folder a gate's logs go to by default: `logs/` beside the backlog.
 *
 * @param {string} workspaceRoot
 * @param {string} workarea
 * @returns {string}
 */
export const defaultLogsDir = (workspaceRoot, workarea) =>
  join(backlogPathFor(workspaceRoot, workarea), '..', 'logs')

export const logPathFor = (logsDir, repo, name) =>
  join(logsDir, `gate-${repo}-${name}.log`)

const commandFor = ({ run, scope }) =>
  run === MVN_VERIFY
    ? { command: 'mvn', args: ['-B', 'verify'] }
    : {
        command: 'npm',
        args: ['run', run, ...(scope.length > 0 ? ['--', ...scope] : [])]
      }

const readScripts = (path) => {
  try {
    return (
      JSON.parse(readFileSync(join(path, 'package.json'), 'utf8')).scripts ?? {}
    )
  } catch {
    return null
  }
}

/**
 * Why a planned rung cannot run in its repo as it stands, or null when it
 * can: the repo is missing, or it has no pom.xml or no such npm script.
 *
 * @param {object} rung - A planned rung
 * @returns {string|null}
 */
export const cannotRunBecause = ({ repo, path, run }) => {
  if (!existsSync(path)) return `${repo} is not cloned at ${path}.`
  if (run === MVN_VERIFY) {
    return existsSync(join(path, 'pom.xml'))
      ? null
      : `${repo} has no pom.xml, so "${MVN_VERIFY}" cannot run.`
  }
  const scripts = readScripts(path)
  if (!scripts) return `${repo} has no readable package.json.`
  return Object.hasOwn(scripts, run)
    ? null
    : `${repo}'s package.json has no "${run}" script.`
}

/**
 * One rung's entry in the gate result.
 *
 * @returns {{repo: string, name: string, phase: string, ok: boolean, exitCode: number|null, log: string|null, durationMs: number, reason: string|null}}
 */
export const rungResult = ({
  rung,
  ok,
  exitCode = null,
  log = null,
  durationMs = 0,
  reason = null
}) => ({
  repo: rung.repo,
  name: rung.name,
  phase: rung.phase,
  ok,
  exitCode,
  log,
  durationMs,
  reason
})

const failed = (rung, reason, extra = {}) =>
  rungResult({ rung, ok: false, reason, ...extra })

const runRung = async (rung, { logsDir, env }) => {
  if (rung.refusal) return failed(rung, rung.refusal)
  const blocker = cannotRunBecause(rung)
  if (blocker) return failed(rung, blocker)
  const { command, args } = commandFor(rung)
  const logPath = logPathFor(logsDir, rung.repo, rung.name)
  try {
    const { exitCode, durationMs, log } = await runToLog(command, args, {
      cwd: rung.path,
      env,
      logPath
    })
    return rungResult({
      rung,
      ok: exitCode === 0,
      exitCode,
      log,
      durationMs,
      reason:
        exitCode === 0 ? null : `${command} exited ${exitCode}. Read ${log}.`
    })
  } catch (error) {
    return failed(rung, error.message ?? String(error), { log: logPath })
  }
}

const UNLEASED_STACK =
  'Nobody holds a lease on the workspace stack, so somebody started it by hand, outside any build.'

const workspaceStackNote = (lease) =>
  lease
    ? `The workspace stack is leased to ${describeLease(lease)}.`
    : UNLEASED_STACK

const leaseOrUnreadable = (leasePath) => {
  try {
    return readLease(leasePath)
  } catch (error) {
    return {
      holder: `nobody tim can name (${messageOf(error)})`,
      mode: '?',
      acquiredAt: '?'
    }
  }
}

const heldPortReason = (port, holder, lease) => {
  const reason = `Port ${port} is in use by ${describeHolder(holder)}. The rung needs it free.`
  return holder.workspaceStack
    ? `${reason} ${workspaceStackNote(lease)}`
    : reason
}

// The first FIT port the workspace stack holds is recorded as the gate's
// `stack.held`, naming the lease holder, so a caller can tell a held stack
// from a red rung without reading the reason.
const heldPortReasons = async (ports, context) => {
  const reasons = []
  for (const port of ports) {
    if (await isPortHeld(port)) {
      const holder = await portHolder(port, { env: context.env })
      const lease = holder.workspaceStack
        ? leaseOrUnreadable(context.leasePath)
        : null
      const reason = heldPortReason(port, holder, lease)
      reasons.push(reason)
      if (holder.workspaceStack && !context.held) {
        context.held = { holder: lease?.holder ?? null, detail: reason }
      }
    }
  }
  return reasons
}

const runFitRung = async (rung, context) => {
  if (rung.refusal) return failed(rung, rung.refusal)
  const held = await heldPortReasons(rung.ports, context)
  return held.length > 0 ? failed(rung, held.join(' ')) : runRung(rung, context)
}

const runInOrder = async (rungs, runOne) => {
  const results = []
  for (const rung of rungs) {
    results.push(await runOne(rung))
  }
  return results
}

const logIn = (context, logName) => join(context.logsDir, logName)

const NO_E2E_STACK = {
  wasUp: null,
  startedForE2e: false,
  stoppedAfter: false,
  servedFrom: null,
  upLog: null,
  downLog: null,
  downError: null,
  held: null
}

const failAll = (rungs, reason) => rungs.map((rung) => failed(rung, reason))

const messageOf = (error) => error.message ?? String(error)

const takeLease = async (context) => {
  try {
    return await acquireStack({
      workspaceRoot: context.workspaceRoot,
      holder: context.holder,
      mode: 'dev',
      leasePath: context.leasePath,
      logPath: logIn(context, 'gate-stack-up.log'),
      env: context.env
    })
  } catch (error) {
    return {
      acquired: false,
      refused: false,
      up: null,
      reason: `Can't tell whether the workspace stack is free: ${messageOf(error)}`
    }
  }
}

// A rebuild recreates containers, so the lease records their new ids: a
// later release then knows the stack is still the holder's own.
const rebuild = async (context) => {
  try {
    const up = await runStackScriptToLog({
      workspaceRoot: context.workspaceRoot,
      script: 'run-stack.sh',
      args: DEV_STACK_ARGS,
      env: context.env,
      logPath: logIn(context, 'gate-stack-up.log')
    })
    if (up.exitCode === 0) {
      await recordLeaseContainers({
        holder: context.holder,
        leasePath: context.leasePath,
        env: context.env
      })
    }
    return up
  } catch (error) {
    return { exitCode: null, log: null, error: messageOf(error) }
  }
}

const giveBack = async (context) => {
  try {
    return await releaseStack({
      workspaceRoot: context.workspaceRoot,
      holder: context.holder,
      leasePath: context.leasePath,
      logPath: logIn(context, 'gate-stack-down.log'),
      env: context.env
    })
  } catch (error) {
    return { released: false, log: null, reason: messageOf(error) }
  }
}

const rebuildFailure = (up) =>
  up.error ??
  `The workspace stack did not come up (run-stack.sh exited ${up.exitCode}). Read ${up.log}.`

const refusedE2e = (rungs, lease) => ({
  results: failAll(rungs, lease.reason),
  stack: {
    ...NO_E2E_STACK,
    wasUp: lease.up,
    upLog: lease.log ?? null,
    held: lease.refused ? { holder: lease.holder, detail: lease.reason } : null
  }
})

const runLeasedRungs = async (rungs, context, lease) => {
  if (!lease.reused) {
    return {
      results: await runInOrder(rungs, (rung) => runRung(rung, context))
    }
  }
  const up = await rebuild(context)
  return {
    upLog: up.log,
    results:
      up.exitCode === 0
        ? await runInOrder(rungs, (rung) => runRung(rung, context))
        : failAll(rungs, rebuildFailure(up))
  }
}

/**
 * Run the e2e rungs against the workspace stack built from local source,
 * under a lease held as the gate's own holder. A stack that is down is
 * started, leased, and always released again, whatever happened. A stack
 * this holder already leases is rebuilt from local source and left up. A
 * stack leased to anyone else, or up with no lease, is refused and left
 * exactly as it is.
 */
const runE2e = async (rungs, context) => {
  const blockers = rungs.map((rung) => rung.refusal ?? cannotRunBecause(rung))
  if (blockers.every(Boolean)) {
    return {
      results: rungs.map((rung, index) => failed(rung, blockers[index])),
      stack: NO_E2E_STACK
    }
  }
  const lease = await takeLease(context)
  if (!lease.acquired) return refusedE2e(rungs, lease)
  const stack = {
    ...NO_E2E_STACK,
    wasUp: lease.reused,
    startedForE2e: lease.started,
    servedFrom: 'local-source',
    upLog: lease.log
  }
  let ran = { results: [] }
  let down = null
  try {
    ran = await runLeasedRungs(rungs, context, lease)
  } finally {
    if (lease.started) down = await giveBack(context)
  }
  return {
    results: ran.results,
    stack: {
      ...stack,
      upLog: ran.upLog ?? stack.upLog,
      stoppedAfter: down?.released === true,
      downLog: down?.log ?? null,
      downError: down && !down.released ? down.reason : null
    }
  }
}

const byPhase = (plan, phase) => plan.filter((rung) => rung.phase === phase)

/**
 * Run a backlog's gate: every unit rung, then every FIT rung (each after a
 * check that its ports are free), then the e2e rungs against the workspace
 * stack. Every rung's output goes to its own log; a rung that cannot run is
 * a failure with its reason, never left out.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.workarea
 * @param {'unit'|'fit'|'e2e'|'all'} [args.phase]
 * @param {string} [args.logsDir]
 * @param {string} [args.holder] - Who the gate takes the stack lease as, for its E2E phase
 * @param {string} [args.leasePath] - The stack lease file
 * @param {object} [args.env] - Extra environment for every command the gate runs
 * @returns {Promise<{green: boolean, phase: string, logs: string, rungs: object[], stack: object}>}
 */
export const runGate = async ({
  workspaceRoot,
  workarea,
  phase = 'all',
  logsDir,
  holder = defaultGateHolder(workarea),
  leasePath = defaultLeasePath(),
  env
}) => {
  const repos = readEnvelopeRepos(workspaceRoot, workarea)
  const gates = loadGates(workspaceRoot)
  const plan = planRungs({ gates, repos, phase })
  const logs = logsDir ?? defaultLogsDir(workspaceRoot, workarea)
  const context = {
    workspaceRoot,
    logsDir: logs,
    holder,
    leasePath,
    env,
    held: null
  }

  const unit = await runInOrder(byPhase(plan, 'unit'), (rung) =>
    runRung(rung, context)
  )
  const fit = await runInOrder(byPhase(plan, 'fit'), (rung) =>
    runFitRung(rung, context)
  )
  const e2e = await runE2e(byPhase(plan, 'e2e'), context)

  const rungs = [...unit, ...fit, ...e2e.results]
  const stackClean = e2e.stack.wasUp !== false || e2e.stack.stoppedAfter
  return {
    green: rungs.length > 0 && rungs.every(({ ok }) => ok) && stackClean,
    phase,
    logs,
    rungs,
    stack: { ...e2e.stack, held: e2e.stack.held ?? context.held }
  }
}
