import { afterEach, describe, expect, test } from 'vitest'
import {
  createGitWorkspace,
  specText
} from './__fixtures__/theme-ticket-workspace.js'
import { deriveTheme, domainOfRepo } from './derive.js'

const json = (value) => `${JSON.stringify(value)}\n`

const scenario = (heading, id) => ({ heading, id })

let workspace

afterEach(() => workspace?.remove())

const deriveIn = (args) =>
  deriveTheme({ workspaceRoot: workspace.root, ...args })

describe('#deriveTheme on scenarios a later commit removed or renamed', () => {
  const SPEC =
    'openspec/specs/live-animals/journey-pages/arrival-details/spec.md'

  const stageArrival = async () => {
    workspace = await createGitWorkspace()
    workspace.write({
      'workareas/release/themes/arrival/backlog.json': json({
        increments: [
          {
            id: 'inc-1',
            title: 'Arrival page',
            status: 'done',
            repos: ['frontend']
          }
        ]
      }),
      'workareas/release/sources.json': json({
        repos: { frontend: 'repos/trade-imports-animals-frontend' }
      }),
      [SPEC]: specText('Arrival details', [
        scenario('Kept as written', 'SCN-A'),
        scenario('Renamed later', 'SCN-B'),
        scenario('Removed later', 'SCN-C')
      ])
    })
    await workspace.commit('feat(release-arrival): Arrival page')
    workspace.write({
      [SPEC]: specText('Arrival details', [
        scenario('Kept as written', 'SCN-A'),
        scenario('Now reads this way', 'SCN-B')
      ])
    })
    await workspace.commit('docs(OTHER-1): reword arrival')
    return deriveIn({ workarea: 'release', theme: 'arrival' })
  }

  test('Should leave a scenario added then removed out of the theme and domain totals', async () => {
    const derived = await stageArrival()

    expect([
      derived.totals.scenarios,
      derived.domains.animals.scenarioCount
    ]).toEqual([2, 2])
  })

  test('Should warn about a scenario added then removed, naming its id and the theme commit', async () => {
    const derived = await stageArrival()

    expect(derived.warnings).toEqual([
      `scenario SCN-C "Removed later" was added to live-animals/journey-pages/arrival-details/spec.md by ${derived.commits[0].sha} then removed; not counted`
    ])
  })

  test('Should count a scenario added then renamed under its current heading and steps', async () => {
    const derived = await stageArrival()

    expect(
      derived.domains.animals.scenarios.map(
        ({ heading, id, missing, steps }) => ({
          heading,
          id,
          missing,
          steps
        })
      )
    ).toEqual([
      {
        heading: 'Kept as written',
        id: 'SCN-A',
        missing: false,
        steps: [
          { keyword: 'GIVEN', text: 'a user' },
          { keyword: 'THEN', text: 'Kept as written' }
        ]
      },
      {
        heading: 'Now reads this way',
        id: 'SCN-B',
        missing: false,
        steps: [
          { keyword: 'GIVEN', text: 'a user' },
          { keyword: 'THEN', text: 'Now reads this way' }
        ]
      }
    ])
  })
})

describe('#deriveTheme on a theme delivered as several tickets', () => {
  const SPEC = 'openspec/specs/ins/address-book/spec.md'
  const TICKETS = 'workareas/release/tickets/tickets.json'

  const stageAddressBook = async () => {
    workspace = await createGitWorkspace()
    workspace.write({
      'workareas/release/themes/address-book/backlog.json': json({
        increments: [
          {
            id: 'inc-1',
            title: 'Address list',
            status: 'done',
            repos: ['insfrontend']
          }
        ]
      }),
      'workareas/release/sources.json': json({
        repos: { insfrontend: 'repos/trade-imports-ins-frontend' }
      }),
      [SPEC]: specText('Address book', [
        scenario('The list shows addresses', 'SCN-A')
      ])
    })
    await workspace.commit('chore(KEY-1): spec the address list')
    workspace.write({
      [SPEC]: specText('Address book', [
        scenario('The list shows addresses', 'SCN-A'),
        scenario('An address can be deleted', 'SCN-B')
      ])
    })
    await workspace.commit('chore(KEY-2): spec deleting an address')
  }

  const listRowScopes = () =>
    workspace.write({
      [TICKETS]: json({
        themes: {},
        rowScopes: { 'address-book': ['KEY-1', 'KEY-2'] }
      })
    })

  test('Should refuse a theme whose rows commit only by Jira key while tickets.json lists no row scopes', async () => {
    await stageAddressBook()

    await expect(
      deriveIn({ workarea: 'release', theme: 'address-book' })
    ).rejects.toMatchObject({
      code: 'UNKNOWN',
      message:
        'tim theme-ticket derive: no commits on main whose subject scopes "address-book" and which touch openspec/'
    })
  })

  test('Should read every row commit and count each scenario to the front door once its keys are row scopes', async () => {
    await stageAddressBook()
    listRowScopes()

    const derived = await deriveIn({
      workarea: 'release',
      theme: 'address-book'
    })

    expect({
      commits: derived.commits.length,
      total: derived.totals.scenarios,
      ids: derived.domains.ins.scenarios.map((each) => each.id).sort()
    }).toEqual({ commits: 2, total: 2, ids: ['SCN-A', 'SCN-B'] })
  })

  test('Should count a scenario a later row commit moves only once', async () => {
    await stageAddressBook()
    listRowScopes()
    workspace.write({
      [SPEC]: specText('Address book', [
        scenario('An address can be deleted', 'SCN-B'),
        scenario('The list shows addresses', 'SCN-A')
      ])
    })
    await workspace.commit('chore(KEY-2): order the address scenarios')

    const derived = await deriveIn({
      workarea: 'release',
      theme: 'address-book'
    })

    expect(derived.domains.ins.scenarios.map((each) => each.id).sort()).toEqual(
      ['SCN-A', 'SCN-B']
    )
  })
})

