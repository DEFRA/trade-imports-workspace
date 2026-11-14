import { execa } from 'execa'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  normaliseRecordedText,
  recordFolderFiles,
  stageBashWorkspace
} from '../../test-support/bash-golden-harness.js'
import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'

export const prepareScripts = [
  'tools/review/prepare-review.sh',
  'tools/review/prepare-review-local.sh',
  'tools/review/start-review.sh'
]

export const helperScripts = [
  'tools/github/prs.sh',
  'tools/github/pr-details.sh',
  'tools/jira/ticket.sh',
  'tools/jira/comments.sh',
  'tools/confluence/page.sh'
]

export const STUB = 'trade-imports-stub'
export const FRONTEND = 'trade-imports-animals-frontend'
export const SCHEMAS = 'trade-imports-schemas'

const timCliPath = fileURLToPath(new URL('../../cli.js', import.meta.url))

const realRoutingPath = fileURLToPath(
  new URL(
    '../../../../.claude/skills/review/assets/routing.json',
    import.meta.url
  )
)

const FIXED_GIT_ENV = {
  GIT_AUTHOR_NAME: 'Fixture Author',
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_AUTHOR_DATE: '2026-11-01T09:00:00Z',
  GIT_COMMITTER_NAME: 'Fixture Author',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_DATE: '2026-11-01T09:00:00Z',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1'
}

const git = async (dir, args) =>
  (
    await execa('git', ['-C', dir, ...args], {
      env: FIXED_GIT_ENV,
      extendEnv: true
    })
  ).stdout.trim()

const writeFiles = (dir, files) => {
  for (const [path, content] of Object.entries(files)) {
    const dest = join(dir, path)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, content)
  }
}

const commit = async (dir, files, message) => {
  writeFiles(dir, files)
  await git(dir, ['add', '-A'])
  await git(dir, ['commit', '--quiet', '-m', message])
  return git(dir, ['rev-parse', 'HEAD'])
}

const initRepo = async (dir) => {
  mkdirSync(dir, { recursive: true })
  await git(dir, ['init', '--quiet', '-b', 'main'])
}

const buildStub = async (dir) => {
  await initRepo(dir)
  const base = await commit(
    dir,
    {
      'pom.xml':
        '<project><artifactId>spring-boot-starter</artifactId></project>\n',
      'src/Old.java': 'class Old {}\n',
      'README.md': 'stub\n'
    },
    'Base'
  )
  await git(dir, ['checkout', '--quiet', '-b', 'pr'])
  const head = await commit(
    dir,
    { 'src/Stub.java': 'class Stub {}\n', 'README.md': 'stub two\n' },
    'Change'
  )
  await git(dir, ['checkout', '--quiet', 'main'])
  await git(dir, ['merge', '--quiet', '--no-ff', '-m', 'Merge pr', 'pr'])
  const merge = await git(dir, ['rev-parse', 'HEAD'])
  return { base, head, merge }
}

const buildFrontend = async (dir) => {
  await initRepo(dir)
  const base = await commit(
    dir,
    { 'package.json': '{"dependencies":{"@hapi/hapi":"^21.0.0"}}\n' },
    'Base'
  )
  const head = await commit(dir, { 'src/index.js': 'export {}\n' }, 'Index')
  return { base, head }
}

const buildSchemas = async (dir) => {
  await initRepo(dir)
  const base = await commit(dir, { 'schema.json': '{}\n' }, 'Schema')
  return { base }
}

const bareRemote = async (workDir, bareDir) => {
  await execa('git', ['clone', '--quiet', '--bare', workDir, bareDir], {
    env: FIXED_GIT_ENV,
    extendEnv: true
  })
  await git(bareDir, ['config', 'uploadpack.allowAnySHA1InWant', 'true'])
}

const buildRemotes = async (home) => {
  const work = join(home, 'work')
  const builders = { [STUB]: buildStub, [FRONTEND]: buildFrontend }
  const shas = {}
  for (const [repo, build] of Object.entries({
    ...builders,
    [SCHEMAS]: buildSchemas
  })) {
    shas[repo] = await build(join(work, repo))
    await bareRemote(join(work, repo), join(home, 'remotes', `${repo}.git`))
  }
  rmSync(work, { recursive: true, force: true })
  return shas
}

