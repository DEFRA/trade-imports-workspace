import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
  realpathSync
} from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import {
  claudeChainFor,
  importsOf,
  projectSlug,
  memoryIndexPath
} from './claude-chain.js'

let workspace
let home

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-claude-chain-'))
  home = mkdtempSync(join(tmpdir(), 'tim-claude-chain-home-'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
  rmSync(home, { recursive: true, force: true })
})

const write = (relPath, content) => {
  const abs = join(workspace, relPath)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)
}

describe('#claudeChainFor', () => {
  test('C-1 the chain is root then folder CLAUDE.md, including .claude/CLAUDE.md when present', () => {
    write('CLAUDE.md', '# Root\n')
    write('.claude/CLAUDE.md', '# Root local\n')
    write('pkg/CLAUDE.md', '# Pkg\n')
    write('pkg/.claude/CLAUDE.md', '# Pkg local\n')

    const chain = claudeChainFor({
      workspaceRoot: workspace,
      folder: 'pkg/sub'
    })

    expect(chain).toEqual([
      'CLAUDE.md',
      '.claude/CLAUDE.md',
      'pkg/CLAUDE.md',
      'pkg/.claude/CLAUDE.md'
    ])
  })

  test('C-2 a folder without a CLAUDE.md is skipped', () => {
    write('CLAUDE.md', '# Root\n')

    const chain = claudeChainFor({
      workspaceRoot: workspace,
      folder: 'pkg/sub'
    })

    expect(chain).toEqual(['CLAUDE.md'])
  })
})

describe('#importsOf', () => {
  test('C-3 a relative import resolves against the importing file folder', () => {
    write('pkg/CLAUDE.md', '@../docs/x.md\n')
    write('docs/x.md', 'Doc.\n')

    const { imports } = importsOf({
      workspaceRoot: workspace,
      files: ['pkg/CLAUDE.md'],
      homeDir: home
    })

    expect(imports).toEqual(['docs/x.md'])
  })

  test('C-4 a nested import is followed', () => {
    write('CLAUDE.md', '@x.md\n')
    write('x.md', 'X imports @y.md too.\n')
    write('y.md', 'Y.\n')

    const { imports } = importsOf({
      workspaceRoot: workspace,
      files: ['CLAUDE.md'],
      homeDir: home
    })

    expect(imports).toEqual(['x.md', 'y.md'])
  })

  test('C-5 an import cycle terminates, each file listed once', () => {
    write('a.md', 'A imports @b.md\n')
    write('b.md', 'B imports @a.md\n')

    const { imports } = importsOf({
      workspaceRoot: workspace,
      files: ['a.md'],
      homeDir: home
    })

    expect(imports).toEqual(['b.md', 'a.md'])
  })

  test('C-6 depth is capped, terminating a long import chain', () => {
    for (let index = 0; index < 10; index += 1) {
      write(`d${index}.md`, `@d${index + 1}.md\n`)
    }
    write('d10.md', 'Leaf.\n')

    const { imports } = importsOf({
      workspaceRoot: workspace,
      files: ['d0.md'],
      homeDir: home
    })

    // d0 imports d1..d5 across 5 hops before the depth cap stops the walk
    // from reading d5's own `@d6.md` — the chain never reaches d6..d10.
    expect(imports).toEqual(['d1.md', 'd2.md', 'd3.md', 'd4.md', 'd5.md'])
  })

  test('C-7 @hapi/hapi in prose, a fenced @x.md and a code-span @y.md are all ignored', () => {
    write(
      'CLAUDE.md',
      [
        'Depends on @hapi/hapi.',
        '',
        '```',
        '@x.md',
        '```',
        '',
        'See `@y.md` for the pattern.'
      ].join('\n')
    )
    write('x.md', 'X.\n')
    write('y.md', 'Y.\n')

    const { imports } = importsOf({
      workspaceRoot: workspace,
      files: ['CLAUDE.md'],
      homeDir: home
    })

    expect(imports).toEqual([])
  })

  test('C-11 a ~/ import resolves against the home folder, outside the workspace', () => {
    write('CLAUDE.md', '@~/notes.md\n')
    writeFileSync(join(home, 'notes.md'), 'Notes.\n')

    const { imports, problems } = importsOf({
      workspaceRoot: workspace,
      files: ['CLAUDE.md'],
      homeDir: home
    })

    expect(imports).toEqual([join(home, 'notes.md')])
    expect(problems).toEqual([])
  })

  test('C-12 a missing ~/ import is reported with its absolute resolved path', () => {
    write('CLAUDE.md', '@~/missing.md\n')

    const { problems } = importsOf({
      workspaceRoot: workspace,
      files: ['CLAUDE.md'],
      homeDir: home
    })

    expect(problems).toEqual([
      {
        kind: 'import',
        source: 'CLAUDE.md',
        pointer: '~/missing.md',
        resolved: join(home, 'missing.md')
      }
    ])
  })

  test('C-13 an @import at the end of a sentence, with the full stop directly attached, still resolves', () => {
    write('pkg/CLAUDE.md', 'See @../docs/x.md.\n')
    write('docs/x.md', 'Doc.\n')

    const { imports, problems } = importsOf({
      workspaceRoot: workspace,
      files: ['pkg/CLAUDE.md'],
      homeDir: home
    })

    expect(imports).toEqual(['docs/x.md'])
    expect(problems).toEqual([])
  })

  test('C-8 a missing import target is reported as an import problem', () => {
    write('CLAUDE.md', '@missing.md\n')

    const { imports, problems } = importsOf({
      workspaceRoot: workspace,
      files: ['CLAUDE.md'],
      homeDir: home
    })

    expect(imports).toEqual(['missing.md'])
    expect(problems).toEqual([
      {
        kind: 'import',
        source: 'CLAUDE.md',
        pointer: 'missing.md',
        resolved: 'missing.md'
      }
    ])
  })
})

describe('#projectSlug', () => {
  test('C-9 replaces every non-alphanumeric character with -', () => {
    expect(
      projectSlug('/Users/samfarrington/git/defra/trade-imports-workspace')
    ).toBe('-Users-samfarrington-git-defra-trade-imports-workspace')
    expect(projectSlug('/a/.b_c')).toBe('-a--b-c')
  })
})

describe('#memoryIndexPath', () => {
  test('C-10 joins config folder, projects, slug, memory and MEMORY.md', () => {
    const claudeConfigDir = join(home, '.claude')
    const realWorkspace = realpathSync(workspace)

    const path = memoryIndexPath({ workspaceRoot: workspace, claudeConfigDir })

    expect(path).toBe(
      join(
        claudeConfigDir,
        'projects',
        projectSlug(realWorkspace),
        'memory',
        'MEMORY.md'
      )
    )
  })
})
