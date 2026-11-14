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
  recordFolderFiles,
  stageBashWorkspace
} from '../../test-support/bash-golden-harness.js'
import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'

const timCliPath = fileURLToPath(new URL('../../cli.js', import.meta.url))

export const shareScripts = [
  'tools/review/share-review.sh',
  'tools/github/pr-comment.sh'
]

export const FRONTEND = 'trade-imports-animals-frontend'
export const BACKEND = 'trade-imports-animals-backend'
export const STUB = 'trade-imports-stub'
export const REVIEWER = 'octo-reviewer'

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const item = (id, fields) => ({
  id,
  file: `src/server/file-${id}.js`,
  line: id * 10,
  severity: 'Major',
  category: 'correctness',
  issue: `Issue ${id}.`,
  fix: `Must: fix ${id}. One way: change line ${id * 10}.`,
  disposition: 'Fix',
  status: 'Not Done',
  notes: '',
  ...fields
})

const frontendItems = [
  item(1, { severity: 'Critical', issue: 'A pipe | in the issue.' }),
  item(2, { status: 'Done', notes: 'abc1234' }),
  item(3, { severity: 'Minor', disposition: "Won't Fix", status: '—' }),
  item(4, { severity: 'Minor', status: 'Done', notes: 'def5678' }),
  item(5, { disposition: undefined, status: undefined }),
  item(6, { severity: 'Critical', status: 'Failed', notes: 'tests red' }),
  item(7, { severity: 'Minor' }),
  item(8, { fix: 'No labels on this fix.' })
]

const backendItems = [
  item(1, { status: 'Done', notes: '1111111' }),
  item(2, { severity: 'Minor', disposition: 'Merged', status: '—' })
]

const LONG_ISSUE =
  'the issue text is deliberately long so that the rendered table clears the comment limit the summary mode exists to stay under. '

const bigItems = Array.from({ length: 200 }, (_, index) => ({
  id: index + 1,
  file: `src/server/app/feature/file-${index}.js`,
  line: index * 7 + 1,
  severity: index % 50 === 0 ? 'Critical' : index % 3 === 0 ? 'Minor' : 'Major',
  category: ['comments', 'structure', 'duplication', 'naming', 'logging'][
    index % 5
  ],
  issue: `Item ${index}: ${LONG_ISSUE.repeat(3)}`,
  fix: `Must: ${'what this item must satisfy, at similar length. '.repeat(3)}`,
  disposition: 'Fix',
  status: index < 2 ? 'Not Done' : 'Done',
  notes: 'deadbeef'
}))

const reviews = 'workareas/reviews'
const shared = 'workareas/shared'

/**
 * Three reviews: EUDPA-201 has a verdict, three PRs across three repos
 * (one PR number shared by two repos), an items file with every status,
 * one with nothing open, a repo with only a summary, and the clones and
 * diffs a handoff leaves behind. EUDPA-202 has one PR and nothing else.
 * EUDPA-203 has 200 long items, enough to pass GitHub's comment limit.
 */
