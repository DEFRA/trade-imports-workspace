import { readFileSync } from 'node:fs'
import { stageBashWorkspace } from '../../test-support/bash-golden-harness.js'

export const SCRIPT_FOR = {
  list: 'tools/npm/packages-list.sh',
  counts: 'tools/npm/packages-counts.sh',
  'set-status': 'tools/npm/packages-set-status.sh',
  'set-classification': 'tools/npm/packages-set-classification.sh',
  aggregate: 'tools/npm/packages-aggregate-classifications.sh',
  verify: 'tools/npm/verify-classification-coverage.sh'
}

export const RUN_ID = 'EUDPA-500'
export const EMPTY_RUN_ID = 'EUDPA-501'
export const MISSING_RUN_ID = 'EUDPA-999'
export const ADMIN = 'trade-imports-animals-admin'
export const FRONTEND = 'trade-imports-animals-frontend'
export const NO_FILE_REPO = 'trade-imports-stub'

/**
 * What the Bash scripts did on every case, as the golden test recorded it.
 *
 * @returns {Record<string, object[]>} Runs by tim command name
 */
export const readNpmGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/npm-packages-scripts.json', import.meta.url),
      'utf8'
    )
  )

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

const packagesFile = (repo, packages) => ({
  ticket: RUN_ID,
  repo,
  discovered_at: '2026-05-26T12:00:00Z',
  strategy: 'latest',
  ncu_version: '16.14.20',
  packages
})

const states = {
  [ADMIN]: packagesFile(ADMIN, [
    row('@hapi/hapi', '21.3.0', '21.4.0', 'minor'),
    row('lodash', '4.17.20', '4.17.21', 'patch', {
      classification: 'auto',
      risk: 'LOW',
      safe_for_automation: true,
      rationale: 'Patch fix only',
      implementation_status: 'done',
      commit_sha: 'abc1234',
      completed_at: '2026-05-27T10:00:00Z'
    }),
    row('eslint', '8.57.0', '9.1.0', 'major', {
      dependency_type: 'devDependencies',
      classification: 'manual',
      risk: 'HIGH',
      safe_for_automation: false,
      rationale: 'Flat config is required',
      files_affected: ['eslint.config.js'],
      implementation_status: 'failed',
      failure_reason: 'npm test failed:\tlint "rules"\nsee C:\\tmp\\out.txt',
      completed_at: '2026-05-27T11:00:00Z',
      demoted_from_auto: true
    }),
    {
      package: 'pino',
      current: '8.0.0',
      target: '9.0.0',
      upgrade_type: 'major',
      dependency_type: 'dependencies',
      classification: null,
      implementation_status: 'todo'
    }
  ]),
  [FRONTEND]: packagesFile(FRONTEND, [
    row('govuk-frontend-helper', '1.0.0', '1.0.1', 'patch', {
      classification: 'auto',
      risk: 'LOW',
      safe_for_automation: true,
      rationale: 'Patch',
      implementation_status: 'todo'
    }),
    row('@playwright/test', '1.40.0', '1.45.0', 'minor', {
      dependency_type: 'devDependencies',
      classification: 'manual',
      risk: 'MEDIUM',
      safe_for_automation: false,
      rationale: 'Snapshot paths moved',
      implementation_status: 'inprogress'
    }),
    row('hapi-pino', '12.0.0', '12.1.0', 'minor', {
      classification: 'auto',
      risk: 'LOW',
      safe_for_automation: true,
      rationale: 'Minor'
    })
  ])
}

const fragments = {
  [ADMIN]: {
    '@hapi__hapi.json': {
      package: '@hapi/hapi',
      classification: 'manual',
      risk: 'MEDIUM',
      safe_for_automation: false,
      rationale: 'Route options changed',
      classified_at: '2026-05-28T09:00:00Z',
      files_affected: ['src/server/index.js', 'src/server/router.js'],
      changes_required_summary: 'Move route options',
      changelog_url: 'https://example.com/hapi/changelog',
      migration_guide_url: null
    },
    'pino.json': {
      package: 'pino',
      classification: 'auto',
      rationale: 'Logger API unchanged',
      classified_at: '2026-05-28T09:05:00Z',
      demoted_from_auto: false
    },
    'left-pad.json': {
      package: 'left-pad',
      classification: 'auto',
      risk: 'LOW',
      safe_for_automation: true,
      rationale: 'Not in the manifest',
      classified_at: '2026-05-28T09:10:00Z'
    }
  },
  [NO_FILE_REPO]: {
    'express.json': {
      package: 'express',
      classification: 'auto',
      risk: 'LOW',
      safe_for_automation: true,
      rationale: 'No packages file for this repo',
      classified_at: '2026-05-28T09:15:00Z'
    }
  }
}

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const runFolder = (runId) => `workareas/npm-upgrades/${runId}`

