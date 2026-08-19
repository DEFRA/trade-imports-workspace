import { describe, test, expect } from 'vitest'
import { mkdtempSync, mkdirSync, symlinkSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  REPOS,
  NODE_REPOS,
  JAVA_REPOS,
  UNIT_TEST_EXEMPT_REPOS,
  REPOS_DIR,
  repoPath,
  realRepoPath,
  isNodeRepo,
  isJavaRepo,
  GITHUB_ORG,
  repoUrl
} from './repos.js'

describe('repo constants', () => {
  test('REPOS_DIR is "repos"', () => {
    expect(REPOS_DIR).toBe('repos')
  })

  test('NODE_REPOS lists the five Node.js repos', () => {
    expect([...NODE_REPOS].sort()).toEqual([
      'trade-imports-animals-admin',
      'trade-imports-animals-frontend',
      'trade-imports-animals-tests',
      'trade-imports-defra-id-stub',
      'trade-imports-ins-frontend'
    ])
  })

  test('JAVA_REPOS lists the six Java repos', () => {
    expect([...JAVA_REPOS].sort()).toEqual([
      'trade-imports-address-book',
      'trade-imports-animals-backend',
      'trade-imports-dynamics-gateway',
      'trade-imports-ins-backend',
      'trade-imports-reference-data',
      'trade-imports-stub'
    ])
  })

  test('REPOS is the union of NODE_REPOS and JAVA_REPOS', () => {
    expect([...REPOS].sort()).toEqual([...NODE_REPOS, ...JAVA_REPOS].sort())
  })

  test('every unit-test-exempt repo is a known repo', () => {
    for (const repo of UNIT_TEST_EXEMPT_REPOS) {
      expect(REPOS).toContain(repo)
    }
  })

  test('NODE_REPOS and JAVA_REPOS do not overlap', () => {
    const overlap = NODE_REPOS.filter((repo) => JAVA_REPOS.includes(repo))
    expect(overlap).toEqual([])
  })

  test('repoPath joins workspaceRoot, repos/, and the repo name', () => {
    expect(repoPath('/ws', 'trade-imports-animals-frontend')).toBe(
      '/ws/repos/trade-imports-animals-frontend'
    )
  })

  test('isNodeRepo identifies Node repos and rejects Java repos', () => {
    expect(isNodeRepo('trade-imports-animals-frontend')).toBe(true)
    expect(isNodeRepo('trade-imports-animals-backend')).toBe(false)
    expect(isNodeRepo('unknown')).toBe(false)
  })

  test('isJavaRepo identifies Java repos and rejects Node repos', () => {
    expect(isJavaRepo('trade-imports-animals-backend')).toBe(true)
    expect(isJavaRepo('trade-imports-animals-frontend')).toBe(false)
    expect(isJavaRepo('unknown')).toBe(false)
  })

  test('NODE_REPOS, JAVA_REPOS, REPOS are immutable', () => {
    expect(() => NODE_REPOS.push('x')).toThrow()
    expect(() => JAVA_REPOS.push('x')).toThrow()
    expect(() => REPOS.push('x')).toThrow()
  })

  test('GITHUB_ORG is DEFRA — matches scripts/setup.sh', () => {
    expect(GITHUB_ORG).toBe('DEFRA')
  })

  test('repoUrl builds the canonical HTTPS clone URL', () => {
    expect(repoUrl('trade-imports-animals-frontend')).toBe(
      'https://github.com/DEFRA/trade-imports-animals-frontend.git'
    )
  })

  test('realRepoPath resolves a workspace root reached through a symlink', () => {
    const base = mkdtempSync(join(tmpdir(), 'tim-symlink-'))
    const real = join(base, 'real-workspace')
    const link = join(base, 'linked-workspace')
    mkdirSync(join(real, REPOS_DIR, NODE_REPOS[0]), { recursive: true })
    symlinkSync(real, link)

    try {
      expect(realRepoPath(link, NODE_REPOS[0])).toBe(
        realRepoPath(real, NODE_REPOS[0])
      )
    } finally {
      rmSync(base, { recursive: true, force: true })
    }
  })

  test('realRepoPath falls back to the plain path when the repo is not cloned', () => {
    const workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-uncloned-'))

    try {
      expect(realRepoPath(workspaceRoot, NODE_REPOS[0])).toBe(
        repoPath(workspaceRoot, NODE_REPOS[0])
      )
    } finally {
      rmSync(workspaceRoot, { recursive: true, force: true })
    }
  })

  test('repoUrl honours the TIM_GITHUB_BASE_URL override', () => {
    const original = process.env.TIM_GITHUB_BASE_URL
    process.env.TIM_GITHUB_BASE_URL = 'file:///tmp/fixtures'
    try {
      expect(repoUrl('trade-imports-animals-frontend')).toBe(
        'file:///tmp/fixtures/trade-imports-animals-frontend.git'
      )
    } finally {
      if (original === undefined) delete process.env.TIM_GITHUB_BASE_URL
      else process.env.TIM_GITHUB_BASE_URL = original
    }
  })
})
