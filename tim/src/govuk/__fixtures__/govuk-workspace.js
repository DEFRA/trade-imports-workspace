import { readFileSync } from 'node:fs'
import { stageBashWorkspace } from '../../test-support/bash-golden-harness.js'

export const BASH_SCRIPT_FOR = {
  plans: 'tools/govuk/list-plans.sh',
  status: 'tools/govuk/upgrade-status.sh',
  summaries: 'tools/govuk/list-plan-summaries.sh',
  render: 'tools/govuk/render-version-plan.sh'
}

export const RUN_ID = 'EUDPA-264'

/**
 * What the Bash scripts did on every case, as the golden test recorded it.
 *
 * @returns {{plansAsShipped: object[], plans: object[], status: object[], summaries: object[], render: object[]}}
 */
export const readGovukGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/govuk-scripts.json', import.meta.url),
      'utf8'
    )
  )

const versionEntry = (version, fields = {}) => ({
  version,
  classification: null,
  classified_at: null,
  implementation_status: null,
  implemented_at: null,
  commit_sha: null,
  failure_reason: null,
  changelog_path: `version__${version}.changelog.md`,
  summary: null,
  changes: [],
  ...fields
})

const change = (file, why, what) => ({ file, why, change: what })

const stateFile = (repo, current, target, versions) => ({
  ticket: RUN_ID,
  repo,
  package: 'govuk-frontend',
  current_version: current,
  target_version: target,
  original_constraint_prefix: '^',
  created_at: '2026-05-26T10:00:00Z',
  last_discovered_at: '2026-05-26T10:00:00Z',
  versions
})

const ADMIN = 'trade-imports-animals-admin'
const FRONTEND = 'trade-imports-animals-frontend'
const INS = 'trade-imports-ins-frontend'

const states = {
  [ADMIN]: stateFile(ADMIN, '5.4.0', '5.10.0', [
    versionEntry('5.10.0'),
    versionEntry('5.9.1', {
      classification: 'todo',
      classified_at: '2026-05-27T09:00:00Z',
      summary: 'Rename the header service name and drop the old cookie banner',
      changes: [
        change(
          'src/server/common/templates/layouts/page.njk',
          'Breaking change: serviceName param renamed',
          'Rename `serviceName` to `service.name`'
        ),
        change(
          'src/server/common/components/cookie-banner/template.njk',
          'The "cookie banner" macro moved — see the changelog',
          'Import `govukCookieBanner` from its new path'
        )
      ]
    }),
    versionEntry('5.5.0', {
      classification: 'noop',
      classified_at: '2026-05-27T09:05:00Z',
      summary: 'Only Sass deprecation fixes'
    }),
    versionEntry('5.6.0', {
      classification: 'todo',
      classified_at: '2026-05-27T09:10:00Z',
      implementation_status: 'done',
      implemented_at: '2026-05-28T11:00:00Z',
      commit_sha: 'abc1234',
      summary: 'Swap the file upload macro',
      changes: [
        change(
          'src/server/upload/index.njk',
          'File upload gained a JavaScript enhancement',
          'Add `javascript: true` to the macro call'
        )
      ]
    }),
    versionEntry('5.7.0', {
      classification: 'todo',
      classified_at: '2026-05-27T09:15:00Z',
      implementation_status: 'failed',
      implemented_at: '2026-05-28T11:30:00Z',
      failure_reason: 'npm test failed: "header" snapshot — 2 diffs',
      summary: 'Header markup change'
    }),
    versionEntry('5.8.0', { classification: 'todo' })
  ]),
  [FRONTEND]: stateFile(FRONTEND, '5.9.0', '5.10.0', [
    versionEntry('5.10.0', {
      classification: 'noop',
      classified_at: '2026-05-27T10:00:00Z',
      implementation_status: 'done',
      implemented_at: '2026-05-28T12:00:00Z'
    }),
    versionEntry('5.9.1', {
      classification: 'todo',
      classified_at: '2026-05-27T10:05:00Z',
      summary: 'Rename the header service name',
      changes: [
        change(
          'src/server/common/templates/layouts/page.njk',
          'Breaking change: serviceName param renamed',
          'Rename `serviceName` to `service.name`'
        )
      ]
    })
  ]),
  [INS]: stateFile(INS, '5.10.0', '6.0.0-beta.1', [
    versionEntry('6.0.0-beta.1'),
    versionEntry('6.0.0-beta.0', {
      classification: 'noop',
      classified_at: '2026-05-27T11:00:00Z'
    })
  ])
}

const runFolder = `workareas/govuk-upgrades/${RUN_ID}`

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const stateFiles = Object.fromEntries(
  Object.entries(states).map(([repo, state]) => [
    `${runFolder}/${repo}/versions.${repo}.json`,
    jsonText(state)
  ])
)

