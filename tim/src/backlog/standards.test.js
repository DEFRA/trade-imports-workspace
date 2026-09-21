import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  realpathSync,
  rmSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import { resolveStandards, lintStandards } from './standards.js'
import { projectSlug } from './standards/claude-chain.js'
import {
  loadCodeStyleRouting,
  topicsForPath,
  bestPracticeForTopics
} from './standards/code-style-routing.js'
import {
  loadReviewRouting,
  detectTechnologies
} from './standards/review-routing.js'
import { listRepoFiles } from './standards/repo-files.js'
import {
  fixturePaths,
  fixtureRepos,
  materialise
} from './__fixtures__/standards/routing-fixtures.js'

const here = dirname(fileURLToPath(import.meta.url))
const realWorkspaceRoot = join(here, '..', '..', '..')

let workspace
let claudeConfigDir
let homeDir

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-standards-'))
  claudeConfigDir = join(workspace, '.claude-home')
  homeDir = join(workspace, '.home')
  mkdirSync(homeDir, { recursive: true })
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

const write = (relPath, content) => {
  const abs = join(workspace, relPath)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)
}

const seedWorkspace = () => {
  write('CLAUDE.md', '# Root\n@docs/best-practices/node/imported.md\n')
  write('docs/best-practices/node/imported.md', 'Imported.\n')
  write('docs/best-practices/node/style.md', 'Style.\n')

  write(
    '.claude/rules/node.md',
    [
      '---',
      'paths:',
      "  - '**/*.js'",
      '---',
      '',
      '- Topic dir: `~/git/defra/trade-imports-workspace/docs/best-practices/node/`',
      '- Key files: `style.md`.',
      ''
    ].join('\n')
  )

  write(
    '.claude/skills/code-style/assets/routing.json',
    JSON.stringify({
      schemaVersion: 1,
      patternSyntax: 'shell-case',
      fileTopics: [{ patterns: ['*.js'], topics: ['node'] }],
      topics: {
        node: { bestPractice: ['docs/best-practices/node/style.md'] }
      },
      unknownTopicHint: 'node'
    })
  )

  write(
    '.claude/skills/review/assets/routing.json',
    JSON.stringify({
      schemaVersion: 1,
      manifestDirs: ['service', 'app', 'src'],
      technologies: [
        {
          name: 'demo',
          when: { fileExists: 'marker.txt' },
          bestPractice: ['docs/best-practices/node/style.md']
        }
      ]
    })
  )
}