const buildLocalRepo = async (root, home) => {
  const dir = join(root, 'repos', STUB)
  mkdirSync(dirname(dir), { recursive: true })
  await execa(
    'git',
    ['clone', '--quiet', join(home, 'remotes', `${STUB}.git`), dir],
    { env: FIXED_GIT_ENV, extendEnv: true }
  )
  await git(dir, ['checkout', '--quiet', '-b', 'feat/other'])
  await commit(dir, { 'docs/other.md': 'other\n' }, 'Other')
  await git(dir, ['checkout', '--quiet', 'main'])
  await git(dir, ['checkout', '--quiet', '-b', 'feat/local'])
  await commit(
    dir,
    { 'src/b.js': 'b\n', 'README.md': 'local readme\n', 'Zeta.md': 'z\n' },
    'Local work'
  )
  writeFiles(dir, { 'docs/staged.md': 'staged\n' })
  await git(dir, ['add', 'docs/staged.md'])
  writeFiles(dir, { 'src/Stub.java': 'class Stub { int edited; }\n' })
}

const gitConfigText = (home) =>
  [
    `[url "file://${home}/remotes/"]`,
    '\tinsteadOf = https://github.com/DEFRA/',
    '[init]',
    '\tdefaultBranch = main',
    '[user]',
    '\tname = Fixture Author',
    '\temail = fixture@example.com',
    '[advice]',
    '\tdetachedHead = false',
    ''
  ].join('\n')

const GH_STAND_IN = `#!/bin/bash
data="$HOME/gh"
case "$1 $2" in
  "search prs")
    f="$data/search/$(printf '%s' "$3" | tr '/:' '__').json"
    [[ -f "$f" ]] || exit 1
    cat "$f" ;;
  "pr view")
    f="$data/view/\${5#DEFRA/}-$3.json"
    [[ -f "$f" ]] || exit 1
    if [[ "$8" == "--jq" ]]; then jq -r "$9" "$f"; else cat "$f"; fi ;;
  "pr diff")
    f="$data/diff/\${5#DEFRA/}-$3.diff"
    [[ -f "$f" ]] || exit 1
    cat "$f" ;;
  *)
    if [[ "$1" == "api" ]]; then
      repo_pr=\${2#repos/DEFRA/}
      f="$data/files/\${repo_pr%%/*}-$(echo "$repo_pr" | cut -d/ -f3).json"
      [[ -f "$f" ]] || exit 1
      jq -r ".[] | ( $5 )" "$f"
    else
      exit 2
    fi ;;
esac
`

const writeExecutable = (path, text) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
  chmodSync(path, 0o755)
}

const workspaceFiles = () => ({
  'repos.json': '{ "reposDir": "repos", "githubOrg": "DEFRA", "repos": [] }\n',
  '.claude/skills/review/assets/routing.json': readFileSync(
    realRoutingPath,
    'utf8'
  ),
  'docs/best-practices/java/spring-boot.md':
    '# Spring Boot\n\nUse constructor injection.\n',
  'docs/best-practices/java/modern-java.md':
    '# Modern Java\n\nNo trailing newline here.',
  'docs/best-practices/node/hapi.md': '# hapi\n\nOne plugin per feature.\n'
})

const pullRequest = (repo, number, state, createdAt) => ({
  number,
  title: `Change ${repo} ${number}`,
  repository: { name: repo, nameWithOwner: `DEFRA/${repo}` },
  url: `https://github.com/DEFRA/${repo}/pull/${number}`,
  state,
  ...(createdAt === undefined ? {} : { createdAt })
})

const view = ({ merged, mergeCommit, head, files }) => ({
  files: files.map((path) => ({ path, additions: 1, deletions: 0 })),
  mergedAt: merged ? '2026-11-02T10:00:00Z' : null,
  mergeCommit: mergeCommit === undefined ? null : { oid: mergeCommit },
  headRefOid: head
})

const changedFiles = (entries) =>
  entries.map(([filename, previous]) =>
    previous === undefined
      ? { filename }
      : { filename, previous_filename: previous }
  )

const diffOf = (repo, number) =>
  `diff --git a/${repo}.txt b/${repo}.txt\n+pull request ${number}\n`

