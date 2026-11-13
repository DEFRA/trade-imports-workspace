import { afterEach, describe, expect, test } from 'vitest'
import {
  readSkillGolden,
  renderDecisions as renderFixtures,
  stageSkillWorkspace
} from './__fixtures__/skill-workspace.js'
import { renderDecisions, renderInterview } from './render.js'

const golden = readSkillGolden()

const recordedMarkdownOf = (runId) =>
  golden.render
    .find(({ case: name }) => name === runId)
    .stdout.replace(/\n$/, '')

let staged

afterEach(() => staged?.remove())

describe('#renderDecisions', () => {
  test.each(Object.keys(renderFixtures))(
    'Should render %s as render-interview.sh did',
    (runId) => {
      const decisions = { name: runId, answers: renderFixtures[runId] }

      expect(renderDecisions(decisions)).toBe(recordedMarkdownOf(runId))
    }
  )

  test('Should refuse a workers answer that is not a list', () => {
    expect(() =>
      renderDecisions({ name: 'x', answers: { fanout: { workers: 'one' } } })
    ).toThrow('The fanout.workers answer must be a list.')
  })

  test('Should refuse a worker that is an object', () => {
    expect(() =>
      renderDecisions({ name: 'x', answers: { fanout: { workers: [{}] } } })
    ).toThrow('Cannot join {}')
  })

  test('Should join null, number and boolean workers as jq does', () => {
    expect(
      renderDecisions({
        name: 'x',
        answers: { fanout: { workers: [null, 2, true] } }
      })
    ).toContain('**Workers:** , 2, true\n')
  })
})

describe('#renderInterview', () => {
  test("Should render a run's decisions file", () => {
    staged = stageSkillWorkspace()

    expect(
      renderInterview({ workspaceRoot: staged.root, runId: 'render-full' })
    ).toEqual({ markdown: recordedMarkdownOf('render-full') })
  })

  test('Should refuse a missing run id', () => {
    staged = stageSkillWorkspace()

    expect(() => renderInterview({ workspaceRoot: staged.root })).toThrow(
      'Missing --run-id'
    )
  })

  test('Should refuse a run with no decisions file', () => {
    staged = stageSkillWorkspace()

    expect(() =>
      renderInterview({ workspaceRoot: staged.root, runId: 'nobody' })
    ).toThrow(
      /^No decisions\.json at .*\/workareas\/skill-creator\/nobody\/decisions\.json$/
    )
  })
})