describe('#resolveStandards', () => {
  test('U-1 every listed path in a file entry is in shas, 40-hex', () => {
    seedWorkspace()
    write('src/a.js', 'const a = 1\n')
    const memoryPath = join(
      claudeConfigDir,
      'projects',
      projectSlug(realpathSync(workspace)),
      'memory',
      'MEMORY.md'
    )
    mkdirSync(dirname(memoryPath), { recursive: true })
    writeFileSync(memoryPath, '# Memory\n')

    const result = resolveStandards({
      workspaceRoot: workspace,
      repos: { workspace: { abs: workspace, rel: '' } },
      files: [{ repoKey: 'workspace', path: 'src/a.js' }],
      claudeConfigDir,
      homeDir
    })

    const [entry] = result.files
    const listedPaths = [
      ...entry.rules.map((r) => r.path),
      ...entry.rules.flatMap((r) => r.pointsTo),
      ...entry.bestPractice,
      ...entry.claudeMd,
      ...entry.imports,
      ...entry.memory
    ]
    expect(entry.memory).toHaveLength(1)
    for (const path of listedPaths) {
      expect(entry.shas[path]).toMatch(/^[0-9a-f]{40}$/)
    }
  })

  test('U-2 standards is the sorted, deduplicated union, including both routing files', () => {
    seedWorkspace()
    write('src/a.js', 'const a = 1\n')
    write('marker.txt', 'x')

    const result = resolveStandards({
      workspaceRoot: workspace,
      repos: { workspace: { abs: workspace, rel: '' } },
      files: [{ repoKey: 'workspace', path: 'src/a.js' }],
      repoLevel: ['workspace'],
      claudeConfigDir,
      homeDir
    })

    const paths = result.standards.map((s) => s.path)
    expect(paths).toEqual([...paths].sort())
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths).toEqual(
      expect.arrayContaining([
        '.claude/skills/code-style/assets/routing.json',
        '.claude/skills/review/assets/routing.json'
      ])
    )
  })

  test('U-3 a file that does not exist yet is resolved, and carries no sha of its own', () => {
    seedWorkspace()

    const result = resolveStandards({
      workspaceRoot: workspace,
      repos: { workspace: { abs: workspace, rel: '' } },
      files: [{ repoKey: 'workspace', path: 'src/not-yet.js' }],
      claudeConfigDir,
      homeDir
    })

    const [entry] = result.files
    expect(entry.shas['src/not-yet.js']).toBeUndefined()
    expect(entry.topics).toEqual(['node'])
  })

  test('U-4 a missing memory index is not listed, and notes names its path', () => {
    seedWorkspace()
    write('src/a.js', 'x')

    const result = resolveStandards({
      workspaceRoot: workspace,
      repos: { workspace: { abs: workspace, rel: '' } },
      files: [{ repoKey: 'workspace', path: 'src/a.js' }],
      claudeConfigDir,
      homeDir
    })

    expect(result.files[0].memory).toEqual([])
    expect(result.notes[0]).toMatch(/No memory index at/)
  })

  test('U-5 a dead rule pointer on a matched rule throws LINT, naming the rule and the path', () => {
    seedWorkspace()
    rmSync(join(workspace, 'docs', 'best-practices', 'node', 'style.md'))
    write('src/a.js', 'x')

    const attempt = () =>
      resolveStandards({
        workspaceRoot: workspace,
        repos: { workspace: { abs: workspace, rel: '' } },
        files: [{ repoKey: 'workspace', path: 'src/a.js' }],
        claudeConfigDir,
        homeDir
      })

    expect(attempt).toThrow(expect.objectContaining({ code: 'LINT' }))
    expect(attempt).toThrow(/\.claude\/rules\/node\.md/)
    expect(attempt).toThrow(/docs\/best-practices\/node\/style\.md/)
  })

  test('U-6 a dead routing bestPractice path throws LINT', () => {
    seedWorkspace()
    rmSync(join(workspace, 'docs', 'best-practices', 'node', 'style.md'))
    write(
      '.claude/rules/node.md',
      '---\npaths:\n  - "**/*.js"\n---\n\nNo pointers here.\n'
    )
    write('src/a.js', 'x')

    expect(() =>
      resolveStandards({
        workspaceRoot: workspace,
        repos: { workspace: { abs: workspace, rel: '' } },
        files: [{ repoKey: 'workspace', path: 'src/a.js' }],
        claudeConfigDir,
        homeDir
      })
    ).toThrow(expect.objectContaining({ code: 'LINT' }))
  })

  test('req-043 topics for a file in a non-workspace repo use the repo-relative path, not the workspace-relative one', () => {
    write('CLAUDE.md', '# Root\n')
    write(
      '.claude/skills/code-style/assets/routing.json',
      JSON.stringify({
        schemaVersion: 1,
        patternSyntax: 'shell-case',
        fileTopics: [
          { patterns: ['*.js'], topics: ['node'] },
          { patterns: ['*/k6/*'], topics: ['k6'] }
        ],
        topics: {
          node: { bestPractice: ['docs/best-practices/node/style.md'] },
          k6: { bestPractice: ['docs/best-practices/k6/style.md'] }
        },
        unknownTopicHint: 'node|k6'
      })
    )
    write('docs/best-practices/node/style.md', 'Style.\n')
    write('docs/best-practices/k6/style.md', 'K6 style.\n')
    write('repos/x/k6/load.js', 'x')
    write('repos/x/perf/b.js', 'x')

    const result = resolveStandards({
      workspaceRoot: workspace,
      repos: {
        workspace: { abs: workspace, rel: '' },
        x: { abs: join(workspace, 'repos', 'x'), rel: 'repos/x' }
      },
      files: [
        { repoKey: 'x', path: 'k6/load.js' },
        { repoKey: 'x', path: 'perf/b.js' }
      ],
      claudeConfigDir,
      homeDir
    })

    expect(result.files.map((f) => f.topics)).toEqual([['node'], ['node']])
  })

  test('U-9 workspace repo-level detection skips repos/, workareas/ and .claude/worktrees/', () => {
    seedWorkspace()
    write(
      'repos/api/pom.xml',
      '<project><dependency>spring-boot-starter</dependency></project>\n'
    )
    write(
      'workareas/leftover/pom.xml',
      '<project><dependency>spring-boot-starter</dependency></project>\n'
    )
    write(
      '.claude/worktrees/x/pom.xml',
      '<project><dependency>spring-boot-starter</dependency></project>\n'
    )
    write(
      '.claude/skills/review/assets/routing.json',
      JSON.stringify({
        schemaVersion: 1,
        manifestDirs: ['service', 'app', 'src'],
        technologies: [
          {
            name: 'springboot',
            when: { fileContains: { file: 'pom.xml', pattern: 'spring-boot' } },
            bestPractice: ['docs/best-practices/node/style.md']
          }
        ]
      })
    )

    const result = resolveStandards({
      workspaceRoot: workspace,
      repos: {
        workspace: { abs: workspace, rel: '' },
        api: { abs: join(workspace, 'repos', 'api'), rel: 'repos/api' }
      },
      repoLevel: ['workspace'],
      claudeConfigDir,
      homeDir
    })

    expect(result.repos[0].technologies).toEqual([])
  })
})

describe('#lintStandards', () => {
  test('U-7 reports a dead pointer in a rule that matches no requested file', () => {
    seedWorkspace()
    rmSync(join(workspace, 'docs', 'best-practices', 'node', 'style.md'))

    expect(() => lintStandards({ workspaceRoot: workspace, homeDir })).toThrow(
      expect.objectContaining({ code: 'LINT' })
    )
  })

  test('U-8 reports a Topic dir that is a file, not a folder', () => {
    seedWorkspace()
    rmSync(join(workspace, 'docs', 'best-practices', 'node'), {
      recursive: true,
      force: true
    })
    write('docs/best-practices/node', 'This is a file, not a folder.\n')

    expect(() => lintStandards({ workspaceRoot: workspace, homeDir })).toThrow(
      expect.objectContaining({ code: 'LINT' })
    )
  })
})