export const RUN_FOLDER = runFolder(RUN_ID)

const stateFiles = Object.fromEntries(
  Object.entries(states).map(([repo, state]) => [
    `${RUN_FOLDER}/${repo}/packages.${repo}.json`,
    jsonText(state)
  ])
)

const fragmentFiles = Object.fromEntries(
  Object.entries(fragments).flatMap(([repo, byName]) =>
    Object.entries(byName).map(([name, fragment]) => [
      `${RUN_FOLDER}/${repo}/classifications/${name}`,
      jsonText(fragment)
    ])
  )
)

const baseFiles = {
  'repos.json': '{ "reposDir": "repos", "githubOrg": "DEFRA", "repos": [] }\n',
  'docs/best-practices/README.md': '# Best practices\n',
  ...stateFiles,
  [`${runFolder(EMPTY_RUN_ID)}/${ADMIN}/.upgrades-meta.json`]: '{}\n'
}

/**
 * A workspace holding one npm upgrade run with two repos' packages files,
 * and a run whose one repo folder has no packages file. With `fragments`,
 * the run also holds classification fragments: some for rows in the admin
 * repo, one for a package no manifest lists and one for a repo with no
 * packages file.
 *
 * @param {{scripts?: string[], withFragments?: boolean}} [opts]
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stageNpmWorkspace = ({
  scripts = [],
  withFragments = false
} = {}) =>
  stageBashWorkspace({
    scripts,
    files: withFragments ? { ...baseFiles, ...fragmentFiles } : baseFiles
  })

const withJson = (cases) =>
  cases.flatMap(({ name, args }) => [
    { name, args },
    { name: `${name} as JSON`, args: [...args, '--json'] }
  ])

const run = (...args) => ['--run-id', RUN_ID, ...args]

/**
 * Each case runs on a fresh workspace from {@link stageNpmWorkspace}.
 * `withFragments` stages the classification fragments too, and `watch`
 * names the workspace folder whose files are recorded after the steps.
 */
export const readCases = {
  list: withJson([
    { name: 'every repo', args: run() },
    { name: 'one repo', args: run('--repo', ADMIN) },
    {
      name: 'pending classification',
      args: run('--classification', 'pending')
    },
    { name: 'auto', args: run('--classification', 'auto') },
    { name: 'manual by the filter alias', args: run('--filter', 'manual') },
    { name: 'status pending', args: run('--status', 'pending') },
    { name: 'status todo', args: run('--status', 'todo') },
    { name: 'status inprogress', args: run('--status', 'inprogress') },
    { name: 'status done', args: run('--status', 'done') },
    { name: 'status failed', args: run('--status', 'failed') },
    { name: 'risk HIGH', args: run('--risk', 'HIGH') },
    { name: 'one scoped package', args: run('--package', '@hapi/hapi') },
    {
      name: 'auto and done in one repo',
      args: run('--repo', ADMIN, '--classification', 'auto', '--status', 'done')
    },
    { name: 'repo with no packages file', args: run('--repo', NO_FILE_REPO) },
    { name: 'run with no packages files', args: ['--run-id', EMPTY_RUN_ID] },
    { name: 'missing run folder', args: ['--run-id', MISSING_RUN_ID] },
    { name: 'invalid classification', args: run('--classification', 'later') },
    { name: 'invalid status', args: run('--status', 'later') },
    { name: 'invalid risk', args: run('--risk', 'low') },
    {
      name: 'invalid classification on a run with no packages files',
      args: ['--run-id', EMPTY_RUN_ID, '--classification', 'later']
    }
  ]),
  counts: withJson([
    { name: 'every repo', args: run() },
    { name: 'one repo', args: run('--repo', FRONTEND) },
    { name: 'repo with no packages file', args: run('--repo', NO_FILE_REPO) },
    { name: 'run with no packages files', args: ['--run-id', EMPTY_RUN_ID] },
    { name: 'missing run folder', args: ['--run-id', MISSING_RUN_ID] }
  ]),
  verify: [
    ...withJson([{ name: 'pending with no fragments', args: run() }]),
    ...withJson([
      { name: 'every repo classified after folding fragments', args: run() },
      { name: 'one repo all classified', args: run('--repo', FRONTEND) },
      {
        name: 'repo with no packages file',
        args: run('--repo', NO_FILE_REPO)
      },
      { name: 'run with no packages files', args: ['--run-id', EMPTY_RUN_ID] },
      { name: 'missing run folder', args: ['--run-id', MISSING_RUN_ID] }
    ]).map((verifyCase) => ({ ...verifyCase, withFragments: true }))
  ]
}