export const shareReviewFiles = {
  [`${reviews}/EUDPA-201/review-index.md`]:
    '# Code Review: EUDPA-201\n\n**Verdict:**   CONCERNS — two items open.\n\n**Verdict:** a second verdict line\n',
  [`${reviews}/EUDPA-201/.review-meta.json`]: jsonText({
    id: 'EUDPA-201',
    ticket: 'EUDPA-201',
    prs: [
      { repo: FRONTEND, pr: 12, commit: 'abcdef0123456789', state: 'open' },
      { repo: BACKEND, pr: 12, commit: null, state: 'open' },
      { repo: STUB, pr: 7, commit: '0123456789abcdef', state: 'merged' }
    ]
  }),
  [`${reviews}/EUDPA-201/items.${FRONTEND}.json`]: jsonText({
    repo: FRONTEND,
    items: frontendItems
  }),
  [`${reviews}/EUDPA-201/items.${BACKEND}.json`]: jsonText({
    repo: BACKEND,
    items: backendItems
  }),
  [`${reviews}/EUDPA-201/review.${STUB}.md`]: '# Stub review\n',
  [`${reviews}/EUDPA-201/file-reviews/${FRONTEND}/src_a.js.review.json`]:
    '{"verdict":"PASS"}\n',
  [`${reviews}/EUDPA-201/repos/${FRONTEND}/README.md`]: 'clone\n',
  [`${reviews}/EUDPA-201/.diffs/${FRONTEND}.diff`]: 'diff\n',
  [`${reviews}/EUDPA-201/.prs/${FRONTEND}-12.json`]: '[]\n',
  [`${shared}/EUDPA-201/stale.md`]: 'left from an earlier share\n',
  [`${shared}/EUDPA-201/repos/kept.txt`]: 'excluded, so never deleted\n',
  [`${reviews}/EUDPA-202/.review-meta.json`]: jsonText({
    id: 'EUDPA-202',
    prs: [{ repo: STUB, pr: 3, state: 'open' }]
  }),
  [`${reviews}/EUDPA-203/review-index.md`]:
    '# Code Review: EUDPA-203\n\n**Verdict:** PASS — fixture verdict for the summary test.\n',
  [`${reviews}/EUDPA-203/.review-meta.json`]: jsonText({
    id: 'EUDPA-203',
    prs: [{ repo: FRONTEND, pr: 1, commit: '0000000', state: 'open' }]
  }),
  [`${reviews}/EUDPA-203/items.${FRONTEND}.json`]: jsonText({
    items: bigItems
  })
}

/**
 * The dry-run cases: the Bash takes `args`, tim takes `review share`
 * with the same arguments and, where the Bash asked gh, `--reviewer`.
 * `ghFails` makes the gh stand-in fail, so the Bash names no reviewer.
 */
export const dryRunCases = [
  {
    name: 'comment-only full table',
    args: [
      'EUDPA-201',
      '--repo',
      FRONTEND,
      '--pr',
      '12',
      '--comment-only',
      '--dry-run'
    ]
  },
  {
    name: 'comment-only summary',
    args: [
      'EUDPA-201',
      '--repo',
      FRONTEND,
      '--pr',
      '12',
      '--comment-only',
      '--summary',
      '--dry-run'
    ]
  },
  {
    name: 'comment-only with nothing open',
    args: ['EUDPA-201', '--repo', BACKEND, '--comment-only', '--dry-run']
  },
  {
    name: 'comment-only with only a summary file',
    args: ['EUDPA-201', '--repo', STUB, '--comment-only', '--dry-run']
  },
  {
    name: 'comment-only summary with nothing open',
    args: [
      'EUDPA-201',
      '--repo',
      BACKEND,
      '--comment-only',
      '--summary',
      '--dry-run'
    ]
  },
  {
    name: 'handoff every PR',
    args: ['EUDPA-201', '--dry-run'],
    watch: `${shared}/EUDPA-201`
  },
  {
    name: 'handoff summary on a named branch, one PR number in two repos, as JSON',
    args: [
      'EUDPA-201',
      '--pr',
      '12',
      '--summary',
      '--branch',
      'review/custom',
      '--dry-run',
      '--json'
    ],
    watch: `${shared}/EUDPA-201`
  },
  {
    name: 'comment-only as JSON',
    args: ['EUDPA-201', '--repo', STUB, '--comment-only', '--dry-run', '--json']
  },
  {
    name: 'comment-only with no items, no summary and no reviewer',
    args: ['EUDPA-202', '--comment-only', '--dry-run'],
    ghFails: true
  },
  {
    name: 'handoff with no items and no summary',
    args: ['EUDPA-202', '--dry-run'],
    watch: `${shared}/EUDPA-202`
  },
  {
    name: 'full table over the comment limit',
    args: [
      'EUDPA-203',
      '--repo',
      FRONTEND,
      '--pr',
      '1',
      '--comment-only',
      '--dry-run'
    ]
  },
  {
    name: 'summary of the same review fits',
    args: [
      'EUDPA-203',
      '--repo',
      FRONTEND,
      '--pr',
      '1',
      '--comment-only',
      '--summary',
      '--dry-run'
    ]
  },
  {
    name: 'no PR in the repo',
    args: ['EUDPA-201', '--repo', 'trade-imports-schemas', '--dry-run']
  },
  {
    name: 'no PR with that number in the repo',
    args: [
      'EUDPA-201',
      '--repo',
      STUB,
      '--pr',
      '12',
      '--comment-only',
      '--dry-run'
    ]
  },
  {
    name: 'no review',
    args: ['EUDPA-404', '--comment-only', '--dry-run']
  },
  {
    name: 'no ticket',
    args: ['--comment-only', '--dry-run'],
    usage: true
  }
]

