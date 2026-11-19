import { readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import {
  atlassianEnv,
  startAtlassianFixtureServer
} from '../refine/__fixtures__/atlassian-server.js'
import {
  TICKET,
  argsIn,
  stageStyleStart,
  startCases,
  startWatchFolder
} from '../../style/__fixtures__/style-start.js'

const golden = JSON.parse(
  readFileSync(
    new URL(
      '../../style/__fixtures__/__golden__/style-start.json',
      import.meta.url
    ),
    'utf8'
  )
)

let atlassian

beforeAll(async () => {
  atlassian = await startAtlassianFixtureServer()
})

afterAll(() => atlassian?.close())

const recordedCase = (name) => {
  const index = startCases.findIndex((entry) => entry.name === name)
  return { ...startCases[index], recorded: golden[index] }
}

const printedScopeJson = ({ command, input, exitCode }) =>
  command === 'scope' && !input.includes('--human') && exitCode === 0

const printsJson = (recordedStep) =>
  recordedStep.input.includes('--json') || printedScopeJson(recordedStep)

const timArgsFor = ({ command, args }, recordedStep) => {
  const withoutHuman = args.filter((arg) => arg !== '--human')
  const json =
    recordedStep !== undefined && printedScopeJson(recordedStep)
      ? ['--json']
      : []
  return ['style', ...command.split(' '), ...withoutHuman, ...json]
}

const runCaseInTim = async ({ steps, recorded }) => {
  const staged = await stageStyleStart({
    atlassian: atlassianEnv(atlassian.base)
  })
  try {
    const runs = []
    for (const [stepIndex, step] of steps.entries()) {
      await step.before?.(staged)
      runs.push(
        await recordTimRun(
          staged,
          argsIn(timArgsFor(step, recorded?.steps[stepIndex]), staged),
          { watch: startWatchFolder, env: staged.env }
        )
      )
    }
    return runs
  } finally {
    staged.remove()
  }
}

const resultOf = (stdout) => JSON.parse(stdout).result

const expectRunAsRecorded = (run, recordedStep) => {
  expect(run.exitCode).toBe(recordedStep.exitCode)
  expect(run.files).toEqual(recordedStep.files)
  if (printsJson(recordedStep) && recordedStep.exitCode === 0) {
    expect(resultOf(run.stdout)).toEqual(JSON.parse(recordedStep.stdout))
  } else {
    expect(run.stdout).toBe(recordedStep.stdout)
  }
  expect(run.stderr).toBe(recordedStep.stderr)
}

const sameAsBashCases = [
  'prepare a ticket',
  'prepare a ticket as JSON',
  'a second prepare keeps a file with a verdict',
  'prepare a ticket with no review workspace',
  'prepare a local branch',
  'prepare a local branch as JSON',
  'prepare the files the caller names, with the repo validation doc',
  'a second local prepare keeps a file with a verdict',
  'prepare a local branch of main, which changes nothing',
  'prepare a local branch of a folder that is not a git repo',
  'scope a refresh over changed, merged, open and uncovered files',
  'scope writes a snapshot, then sees no change',
  'scope starts from the last review refresh',
  'scope a ticket with no style review',
  'scope a style review with no review workspace',
  'file init for a ticket and for a local review',
  'bundle a topic with and without the repo-relative doc'
]

describe('tim style prepare, scope, file init and bundle match the Bash they replace', () => {
  test.each(sameAsBashCases)(
    'Should give the recorded output, exit code and files for %s',
    async (name) => {
      const startCase = recordedCase(name)

      const runs = await runCaseInTim(startCase)

      runs.forEach((run, stepIndex) =>
        expectRunAsRecorded(run, startCase.recorded.steps[stepIndex])
      )
    },
    120_000
  )
})

describe('tim style refusals', () => {
  test.each([
    ['prepare with no ticket', 'Usage: tim style prepare <review-id> [--json]'],
    [
      'prepare a local branch with no branch',
      'Usage: tim style prepare --local <repo> <branch> [--files F1,F2,...] [--json]'
    ],
    [
      'scope with no ticket',
      'Usage: tim style scope <review-id> [--repo REPO] [--no-pull] [--write-snapshot] [--json]'
    ],
    [
      'start with no ticket',
      'Usage: tim style start EUDPA-XXXXX [--no-pull] [--repo REPO] | --local <repo> <branch> [--files F1,F2,...]'
    ]
  ])('Should print one usage line and exit 1 for %s', async (name, usage) => {
    const [run] = await runCaseInTim(recordedCase(name))

    expect(run).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: `${usage}\n`,
      files: {}
    })
  })

  test.each(['prepare with an unknown option', 'scope with an unknown option'])(
    'Should refuse the unknown option and exit 1 for %s',
    async (name) => {
      const [run] = await runCaseInTim(recordedCase(name))

      expect(run.exitCode).toBe(1)
      expect(run.stderr.split('\n')[0]).toBe("error: unknown option '--bogus'")
    }
  )

  test('Should refuse a missing option, an unknown mode and an unknown option for file init, as Bash did, apart from its unknown-option wording', async () => {
    const startCase = recordedCase(
      'file init refuses a missing option, an unknown mode and an unknown option'
    )

    const runs = await runCaseInTim(startCase)

    expectRunAsRecorded(runs[0], startCase.recorded.steps[0])
    expectRunAsRecorded(runs[1], startCase.recorded.steps[1])
    expect(runs[2].exitCode).toBe(1)
    expect(runs[2].stderr.split('\n')[0]).toBe(
      "error: unknown option '--bogus'"
    )
  })
})

