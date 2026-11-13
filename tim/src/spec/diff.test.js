import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { commitAll, git, writeFiles } from '../test-support/branched-repo.js'
import { diffSpecCommits } from './diff.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const SPEC_PATH = 'openspec/specs/plants/origin/spec.md'
const COVERAGE_PATH = 'openspec/coverage/plants/origin/coverage.json'

const scenarioText = ({ id, name, then }) => `#### Scenario: ${name}
**ID**: ${id}
- **GIVEN** a trader on the origin page
- **THEN** ${then}
`

const specOf = (scenarios) => `# Origin

### Requirement: The origin page asks for the country
**ID**: REQ-ORIGIN-001

${scenarios.map(scenarioText).join('\n')}`

const coverageOf = (scenarios) =>
  JSON.stringify({
    capability: 'plants/origin',
    requirements: [
      {
        id: 'REQ-ORIGIN-001',
        name: 'The origin page asks for the country',
        scenarios: scenarios.map(({ id, name, coverage, tests = [] }) => ({
          id,
          name,
          coverage,
          tests
        }))
      }
    ]
  })

const KEPT = {
  id: 'SCN-ORIGIN-001-A',
  name: 'The page lists countries',
  then: 'the page lists every country',
  coverage: 'full'
}
const REWORDED = {
  id: 'SCN-ORIGIN-001-B',
  name: 'The page saves the country',
  then: 'the country is saved',
  coverage: 'none'
}
const DROPPED = {
  id: 'SCN-ORIGIN-001-C',
  name: 'The page shows a hint',
  then: 'a hint shows',
  coverage: 'partial'
}
const ADDED = {
  id: 'SCN-ORIGIN-001-D',
  name: 'An accented search finds a country',
  then: 'the country is offered',
  coverage: 'none'
}

const writeSpec = (repoPath, scenarios) =>
  writeFiles(repoPath, {
    [SPEC_PATH]: specOf(scenarios),
    [COVERAGE_PATH]: coverageOf(scenarios)
  })

const headOf = async (repoPath) =>
  (await git(repoPath, 'rev-parse', 'HEAD')).stdout.trim()

const repoWithSpec = async () => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-diff-'))
  await git(root, 'init', '--quiet', '-b', 'main', root)
  writeSpec(root, [KEPT, REWORDED, DROPPED])
  await commitAll(root, 'spec')
  return root
}

