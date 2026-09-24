import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runToLog } from '../exec/exec.js'
import { runStackScriptToLog, stackContainers } from '../exec/stack.js'
import { backlogPathFor } from '../commands/backlog/rows.js'
import { readEnvelopeRepos } from './envelope-repos.js'
import { loadGates, planRungs, MVN_VERIFY } from './gates.js'
import { isPortHeld, portHolder, describeHolder } from './ports.js'

export const GATE_PHASES = ['unit', 'fit', 'e2e', 'all']

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

const heldPortReasons = async (ports, env) => {
  const reasons = []
  for (const port of ports) {
    if (await isPortHeld(port)) {
      const holder = describeHolder(await portHolder(port, { env }))
      reasons.push(
        `Port ${port} is in use by ${holder}. The rung needs it free.`
      )
    }
  }
  return reasons
}

const runFitRung = async (rung, context) => {
  if (rung.refusal) return failed(rung, rung.refusal)
  const held = await heldPortReasons(rung.ports, context.env)
  return held.length > 0 ? failed(rung, held.join(' ')) : runRung(rung, context)
}

const runInOrder = async (rungs, runOne) => {
  const results = []
  for (const rung of rungs) {
    results.push(await runOne(rung))
  }
  return results
}

const isStackUp = async (env) => (await stackContainers({ env })).length > 0

const stackScript = (context, script, args, logName) =>
  runStackScriptToLog({
    workspaceRoot: context.workspaceRoot,
    script,
    args,
    env: context.env,
    logPath: join(context.logsDir, logName)
  })

const NO_E2E_STACK = {
  wasUp: null,
  startedForE2e: false,
  stoppedAfter: false,
  servedFrom: null,
  upLog: null,
  downLog: null,
  downError: null
}

const failAll = (rungs, reason) => rungs.map((rung) => failed(rung, reason))

const tryStackStatus = async (env) => {
  try {
    return { wasUp: await isStackUp(env), error: null }
  } catch (error) {
    return { wasUp: null, error: error.message ?? String(error) }
  }
}

const bringUp = async (context) => {
  try {
    return await stackScript(
      context,
      'run-stack.sh',
      DEV_STACK_ARGS,
      'gate-stack-up.log'
    )
  } catch (error) {
    return { exitCode: null, log: null, error: error.message ?? String(error) }
  }
}

const takeDown = async (context) => {
  try {
    return await stackScript(
      context,
      'stop-stack.sh',
      [],
      'gate-stack-down.log'
    )
  } catch (error) {
    return { exitCode: null, log: null, error: error.message ?? String(error) }
  }
}

const upFailure = (up) =>
  up.error ??
  `The workspace stack did not come up (run-stack.sh exited ${up.exitCode}). Read ${up.log}.`

/**
 * Run the e2e rungs against the workspace stack built from local source.
 * A stack that was already up is brought onto local source and left up; a
 * stack the gate started is always taken down again, whatever happened.
 */
const runE2e = async (rungs, context) => {
  const blockers = rungs.map((rung) => rung.refusal ?? cannotRunBecause(rung))
  if (blockers.every(Boolean)) {
    return {
      results: rungs.map((rung, index) => failed(rung, blockers[index])),
      stack: NO_E2E_STACK
    }
  }
  const status = await tryStackStatus(context.env)
  if (status.error) {
    return {
      results: failAll(
        rungs,
        `Can't tell whether the workspace stack is up: ${status.error}`
      ),
      stack: NO_E2E_STACK
    }
  }
  const { wasUp } = status
  const stack = {
    ...NO_E2E_STACK,
    wasUp,
    startedForE2e: !wasUp,
    servedFrom: 'local-source'
  }
  let results = []
  let down = null
  try {
    const up = await bringUp(context)
    stack.upLog = up.log
    results =
      up.exitCode === 0
        ? await runInOrder(rungs, (rung) => runRung(rung, context))
        : failAll(rungs, upFailure(up))
  } finally {
    if (!wasUp) down = await takeDown(context)
  }
  return {
    results,
    stack: {
      ...stack,
      stoppedAfter: down?.exitCode === 0,
      downLog: down?.log ?? null,
      downError:
        down && down.exitCode !== 0
          ? (down.error ??
            `stop-stack.sh exited ${down.exitCode}. Read ${down.log}.`)
          : null
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
 * @param {object} [args.env] - Extra environment for every command the gate runs
 * @returns {Promise<{green: boolean, phase: string, logs: string, rungs: object[], stack: object}>}
 */
export const runGate = async ({
  workspaceRoot,
  workarea,
  phase = 'all',
  logsDir,
  env
}) => {
  const repos = readEnvelopeRepos(workspaceRoot, workarea)
  const gates = loadGates(workspaceRoot)
  const plan = planRungs({ gates, repos, phase })
  const logs = logsDir ?? defaultLogsDir(workspaceRoot, workarea)
  const context = { workspaceRoot, logsDir: logs, env }

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
    stack: e2e.stack
  }
}
