import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { stageBashWorkspace } from '../../test-support/bash-golden-harness.js'

export const PREPARE_SCRIPTS = {
  start: 'tools/understanding-check/start-check.sh',
  prepare: 'tools/understanding-check/prepare-check.sh',
  redact: 'tools/understanding-check/redact-diff.js'
}

const HELPER_SCRIPTS = ['tools/github/prs.sh']

/**
 * What the Bash scripts did on every case, as the golden test recorded it.
 *
 * @returns {object}
 */
export const readPrepareGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/understanding-check-prepare.json', import.meta.url),
      'utf8'
    )
  )

const PRIVATE_KEY = ['PRIVATE', 'KEY'].join(' ')

const joinedAtRuntime = (...parts) => parts.join('')

/**
 * A diff holding every pattern the redactor knows, and a near miss of
 * each. Each secret is joined at run time so no scanner reads it here.
 */
export const REDACTION_CORPUS = [
  'diff --git a/src/config.js b/src/config.js',
  '--- a/src/config.js',
  '+++ b/src/config.js',
  '@@ -1,3 +1,30 @@',
  '+const API_KEY = "abc123def456"',
  "+const apiKey='lowercase-key-value'",
  '+  password: hunter2,',
  '+  "client_secret": "s3cr3t-value",',
  '+Authorization: Bearer (none)',
  joinedAtRuntime(
    '+export GITHUB_TOKEN=gh',
    'p_abcdefghijklmnopqrstuvwxyz0123456789'
  ),
  '+const tokenizer = createTokenizer()',
  '+  my-api-key: zzz',
  joinedAtRuntime('+aws = AK', 'IAABCDEFGHIJKLMNOP'),
  joinedAtRuntime('+not aws = AK', 'IAabcdefghijklmnop'),
  joinedAtRuntime('+pat gh', 'p_abcdefghijklmnopqrstuvwxyz0123456789ABCD'),
  '+short pat ghp_short',
  joinedAtRuntime('+openai s', 'k-abcdefghijklmnopqrstuvwxyz012345'),
  '+short sk-abc',
  joinedAtRuntime('+jwt ey', 'JhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sig_part-1'),
  joinedAtRuntime('+two parts ey', 'JhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0'),
  `+-----BEGIN RSA ${PRIVATE_KEY}-----`,
  '+not-a-real-key-body-line',
  `+-----END RSA ${PRIVATE_KEY}-----`,
  `+-----BEGIN OPENSSH ${PRIVATE_KEY}-----`,
  '+not-a-real-key-body-line',
  `+-----END OPENSSH ${PRIVATE_KEY}-----`,
  '+-----BEGIN PUBLIC KEY-----',
  '+not-a-real-public-key-line',
  '+-----END PUBLIC KEY-----',
  '+const café = "no secret here"',
  '+const note = `bearer: tok`',
  ''
].join('\n')

const ASCII_FILLER_BYTES = 299

/**
 * A diff whose 300th byte falls inside a two-byte character, so a cut at
 * 300 bytes splits it.
 */
const SPLIT_CHARACTER_DIFF = `${'+'.padEnd(ASCII_FILLER_BYTES, 'x')}é\n+tail line\n`

export const SPLIT_AT_BYTES = '300'

const PLAIN_DIFF = [
  'diff --git a/pom.xml b/pom.xml',
  '--- a/pom.xml',
  '+++ b/pom.xml',
  '@@ -1 +1 @@',
  '-<version>1</version>',
  '+<version>2</version>',
  ''
].join('\n')

