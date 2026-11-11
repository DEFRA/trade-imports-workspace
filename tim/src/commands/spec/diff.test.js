import { describe, test, expect, afterEach } from 'vitest'
import { rmSync } from 'node:fs'
import { commitAll, git, writeFiles } from '../../test-support/branched-repo.js'
import {
  createCliWorkspace,
  envelopeOf,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'
import { renderSignedOffText, renderSpecDiffText } from './diff.js'

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

  test.each([
    [
      [],
      'Name at least one commit with --commit, such as a merge commit on main, or a range with --range.'
    ],
    [
      ['--signed-off'],
      'Name what to check with --commit, --range, or --repo and --base.'
    ],
    [
      ['--signed-off', '--repo', 'trade-imports-plants-frontend'],
      'Give --repo and --base together.'
    ],
    [
      ['--repo', 'trade-imports-plants-frontend', '--base', 'origin/main'],
      '--repo and --base work with --signed-off only.'
    ],
    [
      ['--signed-off', '--repo', '../elsewhere', '--base', 'origin/main'],
      'Give --repo as a folder name under repos/.'
    ]
  ])('Should exit 2 when given %j', async (options, message) => {
    root = createCliWorkspace('tim-spec-diff-cli-')

    const run = await runTimInWorkspace(root, [
      'spec',
      'diff',
      ...options,
      '--json'
    ])

    expect({
      exitCode: run.exitCode,
      message: envelopeOf(run).errors[0].message
    }).toEqual({ exitCode: 2, message })
  })
})

const SIGNED_OFF_SPEC = `### Requirement: The page asks for the country
**ID**: REQ-ORIGIN-001

#### Scenario: The page lists countries
**ID**: SCN-ORIGIN-001-A
**Signed off**: 2026-11-11
- **THEN** the page lists every country
`

const workspaceWithSignedOffSpec = async () => {
  root = createCliWorkspace('tim-spec-diff-cli-')
  await git(root, 'init', '--quiet', '-b', 'main', root)
  writeFiles(root, {
    '.gitignore': 'repos/\n',
    'openspec/specs/plants/origin/spec.md': SIGNED_OFF_SPEC
  })
  await commitAll(root, 'spec')
  return root
}

describe('tim spec diff --signed-off', () => {
  test('Should exit 3 with the changed signed-off scenario and a ticket draft', async () => {
    const workspacePath = await workspaceWithSignedOffSpec()
    writeFiles(workspacePath, {
      'openspec/specs/plants/origin/spec.md': SIGNED_OFF_SPEC.replace(
        'every country',
        'some countries'
      )
    })
    await commitAll(workspacePath, 'reword')

    const run = await runTimInWorkspace(workspacePath, [
      'spec',
      'diff',
      '--signed-off',
      '--range',
      'HEAD~1..HEAD',
      '--json'
    ])

    const { result } = envelopeOf(run)
    expect({
      exitCode: run.exitCode,
      changes: result.signedOff.map(({ id, change }) => `${change} ${id}`),
      summary: result.ticketDraft.summary
    }).toEqual({
      exitCode: 3,
      changes: ['changed SCN-ORIGIN-001-A'],
      summary: 'Approve or refuse a change to a signed-off scenario'
    })
  })

  test('Should exit 0 saying nothing changes when a commit leaves signed-off scenarios alone', async () => {
    const workspacePath = await workspaceWithSignedOffSpec()
    writeFiles(workspacePath, { 'README.md': '# ws\n' })
    await commitAll(workspacePath, 'readme')

    const run = await runTimInWorkspace(workspacePath, [
      'spec',
      'diff',
      '--signed-off',
      '--commit',
      'HEAD'
    ])

    expect({ exitCode: run.exitCode, stdout: run.stdout.trim() }).toEqual({
      exitCode: 0,
      stdout: 'No signed-off scenario changes.'
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

  test('Should label a range by the range named', () => {
    expect(
      renderSpecDiffText({
        commits: [],
        ranges: [{ range: 'main...HEAD', scenarios: [] }],
        skipped: []
      })
    ).toBe('main...HEAD: no scenario changed')
  })
})

describe('#renderSignedOffText', () => {
  test('Should give one line per change with why it counts, then the ticket draft', () => {
    expect(
      renderSignedOffText({
        signedOff: [
          {
            change: 'test-edited',
            id: 'SCN-ORIGIN-001-A',
            capability: 'plants/origin',
            name: 'The page lists countries',
            why: 'A test linked to it in coverage.json is edited: repo/a.test.js.'
          }
        ],
        skipped: [],
        ticketDraft: { summary: 'Summary', description: 'Description' }
      })
    ).toBe(
      [
        '1 change(s) to signed-off scenarios need a person to approve or refuse them:',
        '  test-edited  SCN-ORIGIN-001-A         plants/origin                            The page lists countries',
        '    A test linked to it in coverage.json is edited: repo/a.test.js.',
        '',
        'Ticket draft:',
        'Summary',
        '',
        'Description'
      ].join('\n')
    )
  })
})
