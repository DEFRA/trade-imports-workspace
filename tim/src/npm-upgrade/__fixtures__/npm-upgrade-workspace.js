import { execa, execaSync } from 'execa'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normaliseRecordedText,
  recordFolderFiles,
  stageBashWorkspace
} from '../../test-support/bash-golden-harness.js'

const here = dirname(fileURLToPath(import.meta.url))
const fakeToolsPath = join(here, 'fake-npm-tools.js')
const timCliPath = join(here, '..', '..', 'cli.js')

export const SCRIPT_FOR = {
  'upgrade-one': 'tools/npm/upgrade-one-package.sh',
  'run-manual': 'tools/npm/run-manual-upgrade.sh',
  'run-auto': 'tools/npm/run-automated-upgrades.sh',
  'refresh-lockfile': 'tools/npm/refresh-lockfile.sh',
  'reset-overrides': 'tools/npm/reset-overrides.sh'
}

export const RUN_ID = 'EUDPA-700'
export const REPO = 'trade-imports-animals-frontend'
export const TESTS_REPO = 'trade-imports-ins-tests'
export const RUN_FOLDER = `workareas/npm-upgrades/${RUN_ID}`

export const GIT_ENV = {
  GIT_AUTHOR_NAME: 'Fixture',
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_NAME: 'Fixture',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
  GIT_AUTHOR_DATE: '2026-11-14T12:00:00Z',
  GIT_COMMITTER_DATE: '2026-11-14T12:00:00Z',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1'
}

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

export const advisory = (ghsa, name, severity, range, title, extra = {}) => ({
  ghsa,
  package: name,
  severity,
  range,
  title,
  ...extra
})

const reportOf = (...rules) => ({
  auditReportVersion: 2,
  vulnerabilities: Object.fromEntries(
    rules.map((rule) => [
      rule.package,
      {
        name: rule.package,
        severity: rule.severity,
        isDirect: false,
        via: [
          {
            source: 1,
            name: rule.package,
            dependency: rule.package,
            title: rule.title,
            url: `https://github.com/advisories/${rule.ghsa}`,
            severity: rule.severity,
            cwe: [],
            cvss: { score: 7.5 },
            range: rule.range
          }
        ],
        effects: [],
        range: rule.range,
        nodes: [`node_modules/${rule.package}`],
        fixAvailable: false
      }
    ])
  ),
  metadata: { vulnerabilities: { total: rules.length } }
})

const BRACES = advisory(
  'GHSA-grv7-fg5c-xmjg',
  'braces',
  'high',
  '<3.0.3',
  'Uncontrolled resource consumption in braces'
)
const BASIC_FTP = advisory(
  'GHSA-c475-qrg2-pj4r',
  'basic-ftp',
  'critical',
  '<=5.0.5',
  'basic-ftp FTP command injection.'
)

const GREEN = { report: reportOf(), exit: 0 }
export const FIXABLE_RED = { report: reportOf(BRACES), exit: 1 }
const NO_FIX_RED = { report: reportOf(BASIC_FTP), exit: 1 }
const NO_FIX_ALLOWED = { report: reportOf(BASIC_FTP), exit: 0 }
const NO_REPORT = { report: 'audit-ci: registry offline', exit: 1 }

const REGISTRY = {
  braces: ['3.0.2', '3.0.3'],
  'basic-ftp': ['5.0.4', '5.0.5'],
  ws: ['8.16.0', '8.17.1'],
  'extract-zip': ['2.0.1'],
  minimatch: ['9.0.4']
}

export const OVERRIDES = {
  'brace-expansion': '^2.0.2',
  lighthouse: { '.': '12.0.0', ws: '^8.17.1' },
  'dead-pin': '1.0.0'
}

