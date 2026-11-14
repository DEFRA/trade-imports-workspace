import { expect } from 'vitest'
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  recordTimRun,
  stageBashWorkspace
} from '../../test-support/bash-golden-harness.js'
import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'
import {
  filesWritten,
  toolsCases,
  toolsFiles,
  toolsWatchFolder
} from './style-tools.js'

const readToolsGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/style-tools.json', import.meta.url),
      'utf8'
    )
  )

/**
 * A staged workspace holding the fixture style reviews, marked as a
 * workspace tim can run in.
 *
 * @param {{scripts: string[]}} opts - Scripts to copy from the real workspace
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stageStyleWorkspace = ({ scripts }) => {
  const staged = stageBashWorkspace({ scripts, files: toolsFiles })
  markWorkspaceRoot(staged.root)
  mkdirSync(join(staged.root, 'repos'), { recursive: true })
  return staged
}

/**
 * The cases whose steps all run commands starting with `prefix`, each with
 * the Bash recording of its steps.
 *
 * @param {string} prefix - `items`, `file`, `aggregate` or `reconcile`
 * @returns {object[]}
 */
export const recordedStyleCasesFor = (prefix) => {
  const toolsGolden = readToolsGolden()
  return toolsCases
    .map((toolsCase, index) => ({ ...toolsCase, recorded: toolsGolden[index] }))
    .filter(({ steps }) => steps[0].command.startsWith(prefix))
}

/**
 * Runs `use` against a fresh copy of the fixture style reviews, then
 * removes it.
 *
 * @template T
 * @param {(staged: {home: string, root: string}) => Promise<T>} use
 * @returns {Promise<T>}
 */
export const withStagedStyle = async (use) => {
  const staged = stageStyleWorkspace({ scripts: [] })
  try {
    return await use(staged)
  } finally {
    staged.remove()
  }
}

/**
 * Runs each step as `tim style <command> <args>` and records its exit
 * code, output and the files it wrote.
 *
 * @param {{home: string, root: string}} staged
 * @param {{command: string, args: string[]}[]} steps
 * @returns {Promise<object[]>}
 */
export const runStyleSteps = async (staged, steps) => {
  const runs = []
  for (const { command, args } of steps) {
    const { files, ...output } = await recordTimRun(
      staged,
      ['style', ...command.split(' '), ...args],
      { watch: toolsWatchFolder }
    )
    runs.push({ ...output, filesWritten: filesWritten(files) })
  }
  return runs
}

const asTimWouldSay = (text, args) => {
  const named = text.replace(
    'run aggregate-file-reviews.sh --write-items first',
    'run tim style aggregate --write-items first'
  )
  return args.includes('--note') ? named : named.replace(', Notes set', '')
}

const firstLine = (text) => text.split('\n')[0]

const BASH_JSON_AS_TIM_RESULT = {
  'items list': (stdout) => (stdout === '' ? [] : JSON.parse(stdout)),
  'items counts': (stdout) => JSON.parse(stdout),
  aggregate: (stdout) => JSON.parse(stdout),
  reconcile: (stdout) => JSON.parse(stdout)
}

const timJsonResult = (command, stdout) => {
  const { result } = JSON.parse(stdout)
  if (command !== 'items counts') return result
  const { breakdown, total } = result
  return { breakdown, total }
}

const printedOnlyUsage = (stderr) =>
  stderr === '' || stderr.startsWith('Usage:')

const expectUsageAsRecorded = (run, recordedStep) =>
  printedOnlyUsage(recordedStep.stderr)
    ? expect(firstLine(run.stderr)).toMatch(/^Usage: tim style /)
    : expect(firstLine(run.stderr)).toBe(firstLine(recordedStep.stderr))

const expectJsonAsRecorded = (run, recordedStep) =>
  expect(timJsonResult(recordedStep.command, run.stdout)).toEqual(
    BASH_JSON_AS_TIM_RESULT[recordedStep.command](recordedStep.stdout)
  )

/**
 * Asserts each tim run gave what Bash recorded: the exit code and the
 * files written always; then, where Bash printed its usage text, the first
 * line it printed before it; under --json, the envelope's result against
 * the JSON Bash printed; otherwise stdout and stderr byte for byte with
 * tim's own command names, and ", Notes set" only after a --note.
 *
 * @param {object[]} runs - From {@link runStyleSteps}
 * @param {{steps: object[]}} recorded
 * @param {{usage?: boolean}} [opts]
 */
export const expectStyleRunsAsRecorded = (runs, recorded, { usage } = {}) => {
  expect(runs).toHaveLength(recorded.steps.length)
  runs.forEach((run, stepIndex) => {
    const recordedStep = recorded.steps[stepIndex]
    expect(run.exitCode).toBe(recordedStep.exitCode)
    expect(run.filesWritten).toEqual(recordedStep.filesWritten)
    if (usage) {
      expectUsageAsRecorded(run, recordedStep)
      return
    }
    if (recordedStep.input.includes('--json') && recordedStep.exitCode === 0) {
      expectJsonAsRecorded(run, recordedStep)
      return
    }
    expect(run.stdout).toBe(
      asTimWouldSay(recordedStep.stdout, recordedStep.input)
    )
    expect(run.stderr).toBe(
      asTimWouldSay(recordedStep.stderr, recordedStep.input)
    )
  })
}
