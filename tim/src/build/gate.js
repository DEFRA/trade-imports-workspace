import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runToLog } from '../exec/exec.js'
import {
  acquireStack,
  releaseStack,
  readLease,
  describeLease,
  defaultLeasePath
} from '../exec/stack-lease.js'
import { refreshLeasedStack } from '../exec/stack-refresh.js'
import { writeStackLogs } from '../exec/stack.js'
import { backlogPathFor } from '../commands/backlog/rows.js'
import { readEnvelopeRepos } from './envelope-repos.js'
import {
  loadGates,
  planRungs,
  MVN_VERIFY,
  PHASES,
  TIM_DUPLICATION
} from './gates.js'
import { isPortHeld, portHolder, describeHolder } from './ports.js'
import {
  defaultMachineConfigPath,
  readMachineConfig,
  withMachineWorkers
} from './machine-config.js'

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

const TIM_CLI = fileURLToPath(new URL('../cli.js', import.meta.url))

const workerArgs = ({ workers }) => (workers ? [`--workers=${workers}`] : [])

const npmCommandFor = (rung) => {
  const extra = [...rung.scope, ...workerArgs(rung)]
  return {
    command: 'npm',
    args: ['run', rung.run, ...(extra.length > 0 ? ['--', ...extra] : [])]
  }
}

const machineSummary = (machine) =>
  machine
    ? {
        config: machine.path,
        parallelRepos: machine.parallelRepos ?? null,
        stackAfterLocal: machine.stackAfterLocal ?? null,
        workers: machine.workers
      }
    : null

const duplicationCommand = () => ({
  command: process.execPath,
  args: [TIM_CLI, 'build', 'duplication', '.'],
  env: { TIM_NO_AUTO_PULL: '1' }
})

const commandFor = (rung) => {
  if (rung.run === MVN_VERIFY) return { command: 'mvn', args: ['-B', 'verify'] }
  if (rung.run === TIM_DUPLICATION) return duplicationCommand()
  return npmCommandFor(rung)
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
  if (run === TIM_DUPLICATION) return null
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
 * @returns {{repo: string, name: string, phase: string, ok: boolean, exitCode: number|null, log: string|null, durationMs: number, reason: string|null, workers: number|null}}
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
  reason,
  workers: rung.workers ?? null
})

const failed = (rung, reason, extra = {}) =>
  rungResult({ rung, ok: false, reason, ...extra })

