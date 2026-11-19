import { normaliseRecordedText } from '../../test-support/bash-golden-harness.js'

export const fullReviewId = 'EUDPA-9101'
export const completeReviewId = 'EUDPA-9102'
export const codeOnlyReviewId = 'EUDPA-9103'
export const metalessReviewId = 'EUDPA-9104'
export const emptyReviewId = 'EUDPA-9105'
export const missingReviewId = 'EUDPA-9199'
export const localReviewId = 'local/trade-imports-stub/feat/NO_JIRA-tools'

const backend = 'trade-imports-animals-backend'
const frontend = 'trade-imports-animals-frontend'
const stub = 'trade-imports-stub'

const fullFolder = `workareas/reviews/${fullReviewId}`
const completeFolder = `workareas/reviews/${completeReviewId}`

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const fileReview = (fields) => ({
  ticket: fullReviewId,
  repo: backend,
  pr: 11,
  commit: 'aaaa111',
  mode: 'FRESH',
  reviewed_at: null,
  reconciled_at: null,
  verdict: null,
  verdict_reason: null,
  todos: [],
  ...fields
})

const backendFileReviews = {
  'docs_notes.md': fileReview({ file: 'docs/notes.md' }),
  'pom.xml': fileReview({
    file: 'pom.xml',
    reviewed_at: '2026-11-10T09:00:00Z',
    reconciled_at: '2026-11-11T09:00:00Z',
    verdict: 'RISKY',
    verdict_reason: 'Pins an old plugin',
    todos: [
      {
        id: 1,
        line: 3,
        severity: 'Critical',
        category: 'security',
        issue: 'Pulls a plugin with a known hole',
        fix: 'Must: bump it.'
      }
    ]
  }),
  'src_main_java_b.java': fileReview({
    file: 'src/main/java/b.java',
    reviewed_at: '2026-11-10T10:00:00Z',
    reconciled_at: '2026-11-09T10:00:00Z',
    verdict: 'NEEDS_ATTENTION',
    verdict_reason: 'Two findings',
    todos: [
      {
        id: 1,
        line: 12,
        severity: 'Major',
        category: 'correctness',
        issue: 'Returns 200 | 204 for a missing id',
        fix: '  Must: return 404.  One way: throw NotFound | map it  ',
        best_practice: 'docs/best-practices/java/errors.md'
      },
      {
        id: 2,
        line: 30,
        severity: 'Minor',
        category: 'naming',
        issue: 'Vague name',
        fix: 'Rename it'
      },
      {
        id: 3,
        line: 31,
        severity: 'Minor',
        category: 'comments',
        issue: 'Stale comment',
        fix: 'Must: delete it. One way: a. One way: b'
      }
    ]
  }),
  'src_main_java_c.java': fileReview({
    file: 'src/main/java/c.java',
    reviewed_at: '2026-11-12T10:00:00Z',
    verdict: 'SAFE',
    verdict_reason: ''
  })
}

const frontendFileReviews = {
  'src_server_app_index.js': fileReview({
    repo: frontend,
    pr: 12,
    file: 'src/server/app/index.js',
    reviewed_at: '2026-11-10T10:00:00Z',
    verdict: 'NEEDS_ATTENTION',
    todos: [
      {
        id: 1,
        line: 4,
        severity: 'Major',
        category: 'error-handling',
        issue: 'Swallows the error',
        fix: 'Must: rethrow.'
      }
    ]
  }),
  'src_server_app_views.njk': fileReview({
    repo: frontend,
    pr: 12,
    file: 'src/server/app/views.njk',
    verdict: 'PENDING_SOMETHING'
  })
}

const backendItems = {
  ticket: fullReviewId,
  repo: backend,
  items: [
    {
      id: 1,
      file: 'src/main/java/b.java',
      line: '9',
      severity: 'Major',
      category: 'correctness',
      issue: 'Pipes | here\nand a newline',
      fix: 'Must: split it. One way: a | b\non two lines',
      disposition: 'Fix',
      status: 'Done',
      notes: 'abc1234'
    },
    {
      id: 2,
      file: 'src/main/java/b.java',
      line: 7,
      severity: 'Minor',
      category: 'naming',
      issue: 'Short name',
      fix: 'Spell it out',
      disposition: 'Fix',
      status: 'Done',
      notes: ''
    },
    {
      id: 3,
      file: 'pom.xml',
      line: null,
      severity: 'Minor',
      category: 'design',
      issue: 'No property',
      fix: null,
      disposition: 'Fix',
      status: 'Done',
      notes: null
    },
    {
      id: 4,
      file: 'docs/notes.md',
      severity: 'Minor',
      category: 'comments',
      issue: 'Typo',
      fix: 'Must:fix it.One way:   ',
      disposition: "Won't Fix",
      status: '—',
      notes: 'Not worth it'
    }
  ]
}

