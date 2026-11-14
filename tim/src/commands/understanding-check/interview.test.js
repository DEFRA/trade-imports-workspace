import { describe, expect, test } from 'vitest'
import { join } from 'node:path'
import {
  recordFolderFiles,
  recordTimRun
} from '../../test-support/bash-golden-harness.js'
import {
  answerSteps,
  argsUnder,
  overlapSteps,
  questionRefusals,
  questionSteps,
  readInterviewGolden,
  reportCases,
  scoreRefusals,
  scoreSteps,
  stageInterviewWorkspace,
  TIM_COMMAND_FOR,
  verbSteps,
  watchedFolder
} from '../../understanding-check/__fixtures__/interview-workspace.js'
import { asTimNamesPrepare } from '../../understanding-check/__fixtures__/check-workspace.js'

const golden = readInterviewGolden()

const ticketOf = (args) => args.find((arg) => arg.startsWith('EUDPA-'))

const recordTimStep = (
  staged,
  { command, args },
  { watchFiles = true } = {}
) => {
  const ticket = ticketOf(args)
  return recordTimRun(
    staged,
    [
      'understanding-check',
      ...TIM_COMMAND_FOR[command],
      ...argsUnder(args, staged.root)
    ],
    watchFiles && ticket ? { watch: watchedFolder(ticket) } : {}
  )
}

const recordTimFresh = async (step, options) => {
  const staged = stageInterviewWorkspace()
  try {
    return await recordTimStep(staged, step, options)
  } finally {
    staged.remove()
  }
}

const recordTimInOrder = async (steps, options) => {
  const staged = stageInterviewWorkspace()
  try {
    const runs = []
    for (const step of steps) {
      runs.push(await recordTimStep(staged, step, options))
    }
    return {
      runs,
      files: recordFolderFiles(
        join(staged.root, watchedFolder(ticketOf(steps[0].args))),
        staged.home
      )
    }
  } finally {
    staged.remove()
  }
}

const TIM_USAGE_FOR = {
  'question-remove': 'question remove',
  answer: 'answer',
  report: 'report'
}

const asTimSaysUsage = (command, stderr) =>
  stderr.replace(
    /^Usage: \S+\/tools\/understanding-check\/[a-z-]+\.sh /,
    `Usage: tim understanding-check ${TIM_USAGE_FOR[command]} `
  )

const expectedRun = ({ case: _name, input: _input, command, ...run }) => ({
  ...run,
  stderr: asTimNamesPrepare(asTimSaysUsage(command, run.stderr))
})

describe('tim understanding-check question matches question-add.sh, question-replace.sh and question-remove.sh', () => {
  test('Should print the ids and messages the scripts printed and leave the same questions.json after every step', async () => {
    const { runs } = await recordTimInOrder(questionSteps)

    expect(runs).toEqual(golden.questions.map(expectedRun))
  })

  test.each(questionRefusals)(
    'Should refuse, with the same message and exit code and no file written, for $name',
    async (step) => {
      const timRun = await recordTimFresh(step)

      expect(timRun).toEqual(
        expectedRun(
          golden.questionRefusals.find(({ case: name }) => name === step.name)
        )
      )
    }
  )

  test('Should accept and refuse each rubric clause as the scripts did on the categorical-verb rule', async () => {
    const runs = []
    for (const step of verbSteps) {
      runs.push(await recordTimFresh(step, { watchFiles: false }))
    }

    expect(runs).toEqual(golden.verbs.map(expectedRun))
  })
})

describe('tim understanding-check answer matches transcript-record-answer.sh', () => {
  test('Should print the messages the script printed and leave the same transcript.json after every step', async () => {
    const { runs } = await recordTimInOrder(answerSteps)

    expect(runs).toEqual(golden.answers.map(expectedRun))
  })
})

describe('tim understanding-check score matches transcript-add-score.sh', () => {
  test('Should print the verdicts and warnings the script printed and leave the same transcript.json and meta after every step', async () => {
    const { runs } = await recordTimInOrder(scoreSteps)

    expect(runs).toEqual(golden.scores.map(expectedRun))
  })

  test.each(scoreRefusals)(
    'Should refuse, with the same message and exit code and no file written, for $name',
    async (step) => {
      const timRun = await recordTimFresh(step)

      expect(timRun).toEqual(
        expectedRun(
          golden.scoreRefusals.find(({ case: name }) => name === step.name)
        )
      )
    }
  )

  test('Should find the same rubric overlaps as the script on every overlap case and leave the same transcript.json', async () => {
    const { runs, files } = await recordTimInOrder(overlapSteps, {
      watchFiles: false
    })

    expect({ runs, files }).toEqual({
      runs: golden.overlaps.runs.map(expectedRun),
      files: golden.overlaps.files
    })
  })
})

const resultOf = (timRun) => JSON.parse(timRun.stdout).result

describe('tim understanding-check JSON output', () => {
  test('Should put the new question id in the envelope result', async () => {
    const step = questionSteps[0]

    const timRun = await recordTimFresh({
      ...step,
      args: [...step.args, '--json']
    })

    expect(resultOf(timRun)).toEqual({ id: 'Q1' })
  })

  test('Should put the unscorable verdict and its warning in the envelope result', async () => {
    const step = scoreSteps[2]

    const timRun = await recordTimFresh({
      ...step,
      args: [...step.args, '--json']
    })

    expect(resultOf(timRun)).toEqual({
      questionId: 'Q3',
      verdict: 'FAIL',
      unscorable: true,
      warning:
        "Warning: --rubric-match does not overlap any clause in Q3's rubric; recording as unscorable."
    })
  })

  test('Should put the preview the script printed in the envelope result', async () => {
    const bashRun = golden.reports.find(({ case: name }) => name === 'preview')

    const timRun = await recordTimFresh({
      command: 'report',
      args: ['EUDPA-204', '--preview', '--json']
    })

    expect(resultOf(timRun)).toEqual({ preview: bashRun.stdout })
  })
})

describe('tim understanding-check report matches render-report.sh', () => {
  test('Should refuse a full report with no questions.json, exit 1 and write no report.md, where render-report.sh died in jq after writing part of one', async () => {
    const bashRun = golden.reports.find(
      ({ case: name }) => name === 'full report without questions.json'
    )
    const questionsPath = bashRun.stderr.match(/--slurpfile q (\S+): /)[1]

    const timRun = await recordTimFresh({
      command: 'report',
      args: bashRun.input
    })

    expect([bashRun.exitCode, Object.keys(bashRun.files)]).toEqual([
      2,
      ['.interview-meta.json', 'report.md', 'transcript.json']
    ])
    expect(timRun).toEqual({
      exitCode: 1,
      stdout: '',
      stderr: `Error: ${questionsPath} not found — generate questions first\n`,
      files: {
        '.interview-meta.json': bashRun.files['.interview-meta.json'],
        'transcript.json': bashRun.files['transcript.json']
      }
    })
  })

  test.each(
    reportCases.filter(
      ({ name }) => name !== 'full report without questions.json'
    )
  )(
    'Should print what the script printed and write the same report.md for $name',
    async ({ name, args }) => {
      const timRun = await recordTimFresh({ command: 'report', args })

      expect(timRun).toEqual(
        expectedRun(golden.reports.find(({ case: each }) => each === name))
      )
    }
  )
})
