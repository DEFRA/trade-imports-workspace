import { TimError } from '../errors.js'

/**
 * @param {any} value
 * @returns {string} The JSON type name jq gives the value: null, array, object, string, number or boolean
 */
export const jsonTypeName = (value) => {
  if (value === null || value === undefined) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

/**
 * @param {any} value
 * @returns {boolean} Whether the value is a JSON object, not an array or null
 */
export const isPlainObject = (value) => jsonTypeName(value) === 'object'

/**
 * A key of a JSON value read the way jq's `.key` reads it: null for null or
 * a missing key, the value for an object, and an error for anything else.
 *
 * @param {any} value
 * @param {string} key
 * @returns {any}
 * @throws {TimError} PARSE when the value is neither null nor an object
 */
export const jqField = (value, key) => {
  if (value === null || value === undefined) return null
  if (!isPlainObject(value)) {
    throw new TimError(
      'PARSE',
      `Cannot index ${jsonTypeName(value)} with "${key}"`
    )
  }
  return value[key] ?? null
}

/**
 * A value read along a path of keys, each step as {@link jqField} reads it.
 *
 * @param {any} value
 * @param {string[]} keys
 * @returns {any}
 */
export const jqPath = (value, keys) =>
  keys.reduce((current, key) => jqField(current, key), value)

/**
 * A value as jq's `tostring` gives it: a string as it is, anything else as
 * compact JSON.
 *
 * @param {any} value
 * @returns {string}
 */
export const jqToString = (value) =>
  typeof value === 'string' ? value : JSON.stringify(value)

/**
 * A value as `jq -r` prints it, without the final newline: a string as it
 * is, anything else as JSON indented by two spaces.
 *
 * @param {any} value
 * @returns {string}
 */
export const jqRaw = (value) =>
  typeof value === 'string' ? value : JSON.stringify(value, null, 2)

/**
 * Text as a shell command substitution keeps it: every trailing newline
 * removed.
 *
 * @param {string} text
 * @returns {string}
 */
export const withoutTrailingNewlines = (text) => text.replace(/\n+$/, '')

/**
 * The items of a list answer, which must be strings.
 *
 * @param {any} value
 * @param {string} field - The answer's dotted name, for the error
 * @returns {string[]}
 * @throws {TimError} PARSE when the value is not a list of strings
 */
export const stringItems = (value, field) => {
  if (
    !Array.isArray(value) ||
    !value.every((item) => typeof item === 'string')
  ) {
    throw new TimError(
      'PARSE',
      `The ${field} answer must be a list of words in quotes, like ["one", "two"].`
    )
  }
  return value
}