const fileReviewFiles = (folder, repo, reviews) =>
  Object.fromEntries(
    Object.entries(reviews).map(([name, review]) => [
      `${folder}/file-reviews/${repo}/${name}.review.json`,
      jsonText(review)
    ])
  )

const staleSummary = `## Risk Assessment
**Overall Risk:** Low

| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |
|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|
| 1 | src/a.js | 3 | Major | naming | First issue | rename it. |  |  |  |  |

## Repository Verdict
**Status:** NEEDS ATTENTION
`

const pasteCommentSummary = `## Risk Assessment
**Overall Risk:** Low

<!-- paste output of \`render-items.sh EUDPA-XXXXX --repo {repo}\` here.
     Full schema and \`|\` escape rules: assets/items-table.md.
     Disposition / Status / Notes start blank — walker fills them. -->

## Repository Verdict
`

const skeletonCommentSummary = `## Risk Assessment
**Overall Risk:** Low

<!-- items table: \`render-items.sh EUDPA-XXXXX --repo {repo} --write\` puts it here.
     Full schema and \`|\` escape rules: assets/items-table.md. -->

## Repository Verdict
`

const verdictOnlySummary = `## Risk Assessment
**Overall Risk:** Low

## Repository Verdict
`

const nowhereSummary = '## Summary\nNothing else.'

/**
 * The review summaries `items render --write` is tried on, by the repo
 * whose items file each one sits beside. Every repo holds a copy of the
 * backend's items.
 */
export const summaryRepos = {
  stale: 'repo-stale',
  pasteComment: 'repo-paste-comment',
  skeletonComment: 'repo-skeleton-comment',
  verdictOnly: 'repo-verdict-only',
  nowhere: 'repo-nowhere',
  noSummary: 'repo-no-summary'
}

const summaryFiles = Object.fromEntries(
  Object.entries({
    stale: staleSummary,
    pasteComment: pasteCommentSummary,
    skeletonComment: skeletonCommentSummary,
    verdictOnly: verdictOnlySummary,
    nowhere: nowhereSummary
  }).map(([kind, text]) => [
    `${fullFolder}/review.${summaryRepos[kind]}.md`,
    text
  ])
)

const summaryItemsFiles = Object.fromEntries(
  Object.values(summaryRepos).map((repo) => [
    `${fullFolder}/items.${repo}.json`,
    jsonText({ ...backendItems, repo })
  ])
)

const slurpedPages = (...pages) => jsonText(pages)

const changed = (filename, previous) => ({
  sha: 'f00',
  filename,
  status: previous ? 'renamed' : 'modified',
  ...(previous ? { previous_filename: previous } : {})
})

const fullMeta = {
  id: fullReviewId,
  ticket: fullReviewId,
  themes: ['code', 'consistency'],
  prs: [
    { repo: backend, pr: 11 },
    { repo: frontend, pr: 12 },
    { repo: backend, pr: 13 },
    { repo: stub, pr: 14 }
  ]
}

const completeMeta = {
  id: completeReviewId,
  ticket: completeReviewId,
  themes: ['code', 'consistency'],
  prs: [{ repo: backend, pr: 21 }]
}

const styleMeta = (reviewId, sourceFiles) => ({
  ticket: reviewId,
  source_files: sourceFiles
})

