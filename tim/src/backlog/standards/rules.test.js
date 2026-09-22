import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'
import {
  rulesFoldersFor,
  loadRule,
  loadRulesIn,
  matchRule,
  extractPointers,
  expandBraces,
  findAllRulesFolders
} from './rules.js'

const here = dirname(fileURLToPath(import.meta.url))
const realWorkspaceRoot = join(here, '..', '..', '..', '..')

let workspace

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), 'tim-rules-'))
})

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true })
})

const writeRule = (relRulePath, content) => {
  const abs = join(workspace, relRulePath)
  mkdirSync(dirname(abs), { recursive: true })
  writeFileSync(abs, content)
  return abs
}

describe('#matchRule', () => {
  test('R-1 matches a nested and a root file, not a wrong extension', () => {
    const ruleAbsPath = writeRule(
      '.claude/rules/node.md',
      '---\npaths:\n  - "**/*.js"\n---\n\nBody.\n'
    )
    const rule = loadRule({
      workspaceRoot: workspace,
      ruleAbsPath,
      scopeRootRelative: ''
    })

    expect(matchRule(rule, 'src/a.js').matches).toBe(true)
    expect(matchRule(rule, 'a.js').matches).toBe(true)
    expect(matchRule(rule, 'a.ts').matches).toBe(false)
  })

  test('R-2 dot:true matches a dot-folder file', () => {
    const ruleAbsPath = writeRule(
      '.claude/rules/node.md',
      '---\npaths:\n  - "**/*.js"\n---\n\nBody.\n'
    )
    const rule = loadRule({
      workspaceRoot: workspace,
      ruleAbsPath,
      scopeRootRelative: ''
    })

    expect(matchRule(rule, '.claude/workflows/x.js').matches).toBe(true)
  })

  test('R-4 a nested rule matches with its own scope-relative glob', () => {
    const ruleAbsPath = writeRule(
      'tim/.claude/rules/cli.md',
      '---\npaths:\n  - "src/commands/**"\n---\n\nBody.\n'
    )
    const rule = loadRule({
      workspaceRoot: workspace,
      ruleAbsPath,
      scopeRootRelative: 'tim'
    })

    const result = matchRule(rule, 'tim/src/commands/x.js')

    expect(result.matches).toBe(true)
    expect(result.matchedBy).toBe('src/commands/**')
  })

  test('R-5 the same nested rule does not apply to a root path of the same shape', () => {
    const ruleAbsPath = writeRule(
      'tim/.claude/rules/cli.md',
      '---\npaths:\n  - "src/commands/**"\n---\n\nBody.\n'
    )
    const rule = loadRule({
      workspaceRoot: workspace,
      ruleAbsPath,
      scopeRootRelative: 'tim'
    })

    expect(matchRule(rule, 'src/commands/x.js').matches).toBe(false)
  })

  test('R-6a a CRLF-fronted rule file has its front matter parsed, not ignored', () => {
    const ruleAbsPath = writeRule(
      '.claude/rules/crlf.md',
      '---\r\npaths:\r\n  - "**/*.js"\r\n---\r\n\r\nBody.\r\n'
    )
    const rule = loadRule({
      workspaceRoot: workspace,
      ruleAbsPath,
      scopeRootRelative: ''
    })

    expect(rule.globs).toEqual(['**/*.js'])
    expect(matchRule(rule, 'a.ts').matches).toBe(false)
  })

  test('R-6 a rule with no front matter matches every file, matchedBy null', () => {
    const ruleAbsPath = writeRule(
      '.claude/rules/always.md',
      '# Always\n\nNo front matter here.\n'
    )
    const rule = loadRule({
      workspaceRoot: workspace,
      ruleAbsPath,
      scopeRootRelative: ''
    })

    const result = matchRule(rule, 'anything/at/all.txt')

    expect(result).toEqual({ matches: true, matchedBy: null })
  })
})