describe('#diffSpecCommits', () => {
  test('Should name each scenario a commit added, changed, removed or only re-proved, with its coverage after', async () => {
    const repoPath = await repoWithSpec()
    writeSpec(repoPath, [
      { ...KEPT, tests: [{ type: 'e2e', file: 'origin.spec.ts' }] },
      { ...REWORDED, then: 'the chosen country is saved' },
      ADDED
    ])
    await commitAll(repoPath, 'row')
    const sha = await headOf(repoPath)

    const result = await diffSpecCommits({
      workspaceRoot: repoPath,
      commits: [sha.slice(0, 8)]
    })

    expect({
      ...result,
      commits: result.commits.map(({ scenarios, files }) => ({
        files,
        scenarios: [...scenarios].sort((a, b) => a.id.localeCompare(b.id))
      }))
    }).toEqual({
      commits: [
        {
          files: [COVERAGE_PATH, SPEC_PATH],
          scenarios: [
            {
              id: 'SCN-ORIGIN-001-A',
              name: KEPT.name,
              capability: 'plants/origin',
              requirementId: 'REQ-ORIGIN-001',
              requirementName: 'The origin page asks for the country',
              change: 'coverage',
              coverage: 'full'
            },
            {
              id: 'SCN-ORIGIN-001-B',
              name: REWORDED.name,
              capability: 'plants/origin',
              requirementId: 'REQ-ORIGIN-001',
              requirementName: 'The origin page asks for the country',
              change: 'changed',
              coverage: 'none'
            },
            {
              id: 'SCN-ORIGIN-001-C',
              name: DROPPED.name,
              capability: 'plants/origin',
              requirementId: 'REQ-ORIGIN-001',
              requirementName: 'The origin page asks for the country',
              change: 'removed',
              coverage: null
            },
            {
              id: 'SCN-ORIGIN-001-D',
              name: ADDED.name,
              capability: 'plants/origin',
              requirementId: 'REQ-ORIGIN-001',
              requirementName: 'The origin page asks for the country',
              change: 'added',
              coverage: 'none'
            }
          ]
        }
      ],
      ranges: [],
      skipped: [],
      touched: expect.arrayContaining([
        'SCN-ORIGIN-001-A',
        'SCN-ORIGIN-001-B',
        'SCN-ORIGIN-001-D'
      ])
    })
  })

  test('Should list a commit git cannot find as skipped, and a commit that leaves the spec alone as changing nothing', async () => {
    const repoPath = await repoWithSpec()
    writeFiles(repoPath, { 'src/app.js': 'export {}\n' })
    await commitAll(repoPath, 'code only')
    const sha = await headOf(repoPath)

    const result = await diffSpecCommits({
      workspaceRoot: repoPath,
      commits: [sha, 'deadbeef']
    })

    expect(result).toEqual({
      commits: [{ commit: sha, sha, files: [], scenarios: [] }],
      ranges: [],
      skipped: [
        { commit: 'deadbeef', reason: 'deadbeef is not a commit in this repo' }
      ],
      touched: []
    })
  })

  test('Should read a first commit against nothing, so every scenario in it is added', async () => {
    const repoPath = await repoWithSpec()
    const sha = await headOf(repoPath)

    const result = await diffSpecCommits({
      workspaceRoot: repoPath,
      commits: [sha]
    })

    expect(result.commits[0].scenarios.map(({ change }) => change)).toEqual([
      'added',
      'added',
      'added'
    ])
  })

  test('Should compare a two-dot range from its base to its head, and skip a range git cannot read', async () => {
    const repoPath = await repoWithSpec()
    const base = await headOf(repoPath)
    writeSpec(repoPath, [KEPT, REWORDED, DROPPED, ADDED])
    await commitAll(repoPath, 'add')
    writeSpec(repoPath, [
      KEPT,
      { ...REWORDED, then: 'the chosen country is saved' },
      DROPPED,
      ADDED
    ])
    await commitAll(repoPath, 'reword')
    const head = await headOf(repoPath)

    const result = await diffSpecCommits({
      workspaceRoot: repoPath,
      ranges: [`${base}..HEAD`, 'main', 'nope..HEAD']
    })

    expect({
      ranges: result.ranges.map(({ range, from, to, scenarios }) => ({
        range,
        from,
        to,
        changes: scenarios.map(({ id, change }) => `${change} ${id}`).sort()
      })),
      skipped: result.skipped
    }).toEqual({
      ranges: [
        {
          range: `${base}..HEAD`,
          from: base,
          to: head,
          changes: ['added SCN-ORIGIN-001-D', 'changed SCN-ORIGIN-001-B']
        }
      ],
      skipped: [
        { commit: 'main', reason: 'main is not a range such as main..HEAD' },
        {
          commit: 'nope..HEAD',
          reason: 'nope..HEAD names a commit that is not in this repo'
        }
      ]
    })
  })

  test('Should compare a three-dot range from the merge base of its two ends', async () => {
    const repoPath = await repoWithSpec()
    const forkPoint = await headOf(repoPath)
    await git(repoPath, 'switch', '--quiet', '-c', 'feature')
    writeSpec(repoPath, [KEPT, REWORDED, DROPPED, ADDED])
    await commitAll(repoPath, 'add on feature')
    await git(repoPath, 'switch', '--quiet', 'main')
    writeSpec(repoPath, [KEPT, REWORDED])
    await commitAll(repoPath, 'drop on main')

    const result = await diffSpecCommits({
      workspaceRoot: repoPath,
      ranges: ['main...feature']
    })

    expect({
      from: result.ranges[0].from,
      changes: result.ranges[0].scenarios.map(
        ({ id, change }) => `${change} ${id}`
      )
    }).toEqual({ from: forkPoint, changes: ['added SCN-ORIGIN-001-D'] })
  })
})
