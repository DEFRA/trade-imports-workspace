import { readFileSync } from 'node:fs'
import { ADMIN, RUN_ID } from './govuk-workspace.js'

export const WRITE_SCRIPT_FOR = {
  classify: 'tools/govuk/version-classify.sh',
  'add-change': 'tools/govuk/version-add-change.sh',
  'mark-done': 'tools/govuk/version-mark-implemented.sh',
  'mark-failed': 'tools/govuk/version-mark-failed.sh'
}

/**
 * What the Bash write scripts did on every case, as the golden test
 * recorded it.
 *
 * @returns {Record<string, object[]>} Runs by tim command name
 */
export const readGovukWritesGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/govuk-write-scripts.json', import.meta.url),
      'utf8'
    )
  )

const versionArgs = (version, repo = ADMIN) => [
  '--run-id',
  RUN_ID,
  '--repo',
  repo,
  '--version',
  version
]

const oneStep = (name, args) => ({ name, steps: [args] })

/**
 * Each case runs its steps in order on a fresh workspace from
 * `stageGovukWorkspace`, then the repo's state file is recorded. A step's
 * arguments are the Bash script's: tim takes `--govuk-version` for
 * `--version`.
 */
export const writeCases = {
  classify: [
    oneStep('todo with a summary on an unplanned version', [
      ...versionArgs('5.10.0'),
      '--classification',
      'todo',
      '--summary',
      'Rename the "header" macro — and its params'
    ]),
    oneStep('noop over a version with changes', [
      ...versionArgs('5.9.1'),
      '--classification',
      'noop'
    ]),
    oneStep('empty summary', [
      ...versionArgs('5.9.1'),
      '--classification',
      'todo',
      '--summary',
      ''
    ]),
    oneStep('no summary keeps the old one', [
      ...versionArgs('5.9.1'),
      '--classification',
      'todo'
    ]),
    oneStep('noop with a summary on a todo version with no changes', [
      ...versionArgs('5.8.0'),
      '--classification',
      'noop',
      '--summary',
      'Nothing for this repo'
    ]),
    oneStep('unknown version', [
      ...versionArgs('4.0.0'),
      '--classification',
      'todo'
    ]),
    oneStep('invalid classification', [
      ...versionArgs('5.10.0'),
      '--classification',
      'later'
    ]),
    oneStep('repo with no state file', [
      ...versionArgs('5.10.0', 'trade-imports-stub'),
      '--classification',
      'todo'
    ])
  ],
  'add-change': [
    {
      name: 'two changes keep their order',
      steps: [
        [
          ...versionArgs('5.8.0'),
          '--file',
          'src/server/common/templates/layouts/page.njk',
          '--why',
          'The "header" macro changed — see the changelog',
          '--change',
          'Pass `classes` to `govukHeader`'
        ],
        [
          ...versionArgs('5.8.0'),
          '--file',
          'src/client/stylesheets/application.scss',
          '--why',
          'Sass mixin renamed',
          '--change',
          "Use `govuk-media-query` in place of `mq`, it's renamed"
        ]
      ]
    },
    oneStep('unknown version', [
      ...versionArgs('4.0.0'),
      '--file',
      'a.njk',
      '--why',
      'why',
      '--change',
      'change'
    ]),
    oneStep('repo with no state file', [
      ...versionArgs('5.8.0', 'trade-imports-stub'),
      '--file',
      'a.njk',
      '--why',
      'why',
      '--change',
      'change'
    ])
  ],
  'mark-done': [
    oneStep('with a commit', [
      ...versionArgs('5.9.1'),
      '--commit',
      '0123456789abcdef0123456789abcdef01234567'
    ]),
    oneStep('with no commit', versionArgs('5.5.0')),
    oneStep('with an empty commit', [...versionArgs('5.5.0'), '--commit', '']),
    oneStep('after a failure clears the reason', [
      ...versionArgs('5.7.0'),
      '--commit',
      'fedcba9'
    ]),
    oneStep('unknown version', versionArgs('4.0.0')),
    oneStep(
      'repo with no state file',
      versionArgs('5.5.0', 'trade-imports-stub')
    )
  ],
  'mark-failed': [
    oneStep('reason with quotes and an em dash', [
      ...versionArgs('5.8.0'),
      '--reason',
      'npm test failed — "header" snapshot, see /tmp/govuk-test.txt'
    ]),
    oneStep('over a done version', [
      ...versionArgs('5.6.0'),
      '--reason',
      'Reverted by hand'
    ]),
    oneStep('unknown version', [
      ...versionArgs('4.0.0'),
      '--reason',
      'Any reason'
    ]),
    oneStep('repo with no state file', [
      ...versionArgs('5.8.0', 'trade-imports-stub'),
      '--reason',
      'Any reason'
    ])
  ]
}
