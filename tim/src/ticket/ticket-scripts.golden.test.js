import { afterAll, beforeAll, expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  atlassianEnv,
  startAtlassianFixtureServer
} from '../commands/refine/__fixtures__/atlassian-server.js'
import { normaliseRecording } from '../commands/refine/__fixtures__/normalise.js'
import {
  BRANCH_SCRIPT,
  branchCases,
  fixtureEnv,
  IMPLEMENT_SCRIPTS,
  implementCases,
  implementRefusalCases,
  PLAN_SCRIPTS,
  planCases,
  planRefusalCases,
  repoState,
  stageBranchWorkspace,
  stageImplementWorkspace,
  stagePlanWorkspace
} from './__fixtures__/ticket-workspace.js'

let atlassian

beforeAll(async () => {
  atlassian = await startAtlassianFixtureServer()
})

afterAll(() => atlassian.close())

const planningFolder = (ticket) =>
  ticket === undefined ? undefined : `workareas/ticket-planning/${ticket}`

const recordEach = async (cases, stage, record) => {
  const recordings = []
  for (const scriptCase of cases) {
    const staged = stage(scriptCase)
    try {
      recordings.push({
        case: scriptCase.name,
        input: scriptCase.args,
        ...(await record(staged, scriptCase))
      })
    } finally {
      staged.remove()
    }
  }
  return recordings
}

test.skipIf(!workspaceScriptExists(BRANCH_SCRIPT))(
  'setup-branch.sh puts the repo on the branch for every fixture case',
  async () => {
    const recordings = await recordEach(
      branchCases,
      (branchCase) =>
        stageBranchWorkspace(branchCase, { scripts: [BRANCH_SCRIPT] }),
      async (staged, { args }) => ({
        ...(await recordBashRun(staged, BRANCH_SCRIPT, args, {
          env: fixtureEnv(staged),
          exactOutput: true
        })),
        repo: repoState(staged)
      })
    )

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/setup-branch.json'
    )
  },
  60_000
)

test.skipIf(!PLAN_SCRIPTS.every(workspaceScriptExists))(
  'prepare-plan.sh writes ticket.md, the meta and the bundles for every fixture case',
  async () => {
    const recordings = await recordEach(
      [...planCases, ...planRefusalCases],
      () => stagePlanWorkspace({ scripts: PLAN_SCRIPTS }),
      async (staged, { args, ticket }) =>
        normaliseRecording(
          await recordBashRun(staged, PLAN_SCRIPTS[0], args, {
            env: { ...fixtureEnv(staged), ...atlassianEnv(atlassian.base) },
            watch: planningFolder(ticket),
            exactOutput: true
          }),
          { base: atlassian.base }
        )
    )

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/prepare-plan.json'
    )
  },
  120_000
)

test.skipIf(!IMPLEMENT_SCRIPTS.every(workspaceScriptExists))(
  'prepare-implement.sh writes the implement meta for every fixture case',
  async () => {
    const recordings = await recordEach(
      [...implementCases, ...implementRefusalCases],
      () => stageImplementWorkspace({ scripts: IMPLEMENT_SCRIPTS }),
      (staged, { args, ticket }) =>
        recordBashRun(staged, IMPLEMENT_SCRIPTS[0], args, {
          env: fixtureEnv(staged),
          watch: planningFolder(ticket),
          exactOutput: true
        })
    )

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/prepare-implement.json'
    )
  },
  120_000
)
