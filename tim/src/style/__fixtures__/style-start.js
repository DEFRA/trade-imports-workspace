import { execa } from 'execa'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  FRONTEND,
  STUB,
  prepareEnv,
  saveGhOutput,
  stagePrepareWorkspace
} from '../../review/__fixtures__/review-prepare.js'

export const startScripts = [
  'tools/style/start-style.sh',
  'tools/style/prepare-style.sh',
  'tools/style/prepare-style-local.sh',
  'tools/style/refresh/scope.sh',
  'tools/style/file-style-init.sh',
  'tools/style/bake-rules-bundle.sh',
  'tools/style/file-topics.sh'
]

export const startWatchFolder = 'workareas/code-style-reviews'

export const TICKET = 'EUDPA-101'

export const LOCAL_ID = `local/${STUB}/feat/local`

const timCliPath = fileURLToPath(new URL('../../cli.js', import.meta.url))

const realStyleRoutingPath = fileURLToPath(
  new URL(
    '../../../../.claude/skills/code-style/assets/routing.json',
    import.meta.url
  )
)

const FIXED_GIT_ENV = {
  GIT_AUTHOR_NAME: 'Fixture Author',
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_AUTHOR_DATE: '2026-11-03T09:00:00Z',
  GIT_COMMITTER_NAME: 'Fixture Author',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_DATE: '2026-11-03T09:00:00Z'
}

const MISSING_BEST_PRACTICE = 'docs/best-practices/gds/patterns.md'

const writeFiles = (dir, files) => {
  for (const [path, content] of Object.entries(files)) {
    const dest = join(dir, path)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, content)
  }
}

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const styleRouting = () =>
  JSON.parse(readFileSync(realStyleRoutingPath, 'utf8'))

const stubBestPractices = (root) => {
  const routing = styleRouting()
  const paths = Object.values(routing.topics).flatMap(
    ({ bestPractice }) => bestPractice
  )
  for (const path of new Set(paths)) {
    const dest = join(root, path)
    if (path === MISSING_BEST_PRACTICE || existsSync(dest)) continue
    writeFiles(root, { [path]: `stub: ${path}\n` })
  }
}

const FRONTEND_FILES = [
  ['src/index.js'],
  ['src/views/page.njk'],
  ['tests/a.spec.js'],
  ['src/server/home/controller.js'],
  ['package.json'],
  ['src/new-name.test.js', 'src/old-name.test.js']
]

const widenFrontendPullRequest = (staged) => {
  const pullRequest = staged.data.pullRequests.find(
    ({ repo, number }) => repo === FRONTEND && number === 3
  )
  pullRequest.files = FRONTEND_FILES.map(([filename, previous]) =>
    previous === undefined
      ? { filename }
      : { filename, previous_filename: previous }
  )
  pullRequest.view = {
    ...pullRequest.view,
    files: FRONTEND_FILES.map(([path]) => ({
      path,
      additions: 1,
      deletions: 0
    }))
  }
  writeFiles(staged.home, {
    [`gh/files/${FRONTEND}-3.json`]: `${JSON.stringify([pullRequest.files])}\n`,
    [`gh/view/${FRONTEND}-3.json`]: `${JSON.stringify(pullRequest.view)}\n`
  })
}

const timInStaged = (staged, env, args) =>
  execa('node', [timCliPath, '--workspace', staged.root, ...args], {
    env,
    extendEnv: true,
    reject: false
  })

const reviewFolderOf = (root, reviewId) =>
  join(root, 'workareas', 'reviews', reviewId)

const styleFolderOf = (root, reviewId) =>
  join(root, 'workareas', 'code-style-reviews', reviewId)

const git = async (dir, args) =>
  (
    await execa('git', ['-C', dir, ...args], {
      env: FIXED_GIT_ENV,
      extendEnv: true
    })
  ).stdout.trim()

const reviewCloneOf = (root, repo) =>
  join(reviewFolderOf(root, TICKET), 'repos', repo)

