import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { readJsonFile } from './io.js'
import { followRef } from './schema-ref.js'

/**
 * Where the one definition of the backlog shape lives, relative to the
 * workspace root. DISTIL writes to it, the build loop reads by it, and
 * `tim backlog check` validates against it.
 */
export const BACKLOG_SCHEMA_PATH =
  '.claude/skills/requirements-pipeline/references/backlog.schema.json'

/**
 * Read the backlog schema from the workspace.
 *
 * @param {string} workspaceRoot
 * @returns {object}
 * @throws {TimError} NOT_FOUND when the workspace has no schema, PARSE when it is not JSON
 */
export const loadBacklogSchema = (workspaceRoot) => {
  const path = join(workspaceRoot, BACKLOG_SCHEMA_PATH)
  if (!existsSync(path)) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find the backlog schema at ${path}. tim checks every backlog against it.`
    )
  }
  return readJsonFile(path)
}

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
