import { execFileSync } from 'node:child_process'
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stageBashWorkspace } from '../../test-support/bash-golden-harness.js'
import { markWorkspaceRoot } from '../../test-support/workspace-marker.js'

export const BRANCH_SCRIPT = 'tools/ticket/setup-branch.sh'
export const PLAN_SCRIPTS = [
  'tools/ticket/prepare-plan.sh',
  'tools/confluence/page.sh'
]
export const IMPLEMENT_SCRIPTS = [
  'tools/ticket/prepare-implement.sh',
  'tools/github/prs.sh'
]

export const STUB = 'trade-imports-stub'
export const FRONTEND = 'trade-imports-animals-frontend'

const timCliPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'cli.js'
)

const realRoutingPath = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..',
  '.claude',
  'skills',
  'review',
  'assets',
  'routing.json'
)

/**
 * Reads a frozen recording of the Bash under `__golden__/`.
 *
 * @param {string} name - The file name
 * @returns {object[]}
 */
export const readTicketGolden = (name) =>
  JSON.parse(
    readFileSync(new URL(`./__golden__/${name}`, import.meta.url), 'utf8')
  )

/**
 * Git settings that make every fixture commit the same on every run, so a
 * HEAD SHA the Bash recorded is the one tim must report.
 *
 * @param {{home: string}} staged
 * @returns {Record<string, string>}
 */
export const fixtureEnv = (staged) => ({
  PATH: `${join(staged.home, 'stub-bin')}:${process.env.PATH}`,
  GIT_AUTHOR_NAME: 'Fixture Author',
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_NAME: 'Fixture Author',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
  GIT_AUTHOR_DATE: '1780000000 +0000',
  GIT_COMMITTER_DATE: '1780000000 +0000',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1'
})

const writeExecutable = (path, text) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
  chmodSync(path, 0o755)
}

const stageStubs = (staged) => {
  writeExecutable(
    join(staged.home, 'stub-bin', 'tim'),
    `#!/bin/sh\nTIM_NO_AUTO_PULL=1 exec node "${timCliPath}" "$@"\n`
  )
  writeExecutable(join(staged.home, 'stub-bin', 'gh'), '#!/bin/sh\necho "[]"\n')
}

const git = (staged, cwd, args) =>
  execFileSync('git', args, {
    cwd,
    env: { ...process.env, ...fixtureEnv(staged) },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })

const commitFile = (staged, dir, name, message) => {
  writeFileSync(join(dir, name), `${message}\n`)
  git(staged, dir, ['add', name])
  git(staged, dir, ['commit', '--quiet', '-m', message])
}

const workspaceFiles = {
  'repos.json': '{ "reposDir": "repos", "githubOrg": "DEFRA", "repos": [] }\n'
}

const stageWorkspace = ({ scripts = [], files = {} }) => {
  const staged = stageBashWorkspace({
    scripts,
    files: { ...workspaceFiles, ...files }
  })
  stageStubs(staged)
  markWorkspaceRoot(staged.root)
  return staged
}

const planRepoFiles = () => ({
  '.claude/skills/review/assets/routing.json': readFileSync(
    realRoutingPath,
    'utf8'
  ),
  'docs/best-practices/java/spring-boot.md':
    '# Spring Boot\n\nUse constructor injection.\n',
  'docs/best-practices/java/modern-java.md':
    '# Modern Java\n\nNo trailing newline here.',
  'docs/best-practices/node/hapi.md': '# hapi\n\nOne plugin per feature.\n',
  [`repos/${STUB}/pom.xml`]:
    '<project><dependency><artifactId>spring-boot-starter</artifactId></dependency></project>\n',
  [`repos/${FRONTEND}/package.json`]:
    '{"dependencies":{"@hapi/hapi":"^21.0.0"}}\n',
  'repos/README.md': 'Not a repo\n'
})

const planningFile = (ticket, name) =>
  `workareas/ticket-planning/${ticket}/${name}`

const planMeta = (ticket, repos) =>
  `${JSON.stringify(
    {
      ticket,
      summary: 'A planned ticket',
      type: 'Story',
      status: 'In Progress',
      priority: 'Major',
      parent: 'None',
      labels: [],
      created: '2026-11-01T09:00:00Z',
      repos: repos.map((repo) => ({
        repo,
        tech: { technologies: [], best_practices: [] }
      }))
    },
    null,
    4
  )}\n`

