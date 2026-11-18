import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { detectRepoTech, renderDetectedTechText } from './detect-tech.js'

const realWorkspaceRoot = fileURLToPath(new URL('../../../', import.meta.url))
const reviewRoutingFolder = join('.claude', 'skills', 'review', 'assets')

let sandbox
let workspaceRoot

const writeRepo = (name, files) => {
  const repoDir = join(sandbox, name)
  for (const [relPath, content] of Object.entries(files)) {
    mkdirSync(join(repoDir, relPath, '..'), { recursive: true })
    writeFileSync(join(repoDir, relPath), content)
  }
  return repoDir
}

const copyReviewRouting = () =>
  cpSync(
    join(realWorkspaceRoot, reviewRoutingFolder),
    join(workspaceRoot, reviewRoutingFolder),
    { recursive: true }
  )

beforeEach(() => {
  sandbox = mkdtempSync(join(tmpdir(), 'tim-detect-tech-'))
  workspaceRoot = join(sandbox, 'workspace')
  mkdirSync(workspaceRoot)
})

afterEach(() => rmSync(sandbox, { recursive: true, force: true }))

describe('#detectRepoTech', () => {
  test('Should detect k6 and its best-practice file from a package.json dependency', () => {
    copyReviewRouting()
    const repoPath = writeRepo('load-tests', {
      'package.json': '{"name":"x","dependencies":{"k6":"^0.1.0"}}\n'
    })

    const detected = detectRepoTech({ workspaceRoot, repoPath })

    expect(detected).toEqual({
      technologies: ['k6'],
      best_practices: ['docs/best-practices/k6/BEST_PRACTICES.md']
    })
  })

  test('Should detect nothing for a path that does not exist, without reading the routing', () => {
    const detected = detectRepoTech({
      workspaceRoot,
      repoPath: join(sandbox, 'no-such-repo')
    })

    expect(detected).toEqual({ technologies: [], best_practices: [] })
  })

  test('Should detect nothing for a path that is a file', () => {
    copyReviewRouting()
    const filePath = join(sandbox, 'not-a-folder.txt')
    writeFileSync(filePath, 'k6\n')

    const detected = detectRepoTech({ workspaceRoot, repoPath: filePath })

    expect(detected).toEqual({ technologies: [], best_practices: [] })
  })

  test('Should detect nothing when no path is given', () => {
    const detected = detectRepoTech({ workspaceRoot })

    expect(detected).toEqual({ technologies: [], best_practices: [] })
  })

  test('Should refuse with NOT_FOUND when the review routing is missing', () => {
    const repoPath = writeRepo('empty-repo', { 'README.md': 'empty\n' })

    expect(() => detectRepoTech({ workspaceRoot, repoPath })).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: "Can't find .claude/skills/review/assets/routing.json."
      })
    )
  })
})

describe('#renderDetectedTechText', () => {
  test('Should print empty arrays inline', () => {
    const text = renderDetectedTechText({
      technologies: [],
      best_practices: []
    })

    expect(text).toBe('{"technologies":[],"best_practices":[]}')
  })

  test('Should print each array indented by two spaces, one value a line', () => {
    const text = renderDetectedTechText({
      technologies: ['hapi', 'pino'],
      best_practices: ['docs/a.md']
    })

    expect(text).toBe(
      '{"technologies":[\n  "hapi",\n  "pino"\n],"best_practices":[\n  "docs/a.md"\n]}'
    )
  })
})
