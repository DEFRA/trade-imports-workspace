import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { readJsonFile } from './io.js'
import { followRef } from './schema-ref.js'

/** Where the backlog schema lives, relative to the workspace root. */
export const BACKLOG_SCHEMA_PATH =
  '.claude/skills/requirements-pipeline/references/backlog.schema.json'

/** Where the intake record's schema lives, relative to the workspace root. */
export const INTAKE_SCHEMA_PATH =
  '.claude/skills/requirements-pipeline/references/intake.schema.json'

const readReferenceSchema = ({ workspaceRoot, schemaPath, name, usedFor }) => {
  const path = join(workspaceRoot, schemaPath)
  if (!existsSync(path)) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find the ${name} schema at ${path}. tim checks ${usedFor} against it.`
    )
  }
  return readJsonFile(path)
}

/**
 * Read the backlog schema from the workspace.
 *
 * @param {string} workspaceRoot
 * @returns {object}
 * @throws {TimError} NOT_FOUND when the workspace has no schema, PARSE when it is not JSON
 */
export const loadBacklogSchema = (workspaceRoot) =>
  readReferenceSchema({
    workspaceRoot,
    schemaPath: BACKLOG_SCHEMA_PATH,
    name: 'backlog',
    usedFor: 'every backlog'
  })

/**
 * Read the intake record's schema from the workspace.
 *
 * @param {string} workspaceRoot
 * @returns {object}
 * @throws {TimError} NOT_FOUND when the workspace has no schema, PARSE when it is not JSON
 */
export const loadIntakeSchema = (workspaceRoot) =>
  readReferenceSchema({
    workspaceRoot,
    schemaPath: INTAKE_SCHEMA_PATH,
    name: 'intake',
    usedFor: 'every ticket backlog'
  })

/**
 * The schema one increment row must meet.
 *
 * @param {object} schema - The backlog schema
 * @returns {object}
 */
export const rowSchemaOf = (schema) =>
  followRef(schema, schema.properties.increments.items)

/**
 * The statuses a row may carry, in the order the schema lists them.
 *
 * @param {object} schema - The backlog schema
 * @returns {string[]}
 */
export const statusesOf = (schema) => rowSchemaOf(schema).properties.status.enum

/**
 * The rigour presets a row may set, in the order the schema lists them.
 *
 * @param {object} schema - The backlog schema
 * @returns {string[]}
 */
export const rigoursOf = (schema) =>
  rowSchemaOf(schema).properties.rigour.anyOf.find((branch) => branch.enum).enum

/**
 * The fields that turn a requirement into a recipe: every field the row
 * schema's `not` refuses.
 *
 * @param {object} schema - The backlog schema
 * @returns {string[]}
 */
export const recipeFieldsOf = (schema) =>
  (rowSchemaOf(schema).not?.anyOf ?? []).flatMap(
    (branch) => branch.required ?? []
  )