const implementFiles = () => ({
  [planningFile('EUDPA-302', 'plan.md')]: '# Plan\n',
  [planningFile('EUDPA-302', '.plan-meta.json')]: planMeta('EUDPA-302', [
    STUB,
    'trade-imports-gone',
    FRONTEND
  ]),
  [planningFile('EUDPA-303', 'plan.md')]: '# Plan\n',
  [planningFile('EUDPA-303', '.plan-meta.json')]: planMeta('EUDPA-303', [
    STUB,
    FRONTEND
  ]),
  [planningFile('EUDPA-304', 'plan.md')]: '# Plan\n',
  [planningFile('EUDPA-305', 'plan.md')]: '# Plan\n',
  [planningFile('EUDPA-306', 'plan.md')]: '# Plan\n',
  [planningFile('EUDPA-306', '.plan-meta.json')]: planMeta('EUDPA-306', [])
})

/**
 * A workspace for prepare-plan: the real review routing, three of the
 * best-practice files a Spring Boot and a hapi repo bring (one with no
 * final newline, the rest missing), the stub repo with a Spring pom and
 * the animals frontend with hapi. A stub `tim` sits in `<home>/stub-bin`.
 *
 * @param {{scripts?: string[]}} [opts]
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stagePlanWorkspace = ({ scripts = [] } = {}) =>
  stageWorkspace({ scripts, files: planRepoFiles() })

/**
 * The prepare-plan workspace plus a plan for EUDPA-302 to EUDPA-306.
 * EUDPA-302's meta names the stub, a repo not on disk and the frontend;
 * EUDPA-303's the stub and the frontend; EUDPA-304 and EUDPA-305 have no
 * meta; EUDPA-306's meta names no repos. EUDPA-301 has no plan. A stub
 * `gh` finds no pull requests.
 *
 * @param {{scripts?: string[]}} [opts]
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stageImplementWorkspace = ({ scripts = [] } = {}) =>
  stageWorkspace({
    scripts,
    files: { ...planRepoFiles(), ...implementFiles() }
  })

export const planCases = [
  {
    name: 'a ticket with comments and Confluence links, and no repos',
    ticket: 'EUDPA-101',
    args: ['EUDPA-101']
  },
  {
    name: 'two repos, a repo not on disk and spaces round the names',
    ticket: 'EUDPA-103',
    args: ['EUDPA-103', '--repos', ` ${STUB}, ${FRONTEND} ,trade-imports-gone,`]
  },
  {
    name: 'a ticket with no priority, parent, assignee or description',
    ticket: 'EUDPA-104',
    args: ['EUDPA-104', '--repos', STUB]
  },
  {
    name: 'a ticket Jira does not have',
    ticket: 'EUDPA-404',
    args: ['EUDPA-404']
  },
  {
    name: 'a ticket Jira gives no labels field',
    ticket: 'EUDPA-102',
    args: ['EUDPA-102']
  }
]

export const planRefusalCases = [
  { name: 'no ticket', args: [] },
  { name: 'a ticket from no project', args: ['NO_JIRA'] }
]

export const implementCases = [
  { name: 'no plan', ticket: 'EUDPA-301', args: ['EUDPA-301'] },
  {
    name: 'a meta naming two repos and one not on disk',
    ticket: 'EUDPA-302',
    args: ['EUDPA-302']
  },
  {
    name: '--repo in place of the meta list',
    ticket: 'EUDPA-303',
    args: ['EUDPA-303', '--repo', FRONTEND]
  },
  { name: 'no meta', ticket: 'EUDPA-304', args: ['EUDPA-304'] },
  {
    name: 'no meta and --repo',
    ticket: 'EUDPA-305',
    args: ['EUDPA-305', '--repo', STUB]
  },
  {
    name: 'a meta naming no repos',
    ticket: 'EUDPA-306',
    args: ['EUDPA-306']
  }
]

export const implementRefusalCases = [
  { name: 'no ticket', args: [] },
  { name: 'a ticket from no project', args: ['NO_JIRA'] }
]

const repoDir = (staged) => join(staged.root, 'repos', STUB)

/**
 * Gives the staged workspace `repos/trade-imports-stub` as a clone of a
 * bare origin with `main` and the given branches, each one commit ahead of
 * main.
 *
 * @param {{home: string, root: string}} staged
 * @param {{originBranches?: string[]}} [opts]
 * @returns {{origin: string, work: string, clone: string}}
 */
const stageClonedRepo = (staged, { originBranches = [] } = {}) => {
  const work = join(staged.home, 'origin-work')
  const origin = join(staged.home, 'origin.git')
  mkdirSync(work, { recursive: true })
  git(staged, work, ['init', '--quiet', '-b', 'main'])
  commitFile(staged, work, 'README.md', 'initial commit')
  for (const branch of originBranches) {
    git(staged, work, ['switch', '--quiet', '-c', branch])
    commitFile(staged, work, 'branch.txt', `work on ${branch}`)
    git(staged, work, ['switch', '--quiet', 'main'])
  }
  git(staged, staged.home, ['clone', '--quiet', '--bare', work, origin])
  git(staged, work, ['remote', 'add', 'origin', origin])
  const clone = repoDir(staged)
  mkdirSync(dirname(clone), { recursive: true })
  git(staged, staged.home, ['clone', '--quiet', origin, clone])
  return { origin, work, clone }
}