/**
 * What `gh` answers for each search and each pull request, by the fixture
 * SHAs. A pull request with no `view` is one `gh pr view` cannot read.
 *
 * @param {object} shas
 * @returns {{searches: Record<string, object[]>, pullRequests: object[]}}
 */
const ghData = (shas) => ({
  searches: {
    'EUDPA-101': [
      pullRequest(STUB, 7, 'open', '2026-10-01T10:00:00Z'),
      pullRequest(FRONTEND, 3, 'open', '2026-10-03T10:00:00Z'),
      pullRequest(STUB, 9, 'merged', '2026-10-05T10:00:00Z')
    ],
    'EUDPA-102': [],
    'EUDPA-103': [
      pullRequest(STUB, 11, 'open', '2026-10-01T10:00:00Z'),
      pullRequest(FRONTEND, 12, 'merged', '2026-10-02T10:00:00Z'),
      pullRequest(SCHEMAS, 13, 'open', '2026-10-03T10:00:00Z')
    ],
    'head:feature/tidy/logs': [pullRequest(STUB, 7, 'open')]
  },
  pullRequests: [
    {
      repo: STUB,
      number: 7,
      view: view({ head: shas[STUB].head, files: ['src/Stub.java'] }),
      files: changedFiles([['src/Stub.java']])
    },
    {
      repo: STUB,
      number: 9,
      view: view({
        merged: true,
        mergeCommit: shas[STUB].merge,
        head: shas[STUB].head,
        files: ['src/Stub.java', 'README.md', 'src/New.java']
      }),
      files: [
        changedFiles([['src/Stub.java'], ['README.md']]),
        changedFiles([['src/New.java', 'src/Old.java']])
      ]
    },
    {
      repo: FRONTEND,
      number: 3,
      view: view({ head: shas[FRONTEND].head, files: ['src/index.js'] }),
      files: changedFiles([['src/index.js'], ['package.json']])
    },
    { repo: STUB, number: 11, files: changedFiles([['README.md']]) },
    {
      repo: FRONTEND,
      number: 12,
      view: view({
        merged: true,
        head: shas[FRONTEND].head,
        files: ['src/index.js']
      }),
      files: changedFiles([['src/index.js']])
    },
    {
      repo: SCHEMAS,
      number: 13,
      view: view({
        head: 'dead0000000000000000000000000000000000ef',
        files: ['schema.json']
      }),
      files: changedFiles([['schema.json']])
    }
  ].map((entry) => ({ ...entry, diff: diffOf(entry.repo, entry.number) }))
})

const pagesOf = (files) => (Array.isArray(files[0]) ? files : [files])

const jsonText = (value) => `${JSON.stringify(value)}\n`

const writeGhAnswers = (home, data) => {
  const answers = {}
  for (const [query, hits] of Object.entries(data.searches)) {
    answers[`gh/search/${query.replaceAll(/[/:]/g, '_')}.json`] = jsonText(hits)
  }
  for (const { repo, number, view: saved, files, diff } of data.pullRequests) {
    if (saved !== undefined) {
      answers[`gh/view/${repo}-${number}.json`] = jsonText(saved)
    }
    answers[`gh/files/${repo}-${number}.json`] = jsonText(pagesOf(files))
    answers[`gh/diff/${repo}-${number}.diff`] = diff
  }
  writeFiles(home, answers)
}

/**
 * A staged workspace for the prepare cases: the real review routing and
 * three best-practice files, bare remotes for the stub, the animals
 * frontend and the schemas under `<home>/remotes` that `https://github.com/DEFRA/`
 * is rewritten to, a working clone of the stub under `repos/` on
 * `feat/local` with a staged and an unstaged change, and stand-ins for
 * `gh` and `tim` in `<home>/stub-bin`.
 *
 * @param {{scripts?: string[]}} [opts]
 * @returns {Promise<{home: string, root: string, remove: () => void, shas: object, data: object}>}
 */
