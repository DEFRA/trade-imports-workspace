import {
  chmodSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { stageBashWorkspace } from '../../test-support/bash-golden-harness.js'

export const SCRIPT_FOR = {
  discover: 'tools/npm/discover-upgrades.sh',
  'best-practices': 'tools/npm/bake-best-practices.sh',
  prebake: 'tools/npm/prebake-context.sh'
}

/** The script discover-upgrades.sh runs to write the packages file. */
export const HELPER_SCRIPTS = ['tools/npm/packages-init.sh']

export const RUN_ID = 'EUDPA-600'
export const REPO = 'trade-imports-animals-frontend'
export const NO_SRC_REPO = 'trade-imports-animals-admin'
export const NCU_VERSION = '23.1.1'
export const RUN_FOLDER = `workareas/npm-upgrades/${RUN_ID}`

/**
 * What the Bash scripts did on every case, as the golden test recorded it.
 *
 * @returns {Record<string, object[]>} Runs by tim command name
 */
export const readDiscoverGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/npm-discover-scripts.json', import.meta.url),
      'utf8'
    )
  )

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const packageJson = {
  name: 'trade-imports-animals-frontend',
  dependencies: {
    '@hapi/hapi': '^21.3.0',
    lodash: '~4.17.20',
    pino: '8.0.0',
    'hapi-pino': '12.0.0'
  },
  devDependencies: {
    eslint: '^8.57.0',
    vitest: '>=1.2.0'
  }
}

/** What npm-check-updates prints with --jsonUpgraded for the fixture repo. */
export const NCU_UPGRADES = {
  '@hapi/hapi': '^21.4.0',
  lodash: '~4.17.21',
  pino: '9.0.0',
  eslint: '^9.1.0',
  vitest: '>=1.3.0',
  ghost: '^2.0.0'
}

const row = (pkg, current, target, upgradeType, fields = {}) => ({
  package: pkg,
  current,
  target,
  upgrade_type: upgradeType,
  dependency_type: 'dependencies',
  classification: null,
  risk: null,
  safe_for_automation: null,
  rationale: null,
  files_affected: null,
  changes_required_summary: null,
  changelog_url: null,
  migration_guide_url: null,
  implementation_status: null,
  failure_reason: null,
  commit_sha: null,
  completed_at: null,
  demoted_from_auto: false,
  context_baked: null,
  context_missing: [],
  ...fields
})

/** A packages file from an earlier discovery, with work already done. */
const priorState = {
  ticket: RUN_ID,
  repo: REPO,
  discovered_at: '2026-05-26T12:00:00Z',
  strategy: 'latest',
  ncu_version: '16.14.20',
  packages: [
    row('lodash', '4.17.20', '4.17.21', 'patch', {
      classification: 'auto',
      risk: 'LOW',
      safe_for_automation: true,
      rationale: 'Patch fix only',
      implementation_status: 'done',
      commit_sha: 'abc1234',
      completed_at: '2026-05-27T10:00:00Z',
      context_baked: 'partial',
      context_missing: ['migration_guide']
    }),
    {
      package: 'eslint',
      current: '8.57.0',
      target: '9.0.0',
      upgrade_type: 'major',
      classification: 'manual',
      risk: 'HIGH'
    },
    row('left-pad', '1.0.0', '1.3.0', 'minor', { classification: 'auto' })
  ]
}

/** The packages file prebake reads: one row per changelog source case. */
const prebakeState = {
  ticket: RUN_ID,
  repo: REPO,
  discovered_at: '2026-05-26T12:00:00Z',
  strategy: 'latest',
  ncu_version: NCU_VERSION,
  packages: [
    row('@hapi/hapi', '21.3.0', '21.4.0', 'minor'),
    row('lodash', '4.17.20', '4.17.21', 'patch', {
      classification: 'auto',
      context_baked: true
    }),
    row('pino', '8.0.0', '9.0.0', 'major'),
    row('eslint', '8.57.0', '9.1.0', 'major', {
      dependency_type: 'devDependencies'
    }),
    { package: 'bare', current: null, target: '2.0.0' }
  ]
}

const noSrcState = {
  ...prebakeState,
  repo: NO_SRC_REPO,
  packages: [row('eslint', '8.57.0', '9.1.0', 'major')]
}

const sourceFiles = {
  [`repos/${REPO}/src/server/index.js`]: [
    "import Hapi from '@hapi/hapi'",
    "import fp from 'lodash/fp'",
    "import lodashy from 'lodashy'",
    'export const start = () => Hapi.server()',
    ''
  ].join('\n'),
  [`repos/${REPO}/src/server/logging/logger.js`]: [
    'const pino = require("pino")',
    "const _ = require('lodash')",
    'module.exports = pino'
  ].join('\n'),
  [`repos/${REPO}/src/config.js`]: "import { merge } from 'lodash'\r\n",
  [`repos/${REPO}/src/a.cjs`]: "require('@hapi/hapi/lib/core')\n"
}

