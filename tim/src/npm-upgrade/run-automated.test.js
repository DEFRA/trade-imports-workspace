import { describe, expect, test } from 'vitest'
import {
  cases,
  expectedRunOf,
  replayUpgradeCase
} from './__fixtures__/npm-upgrade-workspace.js'

const GATE_CASE = 'the tests repo runs its end-of-batch E2E gate'
const RULE = '==========================================='
const GATE_SECTION = `${RULE}\nEnd-of-batch E2E gate (npm run test:docker-compose)\n${RULE}\n\n`

const unattendedGateCase = () => {
  const gateCase = cases['run-auto'].find(({ name }) => name === GATE_CASE)
  return { ...gateCase, args: [...gateCase.args, '--unattended'] }
}

describe('#runAutomatedUpgrades', () => {
  test.each(
    cases['run-auto'].map((fixtureCase) => [fixtureCase.name, fixtureCase])
  )(
    'Should do what run-automated-upgrades.sh did: %s',
    async (name, fixtureCase) => {
      const timRun = await replayUpgradeCase('run-auto', fixtureCase)

      expect(timRun).toEqual(expectedRunOf('run-auto', name))
    },
    60_000
  )

  test('Should skip the tests repo E2E gate in an unattended run, saying so on stderr', async () => {
    const interactive = expectedRunOf('run-auto', GATE_CASE)

    const timRun = await replayUpgradeCase('run-auto', unattendedGateCase())

    expect({
      exitCode: timRun.exitCode,
      stdout: timRun.stdout,
      stderr: timRun.stderr
    }).toEqual({
      exitCode: 0,
      stdout: interactive.stdout.replace(GATE_SECTION, ''),
      stderr:
        'Skipped npm run test:docker-compose: an unattended run never starts the Docker stack, so CI\'s "E2E Tests" check is the end-to-end proof.\n'
    })
  }, 60_000)
})
