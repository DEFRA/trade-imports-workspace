import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { setTimeout as wait } from 'node:timers/promises'
import { run, runToLog } from '../../exec/exec.js'
import {
  dockerContainers,
  freeMemoryPercent,
  oneMinuteLoad,
  swapUsedMiB,
  vmStatReading
} from './readings.js'
import { outcomeLines, summariseSamples } from './summary.js'

const DOCKER_STATS_FORMAT = '{{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}'
const CSV_COLUMNS = [
  'at',
  'load1',
  'freePercent',
  'hostUsedGiB',
  'swapUsedMiB',
  'swapouts',
  'pageouts',
  'dockerMiB',
  'dockerCpuPercent',
  'shellStartMs'
]

const outputOf = async (command, args) => {
  try {
    const { stdout, exitCode } = await run(command, args)
    return exitCode === 0 ? stdout : null
  } catch {
    return null
  }
}

const shellStartMs = async () => {
  const startedAt = performance.now()
  await outputOf('/bin/sh', ['-c', 'true'])
  return Math.round(performance.now() - startedAt)
}

const sumOf = (containers, key) =>
  containers.reduce((total, container) => total + container[key], 0)

/**
 * One reading of the machine: load, free memory, memory in use, swap, the
 * docker containers' memory and CPU, and how long a shell takes to start.
 * A reading whose command is missing or fails is null.
 *
 * @returns {Promise<object>}
 */
export const takeSample = async () => {
  const [load, pressure, swap, vmStat, docker, shellMs] = await Promise.all([
    outputOf('sysctl', ['-n', 'vm.loadavg']),
    outputOf('memory_pressure', ['-Q']),
    outputOf('sysctl', ['-n', 'vm.swapusage']),
    outputOf('vm_stat', []),
    outputOf('docker', [
      'stats',
      '--no-stream',
      '--format',
      DOCKER_STATS_FORMAT
    ]),
    shellStartMs()
  ])
  const memory = vmStatReading(vmStat)
  const containers = dockerContainers(docker)
  return {
    at: new Date().toISOString(),
    load1: oneMinuteLoad(load),
    freePercent: freeMemoryPercent(pressure),
    hostUsedGiB: memory?.usedGiB ?? null,
    swapUsedMiB: swapUsedMiB(swap),
    swapouts: memory?.swapouts ?? null,
    pageouts: memory?.pageouts ?? null,
    dockerMiB: docker === null ? null : sumOf(containers, 'mib'),
    dockerCpuPercent: docker === null ? null : sumOf(containers, 'cpuPercent'),
    containers,
    shellStartMs: shellMs
  }
}

const sampleUntil = async (finished, intervalMs, sample) => {
  const samples = [await sample()]
  while (!finished.done) {
    await Promise.race([wait(intervalMs), finished.promise])
    if (!finished.done) samples.push(await sample())
  }
  samples.push(await sample())
  return samples
}

const csvOf = (samples) =>
  [
    CSV_COLUMNS.join(','),
    ...samples.map((sample) =>
      CSV_COLUMNS.map((column) => sample[column] ?? '').join(',')
    )
  ].join('\n')

const readLog = (path) => {
  try {
    return readFileSync(path, 'utf8')
  } catch {
    return ''
  }
}

/**
 * Run one command with its output in a log, sampling the machine every
 * `intervalMs` while it runs, then write the samples as CSV and a summary
 * as JSON beside the log.
 *
 * @param {object} args
 * @param {string} args.label - Names the files: <label>.log, <label>.csv, <label>.json
 * @param {string} args.outDir
 * @param {string} args.command
 * @param {string[]} args.args
 * @param {string} args.cwd
 * @param {number} args.intervalMs
 * @param {() => Promise<object>} [args.sample] - Takes one reading
 * @returns {Promise<object>} The summary written to <label>.json
 */
export const measureCommand = async ({
  label,
  outDir,
  command,
  args,
  cwd,
  intervalMs,
  sample = takeSample
}) => {
  mkdirSync(outDir, { recursive: true })
  const logPath = join(outDir, `${label}.log`)
  const running = runToLog(command, args, { cwd, logPath })
  const finished = { done: false }
  finished.promise = Promise.allSettled([running]).then(() => {
    finished.done = true
  })
  const [outcome, samples] = await Promise.all([
    running,
    sampleUntil(finished, intervalMs, sample)
  ])
  const csvPath = join(outDir, `${label}.csv`)
  writeFileSync(csvPath, `${csvOf(samples)}\n`)
  const summary = {
    label,
    command: [command, ...args].join(' '),
    cwd,
    exitCode: outcome.exitCode,
    wallSeconds: Math.round(outcome.durationMs / 1000),
    outcome: outcomeLines(readLog(logPath)),
    ...summariseSamples(samples),
    log: logPath,
    csv: csvPath
  }
  writeFileSync(
    join(outDir, `${label}.json`),
    `${JSON.stringify(summary, null, 2)}\n`
  )
  return summary
}
