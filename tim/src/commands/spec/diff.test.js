import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { commitAll, git, writeFiles } from '../../test-support/branched-repo.js'
import {
  createCliWorkspace,
  envelopeOf,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'
import { renderSpecDiffText } from './diff.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const SPEC = `### Requirement: The page asks for the country
**ID**: REQ-ORIGIN-001

#### Scenario: The page lists countries
**ID**: SCN-ORIGIN-001-A
- **THEN** the page lists every country
`

describe('tim spec diff', () => {
  test('Should report the scenarios a commit added in a JSON envelope', async () => {
    root = createCliWorkspace('tim-spec-diff-cli-')
    await git(root, 'init', '--quiet', '-b', 'main', root)
    writeFiles(root, { 'README.md': '# ws\n' })
    await commitAll(root, 'start')
    writeFiles(root, { 'openspec/specs/plants/origin/spec.md': SPEC })
    await commitAll(root, 'spec')

    const run = await runTimInWorkspace(root, [
      'spec',
      'diff',
      '--commit',
      'HEAD',
      '--json'
    ])

    expect({
      exitCode: run.exitCode,
      touched: envelopeOf(run).result.touched
    }).toEqual({ exitCode: 0, touched: ['SCN-ORIGIN-001-A'] })
  })

  test('Should exit 2 asking for a commit when none is named', async () => {
    root = createCliWorkspace('tim-spec-diff-cli-')

    const run = await runTimInWorkspace(root, ['spec', 'diff', '--json'])

    expect({
      exitCode: run.exitCode,
      message: envelopeOf(run).errors[0].message
    }).toEqual({
      exitCode: 2,
      message:
        'Name at least one commit with --commit, such as a merge commit on main.'
    })
  })
})

describe('#renderSpecDiffText', () => {
  test('Should give one line per commit, one per scenario, and one per skipped commit', () => {
    expect(
      renderSpecDiffText({
        commits: [
          {
            sha: 'abcdef1234567890',
            scenarios: [
              {
                change: 'added',
                id: 'SCN-ORIGIN-001-A',
                capability: 'plants/origin',
                name: 'The page lists countries',
                coverage: 'none'
              }
            ]
          }
        ],
        skipped: [
          { commit: 'nope', reason: 'nope is not a commit in this repo' }
        ]
      })
    ).toBe(
      [
        'abcdef123456: 1 scenario(s)',
        '  added    SCN-ORIGIN-001-A         plants/origin                            The page lists countries [none]',
        'Skipped: nope is not a commit in this repo.'
      ].join('\n')
    )
  })
})
