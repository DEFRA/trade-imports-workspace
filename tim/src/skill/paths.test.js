import { describe, expect, test } from 'vitest'
import { assertRunId, decisionsPath, skillCreatorPaths } from './paths.js'

describe('#skillCreatorPaths', () => {
  test('Should place every folder under the given workspace', () => {
    expect(skillCreatorPaths('/ws')).toEqual({
      skillsDir: '/ws/.claude/skills',
      auditsDir: '/ws/workareas/skills-audit',
      interviewsDir: '/ws/workareas/skill-creator',
      settingsPath: '/ws/.claude/settings.json',
      toolsDir: '/ws/tools'
    })
  })
})

describe('#decisionsPath', () => {
  test("Should name the run's decisions.json", () => {
    expect(decisionsPath('/ws', 'notes')).toBe(
      '/ws/workareas/skill-creator/notes/decisions.json'
    )
  })
})

describe('#assertRunId', () => {
  test('Should accept lower-case letters, digits and hyphens, a leading digit included', () => {
    expect(['notes', '9lives', 'a-b-1'].map(assertRunId)).toEqual([
      'notes',
      '9lives',
      'a-b-1'
    ])
  })

  test.each(['Notes', '-x', 'a_b', '../x', ''])('Should refuse %j', (runId) => {
    expect(() => assertRunId(runId)).toThrow(
      `Invalid run-id (must match ^[a-z0-9-]+$): ${runId}`
    )
  })
})
