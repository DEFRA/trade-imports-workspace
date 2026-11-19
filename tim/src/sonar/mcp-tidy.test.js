import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { recordTimRun } from '../test-support/bash-golden-harness.js'
import {
  callLogFolder,
  goldenPath,
  mcpTidyCases,
  stageMcpTidyWorkspace
} from './__fixtures__/mcp-tidy.js'

const bashRecordings = JSON.parse(
  readFileSync(new URL(goldenPath, import.meta.url), 'utf8')
)

const recordTimTidy = async (caseName) => {
  const staged = stageMcpTidyWorkspace(caseName)
  try {
    const recording = await recordTimRun(staged, ['sonar', 'mcp-tidy'], {
      watch: callLogFolder,
      env: staged.env
    })
    return { case: caseName, ...recording }
  } finally {
    staged.remove()
  }
}

describe('tim sonar mcp-tidy', () => {
  test.each(Object.keys(mcpTidyCases))(
    'Should give the stdout, exit code and docker and pgrep calls the Bash tidy gave when it %s',
    async (caseName) => {
      const recording = await recordTimTidy(caseName)

      expect(recording).toEqual(
        bashRecordings.find((bash) => bash.case === caseName)
      )
    },
    30_000
  )
})
