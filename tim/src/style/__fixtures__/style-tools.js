import { normaliseRecordedText } from '../../test-support/bash-golden-harness.js'

export const styleId = 'EUDPA-9301'
export const emptyStyleId = 'EUDPA-9302'
export const missingStyleId = 'EUDPA-9399'
export const localStyleId = 'local/trade-imports-stub/feat/NO_JIRA-style'

const backend = 'trade-imports-animals-backend'
const frontend = 'trade-imports-animals-frontend'
const stub = 'trade-imports-stub'
const schemas = 'trade-imports-schemas'

const styleFolder = `workareas/code-style-reviews/${styleId}`

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const backendItems = {
  ticket: styleId,
  repo: backend,
  items: [
    {
      id: 1,
      file: 'src/main/java/Notification.java',
      line: '12',
      rule: '4',
      category: 'naming',
      severity: 'FAIL',
      issue: 'Vague name | here',
      fix: 'Rename it',
      disposition: null,
      status: null,
      notes: null
    },
    {
      id: 2,
      file: 'src/main/java/Notification.java',
      line: '30',
      rule: '7',
      severity: 'WARN',
      issue: 'Tab\there, a newline\nthere and a back\\slash',
      fix: 'Split it\ninto two',
      disposition: 'Fix',
      status: 'Not Done',
      notes: null
    },
    {
      id: 3,
      file: 'src/main/java/Store.java',
      line: 7,
      rule: 'code-quality',
      category: 'comments',
      severity: 'WARN',
      issue: 'Stale comment',
      fix: 'Delete it',
      disposition: 'Fix',
      status: 'Done',
      notes: 'abc1234'
    },
    {
      id: 4,
      file: 'src/main/java/Store.java',
      rule: '2',
      severity: 'FAIL',
      issue: 'Long method',
      fix: 'Extract it',
      disposition: 'Fix',
      status: 'Failed',
      notes: 'Tests went red'
    },
    {
      id: 5,
      file: 'pom.xml',
      line: '',
      rule: null,
      category: 'design',
      severity: 'WARN',
      issue: 'Pins an old plugin',
      fix: 'Bump it',
      disposition: 'Discuss',
      status: 'Not Done',
      notes: 'Ask the platform team'
    },
    {
      id: 7,
      file: 'pom.xml',
      line: '3',
      rule: '1',
      category: 'duplication',
      severity: 'WARN',
      issue: 'Same version twice',
      fix: 'Use a property',
      disposition: "Won't Fix",
      status: '—',
      notes: 'House style allows it',
      best_practice: 'docs/best-practices/java/maven.md'
    }
  ]
}

const frontendItems = {
  ticket: styleId,
  repo: frontend,
  items: [
    {
      id: 1,
      file: 'src/server/app/index.js',
      line: '4',
      rule: '3',
      severity: 'WARN',
      issue: 'Abbreviated name',
      fix: 'Spell it out',
      disposition: 'Auto-Resolved',
      status: '—',
      notes: 'resolved 2026-11-01'
    },
    {
      id: 2,
      file: 'src/server/app/page.js',
      line: '9',
      rule: '11',
      severity: 'FAIL',
      issue: 'Nested ternary',
      fix: 'Use if',
      disposition: '',
      status: '',
      notes: ''
    }
  ]
}

const styleFile = (fields) => ({
  repo: backend,
  commit: 'aaaa111',
  pr: 11,
  mode: 'FRESH',
  reviewed_at: null,
  verdict: null,
  verdict_reason: null,
  todos: [],
  ...fields
})

