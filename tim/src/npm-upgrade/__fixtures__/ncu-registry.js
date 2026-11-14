import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import nock from 'nock'

const registry = 'http://registry.test'

const packumentOf = (name, versions) => ({
  name,
  'dist-tags': { latest: versions.at(-1) },
  versions: Object.fromEntries(
    versions.map((version) => [version, { name, version }])
  ),
  time: Object.fromEntries(
    versions.map((version) => [version, '2025-01-01T00:00:00.000Z'])
  )
})

/**
 * Answer npm registry reads for `name` with the given versions, oldest
 * first; the last one is the latest.
 *
 * @param {string} name
 * @param {string[]} versions
 */
export const serveRegistryPackage = (name, versions) =>
  nock(registry)
    .persist()
    .get(`/${name}`)
    .reply(200, packumentOf(name, versions))

/**
 * Write a package.json with these dependencies into `folder`, beside an
 * `.npmrc` that points npm at the served registry.
 *
 * @param {string} folder
 * @param {Record<string, string>} dependencies
 * @returns {string} The folder
 */
export const writeRegistryRepo = (folder, dependencies) => {
  mkdirSync(folder, { recursive: true })
  writeFileSync(
    join(folder, 'package.json'),
    `${JSON.stringify({ name: 'fixture', dependencies }, null, 2)}\n`
  )
  writeFileSync(join(folder, '.npmrc'), `registry=${registry}/\n`)
  return folder
}

export const blockRealNetwork = () => nock.disableNetConnect()

export const restoreRealNetwork = () => {
  nock.cleanAll()
  nock.enableNetConnect()
}
