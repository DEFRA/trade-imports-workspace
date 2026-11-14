import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  symlinkSync,
  rmSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  rosterOf,
  repoPath,
  realRepoPath,
  repoUrl,
  isWorkspaceBranchSynced,
  partitionSyncTargets,
  workspaceSyncSkipLine,
  upstreamOf,
  assertValidUpstreams
} from './repos.js'
import { TimError } from '../errors.js'

const bundledManifest = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../../repos.json', import.meta.url)),
    'utf8'
  )
)

const manifestNamesWhere = (manifest, predicate) =>
  manifest.repos.filter(predicate).map((repo) => repo.name)

const fixtureManifest = {
  reposDir: 'checkouts',
  githubOrg: 'FIXTURE-ORG',
  repos: [
    { name: 'fixture-web', stack: 'node' },
    {
      name: 'fixture-web-copy',
      stack: 'node',
      upstream: 'fixture-web',
      workspaceBranchSync: false,
      unitTestExempt: true
    },
    { name: 'fixture-api', stack: 'java' }
  ]
}

const writeWorkspace = (manifest) => {
  const root = mkdtempSync(join(tmpdir(), 'tim-roster-'))
  writeFileSync(join(root, 'repos.json'), JSON.stringify(manifest))
  return root
}

describe('#rosterOf', () => {
  let ownRoster
  let noRoster

  beforeEach(() => {
    ownRoster = writeWorkspace(fixtureManifest)
    noRoster = mkdtempSync(join(tmpdir(), 'tim-no-roster-'))
  })

  afterEach(() => {
    rmSync(ownRoster, { recursive: true, force: true })
    rmSync(noRoster, { recursive: true, force: true })
  })

  test('Should read the roster from the repos.json in the workspace it is given', () => {
    expect(rosterOf(ownRoster)).toEqual({
      reposDir: 'checkouts',
      githubOrg: 'FIXTURE-ORG',
      nodeRepos: ['fixture-web', 'fixture-web-copy'],
      javaRepos: ['fixture-api'],
      repos: ['fixture-web', 'fixture-web-copy', 'fixture-api'],
      unitTestExemptRepos: ['fixture-web-copy'],
      upstreamRepos: { 'fixture-web-copy': 'fixture-web' },
      unsyncedRepos: ['fixture-web-copy']
    })
  })

  test('Should fall back to the repos.json beside tim when the workspace has none', () => {
    const roster = rosterOf(noRoster)

    expect(roster.repos).toEqual([
      ...manifestNamesWhere(bundledManifest, (repo) => repo.stack === 'node'),
      ...manifestNamesWhere(bundledManifest, (repo) => repo.stack === 'java')
    ])
    expect(roster.reposDir).toBe(bundledManifest.reposDir)
    expect(roster.githubOrg).toBe(bundledManifest.githubOrg)
  })

  test('Should give two workspaces their own rosters in one process', () => {
    const other = writeWorkspace({
      ...fixtureManifest,
      repos: [{ name: 'other-only', stack: 'node' }]
    })

    try {
      expect(rosterOf(ownRoster).repos).toEqual([
        'fixture-web',
        'fixture-web-copy',
        'fixture-api'
      ])
      expect(rosterOf(other).repos).toEqual(['other-only'])
    } finally {
      rmSync(other, { recursive: true, force: true })
    }
  })

  test('Should refuse a roster with a malformed upstream', () => {
    const broken = writeWorkspace({
      ...fixtureManifest,
      repos: [{ name: 'a', stack: 'node', upstream: 'ghost' }]
    })

    try {
      expect(() => rosterOf(broken)).toThrow(
        'repos.json: "a".upstream "ghost" is not a repo in the roster.'
      )
    } finally {
      rmSync(broken, { recursive: true, force: true })
    }
  })

  test('Should hand back lists that cannot be changed', () => {
    const roster = rosterOf(ownRoster)

    expect(() => roster.nodeRepos.push('x')).toThrow()
    expect(() => roster.javaRepos.push('x')).toThrow()
    expect(() => roster.repos.push('x')).toThrow()
  })

  test('Should classify every bundled repo as node or java', () => {
    const unclassified = bundledManifest.repos.filter(
      (repo) => !['node', 'java'].includes(repo.stack)
    )

    expect(unclassified).toEqual([])
  })

  describe('lookups against a workspace roster', () => {
    test('Should join the workspace, its repos folder and the repo name', () => {
      expect(repoPath(ownRoster, 'fixture-web')).toBe(
        join(ownRoster, 'checkouts', 'fixture-web')
      )
    })

    test('Should build the clone URL from the workspace GitHub organisation', () => {
      expect(repoUrl(ownRoster, 'fixture-web')).toBe(
        'https://github.com/FIXTURE-ORG/fixture-web.git'
      )
    })

    test('Should build the clone URL from TIM_GITHUB_BASE_URL when it is set', () => {
      const original = process.env.TIM_GITHUB_BASE_URL
      process.env.TIM_GITHUB_BASE_URL = 'file:///tmp/fixtures'

      try {
        expect(repoUrl(ownRoster, 'fixture-web')).toBe(
          'file:///tmp/fixtures/fixture-web.git'
        )
      } finally {
        if (original === undefined) delete process.env.TIM_GITHUB_BASE_URL
        else process.env.TIM_GITHUB_BASE_URL = original
      }
    })

    test('Should name the declared upstream, and null for a repo with none', () => {
      expect(upstreamOf(ownRoster, 'fixture-web-copy')).toBe('fixture-web')
      expect(upstreamOf(ownRoster, 'fixture-web')).toBeNull()
      expect(upstreamOf(ownRoster, 'unknown-repo')).toBeNull()
    })

    test('Should sync every repo except one that opts out', () => {
      expect(isWorkspaceBranchSynced(ownRoster, 'fixture-web')).toBe(true)
      expect(isWorkspaceBranchSynced(ownRoster, 'fixture-web-copy')).toBe(false)
      expect(isWorkspaceBranchSynced(ownRoster, 'unknown-repo')).toBe(true)
    })

    test('Should skip a repo that opts out of branch sync', () => {
      expect(partitionSyncTargets(ownRoster)).toEqual({
        targets: ['fixture-web', 'fixture-api'],
        skipped: ['fixture-web-copy']
      })
    })

    test('Should target an opted-out repo that include names', () => {
      expect(partitionSyncTargets(ownRoster, ['fixture-web-copy'])).toEqual({
        targets: ['fixture-web', 'fixture-web-copy', 'fixture-api'],
        skipped: []
      })
    })
  })

  describe('#realRepoPath', () => {
    test('Should resolve a workspace root reached through a symlink', () => {
      const base = mkdtempSync(join(tmpdir(), 'tim-symlink-'))
      const real = join(base, 'real-workspace')
      const link = join(base, 'linked-workspace')
      mkdirSync(join(real, 'checkouts', 'fixture-web'), { recursive: true })
      writeFileSync(join(real, 'repos.json'), JSON.stringify(fixtureManifest))
      symlinkSync(real, link)

      try {
        expect(realRepoPath(link, 'fixture-web')).toBe(
          realRepoPath(real, 'fixture-web')
        )
      } finally {
        rmSync(base, { recursive: true, force: true })
      }
    })

    test('Should fall back to the plain path when the repo is not cloned', () => {
      expect(realRepoPath(ownRoster, 'fixture-web')).toBe(
        repoPath(ownRoster, 'fixture-web')
      )
    })
  })
})

