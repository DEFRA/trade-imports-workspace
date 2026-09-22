import { TimError } from '../errors.js'

const ANNOTATIONS = new Set([
  '$schema',
  '$id',
  '$comment',
  '$defs',
  'title',
  'description',
  'examples',
  'default'
])

const SUBSCHEMA_KEYWORDS = new Set(['items', 'not', 'if', 'then', 'else'])
const SUBSCHEMA_LIST_KEYWORDS = new Set(['anyOf', 'allOf'])
const SUBSCHEMA_MAP_KEYWORDS = new Set(['properties', '$defs'])

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const TYPE_TESTS = {
  object: isPlainObject,
  array: Array.isArray,
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number',
  integer: Number.isInteger,
  boolean: (value) => typeof value === 'boolean',
  null: (value) => value === null
}

const isDeepEqual = (left, right) =>
  JSON.stringify(left) === JSON.stringify(right)

const decodePointerSegment = (segment) =>
  segment.replaceAll('~1', '/').replaceAll('~0', '~')

/**
 * Follow a local `$ref` such as `#/$defs/text` from the root schema.
 *
 * @param {object} root
 * @param {string} ref
 * @returns {object|boolean}
 * @throws {TimError} PARSE when the ref is not local or points nowhere
 */
export const resolveRef = (root, ref) => {
  if (!ref.startsWith('#')) {
    throw new TimError(
      'PARSE',
      `The schema's "$ref" "${ref}" is not inside the schema. tim follows local refs only, such as "#/$defs/text".`
    )
  }
  const segments = ref
    .slice(1)
    .split('/')
    .filter(Boolean)
    .map(decodePointerSegment)
  const target = segments.reduce((node, segment) => node?.[segment], root)
  if (target === undefined) {
    throw new TimError(
      'PARSE',
      `The schema's "$ref" "${ref}" points at nothing.`
    )
  }
  return target
}

/**
 * A subschema with its `$ref` followed, so the caller sees the rule itself.
 *
 * @param {object} root
 * @param {object|boolean|undefined} schema
 * @returns {object|boolean|undefined}
 */
export const followRef = (root, schema) =>
  schema?.$ref === undefined ? schema : resolveRef(root, schema.$ref)

const error = (path, keyword, params = {}) => ({ path, keyword, params })

const childSchemasOf = (schema) =>
  Object.entries(schema).flatMap(([keyword, value]) => {
    if (SUBSCHEMA_KEYWORDS.has(keyword)) return [[keyword, value]]
    if (SUBSCHEMA_LIST_KEYWORDS.has(keyword)) {
      return value.map((child, index) => [`${keyword}/${index}`, child])
    }
    if (SUBSCHEMA_MAP_KEYWORDS.has(keyword)) {
      return Object.entries(value).map(([key, child]) => [
        `${keyword}/${key}`,
        child
      ])
    }
    return []
  })

// Every keyword the checker gives meaning to. A schema that uses any other
// is refused, so a rule is never written down and then silently not checked.
const KEYWORDS = new Set([
  '$ref',
  'type',
  'enum',
  'const',
  'pattern',
  'minLength',
  'minItems',
  'required',
  'properties',
  'items',
  'anyOf',
  'allOf',
  'not',
  'if',
  'then',
  'else'
])

/**
 * Refuse a schema that uses a keyword this checker does not implement.
 *
 * @param {object|boolean} schema
 * @param {string} [at='#']
 * @throws {TimError} PARSE naming the keyword and where it is
 */
export const assertSupported = (schema, at = '#') => {
  if (typeof schema === 'boolean') return
  if (!isPlainObject(schema)) {
    throw new TimError('PARSE', `The schema at ${at} is not an object.`)
  }
  const unsupported = Object.keys(schema).find(
    (keyword) => !KEYWORDS.has(keyword) && !ANNOTATIONS.has(keyword)
  )
  if (unsupported) {
    throw new TimError(
      'PARSE',
      `The schema at ${at} uses "${unsupported}", which tim's schema checker does not support. Add it to tim/src/backlog/json-schema.js, or say the rule another way.`
    )
  }
  for (const [keyword, child] of childSchemasOf(schema)) {
    assertSupported(child, `${at}/${keyword}`)
  }
}

