import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  answerCases,
  answerRefusalCases,
  answerRunId,
  BASH_SCRIPT_FOR,
  recordSettings,
  recordTree,
  renderCases,
  SCAFFOLD_WATCHED_FOLDERS,
  scaffoldCases,
  stageSkillWorkspace,
  startCases
} from './__fixtures__/skill-workspace.js'

const scripts = Object.values(BASH_SCRIPT_FOR)
const scriptsExist = scripts.every(workspaceScriptExists)

const record = (staged, command, args) =>
  recordBashRun(staged, BASH_SCRIPT_FOR[command], args, { exactOutput: true })

const recordStart = async (staged) => {
  const runs = []
  for (const { name, trigger } of startCases) {
    runs.push({ case: name, ...(await record(staged, 'start', [trigger])) })
  }
  return {
    runs,
    tree: recordTree(staged, [
      'workareas/skill-creator',
      'workareas/skills-audit'
    ])
  }
}

const recordAnswer = async (staged) => {
  await record(staged, 'start', [`scaffold skill ${answerRunId}`])
  const runs = []
  for (const { name, args } of answerCases) {
    const run = await record(staged, 'answer', [
      '--run-id',
      answerRunId,
      ...args
    ])
    runs.push({
      case: name,
      ...run,
      tree: recordTree(staged, [`workareas/skill-creator/${answerRunId}`])
    })
  }
  for (const { name, args } of answerRefusalCases) {
    runs.push({ case: name, ...(await record(staged, 'answer', args)) })
  }
  return runs
}

const recordRender = async (staged) => {
  const runs = []
  for (const { name, args } of renderCases) {
    runs.push({ case: name, ...(await record(staged, 'render', args)) })
  }
  return runs
}

const recordScaffold = async (staged) => {
  const runs = []
  for (const { name, args } of scaffoldCases) {
    const run = await record(staged, 'scaffold', args)
    runs.push({
      case: name,
      ...run,
      settings: recordSettings(staged),
      tree: recordTree(staged, SCAFFOLD_WATCHED_FOLDERS)
    })
  }
  return runs
}

test.skipIf(!scriptsExist)(
  'tools/skill-creator dispatches every trigger, writes each answer, renders each decisions file and scaffolds each shape',
  async () => {
    const recordIn = async (recorder) => {
      const staged = stageSkillWorkspace({ scripts })
      try {
        return await recorder(staged)
      } finally {
        staged.remove()
      }
    }

    const golden = {
      start: await recordIn(recordStart),
      answer: await recordIn(recordAnswer),
      render: await recordIn(recordRender),
      scaffold: await recordIn(recordScaffold)
    }

    await expect(goldenText(golden)).toMatchFileSnapshot(
      '__fixtures__/__golden__/skill-creator-scripts.json'
    )
  },
  120_000
)
