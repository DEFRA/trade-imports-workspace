import { execa, execaSync } from 'execa'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  recordFolderFiles,
  stageBashWorkspace
} from '../../test-support/bash-golden-harness.js'
import {
  advisory,
  FIXABLE_RED,
  GIT_ENV,
  normaliseUpgradeText,
  OVERRIDE_RULES,
  OVERRIDES,
  writeFakeBin
} from './npm-upgrade-workspace.js'

const here = dirname(fileURLToPath(import.meta.url))
const timCliPath = join(here, '..', '..', 'cli.js')
const blockPublicFetch = pathToFileURL(join(here, 'block-public-fetch.mjs'))

export const SCRIPT = 'tools/npm/start-upgrade.sh'
export const RUN_ID = 'EUDPA-800'
export const RUN_FOLDER = `workareas/npm-upgrades/${RUN_ID}`
export const FRONTEND = 'trade-imports-animals-frontend'
export const SCHEMAS = 'trade-imports-schemas'
const JAVA_REPO = 'trade-imports-stub'
const MISSING_REPO = 'trade-imports-gone'

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const REGISTRY_VERSIONS = {
  lodash: ['4.17.20', '4.17.21'],
  'date-fns': ['4.1.0', '4.1.1'],
  braces: ['3.0.2', '3.0.3']
}

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

const answerRegistryRequest = (request, response) => {
  const name = decodeURIComponent(request.url.slice(1))
  const versions = REGISTRY_VERSIONS[name]
  if (!versions) {
    response.writeHead(404, { 'content-type': 'application/json' })
    response.end('{"error":"Not found"}')
    return
  }
  response.writeHead(200, { 'content-type': 'application/json' })
  response.end(JSON.stringify(packumentOf(name, versions)))
}

/**
 * An npm registry on a local port that serves the fixture repos'
 * dependencies, for npm-check-updates in a spawned tim to read.
 *
 * @returns {Promise<{url: string, close: () => Promise<void>}>}
 */
export const startFixtureRegistry = async () => {
  const server = createServer(answerRegistryRequest)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve) => server.close(resolve))
  }
}

const ROSTER = {
  reposDir: 'repos',
  githubOrg: 'DEFRA',
  repos: [
    { name: FRONTEND, stack: 'node', npmUpgradeDefault: true },
    { name: JAVA_REPO, stack: 'java', npmUpgradeDefault: true },
    { name: SCHEMAS, stack: 'node', npmUpgradeDefault: true },
    { name: MISSING_REPO, stack: 'node', npmUpgradeDefault: true },
    { name: 'trade-imports-animals-backend', stack: 'java' }
  ]
}

const DEPENDENCIES = {
  [FRONTEND]: { lodash: '^4.17.20', 'date-fns': '^4.1.0' },
  [SCHEMAS]: { lodash: '^4.17.20', braces: '^3.0.2' }
}

const packageJsonOf = (repo, repoSetup) => ({
  name: repo,
  version: '1.0.0',
  scripts: { test: 'vitest run', lint: 'eslint .' },
  dependencies: DEPENDENCIES[repo],
  ...(repoSetup.overrides ? { overrides: repoSetup.overrides } : {})
})

const lockOf = (packageJson) => ({
  name: packageJson.name,
  lockfileVersion: 3,
  packages: {
    '': {
      name: packageJson.name,
      dependencies: packageJson.dependencies,
      ...(packageJson.overrides ? { overrides: packageJson.overrides } : {})
    },
    ...Object.fromEntries(
      Object.entries(packageJson.dependencies).map(([name, range]) => [
        `node_modules/${name}`,
        { version: range.slice(1) }
      ])
    )
  }
})

const auditConfigOf = (allowlist = []) => ({
  $schema: 'https://github.com/IBM/audit-ci/raw/main/docs/schema.json',
  high: true,
  'report-type': 'summary',
  allowlist
})

