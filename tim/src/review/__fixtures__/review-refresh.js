import { execa } from 'execa'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  normaliseRecordedText,
  recordFolderFiles,
  stageBashWorkspace
} from '../../test-support/bash-golden-harness.js'
import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'
import {
  buildRefreshRemotes,
  cloneForReview,
  writeGhStandIn
} from './review-refresh-repos.js'

export const refreshReviewId = 'EUDPA-9301'
export const failingPullReviewId = 'EUDPA-9302'
export const missingRefreshReviewId = 'EUDPA-9399'

export const stub = 'trade-imports-stub'
export const schemas = 'trade-imports-schemas'
const referenceData = 'trade-imports-reference-data'

export const refreshScripts = [
  'tools/review/refresh/pull-repos.sh',
  'tools/review/refresh/list-merge-resolved.sh',
  'tools/review/refresh/list-coverage-gaps.sh',
  'tools/review/refresh/scope.sh',
  'tools/github/file-diff.sh'
]

const reviewPath = (reviewId) => `workareas/reviews/${reviewId}`

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

export const cachedStubDiff = [
  'diff --git a/src/a.js b/src/a.js',
  'index 1111111..2222222 100644',
  '--- a/src/a.js',
  '+++ b/src/a.js',
  '@@ -1 +1 @@',
  '-a0',
  '+a-resolved',
  'diff --git a/src/old.js b/src/moved.js',
  'similarity index 90%',
  'rename from src/old.js',
  'rename to src/moved.js',
  'diff --git a/docs/my notes.md b/docs/my notes.md',
  'index 5555555..6666666 100644',
  '--- a/docs/my notes.md',
  '+++ b/docs/my notes.md',
  '@@ -1 +1,2 @@',
  ' notes',
  '',
  '+more notes',
  'diff --git a/assets/logo.png b/assets/logo.png',
  'index 7777777..8888888 100644',
  'Binary files a/assets/logo.png and b/assets/logo.png differ',
  'diff --git a/src/a.js.map b/src/a.js.map',
  'new file mode 100644',
  '--- /dev/null',
  '+++ b/src/a.js.map',
  '@@ -0,0 +1 @@',
  '+{}',
  ''
].join('\n')

const prFacts = {
  7: [
    { filename: 'src/a.js' },
    { filename: 'src/b.js' },
    { filename: 'README.md' },
    { filename: 'src/new.js' },
    { filename: 'src/moved.js', previous_filename: 'src/old.js' }
  ],
  9: [{ filename: 'src/c.js' }, { filename: 'src/a.js' }]
}

const schemasFacts = [{ filename: 'schema.json' }]

const reviewWithTodos = (file) => ({
  ticket: refreshReviewId,
  repo: stub,
  file,
  reviewed_at: '2026-11-02T09:00:00Z',
  verdict: 'NEEDS_ATTENTION',
  todos: [
    {
      id: 1,
      line: '1',
      severity: 'Minor',
      category: 'naming',
      issue: `Old finding in ${file}`,
      fix: 'Rename it'
    }
  ]
})

const item = (id, file, disposition, status, extra = {}) => ({
  id,
  file,
  line: String(id),
  severity: 'Minor',
  category: 'naming',
  issue: `Item ${id}`,
  fix: 'Fix it',
  disposition,
  status,
  notes: '',
  ...extra
})

const stubItems = {
  ticket: refreshReviewId,
  repo: stub,
  items: [
    item(1, 'docs/same.md', null, null),
    item(2, 'src/b.js', 'Fix', 'Not Done'),
    item(3, 'docs/same.md', 'Discuss', 'Not Done', {
      issue: 'Tabs\there\nand a newline',
      line: null
    }),
    item(4, 'docs/same.md', 'Fix', 'Done'),
    item(5, 'docs/same.md', "Won't Fix", '—'),
    item(6, 'src/gone.js', null, null)
  ]
}

const schemasItems = {
  ticket: refreshReviewId,
  repo: schemas,
  items: [item(1, 'schema.json', '', '')]
}

const refreshMeta = (shas) => ({
  ticket: refreshReviewId,
  prs: [
    { repo: stub, pr: 7, commit: shas.stub.base, state: 'open' },
    { repo: schemas, pr: 5, commit: shas.schemas.base, state: 'merged' },
    { repo: stub, pr: 9, commit: shas.stub.base, state: 'open' },
    { repo: referenceData, pr: 3, commit: 'deadbeef', state: 'open' }
  ],
  re_reviews: [
    {
      re_review_started: '2026-11-03T09:00:00Z',
      changes: [
        { repo: schemas, pr: 5, current_commit: shas.schemas.head },
        { repo: stub, pr: 7, current_commit: '' }
      ]
    }
  ]
})

