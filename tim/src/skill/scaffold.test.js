import { afterEach, describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  readSkillGolden,
  recordSettings,
  recordTree,
  SCAFFOLD_WATCHED_FOLDERS,
  stageSkillWorkspace
} from './__fixtures__/skill-workspace.js'
import { missingAnswers, scaffoldSkill, withAllowEntries } from './scaffold.js'

const NOW = '2026-11-13T12:00:00Z'

const golden = readSkillGolden()

const recordedRun = (runCase) =>
  golden.scaffold.find(({ case: name }) => name === runCase)

const realSettingsPath = new URL(
  '../../../.claude/settings.json',
  import.meta.url
)

let staged

afterEach(() => staged?.remove())

describe('#missingAnswers', () => {
  test('Should list every answer an empty interview lacks, in order', () => {
    expect(missingAnswers({})).toEqual([
      'purpose',
      'state_shape',
      'dispatcher',
      'prebake',
      'fanout.enabled',
      'walker',
      'helpers',
      'triggers.phrases',
      'triggers.disambiguation'
    ])
  })

  test('Should count false as an answer and false disambiguation as none', () => {
    const answers = {
      purpose: 'p',
      state_shape: 'prose',
      dispatcher: false,
      prebake: false,
      fanout: { enabled: false },
      walker: false,
      helpers: [],
      triggers: { phrases: ['x'], disambiguation: false }
    }

    expect(missingAnswers(answers)).toEqual(['triggers.disambiguation'])
  })

  test('Should count phrases by length the way jq does', () => {
    const counted = ['ab', 3, { a: 1 }, false].map((phrases) =>
      missingAnswers({ triggers: { phrases } }).includes('triggers.phrases')
    )

    expect(counted).toEqual([false, false, false, true])
  })

  test('Should refuse phrases of true, which has no length', () => {
    expect(() => missingAnswers({ triggers: { phrases: true } })).toThrow(
      'boolean has no length'
    )
  })
})

describe('#withAllowEntries', () => {
  test('Should append only entries not already allowed, keeping the order', () => {
    const settings = { permissions: { allow: ['a', 'b'], deny: ['z'] } }

    expect(withAllowEntries(settings, ['b', 'c'])).toEqual({
      permissions: { allow: ['a', 'b', 'c'], deny: ['z'] }
    })
  })

  test('Should create the allow list when there is none', () => {
    expect(withAllowEntries({ model: 'x' }, ['a'])).toEqual({
      model: 'x',
      permissions: { allow: ['a'] }
    })
  })

  test('Should write the real settings.json back byte for byte when nothing is added', () => {
    const text = readFileSync(realSettingsPath, 'utf8')
    const settings = JSON.parse(text)

    const rewritten = withAllowEntries(settings, settings.permissions.allow)

    expect(`${JSON.stringify(rewritten, null, 2)}\n`).toBe(text)
  })
})

describe('#scaffoldSkill', () => {
  test('Should write the files, settings and stamp scaffold-skill.sh wrote', () => {
    staged = stageSkillWorkspace()

    const result = scaffoldSkill({
      workspaceRoot: staged.root,
      runId: 'json-fanout',
      now: NOW
    })

    const recorded = recordedRun('json-fanout')
    expect({
      settings: recordSettings(staged),
      tree: recordTree(staged, SCAFFOLD_WATCHED_FOLDERS)
    }).toEqual({ settings: recorded.settings, tree: recorded.tree })
    expect(`${result.text}\n`.split(staged.home).join('<HOME>')).toBe(
      recorded.stdout
    )
  })

  test('Should add no allowlist entry twice', () => {
    staged = stageSkillWorkspace()

    scaffoldSkill({
      workspaceRoot: staged.root,
      runId: 'fanout-no-walker',
      now: NOW
    })
    scaffoldSkill({
      workspaceRoot: staged.root,
      runId: 'fanout-no-walker',
      now: NOW
    })

    expect(recordSettings(staged).added).toEqual([
      'Bash(~/git/defra/trade-imports-workspace/tools/fanout-no-walker/*)'
    ])
  })

  test('Should write nothing on a dry run', () => {
    staged = stageSkillWorkspace()

    const result = scaffoldSkill({
      workspaceRoot: staged.root,
      runId: 'json-fanout',
      dryRun: true,
      now: NOW
    })

    expect(`${result.text}\n`.split(staged.home).join('<HOME>')).toBe(
      recordedRun('json-fanout dry run').stdout
    )
    expect(recordTree(staged, ['.claude/skills/json-fanout'])).toEqual({})
  })

  test('Should stamp scaffolded_at', () => {
    staged = stageSkillWorkspace()

    scaffoldSkill({
      workspaceRoot: staged.root,
      runId: 'prose-plain',
      now: NOW
    })

    const decisions = JSON.parse(
      readFileSync(
        join(staged.root, 'workareas/skill-creator/prose-plain/decisions.json'),
        'utf8'
      )
    )
    expect(decisions.scaffolded_at).toBe(NOW)
  })

  test('Should refuse missing answers and say which command records them', () => {
    staged = stageSkillWorkspace()

    expect(() =>
      scaffoldSkill({
        workspaceRoot: staged.root,
        runId: 'unanswered',
        now: NOW
      })
    ).toThrow(
      'Cannot scaffold — missing answers: purpose,state_shape,dispatcher,prebake,fanout.enabled,walker,helpers,triggers.phrases,triggers.disambiguation\nRun tim skill answer for each missing field, then retry.'
    )
  })

  test.each([
    [undefined, 'Missing --run-id'],
    ['../escape', 'Invalid run-id (must match ^[a-z0-9-]+$): ../escape'],
    ['nobody', /^No decisions\.json at /]
  ])('Should refuse run id %j', (runId, message) => {
    staged = stageSkillWorkspace()

    expect(() =>
      scaffoldSkill({ workspaceRoot: staged.root, runId, now: NOW })
    ).toThrow(message)
  })
})