describe('#workspaceSyncSkipLine', () => {
  test('Should name the repo and the flag that includes it', () => {
    expect(workspaceSyncSkipLine('trade-imports-plants-prototype')).toBe(
      "Skipped trade-imports-plants-prototype: designers' work lives there. Add --include trade-imports-plants-prototype to include it."
    )
  })
})

describe('#assertValidUpstreams', () => {
  test('Should accept a manifest with no upstream fields', () => {
    expect(() =>
      assertValidUpstreams({ repos: [{ name: 'a' }, { name: 'b' }] })
    ).not.toThrow()
  })

  test('Should accept a valid upstream field', () => {
    expect(() =>
      assertValidUpstreams({
        repos: [{ name: 'a', upstream: 'b' }, { name: 'b' }]
      })
    ).not.toThrow()
  })

  test('Should reject a non-string upstream', () => {
    expect(() =>
      assertValidUpstreams({ repos: [{ name: 'a', upstream: 123 }] })
    ).toThrow(TimError)
  })

  test('Should reject an empty-string upstream', () => {
    expect(() =>
      assertValidUpstreams({ repos: [{ name: 'a', upstream: '  ' }] })
    ).toThrow('must be a non-empty string')
  })

  test('Should reject a repo naming itself as upstream', () => {
    expect(() =>
      assertValidUpstreams({ repos: [{ name: 'a', upstream: 'a' }] })
    ).toThrow('cannot name itself')
  })

  test('Should reject an upstream not in the roster', () => {
    expect(() =>
      assertValidUpstreams({ repos: [{ name: 'a', upstream: 'ghost' }] })
    ).toThrow('is not a repo in the roster')
  })

  test('Should find every bundled upstream in the bundled roster', () => {
    expect(() => assertValidUpstreams(bundledManifest)).not.toThrow()
  })
})
