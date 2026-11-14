export const ticketReviewId = 'EUDPA-9001'
export const localReviewId = 'local/trade-imports-stub/feat/NO_JIRA-ledger'
export const emptyLedgerReviewId = 'EUDPA-9002'

const ledgerFolder = `workareas/reviews/${ticketReviewId}`

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const backendItems = {
  ticket: ticketReviewId,
  repo: 'trade-imports-animals-backend',
  items: [
    {
      id: 1,
      file: 'src/main/java/Notification.java',
      line: '12',
      severity: 'Critical',
      category: 'security',
      issue: 'Logs the token',
      fix: 'Must: drop it. One way: redact it',
      disposition: null,
      status: null,
      notes: null
    },
    {
      id: 2,
      file: 'src/main/java/Notification.java',
      line: '30',
      severity: 'Major',
      category: 'correctness',
      issue: 'Tab\there, a newline\nthere and a back\\slash',
      fix: 'Split it',
      disposition: 'Fix',
      status: 'Not Done',
      notes: null
    },
    {
      id: 3,
      file: 'src/main/java/Store.java',
      line: 7,
      severity: 'Minor',
      category: 'naming',
      issue: 'Vague name',
      fix: 'Rename it',
      disposition: 'Fix',
      status: 'Done',
      notes: 'abc1234'
    },
    {
      id: 4,
      file: 'src/main/java/Store.java',
      severity: 'Minor',
      category: 'comments',
      issue: 'Stale comment',
      fix: 'Delete it',
      disposition: 'Fix',
      status: 'Failed',
      notes: 'Tests went red'
    },
    {
      id: 5,
      file: 'pom.xml',
      line: '',
      severity: 'Major',
      category: 'design',
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
      severity: 'Minor',
      category: 'duplication',
      issue: 'Same version twice',
      fix: 'Use a property',
      disposition: 'Merged',
      status: '—',
      notes: 'merged into #5',
      best_practice: 'docs/best-practices/java/maven.md'
    }
  ]
}

const frontendItems = {
  ticket: ticketReviewId,
  repo: 'trade-imports-animals-frontend',
  items: [
    {
      id: 1,
      file: 'src/server/app/index.js',
      line: '4',
      severity: 'Minor',
      category: 'naming',
      issue: 'Abbreviated name',
      fix: 'Spell it out',
      disposition: "Won't Fix",
      status: '—',
      notes: 'House style allows it'
    },
    {
      id: 2,
      file: 'src/server/app/index.js',
      line: '9',
      severity: 'Major',
      category: 'error-handling',
      issue: 'Swallows the error',
      fix: 'Rethrow',
      disposition: 'Auto-Resolved',
      status: '—',
      notes: 'File deleted'
    },
    {
      id: 3,
      file: 'README.md',
      line: '1',
      severity: 'Minor',
      category: 'comments',
      issue: 'Typo',
      fix: 'Fix the typo',
      disposition: '',
      status: '',
      notes: ''
    }
  ]
}

const existingFileReview = {
  file: 'src/main/java/Notification.java',
  repo: 'trade-imports-animals-backend',
  commit: 'aaaa111',
  pr: 12,
  mode: 'FRESH',
  reviewed_at: null,
  verdict: null,
  verdict_reason: null,
  todos: [
    {
      id: 1,
      line: 12,
      severity: 'Critical',
      category: 'security',
      issue: 'Logs the token',
      fix: 'Drop it'
    },
    {
      id: 4,
      line: 30,
      severity: 'Major',
      category: 'correctness',
      issue: 'Wrong status',
      fix: 'Return 404'
    }
  ]
}

export const ledgerFiles = {
  [`${ledgerFolder}/items.trade-imports-animals-backend.json`]:
    jsonText(backendItems),
  [`${ledgerFolder}/items.trade-imports-animals-frontend.json`]:
    jsonText(frontendItems),
  [`${ledgerFolder}/file-reviews/trade-imports-animals-backend/src_main_java_Notification.java.review.json`]:
    jsonText(existingFileReview),
  [`workareas/reviews/${emptyLedgerReviewId}/summary.md`]: '# Summary\n',
  [`workareas/reviews/${localReviewId}/summary.md`]: '# Summary\n'
}

export const ledgerWatchFolder = 'workareas/reviews'

/**
 * The recorded files a step wrote: those new to the ledger or no longer
 * as the ledger holds them.
 *
 * @param {Record<string, string>} files - Keyed by path inside {@link ledgerWatchFolder}
 * @returns {Record<string, string>}
 */
export const filesWritten = (files) =>
  Object.fromEntries(
    Object.entries(files).filter(
      ([path, content]) =>
        ledgerFiles[`${ledgerWatchFolder}/${path}`] !== content
    )
  )

