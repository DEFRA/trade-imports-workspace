import { TimError } from '../errors.js'

const DEFAULT_REPOSITORY = 'https://repo1.maven.org/maven2'

const mapStatus = (status, action) => {
  if (status === 401 || status === 403) {
    return new TimError(
      'AUTH',
      `${action}: Maven Central refused the request. Check the address in MAVEN_CENTRAL_URL.`
    )
  }
  if (status === 404) {
    return new TimError(
      'NOT_FOUND',
      `${action}: Maven Central has no such groupId:artifactId.`
    )
  }
  if (status === 429) {
    return new TimError('RATE_LIMIT', `${action}: Maven Central is busy.`)
  }
  if (status >= 400) {
    return new TimError(
      'NETWORK',
      `${action}: Maven Central returned ${status}.`
    )
  }
  return null
}

const metadataPathOf = (coordinate) => {
  const [groupId, artifactId] = coordinate.split(':')
  return `${groupId.replaceAll('.', '/')}/${artifactId}/maven-metadata.xml`
}

const versionsIn = (metadata) =>
  [...metadata.matchAll(/<version>\s*([^<\s]+)\s*<\/version>/g)].map(
    ([, version]) => version
  )

/**
 * Create a Maven Central client. The repository is `MAVEN_CENTRAL_URL`
 * when set, else Maven Central itself.
 *
 * @param {object} [opts]
 * @param {string} [opts.repository]
 * @returns {{publishedVersions: (coordinate: string) => Promise<string[]>}}
 */
export const createMavenCentralClient = ({
  repository = process.env.MAVEN_CENTRAL_URL || DEFAULT_REPOSITORY
} = {}) => {
  const root = repository.replace(/\/+$/, '')

  return {
    /**
     * Every version of a `groupId:artifactId` its `maven-metadata.xml`
     * lists, prereleases included, oldest first as Maven Central orders
     * them.
     *
     * @param {string} coordinate
     * @returns {Promise<string[]>}
     * @throws {TimError} PARSE when the metadata lists no versions
     */
    publishedVersions: async (coordinate) => {
      const action = `publishedVersions(${coordinate})`
      let response
      try {
        response = await fetch(`${root}/${metadataPathOf(coordinate)}`)
      } catch (error) {
        throw new TimError('NETWORK', `${action}: ${error.message}`, error)
      }
      const mapped = mapStatus(response.status, action)
      if (mapped) throw mapped
      const versions = versionsIn(await response.text())
      if (versions.length === 0) {
        throw new TimError(
          'PARSE',
          `${action}: the maven-metadata.xml lists no versions.`
        )
      }
      return versions
    }
  }
}
