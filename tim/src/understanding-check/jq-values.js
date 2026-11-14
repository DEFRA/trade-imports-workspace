import { TimError } from '../errors.js'

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

/**
 * A value as jq's `\(…)` string interpolation prints it: a string as it
 * is, anything else as compact JSON.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const interpolated = (value) =>
  typeof value === 'string' ? value : JSON.stringify(value ?? null)

/**
 * A value as `$(jq -r …)` hands it to the shell: a string as it is,
 * anything else as indented JSON, without its trailing newlines.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const rawOutput = (value) =>
  (typeof value === 'string'
    ? value
    : JSON.stringify(value ?? null, null, 2)
  ).replace(/\n+$/, '')

/**
 * jq's `value // fallback`: the fallback when the value is missing, null
 * or false.
 *
 * @param {unknown} value
 * @param {unknown} fallback
 * @returns {unknown}
 */
export const alternative = (value, fallback) =>
  value === undefined || value === null || value === false ? fallback : value

/**
 * jq's `.key` on a value: null for a missing key or a null value.
 *
 * @param {unknown} value
 * @param {string} key
 * @returns {unknown}
 * @throws {TimError} PARSE when the value is neither null nor an object
 */
export const field = (value, key) => {
  if (value === undefined || value === null) return null
  if (!isPlainObject(value)) {
    throw new TimError(
      'PARSE',
      `Error: cannot read ${key} from ${JSON.stringify(value)}`
    )
  }
  return value[key] ?? null
}

/**
 * jq's `length`.
 *
 * @param {unknown} value
 * @returns {number}
 * @throws {TimError} PARSE for true or false, which have no length
 */
export const jqLength = (value) => {
  if (value === undefined || value === null) return 0
  if (Array.isArray(value)) return value.length
  if (isPlainObject(value)) return Object.keys(value).length
  if (typeof value === 'number') return Math.abs(value)
  if (typeof value === 'string') return [...value].length
  throw new TimError('PARSE', `Error: ${JSON.stringify(value)} has no length`)
}

/**
 * jq's `.[]` on an array.
 *
 * @param {unknown} value
 * @param {string} label - What the value is, for the refusal
 * @returns {unknown[]}
 * @throws {TimError} PARSE when the value is not an array
 */
export const elements = (value, label) => {
  if (!Array.isArray(value)) {
    throw new TimError('PARSE', `Error: ${label} is not a list`)
  }
  return value
}

/**
 * jq's `.[]?`: an array's elements, an object's values, or nothing.
 *
 * @param {unknown} value
 * @returns {unknown[]}
 */
export const optionalElements = (value) => {
  if (Array.isArray(value)) return value
  if (isPlainObject(value)) return Object.values(value)
  return []
}

const joinPart = (value) => {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  throw new TimError(
    'PARSE',
    `Error: cannot join ${JSON.stringify(value)} into text`
  )
}

/**
 * jq's `join(separator)` on an array: null as empty, numbers and booleans
 * as their text.
 *
 * @param {unknown} value
 * @param {string} separator
 * @param {string} label - What the value is, for the refusal
 * @returns {string}
 * @throws {TimError} PARSE when the value is not an array or holds an object
 */
export const joined = (value, separator, label) =>
  elements(value, label).map(joinPart).join(separator)

const TYPE_ORDER = [
  'null',
  'false',
  'true',
  'number',
  'string',
  'array',
  'object'
]

const typeRank = (value) => {
  if (value === null) return TYPE_ORDER.indexOf('null')
  if (value === false) return TYPE_ORDER.indexOf('false')
  if (value === true) return TYPE_ORDER.indexOf('true')
  if (Array.isArray(value)) return TYPE_ORDER.indexOf('array')
  return TYPE_ORDER.indexOf(typeof value)
}

const compareByCodePoint = (left, right) => {
  const leftPoints = [...left]
  const rightPoints = [...right]
  const shared = Math.min(leftPoints.length, rightPoints.length)
  for (let index = 0; index < shared; index += 1) {
    const difference =
      leftPoints[index].codePointAt(0) - rightPoints[index].codePointAt(0)
    if (difference !== 0) return difference
  }
  return leftPoints.length - rightPoints.length
}

/**
 * Orders two values as jq's `sort` does: by type (null, false, true,
 * number, string, array, object), then by value, strings by code point.
 *
 * @param {unknown} left
 * @param {unknown} right
 * @returns {number} Negative, zero or positive, as `Array.prototype.sort` takes
 */
export const compareJq = (left, right) => {
  const rankDifference = typeRank(left) - typeRank(right)
  if (rankDifference !== 0) return rankDifference
  if (typeof left === 'number') return left - right
  if (typeof left === 'string') return compareByCodePoint(left, right)
  return compareByCodePoint(JSON.stringify(left), JSON.stringify(right))
}

/**
 * jq's `unique`: sorted in jq's order with duplicates dropped.
 *
 * @param {unknown[]} values
 * @returns {unknown[]}
 */
export const uniqueSorted = (values) =>
  [...values]
    .sort(compareJq)
    .filter(
      (value, index, sorted) =>
        index === 0 || compareJq(sorted[index - 1], value) !== 0
    )
