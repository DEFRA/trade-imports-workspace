import { describe, test, expect } from 'vitest'
import { mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import {
  BACKLOG_SCHEMA_PATH,
  INTAKE_SCHEMA_PATH,
  loadBacklogSchema,
  loadIntakeSchema,
  recipeFieldsOf,
  rigoursOf,
  rowSchemaOf,
  statusesOf
} from './backlog-schema.js'
import { validateJson } from './validate-json.js'

const workspaceRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
)

const schema = loadBacklogSchema(workspaceRoot)

describe('loadBacklogSchema', () => {
  test('reads the schema from the workspace', () => {
    expect(schema.$schema).toBe('https://json-schema.org/draft/2020-12/schema')
  })

  test('names the path when the workspace has no schema', () => {
    const empty = realpathSync(mkdtempSync(join(tmpdir(), 'tim-schema-')))

    const load = () => loadBacklogSchema(empty)

    try {
      expect(load).toThrow(
        `Can't find the backlog schema at ${join(empty, BACKLOG_SCHEMA_PATH)}. tim checks every backlog against it.`
      )
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  })
})

describe('the backlog schema', () => {
  test('uses only keywords tim can check', () => {
    expect(validateJson(schema, { increments: [] })).toEqual([])
  })

  test('describes every row field', () => {
    const undescribed = Object.entries(rowSchemaOf(schema).properties)
      .filter(([, field]) => !field.description)
      .map(([name]) => name)

    expect(undescribed).toEqual([])
  })

  test('describes every envelope field', () => {
    const undescribed = Object.entries(schema.properties)
      .filter(([, field]) => !field.description)
      .map(([name]) => name)

    expect(undescribed).toEqual([])
  })
})

describe('loadIntakeSchema', () => {
  test('reads the intake schema from the workspace', () => {
    expect(loadIntakeSchema(workspaceRoot).title).toBe('The intake record')
  })

  test('names the path when the workspace has no intake schema', () => {
    const empty = realpathSync(mkdtempSync(join(tmpdir(), 'tim-schema-')))

    const load = () => loadIntakeSchema(empty)

    try {
      expect(load).toThrow(
        `Can't find the intake schema at ${join(empty, INTAKE_SCHEMA_PATH)}. tim checks every ticket backlog against it.`
      )
    } finally {
      rmSync(empty, { recursive: true, force: true })
    }
  })
})

describe('the intake schema', () => {
  const intakeSchema = loadIntakeSchema(workspaceRoot)

  test('uses only keywords tim can check', () => {
    expect(validateJson(intakeSchema, {}).length).toBeGreaterThan(0)
  })

  test('describes every field of the record', () => {
    const undescribed = Object.entries(intakeSchema.properties)
      .filter(([, field]) => !field.description)
      .map(([name]) => name)

    expect(undescribed).toEqual([])
  })
})

describe('statusesOf', () => {
  test('lists the statuses a row may carry', () => {
    expect(statusesOf(schema)).toEqual([
      'todo',
      'blocked',
      'done',
      'deferred',
      'dropped',
      'rejected',
      'merged-into'
    ])
  })
})

describe('rigoursOf', () => {
  test('names the rigour presets a row may set, in the schema’s order', () => {
    expect(rigoursOf(schema)).toEqual(['full', 'standard', 'fast'])
  })
})

describe('recipeFieldsOf', () => {
  test('lists the fields a row may not carry', () => {
    expect(recipeFieldsOf(schema)).toEqual([
      'filesToTouch',
      'verification',
      'recipe',
      'implementorSkill'
    ])
  })
})