const backendStyleFiles = {
  'pom.xml': styleFile({
    file: 'pom.xml',
    reviewed_at: '2026-11-10T09:00:00Z',
    reconciled_at: '2026-11-11T09:00:00Z',
    verdict: 'MINOR_ISSUES',
    verdict_reason: 'One warning',
    todos: [
      {
        id: 1,
        line: '3',
        rule: '1',
        category: 'duplication',
        severity: 'WARN',
        issue: 'Same version twice',
        fix: 'Use a property'
      }
    ]
  }),
  'src_main_java_Notification.java': styleFile({
    file: 'src/main/java/Notification.java',
    reviewed_at: '2026-11-10T10:00:00Z',
    reconciled_at: '2026-11-09T10:00:00Z',
    verdict: 'NEEDS_WORK',
    verdict_reason: 'Two findings',
    todos: [
      {
        id: 1,
        line: '12',
        rule: '4',
        category: 'naming',
        severity: 'FAIL',
        issue: 'Still a vague name | here',
        fix: 'Must: rename it. One way: call it notice',
        best_practice: 'docs/best-practices/node/code-style.md'
      },
      {
        id: 2,
        line: '',
        rule: '9',
        severity: 'WARN',
        issue: 'Magic number',
        fix: 'Name it'
      }
    ]
  }),
  'src_main_java_Store.java': styleFile({
    file: 'src/main/java/Store.java',
    reviewed_at: '2026-11-12T10:00:00Z',
    verdict: 'COMPLIANT',
    verdict_reason: '',
    todos: [
      {
        id: 1,
        line: 40,
        rule: null,
        category: 'logging',
        severity: 'WARN',
        issue: 'Logs only the message',
        fix: 'Log the error'
      }
    ]
  }),
  'src_main_java_Zebra.java': styleFile({ file: 'src/main/java/Zebra.java' })
}

const frontendStyleFiles = {
  'src_server_app_index.js': styleFile({
    repo: frontend,
    pr: 12,
    file: 'src/server/app/index.js',
    reviewed_at: '2026-11-10T10:00:00Z',
    verdict: 'NEEDS_WORK',
    todos: [
      {
        id: 1,
        line: '4',
        rule: '3',
        category: 'naming',
        severity: 'FAIL',
        issue: 'Abbreviated name',
        fix: 'Must: spell it out.'
      },
      {
        id: 2,
        line: '8',
        rule: '6',
        severity: 'WARN',
        issue: 'Long line',
        fix: 'Wrap it'
      }
    ]
  }),
  'src_server_app_views.njk': styleFile({
    repo: frontend,
    pr: 12,
    file: 'src/server/app/views.njk',
    verdict: 'SOMETHING_ELSE'
  })
}

const styleFilesUnder = (repo, files) =>
  Object.fromEntries(
    Object.entries(files).map(([name, review]) => [
      `${styleFolder}/file-reviews/${repo}/${name}.style.json`,
      jsonText(review)
    ])
  )

export const toolsFiles = {
  [`${styleFolder}/items.${backend}.json`]: jsonText(backendItems),
  [`${styleFolder}/items.${frontend}.json`]: jsonText(frontendItems),
  ...styleFilesUnder(backend, backendStyleFiles),
  ...styleFilesUnder(frontend, frontendStyleFiles),
  [`${styleFolder}/file-reviews/${stub}/notes.txt`]: 'not a review\n',
  [`workareas/code-style-reviews/${emptyStyleId}/.style-meta.json`]: '{}\n',
  [`workareas/code-style-reviews/${localStyleId}/file-reviews/${stub}/README.md.style.json`]:
    jsonText(styleFile({ repo: stub, pr: null, file: 'README.md' }))
}

export const toolsWatchFolder = 'workareas'

/**
 * The recorded files a step wrote: those new to the fixture or no longer
 * as the fixture holds them, compared with timestamps normalised.
 *
 * @param {Record<string, string>} files - Keyed by path inside {@link toolsWatchFolder}
 * @returns {Record<string, string>}
 */
export const filesWritten = (files) =>
  Object.fromEntries(
    Object.entries(files).filter(([path, content]) => {
      const before = toolsFiles[`${toolsWatchFolder}/${path}`]
      return (
        before === undefined ||
        normaliseRecordedText(before, '<no home>') !== content
      )
    })
  )

const SCRIPTS = {
  'items list': 'tools/style/style-items.sh',
  'items counts': 'tools/style/style-counts.sh',
  'items add': 'tools/style/style-add-item.sh',
  'items mark': 'tools/style/style-mark.sh',
  'items status': 'tools/style/style-set-status.sh',
  'items render': 'tools/style/render-items.sh',
  'file add': 'tools/style/file-style-add-item.sh',
  'file verdict': 'tools/style/file-style-set-verdict.sh',
  aggregate: 'tools/style/aggregate-file-reviews.sh',
  reconcile: 'tools/style/refresh/reconcile.sh'
}

