import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { execa } from 'execa'
import { computeSpecCandidates } from './candidates.js'

const SPEC_TEXT = `# Widgets Specification

## Purpose

The rules governing how a widget behaves once it is shown to a user.

## Requirements

### Requirement: Widgets spin
**ID**: REQ-WIDGET-001
The system MUST spin every widget.

#### Scenario: A widget spins on load
**ID**: SCN-WIDGET-001-A
- **GIVEN** a widget is shown
- **WHEN** the page loads
- **THEN** the widget spins
`

const coverageFor = (file) => ({
  capability: 'widgets',
  areaCode: 'WIDGET',
  specFile: 'openspec/specs/widgets/spec.md',
  requirements: [
    {
      id: 'REQ-WIDGET-001',
      name: 'Widgets spin',
      coverage: 'full',
      scenarios: [
        {
          id: 'SCN-WIDGET-001-A',
          name: 'A widget spins on load',
          coverage: 'full',
          tests: [
            {
              type: 'unit',
              repo: 'trade-imports-x',
              file,
              test: 'spins',
              strength: 'full'
            }
          ]
        }
      ]
    }
  ]
})

let root
let repoDir

const git = (dir, args) =>
  execa('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.invalid', ...args], {
    cwd: dir
  })

const gitInit = async (dir) => {
  await execa('git', ['init', '--quiet', '-b', 'main', dir])
  await git(dir, ['add', '-A'])
  await git(dir, ['commit', '--quiet', '-m', 'initial'])
}

const commit = async (dir, message) => {
  await git(dir, ['add', '-A'])
  await git(dir, ['commit', '--quiet', '-m', message])
}

const headSha = async (dir) =>
  (await execa('git', ['-C', dir, 'rev-parse', 'HEAD'])).stdout.trim()

const writeCoverage = (file) =>
  writeFileSync(
    join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'),
    JSON.stringify(coverageFor(file))
  )