describe('#loadRule', () => {
  test('R-7 malformed YAML front matter throws PARSE naming the rule path', () => {
    const ruleAbsPath = writeRule(
      '.claude/rules/bad.md',
      '---\npaths: [unterminated\n---\n\nBody.\n'
    )

    expect(() =>
      loadRule({ workspaceRoot: workspace, ruleAbsPath, scopeRootRelative: '' })
    ).toThrow(expect.objectContaining({ code: 'PARSE' }))
    expect(() =>
      loadRule({ workspaceRoot: workspace, ruleAbsPath, scopeRootRelative: '' })
    ).toThrow(/\.claude\/rules\/bad\.md/)
  })

  test('R-8 paths: 42 throws PARSE naming the rule path', () => {
    const ruleAbsPath = writeRule(
      '.claude/rules/bad.md',
      '---\npaths: 42\n---\n\nBody.\n'
    )

    expect(() =>
      loadRule({ workspaceRoot: workspace, ruleAbsPath, scopeRootRelative: '' })
    ).toThrow(expect.objectContaining({ code: 'PARSE' }))
    expect(() =>
      loadRule({ workspaceRoot: workspace, ruleAbsPath, scopeRootRelative: '' })
    ).toThrow(/\.claude\/rules\/bad\.md/)
  })

  test('R-10 a Topic dir not ending in / throws PARSE naming the rule path and the topic dir', () => {
    const ruleAbsPath = writeRule(
      '.claude/rules/bad.md',
      '- Topic dir: `~/git/defra/trade-imports-workspace/docs/best-practices/node`\n'
    )

    expect(() =>
      loadRule({ workspaceRoot: workspace, ruleAbsPath, scopeRootRelative: '' })
    ).toThrow(expect.objectContaining({ code: 'PARSE' }))
    expect(() =>
      loadRule({ workspaceRoot: workspace, ruleAbsPath, scopeRootRelative: '' })
    ).toThrow(/\.claude\/rules\/bad\.md/)
    expect(() =>
      loadRule({ workspaceRoot: workspace, ruleAbsPath, scopeRootRelative: '' })
    ).toThrow(/docs\/best-practices\/node/)
  })
})

describe('#rulesFoldersFor', () => {
  test('R-9 ignores a .claude/rules folder in a sibling or non-ancestor folder', () => {
    mkdirSync(join(workspace, '.claude', 'rules'), { recursive: true })
    writeFileSync(join(workspace, '.claude', 'rules', 'root.md'), '# Root\n')
    writeRule('workareas/clones/x/.claude/rules/decoy.md', '# Decoy\n')

    const folders = rulesFoldersFor({
      workspaceRoot: workspace,
      path: 'src/a.js'
    })

    expect(folders.map((f) => f.scopeRootRelative)).toEqual([''])
  })

  test('finds a nested rules folder for a file under it', () => {
    mkdirSync(join(workspace, '.claude', 'rules'), { recursive: true })
    writeFileSync(join(workspace, '.claude', 'rules', 'root.md'), '# Root\n')
    mkdirSync(join(workspace, 'tim', '.claude', 'rules'), { recursive: true })
    writeFileSync(
      join(workspace, 'tim', '.claude', 'rules', 'cli.md'),
      '# CLI\n'
    )

    const folders = rulesFoldersFor({
      workspaceRoot: workspace,
      path: 'tim/src/commands/x.js'
    })

    expect(folders.map((f) => f.scopeRootRelative)).toEqual(['', 'tim'])
  })
})

