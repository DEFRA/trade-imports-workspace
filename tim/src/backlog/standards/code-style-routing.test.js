import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import {
  loadCodeStyleRouting,
  topicsForPath,
  bestPracticeForTopics,
  shellPatternToRegExp,
  CODE_STYLE_ROUTING_PATH
} from './code-style-routing.js'

let workspace

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-code-style-routing-'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

const writeRouting = (doc) => {
  const path = join(workspace, CODE_STYLE_ROUTING_PATH)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, JSON.stringify(doc))
}

const baseRouting = () => ({
  schemaVersion: 1,
  patternSyntax: 'shell-case',
  fileTopics: [
    { patterns: ['*.js'], topics: ['node'] },
    { patterns: ['*/k6/*'], topics: ['k6'] },
    { patterns: ['*.spec.ts'], topics: ['playwright', 'node'] }
  ],
  topics: {
    node: {
      bestPractice: [
        'docs/best-practices/node/code-style.md',
        'docs/best-practices/doc-comments/BEST_PRACTICES.md'
      ]
    },
    k6: { bestPractice: ['docs/best-practices/k6/BEST_PRACTICES.md'] },
    playwright: {
      bestPractice: ['docs/best-practices/playwright/BEST_PRACTICES.md']
    }
  },
  unknownTopicHint: 'node|k6|playwright'
})

describe('#topicsForPath', () => {
  test('CS-1 topics come out in the topics key order, whatever the fileTopics order', () => {
    writeRouting(baseRouting())
    const routing = loadCodeStyleRouting(workspace)

    const topics = topicsForPath(routing, 'tests/a.spec.ts')

    expect(topics).toEqual(['node', 'playwright'])
  })

  test('CS-2 */k6/* matches across a slash and not a bare k6/ prefix', () => {
    writeRouting(baseRouting())
    const routing = loadCodeStyleRouting(workspace)

    expect(topicsForPath(routing, 'a/b/k6/c/d.js')).toEqual(
      expect.arrayContaining(['k6'])
    )
    expect(topicsForPath(routing, 'k6/x.js')).not.toEqual(
      expect.arrayContaining(['k6'])
    )
  })
})

describe('#shellPatternToRegExp', () => {
  test('CS-3 escapes regex metacharacters', () => {
    const regex = shellPatternToRegExp('*.k6.js')

    expect(regex.test('a-k6-js')).toBe(false)
    expect(regex.test('load.k6.js')).toBe(true)
  })

  test('CS-4 a pattern containing [ is refused with PARSE', () => {
    expect(() => shellPatternToRegExp('[abc].js')).toThrow(
      expect.objectContaining({ code: 'PARSE' })
    )
  })
})

describe('#loadCodeStyleRouting', () => {
  test('CS-8 a routing file whose pattern needs a refused character fails to load', () => {
    const doc = baseRouting()
    doc.fileTopics.push({ patterns: ['[abc].js'], topics: ['node'] })
    writeRouting(doc)

    expect(() => loadCodeStyleRouting(workspace)).toThrow(
      expect.objectContaining({ code: 'PARSE' })
    )
  })

  test('CS-5 a fileTopics topic missing from topics is refused with PARSE, naming it', () => {
    const doc = baseRouting()
    doc.fileTopics.push({ patterns: ['*.rb'], topics: ['ruby'] })
    writeRouting(doc)

    expect(() => loadCodeStyleRouting(workspace)).toThrow(/ruby/)
  })

  test('CS-6 a missing routing file gives NOT_FOUND, naming the path', () => {
    expect(() => loadCodeStyleRouting(workspace)).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' })
    )
    expect(() => loadCodeStyleRouting(workspace)).toThrow(
      new RegExp(CODE_STYLE_ROUTING_PATH.replace(/[/.]/g, '\\$&'))
    )
  })
})

describe('#bestPracticeForTopics', () => {
  test('CS-7 the union in topic order, deduplicated', () => {
    writeRouting(baseRouting())
    const routing = loadCodeStyleRouting(workspace)

    const bestPractice = bestPracticeForTopics(routing, ['node', 'playwright'])

    expect(bestPractice).toEqual([
      'docs/best-practices/node/code-style.md',
      'docs/best-practices/doc-comments/BEST_PRACTICES.md',
      'docs/best-practices/playwright/BEST_PRACTICES.md'
    ])
  })

  test('a shared file across two topics is listed once', () => {
    const doc = baseRouting()
    doc.topics.java = {
      bestPractice: [
        'docs/best-practices/java/modern-java.md',
        'docs/best-practices/doc-comments/BEST_PRACTICES.md'
      ]
    }
    writeRouting(doc)
    const routing = loadCodeStyleRouting(workspace)

    const bestPractice = bestPracticeForTopics(routing, ['node', 'java'])

    expect(
      bestPractice.filter(
        (path) => path === 'docs/best-practices/doc-comments/BEST_PRACTICES.md'
      )
    ).toHaveLength(1)
  })
})
