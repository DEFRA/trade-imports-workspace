import { describe, expect, test } from 'vitest'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import {
  prepareFolder,
  readPrepareGolden,
  saveGhOutput,
  stagePrepareWorkspace
} from '../../understanding-check/__fixtures__/prepare-workspace.js'

const golden = readPrepareGolden()

const runInStaged = async (args, { arrange = () => {} } = {}) => {
  const staged = stagePrepareWorkspace()
  try {
    arrange(staged)
    return await recordTimRun(staged, ['understanding-check', ...args])
  } finally {
    staged.remove()
  }
}

const writeCheckFiles = (staged, ticket, files) => {
  for (const [path, content] of Object.entries(files)) {
    const dest = join(staged.root, prepareFolder(ticket), path)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, content)
  }
}

describe('tim understanding-check start', () => {
  test('Should print what start-check.sh printed for a check that already has its meta', async () => {
    const run = await runInStaged(['start', 'EUDPA-900'], {
      arrange: (staged) =>
        writeCheckFiles(staged, 'EUDPA-900', golden.startThenResume.fresh.files)
    })

    expect(run).toEqual({
      exitCode: 0,
      stdout: golden.startThenResume.resume.stdout,
      stderr: ''
    })
  })

  test('Should say MODE: FRESH and name the raw folder for a new check', async () => {
    const run = await runInStaged(['start', 'EUDPA-900'])

    const checkDir =
      '<HOME>/git/defra/trade-imports-workspace/workareas/understanding-checks/EUDPA-900'
    expect(run).toEqual({
      exitCode: 0,
      stdout: `MODE: FRESH\n\nCheck folder: ${checkDir}\nRaw folder: ${checkDir}/.raw\n\nSave the pull requests into the raw folder with gh, then run tim understanding-check prepare (see SKILL.md Step 1).\n`,
      stderr: ''
    })
  })

  test('Should refuse a ticket that is not an EUDPA ticket', async () => {
    const run = await runInStaged(['start', 'NOPE-1'])

    expect(run).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: 'Unknown arg: NOPE-1\n'
    })
  })
})

describe('tim understanding-check prepare', () => {
  test('Should print the pull request to fetch for each repo with --select', async () => {
    const run = await runInStaged(['prepare', 'EUDPA-900', '--select'], {
      arrange: (staged) => saveGhOutput(staged, 'EUDPA-900')
    })

    expect(run).toEqual({
      exitCode: 0,
      stdout:
        'trade-imports-alpha 16\ntrade-imports-beta 9\ntrade-imports-delta 4\ntrade-imports-gamma 3\n',
      stderr: ''
    })
  })

  test('Should refuse --select when gh found no pull requests', async () => {
    const run = await runInStaged(['prepare', 'EUDPA-901', '--select'], {
      arrange: (staged) => saveGhOutput(staged, 'EUDPA-901')
    })

    expect(run).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: golden.noPullRequests.stderr
    })
  })

  test('Should refuse a byte limit that is not a whole number', async () => {
    const run = await runInStaged([
      'prepare',
      'EUDPA-900',
      '--max-diff-bytes',
      'lots'
    ])

    expect(run).toEqual({
      exitCode: 1,
      stdout: '',
      stderr:
        'Error: --max-diff-bytes must be a whole number of bytes, not lots\n'
    })
  })
})
