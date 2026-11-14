import { execa } from 'execa'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  fakeToolsEnv,
  installFakeStackTools,
  stagedInitFiles,
  stageStackWorkspace,
  traceOf,
  withWorkspacePlaceholder
} from '../test-support/fake-docker.js'
import {
  goldenText,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'

const goldenFolder = fileURLToPath(
  new URL('../test-support/fixtures/stack/', import.meta.url)
)

const BRANCH_MANIFESTS = {
  'defradigital/trade-imports-animals-frontend:feat-eudpa-1-x': 'frontend-one',
  'defradigital/trade-imports-animals-backend:feat-eudpa-1-x': 'backend-one',
  'defradigital/trade-imports-animals-admin:feat-eudpa-1-x': [
    'admin-one',
    'admin-two'
  ],
  'defradigital/trade-imports-ins-frontend:feat-eudpa-1-x': [null, 'ins-one']
}

const SCENARIOS = {
  'run-stack.sh': [
    { name: 'no flags', args: [] },
    { name: 'dev', args: ['-d'] },
    {
      name: 'dev with DEV_BUILD_PLATFORM set',
      args: ['-d'],
      env: { DEV_BUILD_PLATFORM: 'linux/amd64' }
    },
    {
      name: 'dev on a daemon that cannot answer',
      args: ['-d'],
      fake: { serverArch: null },
      machineDependent: true
    },
    { name: 'perf', args: ['--perf'] },
    { name: 'dev and perf', args: ['-d', '--perf'] },
    {
      name: 'branch, with tags that land, move and belong to a merged branch',
      args: ['-b', 'feat/EUDPA-1-X'],
      env: { TRADE_IMPORTS_STUB: 'left-in-the-shell' },
      fake: {
        manifests: BRANCH_MANIFESTS,
        branchesAbsent: ['trade-imports-animals-backend']
      }
    },
    { name: 'exclude frontend', args: ['-e', 'frontend'] },
    { name: 'security profile only', args: ['--profile', 'security'] },
    { name: 'extra compose up args', args: ['--', '--timeout', '5'] },
    {
      name: 'mongo fails twice before it starts',
      args: [],
      env: { MONGO_RETRY_BACKOFF_SECONDS: '0' },
      fake: {
        composeFailures: [
          { command: 'up --wait --detach --pull always mongodb', times: 2 }
        ]
      }
    },
    { name: 'branch with dev', args: ['-b', 'feat/x', '-d'] },
    { name: 'unknown exclude label', args: ['--exclude', 'nope'] },
    { name: 'unknown profile', args: ['--profile', 'nope'] },
    {
      name: 'perf with an unknown STUB_PROFILE',
      args: ['--perf'],
      env: { STUB_PROFILE: 'slow' }
    }
  ],
  'stop-stack.sh': [
    { name: 'no args', args: [] },
    { name: 'compose down args', args: ['--timeout', '1'] }
  ],
  'bounce-backend.sh': [
    { name: 'no args', args: [] },
    { name: 'an argument it does not take', args: ['--bogus'] }
  ],
  'dev-service.sh': [
    {
      name: 'rebuild two services',
      args: ['rebuild', 'trade-imports-stub', 'trade-imports-reference-data']
    },
    {
      name: 'restart two services',
      args: ['restart', 'trade-imports-stub', 'trade-imports-reference-data']
    },
    { name: 'an action with no services', args: ['restart'] },
    { name: 'an unknown action', args: ['bogus', 'trade-imports-stub'] }
  ],
  'restart-stack.sh': [{ name: 'dev', args: ['-d'] }]
}

const recordScenario = async (script, scenario) => {
  const workspace = stageStackWorkspace()
  const fake = installFakeStackTools(scenario.fake)
  try {
    const result = await execa(
      '/bin/bash',
      [join(workspace.root, 'scripts', 'stack', script), ...scenario.args],
      {
        env: fakeToolsEnv(fake.binDir, scenario.env),
        extendEnv: false,
        reject: false,
        stripFinalNewline: false
      }
    )
    return {
      name: scenario.name,
      args: scenario.args,
      env: scenario.env ?? {},
      fake: scenario.fake ?? {},
      exitCode: result.exitCode,
      stdout: withWorkspacePlaceholder(result.stdout, workspace.root),
      stderr: withWorkspacePlaceholder(result.stderr, workspace.root),
      ...traceOf(fake.calls(), workspace.root),
      stagedInitFiles: stagedInitFiles(workspace.root)
    }
  } finally {
    fake.remove()
    workspace.remove()
  }
}

const withMachineArchHidden = (recording) =>
  JSON.parse(
    JSON.stringify(recording).replace(
      /"DEV_BUILD_PLATFORM":"linux\/[^"]+"/g,
      '"DEV_BUILD_PLATFORM":"linux/<MACHINE>"'
    )
  )

describe('the stack scripts give the recorded output and Docker and git calls', () => {
  for (const [script, scenarios] of Object.entries(SCENARIOS)) {
    test.skipIf(!workspaceScriptExists(`scripts/stack/${script}`))(
      script,
      async () => {
        const recordings = []
        for (const scenario of scenarios) {
          const recording = await recordScenario(script, scenario)
          recordings.push(
            scenario.machineDependent
              ? withMachineArchHidden(recording)
              : recording
          )
        }

        await expect(goldenText(recordings)).toMatchFileSnapshot(
          join(goldenFolder, script.replace(/\.sh$/, '.json'))
        )
      },
      120_000
    )
  }
})