const failingPullMeta = (shas) => ({
  ticket: failingPullReviewId,
  prs: [
    { repo: stub, pr: 11, commit: shas.stub.base, state: 'open' },
    { repo: schemas, pr: null, commit: shas.schemas.base, state: 'open' }
  ]
})

const refreshFiles = (shas) => {
  const folder = reviewPath(refreshReviewId)
  const reviews = Object.fromEntries(
    ['src/a.js', 'src/b.js', 'README.md', 'docs/same.md'].map((file) => [
      `${folder}/file-reviews/${stub}/${file.replaceAll('/', '_')}.review.json`,
      jsonText(reviewWithTodos(file))
    ])
  )
  return {
    [`${folder}/.review-meta.json`]: jsonText(refreshMeta(shas)),
    [`${folder}/items.${stub}.json`]: jsonText(stubItems),
    [`${folder}/items.${schemas}.json`]: jsonText(schemasItems),
    [`${folder}/.prs/${stub}-7.json`]: jsonText([prFacts[7]]),
    [`${folder}/.prs/${stub}-9.json`]: jsonText(prFacts[9]),
    [`${folder}/.prs/${schemas}-5.json`]: jsonText(schemasFacts),
    [`${folder}/.diffs/${stub}.diff`]: cachedStubDiff,
    [`${reviewPath(failingPullReviewId)}/.review-meta.json`]: jsonText(
      failingPullMeta(shas)
    ),
    ...reviews
  }
}

const ghAnswers = () => ({
  [`gh/pr-files/${stub}-7.txt`]: `${prFacts[7].map(({ filename }) => filename).join('\n')}\n`,
  [`gh/pr-files/${stub}-9.txt`]: `${prFacts[9].map(({ filename }) => filename).join('\n')}\n`,
  [`gh/pr-files/${schemas}-5.txt`]: 'schema.json\n',
  [`gh/pr-diff/${stub}-7.diff`]: cachedStubDiff
})

const writeUnder = (base, files) => {
  for (const [relPath, content] of Object.entries(files)) {
    const dest = join(base, relPath)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, content)
  }
}

/**
 * A staged workspace holding the refresh fixture: the review folders, their
 * review clones of fixture remotes, and a `gh` stand-in first on PATH.
 *
 * @param {object} opts
 * @param {string[]} opts.scripts - Scripts to copy from the real workspace
 * @param {'base' | 'head'} opts.stubCloneAt - Where the stub review clone starts
 * @returns {Promise<{home: string, root: string, remove: () => void, path: string, shas: object}>}
 */
export const stageRefreshWorkspace = async ({ scripts, stubCloneAt }) => {
  const staged = stageBashWorkspace({ scripts })
  markWorkspaceRoot(staged.root)
  mkdirSync(join(staged.root, 'repos'), { recursive: true })
  const { remotes, ...shas } = await buildRefreshRemotes(staged.home)
  writeUnder(staged.root, refreshFiles(shas))
  writeUnder(staged.home, ghAnswers())
  const reviewFolderOf = (reviewId) => join(staged.root, reviewPath(reviewId))
  await cloneForReview({
    remote: remotes[stub],
    reviewFolder: reviewFolderOf(refreshReviewId),
    repo: stub,
    sha: shas.stub[stubCloneAt]
  })
  await cloneForReview({
    remote: remotes[schemas],
    reviewFolder: reviewFolderOf(refreshReviewId),
    repo: schemas,
    sha: shas.schemas.head
  })
  await cloneForReview({
    remote: remotes[stub],
    reviewFolder: reviewFolderOf(failingPullReviewId),
    repo: stub,
    sha: shas.stub.base
  })
  await cloneForReview({
    remote: remotes[schemas],
    reviewFolder: reviewFolderOf(failingPullReviewId),
    repo: schemas,
    sha: shas.schemas.base
  })
  const bin = writeGhStandIn(staged.home)
  return {
    ...staged,
    shas,
    reviewFolderOf,
    path: `${bin}:${process.env.PATH}`
  }
}