/**
 * A staged workspace for the style start cases: the prepare fixtures'
 * remotes, stand-ins and local clone, the real code-style routing, a stub
 * for every best-practice file it names but one, and the frontend's pull
 * request widened to files of every topic. `EUDPA-101`'s review is
 * prepared with tim, so its clones and `.prs/` files are in place.
 *
 * @param {{scripts?: string[], atlassian: Record<string, string>}} opts
 * @returns {Promise<{home: string, root: string, remove: () => void, env: object}>}
 */
export const stageStyleStart = async ({ scripts = [], atlassian }) => {
  const staged = await stagePrepareWorkspace({ scripts })
  writeFiles(staged.root, {
    '.claude/skills/code-style/assets/routing.json': readFileSync(
      realStyleRoutingPath,
      'utf8'
    )
  })
  stubBestPractices(staged.root)
  widenFrontendPullRequest(staged)
  const env = prepareEnv(staged, atlassian)
  saveGhOutput(staged, {
    reviewId: TICKET,
    query: TICKET,
    selected: [
      { repo: FRONTEND, number: 3 },
      { repo: STUB, number: 9 }
    ]
  })
  const prepared = await timInStaged(staged, env, ['review', 'prepare', TICKET])
  if (prepared.exitCode !== 0) {
    throw new Error(`tim review prepare failed: ${prepared.stderr}`)
  }
  return { ...staged, env }
}

const setStyleVerdict = (root, { reviewId, repo, file }) => {
  const path = join(
    styleFolderOf(root, reviewId),
    'file-reviews',
    repo,
    `${file.replaceAll('/', '_')}.style.json`
  )
  const review = JSON.parse(readFileSync(path, 'utf8'))
  writeFileSync(path, jsonText({ ...review, verdict: 'COMPLIANT' }))
}

const stubItems = (repo) => ({
  repo,
  items: [
    { id: 1, file: 'src/Stub.java', disposition: '', status: '' },
    { id: 2, file: 'src/Old.java', disposition: 'Fix', status: 'Not Done' },
    { id: 3, file: 'src/Other.java', disposition: "Won't Fix", status: '—' },
    { id: 4, file: 'src/New.java', disposition: 'Discuss', status: 'Not Done' },
    { id: 5, file: 'docs/a.md', disposition: null },
    { id: 6, file: 'src/Old.java', disposition: 'Fix', status: 'Done' }
  ]
})

const commitIn = async (dir, files, message) => {
  writeFiles(dir, files)
  await git(dir, ['add', '-A'])
  await git(dir, ['commit', '--quiet', '-m', message])
  return git(dir, ['rev-parse', 'HEAD'])
}

/**
 * Moves the stub's review clone on from its pull request's commit: one
 * commit that changes a Java file, adds one and changes a doc, then a
 * merge whose message lists two files under `# Conflicts:`.
 *
 * @param {{root: string}} staged
 * @returns {Promise<{first: string, merge: string}>}
 */
const moveStubClone = async (staged) => {
  const dir = reviewCloneOf(staged.root, STUB)
  const start = await git(dir, ['rev-parse', 'HEAD'])
  const first = await commitIn(
    dir,
    {
      'src/Stub.java': 'class Stub { int moved; }\n',
      'src/Added.java': 'class Added {}\n',
      'docs/notes.md': 'notes\n'
    },
    'Move on'
  )
  await git(dir, ['checkout', '--quiet', '-b', 'side', start])
  await commitIn(
    dir,
    { 'src/New.java': 'class New { int side; }\n', 'README.md': 'side\n' },
    'Side'
  )
  await git(dir, ['checkout', '--quiet', '-'])
  await git(dir, [
    'merge',
    '--quiet',
    '--no-ff',
    '-m',
    'Merge side\n\n# Conflicts:\n#\tsrc/New.java\n#\tREADME.md',
    'side'
  ])
  return { first, merge: await git(dir, ['rev-parse', 'HEAD']) }
}

const readyForScope = async (staged) => {
  setStyleVerdict(staged.root, {
    reviewId: TICKET,
    repo: STUB,
    file: 'src/Stub.java'
  })
  writeFiles(styleFolderOf(staged.root, TICKET), {
    [`items.${STUB}.json`]: jsonText(stubItems(STUB))
  })
  staged.moved = await moveStubClone(staged)
}