const git = (cwd, args) =>
  execaSync('git', args, { cwd, env: GIT_ENV, extendEnv: true })

const stageRepo = (root, repo, repoSetup, registryUrl) => {
  const checkout = join(root, 'repos', repo)
  mkdirSync(checkout, { recursive: true })
  const packageJson = packageJsonOf(repo, repoSetup)
  writeFileSync(join(checkout, 'package.json'), jsonText(packageJson))
  writeFileSync(
    join(checkout, 'package-lock.json'),
    jsonText(lockOf(packageJson))
  )
  if (repoSetup.auditConfig !== false) {
    writeFileSync(
      join(checkout, 'audit-ci.jsonc'),
      jsonText(auditConfigOf(repoSetup.allowlist))
    )
  }
  git(checkout, ['init', '--quiet', '-b', 'main'])
  writeFileSync(join(checkout, '.git', 'info', 'exclude'), '.npmrc\n')
  writeFileSync(join(checkout, '.npmrc'), `registry=${registryUrl}/\n`)
  git(checkout, ['add', '.'])
  git(checkout, ['commit', '--quiet', '-m', 'Fixture repo'])
}

const packageRow = (name, current, target, fields = {}) => ({
  package: name,
  current,
  target,
  upgrade_type: 'patch',
  dependency_type: 'dependencies',
  classification: 'auto',
  risk: 'LOW',
  implementation_status: null,
  commit_sha: null,
  failure_reason: null,
  ...fields
})

const runFiles = (fixtureCase) => ({
  ...Object.fromEntries(
    Object.entries(fixtureCase.packages ?? {}).map(([repo, packages]) => [
      `${RUN_FOLDER}/${repo}/packages.${repo}.json`,
      jsonText({ ticket: RUN_ID, repo, packages })
    ])
  ),
  ...Object.fromEntries(
    Object.entries(fixtureCase.runFiles ?? {}).map(([path, value]) => [
      `${RUN_FOLDER}/${path}`,
      jsonText(value)
    ])
  )
})

/**
 * A temporary HOME holding a workspace at the path the Bash wrote into
 * itself: a roster of two npm repos, a Java repo and a missing one, the
 * npm repos as git checkouts that read the fixture registry, what the case
 * stages of a run, and fake npm and npx commands with the real tim on PATH.
 *
 * @param {object} fixtureCase - One of {@link cases}
 * @param {string} registryUrl - From {@link startFixtureRegistry}
 * @param {string[]} [scripts] - Workspace scripts to copy in
 * @returns {{home: string, root: string, env: Record<string, string>, remove: () => void}}
 */
export const stageStartUpgradeWorkspace = (
  fixtureCase,
  registryUrl,
  scripts = []
) => {
  const staged = stageBashWorkspace({
    scripts,
    files: {
      'repos.json': jsonText(ROSTER),
      'docs/best-practices/README.md': '# Best practices\n',
      'docs/best-practices/node/hapi.md': '# Hapi\n\nUse plugins.\n',
      [`repos/${JAVA_REPO}/pom.xml`]: '<project/>\n',
      ...runFiles(fixtureCase)
    }
  })
  for (const repo of [FRONTEND, SCHEMAS]) {
    stageRepo(staged.root, repo, fixtureCase.repos?.[repo] ?? {}, registryUrl)
  }
  const bin = writeFakeBin(staged.home, fixtureCase)
  return {
    ...staged,
    env: {
      ...GIT_ENV,
      PATH: `${bin}:${process.env.PATH}`,
      FAKE_BIN: bin,
      HOME: staged.home,
      NVM_DIR: join(staged.home, '.nvm'),
      NODE_OPTIONS: `--import=${blockPublicFetch.href}`,
      TIM_NO_AUTO_PULL: '1',
      TIM_WORKSPACE: undefined
    }
  }
}

const PHASE0_LABEL = /phase0-\d{8}T\d{6}Z/g

const normalised = (text, home) =>
  normaliseUpgradeText(text, home).replace(PHASE0_LABEL, 'phase0-<STAMP>')

