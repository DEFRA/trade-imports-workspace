import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'
import {
  goldenText,
  normaliseRecordedText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  APPLY_SCRIPTS,
  applyCases,
  recordApplyCase,
  stageApplyRepos
} from './__fixtures__/govuk-apply.js'
import { stageGovukWorkspace } from './__fixtures__/govuk-workspace.js'
import { WRITE_SCRIPT_FOR, writeCases } from './__fixtures__/govuk-writes.js'

const writeScripts = Object.values(WRITE_SCRIPT_FOR)

const repoOf = (args) => args[args.indexOf('--repo') + 1]

const stateFileText = (staged, args) => {
  const repo = repoOf(args)
  const path = join(
    staged.root,
    'workareas/govuk-upgrades',
    args[args.indexOf('--run-id') + 1],
    repo,
    `versions.${repo}.json`
  )
  return existsSync(path)
    ? normaliseRecordedText(readFileSync(path, 'utf8'), staged.home)
    : null
}

const recordWriteCase = async (script, { name, steps }) => {
  const staged = stageGovukWorkspace({ scripts: writeScripts })
  try {
    const runs = []
    for (const args of steps) {
      runs.push(
        await recordBashRun(staged, script, args, { exactOutput: true })
      )
    }
    return { case: name, steps, runs, state: stateFileText(staged, steps[0]) }
  } finally {
    staged.remove()
  }
}

test.skipIf(!writeScripts.every(workspaceScriptExists))(
  'tools/govuk classifies, adds changes and marks versions on every fixture case',
  async () => {
    const golden = {}
    for (const [command, cases] of Object.entries(writeCases)) {
      golden[command] = []
      for (const writeCase of cases) {
        golden[command].push(
          await recordWriteCase(WRITE_SCRIPT_FOR[command], writeCase)
        )
      }
    }

    await expect(goldenText(golden)).toMatchFileSnapshot(
      '__fixtures__/__golden__/govuk-write-scripts.json'
    )
  },
  120_000
)

test.skipIf(!APPLY_SCRIPTS.every(workspaceScriptExists))(
  'tools/govuk/apply-version.sh applies every fixture case with a stub npm',
  async () => {
    const runs = []
    for (const applyCase of applyCases) {
      const staged = stageGovukWorkspace({ scripts: APPLY_SCRIPTS })
      try {
        stageApplyRepos(staged)
        runs.push(
          await recordApplyCase(staged, applyCase, (args, env) =>
            recordBashRun(staged, APPLY_SCRIPTS[0], args, {
              env,
              exactOutput: true
            })
          )
        )
      } finally {
        staged.remove()
      }
    }

    await expect(goldenText(runs)).toMatchFileSnapshot(
      '__fixtures__/__golden__/govuk-apply-version.json'
    )
  },
  120_000
)