export const toolsFiles = {
  [`${fullFolder}/.review-meta.json`]: jsonText(fullMeta),
  [`${fullFolder}/items.${backend}.json`]: jsonText(backendItems),
  ...fileReviewFiles(fullFolder, backend, backendFileReviews),
  ...fileReviewFiles(fullFolder, frontend, frontendFileReviews),
  [`${fullFolder}/file-reviews/${backend}/_consistency-check.md`]:
    '# Consistency\nAll good.\n',
  [`${fullFolder}/file-reviews/${frontend}/_consistency-check.md`]: '',
  [`${fullFolder}/file-reviews/${stub}/notes.txt`]: 'not a review\n',
  [`${fullFolder}/.prs/${backend}-11.json`]: slurpedPages(
    [
      changed('pom.xml'),
      changed('src/main/java/b.java', 'src/main/java/a.java')
    ],
    [changed('docs/notes.md')]
  ),
  [`${fullFolder}/.prs/${frontend}-12.json`]: slurpedPages([
    changed('src/server/app/index.js'),
    changed('src/server/app/views.njk')
  ]),
  [`${fullFolder}/.prs/${backend}-13.json`]: slurpedPages([
    changed('src/main/java/c.java')
  ]),
  [`${fullFolder}/.prs/${stub}-14.json`]: slurpedPages([]),
  ...summaryFiles,
  ...summaryItemsFiles,
  [`${completeFolder}/.review-meta.json`]: jsonText(completeMeta),
  [`${completeFolder}/file-reviews/${backend}/_consistency-check.md`]:
    'Fine.\n',
  [`${completeFolder}/file-reviews/${backend}/pom.xml.review.json`]: jsonText(
    fileReview({ ticket: completeReviewId, file: 'pom.xml', verdict: 'SAFE' })
  ),
  [`${completeFolder}/.prs/${backend}-21.json`]: slurpedPages([
    changed('pom.xml')
  ]),
  [`workareas/reviews/${codeOnlyReviewId}/.review-meta.json`]: jsonText({
    id: codeOnlyReviewId,
    themes: ['code'],
    prs: [{ repo: backend, pr: 31 }]
  }),
  [`workareas/reviews/${codeOnlyReviewId}/file-reviews/${backend}/_consistency-check.md`]:
    'x\n',
  [`workareas/reviews/${metalessReviewId}/file-reviews/${backend}/x.review.json`]:
    jsonText(fileReview({ file: 'x' })),
  [`workareas/reviews/${emptyReviewId}/.review-meta.json`]: jsonText({
    id: emptyReviewId,
    themes: ['code', 'consistency'],
    prs: []
  }),
  [`workareas/reviews/${emptyReviewId}/file-reviews/${backend}/notes.txt`]:
    'nothing\n',
  [`workareas/reviews/${localReviewId}/.review-meta.json`]: jsonText({
    id: localReviewId,
    local: true,
    repo: stub,
    branch: 'feat/NO_JIRA-tools',
    files: ['src/Main.java']
  }),
  [`workareas/reviews/${localReviewId}/file-reviews/${stub}/src_Main.java.review.json`]:
    jsonText(fileReview({ ticket: localReviewId, file: 'src/Main.java' })),
  [`workareas/code-style-reviews/${fullReviewId}/.style-meta.json`]: jsonText(
    styleMeta(fullReviewId, [
      { repo: frontend, path: 'src/server/app/index.js' },
      { repo: frontend, path: 'src/server/app/form.js' },
      { repo: backend, path: 'src/main/java/b.java' }
    ])
  ),
  [`workareas/code-style-reviews/${fullReviewId}/file-reviews/${frontend}/src_server_app_index.js.style.json`]:
    jsonText({ file: 'src/server/app/index.js', verdict: 'SAFE', todos: [] }),
  [`workareas/code-style-reviews/${fullReviewId}/file-reviews/${backend}/src_main_java_b.java.style.json`]:
    jsonText({ file: 'src/main/java/b.java', verdict: null, todos: [] }),
  [`workareas/code-style-reviews/${completeReviewId}/.style-meta.json`]:
    jsonText(styleMeta(completeReviewId, [{ repo: backend, path: 'pom.xml' }])),
  [`workareas/code-style-reviews/${completeReviewId}/file-reviews/${backend}/pom.xml.style.json`]:
    jsonText({ file: 'pom.xml', verdict: 'NEEDS_ATTENTION', todos: [] }),
  [`workareas/code-style-reviews/${emptyReviewId}/.style-meta.json`]: jsonText(
    styleMeta(emptyReviewId, [])
  ),
  [`workareas/code-style-reviews/${emptyReviewId}/file-reviews/.keep`]: '',
  [`workareas/code-style-reviews/${metalessReviewId}/file-reviews/.keep`]: ''
}