export const toolsScripts = [
  ...Object.values(SCRIPTS),
  'tools/style/items-table.jq',
  'tools/review/finding-categories.sh'
]

/**
 * The script a step's tim command replaces.
 *
 * @param {string} command - `items list`, `file add`, `aggregate` and so on
 * @returns {string}
 */
export const scriptFor = (command) => SCRIPTS[command]

const step = (command, ...args) => ({ command, args })
const repoOf = (repo) => ['--repo', repo]
const notification = ['--file', 'src/main/java/Notification.java']
const fullItem = [
  '--file',
  'src/main/java/New.java',
  '--line',
  '41',
  '--rule',
  '5',
  '--severity',
  'FAIL',
  '--issue',
  'Mutates its input',
  '--fix',
  'Must: copy it. One way: spread'
]
const fullTodo = [
  '--line',
  '41',
  '--rule',
  '5',
  '--category',
  'structure',
  '--severity',
  'FAIL',
  '--issue',
  'Mutates its input',
  '--fix',
  'Copy it'
]

const listCases = [
  { name: 'items list as TSV', steps: [step('items list', styleId)] },
  {
    name: 'items list as JSON',
    steps: [step('items list', styleId, '--json')]
  },
  {
    name: 'items list for one repo',
    steps: [step('items list', styleId, ...repoOf(frontend))]
  },
  {
    name: 'items list for a repo with no items file',
    steps: [step('items list', styleId, ...repoOf(stub))]
  },
  {
    name: 'items list as JSON for a repo with no items file',
    steps: [step('items list', styleId, ...repoOf(stub), '--json')]
  },
  {
    name: 'items list for a style review with no items files',
    steps: [step('items list', emptyStyleId)]
  },
  ...['pending', 'fix', 'wont-fix', 'discuss', 'auto-resolved'].map(
    (filter) => ({
      name: `items list --filter ${filter}`,
      steps: [step('items list', styleId, '--filter', filter)]
    })
  ),
  ...['not-done', 'done', 'failed'].map((status) => ({
    name: `items list --status ${status}`,
    steps: [step('items list', styleId, '--status', status)]
  })),
  {
    name: 'items list for one file',
    steps: [step('items list', styleId, '--file', 'src/main/java/Store.java')]
  },
  {
    name: 'items list with a filter, a status and a repo together',
    steps: [
      step(
        'items list',
        styleId,
        ...repoOf(backend),
        '--filter',
        'fix',
        '--status',
        'not-done'
      )
    ]
  },
  {
    name: 'items list --by-file groups the items by repo and file',
    steps: [
      step(
        'items list',
        styleId,
        '--filter',
        'fix',
        '--status',
        'not-done',
        '--by-file'
      )
    ]
  },
  {
    name: 'items list --by-file --json',
    steps: [step('items list', styleId, '--by-file', '--json')]
  },
  {
    name: 'items list --by-file for a file with no items',
    steps: [
      step('items list', styleId, '--file', 'src/Missing.java', '--by-file')
    ]
  },
  {
    name: 'items list --by-file with a filter that matches nothing',
    steps: [
      step(
        'items list',
        styleId,
        ...repoOf(frontend),
        '--status',
        'failed',
        '--by-file'
      )
    ]
  },
  {
    name: 'items list --by-file for a repo with no items file',
    steps: [step('items list', styleId, ...repoOf(stub), '--by-file')]
  },
  {
    name: 'items list with a filter it does not know',
    steps: [step('items list', styleId, '--filter', 'merged')]
  },
  {
    name: 'items list with a status it does not know',
    steps: [step('items list', styleId, '--status', 'open')]
  },
  {
    name: 'items list for a missing style review',
    steps: [step('items list', missingStyleId)]
  },
  {
    name: 'items list with no review id',
    usage: true,
    steps: [step('items list')]
  }
]

