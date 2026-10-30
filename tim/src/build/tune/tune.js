import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { loadGates, planRungs, MVN_VERIFY, TIM_DUPLICATION } from '../gates.js'
import { cannotRunBecause, rungCommand } from '../gate.js'
import { measureCommand, takeSample } from '../measure/measure.js'
import { acquireStack, releaseStack } from '../../exec/stack-lease.js'
import { chooseWorkers } from './choose.js'

export const DEFAULT_WORKER_COUNTS = [2, 3, 4]

const TUNED_PHASES = ['fit', 'e2e']

const MACHINE_FILE_COMMENT =
  "This machine's own gate settings, written by `tim build tune`. Gitignored: each machine has its own. Each workers key is <repo>/<rung> from gates.json; the gate, and every build loop stage, passes the count as --workers. See .claude/skills/requirements-pipeline/references/machine-tuning.md."

const clonedRepos = (workspaceRoot, gates) =>
  Object.keys(gates.repos)
    .map((folder) => ({ folder, path: join(workspaceRoot, 'repos', folder) }))
    .filter(({ path }) => existsSync(path))

const takesWorkerCount = ({ run }) =>
  run !== MVN_VERIFY && run !== TIM_DUPLICATION

const isTunable = (rung) =>
  !rung.refusal &&
  !rung.exclusive &&
  takesWorkerCount(rung) &&
  cannotRunBecause(rung) === null

/**
 * The FIT and E2E rungs this machine can time: every npm-script one
 * gates.json gives a cloned repo, as the gate would plan it, leaving out
 * performance tests and any rung whose script the repo does not have.
 *
 * @param {string} workspaceRoot
 * @returns {object[]} Planned rungs, as planRungs gives them
 */
export const tuneTargets = (workspaceRoot) => {
  const gates = loadGates(workspaceRoot)
  const repos = clonedRepos(workspaceRoot, gates)
  return TUNED_PHASES.flatMap((phase) =>
    planRungs({ gates, repos, phase, workspaceRoot })
  ).filter(isTunable)
}

const trialFrom = (workers, summary) => ({
  workers,
  exitCode: summary.exitCode,
  wallSeconds: summary.wallSeconds,
  swapoutPages: summary.swapoutPages,
  shellStartMs: summary.shellStartMs,
  outcome: summary.outcome,
  log: summary.log
})

const timeAtEachCount = async (rung, counts, measuring) => {
  const trials = []
  for (const workers of counts) {
    const { command, args } = rungCommand({ ...rung, workers })
    const summary = await measureCommand({
      label: `${rung.repo}-${rung.name}-w${workers}`,
      command,
      args,
      cwd: rung.path,
      ...measuring
    })
    trials.push(trialFrom(workers, summary))
  }
  return trials
}

const tuneEach = async (targets, counts, measuring) => {
  const rungs = []
  for (const rung of targets) {
    const trials = await timeAtEachCount(rung, counts, measuring)
    rungs.push({
      key: `${rung.repo}/${rung.name}`,
      trials,
      ...chooseWorkers(trials)
    })
  }
  return rungs
}

/**
 * Time every FIT and E2E rung at each worker count with the workspace stack
 * up, one run at a time, and choose each rung's count. Takes the stack lease
 * as `holder` first, starting the stack, and gives it back at the end, which
 * takes the stack down. A stack somebody else holds is refused and nothing is
 * timed.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.holder
 * @param {number[]} args.counts - Worker counts to time, such as [2, 3, 4]
 * @param {string} args.outDir - Where each run's log, samples and summary go
 * @param {string} args.leasePath
 * @param {number} args.intervalMs - How often to sample the machine
 * @param {() => Promise<object>} [args.sample] - Takes one reading of the machine
 * @param {object} [args.env] - Extra environment for docker and the stack scripts
 * @returns {Promise<{tuned: boolean, rungs: object[], refused?: object, released?: object}>}
 */
export const tuneMachine = async ({
  workspaceRoot,
  holder,
  counts,
  outDir,
  leasePath,
  intervalMs,
  sample = takeSample,
  env
}) => {
  const targets = tuneTargets(workspaceRoot)
  mkdirSync(outDir, { recursive: true })
  const lease = await acquireStack({
    workspaceRoot,
    holder,
    mode: 'dev',
    leasePath,
    logPath: join(outDir, 'stack-up.log'),
    env
  })
  if (!lease.acquired) return { tuned: false, rungs: [], refused: lease }
  try {
    const rungs = await tuneEach(targets, counts, {
      outDir,
      intervalMs,
      sample
    })
    return { tuned: true, rungs }
  } finally {
    await releaseStack({
      workspaceRoot,
      holder,
      leasePath,
      logPath: join(outDir, 'stack-down.log'),
      env
    })
  }
}

const chosenCounts = (rungs) =>
  Object.fromEntries(
    rungs
      .filter(({ workers }) => workers !== null)
      .map(({ key, workers }) => [key, workers])
  )

/**
 * The machine settings file after a tune: the existing file's settings,
 * with each rung the tune chose a count for set to that count.
 *
 * @param {{parallelRepos?: number, stackAfterLocal?: boolean, workers?: Record<string, number>}|null} existing
 * @param {{key: string, workers: number|null}[]} rungs
 * @returns {object}
 */
export const machineFileAfterTune = (existing, rungs) => ({
  $comment: MACHINE_FILE_COMMENT,
  ...(existing?.parallelRepos === undefined
    ? {}
    : { parallelRepos: existing.parallelRepos }),
  ...(existing?.stackAfterLocal === undefined
    ? {}
    : { stackAfterLocal: existing.stackAfterLocal }),
  workers: { ...(existing?.workers ?? {}), ...chosenCounts(rungs) }
})

/**
 * @param {string} path
 * @param {object} content
 */
export const writeMachineFile = (path, content) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `${JSON.stringify(content, null, 2)}\n`)
}