const bestPracticeFiles = {
  'docs/best-practices/node/hapi.md': '# Hapi\n\nUse plugins.\n',
  'docs/best-practices/node/govuk-frontend.md':
    '# GOV.UK Frontend\n\nNo trailing newline',
  'docs/best-practices/node/testing/frontend.md': '# Frontend tests\n',
  'docs/best-practices/node/testing/backend.md': '# Backend tests\n\n',
  'docs/best-practices/node/testing/notes.txt': 'Not markdown\n',
  'docs/best-practices/node/testing/nested/deep.md': '# Too deep\n',
  'docs/best-practices/node/code-style.md': '# Style, not baked\n'
}

const baseFiles = {
  'repos.json': '{ "reposDir": "repos", "githubOrg": "DEFRA", "repos": [] }\n',
  'docs/best-practices/README.md': '# Best practices\n',
  [`repos/${REPO}/package.json`]: jsonText(packageJson),
  [`repos/${REPO}/service/package.json`]: jsonText(packageJson),
  [`repos/${NO_SRC_REPO}/package.json`]: jsonText({ name: NO_SRC_REPO }),
  'repos/no-manifest/README.md': '# No package.json\n',
  ...sourceFiles,
  ...bestPracticeFiles
}

const fixtureFiles = {
  discover: (withPrior) =>
    withPrior
      ? {
          [`${RUN_FOLDER}/${REPO}/packages.${REPO}.json`]: jsonText(priorState)
        }
      : {},
  'best-practices': (withPrior) =>
    withPrior
      ? { [`${RUN_FOLDER}/${REPO}/best-practices.md`]: 'Stale bundle\n' }
      : {},
  prebake: () => ({
    [`${RUN_FOLDER}/${REPO}/packages.${REPO}.json`]: jsonText(prebakeState),
    [`${RUN_FOLDER}/${NO_SRC_REPO}/packages.${NO_SRC_REPO}.json`]:
      jsonText(noSrcState)
  })
}

/**
 * A workspace holding the fixture repos, the best-practice docs and, for
 * a command that reads it, an npm upgrade run.
 *
 * @param {object} opts
 * @param {string} opts.command - A key of {@link SCRIPT_FOR}
 * @param {boolean} [opts.withPrior=false] - Stage what an earlier run left
 * @param {boolean} [opts.withoutDocs=false] - Leave the Node best-practice guides out
 * @param {string[]} [opts.scripts]
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stageDiscoverWorkspace = ({
  command,
  withPrior = false,
  withoutDocs = false,
  scripts = []
}) => {
  const files = { ...baseFiles, ...fixtureFiles[command](withPrior) }
  if (withoutDocs) {
    for (const path of Object.keys(bestPracticeFiles)) delete files[path]
  }
  return stageBashWorkspace({ scripts, files })
}

/** A changelog body with blank lines at its end, which the Bash drops. */
export const HAPI_CHANGELOG = '## 21.4.0\n\n- Faster routes\n\n\n'
export const LODASH_HISTORY = '# History\n\n4.17.21 fixes things'

/**
 * Every URL the changelog lookup answers, with its body. Any other URL is
 * a 404.
 */
export const RESPONSES = {
  'https://registry.npmjs.org/@hapi/hapi': JSON.stringify({
    name: '@hapi/hapi',
    repository: { type: 'git', url: 'git+https://github.com/hapijs/hapi.git' }
  }),
  'https://raw.githubusercontent.com/hapijs/hapi/main/CHANGELOG.md':
    HAPI_CHANGELOG,
  'https://registry.npmjs.org/lodash': JSON.stringify({
    name: 'lodash',
    repository: { url: 'git+ssh://git@github.com/lodash/lodash.git' }
  }),
  'https://raw.githubusercontent.com/lodash/lodash/master/HISTORY.md':
    LODASH_HISTORY,
  'https://registry.npmjs.org/pino': JSON.stringify({
    name: 'pino',
    repository: 'https://gitlab.com/pino/pino'
  }),
  'https://registry.npmjs.org/bare': JSON.stringify({
    name: 'bare',
    repository: { url: 'git://github.com/bare/bare.git' }
  })
}

const shellQuoted = (text) => `'${text.replaceAll("'", "'\\''")}'`

/**
 * A folder holding stand-ins for the commands the Bash runs: `ncu`, which
 * prints `upgrades` (or its version), and `curl`, which prints each body in
 * {@link RESPONSES} and fails on every other URL as `curl -f` does on a 404.
 *
 * @param {object} [opts]
 * @param {object} [opts.upgrades] - What `ncu --jsonUpgraded` prints
 * @returns {{bin: string, remove: () => void}}
 */
