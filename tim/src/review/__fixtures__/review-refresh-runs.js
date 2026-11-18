import { execa } from 'execa'
import { readFileSync } from 'node:fs'
import { expect } from 'vitest'
import { normaliseRecordedText } from '../../test-support/bash-golden-harness.js'
import { TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import {
  observeReview,
  refreshCases,
  stageRefreshWorkspace
} from './review-refresh.js'

const refreshGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/review-refresh.json', import.meta.url),
      'utf8'
    )
  )

/**
 * The refresh cases of one command, each with the Bash recording of it.
 *
 * @param {string} command - `pull`, `merge-resolved`, `gaps`, `scope` or `file-diff`
 * @returns {object[]}
 */
export const recordedRefreshCasesFor = (command) => {
  const golden = refreshGolden()
  return refreshCases
    .map((refreshCase, index) => ({ ...refreshCase, recorded: golden[index] }))
    .filter((refreshCase) => refreshCase.command === command)
}

const timCommandOf = (command) =>
  command === 'file-diff' ? ['file-diff'] : ['refresh', command]

/**
 * Runs `tim --workspace <root> <args>` against a staged refresh workspace
 * and records it as the Bash recordings hold a run.
 *
 * @param {{root: string, home: string}} staged - From `stageRefreshWorkspace`
 * @param {string[]} args
 * @param {{input?: string}} [opts]
 * @returns {Promise<{exitCode: number, stdout: string, stderr: string}>}
 */
export const recordTimInRefresh = async (staged, args, { input } = {}) => {
  const result = await execa(
    'node',
    [TIM_CLI_PATH, '--workspace', staged.root, ...args],
    {
      reject: false,
      stripFinalNewline: false,
      input,
      env: { TIM_NO_AUTO_PULL: '1', TIM_WORKSPACE: undefined },
      extendEnv: true
    }
  )
  return {
    exitCode: result.exitCode,
    stdout: normaliseRecordedText(result.stdout, staged.home),
    stderr: normaliseRecordedText(result.stderr, staged.home)
  }
}

/**
 * Runs `use` against a fresh refresh workspace, then removes it.
 *
 * @template T
 * @param {{stubCloneAt?: 'base' | 'head'}} opts
 * @param {(staged: object) => Promise<T>} use
 * @returns {Promise<T>}
 */
export const withStagedRefresh = async ({ stubCloneAt = 'head' }, use) => {
  const staged = await stageRefreshWorkspace({ scripts: [], stubCloneAt })
  try {
    return await use(staged)
  } finally {
    staged.remove()
  }
}

/**
 * Runs a case through tim and asserts it gave what the Bash recorded: the
 * exit code, stderr, the review state, and stdout byte for byte, or for a
 * JSON case the envelope's result equal to what the Bash printed.
 *
 * @param {object} refreshCase - From {@link recordedRefreshCasesFor}
 */
export const expectRefreshCaseAsRecorded = async (refreshCase) => {
  const { recorded } = refreshCase
  const { run, state } = await withStagedRefresh(
    { stubCloneAt: refreshCase.stubCloneAt },
    async (staged) => ({
      run: await recordTimInRefresh(
        staged,
        [
          'review',
          ...timCommandOf(refreshCase.command),
          ...refreshCase.tim(refreshCase.bash(staged))
        ],
        { input: refreshCase.stdin }
      ),
      state: refreshCase.observe
        ? await observeReview(staged, refreshCase.observe)
        : undefined
    })
  )

  expect(run.exitCode).toBe(recorded.exitCode)
  expect(run.stderr).toBe(recorded.stderr)
  expect(state).toEqual(recorded.state)
  if (refreshCase.output === 'json') {
    expect(JSON.parse(run.stdout).result).toEqual(JSON.parse(recorded.stdout))
  } else {
    expect(run.stdout).toBe(recorded.stdout)
  }
}
