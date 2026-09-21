import { TimError } from '../../errors.js'
import { parityV1 } from '../../parity/profile-v1.js'
import { requirementsV2 } from './requirements-v2.js'

const DEFINITIONS = {
  [parityV1.key]: parityV1,
  [requirementsV2.key]: requirementsV2
}

/** Every profile key the writer core knows how to ingest. */
export const PROFILE_KEYS = Object.keys(DEFINITIONS)

/** The profile a programme gets when its registry entry names none. */
export const DEFAULT_PROFILE_KEY = parityV1.key

/**
 * The profile definition for a key.
 *
 * @param {string} [key] - Defaults to `parity-v1`, which is what every
 *   corpus written before profiles existed gets
 * @returns {object}
 * @throws {TimError} USAGE, naming the known profiles
 */
export const profileFor = (key = DEFAULT_PROFILE_KEY) => {
  const definition = Object.hasOwn(DEFINITIONS, key) ? DEFINITIONS[key] : null
  if (!definition) {
    throw new TimError(
      'USAGE',
      `Unknown profile "${key}". Known profiles: ${PROFILE_KEYS.join(', ')}.`
    )
  }
  return definition
}
