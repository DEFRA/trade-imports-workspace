import { afterEach, describe, expect, test, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { recordTimRun } from '../../test-support/bash-golden-harness.js'
import { mockJiraForEachTest } from '../../test-support/jira-mock.js'
import { runRegisteredCommand } from '../../test-support/process-output.js'
import { envelopeOf } from '../../test-support/tim-cli.js'
import {
  checkCases,
  MAP_PATH,
  mapFixture,
  recordedRun,
  stageTimWorkspace
} from './__fixtures__/ticket-creator-scripts.js'
import { register } from './index.js'

const noCredentials = {
  JIRA_USER: undefined,
  JIRA_TOKEN: undefined,
  JIRA_BASE_URL: undefined
}

const runCheckIn = async (theCase, extraArgs = []) => {
  const staged = stageTimWorkspace(theCase)
  try {
    return await recordTimRun(
      staged,
      ['capabilities', 'check', ...theCase.args, ...extraArgs],
      { env: noCredentials }
    )
  } finally {
    staged.remove()
  }
}

const recordedOutput = (caseName) => {
  const { exitCode, stdout, stderr } = recordedRun('check', caseName)
  return { exitCode, stdout, stderr }
}

describe('tim capabilities check, against what check-capabilities.sh printed', () => {
  test.each(
    checkCases
      .filter(({ syncTo }) => syncTo === undefined)
      .map(({ name }) => name)
  )(
    'Should print the same stdout and stderr and exit with the same code for %s',
    async (caseName) => {
      const theCase = checkCases.find(({ name }) => name === caseName)

      const run = await runCheckIn(theCase)

      expect(run).toEqual(recordedOutput(caseName))
    }
  )
})

describe('tim capabilities check --json', () => {
  test('Should give the counts, the broken rules and the undocumented statuses, and exit 1', async () => {
    const theCase = checkCases.find(({ name }) => name === 'edges --no-sync')

    const run = await runCheckIn(theCase, ['--json'])

    const { result } = envelopeOf(run)
    expect({
      exitCode: run.exitCode,
      version: result.version,
      total: result.total,
      canonicalCount: result.canonicalCount,
      canonical: result.canonical,
      rules: result.rules,
      undocumentedStatuses: result.undocumentedStatuses
    }).toEqual({
      exitCode: 1,
      version: '7\r',
      total: 8,
      canonicalCount: 5,
      canonical: false,
      rules: [
        { rule: 'id-not-clean', codes: ['CAP-1.8'] },
        { rule: 'status-cell-invalid', codes: ['CAP-1.4', 'CAP-1.5'] }
      ],
      undocumentedStatuses: [
        { code: 'CAP-1.2', status: ' IN PROGRESS' },
        { code: 'CAP-1.9', status: '**' }
      ]
    })
  })

  test('Should keep the refusal to read a missing map in the envelope and exit 1', async () => {
    const theCase = checkCases.find(({ name }) => name === 'no synced map')

    const run = await runCheckIn(theCase, ['--json'])

    expect({ exitCode: run.exitCode, envelope: envelopeOf(run) }).toEqual({
      exitCode: 1,
      envelope: expect.objectContaining({
        ok: false,
        errors: [
          expect.objectContaining({
            code: 'NOT_FOUND',
            message:
              'No synced capability map at <HOME>/git/defra/trade-imports-workspace/docs/confluence/import-notification-capability-map.md\nRun tim confluence sync first.'
          })
        ]
      })
    })
  })
})

describe('tim capabilities check refreshing from Confluence', () => {
  const jira = mockJiraForEachTest()
  const staged = { current: null }

  afterEach(() => {
    staged.current?.remove()
    vi.restoreAllMocks()
  })

  const pageMap = mapFixture('canonical').replace(
    /^---\n/,
    '---\nconfluence-page-id: "6468764101"\n'
  )

  const servesPageAtVersion = (version) =>
    jira()
      .get(
        '/wiki/rest/api/content/6468764101?expand=body.export_view,version,space'
      )
      .reply(200, {
        id: '6468764101',
        title: 'Import Notification Capability Map',
        version: { number: version, when: '2026-11-14T09:00:00.000Z' },
        space: { key: 'EUDP' },
        body: {
          export_view: {
            value:
              '<table><tbody><tr><th>Code</th><th>Status</th><th>Capability</th></tr><tr><td>CAP-01.1</td><td>STATUS: COMPLETE</td><td><strong>Consignor and consignee</strong></td></tr></tbody></table>'
          }
        }
      })

  const headerOf = (stdout, lineCount) => stdout.split('\n').slice(0, lineCount)

  const runCheck = async (...args) => {
    staged.current = stageTimWorkspace({ map: 'canonical', mapText: pageMap })
    process.env.TIM_WORKSPACE = staged.current.root
    const run = await runRegisteredCommand(
      register,
      'capabilities',
      'check',
      ...args
    )
    return {
      ...run,
      stdout: run.stdout.split(staged.current.home).join('<HOME>')
    }
  }

  test('Should say which version it refreshed from, then report on the page as Confluence now holds it', async () => {
    servesPageAtVersion(43)

    const run = await runCheck()

    expect(run).toEqual({
      stdout: [
        'Capability map',
        '  version : 43',
        '            (refreshed from 42)',
        '',
        'CODE               STATUS         NAME                                       VERDICT',
        '------------------ -------------- ------------------------------------------ -------',
        'CAP-01.1           COMPLETE       Consignor and consignee                    ok',
        '',
        '1 of 1 rows canonical',
        'Map is consistent — the strict parser will run clean.',
        ''
      ].join('\n'),
      stderr: '',
      exitCode: 0
    })
  })

  test('Should print the header the Bash script printed when the refresh leaves the version as it was', async () => {
    servesPageAtVersion(42)

    const run = await runCheck('--quiet')

    expect(headerOf(run.stdout, 3)).toEqual(
      headerOf(
        recordedRun('check', 'canonical, sync keeps the version').stdout,
        3
      )
    )
  })

  test('Should print the header the Bash script printed when the refresh moves the version on', async () => {
    servesPageAtVersion(43)

    const run = await runCheck('--quiet')

    expect(headerOf(run.stdout, 4)).toEqual(
      headerOf(recordedRun('check', 'canonical, sync refreshes').stdout, 4)
    )
  })

  test('Should write the refreshed page over the synced copy', async () => {
    servesPageAtVersion(43)

    await runCheck('--quiet')

    const mapText = readFileSync(join(staged.current.root, MAP_PATH), 'utf8')
    expect(mapText.split('\n').slice(0, 4)).toEqual([
      '---',
      'confluence-page-id: "6468764101"',
      'title: "Import Notification Capability Map"',
      'version: 43'
    ])
  })
})