const SCRIPTS = {
  'file init': 'tools/review/file-review-init.sh',
  'file add': 'tools/review/file-review-add-item.sh',
  'file verdict': 'tools/review/file-review-set-verdict.sh',
  'items list': 'tools/review/review-items.sh',
  'items counts': 'tools/review/review-counts.sh',
  'items add': 'tools/review/review-add-item.sh',
  'items mark': 'tools/review/review-mark.sh',
  'items status': 'tools/review/review-set-status.sh'
}

export const ledgerScripts = [
  ...Object.values(SCRIPTS),
  'tools/review/finding-categories.sh'
]

/**
 * The script a step's tim command replaces.
 *
 * @param {string} command - `file init`, `items mark` and so on
 * @returns {string}
 */
export const scriptFor = (command) => SCRIPTS[command]

const backend = ['--repo', 'trade-imports-animals-backend']
const frontend = ['--repo', 'trade-imports-animals-frontend']
const notification = ['--file', 'src/main/java/Notification.java']
const fullFinding = [
  '--line',
  '41',
  '--severity',
  'Major',
  '--category',
  'correctness',
  '--issue',
  'Returns 200 for a missing id',
  '--fix',
  'Must: return 404. One way: throw NotFound'
]

const step = (command, ...args) => ({ command, args })

/**
 * Each case's name, its steps and, when the Bash printed its own usage
 * text, `usage: true`: tim prints its own usage there, so only the exit
 * code and the first line Bash printed before its usage are compared.
 */