describe('#findAllRulesFolders', () => {
  test('W-1 finds the root and a nested rules folder', () => {
    mkdirSync(join(workspace, '.claude', 'rules'), { recursive: true })
    writeFileSync(join(workspace, '.claude', 'rules', 'root.md'), '# Root\n')
    mkdirSync(join(workspace, 'pkg', '.claude', 'rules'), { recursive: true })
    writeFileSync(join(workspace, 'pkg', '.claude', 'rules', 'a.md'), '# A\n')

    const folders = findAllRulesFolders(workspace)

    expect(folders).toEqual(['', 'pkg'])
  })

  test('W-2 skips node_modules, workareas and .claude/worktrees', () => {
    mkdirSync(join(workspace, '.claude', 'rules'), { recursive: true })
    writeFileSync(join(workspace, '.claude', 'rules', 'root.md'), '# Root\n')
    mkdirSync(join(workspace, 'node_modules', 'x', '.claude', 'rules'), {
      recursive: true
    })
    mkdirSync(join(workspace, 'workareas', 'y', '.claude', 'rules'), {
      recursive: true
    })
    mkdirSync(
      join(workspace, '.claude', 'worktrees', 'z', '.claude', 'rules'),
      { recursive: true }
    )

    const folders = findAllRulesFolders(workspace)

    expect(folders).toEqual([''])
  })

  test('W-4 skips a .claude/worktrees folder nested under a non-root scope too', () => {
    mkdirSync(join(workspace, '.claude', 'rules'), { recursive: true })
    writeFileSync(join(workspace, '.claude', 'rules', 'root.md'), '# Root\n')
    mkdirSync(join(workspace, 'pkg', '.claude', 'rules'), { recursive: true })
    writeFileSync(join(workspace, 'pkg', '.claude', 'rules', 'a.md'), '# A\n')
    mkdirSync(
      join(workspace, 'pkg', '.claude', 'worktrees', 'z', '.claude', 'rules'),
      { recursive: true }
    )

    const folders = findAllRulesFolders(workspace)

    expect(folders).toEqual(['', 'pkg'])
  })

  test('W-3 a nested repos/<name>/.claude/rules folder is included (deliberate — the walk skips no repo by name)', () => {
    mkdirSync(join(workspace, 'repos', 'some-repo', '.claude', 'rules'), {
      recursive: true
    })
    writeFileSync(
      join(workspace, 'repos', 'some-repo', '.claude', 'rules', 'a.md'),
      '# A\n'
    )

    const folders = findAllRulesFolders(workspace)

    expect(folders).toEqual(['repos/some-repo'])
  })
})

describe('#expandBraces', () => {
  test('P-2 expands one brace group into two tokens', () => {
    expect(expandBraces('testing/{unit.md,integration.md}')).toEqual([
      'testing/unit.md',
      'testing/integration.md'
    ])
  })

  test('a token with no braces expands to itself', () => {
    expect(expandBraces('code-style.md')).toEqual(['code-style.md'])
  })
})

