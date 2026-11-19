import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect } from 'vitest'
import { run } from '../../exec/exec.js'
import {
  normaliseRecordedText,
  recordFolderFiles
} from '../../test-support/bash-golden-harness.js'
import {
  allowAdvisory,
  forgetAllowlistEntries,
  renderForgottenText,
  runAuditBaseline
} from '../audit.js'
import { baselineExitCodeOf, jqText } from '../audit-rules.js'
import {
  argsIn,
  OTHER_CHECKOUT,
  readAuditGolden,
  REPO_FOLDER,
  RUN_FOLDER,
  stageAuditWorkspace,
  stageFakeCommands,
  TODAY
} from './npm-audit-workspace.js'

const optionValue = (args, name) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const optionValues = (args, name) =>
  args.flatMap((arg, index) => (arg === name ? [args[index + 1]] : []))

const requestOf = (args) => ({
  runId: optionValue(args, '--run-id'),
  repo: optionValue(args, '--repo'),
  label: optionValue(args, '--label'),
  repoPath: optionValue(args, '--repo-path'),
  ghsa: optionValue(args, '--ghsa'),
  ghsas: optionValues(args, '--ghsa'),
  reason: optionValue(args, '--reason'),
  owner: optionValue(args, '--owner'),
  expiryDays: optionValue(args, '--expiry-days'),
  blockedBy: optionValue(args, '--blocked-by'),
  stage: optionValue(args, '--stage')
})

const commands = {
  baseline: {
    run: runAuditBaseline,
    stdoutOf: jqText,
    exitCodeOf: baselineExitCodeOf
  },
  allow: { run: allowAdvisory, stdoutOf: jqText, exitCodeOf: () => 0 },
  forget: {
    run: async (request) => forgetAllowlistEntries(request),
    stdoutOf: () => '',
    stderrOf: (result) => `${renderForgottenText(result)}\n`,
    exitCodeOf: () => 0
  }
}

const errorExitCodeOf = (command, error) =>
  command !== 'forget' && error.code === 'REFUSED' ? 1 : 2

/**
 * A runner that runs commands with the fake commands on PATH.
 *
 * @param {{env: Record<string, string>}} fakes - From `stageFakeCommands`
 * @returns {typeof run}
 */
export const runnerWith = (fakes) => (command, args, opts) =>
  run(command, args, { ...opts, env: fakes.env })

/**
 * @param {object} fixtureCase - One of the fixture's `cases`
 * @returns {Date} Midday UTC on the case's day
 */
export const nowOf = (fixtureCase) =>
  new Date(`${fixtureCase.today ?? TODAY}T12:00:00Z`)

const configText = (root, folder, home) => {
  const path = join(root, folder, 'audit-ci.jsonc')
  return existsSync(path)
    ? normaliseRecordedText(readFileSync(path, 'utf8'), home)
    : null
}

/**
 * Runs a fixture case through tim's audit functions with the case's clock
 * and fake commands, and records it in the shape the golden test records
 * the Bash.
 *
 * @param {'baseline' | 'allow' | 'forget'} commandName
 * @param {object} fixtureCase
 * @returns {Promise<object>}
 */
export const replayAuditCase = async (commandName, fixtureCase) => {
  const staged = stageAuditWorkspace(fixtureCase)
  const fakes = stageFakeCommands(fixtureCase)
  const command = commands[commandName]
  const stderr = []
  const output = { stdout: '', exitCode: 0 }
  try {
    try {
      const result = await command.run({
        ...requestOf(argsIn(fixtureCase.args, staged.root)),
        workspaceRoot: staged.root,
        now: nowOf(fixtureCase),
        runCommand: runnerWith(fakes),
        warn: (line) => stderr.push(`${line}\n`)
      })
      output.stdout = command.stdoutOf(result)
      if (command.stderrOf) stderr.push(command.stderrOf(result))
      output.exitCode = command.exitCodeOf(result)
    } catch (error) {
      stderr.push(`${error.message}\n`)
      output.exitCode = errorExitCodeOf(commandName, error)
    }
    return {
      case: fixtureCase.name,
      input: fixtureCase.args,
      exitCode: output.exitCode,
      stdout: normaliseRecordedText(output.stdout, staged.home),
      stderr: normaliseRecordedText(stderr.join(''), staged.home),
      files: recordFolderFiles(join(staged.root, RUN_FOLDER), staged.home),
      configs: {
        repo: configText(staged.root, REPO_FOLDER, staged.home),
        other: configText(staged.root, OTHER_CHECKOUT, staged.home)
      }
    }
  } finally {
    staged.remove()
    fakes.remove()
  }
}

const lastLineOf = (text) => text.trimEnd().split('\n').at(-1)

const isUsageText = (text) => text.includes('Usage: ')

/**
 * Asserts a tim run did what the Bash did on the same case. Usage text
 * names the command that printed it, so a usage error compares everything
 * but stderr; a case marked `stderrDiffers` compares its last stderr line.
 *
 * @param {object} timRun - From {@link replayAuditCase}, or `recordTimRun`
 * @param {object} bashRun - The golden recording
 * @param {object} fixtureCase
 */
export const expectSameAsBash = (timRun, bashRun, fixtureCase) => {
  const { stderr: timStderr, ...timRest } = timRun
  const { stderr: bashStderr, ...bashRest } = bashRun
  expect(timRest).toEqual(bashRest)
  if (isUsageText(bashStderr)) {
    expect(timStderr).toContain('Usage: tim npm ')
  } else if (fixtureCase.stderrDiffers) {
    expect(lastLineOf(timStderr)).toBe(lastLineOf(bashStderr))
  } else {
    expect(timStderr).toBe(bashStderr)
  }
}

/**
 * @param {string} commandName
 * @param {string} caseName
 * @returns {object} The Bash's recording of that case
 */
export const goldenRunOf = (commandName, caseName) =>
  readAuditGolden()[commandName].find((recorded) => recorded.case === caseName)