const typeErrors = (schema, value, path) => {
  if (schema.type === undefined) return []
  const types = [schema.type].flat()
  return types.some((type) => TYPE_TESTS[type]?.(value))
    ? []
    : [error(path, 'type', { type: schema.type })]
}

const enumErrors = (schema, value, path) =>
  schema.enum === undefined ||
  schema.enum.some((option) => isDeepEqual(option, value))
    ? []
    : [error(path, 'enum', { allowedValues: schema.enum })]

const constErrors = (schema, value, path) =>
  schema.const === undefined || isDeepEqual(schema.const, value)
    ? []
    : [error(path, 'const', { allowedValue: schema.const })]

const stringErrors = (schema, value, path) => {
  if (typeof value !== 'string') return []
  const tooShort =
    schema.minLength !== undefined && [...value].length < schema.minLength
  const unmatched =
    schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(value)
  return [
    ...(tooShort
      ? [error(path, 'minLength', { limit: schema.minLength })]
      : []),
    ...(unmatched ? [error(path, 'pattern', { pattern: schema.pattern })] : [])
  ]
}

/**
 * Every way `value` departs from `schema`, walking from `root` for `$ref`s.
 * A failed `anyOf`, `not` or `if`/`then` is reported once at its own path,
 * with the branches' own errors left out: they say how each branch failed,
 * not what is wrong.
 *
 * @param {object} root
 * @param {object|boolean} schema
 * @param {unknown} value
 * @param {(string|number)[]} path
 * @returns {{path: (string|number)[], keyword: string, params: object}[]}
 */
const errorsAt = (root, schema, value, path) => {
  if (schema === true) return []
  if (schema === false) return [error(path, 'false')]
  const isValid = (subschema) =>
    errorsAt(root, subschema, value, path).length === 0
  const arrayErrors = () => {
    if (!Array.isArray(value)) return []
    const tooFew =
      schema.minItems !== undefined && value.length < schema.minItems
    return [
      ...(tooFew ? [error(path, 'minItems', { limit: schema.minItems })] : []),
      ...(schema.items === undefined
        ? []
        : value.flatMap((item, index) =>
            errorsAt(root, schema.items, item, [...path, index])
          ))
    ]
  }
  const objectErrors = () => {
    if (!isPlainObject(value)) return []
    return [
      ...(schema.required ?? [])
        .filter((property) => !Object.hasOwn(value, property))
        .map((property) =>
          error(path, 'required', { missingProperty: property })
        ),
      ...Object.entries(schema.properties ?? {})
        .filter(([property]) => Object.hasOwn(value, property))
        .flatMap(([property, subschema]) =>
          errorsAt(root, subschema, value[property], [...path, property])
        )
    ]
  }
  const conditionalErrors = () => {
    if (schema.if === undefined) return []
    const branch = isValid(schema.if) ? 'then' : 'else'
    if (schema[branch] === undefined || isValid(schema[branch])) return []
    return [error(path, 'if', { failingKeyword: branch })]
  }
  return [
    ...(schema.$ref === undefined
      ? []
      : errorsAt(root, resolveRef(root, schema.$ref), value, path)),
    ...typeErrors(schema, value, path),
    ...enumErrors(schema, value, path),
    ...constErrors(schema, value, path),
    ...stringErrors(schema, value, path),
    ...arrayErrors(),
    ...objectErrors(),
    ...(schema.anyOf === undefined || schema.anyOf.some(isValid)
      ? []
      : [error(path, 'anyOf')]),
    ...(schema.allOf ?? []).flatMap((subschema) =>
      errorsAt(root, subschema, value, path)
    ),
    ...(schema.not === undefined || !isValid(schema.not)
      ? []
      : [error(path, 'not')]),
    ...conditionalErrors()
  ]
}

/**
 * Check a value against a JSON Schema (draft 2020-12), for the keywords the
 * backlog schema uses. Refuses a schema with any other keyword rather than
 * ignoring it.
 *
 * @param {object} schema - The root schema
 * @param {unknown} value
 * @returns {{path: (string|number)[], keyword: string, params: object}[]} Empty when the value fits
 * @throws {TimError} PARSE when the schema uses a keyword this checker does not support
 */
export const validateJson = (schema, value) => {
  assertSupported(schema)
  return errorsAt(schema, schema, value, [])
}
