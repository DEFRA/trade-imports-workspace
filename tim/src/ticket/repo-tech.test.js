import { describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { bestPracticesBundle, detectTechPerRepo } from './repo-tech.js'

const workspaceHolding = (files) => {
  const workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-ticket-tech-'))
  Object.entries({
    'repos.json':
      '{ "reposDir": "repos", "githubOrg": "DEFRA", "repos": [] }\n',
    ...files
  }).forEach(([path, content]) => {
    mkdirSync(dirname(join(workspaceRoot, path)), { recursive: true })
    writeFileSync(join(workspaceRoot, path), content)
  })
  return workspaceRoot
}

describe('#detectTechPerRepo', () => {
  test('Should skip a repo not on disk and detect nothing where the review routing is missing', async () => {
    const workspaceRoot = workspaceHolding({ 'repos/stub/pom.xml': '<p/>\n' })
    const lines = []

    const entries = await detectTechPerRepo({
      workspaceRoot,
      repos: ['gone', 'stub'],
      log: async (line) => lines.push(line)
    })

    expect({ entries, lines }).toEqual({
      entries: [
        { repo: 'stub', tech: { technologies: [], best_practices: [] } }
      ],
      lines: [
        `  ! gone: repo not found at ${join(workspaceRoot, 'repos', 'gone')} — skipping`,
        '  ✓ stub []'
      ]
    })
  })
})

describe('#bestPracticesBundle', () => {
  test('Should hold each file in full under its heading and mark a missing one', () => {
    const workspaceRoot = workspaceHolding({
      'docs/best-practices/a.md': '# A\n',
      'docs/best-practices/b.md': '# B, no newline'
    })

    const bundle = bestPracticesBundle({
      workspaceRoot,
      repo: 'stub',
      bestPractices: [
        'docs/best-practices/a.md',
        'docs/best-practices/b.md',
        'docs/best-practices/gone.md'
      ]
    })

    expect(bundle).toBe(
      [
        '# Best practices applicable to stub',
        '',
        'Concatenated from `docs/best-practices/` at prepare-plan time.',
        'Apply these standards when planning changes in this repo.',
        '',
        '',
        '---',
        '',
        '## Source: `docs/best-practices/a.md`',
        '',
        '# A',
        '',
        '---',
        '',
        '## Source: `docs/best-practices/b.md`',
        '',
        '# B, no newline',
        '---',
        '',
        '## Source: `docs/best-practices/gone.md` (missing — check tim review detect-tech)',
        ''
      ].join('\n')
    )
  })
})