/**
 * The tim arguments for a case: the Bash's, then `--reviewer` with the
 * login the gh stand-in gives, unless the case makes gh fail.
 *
 * @param {{args: string[], ghFails?: boolean}} shareCase
 * @returns {string[]}
 */
export const timArgsFor = ({ args, ghFails }) => [
  'review',
  'share',
  ...args,
  ...(ghFails ? [] : ['--reviewer', REVIEWER])
]

const GH_STAND_IN = `#!/bin/bash
[[ -n "$GH_STUB_FAIL" ]] && exit 1
case "$1 $2" in
  "api user") echo "${REVIEWER}" ;;
  "pr comment")
    printf '%s\\n' "$*" >> "$HOME/gh-calls.txt"
    echo "https://github.com/$4/pull/$2#issuecomment-1" ;;
  *) exit 1 ;;
esac
`

const writeExecutable = (path, text) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
  chmodSync(path, 0o755)
}

const GITIGNORE = 'workareas/*\n!workareas/shared/\n'

/**
 * A staged workspace holding the share fixtures, a gh stand-in that
 * answers `gh api user` and records `gh pr comment`, a tim that runs
 * this checkout.
 *
 * @param {{scripts?: string[]}} [opts]
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stageShareWorkspace = ({ scripts = [] } = {}) => {
  const staged = stageBashWorkspace({
    scripts,
    files: { ...shareReviewFiles, '.gitignore': GITIGNORE }
  })
  markWorkspaceRoot(staged.root)
  mkdirSync(join(staged.root, 'repos'))
  writeExecutable(join(staged.home, 'stub-bin', 'gh'), GH_STAND_IN)
  writeExecutable(
    join(staged.home, 'stub-bin', 'tim'),
    `#!/bin/sh\nTIM_NO_AUTO_PULL=1 exec node "${timCliPath}" "$@"\n`
  )
  writeFileSync(
    join(staged.home, 'gitconfig'),
    '[user]\n\tname = Fixture Author\n\temail = fixture@example.com\n[init]\n\tdefaultBranch = main\n[advice]\n\tdetachedHead = false\n'
  )
  return staged
}

/**
 * The environment both the Bash and tim run in.
 *
 * @param {{home: string}} staged
 * @param {{ghFails?: boolean}} [opts]
 * @returns {Record<string, string | undefined>}
 */
export const shareEnv = (staged, { ghFails = false } = {}) => ({
  PATH: `${join(staged.home, 'stub-bin')}:${process.env.PATH}`,
  GIT_CONFIG_GLOBAL: join(staged.home, 'gitconfig'),
  GIT_CONFIG_NOSYSTEM: '1',
  GH_STUB_FAIL: ghFails ? '1' : undefined,
  TIM_NO_AUTO_PULL: '1',
  TIM_WORKSPACE: undefined
})