export const stagePrepareWorkspace = async ({ scripts = [] } = {}) => {
  const staged = stageBashWorkspace({ scripts, files: workspaceFiles() })
  markWorkspaceRoot(staged.root)
  const shas = await buildRemotes(staged.home)
  await buildLocalRepo(staged.root, staged.home)
  writeFileSync(join(staged.home, 'gitconfig'), gitConfigText(staged.home))
  const data = ghData(shas)
  writeGhAnswers(staged.home, data)
  writeExecutable(join(staged.home, 'stub-bin', 'gh'), GH_STAND_IN)
  writeExecutable(
    join(staged.home, 'stub-bin', 'tim'),
    `#!/bin/sh\nTIM_NO_AUTO_PULL=1 exec node "${timCliPath}" "$@"\n`
  )
  return { ...staged, shas, data }
}

/**
 * The environment both the Bash and tim run in: the stand-ins first on
 * PATH, git reading the fixture config, and the fixture Atlassian server.
 *
 * @param {{home: string}} staged
 * @param {Record<string, string>} atlassian - From `atlassianEnv`
 * @returns {Record<string, string | undefined>}
 */
export const prepareEnv = (staged, atlassian) => ({
  ...atlassian,
  PATH: `${join(staged.home, 'stub-bin')}:${process.env.PATH}`,
  GIT_CONFIG_GLOBAL: join(staged.home, 'gitconfig'),
  GIT_CONFIG_NOSYSTEM: '1',
  TIM_NO_AUTO_PULL: '1',
  TIM_WORKSPACE: undefined
})

const reviewFolderOf = (root, reviewId) =>
  join(root, 'workareas', 'reviews', reviewId)

/**
 * Saves into a review's raw folder what the review skill's `gh` steps
 * save: `prs.json` from the search, then `<repo>.json` from `gh pr view`
 * for each selected pull request `gh` can read, and each one's changed
 * files under `.prs/` and its diff under `.diffs/`.
 *
 * @param {{root: string, data: object}} staged
 * @param {object} args
 * @param {string} args.reviewId
 * @param {string} args.query - The search `gh search prs` ran
 * @param {{repo: string, number: number}[]} args.selected
 */
export const saveGhOutput = (staged, { reviewId, query, selected }) => {
  const folder = reviewFolderOf(staged.root, reviewId)
  const files = { '.raw/prs.json': jsonText(staged.data.searches[query]) }
  for (const { repo, number } of selected) {
    const found = staged.data.pullRequests.find(
      (entry) => entry.repo === repo && entry.number === number
    )
    if (found.view !== undefined) {
      files[`.raw/${repo}.json`] = jsonText(found.view)
    }
    files[`.prs/${repo}-${number}.json`] = jsonText(pagesOf(found.files))
    files[`.diffs/${repo}.diff`] = found.diff
  }
  writeFiles(folder, files)
}

/**
 * Gives a file review a verdict, as a reviewer would between two runs.
 *
 * @param {{root: string}} staged
 * @param {{reviewId: string, repo: string, file: string}} args
 */
export const setVerdict = (staged, { reviewId, repo, file }) => {
  const path = join(
    reviewFolderOf(staged.root, reviewId),
    'file-reviews',
    repo,
    `${file.replaceAll('/', '_')}.review.json`
  )
  const review = JSON.parse(readFileSync(path, 'utf8'))
  writeFileSync(
    path,
    `${JSON.stringify({ ...review, verdict: 'SAFE' }, null, 2)}\n`
  )
}

/**
 * Makes a ticket's review a refresh: an index file and a meta with no pull
 * requests.
 *
 * @param {{root: string}} staged
 * @param {string} reviewId
 */
export const makeRefreshable = (staged, reviewId) =>
  writeFiles(reviewFolderOf(staged.root, reviewId), {
    'review-index.md': '# Index\n',
    '.review-meta.json': `${JSON.stringify({ id: reviewId, ticket: reviewId, prs: [] }, null, 2)}\n`
  })

const gitState = async (dir) => {
  const read = (args) =>
    execa('git', ['-C', dir, ...args], { reject: false }).then(
      ({ stdout }) => stdout
    )
  return {
    head: await read(['rev-parse', 'HEAD']),
    fetch: (await read(['config', '--get-all', 'remote.origin.fetch'])).split(
      '\n'
    ),
    url: await read(['config', '--get', 'remote.origin.url'])
  }
}