export const OVERRIDE_RULES = [
  advisory(
    'GHSA-3h5v-q93c-6h6q',
    'ws',
    'high',
    '<8.17.1',
    'ws denial of service',
    {
      unlessOverride: 'lighthouse/ws'
    }
  ),
  advisory(
    'GHSA-8vg6-xq7m-97jq',
    'extract-zip',
    'high',
    '<2.0.2',
    'extract-zip path traversal',
    {
      unlessOverride: 'lighthouse/.',
      effects: ['puppeteer-core'],
      chain: [
        { name: 'puppeteer-core', effects: ['lighthouse'] },
        { name: 'lighthouse', effects: [] }
      ]
    }
  ),
  advisory(
    'GHSA-3ppc-4f35-3m26',
    'minimatch',
    'moderate',
    '<9.0.5',
    'minimatch ReDoS'
  )
]

const packageRow = (name, current, target, classification = 'auto') => ({
  package: name,
  current,
  target,
  upgrade_type: 'patch',
  dependency_type: 'dependencies',
  classification,
  risk: 'LOW',
  implementation_status: null,
  commit_sha: null,
  failure_reason: null
})

const repoPackageJson = (fixtureCase) => ({
  name: fixtureCase.repo ?? REPO,
  version: '1.0.0',
  scripts: fixtureCase.scripts ?? { test: 'vitest run', lint: 'eslint .' },
  dependencies: {
    lodash: fixtureCase.alreadyAtTarget ? '^4.17.21' : '^4.17.20',
    'date-fns': '^4.1.0',
    braces: '^3.0.2'
  },
  ...(fixtureCase.overrides ? { overrides: fixtureCase.overrides } : {})
})

const repoLock = (packageJson, fixtureCase) => ({
  name: packageJson.name,
  lockfileVersion: 3,
  packages: {
    '': {
      name: packageJson.name,
      dependencies: packageJson.dependencies,
      ...(fixtureCase.overrides ? { overrides: fixtureCase.overrides } : {})
    },
    'node_modules/lodash': {
      version: fixtureCase.alreadyAtTarget ? '4.17.21' : '4.17.20'
    },
    'node_modules/braces': { version: '3.0.2' },
    'node_modules/basic-ftp': { version: '5.0.5' }
  }
})

const AUDIT_CONFIG = {
  $schema: 'https://github.com/IBM/audit-ci/raw/main/docs/schema.json',
  high: true,
  'report-type': 'summary',
  allowlist: []
}

const repoFiles = (fixtureCase) => {
  const packageJson = repoPackageJson(fixtureCase)
  return {
    'package.json': jsonText(packageJson),
    'package-lock.json': jsonText(repoLock(packageJson, fixtureCase)),
    ...(fixtureCase.auditConfig === false
      ? {}
      : { 'audit-ci.jsonc': jsonText(AUDIT_CONFIG) })
  }
}

const git = (cwd, args) =>
  execaSync('git', args, { cwd, env: GIT_ENV, extendEnv: true })

const stageRepo = (root, fixtureCase) => {
  const checkout = join(root, 'repos', fixtureCase.repo ?? REPO)
  mkdirSync(checkout, { recursive: true })
  for (const [name, content] of Object.entries(repoFiles(fixtureCase))) {
    writeFileSync(join(checkout, name), content)
  }
  git(checkout, ['init', '--quiet', '-b', 'main'])
  git(checkout, ['add', '.'])
  git(checkout, ['commit', '--quiet', '-m', 'Fixture repo'])
  if (fixtureCase.hookRefuses) {
    const hook = join(checkout, '.git', 'hooks', 'pre-commit')
    writeFileSync(
      hook,
      '#!/bin/sh\necho "audit-ci: 1 high advisory"\necho "pre-commit: audit failed"\nexit 1\n'
    )
    chmodSync(hook, 0o755)
  }
  if (fixtureCase.dirty) {
    writeFileSync(
      join(checkout, 'package.json'),
      `${repoFiles(fixtureCase)['package.json']}\n`
    )
  }
}

