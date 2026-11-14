import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest'
import { OK, USAGE } from '../../constants/exitCodes.js'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import {
  atlassianEnv,
  startAtlassianFixtureServer
} from '../refine/__fixtures__/atlassian-server.js'
import { normaliseRecording } from '../refine/__fixtures__/normalise.js'
import {
  branchCases,
  fixtureEnv,
  implementCases,
  planCases,
  readTicketGolden,
  repoState,
  stageBranchWorkspace,
  stageImplementWorkspace,
  stagePlanWorkspace
} from '../../ticket/__fixtures__/ticket-workspace.js'

const branchGolden = readTicketGolden('setup-branch.json')
const planGolden = readTicketGolden('prepare-plan.json')
const implementGolden = readTicketGolden('prepare-implement.json')

const goldenOf = (golden, name) =>
  golden.find((recorded) => recorded.case === name)

const caseNamed = (cases, name) =>
  cases.find((scriptCase) => scriptCase.name === name)

const withJsonParsed = (files) =>
  Object.fromEntries(
    Object.entries(files).map(([name, content]) => [
      name,
      name.endsWith('.json') ? JSON.parse(content) : content
    ])
  )

const withoutDiffs = (files) =>
  Object.fromEntries(
    Object.entries(files).map(([name, content]) => {
      if (name !== '.implement-meta.json') return [name, content]
      const { diffs, ...meta } = content
      return [name, meta]
    })
  )

const withoutPullRequestLines = (stdout) =>
  stdout.split('\nChecking for prior PRs...\n  No prior PRs found\n').join('')

let staged
let atlassian

beforeAll(async () => {
  atlassian = await startAtlassianFixtureServer()
})

afterAll(() => atlassian.close())

afterEach(() => {
  staged?.remove()
  staged = undefined
})

const runBranch = async (name, extraArgs = []) => {
  const branchCase = caseNamed(branchCases, name)
  staged = stageBranchWorkspace(branchCase)
  const recording = await recordTimRun(
    staged,
    ['ticket', 'branch', ...branchCase.args, ...extraArgs],
    { env: fixtureEnv(staged) }
  )
  return { ...recording, repo: repoState(staged) }
}

const planWatch = (ticket) => `workareas/ticket-planning/${ticket}`

const runPlan = async (args, ticket) => {
  staged = stagePlanWorkspace()
  return normaliseRecording(
    await recordTimRun(staged, ['ticket', 'prepare-plan', ...args], {
      env: { ...fixtureEnv(staged), ...atlassianEnv(atlassian.base) },
      watch: ticket === undefined ? undefined : planWatch(ticket)
    }),
    { base: atlassian.base }
  )
}

const runImplement = async (args, ticket) => {
  staged = stageImplementWorkspace()
  return recordTimRun(staged, ['ticket', 'prepare-implement', ...args], {
    env: fixtureEnv(staged),
    watch: ticket === undefined ? undefined : planWatch(ticket)
  })
}

describe('tim ticket branch matches setup-branch.sh', () => {
  test.each([
    'a new branch after main moved on origin',
    'a branch already here, as fix',
    'a branch only on origin, as chore with no ticket',
    'a base other than main, with the options first',
    'a main that cannot fast-forward',
    'a repo not in the workspace'
  ])(
    'Should give the recorded output, exit code and branch for %s',
    async (name) => {
      const { case: _name, input, ...golden } = goldenOf(branchGolden, name)

      const record = await runBranch(name)

      expect(record).toEqual(golden)
    },
    20_000
  )

  test('Should give the recorded branch, base and HEAD as a JSON envelope', async () => {
    const golden = goldenOf(branchGolden, 'a new branch, as JSON')

    const record = await runBranch('a new branch, as JSON')

    const { ok, result } = JSON.parse(record.stdout)
    const { repoDir, ...ready } = result
    expect({ ok, ready, exitCode: record.exitCode }).toEqual({
      ok: true,
      ready: JSON.parse(golden.stdout),
      exitCode: OK
    })
    expect(record.repo).toEqual(golden.repo)
  })

  test('Should refuse a --type the skill does not use with the recorded message and exit 2', async () => {
    const golden = goldenOf(branchGolden, 'a --type the skill does not use')

    const record = await runBranch('a --type the skill does not use')

    expect(record).toEqual({
      exitCode: USAGE,
      stdout: '',
      stderr: golden.stderr,
      repo: golden.repo
    })
  })

  test('Should refuse a ticket from another project, leave the repo alone and exit 2', async () => {
    const golden = goldenOf(branchGolden, 'a ticket from another project')

    const record = await runBranch('a ticket from another project')

    expect(record).toEqual({
      exitCode: USAGE,
      stdout: '',
      stderr:
        'Give a ticket key that starts with EUDPA-, or NO_JIRA, not "ABC-7".\n',
      repo: golden.repo
    })
  })

  test('Should refuse a run with no slug, leave the repo alone and exit 1', async () => {
    const golden = goldenOf(branchGolden, 'no slug')

    const record = await runBranch('no slug')

    expect({
      exitCode: record.exitCode,
      firstError: record.stderr.split('\n')[0],
      repo: record.repo
    }).toEqual({
      exitCode: golden.exitCode,
      firstError: "error: required option '--slug <slug>' not specified",
      repo: golden.repo
    })
  })
})