const gitState = async (dir) => {
  const run = (args) =>
    execa('git', ['-C', dir, ...args], { reject: false }).then(
      ({ stdout }) => stdout
    )
  return {
    head: await run(['rev-parse', 'HEAD']),
    branch: await run(['symbolic-ref', '-q', '--short', 'HEAD']),
    fetch: (await run(['config', '--get-all', 'remote.origin.fetch'])).split(
      '\n'
    )
  }
}

/**
 * What a refresh command left behind in a review: its meta file, its file
 * reviews and, for each review clone, its HEAD, branch and fetch refspecs.
 *
 * @param {{home: string, reviewFolderOf: (reviewId: string) => string}} staged
 * @param {string} reviewId
 * @returns {Promise<object>}
 */
export const observeReview = async (staged, reviewId) => {
  const folder = staged.reviewFolderOf(reviewId)
  const files = recordFolderFiles(join(folder, 'file-reviews'), staged.home)
  const meta = recordFolderFiles(folder, staged.home)['.review-meta.json']
  const clones = {}
  for (const repo of [stub, schemas]) {
    clones[repo] = await gitState(join(folder, 'repos', repo))
  }
  return { meta, files, clones }
}

/**
 * Every refresh case: the Bash script and arguments it ran, and the tim
 * arguments that stand in for them. `input` gets the staged workspace, so
 * a case can name a review clone or a fixture SHA.
 */