const packagesFileOf = (fixtureCase) => ({
  ticket: RUN_ID,
  repo: fixtureCase.repo ?? REPO,
  packages: fixtureCase.packages ?? [packageRow('lodash', '4.17.20', '4.17.21')]
})

export const writeFakeBin = (home, fixtureCase) => {
  const bin = join(home, 'fake-bin')
  mkdirSync(bin, { recursive: true })
  const shim = (name, command) => {
    const path = join(bin, name)
    writeFileSync(path, `#!/bin/sh\n${command}\n`)
    chmodSync(path, 0o755)
  }
  shim('npm', `exec "${process.execPath}" "${fakeToolsPath}" npm "$@"`)
  shim('npx', `exec "${process.execPath}" "${fakeToolsPath}" npx "$@"`)
  shim(
    'tim',
    `TIM_NO_AUTO_PULL=1 exec "${process.execPath}" "${timCliPath}" "$@"`
  )
  writeFileSync(
    join(bin, 'control.json'),
    jsonText({
      queues: fixtureCase.queues ?? {},
      requires: fixtureCase.requires,
      auditRules: fixtureCase.auditRules,
      auditBroken: fixtureCase.auditBroken,
      registry: REGISTRY
    })
  )
  return bin
}

/**
 * A temporary HOME holding a workspace at the path the Bash scripts write
 * into themselves: the named scripts, a git repo under repos/, the run's
 * packages file, and fake npm, npx and tim commands on PATH.
 *
 * @param {object} fixtureCase - One of {@link cases}
 * @param {string[]} [scripts] - Workspace scripts to copy in
 * @returns {{home: string, root: string, env: Record<string, string>, remove: () => void}}
 */
export const stageUpgradeWorkspace = (fixtureCase, scripts = []) => {
  const repo = fixtureCase.repo ?? REPO
  const staged = stageBashWorkspace({
    scripts,
    files: {
      'repos.json':
        '{ "reposDir": "repos", "githubOrg": "DEFRA", "repos": [] }\n',
      'docs/best-practices/README.md': '# Best practices\n',
      ...(fixtureCase.withoutPackagesFile
        ? {}
        : {
            [`${RUN_FOLDER}/${repo}/packages.${repo}.json`]: jsonText(
              packagesFileOf(fixtureCase)
            )
          })
    }
  })
  stageRepo(staged.root, fixtureCase)
  const bin = writeFakeBin(staged.home, fixtureCase)
  return {
    ...staged,
    env: {
      ...GIT_ENV,
      PATH: `${bin}:${process.env.PATH}`,
      FAKE_BIN: bin,
      HOME: staged.home,
      NVM_DIR: join(staged.home, '.nvm')
    }
  }
}

const DAY = /\b\d{4}-\d{2}-\d{2}\b/g
const E2E_LOG = /test-docker-compose-\d{8}-\d{6}\.log/g

/**
 * Text as a recording holds it: the temporary HOME as `<HOME>`, ISO
 * timestamps as `<TIMESTAMP>`, days as `<DAY>`, and the end-of-batch E2E
 * log's timestamped name as `<E2E_LOG>`.
 *
 * @param {string} text
 * @param {string} home
 * @returns {string}
 */
export const normaliseUpgradeText = (text, home) =>
  normaliseRecordedText(text, home)
    .replace(DAY, '<DAY>')
    .replace(E2E_LOG, '<E2E_LOG>')

const fileOrNull = (path) =>
  existsSync(path) ? readFileSync(path, 'utf8') : null

const repoStateOf = (staged, repo, home) => {
  const checkout = join(staged.root, 'repos', repo)
  const gitText = (args) =>
    execaSync('git', args, { cwd: checkout, env: GIT_ENV, extendEnv: true })
      .stdout
  return Object.fromEntries(
    Object.entries({
      log: gitText(['log', '--format=%h %s%n%b']),
      status: gitText(['status', '--porcelain']),
      worktrees: gitText(['worktree', 'list']).replace(/ +/g, ' '),
      packageJson: fileOrNull(join(checkout, 'package.json')),
      packageLock: fileOrNull(join(checkout, 'package-lock.json')),
      auditConfig: fileOrNull(join(checkout, 'audit-ci.jsonc'))
    }).map(([key, value]) => [
      key,
      value === null ? null : normaliseUpgradeText(value, home)
    ])
  )
}

