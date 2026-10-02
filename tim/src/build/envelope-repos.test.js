import { describe, test, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { readEnvelopeRepos } from './envelope-repos.js'

const withBacklog = (backlog, assertions) => {
  const root = mkdtempSync(join(tmpdir(), 'tim-envelope-'))
  const dir = join(root, 'workareas', 'shared', 'programme')
  mkdirSync(dir, { recursive: true })
  if (backlog !== undefined) {
    writeFileSync(join(dir, 'backlog.json'), JSON.stringify(backlog))
  }
  try {
    assertions(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const errorFrom = (action) => {
  try {
    action()
    return null
  } catch (error) {
    return { code: error.code, message: error.message }
  }
}

describe('readEnvelopeRepos', () => {
  test('lists the backlog repos in order, with folder names and full paths', () => {
    withBacklog(
      {
        repos: {
          frontend: { path: 'repos/trade-imports-plants-frontend' },
          tests: { path: 'repos/trade-imports-ins-tests' }
        }
      },
      (root) => {
        expect(readEnvelopeRepos(root, 'shared/programme')).toEqual([
          {
            key: 'frontend',
            folder: 'trade-imports-plants-frontend',
            path: join(root, 'repos', 'trade-imports-plants-frontend'),
            workspace: false,
            requireApproval: false
          },
          {
            key: 'tests',
            folder: 'trade-imports-ins-tests',
            path: join(root, 'repos', 'trade-imports-ins-tests'),
            workspace: false,
            requireApproval: false
          }
        ])
      }
    )
  })

  test('reads "." as the workspace repo itself, by its canonical folder name, wherever it is cloned', () => {
    withBacklog(
      {
        repos: {
          workspace: {
            path: '.',
            github: 'DEFRA/trade-imports-workspace',
            requireApproval: true
          }
        }
      },
      (root) => {
        expect(readEnvelopeRepos(root, 'shared/programme')).toEqual([
          {
            key: 'workspace',
            folder: 'trade-imports-workspace',
            path: root,
            workspace: true,
            requireApproval: true
          }
        ])
      }
    )
  })

  test('refuses a requireApproval that is not true or false', () => {
    withBacklog(
      { repos: { workspace: { path: '.', requireApproval: 'yes' } } },
      (root) => {
        expect(
          errorFrom(() => readEnvelopeRepos(root, 'shared/programme'))
        ).toEqual({
          code: 'USAGE',
          message: expect.stringContaining('workspace.requireApproval')
        })
      }
    )
  })

  test('refuses a backlog with no repos map', () => {
    withBacklog({ increments: [] }, (root) => {
      expect(
        errorFrom(() => readEnvelopeRepos(root, 'shared/programme'))
      ).toEqual({
        code: 'USAGE',
        message: expect.stringContaining(
          "needs a repos map naming each repo's path (it has none)"
        )
      })
    })
  })

  test('refuses a repo path that climbs out of the workspace', () => {
    withBacklog({ repos: { frontend: { path: '../elsewhere' } } }, (root) => {
      expect(
        errorFrom(() => readEnvelopeRepos(root, 'shared/programme')).message
      ).toContain('must be a folder inside the workspace')
    })
  })

  test("names the backlog it can't find", () => {
    withBacklog(undefined, (root) => {
      expect(
        errorFrom(() => readEnvelopeRepos(root, 'shared/programme')).code
      ).toBe('NOT_FOUND')
    })
  })
})