const isSkillWritten = (path) =>
  path.startsWith('.diffs/') ||
  path.startsWith('.prs/') ||
  path.startsWith('.raw/')

/**
 * What a run left in a review folder: every file outside the clones and
 * the folders the skill's `gh` steps write, and each clone's HEAD, fetch
 * refspecs and origin.
 *
 * @param {{root: string, home: string}} staged
 * @param {string} reviewId
 * @returns {Promise<{files: Record<string, string>, clones: Record<string, object>}>}
 */
export const observeReview = async (staged, reviewId) => {
  const folder = reviewFolderOf(staged.root, reviewId)
  const files = Object.fromEntries(
    Object.entries(recordFolderFiles(folder, staged.home)).filter(
      ([path]) => !path.startsWith('repos/') && !isSkillWritten(path)
    )
  )
  const clones = {}
  for (const repo of [STUB, FRONTEND, SCHEMAS]) {
    const dir = join(folder, 'repos', repo)
    if (existsSync(dir)) {
      clones[repo] = normaliseState(await gitState(dir), staged.home)
    }
  }
  return { files, clones }
}

const normaliseState = (state, home) =>
  JSON.parse(normaliseRecordedText(JSON.stringify(state), home))

const ticketReview = (name, reviewId, query, selected, extra = {}) => ({
  name,
  reviewId,
  steps: [
    {
      bash: [
        'tools/review/prepare-review.sh',
        [reviewId, ...(extra.args ?? [])]
      ],
      tim: ['prepare', reviewId, ...(extra.args ?? [])],
      gh: { reviewId, query, selected }
    }
  ],
  output: extra.args?.includes('--json') ? 'json' : 'text'
})

const BRANCH = 'feature/tidy/logs'
const BRANCH_REVIEW_ID = 'tidy-logs'

const localStep = (args) => ({
  bash: ['tools/review/prepare-review-local.sh', args],
  tim: ['prepare', '--local', ...args]
})

const LOCAL_ID = `local/${STUB}/feat/local`

/**
 * Every prepare and start case: each step's Bash script and arguments, the
 * tim arguments that stand in for them and, for a ticket or branch review,
 * what the skill's `gh` steps save before tim runs.
 */