const listedBodies = (stdout) =>
  stdout
    .split('\n')
    .map((line) => line.match(/^ {2}- (\S+#\d+) → (\S+)$/))
    .filter(Boolean)
    .map(([, label, path]) => ({ label, path }))

const jsonBodies = (stdout) => {
  try {
    const parsed = JSON.parse(stdout)
    const result = parsed.result ?? parsed
    return (result.body_files ?? []).map(({ repo, pr, file }) => ({
      label: `${repo}#${pr}`,
      path: file
    }))
  } catch {
    return []
  }
}

const leftBodies = (stderr) =>
  [...stderr.matchAll(/^Rendered body left at: (\S+)$/gm)].map(([, path]) => ({
    label: 'over the limit',
    path
  }))

const bodyContent = (path) => {
  const content = readFileSync(path, 'utf8')
  const bytes = Buffer.byteLength(content)
  return bytes > 65536 ? { bytes } : content
}

/**
 * A run with each comment body it names read in and its path replaced by
 * `<BODY repo#pr>`, then the bodies removed. A body is named by a
 * `repo#pr → path` line, by `body_files` in the JSON, or by the over-limit
 * refusal.
 *
 * @param {{exitCode: number, stdout: string, stderr: string}} run
 * @returns {object}
 */
export const withBodies = (run) => {
  const named = [
    ...listedBodies(run.stdout),
    ...jsonBodies(run.stdout),
    ...leftBodies(run.stderr)
  ]
  const bodies = Object.fromEntries(
    named.map(({ label, path }) => [label, bodyContent(path)])
  )
  const replaced = (text) =>
    named.reduce(
      (current, { label, path }) => current.split(path).join(`<BODY ${label}>`),
      text
    )
  for (const { path } of named) rmSync(path, { force: true })
  return {
    ...run,
    stdout: replaced(run.stdout),
    stderr: replaced(run.stderr),
    bodies
  }
}

const git = (cwd, ...args) => execa('git', args, { cwd })

/**
 * Makes the staged workspace a git repo on main, everything outside
 * workareas/shared/ committed, pushed to a bare origin at
 * `<home>/origin.git`.
 *
 * @param {{home: string, root: string}} staged
 * @param {Record<string, string | undefined>} env - From {@link shareEnv}
 * @returns {Promise<string>} The bare origin's path
 */
export const makeWorkspaceRepo = async (staged, env) => {
  const origin = join(staged.home, 'origin.git')
  const options = { env, extendEnv: true }
  await execa(
    'git',
    ['init', '--quiet', '--bare', '-b', 'main', origin],
    options
  )
  await execa('git', ['init', '--quiet', '-b', 'main', staged.root], options)
  const run = (...args) => execa('git', args, { ...options, cwd: staged.root })
  await run('add', '--all', '--', '.', ':!workareas/shared')
  await run('commit', '--quiet', '-m', 'workspace')
  await run('remote', 'add', 'origin', origin)
  await run('push', '--quiet', '-u', 'origin', 'main')
  return origin
}

/**
 * The git states a handoff is checked against: a clean workspace, a
 * comment-only post, a re-share with nothing new, a handoff branch already on this machine, one
 * a colleague pushed, and a workspace with changes outside
 * workareas/shared/ (tracked, then untracked).
 */
export const gitCases = [
  { name: 'a fresh handoff branch', shares: 1 },
  {
    name: 'a comment-only post, which touches no branch',
    shares: 1,
    args: ['EUDPA-201', '--repo', STUB, '--comment-only']
  },
  {
    name: 'a re-share with nothing new',
    shares: 2,
    before: async (staged) => {
      rmSync(join(staged.root, 'workareas/shared/EUDPA-201/repos'), {
        recursive: true
      })
    }
  },
  {
    name: 'a handoff branch already on this machine',
    shares: 1,
    before: async (staged, run) => {
      await run('checkout', '--quiet', '-b', 'chore/EUDPA-201')
      writeShared(staged, 'earlier.md', 'an earlier share\n')
      await run('add', 'workareas/shared/EUDPA-201/earlier.md')
      await run('commit', '--quiet', '-m', 'earlier share')
      await run('checkout', '--quiet', 'main')
      rmSync(join(staged.root, 'workareas/shared/EUDPA-201/earlier.md'), {
        force: true
      })
    }
  },
  {
    name: 'a handoff branch a colleague pushed',
    shares: 1,
    before: async (staged, run) => {
      await run('checkout', '--quiet', '-b', 'chore/EUDPA-201')
      writeShared(staged, 'colleague.md', "a colleague's share\n")
      await run('add', 'workareas/shared/EUDPA-201/colleague.md')
      await run('commit', '--quiet', '-m', "colleague's share")
      await run('push', '--quiet', 'origin', 'chore/EUDPA-201')
      await run('checkout', '--quiet', 'main')
      await run('branch', '--quiet', '-D', 'chore/EUDPA-201')
      await run('fetch', '--quiet', 'origin')
    }
  },
  {
    name: 'a tracked change outside workareas/shared/',
    shares: 1,
    before: async (staged) => {
      writeFileSync(join(staged.root, '.gitignore'), `${GITIGNORE}# edited\n`)
    }
  },
  {
    name: 'an untracked file outside workareas/shared/',
    shares: 1,
    before: async (staged) => {
      writeFileSync(join(staged.root, 'notes.txt'), 'notes\n')
    }
  }
]

/**
 * The arguments a git case shares with: its own, else one PR's handoff.
 *
 * @param {{args?: string[]}} gitCase
 * @returns {string[]}
 */
export const gitCaseArgs = ({ args }) =>
  args ?? ['EUDPA-201', '--repo', FRONTEND, '--pr', '12']

const writeShared = (staged, name, text) => {
  const path = join(staged.root, 'workareas/shared/EUDPA-201', name)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

const linesOf = (text) => (text === '' ? [] : text.split('\n'))

/**
 * What a handoff left in git: the branch the workspace is on, every local
 * and origin branch, the handoff branch's commits (subject and body,
 * newest first) and the files it holds under workareas/shared/, and
 * whether origin's handoff branch matches the local one.
 *
 * @param {{root: string}} staged
 * @param {string} branch
 * @returns {Promise<object>}
 */
export const observeGit = async (staged, branch) => {
  const out = async (...args) => {
    const result = await execa('git', args, { cwd: staged.root, reject: false })
    return result.exitCode === 0 ? result.stdout : ''
  }
  const branches = linesOf(
    await out(
      'for-each-ref',
      '--format=%(refname)',
      'refs/heads',
      'refs/remotes'
    )
  )
  const local = await out('rev-parse', `refs/heads/${branch}`)
  const remote = await out('rev-parse', `refs/remotes/origin/${branch}`)
  const upstream = await out(
    'rev-parse',
    '--abbrev-ref',
    `${branch}@{upstream}`
  )
  return {
    current: await out('rev-parse', '--abbrev-ref', 'HEAD'),
    branches,
    commits: linesOf(
      local === ''
        ? ''
        : await out('log', '--format=%s%n%b%n--', 'main..' + branch)
    ),
    files: linesOf(
      local === ''
        ? ''
        : await out('ls-tree', '-r', '--name-only', branch, 'workareas/shared')
    ),
    pushed: local !== '' && local === remote,
    upstream,
    status: linesOf(await out('status', '--porcelain', '-uall'))
  }
}

/**
 * The `gh pr comment` calls the gh stand-in saw, by their arguments, with
 * each body file replaced by its content's first line.
 *
 * @param {{home: string}} staged
 * @returns {string[]}
 */
export const ghCommentCalls = (staged) => {
  const path = join(staged.home, 'gh-calls.txt')
  if (!existsSync(path)) return []
  return linesOf(readFileSync(path, 'utf8').trimEnd()).map((line) =>
    line.replace(
      /--body-file (\S+)$/,
      (_, file) => `--body-file <${readFileSync(file, 'utf8').split('\n')[0]}>`
    )
  )
}

/**
 * The `gh pr comment` commands tim prints for the skill to run, in the
 * shape {@link ghCommentCalls} records them.
 *
 * @param {string} stdout
 * @returns {string[]}
 */
export const postCommandsIn = (stdout) =>
  [
    ...stdout.matchAll(
      /^ {2}gh (pr comment \d+ --repo \S+ --body-file) (\S+)$/gm
    )
  ].map(
    ([, command, file]) =>
      `${command} <${readFileSync(file, 'utf8').split('\n')[0]}>`
  )

/**
 * Every file under a staged folder, as the harness records it.
 *
 * @param {{root: string, home: string}} staged
 * @param {string} folder - Workspace-relative
 * @returns {Record<string, string>}
 */
export const sharedFiles = (staged, folder) =>
  recordFolderFiles(join(staged.root, folder), staged.home)

export { git }