/**
 * A stand-in for tools/github/pr-details.sh in the staged workspace: it
 * lists a PR's files, rename pre-images included, from the facts file
 * `gh api` writes, as the real script lists them from the API.
 */
export const prDetailsStandIn = `#!/bin/bash
facts=$(ls "$(dirname "$0")"/../../workareas/reviews/*/.prs/"$1-$2".json 2>/dev/null | head -1)
[[ "$3" == files && -n "$facts" ]] || exit 1
jq -r '.[][] | .filename, (.previous_filename // empty)' "$facts"
`

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
  'items render': 'tools/review/render-items.sh',
  aggregate: 'tools/review/aggregate-file-reviews.sh',
  'verify consistency': 'tools/review/verify-consistency.sh',
  'verify style': 'tools/review/verify-style-coverage.sh',
  'verify files': 'tools/review/verify-coverage.sh',
  reconcile: 'tools/review/refresh/reconcile.sh'
}

export const toolsScripts = [
  ...Object.values(SCRIPTS),
  'tools/review/items-table.jq'
]

/**
 * The script a step's tim command replaces.
 *
 * @param {string} command - `items render`, `verify files` and so on
 * @returns {string}
 */
export const scriptFor = (command) => SCRIPTS[command]

const step = (command, ...args) => ({ command, args })
const repoOf = (repo) => ['--repo', repo]

/**
 * Each case's name and steps. Each case runs on a fresh copy of
 * {@link toolsFiles}. `usage: true` marks a case where Bash printed its
 * own usage text, so only the exit code is compared there.
 */
