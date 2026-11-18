import { afterEach, describe, expect, test } from 'vitest'
import { execa } from 'execa'
import { statSync } from 'node:fs'
import { join } from 'node:path'
import { ERROR, OK } from '../../constants/exitCodes.js'
import { normaliseRecordedText } from '../../test-support/bash-golden-harness.js'
import { envelopeOf, TIM_CLI_PATH } from '../../test-support/tim-cli.js'
import {
  answerCases,
  answerRefusalCases,
  answerRunId,
  readSkillGolden,
  recordSettings,
  recordTree,
  renderCases,
  SCAFFOLD_WATCHED_FOLDERS,
  scaffoldCases,
  stageSkillWorkspace,
  startCases
} from '../../skill/__fixtures__/skill-workspace.js'

const golden = readSkillGolden()

const RENAMED_IN_MESSAGES = [
  ['run start-skill-creator.sh first', 'run tim skill start first'],
  ['Run interview-add-answer.sh for each', 'Run tim skill answer for each']
]

const JQ_ONLY_LINES = [
  /^jq: invalid JSON text passed to --argjson\n/m,
  /^Use jq --help for help with command-line options,\n/m,
  /^or see the jq manpage, or online docs at https:\/\/jqlang\.org\n/m
]

const asTimSaysIt = (stderr) =>
  [...RENAMED_IN_MESSAGES, ...JQ_ONLY_LINES.map((line) => [line, ''])]
    .reduce((text, [from, to]) => text.replace(from, to), stderr)
    .replace(/^jq: error \(at [^)]*\): /m, '')

const expectedRun = ({ stderr, ...rest }) => ({
  ...rest,
  stderr: asTimSaysIt(stderr)
})

const runTim = (staged, args) =>
  execa('node', [TIM_CLI_PATH, '--workspace', staged.root, 'skill', ...args], {
    reject: false,
    stripFinalNewline: false,
    env: { TIM_NO_AUTO_PULL: '1', TIM_WORKSPACE: undefined },
    extendEnv: true
  })

const recordTimRun = async (staged, args) => {
  const run = await runTim(staged, args)
  return {
    exitCode: run.exitCode,
    stdout: normaliseRecordedText(run.stdout, staged.home),
    stderr: normaliseRecordedText(run.stderr, staged.home)
  }
}

let staged

afterEach(() => staged?.remove())

describe('tim skill start matches start-skill-creator.sh', () => {
  test('Should print the recorded mode and payload for every trigger and leave the recorded decisions files', async () => {
    staged = stageSkillWorkspace()

    const runs = []
    for (const { name, trigger } of startCases) {
      runs.push({
        case: name,
        ...(await recordTimRun(staged, ['start', trigger]))
      })
    }

    expect({
      runs,
      tree: recordTree(staged, [
        'workareas/skill-creator',
        'workareas/skills-audit'
      ])
    }).toEqual({
      runs: golden.start.runs.map(expectedRun),
      tree: golden.start.tree
    })
  })

  test('Should give the mode and payload as one envelope with --json', async () => {
    staged = stageSkillWorkspace()

    const run = await runTim(staged, ['start', 'audit skill alpha', '--json'])

    expect(run.exitCode).toBe(OK)
    expect(envelopeOf(run).result).toEqual({
      mode: 'AUDIT_ONE',
      name: 'alpha',
      skill_md_path: join(staged.root, '.claude/skills/alpha/SKILL.md'),
      output_path: join(staged.root, 'workareas/skills-audit/alpha.md')
    })
  })

  test('Should refuse an empty trigger with exit 1', async () => {
    staged = stageSkillWorkspace()

    const run = await recordTimRun(staged, ['start', ''])

    expect(run).toEqual({
      exitCode: ERROR,
      stdout: '',
      stderr: 'Usage: tim skill start "<trigger phrase>"\n'
    })
  })
})

