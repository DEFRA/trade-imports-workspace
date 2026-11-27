import { createMavenCentralClient } from '../../clients/maven-central-client.js'
import { createNpmRegistryClient } from '../../clients/npm-registry-client.js'
import { publishedVersionsOf } from '../../deps/versions.js'
import { makeRunAction } from '../_run-action.js'

/**
 * The plain-text report of `tim deps versions`: one version a line.
 *
 * @param {{versions: string[]}} result
 * @returns {string}
 */
export const renderVersionsText = ({ versions }) => versions.join('\n')

export const register = (program, { timVersion }) => {
  program
    .command('versions <package>')
    .description(
      "List every published version of a package: an npm package from the npm registry, or a Maven groupId:artifactId from Maven Central's maven-metadata.xml."
    )
    .addHelpText(
      'after',
      '\nVersions print one a line, prereleases included, in the order the registry gives them. npm versions come from npm_config_registry when set, else the public npm registry. Maven versions come from MAVEN_CENTRAL_URL when set, else https://repo1.maven.org/maven2.\n' +
        '\nExamples:\n' +
        '  tim deps versions @axe-core/playwright\n' +
        '  tim deps versions org.springdoc:springdoc-openapi-starter-webmvc-ui\n' +
        '  tim deps versions org.springframework.boot:spring-boot-starter-parent --json'
    )
    .action(
      makeRunAction({
        run: ({ args: [packageName] }) =>
          publishedVersionsOf(packageName, {
            npm: createNpmRegistryClient(),
            maven: createMavenCentralClient()
          }),
        renderText: renderVersionsText,
        timVersion
      })
    )
}