const recordReviewSnapshot = (staged) => {
  const path = join(reviewFolderOf(staged.root, TICKET), '.review-meta.json')
  const meta = JSON.parse(readFileSync(path, 'utf8'))
  writeFileSync(
    path,
    jsonText({
      ...meta,
      re_reviews: [
        { changes: [{ repo: STUB, current_commit: staged.moved.first }] }
      ]
    })
  )
}

const addUnclonedRepo = (staged) => {
  const path = join(styleFolderOf(staged.root, TICKET), '.style-meta.json')
  const meta = JSON.parse(readFileSync(path, 'utf8'))
  writeFileSync(
    path,
    jsonText({
      ...meta,
      source_files: [
        ...meta.source_files,
        {
          repo: 'trade-imports-gone',
          path: 'a.js',
          pr: 1,
          commit: 'x',
          topics: ['node']
        }
      ]
    })
  )
}

const forgetFrontendFiles = (staged) => {
  rmSync(
    join(reviewFolderOf(staged.root, TICKET), '.prs', `${FRONTEND}-3.json`)
  )
  rmSync(join(staged.home, 'gh', 'view', `${FRONTEND}-3.json`))
}

const writeStyleMetaWithoutReview = (staged) =>
  writeFiles(styleFolderOf(staged.root, 'EUDPA-556'), {
    '.style-meta.json': jsonText({ id: 'EUDPA-556', source_files: [] })
  })

const writeRepoValidationDoc = (staged) =>
  writeFiles(join(staged.root, 'repos', STUB), {
    'src/server/app/docs/validation.md': '# Validation\n\nValidate early.\n'
  })

const step = (command, args, before) => ({ command, args, before })

const prepare = (args, before) => step('prepare', args, before)
const prepareLocal = (args, before) => step('prepare --local', args, before)
const start = (args, before) => step('start', args, before)
const scope = (args, before) => step('scope', args, before)
const fileInit = (args) => step('file init', args)
const bundle = (args, before) => step('bundle', args, before)

const verdictOn = (reviewId, repo, file) => (staged) =>
  setStyleVerdict(staged.root, { reviewId, repo, file })

/**
 * Each command's script: the Bash a step runs when its golden is recorded.
 */
export const scriptFor = {
  prepare: 'tools/style/prepare-style.sh',
  'prepare --local': 'tools/style/prepare-style-local.sh',
  start: 'tools/style/start-style.sh',
  scope: 'tools/style/refresh/scope.sh',
  'file init': 'tools/style/file-style-init.sh',
  bundle: 'tools/style/bake-rules-bundle.sh'
}

/**
 * Every start, prepare, scope, file init and bundle case, as steps of
 * `{command, args, before}`: the tim command (or the script it replaces),
 * its arguments, and what to change in the staged workspace first.
 */
