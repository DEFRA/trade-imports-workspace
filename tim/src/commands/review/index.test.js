import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ERROR, OK } from '../../constants/exitCodes.js'
import {
  createCliWorkspace,
  envelopeOf,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'

const realWorkspaceRoot = fileURLToPath(
  new URL('../../../../', import.meta.url)
)
const reviewRoutingFolder = join('.claude', 'skills', 'review', 'assets')

let workspaceRoot

const writeK6Repo = () => {
  const repoPath = join(workspaceRoot, 'repos', 'load-tests')
  mkdirSync(repoPath, { recursive: true })
  writeFileSync(
    join(repoPath, 'package.json'),
    '{"name":"x","dependencies":{"k6":"^0.1.0"}}\n'
  )
  return repoPath
}

const copyReviewRouting = () =>
  cpSync(
    join(realWorkspaceRoot, reviewRoutingFolder),
    join(workspaceRoot, reviewRoutingFolder),
    { recursive: true }
  )

beforeEach(() => {
  workspaceRoot = createCliWorkspace('tim-review-detect-tech-')
})

afterEach(() => rmSync(workspaceRoot, { recursive: true, force: true }))

describe('tim review detect-tech', () => {
  test('Should print the detected technologies and best practices as one object in --no-ui mode', async () => {
    copyReviewRouting()
    const repoPath = writeK6Repo()

    const run = await runTimInWorkspace(workspaceRoot, [
      'review',
      'detect-tech',
      repoPath,
      '--no-ui'
    ])

    expect({ exitCode: run.exitCode, stdout: run.stdout }).toEqual({
      exitCode: OK,
      stdout:
        '{"technologies":[\n  "k6"\n],"best_practices":[\n  "docs/best-practices/k6/BEST_PRACTICES.md"\n]}'
    })
  })

  test('Should wrap the same object in the envelope with --json', async () => {
    copyReviewRouting()
    const repoPath = writeK6Repo()

    const run = await runTimInWorkspace(workspaceRoot, [
      'review',
      'detect-tech',
      repoPath,
      '--json'
    ])

    expect(envelopeOf(run)).toMatchObject({
      ok: true,
      result: {
        technologies: ['k6'],
        best_practices: ['docs/best-practices/k6/BEST_PRACTICES.md']
      }
    })
  })

  test('Should exit 1 and say so on stderr when the review routing is missing', async () => {
    const repoPath = writeK6Repo()

    const run = await runTimInWorkspace(workspaceRoot, [
      'review',
      'detect-tech',
      repoPath,
      '--no-ui'
    ])

    expect({
      exitCode: run.exitCode,
      stdout: run.stdout,
      stderr: run.stderr
    }).toEqual({
      exitCode: ERROR,
      stdout: '',
      stderr: "Can't find .claude/skills/review/assets/routing.json."
    })
  })
})