export const ledgerCases = [
  {
    name: 'file init with a PR',
    steps: [
      step(
        'file init',
        ticketReviewId,
        ...backend,
        '--file',
        'src/main/java/New.java',
        '--commit',
        'bbbb222',
        '--pr',
        '42',
        '--mode',
        'FRESH'
      )
    ]
  },
  {
    name: 'file init for a local review, with no PR',
    steps: [
      step(
        'file init',
        localReviewId,
        '--repo',
        'trade-imports-stub',
        '--file',
        'src/main/java/uk/gov/defra/Stub.java',
        '--commit',
        'cccc333',
        '--mode',
        'REFRESH'
      )
    ]
  },
  {
    name: 'file init over a review that has todos',
    steps: [
      step(
        'file init',
        ticketReviewId,
        ...backend,
        ...notification,
        '--commit',
        'dddd444',
        '--pr',
        '12',
        '--mode',
        'MERGE_RESOLVED'
      )
    ]
  },
  {
    name: 'file init with no commit',
    steps: [
      step(
        'file init',
        ticketReviewId,
        ...backend,
        ...notification,
        '--mode',
        'FRESH'
      )
    ]
  },
  {
    name: 'file init with no review id',
    steps: [
      step(
        'file init',
        ...backend,
        ...notification,
        '--commit',
        'x',
        '--mode',
        'FRESH'
      )
    ]
  },
  {
    name: 'file init with a mode it does not know',
    steps: [
      step(
        'file init',
        ticketReviewId,
        ...backend,
        ...notification,
        '--commit',
        'x',
        '--mode',
        'fresh'
      )
    ]
  },
  {
    name: 'file add after the highest todo id, with a best practice',
    steps: [
      step(
        'file add',
        ticketReviewId,
        ...backend,
        ...notification,
        ...fullFinding,
        '--best-practice',
        'docs/best-practices/java/modern-java.md'
      )
    ]
  },
  {
    name: 'file init, then two file adds',
    steps: [
      step(
        'file init',
        localReviewId,
        '--repo',
        'trade-imports-stub',
        '--file',
        'README.md',
        '--commit',
        'eeee555',
        '--mode',
        'FRESH'
      ),
      step(
        'file add',
        localReviewId,
        '--repo',
        'trade-imports-stub',
        '--file',
        'README.md',
        ...fullFinding
      ),
      step(
        'file add',
        localReviewId,
        '--repo',
        'trade-imports-stub',
        '--file',
        'README.md',
        '--line',
        '3',
        '--severity',
        'Minor',
        '--category',
        'history',
        '--issue',
        'Names the old ticket',
        '--fix',
        'Drop it'
      )
    ]
  },
  {
    name: 'file add with a severity it does not know',
    steps: [
      step(
        'file add',
        ticketReviewId,
        ...backend,
        ...notification,
        '--line',
        '1',
        '--severity',
        'Blocker',
        '--category',
        'correctness',
        '--issue',
        'x',
        '--fix',
        'y'
      )
    ]
  },
  {
    name: 'file add with a category outside the finding categories',
    steps: [
      step(
        'file add',
        ticketReviewId,
        ...backend,
        ...notification,
        '--line',
        '1',
        '--severity',
        'Minor',
        '--category',
        'style',
        '--issue',
        'x',
        '--fix',
        'y'
      )
    ]
  },
  {
    name: 'file add with no review file',
    steps: [
      step(
        'file add',
        ticketReviewId,
        ...backend,
        '--file',
        'src/Missing.java',
        ...fullFinding
      )
    ]
  },
  {
    name: 'file add with no fix',
    steps: [
      step(
        'file add',
        ticketReviewId,
        ...backend,
        ...notification,
        '--line',
        '1',
        '--severity',
        'Minor',
        '--category',
        'naming',
        '--issue',
        'x'
      )
    ]
  },
  {
    name: 'file verdict with a reason',
    steps: [
      step(
        'file verdict',
        ticketReviewId,
        ...backend,
        ...notification,
        '--verdict',
        'RISKY',
        '--reason',
        'Logs a token'
      )
    ]
  },
  {
    name: 'file verdict with no reason',
    steps: [
      step(
        'file verdict',
        ticketReviewId,
        ...backend,
        ...notification,
        '--verdict',
        'SAFE'
      )
    ]
  },
  {
    name: 'file verdict it does not know',
    steps: [
      step(
        'file verdict',
        ticketReviewId,
        ...backend,
        ...notification,
        '--verdict',
        'OK'
      )
    ]
  },
  {
    name: 'file verdict with no review file',
    steps: [
      step(
        'file verdict',
        ticketReviewId,
        ...backend,
        '--file',
        'src/Missing.java',
        '--verdict',
        'NEEDS_ATTENTION'
      )
    ]
  },
  {
    name: 'file verdict with no verdict',
    steps: [step('file verdict', ticketReviewId, ...backend, ...notification)]
  },
  {
    name: 'items list as TSV',
    steps: [step('items list', ticketReviewId)]
  },
  {
    name: 'items list for one repo',
    steps: [step('items list', ticketReviewId, ...frontend)]
  },
  {
    name: 'items list for a repo with no items file',
    steps: [step('items list', ticketReviewId, '--repo', 'trade-imports-stub')]
  },
  {
    name: 'items list for a review with no items files',
    steps: [step('items list', emptyLedgerReviewId)]
  },
  ...['pending', 'fix', 'wont-fix', 'discuss', 'auto-resolved', 'merged'].map(
    (filter) => ({
      name: `items list --filter ${filter}`,
      steps: [step('items list', ticketReviewId, '--filter', filter)]
    })
  ),
  ...['not-done', 'done', 'failed'].map((status) => ({
    name: `items list --status ${status}`,
    steps: [step('items list', ticketReviewId, '--status', status)]
  })),
  {
    name: 'items list for one file',
    steps: [
      step('items list', ticketReviewId, '--file', 'src/main/java/Store.java')
    ]
  },
  {
    name: 'items list with a filter, a status and a repo together',
    steps: [
      step(
        'items list',
        ticketReviewId,
        ...backend,
        '--filter',
        'fix',
        '--status',
        'not-done'
      )
    ]
  },
  {
    name: 'items list with a filter it does not know',
    steps: [step('items list', ticketReviewId, '--filter', 'open')]
  },
  {
    name: 'items list with a status it does not know',
    steps: [step('items list', ticketReviewId, '--status', 'open')]
  },
  {
    name: 'items list for a missing review',
    steps: [step('items list', 'EUDPA-404')]
  },
  {
    name: 'items list with no review id',
    usage: true,
    steps: [step('items list')]
  },
  {
    name: 'items counts as text',
    steps: [step('items counts', ticketReviewId)]
  },
  {
    name: 'items counts for one repo',
    steps: [step('items counts', ticketReviewId, ...frontend)]
  },
  {
    name: 'items counts for a review with no items files',
    steps: [step('items counts', emptyLedgerReviewId)]
  },
  {
    name: 'items counts for a repo with no items file',
    steps: [
      step('items counts', ticketReviewId, '--repo', 'trade-imports-stub')
    ]
  },
  {
    name: 'items counts for a missing review',
    steps: [step('items counts', 'EUDPA-404')]
  },
  {
    name: 'items add after the highest id, with a best practice',
    steps: [
      step(
        'items add',
        ticketReviewId,
        ...backend,
        ...notification,
        ...fullFinding,
        '--best-practice',
        'docs/best-practices/java/modern-java.md'
      )
    ]
  },
  {
    name: 'items add starting a repo items file',
    steps: [
      step(
        'items add',
        localReviewId,
        '--repo',
        'trade-imports-stub',
        '--file',
        'README.md',
        ...fullFinding
      )
    ]
  },
  {
    name: 'items add with no fix',
    usage: true,
    steps: [
      step(
        'items add',
        ticketReviewId,
        ...backend,
        ...notification,
        '--line',
        '1',
        '--severity',
        'Minor',
        '--category',
        'naming',
        '--issue',
        'x'
      )
    ]
  },
  {
    name: 'items add with a severity it does not know',
    steps: [
      step(
        'items add',
        ticketReviewId,
        ...backend,
        ...notification,
        '--line',
        '1',
        '--severity',
        'Low',
        '--category',
        'naming',
        '--issue',
        'x',
        '--fix',
        'y'
      )
    ]
  },
  {
    name: 'items add with a category outside the finding categories',
    steps: [
      step(
        'items add',
        ticketReviewId,
        ...backend,
        ...notification,
        '--line',
        '1',
        '--severity',
        'Minor',
        '--category',
        'style',
        '--issue',
        'x',
        '--fix',
        'y'
      )
    ]
  },
  ...['Fix', "Won't Fix", 'Discuss', 'Auto-Resolved', ''].map(
    (disposition) => ({
      name: `items mark --disposition "${disposition}"`,
      steps: [
        step(
          'items mark',
          ticketReviewId,
          ...backend,
          '--item',
          '1',
          '--disposition',
          disposition
        )
      ]
    })
  ),
  {
    name: 'items mark Merged naming the owner',
    steps: [
      step(
        'items mark',
        ticketReviewId,
        ...backend,
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
    name: 'items mark Merged with no note',
    steps: [
      step(
        'items mark',
        ticketReviewId,
        ...backend,
        '--item',
        '1',
        '--disposition',
        'Merged'
      )
    ]
  },
  {
    name: 'items mark Merged with a note that names no owner',
    steps: [
      step(
        'items mark',
        ticketReviewId,
        ...backend,
        '--item',
        '1',
        '--disposition',
        'Merged',
        '--note',
        'merged into the token one'
      )
    ]
  },
  {
    name: 'items mark with a note',
    steps: [
      step(
        'items mark',
        ticketReviewId,
        ...backend,
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
        ticketReviewId,
        ...backend,
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
    name: 'items mark with a disposition it does not know',
    steps: [
      step(
        'items mark',
        ticketReviewId,
        ...backend,
        '--item',
        '1',
        '--disposition',
        'Ignore'
      )
    ]
  },
  {
    name: 'items mark an item that is not there',
    steps: [
      step(
        'items mark',
        ticketReviewId,
        ...backend,
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
        ticketReviewId,
        '--repo',
        'trade-imports-stub',
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
    steps: [
      step('items mark', ticketReviewId, '--item', '1', '--disposition', 'Fix')
    ]
  },
  {
    name: 'items mark with no item',
    usage: true,
    steps: [
      step('items mark', ticketReviewId, ...backend, '--disposition', 'Fix')
    ]
  },
  ...['Not Done', 'Done', 'Failed', '—', ''].map((status) => ({
    name: `items status --status "${status}"`,
    steps: [
      step(
        'items status',
        ticketReviewId,
        ...backend,
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
        ticketReviewId,
        ...backend,
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
        ticketReviewId,
        ...backend,
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
        ticketReviewId,
        ...backend,
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
        ticketReviewId,
        ...backend,
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
        ticketReviewId,
        '--repo',
        'trade-imports-stub',
        '--item',
        '1',
        '--status',
        'Done'
      )
    ]
  },
  {
    name: 'a walker session: add, mark, fix, then report',
    steps: [
      step(
        'items add',
        ticketReviewId,
        ...frontend,
        '--file',
        'src/server/app/page.js',
        '--line',
        '18',
        '--severity',
        'Major',
        '--category',
        'coverage-gap',
        '--issue',
        'No test for the error page',
        '--fix',
        'Add one'
      ),
      step(
        'items mark',
        ticketReviewId,
        ...frontend,
        '--item',
        '4',
        '--disposition',
        'Fix'
      ),
      step(
        'items mark',
        ticketReviewId,
        ...backend,
        '--item',
        '1',
        '--disposition',
        "Won't Fix",
        '--note',
        'Token is a test value'
      ),
      step(
        'items list',
        ticketReviewId,
        '--filter',
        'fix',
        '--status',
        'not-done'
      ),
      step(
        'items status',
        ticketReviewId,
        ...frontend,
        '--item',
        '4',
        '--status',
        'Done',
        '--note',
        '1a2b3c4'
      ),
      step('items list', ticketReviewId, '--filter', 'pending'),
      step('items counts', ticketReviewId)
    ]
  }
]