export const startCases = [
  { name: 'prepare a ticket', steps: [prepare([TICKET])] },
  { name: 'prepare a ticket as JSON', steps: [prepare([TICKET, '--json'])] },
  {
    name: 'a second prepare keeps a file with a verdict',
    steps: [
      prepare([TICKET]),
      prepare([TICKET], verdictOn(TICKET, STUB, 'src/Stub.java'))
    ]
  },
  {
    name: 'prepare a ticket with no review workspace',
    steps: [prepare(['EUDPA-555'])]
  },
  { name: 'prepare with no ticket', steps: [prepare([])] },
  { name: 'prepare with an unknown option', steps: [prepare(['--bogus'])] },
  {
    name: 'prepare a local branch',
    steps: [prepareLocal([STUB, 'feat/local'])]
  },
  {
    name: 'prepare a local branch as JSON',
    steps: [prepareLocal([STUB, 'feat/local', '--json'])]
  },
  {
    name: 'prepare the files the caller names, with the repo validation doc',
    steps: [
      prepareLocal(
        [
          STUB,
          'feat/local',
          '--files',
          'src/b.js,src/server/a/controller.js,README.md'
        ],
        writeRepoValidationDoc
      )
    ]
  },
  {
    name: 'a second local prepare keeps a file with a verdict',
    steps: [
      prepareLocal([STUB, 'feat/local']),
      prepareLocal([STUB, 'feat/local'], verdictOn(LOCAL_ID, STUB, 'src/b.js'))
    ]
  },
  {
    name: 'prepare a local branch of main, which changes nothing',
    steps: [prepareLocal([STUB, 'main'])]
  },
  {
    name: 'prepare a local branch of a folder that is not a git repo',
    steps: [prepareLocal(['trade-imports-none', 'main'])]
  },
  {
    name: 'prepare a local branch with no branch',
    steps: [prepareLocal([STUB])]
  },
  {
    name: 'start a new review, then refresh it with a pull that fails, then without a pull',
    steps: [start([TICKET]), start([TICKET]), start([TICKET, '--no-pull'])]
  },
  {
    name: 'start a local review',
    steps: [start(['--local', STUB, 'feat/local'])]
  },
  { name: 'start with no ticket', steps: [start([])] },
  {
    name: 'scope a refresh over changed, merged, open and uncovered files',
    steps: [
      prepare([TICKET]),
      scope([TICKET, '--no-pull'], readyForScope),
      scope([TICKET, '--no-pull', '--human']),
      scope([TICKET, '--no-pull', '--repo', STUB])
    ]
  },
  {
    name: 'scope writes a snapshot, then sees no change',
    steps: [
      prepare([TICKET]),
      scope([TICKET, '--no-pull', '--write-snapshot'], readyForScope),
      scope([TICKET, '--no-pull'])
    ]
  },
  {
    name: 'scope starts from the last review refresh',
    steps: [
      prepare([TICKET]),
      scope([TICKET, '--no-pull'], async (staged) => {
        await readyForScope(staged)
        recordReviewSnapshot(staged)
      })
    ]
  },
  {
    name: 'scope skips a repo with no clone and warns of a pull request with no files',
    steps: [
      prepare([TICKET]),
      scope([TICKET, '--no-pull', '--human'], (staged) => {
        addUnclonedRepo(staged)
        forgetFrontendFiles(staged)
      })
    ]
  },
  {
    name: 'scope pulls first, and the pull fails',
    steps: [prepare([TICKET]), scope([TICKET])]
  },
  { name: 'scope a ticket with no style review', steps: [scope([TICKET])] },
  {
    name: 'scope a style review with no review workspace',
    steps: [scope(['EUDPA-556'], writeStyleMetaWithoutReview)]
  },
  { name: 'scope with no ticket', steps: [scope([])] },
  { name: 'scope with an unknown option', steps: [scope([TICKET, '--bogus'])] },
  {
    name: 'file init for a ticket and for a local review',
    steps: [
      fileInit([
        TICKET,
        '--repo',
        STUB,
        '--file',
        'src/a/B.java',
        '--commit',
        'abc1234',
        '--pr',
        '9',
        '--mode',
        'FRESH'
      ]),
      fileInit([
        LOCAL_ID,
        '--repo',
        STUB,
        '--file',
        'src/b.js',
        '--commit',
        'def5678',
        '--mode',
        'MERGE_RESOLVED'
      ])
    ]
  },
  {
    name: 'file init refuses a missing option, an unknown mode and an unknown option',
    steps: [
      fileInit([TICKET, '--repo', STUB, '--commit', 'abc', '--mode', 'FRESH']),
      fileInit([
        TICKET,
        '--repo',
        STUB,
        '--file',
        'a.js',
        '--commit',
        'abc',
        '--mode',
        'LATER'
      ]),
      fileInit([TICKET, '--bogus', 'x'])
    ]
  },
  {
    name: 'bundle a topic with and without the repo-relative doc',
    steps: [
      bundle(
        [TICKET, STUB, 'hapi', '<ROOT>/repos/trade-imports-stub'],
        writeRepoValidationDoc
      ),
      bundle([TICKET, STUB, 'hapi']),
      bundle([TICKET, STUB, 'gds', '<ROOT>/repos/trade-imports-stub'])
    ]
  }
]

/**
 * A step's arguments with `<ROOT>` replaced by the staged workspace.
 *
 * @param {string[]} args
 * @param {{root: string}} staged
 * @returns {string[]}
 */
export const argsIn = (args, staged) =>
  args.map((arg) => arg.replace('<ROOT>', staged.root))