beforeEach(async () => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-candidates-'))
  mkdirSync(join(root, 'openspec', 'specs', 'widgets'), { recursive: true })
  mkdirSync(join(root, 'openspec', 'coverage', 'widgets'), { recursive: true })
  writeFileSync(
    join(root, 'openspec', 'specs', 'widgets', 'spec.md'),
    SPEC_TEXT
  )
  writeFileSync(
    join(root, 'openspec', 'coverage', 'AREAS.md'),
    ['| Capability | Area code |', '|---|---|', '| widgets | WIDGET |'].join(
      '\n'
    )
  )
  mkdirSync(
    join(root, '.claude', 'skills', 'requirements-pipeline', 'references'),
    {
      recursive: true
    }
  )
  writeFileSync(
    join(
      root,
      '.claude',
      'skills',
      'requirements-pipeline',
      'references',
      'gates.json'
    ),
    JSON.stringify({ repos: {} })
  )

  repoDir = join(root, 'repos', 'trade-imports-x')
  mkdirSync(join(repoDir, 'src'), { recursive: true })
  writeFileSync(join(repoDir, 'src', 'a.test.js'), 'test()')
  writeFileSync(join(repoDir, 'src', 'b.js'), 'source()')
  await gitInit(repoDir)
  const baselineSha = await headSha(repoDir)

  writeCoverage('src/a.test.js')

  await gitInit(root)
  const workspaceBaselineSha = await headSha(root)

  writeFileSync(
    join(root, 'openspec', 'baseline.json'),
    JSON.stringify({
      verifiedAt: '2026-09-16',
      verifiedBy: workspaceBaselineSha,
      repos: { 'trade-imports-x': baselineSha }
    })
  )
  await commit(root, 'add baseline')
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

describe('computeSpecCandidates', () => {
  test('reports no work packets when nothing linked has changed', async () => {
    const result = await computeSpecCandidates({ workspaceRoot: root })

    expect(result.workPackets).toEqual([])
    expect(typeof result.staleness.daysAgo).toBe('number')
  })

  test('names the capability whose linked test file changed', async () => {
    writeFileSync(join(repoDir, 'src', 'a.test.js'), 'test() // changed')
    await commit(repoDir, 'touch the linked test')

    const result = await computeSpecCandidates({ workspaceRoot: root })

    expect(result.workPackets).toEqual([
      expect.objectContaining({
        capability: 'widgets',
        linkCount: 1,
        changedLinkCount: 1
      })
    ])
  })

  test('flags coverageUpdatedSinceBaseline when the coverage.json itself was re-verified', async () => {
    writeFileSync(join(repoDir, 'src', 'a.test.js'), 'test() // changed')
    await commit(repoDir, 'touch the linked test')
    writeFileSync(
      join(root, 'openspec', 'coverage', 'widgets', 'coverage.json'),
      JSON.stringify({
        ...coverageFor('src/a.test.js'),
        reVerifiedMarker: true
      })
    )
    await commit(root, 're-verify widgets coverage')

    const result = await computeSpecCandidates({ workspaceRoot: root })

    expect(result.workPackets[0].coverageUpdatedSinceBaseline).toBe(true)
  })

  test('leaves coverageUpdatedSinceBaseline false when nobody touched the coverage entry', async () => {
    writeFileSync(join(repoDir, 'src', 'a.test.js'), 'test() // changed')
    await commit(repoDir, 'touch the linked test')

    const result = await computeSpecCandidates({ workspaceRoot: root })

    expect(result.workPackets[0].coverageUpdatedSinceBaseline).toBe(false)
  })

  test('--wide catches a sibling file changing when the linked file itself did not', async () => {
    writeFileSync(
      join(repoDir, 'src', 'b.js'),
      'source() // changed, sibling of the linked test'
    )
    await commit(repoDir, 'touch a sibling of the linked test')

    const narrow = await computeSpecCandidates({ workspaceRoot: root })
    const wide = await computeSpecCandidates({
      workspaceRoot: root,
      wide: true
    })

    expect(narrow.workPackets).toEqual([])
    expect(wide.workPackets).toEqual([
      expect.objectContaining({
        capability: 'widgets',
        changedLinkCount: 0,
        wide: true
      })
    ])
  })

  test('names the commit log for a repo that moved', async () => {
    writeFileSync(join(repoDir, 'src', 'a.test.js'), 'test() // changed')
    await commit(repoDir, 'touch the linked test')

    const result = await computeSpecCandidates({ workspaceRoot: root })

    expect(result.commitLog['trade-imports-x']).toEqual([
      expect.stringContaining('touch the linked test')
    ])
  })

  test('--capability scopes the work packets', async () => {
    writeFileSync(join(repoDir, 'src', 'a.test.js'), 'test() // changed')
    await commit(repoDir, 'touch the linked test')

    const result = await computeSpecCandidates({
      workspaceRoot: root,
      capability: 'gadgets'
    })

    expect(result.workPackets).toEqual([])
  })

  test('--capability does not leak another capability\'s unresolved links', async () => {
    mkdirSync(join(root, 'openspec', 'specs', 'gadgets'), { recursive: true })
    mkdirSync(join(root, 'openspec', 'coverage', 'gadgets'), { recursive: true })
    writeFileSync(
      join(root, 'openspec', 'specs', 'gadgets', 'spec.md'),
      SPEC_TEXT.replaceAll('widget', 'gadget').replaceAll('WIDGET', 'GADGET')
    )
    writeFileSync(
      join(root, 'openspec', 'coverage', 'gadgets', 'coverage.json'),
      JSON.stringify(coverageFor('src/missing.test.js'))
    )
    writeFileSync(join(repoDir, 'src', 'a.test.js'), 'test() // changed')
    await commit(repoDir, 'touch the linked test')

    const scoped = await computeSpecCandidates({
      workspaceRoot: root,
      capability: 'widgets'
    })

    expect(scoped.workPackets.map((packet) => packet.capability)).toEqual([
      'widgets'
    ])
    expect(
      scoped.unresolvedLinks.every((finding) => finding.capability === 'widgets')
    ).toBe(true)
  })

  test('returns the empty report when there is no baseline', async () => {
    rmSync(join(root, 'openspec', 'baseline.json'))

    await expect(
      computeSpecCandidates({ workspaceRoot: root })
    ).resolves.toEqual({
      staleness: null,
      workPackets: [],
      unresolvedLinks: [],
      knownGaps: [],
      commitLog: {}
    })
  })
})