const countsCases = [
  { name: 'items counts as text', steps: [step('items counts', styleId)] },
  {
    name: 'items counts as JSON',
    steps: [step('items counts', styleId, '--json')]
  },
  {
    name: 'items counts for one repo',
    steps: [step('items counts', styleId, ...repoOf(frontend))]
  },
  {
    name: 'items counts for a style review with no items files',
    steps: [step('items counts', emptyStyleId)]
  },
  {
    name: 'items counts as JSON for a style review with no items files',
    steps: [step('items counts', emptyStyleId, '--json')]
  },
  {
    name: 'items counts for a repo with no items file',
    steps: [step('items counts', styleId, ...repoOf(stub))]
  },
  {
    name: 'items counts for a missing style review',
    steps: [step('items counts', missingStyleId)]
  },
  {
    name: 'items counts with no review id',
    usage: true,
    steps: [step('items counts')]
  }
]

const addCases = [
  {
    name: 'items add after the highest id, with a category and a best practice',
    steps: [
      step(
        'items add',
        styleId,
        ...repoOf(backend),
        ...fullItem,
        '--category',
        'structure',
        '--best-practice',
        'docs/best-practices/node/code-style.md'
      )
    ]
  },
  {
    name: 'items add with no category and an empty line',
    steps: [
      step(
        'items add',
        styleId,
        ...repoOf(backend),
        '--file',
        'pom.xml',
        '--line',
        '',
        '--rule',
        '2',
        '--severity',
        'WARN',
        '--issue',
        'x',
        '--fix',
        'y'
      )
    ]
  },
  {
    name: 'items add starting a repo items file',
    steps: [step('items add', localStyleId, ...repoOf(stub), ...fullItem)]
  },
  {
    name: 'items add starting the style review folder',
    steps: [step('items add', 'EUDPA-9303', ...repoOf(stub), ...fullItem)]
  },
  {
    name: 'items add with no rule',
    usage: true,
    steps: [
      step(
        'items add',
        styleId,
        ...repoOf(backend),
        '--file',
        'pom.xml',
        '--line',
        '1',
        '--severity',
        'WARN',
        '--issue',
        'x',
        '--fix',
        'y'
      )
    ]
  },
  {
    name: 'items add with a severity it does not know',
    steps: [
      step(
        'items add',
        styleId,
        ...repoOf(backend),
        '--file',
        'pom.xml',
        '--line',
        '1',
        '--rule',
        '2',
        '--severity',
        'Major',
        '--issue',
        'x',
        '--fix',
        'y'
      )
    ]
  },
  {
    name: 'items add with a category outside the code-quality categories',
    steps: [
      step(
        'items add',
        styleId,
        ...repoOf(backend),
        ...fullItem,
        '--category',
        'correctness'
      )
    ]
  },
  {
    name: 'items add with no review id',
    usage: true,
    steps: [step('items add', ...repoOf(backend), ...fullItem)]
  }
]

const markCases = [
  ...['Fix', "Won't Fix", 'Discuss', 'Auto-Resolved', ''].map(
    (disposition) => ({
      name: `items mark --disposition "${disposition}"`,
      steps: [
        step(
          'items mark',
          styleId,
          ...repoOf(backend),
          '--item',
          '1',
          '--disposition',
          disposition
        )
      ]
    })
  ),
  {
    name: 'items mark with no disposition clears it',
    steps: [step('items mark', styleId, ...repoOf(backend), '--item', '5')]
  },
  {
    name: 'items mark with a note',
    steps: [
      step(
        'items mark',
        styleId,
        ...repoOf(backend),
        '--item',
        '3',
        '--disposition',
        "Won't Fix",
        '--note',
        'Out of scope'
      )
    ]
  },
  {
    name: 'items mark with an empty note',
    steps: [
      step(
        'items mark',
        styleId,
        ...repoOf(backend),
        '--item',
        '3',
        '--disposition',
        'Discuss',
        '--note',
        ''
      )
    ]
  },
  {
    name: 'items mark Merged, which style items do not have',
    steps: [
      step(
        'items mark',
        styleId,
        ...repoOf(backend),
        '--item',
        '1',
        '--disposition',
        'Merged',
        '--note',
        'merged into #5'
      )
    ]
  },
  {
    name: 'items mark an item that is not there',
    steps: [
      step(
        'items mark',
        styleId,
        ...repoOf(backend),
        '--item',
        '6',
        '--disposition',
        'Fix'
      )
    ]
  },
  {
    name: 'items mark in a repo with no items file',
    steps: [
      step(
        'items mark',
        styleId,
        ...repoOf(stub),
        '--item',
        '1',
        '--disposition',
        'Fix'
      )
    ]
  },
  {
    name: 'items mark with no repo',
    usage: true,
    steps: [step('items mark', styleId, '--item', '1', '--disposition', 'Fix')]
  },
  {
    name: 'items mark with no item',
    usage: true,
    steps: [
      step('items mark', styleId, ...repoOf(backend), '--disposition', 'Fix')
    ]
  }
]

