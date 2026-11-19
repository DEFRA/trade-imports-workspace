import { describe, expect, test } from 'vitest'
import { rmSync } from 'node:fs'
import { join } from 'node:path'
import { stagePrepareWorkspace } from './__fixtures__/prepare-workspace.js'
import {
  bestPracticesBundle,
  loadRoutingForBundles
} from './best-practices-bundle.js'

const HEADING = (repo) =>
  `# Best practices applicable to ${repo}\n\nConcatenated at prepare-check time. Read these before analysing the diff.\n\n`

const withStaged = (assertions) => {
  const staged = stagePrepareWorkspace()
  try {
    return assertions(staged.root)
  } finally {
    staged.remove()
  }
}

describe('#bestPracticesBundle', () => {
  test('Should join each guide the repo routes to, under its source heading', () => {
    withStaged((workspaceRoot) => {
      const routing = loadRoutingForBundles(workspaceRoot, () => {})

      const bundle = bestPracticesBundle({
        workspaceRoot,
        routing,
        repo: 'trade-imports-beta'
      })

      expect(bundle).toBe(
        `${HEADING('trade-imports-beta')}\n---\n\n## Source: \`docs/best-practices/fixture/java.md\`\n\n# Java\n\nUse records.\n\n`
      )
    })
  })

  test('Should give the heading alone for a repo not cloned under repos/', () => {
    withStaged((workspaceRoot) => {
      const routing = loadRoutingForBundles(workspaceRoot, () => {})

      expect(
        bestPracticesBundle({
          workspaceRoot,
          routing,
          repo: 'trade-imports-delta'
        })
      ).toBe(HEADING('trade-imports-delta'))
    })
  })
})

describe('#loadRoutingForBundles', () => {
  test('Should warn and give no routing when the routing data is missing', () => {
    withStaged((workspaceRoot) => {
      rmSync(join(workspaceRoot, '.claude'), { recursive: true })
      const warnings = []

      const routing = loadRoutingForBundles(workspaceRoot, (line) =>
        warnings.push(line)
      )

      expect({ routing, warnings }).toEqual({
        routing: null,
        warnings: [
          "Can't read the review routing data, so each best-practices bundle holds its heading only: Can't find .claude/skills/review/assets/routing.json."
        ]
      })
    })
  })
})
