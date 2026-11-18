import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { bakeStyleBundle, styleTopicsOf } from './rules-bundle.js'

const routing = {
  schemaVersion: 1,
  patternSyntax: 'shell-case',
  fileTopics: [
    { patterns: ['*.js'], topics: ['node'] },
    { patterns: ['*controller.js'], topics: ['hapi'] }
  ],
  topics: {
    node: { bestPractice: ['docs/node.md', 'docs/gone.md'] },
    hapi: {
      bestPractice: ['docs/hapi.md'],
      repoRelativeBestPractice: ['docs/validation.md', 'docs/absent.md']
    }
  },
  unknownTopicHint: 'node|hapi'
}

let workspaceRoot

const writeFile = (path, text) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-style-bundle-'))
  writeFile(
    join(workspaceRoot, '.claude/skills/code-style/assets/routing.json'),
    JSON.stringify(routing)
  )
  writeFile(join(workspaceRoot, 'docs/node.md'), '# Node\n')
  writeFile(join(workspaceRoot, 'docs/hapi.md'), '# hapi')
})

afterEach(() => rmSync(workspaceRoot, { recursive: true, force: true }))

describe('#styleTopicsOf', () => {
  test('Should give every topic a path matches, in the routing order', () => {
    expect(
      styleTopicsOf({ workspaceRoot, path: 'src/home/controller.js' })
    ).toEqual(['node', 'hapi'])
  })

  test('Should refuse with a usage line when no path is given', () => {
    expect(() => styleTopicsOf({ workspaceRoot })).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Usage: tim style topics <path>'
      })
    )
  })
})

describe('#bakeStyleBundle', () => {
  test('Should write each best-practice file under its heading and mark a missing one', () => {
    const { path } = bakeStyleBundle({
      workspaceRoot,
      reviewId: 'EUDPA-1',
      repo: 'trade-imports-stub',
      topic: 'node'
    })

    expect(path).toBe(
      join(
        workspaceRoot,
        'workareas/code-style-reviews/EUDPA-1/style-rules.trade-imports-stub.node.md'
      )
    )
    expect(readFileSync(path, 'utf8')).toBe(
      '# Style rules bundle for trade-imports-stub (node)\n\nConcatenated from `docs/best-practices/` at prepare-style time.\nAll STYLE_FILE_REVIEWER workers reviewing a node file for this\nticket read this single bundle instead of the underlying files.\n\n---\n\n## Source: `docs/node.md`\n\n# Node\n\n---\n\n## Source: `docs/gone.md` (missing)\n'
    )
  })

  test('Should add the repo-relative files the repo holds, and only those', () => {
    const repoDir = join(workspaceRoot, 'repos', 'trade-imports-stub')
    writeFile(join(repoDir, 'docs/validation.md'), 'Validate early.\n')

    const { path } = bakeStyleBundle({
      workspaceRoot,
      reviewId: 'local/trade-imports-stub/main',
      repo: 'trade-imports-stub',
      topic: 'hapi',
      repoDir
    })

    expect(readFileSync(path, 'utf8').split('---').slice(1)).toEqual([
      '\n\n## Source: `docs/hapi.md`\n\n# hapi\n',
      '\n\n## Source: `trade-imports-stub:docs/validation.md`\n\nValidate early.\n'
    ])
  })

  test('Should refuse a topic the routing data lacks, naming the topics it has', () => {
    expect(() =>
      bakeStyleBundle({
        workspaceRoot,
        reviewId: 'EUDPA-1',
        repo: 'trade-imports-stub',
        topic: 'ruby'
      })
    ).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message: 'Unknown topic: ruby (expected node|hapi)'
      })
    )
  })
})
