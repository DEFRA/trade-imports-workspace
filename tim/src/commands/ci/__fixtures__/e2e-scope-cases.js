import { readFileSync } from 'node:fs'

export const SCOPE_CONFIG_PATH = 'config/e2e-tests-pr-scope.json'

const committedScope = JSON.parse(
  readFileSync(new URL('./e2e-tests-pr-scope.json', import.meta.url), 'utf8')
)

export const scopeConfigs = {
  committed: committedScope,
  edgeEntries: {
    ...committedScope,
    'trade-imports-null-entry': null,
    'trade-imports-all-and-tags': { suites: ['all'], tags: ['@smoke'] },
    'trade-imports-all-with-another': { suites: ['all', 'tests/ins/'] },
    'trade-imports-empty-lists': { suites: [], tags: [] },
    'trade-imports-no-lists': {},
    'trade-imports-comma-strings': {
      suites: ['tests/ins/,tests/plants', '  tests/animals  '],
      tags: ['@a,@b']
    },
    'trade-imports-tags-only': { tags: ['@smoke'] },
    'trade-imports-null-suites': { suites: null, tags: ['@smoke'] }
  },
  noDefault: { 'trade-imports-ins-backend': { suites: ['tests/ins/'] } },
  missing: null
}

const SCOPE_VARIABLES = ['REPOSITORY', 'MANUAL', 'SUITES', 'TAGS']

const withOnly = (env) =>
  Object.fromEntries(SCOPE_VARIABLES.map((name) => [name, env[name]]))

const configCase = (config, repository, env = {}, label = repository) => ({
  name: `${config}: ${label}`,
  command: 'scope',
  config,
  env: withOnly({ REPOSITORY: repository, ...env })
})

const manualCase = (name, suites, tags) => ({
  name: `manual: ${name}`,
  command: 'scope',
  config: 'committed',
  env: withOnly({
    REPOSITORY: 'DEFRA/trade-imports-workspace',
    MANUAL: 'true',
    SUITES: suites,
    TAGS: tags
  })
})

const listCase = (command, variable) => (name, value) => ({
  name: `${command}: ${name}`,
  command,
  config: 'committed',
  env: withOnly({ [variable]: value })
})

const suitesCase = listCase('suites', 'SUITES')
const tagsCase = listCase('tags', 'TAGS')

export const intendedDifferences = {
  'manual: SUITES unset': {
    stderr: '::error::Set the SUITES environment variable. It can be empty.\n'
  },
  'manual: TAGS unset': {
    stderr: '::error::Set the TAGS environment variable. It can be empty.\n'
  },
  'missing: DEFRA/trade-imports-ins-backend': {
    exitCode: 1,
    stderrStartsWith: `::error::Cannot read ${SCOPE_CONFIG_PATH}: ENOENT`
  },
  'suites: a valid entry before an invalid one': { stdout: '' }
}

export const scopeCases = [
  ...Object.keys(scopeConfigs.edgeEntries).map((key) =>
    configCase('edgeEntries', `DEFRA/${key}`)
  ),
  configCase('edgeEntries', 'DEFRA/trade-imports-not-in-the-file'),
  configCase('edgeEntries', 'trade-imports-ins-frontend'),
  configCase('edgeEntries', 'DEFRA/nested/trade-imports-ins-backend'),
  configCase(
    'edgeEntries',
    'DEFRA/trade-imports-ins-backend',
    {
      MANUAL: 'false',
      SUITES: 'tests/plants/',
      TAGS: '@smoke'
    },
    'MANUAL false ignores the inputs'
  ),
  configCase(
    'edgeEntries',
    'DEFRA/trade-imports-ins-backend',
    {
      MANUAL: 'TRUE',
      SUITES: 'tests/plants/',
      TAGS: ''
    },
    'MANUAL TRUE is not true'
  ),
  configCase('noDefault', 'DEFRA/trade-imports-ins-backend'),
  configCase('noDefault', 'DEFRA/trade-imports-plants-frontend'),
  configCase('missing', 'DEFRA/trade-imports-ins-backend'),
  configCase('committed', undefined, {}, 'REPOSITORY unset'),
  manualCase('suites only, comma and space', 'tests/ins/, tests/plants', ''),
  manualCase('tags only', '', '@a, @b,@c'),
  manualCase('suites and tags', 'tests/ins/', '@smoke'),
  manualCase('neither', '', ''),
  manualCase('only spaces and commas', ' , ', ' ,'),
  manualCase('all', '  all  ', ''),
  manualCase('all with tags', 'all', '@smoke'),
  manualCase('all with another suite', 'all,tests/ins/', ''),
  manualCase('tab separated', 'tests/ins/\ttests/plants/', ''),
  manualCase('a second line', 'tests/ins/\ntests/plants/', '@a\n@b'),
  manualCase('an unchecked suite', 'tests/../etc', ''),
  manualCase('SUITES unset', undefined, ''),
  manualCase('TAGS unset', 'tests/ins/', undefined)
]

export const suitesCases = [
  suitesCase('empty', ''),
  suitesCase('a folder without its slash', 'tests/animals'),
  suitesCase('a folder with its slash', 'tests/animals/'),
  suitesCase('two domains', 'tests/animals tests/animals-admin'),
  suitesCase('a test type', 'tests/animals/e2e'),
  suitesCase('a spec file', 'tests/ins/e2e/sign-in.spec.js'),
  suitesCase('a dotted last part', 'tests/.hidden'),
  suitesCase('repeats', 'tests/a,tests/a/ tests/b,,tests/b'),
  suitesCase('tabs and newlines', 'tests/a\ttests/b\ntests/c'),
  suitesCase('only the root', 'tests/'),
  suitesCase('a parent folder', 'tests/../etc'),
  suitesCase('dots inside', 'tests/a..b'),
  suitesCase('outside tests', 'src/server'),
  suitesCase('bare tests', 'tests'),
  suitesCase('a semicolon', 'tests/a;id'),
  suitesCase('a command substitution', 'tests/a$(id)'),
  suitesCase('a quote', "tests/a'b"),
  suitesCase('a valid entry before an invalid one', 'tests/a tests/b|c'),
  suitesCase('unset', undefined)
]

export const tagsCases = [
  tagsCase('empty', ''),
  tagsCase('only separators', ' , ,'),
  tagsCase('one tag', '@ins-backend'),
  tagsCase('two tags', '@ins-backend @gateway'),
  tagsCase('repeats and commas', '@a,@b @a,,@c'),
  tagsCase('underscores and digits', '@a_1-b'),
  tagsCase('no at sign', 'smoke'),
  tagsCase('a bare at sign', '@'),
  tagsCase('an alternation', '@a|@b'),
  tagsCase('a regex', '@a.*'),
  tagsCase('a valid tag before an invalid one', '@a @b$'),
  tagsCase('unset', undefined)
]

export const allCases = [...scopeCases, ...suitesCases, ...tagsCases]

export const BASH_SCRIPT_FOR = {
  scope: 'scripts/ci/resolve-scope.sh',
  suites: 'scripts/ci/normalise-suites.sh',
  tags: 'scripts/ci/normalise-tags.sh'
}
