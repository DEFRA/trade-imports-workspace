import { describe, expect, test } from 'vitest'
import { readSkillGolden } from './__fixtures__/skill-workspace.js'
import {
  helperStubScript,
  skillMarkdown,
  stateBlock,
  stateSchemaMarkdown,
  step0Block,
  workerBlock,
  workerReferenceMarkdown
} from './templates.js'

const scaffoldTree = (runCase) =>
  readSkillGolden().scaffold.find(({ case: name }) => name === runCase).tree

const recordedText = (runCase, path) => scaffoldTree(runCase)[path].text

describe('#helperStubScript', () => {
  test('Should match the stub scaffold-skill.sh wrote', () => {
    expect(helperStubScript('add-item')).toBe(
      recordedText('json-fanout', 'tools/json-fanout/add-item.sh')
    )
  })
})

describe('#workerReferenceMarkdown', () => {
  test('Should match the reference scaffold-skill.sh wrote', () => {
    expect(workerReferenceMarkdown()).toBe(
      recordedText(
        'json-fanout',
        '.claude/skills/json-fanout/references/AUDITOR.md'
      )
    )
  })
})

describe('#stateSchemaMarkdown', () => {
  test('Should match the schema scaffold-skill.sh wrote', () => {
    expect(stateSchemaMarkdown('json-fanout')).toBe(
      recordedText(
        'json-fanout',
        '.claude/skills/json-fanout/assets/json-fanout-schema.md'
      )
    )
  })
})

describe('#skillMarkdown', () => {
  test('Should keep a blank line for each section a plain skill does not have', () => {
    const markdown = skillMarkdown({
      name: 'prose-plain',
      purpose: 'Write prose notes.',
      disambiguation: 'Not for tickets.',
      phrases: ['write notes'],
      helpers: [],
      workerSection: '',
      stateSection: '',
      step0Section: ''
    })

    expect(markdown).toBe(
      recordedText('prose-plain', '.claude/skills/prose-plain/SKILL.md')
    )
  })

  test('Should match a skill with every section', () => {
    const markdown = skillMarkdown({
      name: 'json-fanout',
      purpose: 'Scaffold workspace skills end to end.',
      disambiguation: 'Not for editing an existing skill.',
      phrases: ['scaffold skill', 'skill-create'],
      helpers: ['add-item', 'render-items'],
      workerSection: workerBlock('json-fanout', ['AUDITOR', 'PLANNER']),
      stateSection: stateBlock('json-fanout'),
      step0Section: step0Block('json-fanout')
    })

    expect(markdown).toBe(
      recordedText('json-fanout', '.claude/skills/json-fanout/SKILL.md')
    )
  })
})
