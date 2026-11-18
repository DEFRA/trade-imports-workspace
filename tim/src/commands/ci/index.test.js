import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { execa } from 'execa'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { ERROR, OK } from '../../constants/exitCodes.js'
import {
  createCliWorkspace,
  envelopeOf,
  TIM_CLI_PATH
} from '../../test-support/tim-cli.js'
import {
  allCases,
  intendedDifferences,
  SCOPE_CONFIG_PATH,
  scopeConfigs
} from './__fixtures__/e2e-scope-cases.js'

const golden = JSON.parse(
  readFileSync(
    new URL('./__fixtures__/__golden__/scripts-ci.json', import.meta.url),
    'utf8'
  )
)

const workspaceByConfig = {}

beforeAll(() => {
  for (const [name, config] of Object.entries(scopeConfigs)) {
    const root = createCliWorkspace(`tim-ci-${name}-`)
    if (config !== null) {
      const scopeFile = join(root, SCOPE_CONFIG_PATH)
      mkdirSync(dirname(scopeFile), { recursive: true })
      writeFileSync(scopeFile, `${JSON.stringify(config, null, 2)}\n`)
    }
    workspaceByConfig[name] = root
  }
})

afterAll(() => {
  for (const root of Object.values(workspaceByConfig)) {
    rmSync(root, { recursive: true, force: true })
  }
})

const runCi = (ciCase, flags = []) =>
  execa(
    'node',
    [
      TIM_CLI_PATH,
      'ci',
      ciCase.command,
      '--workspace',
      workspaceByConfig[ciCase.config],
      ...flags
    ],
    {
      reject: false,
      stripFinalNewline: false,
      env: { ...ciCase.env, TIM_NO_AUTO_PULL: '1' }
    }
  )

const caseNamed = (name) => allCases.find((ciCase) => ciCase.name === name)

const expectedFor = (ciCase) => {
  const recorded = golden.find((recording) => recording.case === ciCase.name)
  const { stderrStartsWith, ...difference } =
    intendedDifferences[ciCase.name] ?? {}
  return { recorded: { ...recorded, ...difference }, stderrStartsWith }
}

const outcomeOf = ({ exitCode, stdout, stderr }) => ({
  exitCode,
  stdout,
  stderr
})

describe('tim ci matches scripts/ci', () => {
  test.each(allCases.map((ciCase) => [ciCase.name, ciCase]))(
    'Should give the recorded exit code, stdout and stderr for %s',
    async (_name, ciCase) => {
      const { recorded, stderrStartsWith } = expectedFor(ciCase)

      const outcome = outcomeOf(await runCi(ciCase))

      if (stderrStartsWith === undefined) {
        expect(outcome).toEqual({
          exitCode: recorded.exitCode,
          stdout: recorded.stdout,
          stderr: recorded.stderr
        })
        return
      }
      expect(outcome.stderr.startsWith(stderrStartsWith)).toBe(true)
      expect({ exitCode: outcome.exitCode, stdout: outcome.stdout }).toEqual({
        exitCode: recorded.exitCode,
        stdout: recorded.stdout
      })
    }
  )

  test('Should have a recording for every case', () => {
    expect(golden.map((recording) => recording.case)).toEqual(
      allCases.map((ciCase) => ciCase.name)
    )
  })
})

describe('tim ci --json', () => {
  test('Should give the resolved scope and where it came from', async () => {
    const run = await runCi(
      caseNamed('edgeEntries: DEFRA/trade-imports-animals-backend'),
      ['--json']
    )

    expect({ exitCode: run.exitCode, result: envelopeOf(run).result }).toEqual({
      exitCode: OK,
      result: {
        where:
          'the trade-imports-animals-backend entry in config/e2e-tests-pr-scope.json',
        suites: 'tests/animals/ tests/animals-admin/',
        tags: '@animals-backend'
      }
    })
  })

  test('Should give the suite paths as a list', async () => {
    const run = await runCi(caseNamed('suites: two domains'), ['--json'])

    expect({ exitCode: run.exitCode, result: envelopeOf(run).result }).toEqual({
      exitCode: OK,
      result: { suites: ['tests/animals/', 'tests/animals-admin/'] }
    })
  })

  test('Should give the tags and their grep pattern', async () => {
    const run = await runCi(caseNamed('tags: repeats and commas'), ['--json'])

    expect({ exitCode: run.exitCode, result: envelopeOf(run).result }).toEqual({
      exitCode: OK,
      result: { tags: ['@a', '@b', '@c'], pattern: '@a|@b|@c' }
    })
  })

  test('Should give a refused tag as a PARSE error with nothing on stderr', async () => {
    const run = await runCi(caseNamed('tags: an alternation'), ['--json'])

    expect({
      exitCode: run.exitCode,
      stderr: run.stderr,
      errors: envelopeOf(run).errors
    }).toEqual({
      exitCode: ERROR,
      stderr: '',
      errors: [
        {
          code: 'PARSE',
          message:
            "Invalid tag '@a|@b'. Use @ followed by letters, digits, '_' or '-' (for example @ins-backend)."
        }
      ]
    })
  })
})