const pushToOriginMain = (staged, work, message) => {
  commitFile(staged, work, 'upstream.txt', message)
  git(staged, work, ['push', '--quiet', 'origin', 'main'])
}

export const branchCases = [
  {
    name: 'a new branch after main moved on origin',
    args: ['EUDPA-1', '--repo', STUB, '--slug', 'new-thing'],
    setUp: (staged) => {
      const { work } = stageClonedRepo(staged)
      pushToOriginMain(staged, work, 'upstream work')
    }
  },
  {
    name: 'a branch already here, as fix',
    args: ['EUDPA-2', '--repo', STUB, '--slug', 'existing', '--type', 'fix'],
    setUp: (staged) => {
      const { clone } = stageClonedRepo(staged)
      git(staged, clone, ['switch', '--quiet', '-c', 'fix/EUDPA-2-existing'])
      commitFile(staged, clone, 'local.txt', 'local work')
      git(staged, clone, ['switch', '--quiet', 'main'])
    }
  },
  {
    name: 'a branch only on origin, as chore with no ticket',
    args: [
      'NO_JIRA',
      '--repo',
      STUB,
      '--slug',
      'remote-only',
      '--type',
      'chore'
    ],
    setUp: (staged) => {
      stageClonedRepo(staged, {
        originBranches: ['chore/NO_JIRA-remote-only']
      })
    }
  },
  {
    name: 'a base other than main, with the options first',
    args: [
      '--base',
      'release',
      '--slug',
      'from-release',
      '--repo',
      STUB,
      'EUDPA-3'
    ],
    setUp: (staged) => {
      stageClonedRepo(staged, { originBranches: ['release'] })
    }
  },
  {
    name: 'a main that cannot fast-forward',
    args: ['EUDPA-4', '--repo', STUB, '--slug', 'diverged'],
    setUp: (staged) => {
      const { work, clone } = stageClonedRepo(staged)
      pushToOriginMain(staged, work, 'upstream work')
      commitFile(staged, clone, 'local.txt', 'local work on main')
    }
  },
  {
    name: 'a new branch, as JSON',
    args: ['EUDPA-9', '--repo', STUB, '--slug', 'as-json', '--json'],
    setUp: (staged) => {
      stageClonedRepo(staged)
    }
  },
  {
    name: 'a repo not in the workspace',
    args: ['EUDPA-5', '--repo', 'trade-imports-gone', '--slug', 'nowhere'],
    setUp: (staged) => {
      stageClonedRepo(staged)
    }
  },
  {
    name: 'a --type the skill does not use',
    args: ['EUDPA-6', '--repo', STUB, '--slug', 'docs', '--type', 'docs'],
    setUp: (staged) => {
      stageClonedRepo(staged)
    }
  },
  {
    name: 'a ticket from another project',
    args: ['ABC-7', '--repo', STUB, '--slug', 'other'],
    setUp: (staged) => {
      stageClonedRepo(staged)
    }
  },
  {
    name: 'no slug',
    args: ['EUDPA-8', '--repo', STUB],
    setUp: (staged) => {
      stageClonedRepo(staged)
    }
  }
]

/**
 * A workspace holding nothing but the stub repo, set up for one branch
 * case.
 *
 * @param {object} branchCase - One of {@link branchCases}
 * @param {{scripts?: string[]}} [opts]
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stageBranchWorkspace = (branchCase, { scripts = [] } = {}) => {
  const staged = stageWorkspace({ scripts })
  branchCase.setUp(staged)
  return staged
}

const gitOrNull = (staged, args) => {
  try {
    return git(staged, repoDir(staged), args).trim()
  } catch {
    return null
  }
}

/**
 * Where the stub repo stands after a run: its branch, that branch's
 * upstream, and the subject and SHA of HEAD.
 *
 * @param {{home: string, root: string}} staged
 * @returns {{branch: string|null, upstream: string|null, head: string|null, subject: string|null}}
 */
export const repoState = (staged) => ({
  branch: gitOrNull(staged, ['branch', '--show-current']),
  upstream: gitOrNull(staged, [
    'rev-parse',
    '--abbrev-ref',
    '--symbolic-full-name',
    '@{u}'
  ]),
  head: gitOrNull(staged, ['rev-parse', 'HEAD']),
  subject: gitOrNull(staged, ['log', '-1', '--format=%s'])
})
