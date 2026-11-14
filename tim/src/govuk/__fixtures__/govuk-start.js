import { execFileSync } from 'node:child_process'
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
import { applyEnv } from './govuk-apply.js'

export const START_SCRIPTS = [
  'tools/govuk/start-upgrade.sh',
  'tools/govuk/discover-repos.sh',
  'tools/govuk/setup-branch.sh',
  'tools/govuk/discover-versions.sh'
]

export const ADMIN = 'trade-imports-animals-admin'
export const FRONTEND = 'trade-imports-animals-frontend'
export const INS = 'trade-imports-ins-frontend'
const STUB = 'trade-imports-stub'
const PLANTS = 'trade-imports-plants-frontend'
const RUN_BRANCH = 'chore/EUDPA-500'

const fixturesDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'test-support',
  'fixtures'
)

const timCliPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'cli.js'
)

/**
 * The npm registry's document for govuk-frontend, trimmed to its versions
 * and dist-tags.
 *
 * @returns {object}
 */
export const registryDocument = () =>
  JSON.parse(
    readFileSync(
      join(fixturesDir, 'npm-registry', 'govuk-frontend.json'),
      'utf8'
    )
  )

/**
 * govuk-frontend's CHANGELOG.md, trimmed to three releases.
 *
 * @returns {string}
 */
export const changelogText = () =>
  readFileSync(join(fixturesDir, 'govuk-changelog', 'CHANGELOG.md'), 'utf8')

/**
 * What start-upgrade.sh did on every case, as the golden test recorded it.
 *
 * @returns {object[]}
 */
export const readGovukStartGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/govuk-start.json', import.meta.url),
      'utf8'
    )
  )

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const packageJsons = {
  [ADMIN]: {
    name: ADMIN,
    dependencies: { 'govuk-frontend': '^5.4.0', '@hapi/hapi': '21.4.0' }
  },
  [FRONTEND]: {
    name: FRONTEND,
    devDependencies: { 'govuk-frontend': '~5.9.0' }
  },
  [INS]: { name: INS, dependencies: { 'govuk-frontend': '5.10.0' } },
  [STUB]: { name: STUB, dependencies: { express: '5.1.0' } }
}

const AUDITS = {
  [ADMIN]: '{"metadata":{"vulnerabilities":{"critical":0,"high":2}}}',
  [FRONTEND]: '{"metadata":{"vulnerabilities":{"critical":0,"high":0}}}',
  [INS]: 'npm error audit endpoint returned an error'
}

const stubNpm = (dataDir) => `#!/bin/sh
case "$*" in
  "view govuk-frontend dist-tags.latest") echo "5.10.0" ;;
  "view govuk-frontend versions --json") cat "${dataDir}/versions.json" ;;
  *" audit --json")
    name=$(basename "$2")
    cat "${dataDir}/audit-$name.txt" 2>/dev/null
    exit 1 ;;
  *) echo "stub npm: unexpected $*" >&2; exit 9 ;;
esac
`

const stubCurl = (dataDir) => `#!/bin/sh
cp "${dataDir}/CHANGELOG.md" "$4"
`

const stubTim = (root) => `#!/bin/sh
TIM_NO_AUTO_PULL=1 exec node "${timCliPath}" --workspace "${root}" "$@"
`

const writeExecutable = (path, text) => {
  writeFileSync(path, text)
  chmodSync(path, 0o755)
}

const stageStubs = (staged) => {
  const dataDir = join(staged.home, 'stub-data')
  const bin = join(staged.home, 'stub-bin')
  mkdirSync(dataDir, { recursive: true })
  mkdirSync(bin, { recursive: true })
  writeFileSync(
    join(dataDir, 'versions.json'),
    `${JSON.stringify(Object.keys(registryDocument().versions), null, 2)}\n`
  )
  writeFileSync(join(dataDir, 'CHANGELOG.md'), changelogText())
  Object.entries(AUDITS).forEach(([repo, audit]) =>
    writeFileSync(join(dataDir, `audit-${repo}.txt`), `${audit}\n`)
  )
  writeExecutable(join(bin, 'npm'), stubNpm(dataDir))
  writeExecutable(join(bin, 'curl'), stubCurl(dataDir))
  writeExecutable(join(bin, 'tim'), stubTim(staged.root))
}

