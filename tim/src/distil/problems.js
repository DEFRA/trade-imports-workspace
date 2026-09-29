import { validateJson } from '../backlog/validate-json.js'
import { TimError } from '../errors.js'

const isText = (value) => typeof value === 'string' && value.trim() !== ''

const segmentName = (container, segment) => {
  if (typeof segment !== 'number') return `.${segment}`
  const item = container?.[segment]
  return isText(item?.id) ? `[${item.id}]` : `[${segment}]`
}

const stepInto = ({ location, actual }, segment) => ({
  location: location + segmentName(actual, segment),
  actual: actual?.[segment]
})

const locate = (value, path) => {
  const { location, actual } = path.reduce(stepInto, {
    location: '',
    actual: value
  })
  return { location: location.replace(/^\./, ''), actual }
}

const TYPE_WORDS = {
  string: 'text',
  array: 'a list',
  object: 'an object',
  boolean: 'true or false',
  number: 'a number',
  integer: 'a whole number',
  null: 'null'
}

const NOT_BLANK = '\\S'

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`

const asProblem = (problem) =>
  typeof problem === 'string' ? { message: problem } : problem

/**
 * The one refusal every distil check ends in: a count, where, then every
 * problem on its own line, so a retry has the whole list to fix. When the
 * problems carry a scope, the error also keeps them as `problems`, which
 * `--json` mode prints in the error envelope, so a caller can route each
 * one by its scope rather than its wording.
 *
 * @param {(string|{scope: string, message: string})[]} problems
 * @param {string} where - Such as `in /path/to/workarea`
 * @returns {TimError} LINT
 */
export const problemsError = (problems, where) => {
  const listed = problems.map(asProblem)
  const error = new TimError(
    'LINT',
    `${plural(listed.length, 'problem')} ${where}:\n${listed.map((problem) => problem.message).join('\n')}`
  )
  if (listed.some((problem) => isText(problem.scope))) error.problems = listed
  return error
}

const describeError = ({ subject, actual, error, schemaName }) => {
  const { keyword, params } = error
  switch (keyword) {
    case 'required':
      return `${subject} has no "${params.missingProperty}".`
    case 'enum':
      return `${subject} is ${JSON.stringify(actual)}. Use one of: ${params.allowedValues.join(', ')}.`
    case 'const':
      return `${subject} is ${JSON.stringify(actual)}. It must be ${JSON.stringify(params.allowedValue)}.`
    case 'type':
      return `${subject} must be ${TYPE_WORDS[params.type] ?? params.type}.`
    case 'pattern':
      return params.pattern === NOT_BLANK
        ? `${subject} is empty.`
        : `${subject} is ${JSON.stringify(actual)}, which does not match ${params.pattern}.`
    case 'minItems':
      return `${subject} needs at least ${plural(params.limit, 'item')}.`
    case 'minProperties':
      return `${subject} needs at least ${plural(params.limit, 'entry')}.`
    case 'uniqueItems':
      return `${subject} lists the same item twice, at ${params.j} and ${params.i}.`
    case 'additionalProperties':
      return `${subject} has "${params.additionalProperty}", which ${schemaName} does not allow.`
    case 'propertyNames':
      return `${subject} has the key ${JSON.stringify(params.propertyName)}, which ${schemaName} does not allow as a name.`
    default:
      return `${subject} does not fit ${schemaName} (${keyword}).`
  }
}

// A failed `if`/`then`/`else` or `not` is a rule tim also checks by hand,
// with a message that says what to do; reporting the bare keyword too would
// say the same thing twice, less clearly.
const EXPLAINED_ELSEWHERE = new Set(['if', 'not'])

/**
 * Every way a value departs from a JSON Schema, as one plain sentence each,
 * naming the file and where in it. An array item with an `id` is named by
 * its id, such as `claims[vol-012].kind`, so the sentence points at the
 * item a person would search for.
 *
 * @param {object} args
 * @param {string} args.label - The file, as the reader knows it, such as `distil/extract/repo-tests.json`
 * @param {unknown} args.value - The parsed file
 * @param {object} args.schema
 * @param {string} args.schemaName - The schema's file name, such as `extract.schema.json`
 * @returns {string[]} Empty when the value fits
 */
export const schemaProblems = ({ label, value, schema, schemaName }) =>
  validateJson(schema, value)
    .filter((error) => !EXPLAINED_ELSEWHERE.has(error.keyword))
    .map((error) => {
      const { location, actual } = locate(value, error.path)
      const subject = location ? `${label} ${location}` : label
      return describeError({ subject, actual, error, schemaName })
    })
