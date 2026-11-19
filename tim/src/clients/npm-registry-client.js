import { TimError } from '../errors.js'

const DEFAULT_REGISTRY = 'https://registry.npmjs.org/'

const mapStatus = (status, action) => {
  if (status === 401 || status === 403) {
    return new TimError(
      'AUTH',
      `${action}: the npm registry refused the request. Check the registry in npm_config_registry.`
    )
  }
  if (status === 404) {
    return new TimError(
      'NOT_FOUND',
      `${action}: the npm registry has no such package.`
    )
  }
  if (status === 429) {
    return new TimError('RATE_LIMIT', `${action}: the npm registry is busy.`)
  }
  if (status >= 400) {
    return new TimError(
      'NETWORK',
      `${action}: the npm registry returned ${status}.`
    )
  }
  return null
}

/**
 * Create an npm registry client. The registry is npm's own
 * `npm_config_registry` when set, else the public registry.
 *
 * @param {object} [opts]
 * @param {string} [opts.registry]
 * @returns {{latestVersion: (name: string) => Promise<string>, publishedVersions: (name: string) => Promise<string[]>}}
 */
export const createNpmRegistryClient = ({
  registry = process.env.npm_config_registry || DEFAULT_REGISTRY
} = {}) => {
  const root = registry.replace(/\/+$/, '')

  const packageDocument = async (name, action) => {
    let response
    try {
      response = await fetch(`${root}/${name.replace('/', '%2F')}`, {
        headers: { Accept: 'application/json' }
      })
    } catch (error) {
      throw new TimError('NETWORK', `${action}: ${error.message}`, error)
    }
    const mapped = mapStatus(response.status, action)
    if (mapped) throw mapped
    try {
      return await response.json()
    } catch (error) {
      throw new TimError('PARSE', `${action}: invalid JSON response.`, error)
    }
  }

  return {
    /**
     * The version the package's `latest` dist-tag points at.
     *
     * @param {string} name
     * @returns {Promise<string>}
     * @throws {TimError} NOT_FOUND when the package has no latest tag
     */
    latestVersion: async (name) => {
      const action = `latestVersion(${name})`
      const document = await packageDocument(name, action)
      const latest = document['dist-tags']?.latest
      if (!latest) {
        throw new TimError('NOT_FOUND', `${action}: no latest tag.`)
      }
      return latest
    },

    /**
     * Every version the package has published, prereleases included, in
     * the registry's order.
     *
     * @param {string} name
     * @returns {Promise<string[]>}
     */
    publishedVersions: async (name) => {
      const document = await packageDocument(name, `publishedVersions(${name})`)
      return Object.keys(document.versions ?? {})
    }
  }
}