describe('tim ticket prepare-plan matches prepare-plan.sh', () => {
  test.each([
    'a ticket with comments and Confluence links, and no repos',
    'two repos, a repo not on disk and spaces round the names',
    'a ticket with no priority, parent, assignee or description',
    'a ticket Jira does not have'
  ])(
    'Should give the recorded output, exit code and files for %s',
    async (name) => {
      const { args, ticket } = caseNamed(planCases, name)
      const { case: _name, input, ...golden } = goldenOf(planGolden, name)

      const { files, ...record } = await runPlan(args, ticket)

      expect({ ...record, files: withJsonParsed(files) }).toEqual({
        ...golden,
        files: withJsonParsed(golden.files)
      })
    },
    20_000
  )

  test('Should write labels as none where Jira gives no labels field', async () => {
    const { args, ticket } = caseNamed(
      planCases,
      'a ticket Jira gives no labels field'
    )

    const { exitCode, files } = await runPlan(args, ticket)

    expect({
      exitCode,
      labelsLine: files['ticket.md'].split('\n')[6],
      labels: JSON.parse(files['.plan-meta.json']).labels
    }).toEqual({ exitCode: OK, labelsLine: '- **Labels:** ', labels: [] })
  })

  test('Should give the recorded meta as a JSON envelope', async () => {
    const name = 'two repos, a repo not on disk and spaces round the names'
    const { args, ticket } = caseNamed(planCases, name)
    const golden = goldenOf(planGolden, name)

    const record = await runPlan([...args, '--json'], ticket)

    const { ok, result } = JSON.parse(record.stdout)
    expect({ ok, meta: result.meta }).toEqual({
      ok: true,
      meta: JSON.parse(golden.files['.plan-meta.json'])
    })
  })

  test('Should refuse a ticket from no project and exit 2', async () => {
    const record = await runPlan(['NO_JIRA'])

    expect(record).toEqual({
      exitCode: USAGE,
      stdout: '',
      stderr: 'Give a ticket key that starts with EUDPA-, not "NO_JIRA".\n'
    })
  })
})

describe('tim ticket prepare-implement matches prepare-implement.sh', () => {
  test.each(implementCases.map(({ name }) => name))(
    'Should give the recorded output, exit code and files, less the pull requests, for %s',
    async (name) => {
      const { args, ticket } = caseNamed(implementCases, name)
      const { case: _name, input, ...golden } = goldenOf(implementGolden, name)

      const { files, ...record } = await runImplement(args, ticket)

      expect({ ...record, files: withJsonParsed(files) }).toEqual({
        ...golden,
        stdout: withoutPullRequestLines(golden.stdout),
        files: withoutDiffs(withJsonParsed(golden.files))
      })
    },
    20_000
  )

  test('Should give the recorded implement meta, less the pull requests, as a JSON envelope', async () => {
    const name = 'a meta naming two repos and one not on disk'
    const { args, ticket } = caseNamed(implementCases, name)
    const golden = goldenOf(implementGolden, name)

    const record = await runImplement([...args, '--json'], ticket)

    const { ok, result } = JSON.parse(record.stdout)
    const { diffs, ...goldenMeta } = JSON.parse(
      golden.files['.implement-meta.json']
    )
    expect({ ok, meta: result.meta }).toEqual({ ok: true, meta: goldenMeta })
  })

  test('Should refuse a ticket from no project and exit 2', async () => {
    const record = await runImplement(['NO_JIRA'])

    expect(record).toEqual({
      exitCode: USAGE,
      stdout: '',
      stderr: 'Give a ticket key that starts with EUDPA-, not "NO_JIRA".\n'
    })
  })
})
