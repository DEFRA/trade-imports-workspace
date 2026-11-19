import { expect, test } from 'vitest'
import { execa } from 'execa'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  PREPARE_SCRIPTS,
  prepareFolder,
  REDACTION_CORPUS,
  SPLIT_AT_BYTES,
  stagePrepareWorkspace
} from './__fixtures__/prepare-workspace.js'

const scriptsExist = Object.values(PREPARE_SCRIPTS).every(workspaceScriptExists)

const record = (staged, script, ticket, args) =>
  recordBashRun(staged, script, args, {
    exactOutput: true,
    watch: prepareFolder(ticket),
    env: { PATH: `${staged.binDir}:${process.env.PATH}` }
  })

const recordFresh = async (script, ticket, args) => {
  const staged = stagePrepareWorkspace({ bash: true })
  try {
    return await record(staged, script, ticket, args)
  } finally {
    staged.remove()
  }
}

const recordStartThenResume = async () => {
  const staged = stagePrepareWorkspace({ bash: true })
  try {
    const fresh = await record(staged, PREPARE_SCRIPTS.start, 'EUDPA-900', [
      'EUDPA-900'
    ])
    const resume = await record(staged, PREPARE_SCRIPTS.start, 'EUDPA-900', [
      'EUDPA-900'
    ])
    return { fresh, resume }
  } finally {
    staged.remove()
  }
}

const recordRedaction = async () => {
  const staged = stagePrepareWorkspace({ bash: true })
  try {
    const input = join(staged.home, 'in.diff')
    const output = join(staged.home, 'out.diff')
    writeFileSync(input, REDACTION_CORPUS)
    const run = await execa(
      'node',
      [join(staged.root, PREPARE_SCRIPTS.redact), input, output],
      { reject: false }
    )
    return {
      exitCode: run.exitCode,
      count: run.stdout,
      text: readFileSync(output, 'utf8')
    }
  } finally {
    staged.remove()
  }
}

test.skipIf(!scriptsExist)(
  'tools/understanding-check starts, prepares and redacts a check on every fixture case',
  async () => {
    const golden = {
      startThenResume: await recordStartThenResume(),
      jsonWithCut: await recordFresh(PREPARE_SCRIPTS.prepare, 'EUDPA-903', [
        'EUDPA-903',
        '--json',
        '--max-diff-bytes',
        SPLIT_AT_BYTES
      ]),
      textWithCut: await recordFresh(PREPARE_SCRIPTS.prepare, 'EUDPA-903', [
        'EUDPA-903',
        '--max-diff-bytes',
        SPLIT_AT_BYTES
      ]),
      noPullRequests: await recordFresh(PREPARE_SCRIPTS.start, 'EUDPA-901', [
        'EUDPA-901'
      ]),
      jiraRefuses: await recordFresh(PREPARE_SCRIPTS.start, 'EUDPA-902', [
        'EUDPA-902'
      ]),
      redaction: await recordRedaction()
    }

    await expect(goldenText(golden)).toMatchFileSnapshot(
      '__fixtures__/__golden__/understanding-check-prepare.json'
    )
  },
  120_000
)