describe('tim style prepare refuses pull request files it cannot trust', () => {
  const prsFile = (root, name) =>
    join(root, 'workareas', 'reviews', TICKET, '.prs', name)

  test('Should name the gh command and write nothing when a pull request has no .prs/ file', async () => {
    const [run] = await runCaseInTim({
      steps: [
        {
          command: 'prepare',
          args: [TICKET],
          before: ({ root }) =>
            rmSync(prsFile(root, 'trade-imports-stub-9.json'))
        }
      ]
    })

    expect(run).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: `Can't find the changed files of trade-imports-stub#9. Write them with:\n  gh api repos/DEFRA/trade-imports-stub/pulls/9/files --paginate --slurp > <HOME>/git/defra/trade-imports-workspace/workareas/reviews/${TICKET}/.prs/trade-imports-stub-9.json\n`,
      files: {}
    })
  })

  test('Should refuse a .prs/ file that lists no files for a pull request that changes some', async () => {
    const [run] = await runCaseInTim({
      steps: [
        {
          command: 'prepare',
          args: [TICKET],
          before: ({ root }) =>
            writeFileSync(prsFile(root, 'trade-imports-stub-9.json'), '[[]]\n')
        }
      ]
    })

    expect(run).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: `trade-imports-stub#9 changes 3 files, but <HOME>/git/defra/trade-imports-workspace/workareas/reviews/${TICKET}/.prs/trade-imports-stub-9.json lists none. Write it again with:\n  gh api repos/DEFRA/trade-imports-stub/pulls/9/files --paginate --slurp > <HOME>/git/defra/trade-imports-workspace/workareas/reviews/${TICKET}/.prs/trade-imports-stub-9.json\n`,
      files: {}
    })
  })
})

describe('tim style scope', () => {
  test('Should warn of a pull request with no .prs/ file and name the gh command that writes it', async () => {
    const startCase = recordedCase(
      'scope skips a repo with no clone and warns of a pull request with no files'
    )
    const [, recordedScope] = startCase.recorded.steps

    const [, run] = await runCaseInTim(startCase)

    expect(run.exitCode).toBe(0)
    expect(run.stdout).toBe(recordedScope.stdout)
    expect(run.files).toEqual(recordedScope.files)
    expect(run.stderr).toBe(
      recordedScope.stderr.replace(
        '#3\n',
        `#3\n  Write them with: gh api repos/DEFRA/trade-imports-animals-frontend/pulls/3/files --paginate --slurp > <HOME>/git/defra/trade-imports-workspace/workareas/reviews/${TICKET}/.prs/trade-imports-animals-frontend-3.json\n`
      )
    )
  })

  test('Should report the failed pull on stderr and exit 1, writing nothing', async () => {
    const startCase = recordedCase('scope pulls first, and the pull fails')
    const [, recordedScope] = startCase.recorded.steps

    const [, run] = await runCaseInTim(startCase)

    expect(run.exitCode).toBe(1)
    expect(run.files).toEqual(recordedScope.files)
    expect(run.stderr).toBe(recordedScope.stderr)
  })
})

describe('tim style start', () => {
  test('Should say MODE: FRESH and prepare, then MODE: REFRESH with the failed pull in its envelope, then MODE: REFRESH with the scope and snapshot', async () => {
    const startCase = recordedCase(
      'start a new review, then refresh it with a pull that fails, then without a pull'
    )
    const [fresh, failedPull, refresh] = startCase.recorded.steps
    const modeLines = 'MODE: REFRESH\n\n'

    const runs = await runCaseInTim(startCase)

    expectRunAsRecorded(runs[0], fresh)
    expect(runs[1].exitCode).toBe(1)
    expect(runs[1].stdout.startsWith(modeLines)).toBe(true)
    expect(
      JSON.parse(runs[1].stdout.slice(modeLines.length)).errors[0].message
    ).toBe('Pull failed')
    expect(`${runs[1].stderr}Pull failed\n`).toBe(failedPull.stderr)
    expect(runs[2].exitCode).toBe(0)
    expect(runs[2].stdout.startsWith(modeLines)).toBe(true)
    expect(resultOf(runs[2].stdout.slice(modeLines.length))).toEqual(
      JSON.parse(refresh.stdout.slice(modeLines.length))
    )
    expect(runs[2].files).toEqual(refresh.files)
  })

  test('Should say MODE: FRESH, then prepare the local review as prepare --local does', async () => {
    const local = recordedCase('prepare a local branch')
    const [recordedLocal] = local.recorded.steps

    const [run] = await runCaseInTim(recordedCase('start a local review'))

    expect(run).toEqual({
      exitCode: 0,
      stdout: `MODE: FRESH\n\n${recordedLocal.stdout}`,
      stderr: recordedLocal.stderr,
      files: recordedLocal.files
    })
  })
})

describe('tim style topics', () => {
  test('Should print each topic on its own line in routing order', async () => {
    const [run] = await runCaseInTim({
      steps: [{ command: 'topics', args: ['tests/a.spec.js'] }]
    })

    expect(run.stdout).toBe('node\nplaywright\n')
  })

  test('Should print nothing for a path with no topic', async () => {
    const [run] = await runCaseInTim({
      steps: [{ command: 'topics', args: ['README.md'] }]
    })

    expect(run).toMatchObject({ exitCode: 0, stdout: '' })
  })
})
