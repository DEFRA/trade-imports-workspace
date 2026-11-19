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
  ledgerCases,
  ledgerFiles,
  ledgerWatchFolder
} from './review-ledger.js'

const ledgerGolden = JSON.parse(
  readFileSync(
    new URL('./__golden__/review-ledger.json', import.meta.url),
    'utf8'
  )
)

/**
 * The ledger cases whose steps all run one command group, each with the
 * Bash recording of its steps.
 *
 * @param {'file' | 'items'} group
 * @returns {object[]}
 */
export const recordedCasesFor = (group) =>
  ledgerCases
    .map((ledgerCase, index) => ({
      ...ledgerCase,
      recorded: ledgerGolden[index]
    }))
    .filter(({ steps }) =>
      steps.every(({ command }) => command.startsWith(`${group} `))
    )

/**
 * Runs `use` against a fresh copy of the ledger, then removes it.
 *
 * @template T
 * @param {(staged: {home: string, root: string}) => Promise<T>} use
 * @returns {Promise<T>}
 */
export const withStagedLedger = async (use) => {
  const staged = stageBashWorkspace({ scripts: [], files: ledgerFiles })
  markWorkspaceRoot(staged.root)
  mkdirSync(join(staged.root, 'repos'))
  try {
    return await use(staged)
  } finally {
    staged.remove()
  }
}

/**
 * Runs each step as `tim review <command> <args>` and records its exit
 * code, output and the files it wrote.
 *
 * @param {{home: string, root: string}} staged
 * @param {{command: string, args: string[]}[]} steps
 * @returns {Promise<object[]>}
 */
export const runSteps = async (staged, steps) => {
  const runs = []
  for (const { command, args } of steps) {
    const { files, ...output } = await recordTimRun(
      staged,
      ['review', ...command.split(' '), ...args],
      { watch: ledgerWatchFolder }
    )
    runs.push({ ...output, filesWritten: filesWritten(files) })
  }
  return runs
}

const asTimWouldSay = (text) =>
  text.replace(
    'call file-review-init.sh first',
    'call tim review file init first'
  )

const firstLine = (text) => text.split('\n')[0]

/**
 * Asserts each tim run gave what Bash recorded: the exit code, the files
 * written, and stdout and stderr byte for byte with tim's own command
 * names. Where Bash printed its usage text, only the first line it
 * printed before that is compared.
 *
 * @param {object[]} runs - From {@link runSteps}
 * @param {{steps: object[]}} recorded
 * @param {{usage?: boolean}} [opts]
 */
export const expectRunsAsRecorded = (runs, recorded, { usage } = {}) => {
  expect(runs).toHaveLength(recorded.steps.length)
  runs.forEach((run, stepIndex) => {
    const recordedStep = recorded.steps[stepIndex]
    expect(run.exitCode).toBe(recordedStep.exitCode)
    expect(run.filesWritten).toEqual(recordedStep.filesWritten)
    if (usage) {
      expect(firstLine(run.stderr)).toMatch(
        recordedStep.stderr === ''
          ? /^Usage: tim review items /
          : firstLine(recordedStep.stderr)
      )
      return
    }
    expect(run.stdout).toBe(recordedStep.stdout)
    expect(run.stderr).toBe(asTimWouldSay(recordedStep.stderr))
  })
}
