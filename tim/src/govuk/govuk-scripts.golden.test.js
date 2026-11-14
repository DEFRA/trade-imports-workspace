import { expect, test } from 'vitest'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  BASH_SCRIPT_FOR,
  plansCases,
  plansRefusals,
  renderCases,
  renderRefusals,
  stageGovukWorkspace,
  summariesCases,
  summariesRefusals
} from './__fixtures__/govuk-workspace.js'

const scripts = Object.values(BASH_SCRIPT_FOR)
const scriptsExist = scripts.every(workspaceScriptExists)

const recordEach = async (command, cases) => {
  const staged = stageGovukWorkspace({ scripts })
  try {
    const runs = []
    for (const { name, args } of cases) {
      runs.push({
        case: name,
        input: args,
        ...(await recordBashRun(staged, BASH_SCRIPT_FOR[command], args, {
          exactOutput: true
        }))
      })
    }
    return runs
  } finally {
    staged.remove()
  }
}

test.skipIf(!scriptsExist)(
  'tools/govuk lists plans, summaries and renders a plan on every fixture case',
  async () => {
    const golden = {
      plans: await recordEach('plans', [...plansCases, ...plansRefusals]),
      status: await recordEach('status', [...plansCases, ...plansRefusals]),
      summaries: await recordEach('summaries', [
        ...summariesCases,
        ...summariesRefusals
      ]),
      render: await recordEach('render', [...renderCases, ...renderRefusals])
    }

    await expect(goldenText(golden)).toMatchFileSnapshot(
      '__fixtures__/__golden__/govuk-scripts.json'
    )
  },
  120_000
)