describe('group G — tim agrees with the routing data the bash goldens were captured against', () => {
  const routing = loadCodeStyleRouting(realWorkspaceRoot)

  test('G-1 topics for every fixture path match the topic order the goldens pin', () => {
    const goldenPath = join(
      here,
      '__fixtures__',
      'standards',
      '__golden__',
      'file-topics.json'
    )
    const cases = JSON.parse(readFileSync(goldenPath, 'utf8'))

    for (const path of fixturePaths) {
      const golden = cases.find((c) => c.input === path)
      const expectedTopics = golden.stdout.split('\n').filter(Boolean)

      expect(topicsForPath(routing, path)).toEqual(expectedTopics)
    }
  })

  test('G-2 bestPracticeForTopics matches the live bake bundle source order for each topic', () => {
    const goldenPath = join(
      here,
      '__fixtures__',
      'standards',
      '__golden__',
      'bake-rules-bundle.json'
    )
    const cases = JSON.parse(readFileSync(goldenPath, 'utf8'))
    for (const topic of ['node', 'java', 'gds', 'playwright', 'k6']) {
      const golden = cases.find((c) => c.input[2] === topic)
      const sourcePaths = [
        ...golden.bundle.matchAll(/## Source: `([^`]+)`/g)
      ].map((m) => m[1])
      expect(bestPracticeForTopics(routing, [topic])).toEqual(sourcePaths)
    }
  })

  test('G-3 unknownTopicHint names exactly the topics keys, and matches the golden ruby stderr', () => {
    const goldenPath = join(
      here,
      '__fixtures__',
      'standards',
      '__golden__',
      'bake-rules-bundle.json'
    )
    const cases = JSON.parse(readFileSync(goldenPath, 'utf8'))
    const ruby = cases.find((c) => c.input[2] === 'ruby')

    expect(routing.unknownTopicHint.split('|').sort()).toEqual(
      Object.keys(routing.topics).sort()
    )
    expect(ruby.stderr).toContain(routing.unknownTopicHint)
  })

  describe('G-4/G-5 detectTechnologies matches the live detect-tech.sh goldens', () => {
    let reviewRouting
    let fixturesRoot

    beforeEach(() => {
      reviewRouting = loadReviewRouting(realWorkspaceRoot)
      fixturesRoot = mkdtempSync(join(tmpdir(), 'tim-standards-group-g-'))
      for (const [name, files] of Object.entries(fixtureRepos)) {
        const repoDir = join(fixturesRoot, name)
        mkdirSync(repoDir, { recursive: true })
        materialise(repoDir, files)
      }
    })

    afterEach(() => {
      rmSync(fixturesRoot, { recursive: true, force: true })
    })

    test('every fixture repo agrees with the golden technologies and bestPractice', () => {
      const goldenPath = join(
        here,
        '__fixtures__',
        'standards',
        '__golden__',
        'detect-tech.json'
      )
      const cases = JSON.parse(readFileSync(goldenPath, 'utf8'))

      for (const name of Object.keys(fixtureRepos)) {
        const golden = JSON.parse(cases.find((c) => c.input === name).stdout)
        const repoDir = join(fixturesRoot, name)
        const result = detectTechnologies({
          routing: reviewRouting,
          repoDir,
          repoFiles: listRepoFiles({ repoDir })
        })

        expect(result.technologies).toEqual(golden.technologies)
        expect(result.bestPractice).toEqual(golden.best_practices)
      }
    })
  })
})

describe('group L — the live workspace', () => {
  test('L-1 lintStandards on the real workspace reports no problems', () => {
    const result = lintStandards({
      workspaceRoot: realWorkspaceRoot,
      homeDir: join(workspace, '.home')
    })

    expect(result.problems).toEqual([])
  })

  test('L-2 resolveStandards for tim/src/commands/backlog/index.js', () => {
    const result = resolveStandards({
      workspaceRoot: realWorkspaceRoot,
      repos: { workspace: { abs: realWorkspaceRoot, rel: '' } },
      files: [
        {
          repoKey: 'workspace',
          path: 'tim/src/commands/backlog/index.js'
        }
      ],
      claudeConfigDir: join(workspace, '.claude-home'),
      homeDir: join(workspace, '.home')
    })

    const [entry] = result.files
    expect(entry.rules.map((r) => r.path)).toEqual(
      expect.arrayContaining([
        '.claude/rules/node.md',
        'tim/.claude/rules/cli-patterns.md'
      ])
    )
    expect(entry.claudeMd).toEqual(['CLAUDE.md', 'tim/CLAUDE.md'])
    expect(entry.imports.length).toBeGreaterThanOrEqual(6)
    expect(entry.topics).toEqual(['node'])
  })
})
