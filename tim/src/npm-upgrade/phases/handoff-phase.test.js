import { join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import {
  FRONTEND,
  RUN_ID,
  stageStartUpgradeWorkspace
} from '../__fixtures__/npm-start-upgrade-workspace.js'
import { handoffPhase } from './handoff-phase.js'

const staging = []

afterEach(() => {
  staging.splice(0).forEach((staged) => staged.remove())
})

const ignoreLine = async () => undefined

describe('#handoffPhase', () => {
  test('Should split an allowlist entry note into its reason, what blocks the fix and its owner', async () => {
    const staged = stageStartUpgradeWorkspace(
      {
        repos: {
          [FRONTEND]: {
            allowlist: [
              {
                'GHSA-c475-qrg2-pj4r': {
                  active: true,
                  notes:
                    'No fix yet. Fix blocked upstream: puppeteer pins it. Owner: Sam Farrington',
                  expiry: '2026-12-31'
                }
              }
            ]
          }
        }
      },
      'http://127.0.0.1:9'
    )
    staging.push(staged)

    const { result } = await handoffPhase({
      workspaceRoot: staged.root,
      runId: RUN_ID,
      repos: [FRONTEND],
      warn: ignoreLine
    })

    expect(result.allowlist).toEqual([
      {
        repo: FRONTEND,
        ghsa: 'GHSA-c475-qrg2-pj4r',
        package: null,
        kind: null,
        reason: 'No fix yet',
        blocked_by: 'puppeteer pins it',
        owner: 'Sam Farrington',
        expiry: '2026-12-31'
      }
    ])
  })

  test('Should point the WALKER at the workspace it runs in', async () => {
    const staged = stageStartUpgradeWorkspace({}, 'http://127.0.0.1:9')
    staging.push(staged)
    const lines = []

    await handoffPhase({
      workspaceRoot: staged.root,
      runId: RUN_ID,
      repos: [FRONTEND],
      warn: async (line) => lines.push(line)
    })

    expect(lines.at(-1)).toBe(
      `  Follow ${join(staged.root, '.claude/skills/npm-upgrade/references/WALKER.md')} (run-id ${RUN_ID})`
    )
  })

  test('Should point an unattended run at the skill unattended mode, not the WALKER', async () => {
    const staged = stageStartUpgradeWorkspace({}, 'http://127.0.0.1:9')
    staging.push(staged)
    const lines = []

    await handoffPhase({
      workspaceRoot: staged.root,
      runId: RUN_ID,
      repos: [FRONTEND],
      unattended: true,
      warn: async (line) => lines.push(line)
    })

    expect(lines.at(-1)).toBe(
      `Phase 3 manifest emitted. These packages are the unattended job's own work, not a walker's: follow "Unattended mode" in ${join(staged.root, '.claude/skills/npm-upgrade/SKILL.md')} (run-id ${RUN_ID}).`
    )
  })
})
