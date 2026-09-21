import { TimError } from '../../errors.js'
import { parityV1 } from '../../parity/profile-v1.js'
import { requirementsV2 } from './requirements-v2.js'
import { requirementsV2Increments } from './requirements-v2-increments.js'

/**
 * Every hook a definition may leave undeclared, because most profiles and
 * most collections have nothing to say about it. Spread under each
 * returned definition, so an old caller that reads any of these hooks
 * always finds one, and a definition that does have something to say
 * simply overrides it.
 */
const DEFAULT_HOOKS = {
  expandItems: ({ items }) => items,
  referenceTables: () => ({}),
  cycleEdges: () => [],
  checkRows: () => {},
  regroupField: null
}

const withDefaults = (definition) => ({ ...DEFAULT_HOOKS, ...definition })

const PROFILES = {
  [parityV1.key]: {
    default: 'findings',
    collections: { findings: withDefaults(parityV1) }
  },
  [requirementsV2.key]: {
    default: 'atoms',
    collections: {
      atoms: withDefaults(requirementsV2),
      increments: withDefaults(requirementsV2Increments)
    }
  }
}

/** Every profile key the writer core knows how to ingest. */
export const PROFILE_KEYS = Object.keys(PROFILES)

/** The profile a programme gets when its registry entry names none. */
export const DEFAULT_PROFILE_KEY = parityV1.key

const profileEntry = (key) =>
  Object.hasOwn(PROFILES, key) ? PROFILES[key] : null

/**
 * Every collection key a profile declares, for an unknown-collection
 * refusal message.
 *
 * @param {string} key
 * @returns {string[]}
 */
export const collectionKeysFor = (key) =>
  Object.keys(profileEntry(key)?.collections ?? {})

/**
 * The collection definition for a profile key.
 *
 * @param {string} [key] - Defaults to `parity-v1`, which is what every
 *   corpus written before profiles existed gets
 * @param {string} [collection] - Defaults to the profile's own default
 *   collection, which is byte-for-byte what this returned for both keys
 *   before collections existed
 * @returns {object}
 * @throws {TimError} USAGE, naming the known profiles or the profile's
 *   known collections
 */
export const profileFor = (key = DEFAULT_PROFILE_KEY, collection) => {
  const profile = profileEntry(key)
  if (!profile) {
    throw new TimError(
      'USAGE',
      `Unknown profile "${key}". Known profiles: ${PROFILE_KEYS.join(', ')}.`
    )
  }
  const collectionKey = collection ?? profile.default
  const definition = Object.hasOwn(profile.collections, collectionKey)
    ? profile.collections[collectionKey]
    : null
  if (!definition) {
    throw new TimError(
      'USAGE',
      `"${key}" has no "${collectionKey}" collection. It has: ${Object.keys(profile.collections).join(', ')}.`
    )
  }
  return definition
}
