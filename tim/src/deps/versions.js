import { TimError } from '../errors.js'
import { exactPackageName, holdEcosystemOf } from './dependency-sets.js'

/**
 * Every published version of a package: from the npm registry for an npm
 * name, from Maven Central for a `groupId:artifactId`.
 *
 * @param {string} packageName
 * @param {object} registries
 * @param {{publishedVersions: (name: string) => Promise<string[]>}} registries.npm - From `createNpmRegistryClient`
 * @param {{publishedVersions: (coordinate: string) => Promise<string[]>}} registries.maven - From `createMavenCentralClient`
 * @returns {Promise<{package: string, ecosystem: 'npm'|'maven', versions: string[]}>}
 * @throws {TimError} USAGE when the name is neither an npm package name nor a groupId:artifactId
 */
export const publishedVersionsOf = async (packageName, registries) => {
  if (!exactPackageName.safeParse(packageName).success) {
    throw new TimError(
      'USAGE',
      `Give an npm package name, such as govuk-frontend, or a Maven groupId:artifactId, such as org.springdoc:springdoc-openapi-starter-webmvc-ui. "${packageName}" is neither.`
    )
  }
  const ecosystem = holdEcosystemOf(packageName)
  return {
    package: packageName,
    ecosystem,
    versions: await registries[ecosystem].publishedVersions(packageName)
  }
}