const git = (staged, cwd, args) =>
  execFileSync('git', args, {
    cwd,
    env: { ...process.env, ...applyEnv(staged) },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })

const stageRepo = (staged, repo) => {
  const dir = join(staged.root, 'repos', repo)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'package.json'), jsonText(packageJsons[repo]))
  git(staged, dir, ['init', '--quiet', '-b', 'main'])
  git(staged, dir, ['add', '-A'])
  git(staged, dir, ['commit', '--quiet', '-m', 'Initial commit'])
  return dir
}

const giveRemoteBranch = (staged, dir, repo) => {
  const remote = join(staged.home, 'remotes', `${repo}.git`)
  git(staged, dir, ['clone', '--quiet', '--bare', dir, remote])
  git(staged, dir, ['remote', 'add', 'origin', remote])
  git(staged, dir, ['push', '--quiet', 'origin', `main:${RUN_BRANCH}`])
  git(staged, dir, ['fetch', '--quiet', 'origin'])
}

/**
 * A workspace with four repos as real git repos on main: the admin repo
 * with govuk-frontend ^5.4.0 in dependencies, the frontend with ~5.9.0 in
 * devDependencies and a local chore/EUDPA-500 branch, the INS frontend on
 * 5.10.0 with chore/EUDPA-500 only on its origin, and the stub with no
 * govuk-frontend. Two of the five best-practices files are there. Stub
 * `npm`, `curl` and `tim` sit in `<home>/stub-bin` for the Bash, and npm
 * audit reports two high advisories in admin and garbage in INS.
 *
 * @param {{scripts?: string[]}} [opts]
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stageStartWorkspace = ({ scripts = [] } = {}) => {
  const staged = stageBashWorkspace({
    scripts,
    files: {
      'repos.json':
        '{ "reposDir": "repos", "githubOrg": "DEFRA", "repos": [] }\n',
      'docs/best-practices/node/govuk-frontend.md':
        '# govuk-frontend\n\nUse the Nunjucks macros.\n',
      'docs/best-practices/gds/components.md':
        '# Components\n\nNo trailing newline here.',
      'repos/notes/README.md': 'Not a repo\n'
    }
  })
  stageStubs(staged)
  Object.keys(packageJsons).forEach((repo) => stageRepo(staged, repo))
  git(staged, join(staged.root, 'repos', FRONTEND), ['branch', RUN_BRANCH])
  giveRemoteBranch(staged, join(staged.root, 'repos', INS), INS)
  return staged
}

const statePath = (staged, runId, repo) =>
  join(
    staged.root,
    'workareas',
    'govuk-upgrades',
    runId,
    repo,
    `versions.${repo}.json`
  )

const classifyAdmin591 = (staged) => {
  const path = statePath(staged, 'EUDPA-500', ADMIN)
  const state = JSON.parse(readFileSync(path, 'utf8'))
  const versions = state.versions.map((entry) =>
    entry.version === '5.9.1'
      ? {
          ...entry,
          classification: 'todo',
          classified_at: '2026-11-01T09:00:00Z',
          summary: 'Fix the header crown'
        }
      : entry
  )
  writeFileSync(path, jsonText({ ...state, versions }))
}

const writeStaleAdminCache = (staged) => {
  const folder = join(
    staged.root,
    'workareas',
    'govuk-upgrades',
    'EUDPA-500',
    ADMIN
  )
  mkdirSync(folder, { recursive: true })
  writeFileSync(join(folder, 'CHANGELOG.md'), '## v5.5.0\n\n- Old cache.\n')
  writeFileSync(
    join(folder, 'version__5.4.1.changelog.md'),
    '## govuk-frontend v5.4.1 — Changelog\n\nOut of range.\n'
  )
  writeFileSync(
    join(folder, 'version__5.6.0.changelog.md'),
    '## govuk-frontend v5.6.0 — Changelog\n\nBaked earlier.\n'
  )
}

const addUnclonedRepo = (staged) => {
  const dir = join(staged.root, 'repos', PLANTS)
  mkdirSync(dir, { recursive: true })
  writeFileSync(
    join(dir, 'package.json'),
    jsonText({ name: PLANTS, dependencies: { 'govuk-frontend': '5.9.0' } })
  )
}

/**
 * Each case runs its steps in turn on a fresh workspace from
 * {@link stageStartWorkspace}, after its `setUp`, with `between` run after
 * the first step. Arguments are the same for the Bash and for
 * `tim govuk start`.
 */
