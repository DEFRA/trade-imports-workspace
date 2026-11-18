import { expect, test } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  goldenText,
  recordBashRun,
  workspaceScriptExists
} from '../test-support/bash-golden-harness.js'
import {
  analysisRefusals,
  analysisSteps,
  BASH_SCRIPT_FOR,
  countsCases,
  finalizeCases,
  stageCheckWorkspace,
  verifyCases,
  watchedFolder
} from './__fixtures__/check-workspace.js'

const scripts = Object.values(BASH_SCRIPT_FOR)
const scriptsExist = scripts.every(workspaceScriptExists)

const ticketOf = (args) => args.find((arg) => arg.startsWith('EUDPA-'))

const record = (staged, command, args) => {
  const ticket = ticketOf(args)
  return recordBashRun(staged, BASH_SCRIPT_FOR[command], args, {
    exactOutput: true,
    ...(ticket && { watch: watchedFolder(ticket) })
  })
}

const SHIPPED_SECTIONS_FILTER =
  '[keyDesignDecisions, edgeCases, failureModes, securityRisks, dataOrApiChanges, testCoverageNotes, aiSuspectedRegions]'
const CORRECTED_SECTIONS_FILTER =
  '[.keyDesignDecisions, .edgeCases, .failureModes, .securityRisks, .dataOrApiChanges, .testCoverageNotes, .aiSuspectedRegions]'

const correctVerifySectionsFilter = (staged) => {
  const path = join(staged.root, BASH_SCRIPT_FOR.verify)
  const shipped = readFileSync(path, 'utf8')
  if (!shipped.includes(SHIPPED_SECTIONS_FILTER)) {
    throw new Error(
      `${BASH_SCRIPT_FOR.verify} no longer holds the filter to correct`
    )
  }
  writeFileSync(
    path,
    shipped.replace(SHIPPED_SECTIONS_FILTER, CORRECTED_SECTIONS_FILTER)
  )
}

const recordEachFresh = async (command, cases, { prepare = () => {} } = {}) => {
  const runs = []
  for (const { name, args } of cases) {
    const staged = stageCheckWorkspace({ scripts })
    try {
      prepare(staged)
      runs.push({
        case: name,
        input: args,
        ...(await record(staged, command, args))
      })
    } finally {
      staged.remove()
    }
  }
  return runs
}

const recordInOrder = async (steps) => {
  const staged = stageCheckWorkspace({ scripts })
  try {
    const runs = []
    for (const { name, command, args } of steps) {
      runs.push({
        case: name,
        command,
        input: args,
        ...(await record(staged, command, args))
      })
    }
    return runs
  } finally {
    staged.remove()
  }
}

test.skipIf(!scriptsExist)(
  'tools/understanding-check counts, finalises, verifies and writes analysis findings on every fixture case',
  async () => {
    const golden = {
      counts: await recordEachFresh('counts', countsCases),
      finalize: await recordEachFresh('finalize', finalizeCases),
      verifyAsShipped: await recordEachFresh('verify', verifyCases),
      verify: await recordEachFresh('verify', verifyCases, {
        prepare: correctVerifySectionsFilter
      }),
      analysis: await recordInOrder(analysisSteps),
      analysisRefusals: await recordInOrder(analysisRefusals)
    }

    await expect(goldenText(golden)).toMatchFileSnapshot(
      '__fixtures__/__golden__/understanding-check-scripts.json'
    )
  },
  120_000
)