const statusCases = [
  ...['Not Done', 'Done', 'Failed', '—', ''].map((status) => ({
    name: `items status --status "${status}"`,
    steps: [
      step(
        'items status',
        styleId,
        ...repoOf(backend),
        '--item',
        '2',
        '--status',
        status
      )
    ]
  })),
  {
    name: 'items status with a note',
    steps: [
      step(
        'items status',
        styleId,
        ...repoOf(backend),
        '--item',
        '2',
        '--status',
        'Done',
        '--note',
        'f00d123'
      )
    ]
  },
  {
    name: 'items status with an empty note',
    steps: [
      step(
        'items status',
        styleId,
        ...repoOf(backend),
        '--item',
        '3',
        '--status',
        'Failed',
        '--note',
        ''
      )
    ]
  },
  {
    name: 'items status it does not know',
    steps: [
      step(
        'items status',
        styleId,
        ...repoOf(backend),
        '--item',
        '2',
        '--status',
        'Skipped'
      )
    ]
  },
  {
    name: 'items status for an item that is not there',
    steps: [
      step(
        'items status',
        styleId,
        ...repoOf(backend),
        '--item',
        '6',
        '--status',
        'Done'
      )
    ]
  },
  {
    name: 'items status in a repo with no items file',
    steps: [
      step(
        'items status',
        styleId,
        ...repoOf(stub),
        '--item',
        '1',
        '--status',
        'Done'
      )
    ]
  },
  {
    name: 'items status with no item',
    usage: true,
    steps: [
      step('items status', styleId, ...repoOf(backend), '--status', 'Done')
    ]
  }
]

const renderCases = [
  {
    name: 'items render prints the table',
    steps: [step('items render', styleId, ...repoOf(backend))]
  },
  {
    name: 'items render refuses a repo with no items file',
    steps: [step('items render', styleId, ...repoOf(stub))]
  },
  {
    name: 'items render refuses no --repo',
    steps: [step('items render', styleId)]
  },
  {
    name: 'items render refuses no review id',
    usage: true,
    steps: [step('items render', ...repoOf(backend))]
  }
]