export const stageFakeCommands = ({ upgrades = NCU_UPGRADES } = {}) => {
  const bin = mkdtempSync(join(tmpdir(), 'tim-npm-fake-bin-'))
  const bodies = Object.entries(RESPONSES).map(([url, body], index) => {
    const path = join(bin, `body-${index}`)
    writeFileSync(path, body)
    return `  ${shellQuoted(url)}) cat ${shellQuoted(path)} ;;`
  })
  const commands = {
    ncu: [
      '#!/bin/sh',
      `if [ "$1" = "--version" ]; then echo ${NCU_VERSION}; exit 0; fi`,
      `printf '%s\\n' ${shellQuoted(JSON.stringify(upgrades, null, 2))}`
    ],
    curl: [
      '#!/bin/sh',
      'for arg; do url="$arg"; done',
      'case "$url" in',
      ...bodies,
      '  *) exit 22 ;;',
      'esac'
    ]
  }
  for (const [name, lines] of Object.entries(commands)) {
    const path = join(bin, name)
    writeFileSync(path, `${lines.join('\n')}\n`)
    chmodSync(path, 0o755)
  }
  return { bin, remove: () => rmSync(bin, { recursive: true, force: true }) }
}

const run = (...args) => ['--run-id', RUN_ID, ...args]
const repoPath = (name = REPO) => `<ROOT>/repos/${name}`

/**
 * Each case runs on a fresh workspace from {@link stageDiscoverWorkspace}.
 * `<ROOT>` in an argument is the staged workspace root. `upgrades` is what
 * ncu reports, `withPrior` stages what an earlier run left and
 * `withoutDocs` leaves the best-practice docs out.
 */
export const cases = {
  discover: [
    { name: 'first run', args: [repoPath(), ...run()] },
    { name: 'first run as JSON', args: [repoPath(), ...run('--json')] },
    {
      name: 'a re-run keeps earlier work',
      args: [repoPath(), ...run('--strategy', 'minor')],
      withPrior: true
    },
    {
      name: 'a forced re-run still keeps earlier work',
      args: [repoPath(), ...run('--force')],
      withPrior: true
    },
    {
      name: 'nothing outdated',
      args: [repoPath(), ...run('--strategy', 'patch')],
      upgrades: {}
    },
    {
      name: 'a service folder is named for its parent',
      args: [`${repoPath()}/service`, ...run()]
    },
    {
      name: 'a run id that is not a ticket',
      args: [repoPath(), '--run-id', 'run-1']
    },
    { name: 'no run id', args: [repoPath()] },
    { name: 'no run id as JSON', args: [repoPath(), '--json'] },
    { name: 'no repo path', args: run() },
    {
      name: 'an unknown strategy',
      args: [repoPath(), ...run('--strategy', 'major')]
    },
    {
      name: 'an unknown strategy as JSON',
      args: [repoPath(), ...run('--strategy', 'major', '--json')]
    },
    { name: 'a missing repo', args: [repoPath('missing'), ...run()] },
    {
      name: 'a repo with no package.json',
      args: [repoPath('no-manifest'), ...run()]
    }
  ],
  'best-practices': [
    { name: 'every doc', args: run('--repo', REPO) },
    {
      name: 'replaces an earlier bundle',
      args: run('--repo', REPO),
      withPrior: true
    },
    { name: 'no docs', args: run('--repo', REPO), withoutDocs: true },
    { name: 'no repo', args: run() },
    { name: 'no run id', args: ['--repo', REPO] }
  ],
  prebake: [
    {
      name: 'a changelog on main and usages',
      args: run('--repo', REPO, '--package', '@hapi/hapi')
    },
    {
      name: 'a history file on master',
      args: run('--repo', REPO, '--package', 'lodash')
    },
    {
      name: 'a repository away from GitHub',
      args: run('--repo', REPO, '--package', 'pino')
    },
    {
      name: 'a package the registry does not have, with no usages',
      args: run('--repo', REPO, '--package', 'eslint')
    },
    {
      name: 'a row with a null version and a git URL',
      args: run('--repo', REPO, '--package', 'bare')
    },
    {
      name: 'a repo with no src folder',
      args: run('--repo', NO_SRC_REPO, '--package', 'eslint')
    },
    {
      name: 'a package the run does not list',
      args: run('--repo', REPO, '--package', 'react')
    },
    {
      name: 'a repo the run does not have',
      args: run('--repo', 'trade-imports-stub', '--package', 'react')
    },
    { name: 'no package', args: run('--repo', REPO) }
  ]
}

/**
 * @param {string[]} args - A case's arguments
 * @param {string} root - The staged workspace root
 * @returns {string[]} The arguments with `<ROOT>` filled in
 */
export const argsIn = (args, root) =>
  args.map((arg) => arg.replace('<ROOT>', root))
