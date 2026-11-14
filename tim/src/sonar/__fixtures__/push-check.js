import { execa } from 'execa'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { normaliseRecordedText } from '../../test-support/bash-golden-harness.js'

export const checkScript = 'tools/sonar/sonar-push-check.sh'
export const gateScript = 'scripts/sonar/sonar-push-gate.sh'
export const goldenPath = '__fixtures__/__golden__/push-check.json'

export const PROJECT_KEY = 'DEFRA_trade-imports-fake-service'
export const BRANCH = 'feat/EUDPA-1-push-check'
export const FAKE_TOKEN = 'fake-sonar-token'
export const PULL_REQUEST = { key: '42', base: 'main' }

const FIXED_GIT_ENV = {
  GIT_AUTHOR_NAME: 'tim-test',
  GIT_AUTHOR_EMAIL: 'tim-test@example.invalid',
  GIT_AUTHOR_DATE: '2026-11-14T07:00:00Z',
  GIT_COMMITTER_NAME: 'tim-test',
  GIT_COMMITTER_EMAIL: 'tim-test@example.invalid',
  GIT_COMMITTER_DATE: '2026-11-14T07:00:00Z'
}

const git = (cwd, ...args) =>
  execa('git', args, { cwd, env: FIXED_GIT_ENV, extendEnv: true })

const writeExecutable = (path, body) =>
  writeFileSync(path, `#!/bin/sh\n${body}\n`, { mode: 0o755 })

const recordedTool = (name, sideEffects = {}) =>
  [
    `echo "${name} $* @ $(pwd)" >> "$FAKE_CALLS"`,
    'line=1',
    'last_line=$FAKE_LINES',
    '[ -n "$last_line" ] || last_line=3',
    'while [ "$line" -le "$last_line" ]; do',
    `  echo "${name} output line $line"`,
    '  line=$((line + 1))',
    'done',
    'case "$*" in',
    ...Object.entries(sideEffects).map(
      ([pattern, effect]) => `  ${pattern}) ${effect} ;;`
    ),
    '  *) ;;',
    'esac',
    'if [ -n "$FAKE_FAIL" ]; then',
    `  case "${name} $*" in "$FAKE_FAIL"*) echo "${name} failed" >&2; exit 1 ;; esac`,
    'fi',
    'exit 0'
  ].join('\n')

/**
 * Stand-in mvn, npm, sonar-scanner, gh and zsh in a folder of their own.
 * The build tools append `<tool> <args> @ <cwd>` to $FAKE_CALLS, print
 * $FAKE_LINES lines (3 by default) and fail when `<tool> <args>` starts
 * with $FAKE_FAIL. gh prints $FAKE_PR on a branch, and fails when it is
 * unset or HEAD is detached, as the real one does. zsh prints a banner
 * line, then $FAKE_ZSH_TOKEN, after sleeping $FAKE_ZSH_DELAY seconds when
 * it is set.
 *
 * @param {string} home
 * @param {object} [opts]
 * @param {boolean} [opts.withScanner=true]
 * @returns {string} the folder
 */
export const stageFakeTools = (home, { withScanner = true } = {}) => {
  const bin = join(home, 'bin')
  mkdirSync(bin, { recursive: true })
  writeExecutable(
    join(bin, 'mvn'),
    recordedTool('mvn', {
      '"-q clean verify sonar:sonar"*': 'echo built > mvn-artefact.txt'
    })
  )
  writeExecutable(
    join(bin, 'npm'),
    recordedTool('npm', {
      '"run --if-present lint"': 'echo "{}" > lint-cache.json',
      test: 'mkdir -p coverage-report && echo covered > coverage-report/lcov.info'
    })
  )
  if (withScanner) {
    writeExecutable(
      join(bin, 'sonar-scanner'),
      recordedTool('sonar-scanner', {
        '*': 'mkdir -p .scannerwork && echo task > .scannerwork/report-task.txt'
      })
    )
  }
  writeExecutable(
    join(bin, 'gh'),
    [
      'git symbolic-ref -q HEAD > /dev/null || { echo "could not determine current branch" >&2; exit 1; }',
      'if [ -n "$FAKE_PR" ]; then echo "$FAKE_PR"; else echo "no pull requests found" >&2; exit 1; fi'
    ].join('\n')
  )
  writeExecutable(
    join(bin, 'zsh'),
    [
      'if [ -n "$FAKE_ZSH_DELAY" ]; then /bin/sleep "$FAKE_ZSH_DELAY"; fi',
      'echo "zsh banner"',
      'printf "%s\\n" "$FAKE_ZSH_TOKEN"'
    ].join('\n')
  )
  return bin
}

