import { TimError } from '../errors.js'

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