const PULL_REQUESTS = [
  {
    number: 9,
    title: 'EUDPA-900 Beta later',
    repository: { name: 'trade-imports-beta' },
    url: 'https://github.com/DEFRA/trade-imports-beta/pull/9',
    state: 'MERGED',
    createdAt: '2026-10-05T10:00:00Z'
  },
  {
    number: 12,
    title: 'EUDPA-900 Alpha merged',
    repository: { name: 'trade-imports-alpha' },
    url: 'https://github.com/DEFRA/trade-imports-alpha/pull/12',
    state: 'MERGED',
    createdAt: '2026-10-01T10:00:00Z'
  },
  {
    number: 7,
    title: 'EUDPA-900 Beta earlier',
    repository: { name: 'trade-imports-beta' },
    url: 'https://github.com/DEFRA/trade-imports-beta/pull/7',
    state: 'MERGED',
    createdAt: '2026-10-02T10:00:00Z'
  },
  {
    number: 15,
    title: 'EUDPA-900 Alpha open older',
    repository: { name: 'trade-imports-alpha' },
    url: 'https://github.com/DEFRA/trade-imports-alpha/pull/15',
    state: 'OPEN',
    createdAt: '2026-09-01T10:00:00Z'
  },
  {
    number: 16,
    title: 'EUDPA-900 Alpha open newer',
    repository: { name: 'trade-imports-alpha' },
    url: 'https://github.com/DEFRA/trade-imports-alpha/pull/16',
    state: 'OPEN',
    createdAt: '2026-09-20T10:00:00Z'
  },
  {
    number: 3,
    title: 'EUDPA-900 Gamma',
    repository: { name: 'trade-imports-gamma' },
    url: 'https://github.com/DEFRA/trade-imports-gamma/pull/3',
    state: 'OPEN',
    createdAt: '2026-10-03T10:00:00Z'
  },
  {
    number: 4,
    title: 'EUDPA-900 Delta',
    repository: { name: 'trade-imports-delta' },
    url: 'https://github.com/DEFRA/trade-imports-delta/pull/4',
    state: 'CLOSED',
    createdAt: '2026-10-04T10:00:00Z'
  }
]

/**
 * What `gh` gives back for each selected pull request. A missing `sha`
 * is a `gh pr view` that failed; a missing `diff` is a `gh pr diff` that
 * failed.
 */
export const PULL_REQUEST_FILES = {
  'trade-imports-alpha': {
    number: 16,
    sha: 'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
    diff: REDACTION_CORPUS
  },
  'trade-imports-beta': {
    number: 9,
    sha: 'b1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
    diff: SPLIT_CHARACTER_DIFF
  },
  'trade-imports-gamma': {
    number: 3,
    sha: 'c1b2c3d4e5f60718293a4b5c6d7e8f9012345678'
  },
  'trade-imports-delta': { number: 4, diff: PLAIN_DIFF }
}

const jiraIssue = (key, { summary, renderedDescription }) => ({
  key,
  fields: {
    summary,
    issuetype: { name: 'Story' },
    status: { name: 'In Progress' }
  },
  renderedFields: { description: renderedDescription }
})

/**
 * The Jira issue each ticket has. A ticket left out is one Jira cannot
 * find.
 */
export const JIRA_ISSUES = {
  'EUDPA-900': jiraIssue('EUDPA-900', {
    summary: 'Add the “thing” to the page',
    renderedDescription: '<p>Add the thing.</p>\n<p>Then "quote" it.</p>\n\n'
  }),
  'EUDPA-901': jiraIssue('EUDPA-901', {
    summary: 'A ticket with no pull requests',
    renderedDescription: null
  }),
  'EUDPA-903': jiraIssue('EUDPA-903', {
    summary: 'The same pull requests, asked for as JSON',
    renderedDescription: ''
  })
}

/**
 * What `gh search prs` gives back for each ticket.
 */
export const PULL_REQUESTS_FOR = {
  'EUDPA-900': PULL_REQUESTS,
  'EUDPA-901': [],
  'EUDPA-902': PULL_REQUESTS,
  'EUDPA-903': PULL_REQUESTS
}

const ROUTING = {
  schemaVersion: 1,
  manifestDirs: ['service'],
  technologies: [
    {
      name: 'node',
      when: { fileExists: 'package.json' },
      bestPractice: [
        'docs/best-practices/fixture/node.md',
        'docs/best-practices/fixture/shared.md'
      ]
    },
    {
      name: 'playwright',
      requires: 'node',
      when: {
        fileContains: { file: 'package.json', pattern: '"@playwright/test"' }
      },
      bestPractice: [
        'docs/best-practices/fixture/missing.md',
        'docs/best-practices/fixture/shared.md'
      ]
    },
    {
      name: 'springboot',
      when: { anyFileContains: { glob: '*.xml', pattern: 'spring-boot' } },
      bestPractice: ['docs/best-practices/fixture/java.md']
    }
  ]
}

const PRE_EXISTING_ANALYSIS = `{
  "repo": "trade-imports-beta",
  "verdict": "complete",
  "note": "written before prepare ran"
}
`