describe('tim skill answer matches interview-add-answer.sh', () => {
  test('Should write each answer byte for byte as the script did and refuse the same values', async () => {
    staged = stageSkillWorkspace()
    await runTim(staged, ['start', `scaffold skill ${answerRunId}`])

    const runs = []
    for (const { name, args } of answerCases) {
      const run = await recordTimRun(staged, [
        'answer',
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
      runs.push({
        case: name,
        ...(await recordTimRun(staged, ['answer', ...args]))
      })
    }

    expect(runs).toEqual(golden.answer.map(expectedRun))
  })

  test('Should give the field and value as the envelope result with --json', async () => {
    staged = stageSkillWorkspace()

    const run = await runTim(staged, [
      'answer',
      '--run-id',
      'kept-run',
      '--field',
      'fanout.enabled',
      '--value',
      'false',
      '--json'
    ])

    expect(run.exitCode).toBe(OK)
    expect(envelopeOf(run).result).toEqual({
      decisions_path: join(
        staged.root,
        'workareas/skill-creator/kept-run/decisions.json'
      ),
      field: 'fanout.enabled',
      value: false
    })
  })
})

describe('tim skill render matches render-interview.sh', () => {
  test('Should print the recorded markdown for every decisions file', async () => {
    staged = stageSkillWorkspace()

    const runs = []
    for (const { name, args } of renderCases) {
      runs.push({
        case: name,
        ...(await recordTimRun(staged, ['render', ...args]))
      })
    }

    expect(runs).toEqual(golden.render.map(expectedRun))
  })

  test('Should refuse a run id with a slash, which the script read as a path', async () => {
    staged = stageSkillWorkspace()

    const run = await recordTimRun(staged, [
      'render',
      '--run-id',
      '../render-full'
    ])

    expect(run).toEqual({
      exitCode: ERROR,
      stdout: '',
      stderr: 'Invalid run-id (must match ^[a-z0-9-]+$): ../render-full\n'
    })
  })

  test('Should give the markdown as the envelope result with --json', async () => {
    staged = stageSkillWorkspace()

    const run = await runTim(staged, [
      'render',
      '--run-id',
      'render-full',
      '--json'
    ])

    expect(envelopeOf(run).result).toEqual({
      markdown: golden.render[0].stdout.replace(/\n$/, '')
    })
  })
})

describe('tim skill scaffold matches scaffold-skill.sh', () => {
  test('Should write the recorded tree, settings and summary for every case, run after run', async () => {
    staged = stageSkillWorkspace()

    const runs = []
    for (const { name, args } of scaffoldCases) {
      const run = await recordTimRun(staged, ['scaffold', ...args])
      runs.push({
        case: name,
        ...run,
        settings: recordSettings(staged),
        tree: recordTree(staged, SCAFFOLD_WATCHED_FOLDERS)
      })
    }

    expect(runs).toEqual(golden.scaffold.map(expectedRun))
  })

  test('Should leave helper stubs executable', async () => {
    staged = stageSkillWorkspace()

    await runTim(staged, ['scaffold', '--run-id', 'json-fanout'])

    expect(
      statSync(join(staged.root, 'tools/json-fanout/add-item.sh')).mode & 0o777
    ).toBe(0o755)
  })

  test('Should give what it wrote as the envelope result with --json', async () => {
    staged = stageSkillWorkspace()

    const run = await runTim(staged, [
      'scaffold',
      '--run-id',
      'prose-plain',
      '--json'
    ])

    expect(envelopeOf(run).result).toEqual(
      expect.objectContaining({
        dry_run: false,
        name: 'prose-plain',
        references: [],
        schema: null,
        helpers: [],
        allowlist_entries: [
          'Bash(~/git/defra/trade-imports-workspace/tools/prose-plain/*)',
          'Bash(~/git/defra/trade-imports-workspace/tools/prose-plain/*:*)'
        ]
      })
    )
  })
})