describe('#extractPointers', () => {
  test('P-1 Topic dir plus Key files resolve against the Topic dir', () => {
    const body = [
      '- Topic dir: `~/git/defra/trade-imports-workspace/docs/best-practices/sql/`',
      '- Key files: `style.md`, `{a.md,b.md}`'
    ].join('\n')

    const { pointsTo, topicDirRelative } = extractPointers(body, {
      scopeRootRelative: ''
    })

    expect(topicDirRelative).toBe('docs/best-practices/sql/')
    expect(pointsTo).toEqual([
      'docs/best-practices/sql/style.md',
      'docs/best-practices/sql/a.md',
      'docs/best-practices/sql/b.md'
    ])
  })

  test('P-3 a full-workspace pointer becomes workspace-relative', () => {
    const body =
      '- See `~/git/defra/trade-imports-workspace/docs/best-practices/node/code-style.md`.'

    const { pointsTo } = extractPointers(body, { scopeRootRelative: '' })

    expect(pointsTo).toEqual(['docs/best-practices/node/code-style.md'])
  })

  test('P-4 a backticked .md token in a paragraph is ignored', () => {
    const body =
      'A spec is still JS/TS, so `node.md` applies additively — not a list item.\n'

    const { pointsTo } = extractPointers(body, { scopeRootRelative: '' })

    expect(pointsTo).toEqual([])
  })

  test('P-5 non-.md tokens are ignored', () => {
    const body =
      '- Run `npm run test:docker-compose` and pass `--json` when scripting.'

    const { pointsTo } = extractPointers(body, { scopeRootRelative: '' })

    expect(pointsTo).toEqual([])
  })

  test('P-6 a continuation line of a list item is read', () => {
    const body = [
      '- Key file: `language.md` — plain English, active voice,',
      '  capitalisation, and one more line naming `accessibility.md`.'
    ].join('\n')

    const { pointsTo } = extractPointers(body, { scopeRootRelative: '' })

    expect(pointsTo).toEqual(['language.md', 'accessibility.md'])
  })

  test('P-7 a relative pointer with no Topic dir resolves against the scope root', () => {
    const body = '- See `docs/x.md` for the pattern.'

    const { pointsTo } = extractPointers(body, { scopeRootRelative: 'tim' })

    expect(pointsTo).toEqual(['tim/docs/x.md'])
  })

  test('P-8 duplicate pointers are dropped, in order', () => {
    const body = [
      '- First `a.md` mention.',
      '- Second `a.md` mention, then `b.md`.'
    ].join('\n')

    const { pointsTo } = extractPointers(body, { scopeRootRelative: '' })

    expect(pointsTo).toEqual(['a.md', 'b.md'])
  })
})

describe('the D7 wording fix, against the live rule files', () => {
  test('P-9 node.md gives six Topic-dir files, then jsdoc.md, then BEST_PRACTICES.md', () => {
    const rule = loadRule({
      workspaceRoot: realWorkspaceRoot,
      ruleAbsPath: join(realWorkspaceRoot, '.claude', 'rules', 'node.md'),
      scopeRootRelative: ''
    })

    expect(rule.pointsTo).toEqual([
      'docs/best-practices/node/code-style.md',
      'docs/best-practices/node/hapi.md',
      'docs/best-practices/node/pino-logging.md',
      'docs/best-practices/node/govuk-frontend.md',
      'docs/best-practices/node/nunjucks.md',
      'docs/best-practices/node/testing/frontend.md',
      'docs/best-practices/doc-comments/jsdoc.md',
      'docs/best-practices/doc-comments/BEST_PRACTICES.md'
    ])
  })

  test('P-9 java.md gives its six Topic-dir files, then javadoc.md, then BEST_PRACTICES.md', () => {
    const rule = loadRule({
      workspaceRoot: realWorkspaceRoot,
      ruleAbsPath: join(realWorkspaceRoot, '.claude', 'rules', 'java.md'),
      scopeRootRelative: ''
    })

    expect(rule.pointsTo).toEqual([
      'docs/best-practices/java/modern-java.md',
      'docs/best-practices/java/spring-boot.md',
      'docs/best-practices/java/spring-data-mongodb.md',
      'docs/best-practices/java/aws-sdk-v2.md',
      'docs/best-practices/java/openapi-springdoc.md',
      'docs/best-practices/java/testing/unit.md',
      'docs/best-practices/java/testing/integration.md',
      'docs/best-practices/doc-comments/javadoc.md',
      'docs/best-practices/doc-comments/BEST_PRACTICES.md'
    ])
  })
})

describe('R-3, union across rule files in the same folder', () => {
  test('src/copy/copy.en.js matches both node.md and copy.md', () => {
    const rules = loadRulesIn({
      workspaceRoot: realWorkspaceRoot,
      scopeRootRelative: ''
    })

    const matchedPaths = rules
      .filter((rule) => matchRule(rule, 'src/copy/copy.en.js').matches)
      .map((rule) => rule.path)

    expect(matchedPaths).toEqual(
      expect.arrayContaining(['.claude/rules/node.md', '.claude/rules/copy.md'])
    )
  })
})