/**
 * What a run left behind: its exit code and output, every file under the
 * run folder and the repo's git log, status, worktrees and package files.
 *
 * @param {{home: string, root: string}} staged
 * @param {object} fixtureCase
 * @param {{exitCode: number, stdout: string, stderr: string}} result
 * @returns {object}
 */
export const recordUpgradeRun = (staged, fixtureCase, result) => {
  const files = recordFolderFiles(join(staged.root, RUN_FOLDER), staged.home)
  return {
    case: fixtureCase.name,
    input: fixtureCase.args,
    exitCode: result.exitCode,
    stdout: normaliseUpgradeText(result.stdout, staged.home),
    stderr: normaliseUpgradeText(result.stderr, staged.home),
    files: Object.fromEntries(
      Object.entries(files).map(([path, text]) => [
        path,
        normaliseUpgradeText(text, staged.home)
      ])
    ),
    repo: repoStateOf(staged, fixtureCase.repo ?? REPO, staged.home)
  }
}

/**
 * @returns {Record<string, object[]>} What the Bash scripts did on every case, by tim command
 */
export const readUpgradeGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/npm-upgrade-scripts.json', import.meta.url),
      'utf8'
    )
  )

const packageArgs = (repo = REPO, ...rest) => [
  '--run-id',
  RUN_ID,
  '--repo',
  repo,
  '--package',
  'lodash',
  ...rest
]

const OWNER = ['--allowlist-owner', 'Sam Farrington', '--expiry-days', '30']

const upgradeCases = [
  {
    name: 'a green upgrade commits and marks the package done',
    queues: { audit: [GREEN] }
  },
  { name: 'failing tests roll back', queues: { test: [0, 1, 0] } },
  {
    name: 'tests failing after the rollback are a cascade',
    queues: { test: [0, 1, 1] }
  },
  {
    name: 'failing baseline tests mark the package failed',
    queues: { test: [1] }
  },
  {
    name: 'a red baseline audit stops the repo',
    queues: { audit: [FIXABLE_RED] }
  },
  {
    name: 'a baseline audit that cannot run stops the repo',
    queues: { audit: [NO_REPORT] }
  },
  {
    name: 'a failed install marks the package failed',
    queues: { install: [1] }
  },
  {
    name: 'an advisory with a fix rolls back',
    queues: { audit: [GREEN, FIXABLE_RED] }
  },
  {
    name: 'an advisory with no fix and no owner rolls back',
    queues: { audit: [GREEN, NO_FIX_RED] }
  },
  {
    name: 'an advisory with no fix is allowlisted in the same commit',
    extraArgs: OWNER,
    queues: { audit: [GREEN, NO_FIX_RED, NO_FIX_ALLOWED] }
  },
  {
    name: 'an audit that cannot run after the install rolls back',
    queues: { audit: [GREEN, NO_REPORT] }
  },
  { name: 'a refused commit rolls back', hookRefuses: true },
  {
    name: 'a refused commit drops the allowlist entry it wrote',
    extraArgs: OWNER,
    hookRefuses: true,
    queues: { audit: [GREEN, NO_FIX_RED, NO_FIX_ALLOWED] }
  },
  {
    name: 'a package already at its target needs no commit',
    alreadyAtTarget: true
  },
  {
    name: 'the tests repo skips npm test',
    repo: TESTS_REPO,
    queues: { test: [1] }
  },
  {
    name: 'a repo with no audit config skips the audit',
    auditConfig: false,
    queues: { audit: [FIXABLE_RED] }
  }
]