export const refreshCases = [
  {
    name: 'merge-resolved lists a hand-resolved merge file as TSV',
    command: 'merge-resolved',
    bash: (staged) => [
      join(staged.reviewFolderOf(refreshReviewId), 'repos', stub),
      staged.shas.stub.base,
      staged.shas.stub.head
    ],
    tim: (args) => args,
    output: 'text'
  },
  {
    name: 'merge-resolved lists a hand-resolved merge file as JSON',
    command: 'merge-resolved',
    bash: (staged) => [
      join(staged.reviewFolderOf(refreshReviewId), 'repos', stub),
      staged.shas.stub.base,
      staged.shas.stub.head,
      '--json'
    ],
    tim: (args) => args,
    output: 'json'
  },
  {
    name: 'merge-resolved finds nothing in a window with no merge',
    command: 'merge-resolved',
    bash: (staged) => [
      join(staged.reviewFolderOf(refreshReviewId), 'repos', stub),
      staged.shas.stub.merge,
      staged.shas.stub.head,
      '--json'
    ],
    tim: (args) => args,
    output: 'json'
  },
  {
    name: 'merge-resolved refuses a folder that is not a git repo',
    command: 'merge-resolved',
    bash: (staged) => [
      staged.reviewFolderOf(refreshReviewId),
      staged.shas.stub.base,
      staged.shas.stub.head
    ],
    tim: (args) => args,
    output: 'text'
  },
  {
    name: 'gaps lists the files of one pull request with no file review',
    command: 'gaps',
    bash: (staged) => [
      staged.reviewFolderOf(refreshReviewId),
      stub,
      '7',
      '--tsv'
    ],
    tim: () => [refreshReviewId, '--repo', stub, '--pr', '7'],
    output: 'text'
  },
  {
    name: 'gaps lists them as JSON',
    command: 'gaps',
    bash: (staged) => [
      staged.reviewFolderOf(refreshReviewId),
      stub,
      '9',
      '--json'
    ],
    tim: () => [refreshReviewId, '--repo', stub, '--pr', '9', '--json'],
    output: 'json'
  },
  {
    name: 'gaps refuses a review that is not there',
    command: 'gaps',
    bash: (staged) => [
      staged.reviewFolderOf(missingRefreshReviewId),
      stub,
      '7'
    ],
    tim: () => [missingRefreshReviewId, '--repo', stub, '--pr', '7'],
    output: 'text'
  },
  {
    name: 'pull pins, fetches and detaches every cloned repo, and skips one not cloned',
    command: 'pull',
    stubCloneAt: 'base',
    bash: () => [refreshReviewId],
    tim: (args) => args,
    output: 'text',
    observe: refreshReviewId
  },
  {
    name: 'pull reports each repo as JSON',
    command: 'pull',
    stubCloneAt: 'base',
    bash: () => [refreshReviewId, '--json'],
    tim: (args) => args,
    output: 'json',
    observe: refreshReviewId
  },
  {
    name: 'pull brings a merged pull request to main for one repo',
    command: 'pull',
    stubCloneAt: 'base',
    bash: () => [refreshReviewId, '--repo', schemas],
    tim: (args) => args,
    output: 'text',
    observe: refreshReviewId
  },
  {
    name: 'pull fails for a missing pull request ref and a missing pull request number',
    command: 'pull',
    bash: () => [failingPullReviewId],
    tim: (args) => args,
    output: 'text',
    observe: failingPullReviewId
  },
  {
    name: 'pull reports those failures as JSON',
    command: 'pull',
    bash: () => [failingPullReviewId, '--json'],
    tim: (args) => args,
    output: 'json',
    observe: failingPullReviewId
  },
  {
    name: 'pull refuses a review with no meta file',
    command: 'pull',
    bash: () => [missingRefreshReviewId],
    tim: (args) => args,
    output: 'text'
  },
  {
    name: 'scope summarises the four lists without pulling',
    command: 'scope',
    bash: () => [refreshReviewId, '--no-pull', '--human'],
    tim: () => [refreshReviewId, '--no-pull'],
    output: 'text',
    observe: refreshReviewId
  },
  {
    name: 'scope gives the four lists as JSON without pulling',
    command: 'scope',
    bash: () => [refreshReviewId, '--no-pull'],
    tim: () => [refreshReviewId, '--no-pull', '--json'],
    output: 'json',
    observe: refreshReviewId
  },
  {
    name: 'scope gives one repo as JSON',
    command: 'scope',
    bash: () => [refreshReviewId, '--no-pull', '--repo', schemas],
    tim: () => [refreshReviewId, '--no-pull', '--repo', schemas, '--json'],
    output: 'json',
    observe: refreshReviewId
  },
  {
    name: 'scope writes a snapshot and clears the findings of the files to review again',
    command: 'scope',
    bash: () => [refreshReviewId, '--no-pull', '--write-snapshot', '--human'],
    tim: () => [refreshReviewId, '--no-pull', '--write-snapshot'],
    output: 'text',
    observe: refreshReviewId
  },
  {
    name: 'scope pulls first, then lists what the pull brought in',
    command: 'scope',
    stubCloneAt: 'base',
    bash: () => [refreshReviewId, '--human'],
    tim: () => [refreshReviewId],
    output: 'text',
    observe: refreshReviewId
  },
  {
    name: 'scope stops when the pull fails',
    command: 'scope',
    bash: () => [failingPullReviewId, '--human'],
    tim: () => [failingPullReviewId],
    output: 'text',
    observe: failingPullReviewId
  },
  {
    name: 'scope refuses a review with no meta file',
    command: 'scope',
    bash: () => [missingRefreshReviewId, '--no-pull'],
    tim: () => [missingRefreshReviewId, '--no-pull'],
    output: 'text'
  },
  ...[
    ['a changed file', 'src/a.js'],
    ['a renamed file by its old path', 'src/old.js'],
    ['a renamed file by its new path', 'src/moved.js'],
    ['a path with a space', 'docs/my notes.md'],
    ['a binary file', 'assets/logo.png'],
    ['a file not in the diff', 'src/none.js']
  ].map(([what, file]) => ({
    name: `file-diff gives the hunks of ${what} from the cache`,
    command: 'file-diff',
    bash: () => [stub, '7', file, '--ticket', refreshReviewId],
    tim: () => [file, '--ticket', refreshReviewId, '--repo', stub],
    output: 'text'
  })),
  {
    name: 'file-diff filters a pull request diff that is not cached',
    command: 'file-diff',
    bash: () => [stub, '7', 'src/a.js'],
    tim: () => ['src/a.js', '--stdin'],
    stdin: cachedStubDiff,
    output: 'text'
  }
]

/**
 * The script a refresh command replaces.
 *
 * @param {string} command
 * @returns {string}
 */
export const scriptFor = (command) =>
  ({
    pull: 'tools/review/refresh/pull-repos.sh',
    'merge-resolved': 'tools/review/refresh/list-merge-resolved.sh',
    gaps: 'tools/review/refresh/list-coverage-gaps.sh',
    scope: 'tools/review/refresh/scope.sh',
    'file-diff': 'tools/github/file-diff.sh'
  })[command]

/**
 * A case's arguments as a recording holds them.
 *
 * @param {string[]} args
 * @param {string} home
 * @returns {string[]}
 */
export const recordedArgs = (args, home) =>
  args.map((arg) => normaliseRecordedText(arg, home))
