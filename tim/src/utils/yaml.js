import { loadAll, YAMLException } from 'js-yaml'

/**
 * @param {string} source
 * @returns {unknown} The one document, or `undefined` when the source holds none (empty, only whitespace or only comments)
 * @throws {YAMLException} When the YAML is invalid or holds more than one document
 */
export const loadYaml = (source) => {
  const [document, ...others] = loadAll(source)
  if (others.length > 0) {
    throw new YAMLException(
      'expected a single document in the stream, but found more'
    )
  }
  return document
}