export const prepareCases = [
  ticketReview(
    'a ticket with comments, Confluence pages and pull requests in two repos',
    'EUDPA-101',
    'EUDPA-101',
    [
      { repo: FRONTEND, number: 3 },
      { repo: STUB, number: 9 }
    ]
  ),
  ticketReview(
    'the same ticket as JSON',
    'EUDPA-101',
    'EUDPA-101',
    [
      { repo: FRONTEND, number: 3 },
      { repo: STUB, number: 9 }
    ],
    { args: ['--json'] }
  ),
  ticketReview('a ticket with no pull requests', 'EUDPA-104', 'EUDPA-102', []),
  ticketReview(
    'a ticket Jira gives no labels field',
    'EUDPA-102',
    'EUDPA-102',
    []
  ),
  ticketReview(
    'pull requests with no saved view, no merge commit or a commit the remote lacks',
    'EUDPA-103',
    'EUDPA-103',
    [
      { repo: FRONTEND, number: 12 },
      { repo: SCHEMAS, number: 13 },
      { repo: STUB, number: 11 }
    ]
  ),
  ticketReview('a ticket Jira cannot find', 'EUDPA-999', 'EUDPA-102', []),
  ticketReview(
    'a ticket Jira cannot find, as JSON',
    'EUDPA-999',
    'EUDPA-102',
    [],
    { args: ['--json'] }
  ),
  {
    name: 'a second run fetches into the clones and keeps a file review with a verdict',
    reviewId: 'EUDPA-101',
    steps: [
      ...ticketReview('first', 'EUDPA-101', 'EUDPA-101', [
        { repo: FRONTEND, number: 3 },
        { repo: STUB, number: 9 }
      ]).steps,
      {
        bash: ['tools/review/prepare-review.sh', ['EUDPA-101']],
        tim: ['prepare', 'EUDPA-101'],
        gh: {
          reviewId: 'EUDPA-101',
          query: 'EUDPA-101',
          selected: [
            { repo: FRONTEND, number: 3 },
            { repo: STUB, number: 9 }
          ]
        },
        before: (staged) =>
          setVerdict(staged, {
            reviewId: 'EUDPA-101',
            repo: STUB,
            file: 'README.md'
          })
      }
    ],
    output: 'text'
  },
  {
    name: 'a branch review with a description',
    reviewId: BRANCH_REVIEW_ID,
    steps: [
      {
        bash: [
          'tools/review/prepare-review.sh',
          ['--branch', BRANCH, '--desc', 'Tidy the logs']
        ],
        tim: ['prepare', '--branch', BRANCH, '--desc', 'Tidy the logs'],
        gh: {
          reviewId: BRANCH_REVIEW_ID,
          query: `head:${BRANCH}`,
          selected: [{ repo: STUB, number: 7 }]
        }
      }
    ],
    output: 'text'
  },
  {
    name: 'a branch review with no description, as JSON',
    reviewId: BRANCH_REVIEW_ID,
    steps: [
      {
        bash: [
          'tools/review/prepare-review.sh',
          ['--branch', BRANCH, '--json']
        ],
        tim: ['prepare', '--branch', BRANCH, '--json'],
        gh: {
          reviewId: BRANCH_REVIEW_ID,
          query: `head:${BRANCH}`,
          selected: [{ repo: STUB, number: 7 }]
        }
      }
    ],
    output: 'json'
  },
  {
    name: 'no ticket and no branch',
    steps: [{ bash: ['tools/review/prepare-review.sh', []], tim: ['prepare'] }],
    output: 'usage'
  },
  {
    name: 'a local review of the checked-out branch',
    reviewId: LOCAL_ID,
    steps: [localStep([STUB, 'feat/local'])],
    output: 'text'
  },
  {
    name: 'a local review as JSON',
    reviewId: LOCAL_ID,
    steps: [localStep([STUB, 'feat/local', '--json'])],
    output: 'json'
  },
  {
    name: 'a local review of a branch that is not checked out',
    reviewId: `local/${STUB}/feat/other`,
    steps: [localStep([STUB, 'feat/other'])],
    output: 'text'
  },
  {
    name: 'a local review of the files the caller names',
    reviewId: LOCAL_ID,
    steps: [
      localStep([STUB, 'feat/local', '--files', 'src/b.js,,README.md,src/b.js'])
    ],
    output: 'text'
  },
  {
    name: 'a local review of main, which changes nothing',
    reviewId: `local/${STUB}/main`,
    steps: [localStep([STUB, 'main'])],
    output: 'text'
  },
  {
    name: 'a second local run keeps a file review with a verdict',
    reviewId: LOCAL_ID,
    steps: [
      localStep([STUB, 'feat/local']),
      {
        ...localStep([STUB, 'feat/local']),
        before: (staged) =>
          setVerdict(staged, {
            reviewId: LOCAL_ID,
            repo: STUB,
            file: 'src/b.js'
          })
      }
    ],
    output: 'text'
  },
  {
    name: 'a local review of a folder that is not a git repo',
    steps: [localStep(['trade-imports-none', 'main'])],
    output: 'text'
  },
  {
    name: 'a local review of a branch the repo lacks',
    steps: [localStep([STUB, 'feat/none'])],
    output: 'text'
  },
  {
    name: 'a local review with no branch',
    steps: [localStep([STUB])],
    output: 'usage'
  },
  {
    name: 'start --local runs the local prepare',
    reviewId: LOCAL_ID,
    steps: [
      {
        bash: ['tools/review/start-review.sh', ['--local', STUB, 'feat/local']],
        tim: ['start', '--local', STUB, 'feat/local']
      }
    ],
    output: 'text'
  },
  {
    name: 'start on a review with an index builds the refresh scope',
    reviewId: 'EUDPA-104',
    steps: [
      {
        bash: ['tools/review/start-review.sh', ['EUDPA-104']],
        tim: ['start', 'EUDPA-104'],
        before: (staged) => makeRefreshable(staged, 'EUDPA-104')
      }
    ],
    output: 'refresh'
  },
  {
    name: 'start with no ticket',
    steps: [{ bash: ['tools/review/start-review.sh', []], tim: ['start'] }],
    output: 'usage'
  }
]