const PROPERTIES = `sonar.projectKey=${PROJECT_KEY}\nsonar.organization=defra\n`

const KINDS = {
  node: { 'package.json': '{ "name": "fake-service" }\n' },
  java: { 'pom.xml': '<project></project>\n' },
  neither: {}
}

/**
 * A git repo on {@link BRANCH} with two commits: a .gitignore for
 * node_modules, target and .cache, the build file for `kind`, a src
 * folder and, unless `properties` says otherwise, a
 * sonar-project.properties naming {@link PROJECT_KEY}.
 *
 * @param {string} path
 * @param {object} [opts]
 * @param {'node'|'java'|'neither'} [opts.kind='node']
 * @param {string|null} [opts.properties] - the file's text, or null for none
 * @returns {Promise<string>} the repo's path
 */
export const createRepo = async (
  path,
  { kind = 'node', properties = PROPERTIES } = {}
) => {
  mkdirSync(join(path, 'src'), { recursive: true })
  await git(path, 'init', '--quiet', '-b', 'main')
  const files = {
    'README.md': '# fake service\n',
    '.gitignore': 'node_modules/\ntarget/\n.cache/\n',
    ...KINDS[kind],
    ...(properties === null ? {} : { 'sonar-project.properties': properties })
  }
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(path, name), content)
  }
  await git(path, 'add', '.')
  await git(path, 'commit', '--quiet', '-m', 'initial commit')
  writeFileSync(join(path, 'src', 'index.js'), 'export const ready = true\n')
  await git(path, 'add', 'src/index.js')
  await git(path, 'commit', '--quiet', '-m', 'add src')
  await git(path, 'switch', '--quiet', '-c', BRANCH)
  return path
}

export const detachHead = (repo) => git(repo, 'checkout', '--quiet', '--detach')

const prJson = `{"number":${PULL_REQUEST.key},"baseRefName":"${PULL_REQUEST.base}"}`

/**
 * Every case the check runs from inside a repo, for the command `git push`
 * unless the case names another. `arrange` prepares the repo after it is
 * created; `env` adds to the stand-in tools' controls.
 */
export const checkCases = [
  { name: 'not a push', command: 'git status' },
  { name: 'no token', token: null },
  { name: 'no sonar-project.properties', repo: { properties: null } },
  {
    name: 'no project key',
    repo: { properties: 'sonar.organization=defra\n' }
  },
  {
    name: 'project key holding an equals sign',
    repo: { properties: 'sonar.projectKey=DEFRA_a=b\n' }
  },
  { name: 'detached HEAD with no pull request', arrange: detachHead },
  { name: 'node passes on the branch' },
  { name: 'node passes on the pull request', pullRequest: true },
  {
    name: 'detached HEAD with a pull request',
    arrange: detachHead,
    pullRequest: true
  },
  { name: 'npm ci fails', env: { FAKE_FAIL: 'npm ci' } },
  {
    name: 'format check fails',
    env: { FAKE_FAIL: 'npm run --if-present format:check' }
  },
  { name: 'lint fails', env: { FAKE_FAIL: 'npm run --if-present lint' } },
  { name: 'npm test fails', env: { FAKE_FAIL: 'npm test' } },
  { name: 'scanner fails on the branch', env: { FAKE_FAIL: 'sonar-scanner' } },
  {
    name: 'scanner fails on the pull request',
    pullRequest: true,
    env: { FAKE_FAIL: 'sonar-scanner' }
  },
  { name: 'sonar-scanner missing', withScanner: false },
  {
    name: 'tracked file changed',
    arrange: (repo) => writeFileSync(join(repo, 'README.md'), '# changed\n')
  },
  {
    name: 'untracked file there before the check',
    arrange: (repo) => writeFileSync(join(repo, 'notes.txt'), 'mine\n')
  },
  { name: 'java passes', repo: { kind: 'java' } },
  {
    name: 'java fails with a long log',
    repo: { kind: 'java' },
    pullRequest: true,
    env: { FAKE_LINES: '100', FAKE_FAIL: 'mvn' }
  },
  { name: 'neither pom.xml nor package.json', repo: { kind: 'neither' } }
]

