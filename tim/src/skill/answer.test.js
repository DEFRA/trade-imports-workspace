import { afterEach, describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { stageSkillWorkspace } from './__fixtures__/skill-workspace.js'
import { addAnswer, fieldKeys, setAnswer } from './answer.js'

let staged

afterEach(() => staged?.remove())

describe('#fieldKeys', () => {
  test.each([
    ['purpose', ['purpose']],
    ['fanout.enabled', ['fanout', 'enabled']],
    ['fanout.', ['fanout']],
    ['a..b', ['a', '', 'b']]
  ])('Should split %j into %j', (field, keys) => {
    expect(fieldKeys(field)).toEqual(keys)
  })
})

describe('#setAnswer', () => {
  test('Should keep existing keys in place and add new ones last', () => {
    const decisions = { name: 'x', answers: { purpose: 'a', walker: true } }

    const updated = setAnswer(decisions, 'purpose', 'b')

    expect(JSON.stringify(updated)).toBe(
      '{"name":"x","answers":{"purpose":"b","walker":true}}'
    )
  })

  test('Should create the objects a nested field needs', () => {
    expect(setAnswer({ answers: {} }, 'fanout.enabled', true)).toEqual({
      answers: { fanout: { enabled: true } }
    })
  })

  test('Should refuse to set a key under a value that is not an object', () => {
    expect(() =>
      setAnswer({ answers: { dispatcher: true } }, 'dispatcher.deep', 1)
    ).toThrow('Cannot index boolean with string ("deep")')
  })
})

describe('#addAnswer', () => {
  test('Should write the answer as jq prints JSON', () => {
    staged = stageSkillWorkspace()

    addAnswer({
      workspaceRoot: staged.root,
      runId: 'kept-run',
      field: 'helpers',
      valueText: '["a"]'
    })

    const path = join(
      staged.root,
      'workareas/skill-creator/kept-run/decisions.json'
    )
    expect(readFileSync(path, 'utf8')).toContain(
      '"answers": {\n    "purpose": "Already started.",\n    "helpers": [\n      "a"\n    ]\n  }\n}\n'
    )
  })

  test.each([
    [{ field: 'purpose', valueText: '"x"' }, 'Missing RUN_ID'],
    [{ runId: 'kept-run', valueText: '"x"' }, 'Missing FIELD'],
    [{ runId: 'kept-run', field: 'purpose', valueText: '' }, 'Missing VALUE'],
    [
      { runId: 'kept-run', field: 'purpose', valueText: 'not json' },
      'jq failed — invalid JSON value? VALUE=not json'
    ]
  ])('Should refuse %j', (options, message) => {
    staged = stageSkillWorkspace()

    expect(() => addAnswer({ workspaceRoot: staged.root, ...options })).toThrow(
      message
    )
  })

  test('Should refuse a run with no decisions file and say how to start one', () => {
    staged = stageSkillWorkspace()

    expect(() =>
      addAnswer({
        workspaceRoot: staged.root,
        runId: 'nobody',
        field: 'purpose',
        valueText: '"x"'
      })
    ).toThrow(
      `No decisions.json at ${join(staged.root, 'workareas/skill-creator/nobody/decisions.json')} — run tim skill start first`
    )
  })

  test('Should explain a field it cannot set and name the value', () => {
    staged = stageSkillWorkspace()

    expect(() =>
      addAnswer({
        workspaceRoot: staged.root,
        runId: 'kept-run',
        field: 'purpose.deep',
        valueText: '1'
      })
    ).toThrow(
      'Cannot index string with string ("deep")\njq failed — invalid JSON value? VALUE=1'
    )
  })
})
