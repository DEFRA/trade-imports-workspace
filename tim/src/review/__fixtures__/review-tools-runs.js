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
  prDetailsStandIn,
  toolsCases,
  toolsFiles,
  toolsWatchFolder
} from './review-tools.js'

const readToolsGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/review-tools.json', import.meta.url),
      'utf8'
    )
  )

/**
 * A staged workspace holding the fixture reviews, marked as a workspace
 * tim can run in, with a stand-in for the PR file lister the Bash calls.
 *
 * @param {{scripts: string[]}} opts - Scripts to copy from the real workspace
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stageToolsWorkspace = ({ scripts }) => {
  const staged = stageBashWorkspace({
    scripts,
    files: { ...toolsFiles, 'tools/github/pr-details.sh': prDetailsStandIn }
  })
  markWorkspaceRoot(staged.root)
  mkdirSync(join(staged.root, 'repos'), { recursive: true })
  return staged
}

/**
 * The cases whose steps all run commands starting with `prefix`, each with
 * the Bash recording of its steps.
 *
 * @param {string} prefix - `items render`, `aggregate`, `verify` or `reconcile`
 * @returns {object[]}
 */
export const recordedToolsCasesFor = (prefix) => {
  const toolsGolden = readToolsGolden()
  return toolsCases
    .map((toolsCase, index) => ({ ...toolsCase, recorded: toolsGolden[index] }))
    .filter(({ steps }) =>
      steps.every(({ command }) => command.startsWith(prefix))
    )
}

/**
 * Runs `use` against a fresh copy of the fixture reviews, then removes it.
 *
 * @template T
 * @param {(staged: {home: string, root: string}) => Promise<T>} use
 * @returns {Promise<T>}
 */
export const withStagedTools = async (use) => {
  const staged = stageToolsWorkspace({ scripts: [] })
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
export const runToolsSteps = async (staged, steps) => {
  const runs = []
  for (const { command, args } of steps) {
    const { files, ...output } = await recordTimRun(
      staged,
      ['review', ...command.split(' '), ...args],
      { watch: toolsWatchFolder }
    )
    runs.push({ ...output, filesWritten: filesWritten(files) })
  }
  return runs
}

/**
 * Asserts each tim run gave what Bash recorded: the exit code, the files
 * written, and stdout and stderr byte for byte, after `asTimWouldSay`
 * puts tim's own command names into the recorded text.
 *
 * @param {object[]} runs - From {@link runToolsSteps}
 * @param {{steps: object[]}} recorded
 * @param {object} [opts]
 * @param {(text: string) => string} [opts.asTimWouldSay]
 */
export const expectToolsRunsAsRecorded = (
  runs,
  recorded,
  { asTimWouldSay = (text) => text } = {}
) => {
  expect(runs).toHaveLength(recorded.steps.length)
  runs.forEach((run, stepIndex) => {
    const recordedStep = recorded.steps[stepIndex]
    expect(run.exitCode).toBe(recordedStep.exitCode)
    expect(run.filesWritten).toEqual(recordedStep.filesWritten)
    expect(run.stdout).toBe(asTimWouldSay(recordedStep.stdout))
    expect(run.stderr).toBe(asTimWouldSay(recordedStep.stderr))
  })
}