const fileCases = [
  {
    name: 'file add after the highest todo id, with a best practice',
    steps: [
      step(
        'file add',
        styleId,
        ...repoOf(backend),
        ...notification,
        ...fullTodo,
        '--best-practice',
        'docs/best-practices/java/modern-java.md'
      )
    ]
  },
  {
    name: 'file add with an empty line, into a review with no todos',
    steps: [
      step(
        'file add',
        localStyleId,
        ...repoOf(stub),
        '--file',
        'README.md',
        '--line',
        '',
        '--rule',
        'code-quality',
        '--category',
        'history',
        '--severity',
        'WARN',
        '--issue',
        'Names the old ticket',
        '--fix',
        'Drop it'
      ),
      step(
        'file add',
        localStyleId,
        ...repoOf(stub),
        '--file',
        'README.md',
        ...fullTodo
      )
    ]
  },
  {
    name: 'file add with no category',
    steps: [
      step(
        'file add',
        styleId,
        ...repoOf(backend),
        ...notification,
        '--line',
        '1',
        '--rule',
        '2',
        '--severity',
        'WARN',
        '--issue',
        'x',
        '--fix',
        'y'
      )
    ]
  },
  {
    name: 'file add with a severity it does not know',
    steps: [
      step(
        'file add',
        styleId,
        ...repoOf(backend),
        ...notification,
        '--line',
        '1',
        '--rule',
        '2',
        '--category',
        'naming',
        '--severity',
        'Minor',
        '--issue',
        'x',
        '--fix',
        'y'
      )
    ]
  },
  {
    name: 'file add with a category outside the code-quality categories',
    steps: [
      step(
        'file add',
        styleId,
        ...repoOf(backend),
        ...notification,
        '--line',
        '1',
        '--rule',
        '2',
        '--category',
        'security',
        '--severity',
        'WARN',
        '--issue',
        'x',
        '--fix',
        'y'
      )
    ]
  },
  {
    name: 'file add with no style file',
    steps: [
      step(
        'file add',
        styleId,
        ...repoOf(backend),
        '--file',
        'src/Missing.java',
        ...fullTodo
      )
    ]
  },
  {
    name: 'file add with no review id',
    steps: [step('file add', ...repoOf(backend), ...notification, ...fullTodo)]
  },
  {
    name: 'file verdict with a reason',
    steps: [
      step(
        'file verdict',
        styleId,
        ...repoOf(backend),
        ...notification,
        '--verdict',
        'NEEDS_WORK',
        '--reason',
        'Mutates its input'
      )
    ]
  },
  {
    name: 'file verdict with no reason',
    steps: [
      step(
        'file verdict',
        localStyleId,
        ...repoOf(stub),
        '--file',
        'README.md',
        '--verdict',
        'COMPLIANT'
      )
    ]
  },
  {
    name: 'file verdict it does not know',
    steps: [
      step(
        'file verdict',
        styleId,
        ...repoOf(backend),
        ...notification,
        '--verdict',
        'SAFE'
      )
    ]
  },
  {
    name: 'file verdict with no style file',
    steps: [
      step(
        'file verdict',
        styleId,
        ...repoOf(backend),
        '--file',
        'src/Missing.java',
        '--verdict',
        'MINOR_ISSUES'
      )
    ]
  },
  {
    name: 'file verdict with no verdict',
    steps: [step('file verdict', styleId, ...repoOf(backend), ...notification)]
  }
]

const aggregateCases = [
  {
    name: 'aggregate prints both sections, the items from the items file',
    steps: [step('aggregate', styleId, ...repoOf(backend))]
  },
  {
    name: 'aggregate prints the file summary',
    steps: [
      step(
        'aggregate',
        styleId,
        ...repoOf(backend),
        '--section',
        'file-summary'
      )
    ]
  },
  {
    name: 'aggregate prints the items from the file reviews when there is no items file',
    steps: [
      step('aggregate', localStyleId, ...repoOf(stub), '--section', 'items'),
      step('aggregate', styleId, ...repoOf(frontend), '--section', 'items')
    ]
  },
  {
    name: 'aggregate --json gives each file rollup',
    steps: [step('aggregate', styleId, ...repoOf(frontend), '--json')]
  },
  {
    name: 'aggregate --write-items writes the items file and stamps the reviewed files',
    steps: [
      step(
        'aggregate',
        styleId,
        ...repoOf(backend),
        '--write-items',
        '--section',
        'file-summary'
      ),
      step('items list', styleId, ...repoOf(backend))
    ]
  },
  {
    name: 'aggregate --write-items --json writes the items and gives the rollup',
    steps: [
      step('aggregate', styleId, ...repoOf(frontend), '--write-items', '--json')
    ]
  },
  {
    name: 'aggregate refuses an unknown section after writing the items',
    steps: [
      step(
        'aggregate',
        localStyleId,
        ...repoOf(stub),
        '--write-items',
        '--section',
        'all'
      )
    ]
  },
  {
    name: 'aggregate refuses a repo with no file reviews folder',
    steps: [step('aggregate', styleId, ...repoOf(schemas))]
  },
  {
    name: 'aggregate refuses a folder with no style files',
    steps: [step('aggregate', styleId, ...repoOf(stub))]
  },
  {
    name: 'aggregate refuses no --repo',
    steps: [step('aggregate', styleId)]
  },
  {
    name: 'aggregate refuses no review id',
    steps: [step('aggregate', ...repoOf(backend))]
  }
]

