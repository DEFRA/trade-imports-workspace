import { execa } from 'execa'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import {
  goldenText,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  BASH_SCRIPT_FOR,
  BASH_SCRIPTS,
  playThemeTicketSteps,
  withHomeMarked,
  writtenOut
} from './__fixtures__/theme-ticket-workspace.js'

const scriptsExist = BASH_SCRIPTS.every(workspaceScriptExists)

const bashArgs = ({ command, args }) =>
  command === 'push' && args.length > 0 ? [...args, '--dry-run'] : args

const recordBash = async (staged, step) => {
  const result = await execa(
    '/bin/bash',
    [join(staged.root, BASH_SCRIPT_FOR[step.command]), ...bashArgs(step)],
    {
      cwd: staged.root,
      env: { HOME: staged.home },
      extendEnv: true,
      reject: false,
      stripFinalNewline: false
    }
  )
  return {
    exitCode: result.exitCode,
    stdout: withHomeMarked(result.stdout, staged.home),
    stderr: withHomeMarked(result.stderr, staged.home),
    ...writtenOut(staged, step.args)
  }
}

test.skipIf(!scriptsExist)(
  'tools/theme-ticket starts, derives, reports stale tickets and dry-runs a push on every fixture case',
  async () => {
    const recordings = await playThemeTicketSteps({
      scripts: BASH_SCRIPTS,
      runCommand: recordBash
    })

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/theme-ticket-scripts.json'
    )
  },
  120_000
)
