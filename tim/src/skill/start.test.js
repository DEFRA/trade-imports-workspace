import { afterEach, describe, expect, test } from 'vitest'
import { readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { stageSkillWorkspace } from './__fixtures__/skill-workspace.js'
import { parseTrigger, renderStartText, startSkillCreator } from './start.js'

const NOW = '2026-11-13T12:00:00Z'

let staged

afterEach(() => staged?.remove())

describe('#parseTrigger', () => {
  test.each([
    ['scaffold skill notes', { mode: 'CREATE', name: 'notes' }],
    ['SKILL-CREATE Notes.', { mode: 'CREATE', name: 'notes' }],
    ['new workspace skill one two', { mode: 'CREATE', name: 'one' }],
    ['review skill alpha?', { mode: 'AUDIT_ONE', name: 'alpha' }],
    ['audit all skills', { mode: 'AUDIT_ALL' }]
  ])('Should read %j as %j', (trigger, parsed) => {
    expect(parseTrigger(trigger)).toEqual(parsed)
  })

  test('Should refuse a name with an underscore and list the forms it knows', () => {
    expect(() => parseTrigger('scaffold skill bad_name')).toThrow(
      /^Could not parse trigger: scaffold skill bad_name\n\nRecognised forms:/
    )
  })
})

describe('#startSkillCreator', () => {
  test('Should seed decisions for a new skill', () => {
    staged = stageSkillWorkspace()

    const result = startSkillCreator({
      workspaceRoot: staged.root,
      trigger: 'scaffold skill notes',
      now: NOW
    })

    const path = join(
      staged.root,
      'workareas/skill-creator/notes/decisions.json'
    )
    expect(result).toEqual({
      mode: 'CREATE',
      name: 'notes',
      decisions_path: path
    })
    expect(readFileSync(path, 'utf8')).toBe(
      `{\n  "name": "notes",\n  "started_at": "${NOW}",\n  "answered_at": null,\n  "scaffolded_at": null,\n  "answers": {}\n}\n`
    )
  })

  test('Should leave decisions that are already there', () => {
    staged = stageSkillWorkspace()
    const path = join(
      staged.root,
      'workareas/skill-creator/kept-run/decisions.json'
    )
    const before = readFileSync(path, 'utf8')

    startSkillCreator({
      workspaceRoot: staged.root,
      trigger: 'scaffold skill kept-run',
      now: NOW
    })

    expect(readFileSync(path, 'utf8')).toBe(before)
  })

  test('Should refuse a skill folder that exists', () => {
    staged = stageSkillWorkspace()

    expect(() =>
      startSkillCreator({
        workspaceRoot: staged.root,
        trigger: 'scaffold skill gamma',
        now: NOW
      })
    ).toThrow(
      `Skill already exists at ${join(staged.root, '.claude/skills/gamma')} — refusing to overwrite.\nPick a different name, or delete the existing scaffold first.`
    )
  })

  test('Should name the SKILL.md and audit file of one skill', () => {
    staged = stageSkillWorkspace()

    const result = startSkillCreator({
      workspaceRoot: staged.root,
      trigger: 'audit skill alpha',
      now: NOW
    })

    expect(result).toEqual({
      mode: 'AUDIT_ONE',
      name: 'alpha',
      skill_md_path: join(staged.root, '.claude/skills/alpha/SKILL.md'),
      output_path: join(staged.root, 'workareas/skills-audit/alpha.md')
    })
  })

  test('Should refuse to audit a skill with no SKILL.md', () => {
    staged = stageSkillWorkspace()

    expect(() =>
      startSkillCreator({
        workspaceRoot: staged.root,
        trigger: 'audit skill gamma',
        now: NOW
      })
    ).toThrow(
      `No skill at ${join(staged.root, '.claude/skills/gamma/SKILL.md')} — nothing to audit.`
    )
  })

  test('Should list every skill with a SKILL.md except skill-creator, in name order', () => {
    staged = stageSkillWorkspace()

    const { targets } = startSkillCreator({
      workspaceRoot: staged.root,
      trigger: 'audit skills',
      now: NOW
    })

    expect(targets.map(({ name }) => name)).toEqual(['alpha', 'beta-two'])
  })

  test('Should refuse to audit all when there is no skills folder', () => {
    staged = stageSkillWorkspace()
    rmSync(join(staged.root, '.claude/skills'), { recursive: true })

    expect(() =>
      startSkillCreator({
        workspaceRoot: staged.root,
        trigger: 'audit skills',
        now: NOW
      })
    ).toThrow(
      `No skills to audit under ${join(staged.root, '.claude/skills')} (excluding skill-creator).`
    )
  })
})

describe('#renderStartText', () => {
  test('Should print the mode, then the rest as one line of JSON', () => {
    expect(
      renderStartText({ mode: 'CREATE', name: 'x', decisions_path: '/p' })
    ).toBe('MODE: CREATE\n{"name":"x","decisions_path":"/p"}')
  })
})
