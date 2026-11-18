import { expect, test } from 'vitest'
import { join } from 'node:path'
import {
  goldenText,
  recordBashRun,
  recordFolderFiles,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  answerSteps,
  argsUnder,
  BASH_SCRIPT_FOR,
  overlapSteps,
  questionRefusals,
  questionSteps,
  reportCases,
  scoreRefusals,
  scoreSteps,
  stageInterviewWorkspace,
  verbSteps,
  watchedFolder
} from './__fixtures__/interview-workspace.js'

const scripts = Object.values(BASH_SCRIPT_FOR)
const scriptsExist = scripts.every(workspaceScriptExists)

const ticketOf = (args) => args.find((arg) => arg.startsWith('EUDPA-'))

const record = (staged, command, args, { watchFiles = true } = {}) => {
  const ticket = ticketOf(args)
  return recordBashRun(
    staged,
    BASH_SCRIPT_FOR[command],
    argsUnder(args, staged.root),
    {
      exactOutput: true,
      ...(watchFiles && ticket && { watch: watchedFolder(ticket) })
    }
  )
}

const recordEachFresh = async (cases, { watchFiles = true } = {}) => {
  const runs = []
  for (const { name, command, args } of cases) {
    const staged = stageInterviewWorkspace({ scripts })
    try {
      runs.push({
        case: name,
        command,
        input: args,
        ...(await record(staged, command, args, { watchFiles }))
      })
    } finally {
      staged.remove()
    }
  }
  return runs
}

const recordInOrder = async (steps, { watchFiles = true } = {}) => {
  const staged = stageInterviewWorkspace({ scripts })
  try {
    const runs = []
    for (const { name, command, args } of steps) {
      runs.push({
        case: name,
        command,
        input: args,
        ...(await record(staged, command, args, { watchFiles }))
      })
    }
    const ticket = ticketOf(steps[0].args)
    return {
      runs,
      files: recordFolderFiles(
        join(staged.root, watchedFolder(ticket)),
        staged.home
      )
    }
  } finally {
    staged.remove()
  }
}

test.skipIf(!scriptsExist)(
  'tools/understanding-check writes questions, answers and scores and renders the report on every fixture case',
  async () => {
    const golden = {
      questions: (await recordInOrder(questionSteps)).runs,
      questionRefusals: await recordEachFresh(questionRefusals),
      verbs: await recordEachFresh(verbSteps, { watchFiles: false }),
      answers: (await recordInOrder(answerSteps)).runs,
      scores: (await recordInOrder(scoreSteps)).runs,
      scoreRefusals: await recordEachFresh(scoreRefusals),
      overlaps: await recordInOrder(overlapSteps, { watchFiles: false }),
      reports: await recordEachFresh(
        reportCases.map((each) => ({ ...each, command: 'report' }))
      )
    }

    await expect(goldenText(golden)).toMatchFileSnapshot(
      '__fixtures__/__golden__/understanding-check-interview.json'
    )
  },
  300_000
)