/**
 * Every case the workspace-root gate runs. `cwd` and `command` are built
 * from the staged paths: `repo` is the repo's path, `home` the HOME. The
 * command is `git push` unless the case names another.
 */
export const gateCases = [
  { name: 'plain push from the repo', cwd: ({ repo }) => repo },
  {
    name: 'push with options from the repo',
    command: () => 'git push -u origin HEAD',
    cwd: ({ repo }) => repo
  },
  {
    name: 'push on the second line',
    command: () => 'cd somewhere\ngit push',
    cwd: ({ repo }) => repo
  },
  {
    name: 'git -C names the repo',
    command: ({ repo }) => `git -C ${repo} push`,
    cwd: ({ home }) => home
  },
  {
    name: 'git -C names the repo under ~ in quotes',
    command: () => 'git -C "~/service" push',
    cwd: ({ home }) => home
  },
  {
    name: '--work-tree names the repo relative to cwd',
    command: () => 'git --work-tree=service push',
    cwd: ({ home }) => home
  },
  {
    name: 'git -c with a subfolder as cwd',
    command: () => 'git -c push.default=current push',
    cwd: ({ repo }) => join(repo, 'src')
  },
  {
    name: 'not a push',
    command: () => 'echo nothing',
    cwd: ({ repo }) => repo
  },
  {
    name: 'gitpush is not a push',
    command: () => 'gitpush',
    cwd: ({ repo }) => repo
  },
  { name: 'no cwd', cwd: () => '' },
  {
    name: 'cwd that does not exist',
    cwd: ({ home }) => join(home, 'missing')
  },
  {
    name: 'token from zsh',
    cwd: ({ repo }) => repo,
    token: null,
    env: { FAKE_ZSH_TOKEN: 'zsh-sonar-token' }
  },
  { name: 'no token anywhere', cwd: ({ repo }) => repo, token: null },
  { name: 'pull request found', cwd: ({ repo }) => repo, pullRequest: true }
]

/**
 * The fake tools and the case's repo at `<home>/service`, arranged for
 * the case.
 *
 * @returns {Promise<{home: string, repo: string, bin: string}>}
 */
export const stageCase = async (home, testCase) => {
  const repo = await createRepo(join(home, 'service'), testCase.repo)
  if (testCase.arrange) await testCase.arrange(repo)
  const bin = stageFakeTools(home, {
    withScanner: testCase.withScanner ?? true
  })
  return { home: realpathSync(home), repo: realpathSync(repo), bin }
}

/**
 * The environment a case runs under: the fake tools first on a PATH that
 * holds only them and the system folders, the token unless the case has
 * none, and the fakes' controls.
 */
export const caseEnv = ({ home, bin }, testCase) => ({
  HOME: home,
  PATH: `${bin}:/usr/bin:/bin:/usr/sbin:/sbin`,
  FAKE_CALLS: join(home, 'calls.log'),
  SONAR_TOKEN: testCase.token === null ? undefined : FAKE_TOKEN,
  FAKE_PR: testCase.pullRequest ? prJson : undefined,
  ...testCase.env
})

const textOrNull = (path) =>
  existsSync(path) ? readFileSync(path, 'utf8') : null

const markerOf = (text, head) => (text === `${head}\n` ? '<HEAD>' : text)

/**
 * What a run left behind: the tool calls, the marker (`<HEAD>` when it
 * holds the commit checked out), the build log and the repo's
 * `git status --porcelain`, with HOME as `<HOME>`.
 */
export const recordAftermath = async ({ home, repo }) => {
  const status = await git(
    repo,
    'status',
    '--porcelain',
    '--untracked-files=all'
  )
  const head = await git(repo, 'rev-parse', 'HEAD')
  return {
    calls: normaliseRecordedText(textOrNull(join(home, 'calls.log')), home),
    marker: markerOf(
      textOrNull(join(repo, '.cache', 'prepush-verified')),
      head.stdout
    ),
    log: normaliseRecordedText(
      textOrNull(join(repo, '.cache', 'sonar-push-check.log')),
      home
    ),
    status: status.stdout
  }
}

/**
 * The JSON a Claude Code PreToolUse hook gets for a Bash call.
 */
export const hookInput = (command, cwd) =>
  JSON.stringify({ tool_input: { command }, cwd })
