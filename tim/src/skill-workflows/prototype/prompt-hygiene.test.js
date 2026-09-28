import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

// This skill's own root: tim/src/skill-workflows/prototype/ -> workspace root
// -> .claude/skills/prototype.
const WORKSPACE_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '..'
)
const SKILL_DIR = join(WORKSPACE_ROOT, '.claude', 'skills', 'prototype')

const CANONICAL_ROOT = '~/git/defra/trade-imports-workspace/'

// The canonical tilde path names this checkout wherever it lives (CI checks
// the workspace out elsewhere), and repos/ is only there once cloned.
const onDiskPath = (tildePath) =>
  join(WORKSPACE_ROOT, tildePath.slice(CANONICAL_ROOT.length))

const isInUnclonedRepo = (tildePath) => {
  const [top, repo] = tildePath.slice(CANONICAL_ROOT.length).split('/')
  return top === 'repos' && !existsSync(join(WORKSPACE_ROOT, 'repos', repo))
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })

const allFiles = walk(SKILL_DIR)
const textFiles = allFiles.filter((path) => /\.(md|js)$/.test(path))

const readAll = () =>
  textFiles.map((path) => ({
    path,
    relative: path.slice(SKILL_DIR.length + 1),
    text: readFileSync(path, 'utf8')
  }))

describe('prototype skill: prompt hygiene', () => {
  const files = readAll()

  it('finds files to check', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it.each(files.map((file) => [file.relative, file]))(
    '%s contains no bare npm run, npx, node scripts/, or the word Cursor',
    (_, file) => {
      expect(file.text).not.toMatch(/npm run /)
      expect(file.text).not.toMatch(/npx /)
      expect(file.text).not.toMatch(/node scripts\//)
      expect(file.text).not.toMatch(/Cursor/)
    }
  )

  it.each(files.map((file) => [file.relative, file]))(
    '%s contains no bare git command at the start of a line',
    (_, file) => {
      const bareGitLines = file.text
        .split('\n')
        .filter((line) => /^\s*git\s/.test(line))
        .filter((line) => !/^\s*git\s+-C\s/.test(line))
      expect(bareGitLines).toEqual([])
    }
  )

  it.each(
    files
      .filter((file) => file.text.includes('scriptPath'))
      .map((file) => [file.relative, file])
  )(
    '%s only launches a workflow by its full workspace-relative scriptPath',
    (_, file) => {
      const matches = [
        ...file.text.matchAll(/scriptPath:\s*['"]([^'"]+)['"]/g)
      ].map((match) => match[1])
      for (const scriptPath of matches) {
        expect(
          scriptPath.startsWith('.claude/skills/prototype/workflow/')
        ).toBe(true)
      }
    }
  )

  const CODE_PRODUCING = [
    'fake-a-service.md',
    'change-the-journey.md',
    'change-the-words.md',
    'match-the-design.md',
    'port-a-kit-page.md',
    'example-data.md'
  ]

  it.each(CODE_PRODUCING)(
    'references/%s opens with a Read first block citing house-conventions.md',
    (name) => {
      const text = readFileSync(join(SKILL_DIR, 'references', name), 'utf8')
      expect(text).toMatch(/\*\*Read first\*\*/)
      expect(text).toContain('house-conventions.md')
      // The Read first block comes before the first "## Step" or "## Steps"
      // heading, i.e. before the recipe itself starts.
      const readFirstIndex = text.indexOf('**Read first**')
      const firstStepIndex = text.search(/\n## Step/)
      if (firstStepIndex !== -1) {
        expect(readFirstIndex).toBeLessThan(firstStepIndex)
      }
    }
  )

  it('house-conventions.md cites only tilde paths that resolve on disk', () => {
    const text = readFileSync(
      join(SKILL_DIR, 'references', 'house-conventions.md'),
      'utf8'
    )
    const paths = [
      ...new Set(
        [
          ...text.matchAll(/~\/git\/defra\/trade-imports-workspace\/[^\s`)*]+/g)
        ].map((match) =>
          match[0]
            .replace(/[).,]+$/, '')
            // A trailing glob (docs/best-practices/**, gds/*) names a
            // directory of files, not one file: check the directory.
            .replace(/\/\*+$/, '')
        )
      )
    ]
    expect(paths.length).toBeGreaterThan(10)
    const missing = paths
      .filter((path) => !isInUnclonedRepo(path))
      .filter((path) => !existsSync(onDiskPath(path)))
    expect(missing).toEqual([])
  })

  it('SKILL.md and ROUTING.md name only references that exist, by relative path', () => {
    const skillText = readFileSync(join(SKILL_DIR, 'SKILL.md'), 'utf8')
    const routingText = readFileSync(
      join(SKILL_DIR, 'references', 'ROUTING.md'),
      'utf8'
    )
    const named = [
      ...new Set(
        [
          ...`${skillText}\n${routingText}`.matchAll(
            /`references\/([a-z0-9-]+(?:\/[a-z0-9.-]+)*\.md)`/g
          )
        ].map((match) => match[1])
      )
    ]
    expect(named.length).toBeGreaterThan(10)
    for (const relative of named) {
      const full = join(SKILL_DIR, 'references', relative)
      expect(existsSync(full), `references/${relative} should exist`).toBe(true)
    }
  })

  it('every reference the outcomes and phrases tables name has a references/<name>.md file', () => {
    const routingText = readFileSync(
      join(SKILL_DIR, 'references', 'ROUTING.md'),
      'utf8'
    )
    const names = [
      ...new Set(
        [...routingText.matchAll(/`references\/([a-z-]+)\.md`/g)].map(
          (match) => match[1]
        )
      )
    ]
    expect(names).toEqual(
      expect.arrayContaining([
        'run-the-prototype',
        'design-release',
        'change-the-words',
        'match-the-design',
        'port-a-kit-page',
        'change-the-journey',
        'example-data',
        'fake-a-service',
        'research-session',
        'check-my-change',
        'show-my-change',
        'share-my-change',
        'hand-off'
      ])
    )
    for (const name of names) {
      expect(existsSync(join(SKILL_DIR, 'references', `${name}.md`))).toBe(true)
    }
  })

  it('SKILL.md and every reference use only the given prototype file layout (no orphan reference directories)', () => {
    const referencesDir = join(SKILL_DIR, 'references')
    const topLevelMd = readdirSync(referencesDir).filter((name) =>
      name.endsWith('.md')
    )
    expect(topLevelMd).toContain('house-conventions.md')
    expect(topLevelMd).toContain('conventions-pass.md')
    expect(topLevelMd).toContain('raise-the-story.md')
    expect(topLevelMd).toContain('build-it-for-real.md')
  })

  it('the workflow folder holds exactly the four workflow scripts plus their README', () => {
    const workflowDir = join(SKILL_DIR, 'workflow')
    const names = readdirSync(workflowDir).sort()
    expect(names).toEqual(
      [
        'README.md',
        'design-session.js',
        'port-kit-page.js',
        'prepare-handoff.js',
        'wording-sweep.js'
      ].sort()
    )
  })

  it('no reference or workflow file is empty', () => {
    for (const file of files) {
      expect(statSync(file.path).size, file.relative).toBeGreaterThan(0)
    }
  })
})