const fileOrNull = (path) =>
  existsSync(path) ? readFileSync(path, 'utf8') : null

const repoStateOf = (root, repo, home) => {
  const checkout = join(root, 'repos', repo)
  const gitText = (args) => git(checkout, args).stdout
  return Object.fromEntries(
    Object.entries({
      log: gitText(['log', '--format=%h %s%n%b']),
      status: gitText(['status', '--porcelain']),
      packageJson: fileOrNull(join(checkout, 'package.json')),
      packageLock: fileOrNull(join(checkout, 'package-lock.json')),
      auditConfig: fileOrNull(join(checkout, 'audit-ci.jsonc'))
    }).map(([key, value]) => [
      key,
      value === null ? null : normalised(value, home)
    ])
  )
}

const runStep = async (staged, step, runPhase) => {
  if (step.git) {
    git(join(staged.root, 'repos', step.git.repo), step.git.args)
    return { git: step.git }
  }
  const command = step.tim
    ? [process.execPath, [timCliPath, '--workspace', staged.root, ...step.tim]]
    : runPhase(staged, step.phase)
  const result = await execa(command[0], command[1], {
    cwd: staged.root,
    env: staged.env,
    extendEnv: true,
    reject: false,
    stripFinalNewline: false
  })
  return {
    input: step.tim ? ['tim', ...step.tim] : step.phase,
    exitCode: result.exitCode,
    stdout: normalised(result.stdout, staged.home),
    stderr: normalised(result.stderr, staged.home)
  }
}

/**
 * Runs a case's steps in turn on a fresh workspace and records each step's
 * exit code and output, then every file under the run folder and each npm
 * repo's git log, status and package files. A `phase` step runs
 * `runPhase`'s command; a `tim` step runs tim; a `git` step changes a repo.
 *
 * @param {object} fixtureCase
 * @param {string} registryUrl
 * @param {(staged: object, args: string[]) => [string, string[]]} runPhase
 * @param {string[]} [scripts]
 * @returns {Promise<object>}
 */
export const recordStartUpgradeCase = async (
  fixtureCase,
  registryUrl,
  runPhase,
  scripts = []
) => {
  const staged = stageStartUpgradeWorkspace(fixtureCase, registryUrl, scripts)
  try {
    const steps = []
    for (const step of fixtureCase.steps) {
      steps.push(await runStep(staged, step, runPhase))
    }
    const files = recordFolderFiles(join(staged.root, RUN_FOLDER), staged.home)
    return {
      case: fixtureCase.name,
      steps,
      files: Object.fromEntries(
        Object.entries(files).map(([path, text]) => [
          normalised(path, staged.home),
          normalised(text, staged.home)
        ])
      ),
      repos: Object.fromEntries(
        [FRONTEND, SCHEMAS].map((repo) => [
          repo,
          repoStateOf(staged.root, repo, staged.home)
        ])
      )
    }
  } finally {
    staged.remove()
  }
}

/** Runs the Bash dispatcher a staged workspace holds. */
export const bashPhase = (staged, args) => [
  '/bin/bash',
  [join(staged.root, SCRIPT), ...args]
]

/** Runs `tim npm upgrade` against a staged workspace. */
export const timPhase = (staged, args) => [
  process.execPath,
  [timCliPath, '--workspace', staged.root, 'npm', 'upgrade', ...args]
]

/**
 * @returns {object[]} What start-upgrade.sh did on every case
 */
export const readStartUpgradeGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/npm-start-upgrade-script.json', import.meta.url),
      'utf8'
    )
  )

const phase = (...args) => ({ phase: [RUN_ID, ...args] })
const tim = (...args) => ({ tim: args })
const classify = (repo, name, classification) =>
  tim(
    'npm',
    'packages',
    'set-classification',
    '--run-id',
    RUN_ID,
    '--repo',
    repo,
    '--package',
    name,
    '--classification',
    classification,
    '--risk',
    'LOW',
    '--safe-for-automation',
    String(classification === 'auto'),
    '--rationale',
    'Patch fix only'
  )