const reconcileCases = [
  {
    name: 'reconcile folds in the stale and fresh style files and lists the spot-checks',
    steps: [step('reconcile', styleId, ...repoOf(backend))]
  },
  {
    name: 'reconcile run twice adds nothing the second time',
    steps: [
      step('reconcile', styleId, ...repoOf(backend)),
      step('reconcile', styleId, ...repoOf(backend), '--json')
    ]
  },
  {
    name: 'reconcile --json gives the summary',
    steps: [step('reconcile', styleId, ...repoOf(backend), '--json')]
  },
  {
    name: 'reconcile --dry-run changes nothing',
    steps: [step('reconcile', styleId, ...repoOf(backend), '--dry-run')]
  },
  {
    name: 'reconcile --dry-run --json',
    steps: [
      step('reconcile', styleId, ...repoOf(backend), '--dry-run', '--json')
    ]
  },
  {
    name: 'reconcile --force folds in the reconciled file too',
    steps: [step('reconcile', styleId, ...repoOf(backend), '--force')]
  },
  {
    name: 'reconcile folds in a file given a finding and a verdict',
    steps: [
      step(
        'file add',
        styleId,
        ...repoOf(frontend),
        '--file',
        'src/server/app/index.js',
        '--line',
        '20',
        '--rule',
        '8',
        '--category',
        'structure',
        '--severity',
        'FAIL',
        '--issue',
        'Deep nesting',
        '--fix',
        'Return early'
      ),
      step(
        'file verdict',
        styleId,
        ...repoOf(frontend),
        '--file',
        'src/server/app/index.js',
        '--verdict',
        'NEEDS_WORK'
      ),
      step('reconcile', styleId, ...repoOf(frontend))
    ]
  },
  {
    name: 'reconcile refuses a repo with no items file',
    steps: [step('reconcile', localStyleId, ...repoOf(stub))]
  },
  {
    name: 'reconcile refuses a repo with no file reviews folder',
    steps: [step('reconcile', styleId, ...repoOf(schemas))]
  },
  {
    name: 'reconcile refuses no --repo',
    steps: [step('reconcile', styleId)]
  },
  {
    name: 'reconcile refuses no review id',
    steps: [step('reconcile', ...repoOf(backend))]
  }
]

const walkerCases = [
  {
    name: 'a walker and implementor session: add, mark, fix, then report',
    steps: [
      step('items list', styleId, '--filter', 'pending', '--json'),
      step(
        'items mark',
        styleId,
        ...repoOf(frontend),
        '--item',
        '2',
        '--disposition',
        'Fix'
      ),
      step(
        'items mark',
        styleId,
        ...repoOf(backend),
        '--item',
        '1',
        '--disposition',
        'Discuss',
        '--note',
        'Ask the designer'
      ),
      step(
        'items list',
        styleId,
        '--filter',
        'fix',
        '--status',
        'not-done',
        '--by-file',
        '--json'
      ),
      step(
        'items status',
        styleId,
        ...repoOf(frontend),
        '--item',
        '2',
        '--status',
        'Done',
        '--note',
        '1a2b3c4'
      ),
      step('items render', styleId, ...repoOf(frontend)),
      step('items counts', styleId)
    ]
  }
]

/**
 * Each case's name and steps. Each case runs on a fresh copy of
 * {@link toolsFiles}. `usage: true` marks a case where Bash printed its
 * own usage text, so only the exit code and the first line Bash printed
 * before it are compared there.
 */
export const toolsCases = [
  ...listCases,
  ...countsCases,
  ...addCases,
  ...markCases,
  ...statusCases,
  ...renderCases,
  ...fileCases,
  ...aggregateCases,
  ...reconcileCases,
  ...walkerCases
]