const withPackageArgs = (fixtureCase) => ({
  ...fixtureCase,
  args: packageArgs(fixtureCase.repo, ...(fixtureCase.extraArgs ?? []))
})

const runArgs = (repo = REPO) => ['--run-id', RUN_ID, '--repo', repo]

/**
 * Each case runs on a fresh workspace from {@link stageUpgradeWorkspace}.
 * `queues` give the exit codes and audit reports the fake commands hand
 * out in turn; the last one repeats.
 */
export const cases = {
  'upgrade-one': [
    ...upgradeCases.map(withPackageArgs),
    { name: 'no --package', args: ['--run-id', RUN_ID, '--repo', REPO] },
    {
      name: 'a package the run does not list',
      args: ['--run-id', RUN_ID, '--repo', REPO, '--package', 'left-pad']
    },
    { name: 'no packages file', args: packageArgs(), withoutPackagesFile: true }
  ],
  'run-manual': [
    ...upgradeCases
      .filter((fixtureCase) => !fixtureCase.name.includes('cannot run after'))
      .map((fixtureCase) => ({
        ...fixtureCase,
        packages: [packageRow('lodash', '4.17.20', '4.17.21', 'manual')]
      }))
      .map(withPackageArgs),
    {
      name: 'uncommitted changes refuse the upgrade',
      args: packageArgs(),
      dirty: true
    },
    { name: 'no --run-id', args: ['--repo', REPO, '--package', 'lodash'] }
  ],
  'refresh-lockfile': [
    {
      name: 'a refreshed lockfile is committed',
      args: runArgs(),
      queues: { update: ['bump'] }
    },
    { name: 'nothing to refresh', args: runArgs() },
    {
      name: 'npm update failing rolls back',
      args: runArgs(),
      queues: { update: ['fail'] }
    },
    {
      name: 'npm update changing package.json rolls back',
      args: runArgs(),
      queues: { update: ['package-json'] }
    },
    {
      name: 'failing tests roll back',
      args: runArgs(),
      queues: { update: ['bump'], test: [1] }
    },
    {
      name: 'failing lint rolls back',
      args: runArgs(),
      queues: { update: ['bump'], lint: [1] }
    },
    {
      name: 'a red audit rolls back',
      args: runArgs(),
      queues: { update: ['bump'], audit: [FIXABLE_RED] }
    },
    {
      name: 'a refused commit rolls back',
      args: runArgs(),
      queues: { update: ['bump'] },
      hookRefuses: true
    },
    {
      name: 'the tests repo skips npm test',
      args: runArgs(TESTS_REPO),
      repo: TESTS_REPO,
      queues: { update: ['bump'], test: [1] }
    },
    {
      name: 'a repo with no scripts and no audit config',
      args: runArgs(),
      scripts: {},
      auditConfig: false,
      queues: { update: ['bump'] }
    },
    {
      name: 'uncommitted changes refuse the refresh',
      args: runArgs(),
      dirty: true
    }
  ],
  'run-auto': [
    {
      name: 'three packages, one failing, then a lockfile refresh',
      args: [REPO, '--run-id', RUN_ID],
      packages: [
        packageRow('lodash', '4.17.20', '4.17.21'),
        packageRow('date-fns', '4.1.0', '4.1.1'),
        packageRow('hapi', '21.0.0', '21.0.1'),
        packageRow('ws', '8.16.0', '9.0.0', 'manual')
      ],
      queues: { test: [0, 0, 0, 1, 0, 0, 0, 0], update: ['bump'] }
    },
    {
      name: 'a cascade stops the batch',
      args: [REPO, '--run-id', RUN_ID],
      queues: { test: [0, 1, 1] }
    },
    {
      name: 'a red baseline audit stops the batch',
      args: [REPO, '--run-id', RUN_ID],
      queues: { audit: [FIXABLE_RED] }
    },
    {
      name: 'no automatic packages still refreshes the lockfile',
      args: [REPO, '--run-id', RUN_ID],
      packages: [packageRow('ws', '8.16.0', '9.0.0', 'manual')],
      queues: { update: ['bump'] }
    },
    {
      name: 'the tests repo runs its end-of-batch E2E gate',
      args: [TESTS_REPO, '--run-id', RUN_ID],
      repo: TESTS_REPO,
      queues: { 'test:docker-compose': [1] }
    },
    {
      name: 'uncommitted changes refuse the batch',
      args: [REPO, '--run-id', RUN_ID],
      dirty: true
    },
    { name: 'no --run-id', args: [REPO] },
    {
      name: 'a run id that is not a ticket warns',
      args: [REPO, '--run-id', 'scratch'],
      withoutPackagesFile: true
    }
  ],
  'reset-overrides': [
    {
      name: 'keeps the overrides the audit and the tests need',
      args: runArgs(),
      overrides: OVERRIDES,
      auditRules: OVERRIDE_RULES,
      requires: { test: ['brace-expansion'] }
    },
    { name: 'a repo with no overrides', args: runArgs() },
    {
      name: 'every override goes when nothing needs it',
      args: runArgs(),
      overrides: OVERRIDES,
      auditRules: []
    },
    {
      name: 'an advisory no override reaches stops',
      args: runArgs(),
      overrides: OVERRIDES,
      auditRules: [
        advisory(
          'GHSA-aaaa-bbbb-cccc',
          'other',
          'high',
          '<2.0.0',
          'other advisory'
        )
      ]
    },
    {
      name: 'a check that fails with every override back stops',
      args: runArgs(),
      overrides: OVERRIDES,
      auditRules: [],
      requires: { lint: ['not-an-override'] }
    },
    {
      name: 'an audit that cannot run stops',
      args: runArgs(),
      overrides: OVERRIDES,
      auditBroken: true
    },
    {
      name: 'a refused commit stops',
      args: runArgs(),
      overrides: OVERRIDES,
      auditRules: [],
      hookRefuses: true
    },
    {
      name: 'uncommitted changes refuse the reset',
      args: runArgs(),
      overrides: OVERRIDES,
      dirty: true
    }
  ]
}