const runRung = async (rung, { logsDir, env }) => {
  if (rung.refusal) return failed(rung, rung.refusal)
  const blocker = cannotRunBecause(rung)
  if (blocker) return failed(rung, blocker)
  const { command, args, env: commandEnv } = commandFor(rung)
  const logPath = logPathFor(logsDir, rung.repo, rung.name)
  try {
    const { exitCode, durationMs, log } = await runToLog(command, args, {
      cwd: rung.path,
      env: { ...env, ...commandEnv },
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

const runLocalRung = (rung, context) =>
  rung.phase === 'fit' ? runFitRung(rung, context) : runRung(rung, context)

const timed = async (rung, runOne) => {
  const startedAt = performance.now()
  const result = await runOne(rung)
  return { rung, result, startedAt, endedAt: performance.now() }
}

const runInOrder = async (rungs, runOne) => {
  const runs = []
  for (const rung of rungs) {
    runs.push(await timed(rung, runOne))
  }
  return runs
}

const runChain = async (chain, runOne) => {
  const runs = await runInOrder(
    chain.map(({ rung }) => rung),
    runOne
  )
  return runs.map((run, index) => ({
    ...run,
    position: chain[index].position
  }))
}

const runChainsAtMost = async (chains, runOne, limit) => {
  const queue = [...chains]
  const worker = async () => {
    const finished = []
    while (queue.length > 0) {
      finished.push(...(await runChain(queue.shift(), runOne)))
    }
    return finished
  }
  const workers = Array.from({ length: Math.min(limit, chains.length) }, worker)
  return (await Promise.all(workers)).flat()
}

const runEachRepoAtOnce = async (rungs, runOne, parallelRepos) => {
  const positioned = rungs.map((rung, position) => ({ rung, position }))
  const chains = Object.values(
    Object.groupBy(positioned, ({ rung }) => rung.repo)
  )
  const finished = await runChainsAtMost(
    chains,
    runOne,
    parallelRepos ?? chains.length
  )
  return finished.sort((left, right) => left.position - right.position)
}

const elapsedSince = (startedAt) => Math.round(performance.now() - startedAt)

const spanOf = (runs) =>
  runs.length === 0
    ? 0
    : Math.round(
        Math.max(...runs.map(({ endedAt }) => endedAt)) -
          Math.min(...runs.map(({ startedAt }) => startedAt))
      )

const logIn = (context, logName) => join(context.logsDir, logName)

const NO_E2E_STACK = {
  wasUp: null,
  startedForE2e: false,
  stoppedAfter: false,
  servedFrom: null,
  upLog: null,
  downLog: null,
  downError: null,
  held: null,
  refresh: null
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

const refresh = async (context, lease) => {
  try {
    return await refreshLeasedStack({
      workspaceRoot: context.workspaceRoot,
      holder: context.holder,
      leasePath: context.leasePath,
      lease: lease.lease,
      logPaths: {
        rebuild: logIn(context, 'gate-stack-rebuild.log'),
        restart: logIn(context, 'gate-stack-restart.log'),
        restack: logIn(context, 'gate-stack-restack.log')
      },
      env: context.env
    })
  } catch (error) {
    return {
      ok: false,
      restacked: false,
      restackLog: null,
      rebuilt: [],
      restarted: [],
      left: [],
      rebuildLog: null,
      restartLog: null,
      reason: `Can't bring the workspace stack up to date with local source: ${messageOf(error)}`
    }
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

const refusedE2e = (rungs, lease) => ({
  results: failAll(rungs, lease.reason),
  stack: {
    ...NO_E2E_STACK,
    wasUp: lease.up,
    upLog: lease.log ?? null,
    held: lease.refused ? { holder: lease.holder, detail: lease.reason } : null
  }
})

const isExclusive = (rung) => rung.exclusive === true

const e2eRunOrder = (rungs, context) =>
  context.exclusiveFirst
    ? [
        ...rungs.filter(isExclusive),
        ...rungs.filter((rung) => !isExclusive(rung))
      ]
    : rungs

const inPlanOrder = (rungs, runs) => {
  const byRung = new Map(runs.map((run) => [run.rung, run]))
  return rungs.map((rung) => byRung.get(rung))
}

const FLAKY_COUNT = /^\s+\d+ flaky\s*$/m

const loggedFlaky = (log) => {
  try {
    return Boolean(log) && FLAKY_COUNT.test(readFileSync(log, 'utf8'))
  } catch {
    return false
  }
}

const withStackLogs = async (result, rung, context) => {
  if (result.ok && !loggedFlaky(result.log)) return result
  try {
    const stackLogs = await writeStackLogs({
      logsDir: context.logsDir,
      prefix: `gate-stack-after-${rung.repo}-${rung.name}`,
      env: context.env
    })
    return { ...result, stackLogs }
  } catch (error) {
    return { ...result, stackLogs: [], stackLogsError: messageOf(error) }
  }
}

const runE2eRungs = async (rungs, context) => {
  await context.localDone
  const runs = await runInOrder(e2eRunOrder(rungs, context), async (rung) =>
    withStackLogs(await runRung(rung, context), rung, context)
  )
  const ordered = inPlanOrder(rungs, runs)
  return { results: ordered.map(({ result }) => result), runs: ordered }
}

const runLeasedRungs = async (rungs, context, lease) => {
  if (!lease.reused) return runE2eRungs(rungs, context)
  const refreshed = await refresh(context, lease)
  if (!refreshed.ok) {
    return { refresh: refreshed, results: failAll(rungs, refreshed.reason) }
  }
  return { refresh: refreshed, ...(await runE2eRungs(rungs, context)) }
}

const runE2e = async (rungs, context) => {
  const blockers = rungs.map((rung) => rung.refusal ?? cannotRunBecause(rung))
  if (blockers.every(Boolean)) {
    return {
      results: rungs.map((rung, index) => failed(rung, blockers[index])),
      stack: NO_E2E_STACK
    }
  }
  if (context.stackAfterLocal) await context.localDone
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
    runs: ran.runs ?? [],
    stack: {
      ...stack,
      refresh: ran.refresh ?? null,
      stoppedAfter: down?.released === true,
      downLog: down?.log ?? null,
      downError: down && !down.released ? down.reason : null
    }
  }
}

const byPhase = (plan, phase) => plan.filter((rung) => rung.phase === phase)

const runE2eTimed = async (rungs, context) => {
  const startedAt = performance.now()
  const outcome = await runE2e(rungs, context)
  return { ...outcome, startedAt, endedAt: performance.now() }
}

const runSerially = async (plan, context) => {
  const runOne = (rung) => runLocalRung(rung, context)
  const unit = await runInOrder(byPhase(plan, 'unit'), runOne)
  const fit = await runInOrder(byPhase(plan, 'fit'), runOne)
  const localEndedAt = performance.now()
  const e2e = await runE2eTimed(byPhase(plan, 'e2e'), context)
  return { local: [...unit, ...fit], localEndedAt, e2e }
}

const runInLayers = async (plan, context) => {
  const layerOne = runEachRepoAtOnce(
    plan.filter((rung) => rung.phase !== 'e2e'),
    (rung) => runLocalRung(rung, context),
    context.parallelRepos
  ).then((local) => ({ local, localEndedAt: performance.now() }))
  const [{ local, localEndedAt }, e2e] = await Promise.all([
    layerOne,
    runE2eTimed(byPhase(plan, 'e2e'), {
      ...context,
      localDone: layerOne,
      exclusiveFirst: true
    })
  ])
  return { local, localEndedAt, e2e }
}

const e2eDurationMs = ({ localEndedAt, e2e }) =>
  Math.round(e2e.endedAt - Math.max(localEndedAt, e2e.startedAt))

const phaseDurationMs = (phase, ran) =>
  phase === 'e2e'
    ? e2eDurationMs(ran)
    : spanOf(ran.local.filter(({ result }) => result.phase === phase))

const phaseDurations = (plan, ran) =>
  Object.fromEntries(
    PHASES.filter((phase) => plan.some((rung) => rung.phase === phase)).map(
      (phase) => [phase, { durationMs: phaseDurationMs(phase, ran) }]
    )
  )

const exclusiveMs = (runs) =>
  runs
    .filter(({ rung }) => isExclusive(rung))
    .reduce((total, { startedAt, endedAt }) => total + endedAt - startedAt, 0)

const layerDurations = (startedAt, ran) => {
  const performanceMs = exclusiveMs(ran.e2e.runs ?? [])
  const afterLocalMs = Math.max(0, ran.e2e.endedAt - ran.localEndedAt)
  return {
    local: { durationMs: Math.round(ran.localEndedAt - startedAt) },
    performance: { durationMs: Math.round(performanceMs) },
    e2e: { durationMs: Math.max(0, Math.round(afterLocalMs - performanceMs)) }
  }
}

/**
 * Run a backlog's gate: the unit and FIT rungs (each FIT rung after a check
 * that its ports are free) and the e2e rungs against the workspace stack.
 * By default it runs in three layers, each once the one before has
 * finished: each repo's unit and FIT rungs, in order, with other repos' at
 * the same time; then every exclusive e2e rung (a performance test) alone;
 * then the other e2e rungs one after another. The stack lease and the stack
 * itself get ready during the first layer. `serial`
 * runs one rung at a time instead: every unit rung, then every FIT rung,
 * then the e2e phase. Rungs come back in plan order either way. Every
 * rung's output goes to its own log; a rung that cannot run is a failure
 * with its reason, never left out.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.workarea
 * @param {'unit'|'fit'|'e2e'|'all'} [args.phase]
 * @param {boolean} [args.serial] - Run one rung at a time, phase after phase
 * @param {string} [args.logsDir]
 * @param {string} [args.holder] - Who the gate takes the stack lease as, for its E2E phase
 * @param {string} [args.leasePath] - The stack lease file
 * @param {string} [args.machineConfigPath] - This machine's gate settings: worker counts, parallelRepos and stackAfterLocal
 * @param {object} [args.env] - Extra environment for every command the gate runs
 * @returns {Promise<{green: boolean, phase: string, serial: boolean, logs: string, durationMs: number, phases: object, layers: object, rungs: object[], stack: object}>}
 */
export const runGate = async ({
  workspaceRoot,
  workarea,
  phase = 'all',
  serial = false,
  logsDir,
  holder = defaultGateHolder(workarea),
  leasePath = defaultLeasePath(),
  machineConfigPath = defaultMachineConfigPath(),
  env
}) => {
  const startedAt = performance.now()
  const repos = readEnvelopeRepos(workspaceRoot, workarea)
  const gates = loadGates(workspaceRoot)
  const machine = readMachineConfig(machineConfigPath)
  const plan = withMachineWorkers(planRungs({ gates, repos, phase }), machine)
  const logs = logsDir ?? defaultLogsDir(workspaceRoot, workarea)
  const context = {
    workspaceRoot,
    logsDir: logs,
    holder,
    leasePath,
    env,
    parallelRepos: machine?.parallelRepos ?? gates.parallelRepos,
    stackAfterLocal:
      (machine?.stackAfterLocal ?? gates.stackAfterLocal) === true,
    held: null
  }

  const ran = await (serial ? runSerially : runInLayers)(plan, context)
  const { local, e2e } = ran

  const rungs = [...local.map(({ result }) => result), ...e2e.results]
  const stackClean = e2e.stack.wasUp !== false || e2e.stack.stoppedAfter
  return {
    green: rungs.length > 0 && rungs.every(({ ok }) => ok) && stackClean,
    phase,
    serial,
    logs,
    durationMs: elapsedSince(startedAt),
    phases: phaseDurations(plan, ran),
    layers: layerDurations(startedAt, ran),
    rungs,
    machine: machineSummary(machine),
    stack: { ...e2e.stack, held: e2e.stack.held ?? context.held }
  }
}