const WORKSPACE_FILES = {
  '.claude/skills/review/assets/routing.json': `${JSON.stringify(ROUTING, null, 2)}\n`,
  'docs/best-practices/fixture/node.md': '# Node\n\nUse ESM.\n',
  'docs/best-practices/fixture/shared.md': 'Shared rule, no final newline.',
  'docs/best-practices/fixture/java.md': '# Java\n\nUse records.\n\n',
  'repos/trade-imports-alpha/package.json':
    '{\n  "devDependencies": { "@playwright/test": "1.0.0" }\n}\n',
  'repos/trade-imports-beta/service/pom.xml':
    '<artifactId>spring-boot-starter</artifactId>\n',
  'repos/trade-imports-gamma/README.md': 'No technology here.\n',
  'workareas/understanding-checks/EUDPA-903/analysis.trade-imports-beta.json':
    PRE_EXISTING_ANALYSIS
}

const STUB_DIR = 'stub'

const GH_STUB = `#!/bin/bash
stub="$HOME/${STUB_DIR}"
case "$1 $2" in
  "search prs") cat "$stub/prs-$3.json" ;;
  "pr view") cat "$stub/$5.sha" 2>/dev/null || exit 1 ;;
  "pr diff") cat "$stub/$5.diff" 2>/dev/null || exit 1 ;;
  *) exit 2 ;;
esac
`

const writeExecutable = (path, content) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content)
  chmodSync(path, 0o755)
}

const writeStubs = (home) => {
  const stubDir = join(home, STUB_DIR)
  const binDir = join(stubDir, 'bin')
  mkdirSync(binDir, { recursive: true })
  writeExecutable(join(binDir, 'gh'), GH_STUB)
  for (const [ticket, issue] of Object.entries(JIRA_ISSUES)) {
    writeFileSync(join(stubDir, `jira-${ticket}.json`), JSON.stringify(issue))
  }
  for (const [ticket, prs] of Object.entries(PULL_REQUESTS_FOR)) {
    writeFileSync(join(stubDir, `prs-${ticket}.json`), JSON.stringify(prs))
  }
  const ownerDir = join(stubDir, 'DEFRA')
  mkdirSync(ownerDir)
  for (const [repo, { sha, diff }] of Object.entries(PULL_REQUEST_FILES)) {
    if (sha !== undefined) {
      writeFileSync(join(ownerDir, `${repo}.sha`), `${sha}\n`)
    }
    if (diff !== undefined) writeFileSync(join(ownerDir, `${repo}.diff`), diff)
  }
  return binDir
}

/**
 * A staged workspace holding the fixture routing, best-practice files and
 * repos. With `bash`, it also holds the scripts and a stand-in for
 * `gh`, and `binDir` is the folder to put
 * first on PATH.
 *
 * @param {{bash?: boolean}} [options]
 * @returns {{home: string, root: string, remove: () => void, binDir?: string}}
 */
export const stagePrepareWorkspace = ({ bash = false } = {}) => {
  const staged = stageBashWorkspace({
    scripts: bash ? [...Object.values(PREPARE_SCRIPTS), ...HELPER_SCRIPTS] : [],
    files: WORKSPACE_FILES
  })
  if (!bash) return staged
  return { ...staged, binDir: writeStubs(staged.home) }
}

/**
 * Writes into a ticket's raw folder what the skill's `gh` steps save:
 * `prs.json`, then `<repo>.sha` and `<repo>.diff` for each pull request
 * `gh` could give them for.
 *
 * @param {{root: string}} staged - From {@link stagePrepareWorkspace}
 * @param {string} ticket
 */
export const saveGhOutput = (staged, ticket) => {
  const rawDir = join(staged.root, prepareFolder(ticket), '.raw')
  mkdirSync(rawDir, { recursive: true })
  const pullRequests = PULL_REQUESTS_FOR[ticket]
  writeFileSync(join(rawDir, 'prs.json'), `${JSON.stringify(pullRequests)}\n`)
  if (pullRequests.length === 0) return
  for (const [repo, { sha, diff }] of Object.entries(PULL_REQUEST_FILES)) {
    if (sha !== undefined) {
      writeFileSync(join(rawDir, `${repo}.sha`), `${sha}\n`)
    }
    if (diff !== undefined) writeFileSync(join(rawDir, `${repo}.diff`), diff)
  }
}

/**
 * The workspace-relative folder a ticket's check is kept in.
 *
 * @param {string} ticket
 * @returns {string}
 */
export const prepareFolder = (ticket) =>
  `workareas/understanding-checks/${ticket}`