const ONE_REPO = ['--repo', FRONTEND]

const allowlistEntries = [
  'GHSA-aaaa-bbbb-cccc',
  {
    'GHSA-c475-qrg2-pj4r': {
      active: true,
      notes:
        'No fixed version of basic-ftp. Fix blocked upstream: puppeteer pins basic-ftp 5. Owner: Sam Farrington',
      expiry: '2026-12-31'
    }
  },
  {
    'GHSA-3ppc-4f35-3m26': {
      active: true,
      notes: 'Dev-only ReDoS.',
      expiry: '2026-12-01'
    }
  }
]

const phase0Run = (ranAt, label, green) => ({
  ran_at: ranAt,
  label,
  branch: '',
  green,
  red: green ? [] : [FRONTEND],
  repos: [FRONTEND],
  per_repo: [
    {
      repo: FRONTEND,
      label,
      green,
      failing: green ? [] : ['GHSA-grv7-fg5c-xmjg'],
      allowlisted: ['GHSA-c475-qrg2-pj4r'],
      stale: [],
      inactive: [],
      fixable_allowlisted: green
        ? []
        : [{ ghsa: 'GHSA-c475-qrg2-pj4r', fixed_in: '5.0.6' }],
      head: '0000000000000000000000000000000000000000',
      exit_code: green ? 0 : 1
    }
  ]
})

/**
 * Each case runs its steps on a fresh workspace from
 * {@link stageStartUpgradeWorkspace}. `repos` sets each npm repo's
 * overrides, allowlist or missing audit config, `packages` and `runFiles`
 * stage a run, and `queues`, `auditRules` and `requires` drive the fake
 * npm and npx.
 */