const packageArgs = (pkg, repo = ADMIN) => run('--repo', repo, '--package', pkg)

const classify = (pkg, ...rest) => [
  ...packageArgs(pkg),
  '--classification',
  'auto',
  '--risk',
  'LOW',
  '--safe-for-automation',
  'true',
  '--rationale',
  'No breaking changes',
  ...rest
]

export const writeCases = {
  'set-status': [
    {
      name: 'todo over a done row clears it',
      args: [...packageArgs('lodash'), '--status', 'todo']
    },
    {
      name: 'inprogress',
      args: [...packageArgs('@hapi/hapi'), '--status', 'inprogress']
    },
    {
      name: 'done with a commit clears the failure',
      args: [
        ...packageArgs('eslint'),
        '--status',
        'done',
        '--commit-sha',
        'fedcba9'
      ]
    },
    {
      name: 'done with no commit',
      args: [...packageArgs('pino'), '--status', 'done']
    },
    {
      name: 'done with an empty commit',
      args: [...packageArgs('pino'), '--status', 'done', '--commit-sha', '']
    },
    {
      name: 'failed with a reason',
      args: [
        ...packageArgs('lodash'),
        '--status',
        'failed',
        '--failure-reason',
        'npm test failed — "header" snapshot'
      ]
    },
    {
      name: 'failed with a commit drops the commit',
      args: [
        ...packageArgs('lodash'),
        '--status',
        'failed',
        '--commit-sha',
        'abc'
      ]
    },
    {
      name: 'failed with an empty reason',
      args: [
        ...packageArgs('lodash'),
        '--status',
        'failed',
        '--failure-reason',
        ''
      ]
    },
    {
      name: 'invalid status',
      args: [...packageArgs('lodash'), '--status', 'later']
    },
    {
      name: 'unknown package',
      args: [...packageArgs('left-pad'), '--status', 'todo']
    },
    {
      name: 'repo with no packages file',
      args: [...packageArgs('lodash', NO_FILE_REPO), '--status', 'todo']
    }
  ],
  'set-classification': [
    { name: 'auto with only the required options', args: classify('lodash') },
    {
      name: 'manual with every option on a scoped package',
      args: [
        ...packageArgs('@hapi/hapi'),
        '--classification',
        'manual',
        '--risk',
        'HIGH',
        '--safe-for-automation',
        'false',
        '--rationale',
        'Route "options" moved — see the guide',
        '--files-affected',
        ' src/a.js ,src/b/c.js,,',
        '--changes-required',
        'Move route options',
        '--changelog-url',
        'https://example.com/changelog',
        '--migration-guide-url',
        'https://example.com/migrate',
        '--demoted-from-auto',
        'true'
      ]
    },
    {
      name: 'empty optional values',
      args: classify(
        'pino',
        '--files-affected',
        '',
        '--changes-required',
        '',
        '--changelog-url',
        '',
        '--migration-guide-url',
        ''
      )
    },
    {
      name: 'demoted with a value other than true',
      args: classify('eslint', '--demoted-from-auto', 'yes')
    },
    {
      name: 'invalid classification',
      args: classify('lodash', '--classification', 'later')
    },
    { name: 'invalid risk', args: classify('lodash', '--risk', 'low') },
    {
      name: 'invalid safe-for-automation',
      args: classify('lodash', '--safe-for-automation', 'yes')
    },
    { name: 'unknown package', args: classify('left-pad') },
    {
      name: 'repo with no packages file',
      args: [
        ...run('--repo', NO_FILE_REPO, '--package', 'lodash'),
        '--classification',
        'auto',
        '--risk',
        'LOW',
        '--safe-for-automation',
        'true',
        '--rationale',
        'Fine'
      ]
    }
  ],
  aggregate: [
    { name: 'every repo', args: run() },
    { name: 'one repo', args: run('--repo', ADMIN) },
    { name: 'repo with no fragments', args: run('--repo', FRONTEND) },
    { name: 'repo with no packages file', args: run('--repo', NO_FILE_REPO) },
    { name: 'missing run folder', args: ['--run-id', MISSING_RUN_ID] }
  ].map((aggregateCase) => ({ ...aggregateCase, withFragments: true }))
}
