import { TimError } from '../errors.js'

const PUBLIC_REGISTRY = 'https://registry.npmjs.org'
const EIGHT_SECONDS_MS = 8_000

const refusalFor = (status, action) => {
  if (status === 401 || status === 403) {
    return new TimError('AUTH', `${action}: the server refused the request.`)
  }
  if (status === 404) {
    return new TimError('NOT_FOUND', `${action}: there is no such file.`)
  }
  if (status === 429) {
    return new TimError('RATE_LIMIT', `${action}: the server is busy.`)
  }
  return new TimError('NETWORK', `${action}: the server returned ${status}.`)
}

/**
 * Create a client that reads where a package's changelog lives: its public
 * npm registry record, and plain files on raw.githubusercontent.com. Both
 * are unauthenticated downloads that give up after 8 seconds.
 *
 * @param {object} [opts]
 * @param {string} [opts.registry] - Defaults to the public npm registry
 * @param {number} [opts.timeoutMs]
 * @returns {{packageRecord: (name: string) => Promise<object>, downloadText: (url: string) => Promise<string>}}
 */
export const createChangelogSourceClient = ({
  registry = PUBLIC_REGISTRY,
  timeoutMs = EIGHT_SECONDS_MS
} = {}) => {
  const download = async (url, action) => {
    let response
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) })
    } catch (error) {
      throw new TimError('NETWORK', `${action}: ${error.message}`, error)
    }
    if (!response.ok) throw refusalFor(response.status, action)
    return response.text()
  }

  return {
    /**
     * @param {string} name - Scoped names keep their `/`
     * @returns {Promise<object>} The package's registry record
     * @throws {TimError} NOT_FOUND for an unknown package; PARSE for a record that is not JSON
     */
    packageRecord: async (name) => {
      const action = `Cannot read ${name} from the npm registry`
      const text = await download(`${registry}/${name}`, action)
      try {
        return JSON.parse(text)
      } catch (error) {
        throw new TimError('PARSE', `${action}: it is not JSON.`, error)
      }
    },

    /**
     * @param {string} url
     * @returns {Promise<string>} The file's text
     * @throws {TimError} NOT_FOUND for a missing file; NETWORK when the download fails
     */
    downloadText: (url) => download(url, `Cannot download ${url}`)
  }
}