export const cases = [
  {
    name: 'every phase in turn on the default roster',
    steps: [
      phase('--phase', '0'),
      phase('--phase', '1'),
      classify(FRONTEND, 'lodash', 'auto'),
      classify(FRONTEND, 'date-fns', 'manual'),
      classify(SCHEMAS, 'lodash', 'auto'),
      classify(SCHEMAS, 'braces', 'auto'),
      tim('npm', 'packages', 'verify', '--run-id', RUN_ID),
      phase(
        '--phase',
        '2',
        '--allowlist-owner',
        'Sam Farrington',
        '--expiry-days',
        '30'
      ),
      phase('--phase', '3'),
      phase('--phase', '4')
    ]
  },
  {
    name: 'a red phase 0 stops phase 1',
    queues: { audit: [FIXABLE_RED] },
    steps: [
      phase('--phase', '0', ...ONE_REPO),
      phase('--phase', '1', ...ONE_REPO)
    ]
  },
  {
    name: 'phase 1 refuses with no phase 0 run',
    steps: [phase('--phase', '1')]
  },
  {
    name: 'phase 1 refuses a repo phase 0 did not cover or whose HEAD moved',
    steps: [
      phase('--phase', '0', ...ONE_REPO),
      {
        git: {
          repo: FRONTEND,
          args: ['commit', '--quiet', '--allow-empty', '-m', 'Moved on']
        }
      },
      phase('--phase', '1')
    ]
  },
  {
    name: 'phase 1 stops at a strategy discovery refuses',
    steps: [
      phase('--phase', '0', ...ONE_REPO),
      phase('--phase', '1', ...ONE_REPO, '--strategy', 'major')
    ]
  },
  {
    name: 'phase 1 with the minor strategy',
    steps: [
      phase('--phase', '0', '--repo', SCHEMAS),
      phase('--phase', '1', '--repo', SCHEMAS, '--strategy', 'minor')
    ]
  },
  {
    name: 'a repo with no audit config is red in phase 0',
    repos: { [FRONTEND]: { auditConfig: false } },
    steps: [phase('--phase', '0')]
  },
  {
    name: 'branch refuses repos on another branch',
    steps: [phase('--phase', '0', '--branch', 'feat/EUDPA-800-npm')]
  },
  {
    name: 'branch lets repos on that branch run',
    steps: [phase('--phase', '0', ...ONE_REPO, '--branch', 'main')]
  },
  {
    name: 'no npm repo left to run',
    steps: [
      phase('--phase', '0', '--repo', JAVA_REPO, '--repo', MISSING_REPO),
      phase('--phase', '3', '--repo', JAVA_REPO)
    ]
  },
  {
    name: 'phase 2 reports a cascade',
    packages: { [FRONTEND]: [packageRow('lodash', '4.17.20', '4.17.21')] },
    queues: { test: [0, 1, 1] },
    steps: [phase('--phase', '2', ...ONE_REPO)]
  },
  {
    name: 'phase 2 reports a repo that stopped on a red audit',
    packages: { [FRONTEND]: [packageRow('lodash', '4.17.20', '4.17.21')] },
    queues: { audit: [FIXABLE_RED] },
    steps: [phase('--phase', '2', ...ONE_REPO)]
  },
  {
    name: 'phase 2 skips a repo phase 1 never discovered',
    packages: { [FRONTEND]: [packageRow('lodash', '4.17.20', '4.17.21')] },
    steps: [phase('--phase', '2')]
  },
  {
    name: 'phase 3 hands off manual, failed and held packages with the allowlist and audits',
    repos: { [FRONTEND]: { allowlist: allowlistEntries } },
    packages: {
      [FRONTEND]: [
        packageRow('@hapi/hapi', '21.3.0', '21.4.0', {
          classification: 'manual',
          risk: 'HIGH'
        }),
        packageRow('pino', '8.0.0', '9.0.0', {
          classification: 'manual',
          implementation_status: 'failed',
          failure_reason: 'Deferred by walker: waiting on the logging spike'
        }),
        packageRow('lodash', '4.17.20', '4.17.21', {
          implementation_status: 'failed',
          failure_reason: 'npm test failed'
        }),
        packageRow('date-fns', '4.1.0', '4.1.1', {
          implementation_status: 'done',
          commit_sha: 'abc1234'
        })
      ]
    },
    runFiles: {
      [`${FRONTEND}/allowlist.${FRONTEND}.json`]: {
        entries: [
          { ghsa: 'GHSA-c475-qrg2-pj4r', package: 'basic-ftp', kind: 'no_fix' }
        ]
      },
      'phase0.json': {
        runs: [
          phase0Run('2026-11-01T09:00:00Z', 'phase0-20261101T090000Z', false),
          phase0Run('2026-11-02T09:00:00Z', 'phase0-20261102T090000Z', true)
        ]
      }
    },
    steps: [phase('--phase', '3')]
  },
  {
    name: 'phase 4 keeps the overrides the audit and the tests need',
    repos: { [FRONTEND]: { overrides: OVERRIDES } },
    auditRules: OVERRIDE_RULES,
    requires: { test: ['brace-expansion'] },
    steps: [phase('--phase', '4', ...ONE_REPO)]
  },
  {
    name: 'phase 4 stops on an advisory no override reaches',
    repos: { [FRONTEND]: { overrides: OVERRIDES } },
    auditRules: [
      advisory(
        'GHSA-aaaa-bbbb-cccc',
        'other',
        'high',
        '<2.0.0',
        'other advisory'
      )
    ],
    steps: [phase('--phase', '4', ...ONE_REPO)]
  },
  {
    name: 'phase 4 with two repos and no overrides',
    steps: [phase('--phase', '4')]
  },
  { name: 'no ticket', steps: [{ phase: ['--phase', '0'] }] },
  { name: 'no phase', steps: [phase()] },
  { name: 'an unknown option', steps: [phase('--phase', '0', '--force')] },
  { name: 'an unknown phase', steps: [phase('--phase', '9')] }
]
