import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCliWorkspace } from './tim-cli.js'

export const CHECKOUT_WORKSPACE_ROOT = fileURLToPath(
  new URL('../../../', import.meta.url)
)

const FIXTURE_PATH = fileURLToPath(
  new URL('../deps/fixtures/dependency-sets.json', import.meta.url)
)

export const fixtureDependencySets = () =>
  JSON.parse(readFileSync(FIXTURE_PATH, 'utf8'))

const REPOS_JSON = {
  reposDir: 'repos',
  githubOrg: 'DEFRA',
  repos: [
    { name: 'trade-imports-animals-frontend', npmUpgradeDefault: true },
    { name: 'trade-imports-animals-backend', npmUpgradeDefault: false },
    { name: 'trade-imports-plants-prototype', npmUpgradeDefault: false }
  ]
}

/**
 * A temporary workspace holding dependency sets (the fixture unless given),
 * a small `repos.json` and a clone folder for each repo named in `cloned`.
 *
 * @param {object} [options]
 * @param {object} [options.dependencySets]
 * @param {string[]} [options.cloned]
 * @returns {string} The workspace root
 */
export const createDepsWorkspace = ({
  dependencySets = fixtureDependencySets(),
  cloned = ['trade-imports-animals-frontend']
} = {}) => {
  const root = createCliWorkspace('tim-deps-')
  mkdirSync(join(root, 'config'))
  writeFileSync(
    join(root, 'config', 'dependency-sets.json'),
    JSON.stringify(dependencySets)
  )
  writeFileSync(join(root, 'repos.json'), JSON.stringify(REPOS_JSON))
  for (const repo of cloned) mkdirSync(join(root, 'repos', repo))
  return root
}
