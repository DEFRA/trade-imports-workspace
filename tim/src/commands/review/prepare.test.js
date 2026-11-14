import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import {
  atlassianEnv,
  startAtlassianFixtureServer
} from '../refine/__fixtures__/atlassian-server.js'
import { normaliseRecording } from '../refine/__fixtures__/normalise.js'
import {
  observeReview,
  prepareCases,
  prepareEnv,
  saveGhOutput,
  stagePrepareWorkspace
} from '../../review/__fixtures__/review-prepare.js'

const golden = JSON.parse(
  readFileSync(
    new URL(
      '../../review/__fixtures__/__golden__/review-prepare.json',
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
  const index = prepareCases.findIndex((entry) => entry.name === name)
  return { ...prepareCases[index], recorded: golden[index] }
}

const withoutBase = (value) =>
  JSON.parse(JSON.stringify(value).split(atlassian.base).join('<BASE>'))

const runCaseInTim = async (prepareCase) => {
  const staged = await stagePrepareWorkspace()
  try {
    const runs = []
    for (const { tim, gh, before } of prepareCase.steps) {
      before?.(staged)
      if (gh !== undefined) saveGhOutput(staged, gh)
      runs.push(
        normaliseRecording(
          await recordTimRun(staged, ['review', ...tim], {
            env: prepareEnv(staged, atlassianEnv(atlassian.base))
          }),
          { base: atlassian.base }
        )
      )
    }
    const state =
      prepareCase.reviewId === undefined
        ? undefined
        : withoutBase(await observeReview(staged, prepareCase.reviewId))
    return { runs, state }
  } finally {
    staged.remove()
  }
}

const parsedMeta = (files) =>
  files['.review-meta.json'] === undefined
    ? undefined
    : JSON.parse(files['.review-meta.json'])

const expectStateAsRecorded = (state, recorded) => {
  const { '.review-meta.json': _meta, ...files } = state.files
  const { '.review-meta.json': _recordedMeta, ...recordedFiles } =
    recorded.files
  expect(files).toEqual(recordedFiles)
  expect(parsedMeta(state.files)).toEqual(parsedMeta(recorded.files))
  expect(state.clones).toEqual(recorded.clones)
}

const resultOf = (stdout) => JSON.parse(stdout).result

const sameAsBashCases = prepareCases.filter(
  ({ name, output }) =>
    ['text', 'json'].includes(output) &&
    ![
      'a ticket Jira gives no labels field',
      'a ticket Jira cannot find, as JSON',
      'start --local runs the local prepare'
    ].includes(name)
)

describe('tim review prepare matches the Bash it replaces', () => {
  test.each(sameAsBashCases.map(({ name }) => name))(
    'Should give the recorded output, exit code and review for %s',
    async (name) => {
      const prepareCase = recordedCase(name)

      const { runs, state } = await runCaseInTim(prepareCase)

      runs.forEach((run, stepIndex) => {
        const recordedStep = prepareCase.recorded.steps[stepIndex]
        expect(run.exitCode).toBe(recordedStep.exitCode)
        expect(run.stderr).toBe(recordedStep.stderr)
        if (prepareCase.output === 'json') {
          expect(resultOf(run.stdout)).toEqual(JSON.parse(recordedStep.stdout))
        } else {
          expect(run.stdout).toBe(recordedStep.stdout)
        }
      })
      if (state !== undefined) {
        expectStateAsRecorded(state, prepareCase.recorded.state)
      }
    },
    60_000
  )
})

describe('tim review prepare', () => {
  test('Should print the pull request to fetch for each repo with --select, an open one not preferred over a newer merged one', async () => {
    const { runs } = await runCaseInTim({
      steps: [
        {
          tim: ['prepare', 'EUDPA-101', '--select'],
          gh: { reviewId: 'EUDPA-101', query: 'EUDPA-101', selected: [] }
        }
      ]
    })

    expect(runs[0]).toEqual({
      exitCode: 0,
      stdout: 'trade-imports-animals-frontend 3\ntrade-imports-stub 9\n',
      stderr: ''
    })
  })

  test('Should name the gh search to run when gh saved no pull requests', async () => {
    const { runs } = await runCaseInTim({
      steps: [{ tim: ['prepare', 'EUDPA-101', '--select'] }]
    })

    expect(runs[0]).toEqual({
      exitCode: 1,
      stdout: '',
      stderr:
        "Error: Can't find the pull requests gh found. Save them with:\n  gh search prs EUDPA-101 --owner DEFRA --json number,title,repository,url,state,createdAt > <HOME>/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-101/.raw/prs.json\n"
    })
  })

  test('Should write ticket.md with no labels where Jira gives no labels field', async () => {
    const { runs, state } = await runCaseInTim(
      recordedCase('a ticket Jira gives no labels field')
    )

    expect(runs[0].exitCode).toBe(0)
    expect(state.files['ticket.md']).toContain('- **Labels:** \n')
  })

  test('Should give the error envelope for a ticket Jira cannot find with --json', async () => {
    const prepareCase = recordedCase('a ticket Jira cannot find, as JSON')

    const { runs } = await runCaseInTim(prepareCase)

    expect(runs[0].exitCode).toBe(1)
    expect(JSON.parse(runs[0].stdout).errors[0].message).toBe(
      `Error: ${JSON.parse(prepareCase.recorded.steps[0].stdout).error}`
    )
  })

  test.each([
    [
      'no ticket and no branch',
      'Usage: tim review prepare EUDPA-XXXXX | --branch <name> [--desc <text>] | --local <repo> <branch> [--files F1,F2,...] [--select] [--json]\n'
    ],
    [
      'a local review with no branch',
      'Usage: tim review prepare --local <repo> <branch> [--files F1,F2,...] [--json]\n'
    ]
  ])('Should print one usage line and exit 1 for %s', async (name, usage) => {
    const { runs } = await runCaseInTim(recordedCase(name))

    expect(runs[0]).toEqual({ exitCode: 1, stdout: '', stderr: usage })
  })
})

describe('tim review start', () => {
  test('Should say MODE: FRESH, then prepare the local review as prepare --local does', async () => {
    const local = recordedCase('a local review of the checked-out branch')

    const { runs, state } = await runCaseInTim(
      recordedCase('start --local runs the local prepare')
    )

    expect(runs[0]).toEqual({
      exitCode: 0,
      stdout: `MODE: FRESH\n\n${local.recorded.steps[0].stdout}`,
      stderr: ''
    })
    expectStateAsRecorded(state, local.recorded.state)
  })

  test('Should say MODE: REFRESH, then print the refresh scope envelope and write the snapshot', async () => {
    const prepareCase = recordedCase(
      'start on a review with an index builds the refresh scope'
    )
    const [recordedStep] = prepareCase.recorded.steps
    const [modeLines, envelope] = recordedStep.stdout.split(
      /(?<=^MODE: REFRESH\n\n)/
    )

    const { runs, state } = await runCaseInTim(prepareCase)

    expect(runs[0].exitCode).toBe(0)
    expect(runs[0].stdout.startsWith(modeLines)).toBe(true)
    expect(resultOf(runs[0].stdout.slice(modeLines.length))).toEqual(
      resultOf(envelope)
    )
    expectStateAsRecorded(state, prepareCase.recorded.state)
  })

  test('Should say MODE: FRESH for a new review, make its raw folder ready and name the gh search', async () => {
    const { runs } = await runCaseInTim({
      steps: [{ tim: ['start', 'EUDPA-101'] }]
    })

    const folder =
      '<HOME>/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-101'
    expect(runs[0]).toEqual({
      exitCode: 0,
      stdout: `MODE: FRESH\n\nReview folder: ${folder}\nRaw folder: ${folder}/.raw\n\nSave the pull requests into the raw folder with gh, then run tim review prepare (see the review skill, Step 1):\n  gh search prs EUDPA-101 --owner DEFRA --json number,title,repository,url,state,createdAt > ${folder}/.raw/prs.json\n`,
      stderr: ''
    })
  })

  test('Should print one usage line and exit 1 with no ticket', async () => {
    const { runs } = await runCaseInTim(recordedCase('start with no ticket'))

    expect(runs[0]).toEqual({
      exitCode: 1,
      stdout: '',
      stderr:
        'Usage: tim review start EUDPA-XXXXX | --local <repo> <branch> [--files F1,F2,...]\n'
    })
  })
})