const changelogFiles = {
  [`${runFolder}/${ADMIN}/version__5.9.1.changelog.md`]:
    '## v5.9.1 (Fix release)\n\n- Rename `serviceName` to `service.name` in the header.\n- Move the cookie banner macro.\n',
  [`${runFolder}/${ADMIN}/version__5.5.0.changelog.md`]:
    '## v5.5.0 (Feature release)\n\n- Fix Sass deprecation warnings.\n',
  [`${runFolder}/${ADMIN}/version__5.6.0.changelog.md`]:
    '## v5.6.0 (Feature release)\n\n- Enhance the file upload component.\n',
  [`${runFolder}/${ADMIN}/version__5.7.0.changelog.md`]:
    '## v5.7.0 (Feature release)\n\n- Change the header markup.\n',
  [`${runFolder}/${ADMIN}/version__5.8.0.changelog.md`]:
    '## v5.8.0 (Feature release)\n\n- Nothing for this repo.\n'
}

const otherRuns = {
  'workareas/govuk-upgrades/EUDPA-300/.run-meta.json': '{}\n',
  'workareas/govuk-upgrades/EUDPA-301/only-repo/versions.only-repo.json':
    jsonText(stateFile('only-repo', '5.0.0', '5.0.0', []))
}

/**
 * A workspace holding one govuk-frontend upgrade run with three repos, a
 * run folder with no state files and a run whose one repo has no versions.
 *
 * @param {{scripts?: string[]}} [opts]
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stageGovukWorkspace = ({ scripts = [] } = {}) =>
  stageBashWorkspace({
    scripts,
    files: {
      'repos.json': '{}\n',
      'docs/best-practices/README.md': '# Best practices\n',
      ...stateFiles,
      ...changelogFiles,
      ...otherRuns
    }
  })

const FILTERS = ['unplanned', 'todo', 'noop', 'done', 'failed', 'pending']

const plansListings = [
  { name: 'every repo', args: ['--run-id', RUN_ID] },
  { name: 'one repo', args: ['--run-id', RUN_ID, '--repo', ADMIN] },
  {
    name: 'every repo by semver',
    args: ['--run-id', RUN_ID, '--sort-semver']
  },
  ...FILTERS.flatMap((filter) => [
    {
      name: `filter ${filter}`,
      args: ['--run-id', RUN_ID, '--filter', filter]
    },
    {
      name: `filter ${filter} by semver on one repo`,
      args: [
        '--run-id',
        RUN_ID,
        '--repo',
        ADMIN,
        '--filter',
        filter,
        '--sort-semver'
      ]
    }
  ]),
  { name: 'repo with no versions', args: ['--run-id', 'EUDPA-301'] }
]

export const plansCases = plansListings.flatMap(({ name, args }) => [
  { name, args },
  { name: `${name} as JSON`, args: [...args, '--json'] }
])

export const plansRefusals = [
  { name: 'no run id', args: [] },
  { name: 'unknown filter', args: ['--run-id', RUN_ID, '--filter', 'later'] },
  { name: 'missing run folder', args: ['--run-id', 'EUDPA-999'] },
  { name: 'run folder with no state files', args: ['--run-id', 'EUDPA-300'] },
  {
    name: 'repo with no state file',
    args: ['--run-id', RUN_ID, '--repo', 'trade-imports-stub']
  }
]

export const summariesCases = [
  { name: 'every repo', args: ['--run-id', RUN_ID] },
  { name: 'every repo as JSON', args: ['--run-id', RUN_ID, '--json'] },
  { name: 'one repo', args: ['--run-id', RUN_ID, '--repo', ADMIN] },
  {
    name: 'one repo as JSON',
    args: ['--run-id', RUN_ID, '--repo', ADMIN, '--json']
  },
  { name: 'run folder with no state files', args: ['--run-id', 'EUDPA-300'] },
  {
    name: 'run folder with no state files as JSON',
    args: ['--run-id', 'EUDPA-300', '--json']
  },
  {
    name: 'repo with no state file',
    args: ['--run-id', RUN_ID, '--repo', 'trade-imports-stub']
  },
  { name: 'repo with no versions', args: ['--run-id', 'EUDPA-301'] },
  {
    name: 'repo with no versions as JSON',
    args: ['--run-id', 'EUDPA-301', '--json']
  }
]

export const summariesRefusals = [
  { name: 'no run id', args: [] },
  { name: 'missing run folder', args: ['--run-id', 'EUDPA-999'] }
]

const renderArgs = (repo, version) => [
  '--run-id',
  RUN_ID,
  '--repo',
  repo,
  '--version',
  version
]

export const renderCases = [
  { name: 'todo with changes', args: renderArgs(ADMIN, '5.9.1') },
  { name: 'todo with no changes', args: renderArgs(ADMIN, '5.8.0') },
  { name: 'noop', args: renderArgs(ADMIN, '5.5.0') },
  { name: 'not classified', args: renderArgs(ADMIN, '5.10.0') },
  { name: 'done with a commit', args: renderArgs(ADMIN, '5.6.0') },
  { name: 'failed with a reason', args: renderArgs(ADMIN, '5.7.0') },
  { name: 'no changelog', args: renderArgs(FRONTEND, '5.10.0') }
]

export const renderRefusals = [
  { name: 'unknown version', args: renderArgs(ADMIN, '4.0.0') },
  {
    name: 'repo with no state file',
    args: renderArgs('trade-imports-stub', '5.9.1')
  }
]