export const startCases = [
  { name: 'ticket with the latest target', steps: [['--ticket', 'EUDPA-500']] },
  {
    name: 're-run with a lower target keeps plans and prunes sections',
    steps: [
      ['--ticket', 'EUDPA-500'],
      ['--branch', RUN_BRANCH, '--target', '5.9.1']
    ],
    between: classifyAdmin591
  },
  {
    name: 'branch with no ticket',
    steps: [['--branch', 'spike/govuk-bump', '--target', 'v5.9.0']]
  },
  {
    name: 'cached changelog missing the target',
    steps: [['--ticket', 'EUDPA-500', '--target', '5.9.1']],
    setUp: writeStaleAdminCache
  },
  {
    name: 'every repo up to date',
    steps: [['--ticket', 'EUDPA-501', '--target', '5.4.0']]
  },
  {
    name: 'project key from JIRA_PROJECT_KEY',
    steps: [['--branch', 'chore/ABC-12-bump', '--target', '5.10.0']],
    env: { JIRA_PROJECT_KEY: 'ABC' }
  },
  {
    name: 'repo that is not a git repo',
    steps: [['--ticket', 'EUDPA-500', '--target', '5.10.0']],
    setUp: addUnclonedRepo
  },
  {
    name: 'ticket and branch both',
    steps: [['--ticket', 'EUDPA-500', '--branch', RUN_BRANCH]]
  },
  { name: 'neither ticket nor branch', steps: [['--target', '5.10.0']] },
  {
    name: 'ticket from another project',
    steps: [['--ticket', 'ABC-1']]
  }
]

export const USAGE_CASES = new Set([
  'ticket and branch both',
  'neither ticket nor branch',
  'ticket from another project'
])

/**
 * The environment every start run gets: the stubs first on PATH and the
 * fixed git identity and config.
 *
 * @param {{home: string}} staged
 * @returns {Record<string, string>}
 */
export const startEnv = (staged) => ({
  ...applyEnv(staged),
  JIRA_PROJECT_KEY: ''
})

const currentBranches = (staged) =>
  Object.fromEntries(
    [ADMIN, FRONTEND, INS, STUB].map((repo) => [
      repo,
      git(staged, join(staged.root, 'repos', repo), [
        'branch',
        '--show-current'
      ]).trim()
    ])
  )

/**
 * Sets a case up, runs its steps and records what each printed and how it
 * exited, then every file under workareas/govuk-upgrades and each repo's
 * branch.
 *
 * @param {{home: string, root: string}} staged
 * @param {object} startCase - One of {@link startCases}
 * @param {(args: string[], env: Record<string, string>) => Promise<{exitCode: number, stdout: string, stderr: string}>} runStart
 * @returns {Promise<object>}
 */
export const recordStartCase = async (staged, startCase, runStart) => {
  startCase.setUp?.(staged)
  const env = { ...startEnv(staged), ...startCase.env }
  const runs = []
  for (const [index, args] of startCase.steps.entries()) {
    if (index === 1) startCase.between?.(staged)
    const run = await runStart(args, env)
    runs.push({
      exitCode: run.exitCode,
      stdout: normaliseRecordedText(run.stdout, staged.home),
      stderr: normaliseRecordedText(run.stderr, staged.home)
    })
  }
  const upgrades = join(staged.root, 'workareas', 'govuk-upgrades')
  return {
    case: startCase.name,
    steps: startCase.steps,
    runs,
    files: existsSync(upgrades) ? recordFolderFiles(upgrades, staged.home) : {},
    branches: currentBranches(staged)
  }
}
