import { afterAll, beforeAll, expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  stageBashWorkspace,
  workspaceScriptExists
} from '../../test-support/bash-golden-harness.js'
import {
  atlassianEnv,
  startAtlassianFixtureServer
} from './__fixtures__/atlassian-server.js'
import {
  finalizeCases,
  prepareCases,
  refinementWorkareaFiles
} from './__fixtures__/refinement-workarea.js'
import { normaliseRecording } from './__fixtures__/normalise.js'

const PREPARE_SCRIPT = 'tools/refine/prepare-refinement.sh'
const FINALIZE_SCRIPT = 'tools/refine/refine-finalize.sh'
const SCRIPTS_PREPARE_CALLS = [
  'tools/jira/ticket.sh',
  'tools/jira/comments.sh',
  'tools/confluence/page.sh'
]

let staged
let atlassian

beforeAll(async () => {
  atlassian = await startAtlassianFixtureServer()
  staged = stageBashWorkspace({
    scripts: [PREPARE_SCRIPT, FINALIZE_SCRIPT, ...SCRIPTS_PREPARE_CALLS].filter(
      workspaceScriptExists
    ),
    files: refinementWorkareaFiles()
  })
})

afterAll(async () => {
  staged.remove()
  await atlassian.close()
})

const refinementFolder = (ticket) => `workareas/ticket-refinement/${ticket}`

test.skipIf(!workspaceScriptExists(PREPARE_SCRIPT))(
  'prepare-refinement.sh writes ticket.md, the meta and the review stub, keeps a review in progress and refuses a missing ticket',
  async () => {
    const recordings = []
    for (const { name, ticket } of prepareCases) {
      const recording = await recordBashRun(staged, PREPARE_SCRIPT, [ticket], {
        watch: refinementFolder(ticket),
        env: atlassianEnv(atlassian.base)
      })
      recordings.push({
        case: name,
        input: [ticket],
        ...normaliseRecording(recording, { base: atlassian.base })
      })
    }

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/prepare-refinement.json'
    )
  },
  30_000
)

test.skipIf(!workspaceScriptExists(FINALIZE_SCRIPT))(
  'refine-finalize.sh stamps each verdict, keeps the other keys and refuses a bad verdict or a missing meta',
  async () => {
    const recordings = []
    for (const { name, ticket, args } of finalizeCases) {
      const input = [ticket, ...args]
      const recording = await recordBashRun(staged, FINALIZE_SCRIPT, input, {
        watch: refinementFolder(ticket)
      })
      recordings.push({ case: name, input, ...recording })
    }

    await expect(goldenText(recordings)).toMatchFileSnapshot(
      '__fixtures__/__golden__/refine-finalize.json'
    )
  }
)