describe('#deriveTheme on an unthemed backlog squash-merged to main', () => {
  const SPEC = 'openspec/specs/live-animals/journey-flow/spec.md'
  const SPEC_LINK = `https://github.com/DEFRA/trade-imports-workspace/blob/main/${SPEC}`

  const stageSquashMerge = async () => {
    workspace = await createGitWorkspace()
    workspace.write({
      'workareas/programme/backlog.json': json({
        increments: [
          {
            id: 'inc-1',
            title: 'Page order',
            status: 'done',
            repos: ['frontend']
          },
          { id: 'inc-2', title: 'Back', status: 'done', repos: ['frontend'] }
        ]
      }),
      'workareas/programme/sources.json': json({
        repos: { frontend: 'repos/trade-imports-animals-frontend' }
      }),
      [SPEC]: specText('Journey flow', [
        scenario('The journey has one page order', 'SCN-A')
      ])
    })
    await workspace.commit('chore: start')
    await workspace.git('checkout', '-q', '-b', 'feat/KEY-1-flow')
    workspace.write({
      [SPEC]: specText('Journey flow', [
        scenario('The journey has one page order', 'SCN-A'),
        scenario('Save and continue goes to the next page', 'SCN-B')
      ])
    })
    await workspace.commit(
      'feat(programme-flow): Save and continue goes to the next page'
    )
    workspace.write({
      [SPEC]: specText('Journey flow', [
        scenario('The journey has one page order', 'SCN-A'),
        scenario('Save and continue goes to the next page', 'SCN-B'),
        scenario('Back goes to where the trader came from', 'SCN-C')
      ])
    })
    await workspace.commit(
      'feat(programme-flow): Back goes to where the trader came from'
    )
    await workspace.git('checkout', '-q', 'main')
    await workspace.git('merge', '-q', '--squash', 'feat/KEY-1-flow')
    await workspace.commit('KEY-1: the flow (#1)')
  }

  const fromFeatureBranch = {
    workarea: 'programme',
    theme: 'programme-flow',
    branch: 'main',
    commitsFrom: 'feat/KEY-1-flow'
  }

  test('Should refuse main alone, which holds no row commit after a squash merge', async () => {
    await stageSquashMerge()

    await expect(
      deriveIn({
        workarea: 'programme',
        theme: 'programme-flow',
        branch: 'main'
      })
    ).rejects.toMatchObject({
      message:
        'tim theme-ticket derive: no commits on main whose subject scopes "programme-flow" and which touch openspec/'
    })
  })

  test('Should read every row of the unthemed backlog and both row commits from the feature branch, linking specs to main', async () => {
    await stageSquashMerge()

    const derived = await deriveIn(fromFeatureBranch)

    expect({
      rows: derived.rows.length,
      commits: derived.commits.length,
      total: derived.totals.scenarios,
      link: derived.domains.animals.files[0].url
    }).toEqual({ rows: 2, commits: 2, total: 2, link: SPEC_LINK })
  })

  test('Should leave out and report a scenario an exclude override judges another ticket’s', async () => {
    await stageSquashMerge()
    workspace.write({
      'workareas/programme/tickets/footprint-overrides.json': json({
        exclude: {
          'programme-flow': {
            'live-animals/journey-flow/spec.md': [
              'Back goes to where the trader came from'
            ]
          }
        }
      })
    })

    const derived = await deriveIn(fromFeatureBranch)

    expect({
      total: derived.totals.scenarios,
      kept: derived.domains.animals.scenarios.map((each) => each.id),
      reported: derived.excludedByOverride.flatMap((each) => each.scenarios)
    }).toEqual({
      total: 1,
      kept: ['SCN-B'],
      reported: ['Back goes to where the trader came from']
    })
  })
})

describe('#deriveTheme refusals', () => {
  test('Should refuse a spec area with no domain, naming the area', async () => {
    workspace = await createGitWorkspace()
    workspace.write({
      'workareas/release/themes/odd/backlog.json': json({
        increments: [{ id: 'o-1', title: 'Odd', status: 'done', repos: [] }]
      }),
      'openspec/specs/mystery-area/spec.md': specText('Mystery', [
        scenario('Somewhere unmapped', 'M-1')
      ])
    })
    await workspace.commit('feat(release-odd): Odd')

    await expect(
      deriveIn({ workarea: 'release', theme: 'odd' })
    ).rejects.toMatchObject({
      message:
        'tim theme-ticket derive: openspec areas with no domain mapping: mystery-area. Add them to SPEC_AREA_DOMAIN in tim/src/theme-ticket/derive.js — a theme must not be split with an area silently dropped.'
    })
  })

  test('Should refuse a run without a theme as a usage error', async () => {
    workspace = await createGitWorkspace()

    await expect(deriveIn({ workarea: 'release' })).rejects.toMatchObject({
      code: 'USAGE'
    })
  })
})

describe('#domainOfRepo', () => {
  test.each([
    ['repos/trade-imports-ins-tests', 'ignore'],
    ['repos/trade-imports-animals-admin', 'admin'],
    ['repos/trade-imports-animals-frontend', 'animals'],
    ['repos/trade-imports-plants-backend', 'plants'],
    ['repos/trade-imports-ins-frontend', 'ins'],
    ['repos/trade-imports-reference-data', 'shared']
  ])('Should put %s in the %s domain', (repoPath, domain) => {
    expect(domainOfRepo(repoPath)).toBe(domain)
  })
})
