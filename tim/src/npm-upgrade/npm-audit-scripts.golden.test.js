import { execa } from 'execa'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import {
  goldenText,
  normaliseRecordedText,
  recordBashRun,
  stageBashWorkspace,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  argsIn,
  cases,
  HELPER_SCRIPTS,
  OTHER_CHECKOUT,
  REPO_FOLDER,
  RUN_FOLDER,
  SCRIPT_FOR,
  stageAuditWorkspace,
  stageFakeCommands
} from './__fixtures__/npm-audit-workspace.js'
import { jqCases } from './__fixtures__/npm-audit-jq-cases.js'

const scripts = [...Object.values(SCRIPT_FOR), ...HELPER_SCRIPTS]

const configText = (root, folder, home) => {
  const path = join(root, folder, 'audit-ci.jsonc')
  return existsSync(path)
    ? normaliseRecordedText(readFileSync(path, 'utf8'), home)
    : null
}

const recordCase = async (command, fixtureCase) => {
  const staged = stageAuditWorkspace(fixtureCase, scripts)
  const fakes = stageFakeCommands(fixtureCase)
  try {
    const recording = await recordBashRun(
      staged,
      SCRIPT_FOR[command],
      argsIn(fixtureCase.args, staged.root),
      { exactOutput: true, watch: RUN_FOLDER, env: fakes.env }
    )
    return {
      case: fixtureCase.name,
      input: fixtureCase.args,
      ...recording,
      stderr: recording.stderr.replace(/pid: \d+/g, 'pid: <PID>'),
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

const recordJqCase = async ({ name, program, input, args = [] }) => {
  const staged = stageBashWorkspace({ scripts: HELPER_SCRIPTS })
  try {
    const result = await execa(
      '/bin/bash',
      [
        '-c',
        `source "$1"; shift; jq -c "\${!1}" "\${@:2}"`,
        'jq-case',
        join(staged.root, 'tools/npm/audit-lib.sh'),
        program,
        ...args
      ],
      { input: JSON.stringify(input), reject: false }
    )
    return {
      case: name,
      exitCode: result.exitCode,
      output: result.exitCode === 0 ? JSON.parse(result.stdout) : null
    }
  } finally {
    staged.remove()
  }
}

test.skipIf(!scripts.every(workspaceScriptExists))(
  'tools/npm audits a repo, writes and forgets allowlist entries and runs npm in a repo on every fixture case',
  async () => {
    const golden = {}
    for (const [command, commandCases] of Object.entries(cases)) {
      golden[command] = []
      for (const fixtureCase of commandCases) {
        golden[command].push(await recordCase(command, fixtureCase))
      }
    }
    golden.jq = []
    for (const jqCase of jqCases) golden.jq.push(await recordJqCase(jqCase))

    await expect(goldenText(golden)).toMatchFileSnapshot(
      '__fixtures__/__golden__/npm-audit-scripts.json'
    )
  },
  300_000
)