export const toolsCases = [
  {
    name: 'items render prints the table',
    steps: [step('items render', fullReviewId, ...repoOf(backend))]
  },
  {
    name: 'items render --write replaces a stale table, and again changes nothing',
    steps: [
      step(
        'items render',
        fullReviewId,
        ...repoOf(summaryRepos.stale),
        '--write'
      ),
      step(
        'items render',
        fullReviewId,
        ...repoOf(summaryRepos.stale),
        '--write'
      )
    ]
  },
  {
    name: 'items render --write fills the paste-here comment',
    steps: [
      step(
        'items render',
        fullReviewId,
        ...repoOf(summaryRepos.pasteComment),
        '--write'
      )
    ]
  },
  {
    name: "items render --write fills the skeleton's items-table comment",
    steps: [
      step(
        'items render',
        fullReviewId,
        ...repoOf(summaryRepos.skeletonComment),
        '--write'
      )
    ]
  },
  {
    name: 'items render --write falls back to the Repository Verdict heading',
    steps: [
      step(
        'items render',
        fullReviewId,
        ...repoOf(summaryRepos.verdictOnly),
        '--write'
      )
    ]
  },
  {
    name: 'items render --write refuses a summary with nowhere to write',
    steps: [
      step(
        'items render',
        fullReviewId,
        ...repoOf(summaryRepos.nowhere),
        '--write'
      )
    ]
  },
  {
    name: 'items render --write refuses a repo with no summary',
    steps: [
      step(
        'items render',
        fullReviewId,
        ...repoOf(summaryRepos.noSummary),
        '--write'
      )
    ]
  },
  {
    name: 'items render refuses a repo with no items file',
    steps: [step('items render', fullReviewId, ...repoOf(frontend))]
  },
  {
    name: 'items render refuses no --repo',
    steps: [step('items render', fullReviewId)]
  },
  {
    name: 'aggregate prints both sections, the items from the items file',
    steps: [step('aggregate', fullReviewId, ...repoOf(backend))]
  },
  {
    name: 'aggregate prints the file summary',
    steps: [
      step(
        'aggregate',
        fullReviewId,
        ...repoOf(frontend),
        '--section',
        'file-summary'
      )
    ]
  },
  {
    name: 'aggregate prints the items from the file reviews when there is no items file',
    steps: [
      step('aggregate', fullReviewId, ...repoOf(frontend), '--section', 'items')
    ]
  },
  {
    name: 'aggregate --write-items writes the items file and stamps the reviewed files',
    steps: [
      step(
        'aggregate',
        fullReviewId,
        ...repoOf(backend),
        '--write-items',
        '--section',
        'items'
      )
    ]
  },
  {
    name: 'aggregate refuses an unknown section after writing the items',
    steps: [
      step(
        'aggregate',
        fullReviewId,
        ...repoOf(frontend),
        '--write-items',
        '--section',
        'other'
      )
    ]
  },
  {
    name: 'aggregate refuses a repo with no file reviews folder',
    steps: [step('aggregate', fullReviewId, ...repoOf('trade-imports-schemas'))]
  },
  {
    name: 'aggregate refuses a folder with no file reviews',
    steps: [step('aggregate', fullReviewId, ...repoOf(stub))]
  },
  {
    name: 'aggregate refuses no --repo',
    steps: [step('aggregate', fullReviewId)]
  },
  {
    name: 'aggregate refuses no review id',
    steps: [step('aggregate', ...repoOf(backend))]
  },
  {
    name: 'verify consistency lists the pending and missing repos once each',
    steps: [step('verify consistency', fullReviewId)]
  },
  {
    name: 'verify consistency confirms a complete review',
    steps: [step('verify consistency', completeReviewId)]
  },
  {
    name: 'verify consistency confirms a review with no repos',
    steps: [step('verify consistency', emptyReviewId)]
  },
  {
    name: 'verify consistency skips a review without the consistency theme',
    steps: [step('verify consistency', codeOnlyReviewId)]
  },
  {
    name: 'verify consistency skips a local review',
    steps: [step('verify consistency', localReviewId)]
  },
  {
    name: 'verify consistency refuses a review with no meta file',
    steps: [step('verify consistency', metalessReviewId)]
  },
  {
    name: 'verify consistency refuses a missing review',
    steps: [step('verify consistency', missingReviewId)]
  },
  {
    name: 'verify style lists the pending and missing files',
    steps: [step('verify style', fullReviewId)]
  },
  {
    name: 'verify style confirms a complete review',
    steps: [step('verify style', completeReviewId)]
  },
  {
    name: 'verify style confirms a review with no source files',
    steps: [step('verify style', emptyReviewId)]
  },
  {
    name: 'verify style refuses a review with no meta file',
    steps: [step('verify style', metalessReviewId)]
  },
  {
    name: 'verify style refuses a missing review',
    steps: [step('verify style', missingReviewId)]
  },
  {
    name: 'verify files lists the pending and missing files, rename pre-images included',
    steps: [step('verify files', fullReviewId)]
  },
  {
    name: 'verify files confirms a complete review',
    steps: [step('verify files', completeReviewId)]
  },
  {
    name: 'verify files confirms a review with no PRs',
    steps: [step('verify files', emptyReviewId)]
  },
  {
    name: 'verify files confirms a local review, which has no PRs',
    steps: [step('verify files', localReviewId)]
  },
  {
    name: 'verify files refuses a review with no meta file',
    steps: [step('verify files', metalessReviewId)]
  },
  {
    name: 'verify files refuses a missing review',
    steps: [step('verify files', missingReviewId)]
  },
  {
    name: 'reconcile folds in the stale and fresh file reviews and lists the spot-checks',
    steps: [step('reconcile', fullReviewId, ...repoOf(backend))]
  },
  {
    name: 'reconcile run twice adds nothing the second time',
    steps: [
      step('reconcile', fullReviewId, ...repoOf(backend)),
      step('reconcile', fullReviewId, ...repoOf(backend))
    ]
  },
  {
    name: 'reconcile --dry-run changes nothing',
    steps: [step('reconcile', fullReviewId, ...repoOf(backend), '--dry-run')]
  },
  {
    name: 'reconcile --force folds in the reconciled file too',
    steps: [step('reconcile', fullReviewId, ...repoOf(backend), '--force')]
  },
  {
    name: 'reconcile refuses a repo with no items file',
    steps: [step('reconcile', fullReviewId, ...repoOf(frontend))]
  },
  {
    name: 'reconcile refuses a repo with no file reviews folder',
    steps: [step('reconcile', fullReviewId, ...repoOf('trade-imports-schemas'))]
  },
  {
    name: 'reconcile refuses no --repo',
    steps: [step('reconcile', fullReviewId)]
  }
]
