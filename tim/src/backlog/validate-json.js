import Ajv2020 from 'ajv/dist/2020.js'

// strictTypes/strictRequired are off: the backlog schema's conditional
// subschemas (`not.anyOf`, `if`/`then`) state `required`/`properties`
// without repeating `type: "object"` in the same subschema — valid JSON
// Schema, just not something ajv's strict heuristics expect.
const ajv = new Ajv2020({
  allErrors: true,
  strict: true,
  strictTypes: false,
  strictRequired: false
})

// One compiled validator per schema object, so a schema read once (as
// `loadBacklogSchema` does) is compiled once, not on every check.
const compiled = new WeakMap()

const compilerFor = (schema) => {
  const cached = compiled.get(schema)
  if (cached) return cached
  const validate = ajv.compile(schema)
  compiled.set(schema, validate)
  return validate
}

const ARRAY_INDEX = /^\d+$/

const decodeSegment = (segment) =>
  segment.replaceAll('~1', '/').replaceAll('~0', '~')

// ajv's `instancePath` is a JSON pointer string with every segment a string,
// even array indices. Numeric segments are turned back into numbers so a
// caller can compare a row's error path against a real array index, such as
// `shape.js`'s `error.path[1] === index`.
const pathFrom = (instancePath) =>
  instancePath === ''
    ? []
    : instancePath
        .slice(1)
        .split('/')
        .map(decodeSegment)
        .map((segment) =>
          ARRAY_INDEX.test(segment) ? Number(segment) : segment
        )

// The schemaPath prefix of the branch errors nested under a failed `anyOf`
// or `if`/`then`/`else`, so they can be dropped: a failed `anyOf` or `if` is
// reported once at its own path, with the branches' own errors left out —
// they say how each branch failed, not what is wrong (`shape.js` reads the
// schema itself to say what is wrong).
const branchPrefix = (error) => {
  if (error.keyword === 'anyOf') return `${error.schemaPath}/`
  if (error.keyword === 'if') {
    const base = error.schemaPath.slice(0, -'/if'.length)
    return `${base}/${error.params.failingKeyword}/`
  }
  return null
}

const dropBranchErrors = (errors) => {
  const prefixes = errors.map(branchPrefix).filter(Boolean)
  return errors.filter(
    (error) => !prefixes.some((prefix) => error.schemaPath.startsWith(prefix))
  )
}

/**
 * Check a value against a JSON Schema (draft 2020-12), via ajv.
 *
 * @param {object} schema - The root schema, compiled once per schema object
 * @param {unknown} value
 * @returns {{path: (string|number)[], keyword: string, params: object}[]} Empty when the value fits
 */
export const validateJson = (schema, value) => {
  const validate = compilerFor(schema)
  if (validate(value)) return []
  return dropBranchErrors(validate.errors).map((error) => ({
    path: pathFrom(error.instancePath),
    keyword: error.keyword,
    params: error.params
  }))
}
