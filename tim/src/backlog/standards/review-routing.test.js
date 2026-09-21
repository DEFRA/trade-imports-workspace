import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { listRepoFiles } from './repo-files.js'
import {
  evalCondition,
  detectTechnologies,
  loadReviewRouting,
  REVIEW_ROUTING_PATH
} from './review-routing.js'

let repoDir
let workspace

beforeEach(() => {
  repoDir = mkdtempSync(join(tmpdir(), 'tim-review-repo-'))
  workspace = mkdtempSync(join(tmpdir(), 'tim-review-workspace-'))
})

afterEach(() => {
  rmSync(repoDir, { recursive: true, force: true })
  rmSync(workspace, { recursive: true, force: true })
})

const ctxFor = (manifestDirs = ['service', 'app', 'src']) => ({
  repoDir,
  manifestDirs,
  repoFiles: listRepoFiles({ repoDir })
})

const write = (relPath, content) => {
  const abs = join(repoDir, relPath)
  mkdirSync(join(abs, '..'), { recursive: true })
  writeFileSync(abs, content)
}

describe('#evalCondition', () => {
  test('RR-1 fileContains finds a manifest at the root and in each manifestDirs folder, not elsewhere', () => {
    write('package.json', '{"k6": true}')

    expect(
      evalCondition(
        { fileContains: { file: 'package.json', pattern: 'k6' } },
        ctxFor()
      )
    ).toBe(true)
  })

  test('RR-1 (manifestDirs folder)', () => {
    write('app/package.json', '{"k6": true}')

    expect(
      evalCondition(
        { fileContains: { file: 'package.json', pattern: 'k6' } },
        ctxFor()
      )
    ).toBe(true)
  })

  test('RR-1 (unlisted folder does not count)', () => {
    write('unlisted/package.json', '{"k6": true}')

    expect(
      evalCondition(
        { fileContains: { file: 'package.json', pattern: 'k6' } },
        ctxFor()
      )
    ).toBe(false)
  })

  test('RR-2 anyFileContains matches by basename glob in a nested folder', () => {
    write('deep/nested/load.js', "import http from 'k6/http'\n")

    expect(
      evalCondition(
        { anyFileContains: { glob: '*.js', pattern: 'k6/http' } },
        ctxFor()
      )
    ).toBe(true)
  })

  test('RR-3 anyFileContains matches per line, not across a newline', () => {
    write('a.js', 'first\nsecond\n')

    // The pattern's literal newline could only match a raw, un-split read
    // of the file (spanning "...t\nsecond..."); per-line matching strips
    // the newline before each test, so this discriminates the two.
    expect(
      evalCondition(
        { anyFileContains: { glob: '*.js', pattern: 't\nsecond' } },
        ctxFor()
      )
    ).toBe(false)
  })

  test('RR-4 dirExists', () => {
    mkdirSync(join(repoDir, 'k6'), { recursive: true })

    expect(evalCondition({ dirExists: 'k6' }, ctxFor())).toBe(true)
    expect(evalCondition({ dirExists: 'nope' }, ctxFor())).toBe(false)
  })

  test('RR-5 allOf needs both, anyOf needs one', () => {
    write('a.js', 'alpha\n')

    const ctx = ctxFor()
    const condA = { anyFileContains: { glob: '*.js', pattern: 'alpha' } }
    const condB = { anyFileContains: { glob: '*.js', pattern: 'beta' } }

    expect(evalCondition({ allOf: [condA, condB] }, ctx)).toBe(false)
    expect(evalCondition({ allOf: [condA, condA] }, ctx)).toBe(true)
    expect(evalCondition({ anyOf: [condA, condB] }, ctx)).toBe(true)
    expect(evalCondition({ anyOf: [condB, condB] }, ctx)).toBe(false)
  })
})

describe('#detectTechnologies', () => {
  const routing = {
    schemaVersion: 1,
    manifestDirs: ['service', 'app', 'src'],
    technologies: [
      {
        name: 'k6',
        when: { fileContains: { file: 'package.json', pattern: '"k6"' } },
        bestPractice: ['docs/best-practices/k6/BEST_PRACTICES.md']
      },
      {
        name: 'springboot',
        when: { fileContains: { file: 'pom.xml', pattern: 'spring-boot' } },
        bestPractice: ['docs/best-practices/java/spring-boot.md']
      },
      {
        name: 'spring-data-mongodb',
        requires: 'springboot',
        when: {
          fileContains: { file: 'pom.xml', pattern: 'spring-data-mongodb' }
        },
        bestPractice: ['docs/best-practices/java/spring-data-mongodb.md']
      }
    ]
  }

  test('RR-6 requires skips a technology whose prerequisite was not detected', () => {
    write('pom.xml', 'spring-data-mongodb but no spring boot marker')

    const result = detectTechnologies({
      routing,
      repoDir,
      repoFiles: listRepoFiles({ repoDir })
    })

    expect(result.technologies).toEqual([])
  })

  test('RR-9 emission order follows the technologies array', () => {
    write('package.json', '{"dependencies":{"k6":"^1.0.0"}}')
    write('pom.xml', 'spring-boot and spring-data-mongodb together')

    const result = detectTechnologies({
      routing,
      repoDir,
      repoFiles: listRepoFiles({ repoDir })
    })

    expect(result.technologies).toEqual([
      'k6',
      'springboot',
      'spring-data-mongodb'
    ])
  })
})

const writeRouting = (doc) => {
  mkdirSync(join(workspace, '.claude', 'skills', 'review', 'assets'), {
    recursive: true
  })
  writeFileSync(join(workspace, REVIEW_ROUTING_PATH), JSON.stringify(doc))
}

const baseRouting = () => ({
  schemaVersion: 1,
  manifestDirs: ['service', 'app', 'src'],
  technologies: [
    {
      name: 'springboot',
      when: { fileContains: { file: 'pom.xml', pattern: 'spring-boot' } },
      bestPractice: ['docs/best-practices/java/spring-boot.md']
    }
  ]
})

describe('#loadReviewRouting', () => {
  test('RR-7 a requires naming a later technology is refused with PARSE', () => {
    const doc = baseRouting()
    doc.technologies.unshift({
      name: 'spring-data-mongodb',
      requires: 'springboot',
      when: { fileContains: { file: 'pom.xml', pattern: 'mongo' } },
      bestPractice: ['docs/best-practices/java/spring-data-mongodb.md']
    })
    writeRouting(doc)

    expect(() => loadReviewRouting(workspace)).toThrow(
      expect.objectContaining({ code: 'PARSE' })
    )
  })

  test('RR-8 a non-compiling pattern is refused with PARSE', () => {
    const doc = baseRouting()
    doc.technologies[0].when.fileContains.pattern = '(unterminated'
    writeRouting(doc)

    expect(() => loadReviewRouting(workspace)).toThrow(
      expect.objectContaining({ code: 'PARSE' })
    )
  })

  test('a missing routing file gives NOT_FOUND', () => {
    expect(() => loadReviewRouting(workspace)).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' })
    )
  })
})