const timArgsOf = (command, fixtureCase) => [
  'npm',
  command,
  ...fixtureCase.args
]

/**
 * Runs a fixture case through the tim CLI on a fresh workspace and records
 * it in the shape the golden test recorded the Bash.
 *
 * @param {string} command - The tim npm subcommand
 * @param {object} fixtureCase
 * @returns {Promise<object>}
 */
export const replayUpgradeCase = async (command, fixtureCase) => {
  const staged = stageUpgradeWorkspace(fixtureCase)
  try {
    const result = await execa(
      process.execPath,
      [
        timCliPath,
        '--workspace',
        staged.root,
        ...timArgsOf(command, fixtureCase)
      ],
      {
        cwd: staged.root,
        env: { ...staged.env, TIM_NO_AUTO_PULL: '1', TIM_WORKSPACE: undefined },
        extendEnv: true,
        reject: false,
        stripFinalNewline: false
      }
    )
    return recordUpgradeRun(staged, fixtureCase, result)
  } finally {
    staged.remove()
  }
}

const TILDE_REPOS = '~/git/defra/trade-imports-workspace/repos/'

/**
 * The Bash's recording of a case as tim gives it: the next-step hints of
 * `run-auto` name the repo by its full path, not under `~`.
 *
 * @param {string} command
 * @param {string} caseName
 * @returns {object}
 */
export const expectedRunOf = (command, caseName) => {
  const recorded = readUpgradeGolden()[command].find(
    (run) => run.case === caseName
  )
  return {
    ...recorded,
    stdout: recorded.stdout.replaceAll(
      TILDE_REPOS,
      '<HOME>/git/defra/trade-imports-workspace/repos/'
    )
  }
}
