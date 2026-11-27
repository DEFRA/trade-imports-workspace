import { describe, expect, test } from 'vitest'
import {
  domainsForFolders,
  PERF_FOLDER,
  stackPlanFor,
  stackPlanLines,
  tagsIn,
  TESTS_FOLDER
} from './stack-domains.js'

const SCOPE = {
  default: { suites: ['all'] },
  'trade-imports-plants-frontend': {
    suites: ['tests/plants/'],
    tags: ['@plants-frontend']
  },
  'trade-imports-plants-backend': { suites: ['tests/plants/'] },
  'trade-imports-animals-frontend': {
    suites: ['tests/animals/'],
    tags: ['@animals-frontend']
  },
  'trade-imports-address-book': {
    suites: ['tests/ins/'],
    tags: ['@address-book']
  }
}

const TAG_DOMAINS = {
  '@plants-frontend': ['ins'],
  '@animals-frontend': ['animals-admin', 'ins'],
  '@address-book': ['animals', 'plants']
}

const domainsOf = (folders) =>
  domainsForFolders({ scope: SCOPE, folders, tagDomains: TAG_DOMAINS })

describe('#domainsForFolders', () => {
  test('Should need no stack when the row changes only the workspace', () => {
    expect(domainsOf(['trade-imports-workspace'])).toEqual({
      domains: [],
      everyDomain: false,
      reason: 'it changes no service repo'
    })
  })

  test('Should need no stack when the row changes only the workspace and the tests repo', () => {
    expect(
      domainsOf(['trade-imports-workspace', TESTS_FOLDER]).domains
    ).toEqual([])
  })

  test('Should take the domain from the service repo, ignoring the workspace beside it', () => {
    expect(
      domainsOf([
        'trade-imports-plants-backend',
        'trade-imports-workspace',
        TESTS_FOLDER
      ]).domains
    ).toEqual(['plants'])
  })

  test('Should union the domains of two service repos', () => {
    expect(
      domainsOf([
        'trade-imports-plants-backend',
        'trade-imports-animals-frontend'
      ]).domains
    ).toEqual(['animals', 'animals-admin', 'ins', 'plants'])
  })

  test('Should add the domains a repo tag reaches, not only its own suites', () => {
    expect(domainsOf(['trade-imports-address-book']).domains).toEqual([
      'animals',
      'ins',
      'plants'
    ])
  })

  test('Should need the whole stack for the performance suite', () => {
    const result = domainsOf([PERF_FOLDER])

    expect({ everyDomain: result.everyDomain, reason: result.reason }).toEqual({
      everyDomain: true,
      reason:
        'the performance suite addresses every service by port, so it needs the whole stack'
    })
  })

  test('Should need the whole stack for a repo with no scope entry', () => {
    const result = domainsOf(['trade-imports-reference-data'])

    expect({ everyDomain: result.everyDomain, reason: result.reason }).toEqual({
      everyDomain: true,
      reason:
        'trade-imports-reference-data has no entry in config/e2e-tests-pr-scope.json, so any domain may use it'
    })
  })

  test('Should need the whole stack for a tag whose domains are not known', () => {
    const result = domainsForFolders({
      scope: SCOPE,
      folders: ['trade-imports-address-book'],
      tagDomains: {}
    })

    expect({ everyDomain: result.everyDomain, reason: result.reason }).toEqual({
      everyDomain: true,
      reason:
        '@address-book marks specs in no domain this could find, so its reach is unknown'
    })
  })
})

describe('#domainsForFolders under a targeted run', () => {
  const targetedDomainsOf = (folders) =>
    domainsForFolders({
      scope: SCOPE,
      folders,
      tagDomains: TAG_DOMAINS,
      e2e: 'targeted'
    })

  test('Should take only the repo’s own suites, leaving its tagged domains to the pull request', () => {
    expect(targetedDomainsOf(['trade-imports-animals-frontend'])).toEqual({
      domains: ['animals'],
      everyDomain: false,
      reason:
        'trade-imports-animals-frontend runs animals; tagged specs in animals-admin, ins run on the pull request'
    })
  })

  test('Should union two service repos’ own suites and nothing else', () => {
    expect(
      targetedDomainsOf([
        'trade-imports-plants-backend',
        'trade-imports-animals-frontend'
      ]).domains
    ).toEqual(['animals', 'plants'])
  })

  test('Should say only the suites when the repo carries no tag', () => {
    expect(targetedDomainsOf(['trade-imports-plants-backend'])).toEqual({
      domains: ['plants'],
      everyDomain: false,
      reason: 'trade-imports-plants-backend runs plants'
    })
  })

  test('Should not need every domain for a tag whose domains are not known', () => {
    const result = domainsForFolders({
      scope: SCOPE,
      folders: ['trade-imports-address-book'],
      tagDomains: {},
      e2e: 'targeted'
    })

    expect({
      domains: result.domains,
      everyDomain: result.everyDomain
    }).toEqual({ domains: ['ins'], everyDomain: false })
  })

  test('Should still need the whole stack for a repo with no scope entry', () => {
    expect(
      targetedDomainsOf(['trade-imports-reference-data']).everyDomain
    ).toBe(true)
  })

  test('Should still need the whole stack for the performance suite', () => {
    expect(targetedDomainsOf([PERF_FOLDER]).everyDomain).toBe(true)
  })

  test('Should still need no stack when the row changes no service repo', () => {
    expect(targetedDomainsOf(['trade-imports-workspace']).domains).toEqual([])
  })

  test('Should count a repo’s tags when the run is not targeted', () => {
    expect(domainsOf(['trade-imports-animals-frontend']).domains).toEqual([
      'animals',
      'animals-admin',
      'ins'
    ])
  })
})

describe('#tagsIn', () => {
  test('Should name every tag the scope file uses, once each, sorted', () => {
    expect(tagsIn(SCOPE)).toEqual([
      '@address-book',
      '@animals-frontend',
      '@plants-frontend'
    ])
  })
})

describe('#stackPlanFor', () => {
  const folderOfKey = {
    plantsfrontend: 'trade-imports-plants-frontend',
    plantsbackend: 'trade-imports-plants-backend',
    workspace: 'trade-imports-workspace',
    tests: TESTS_FOLDER
  }

  const planFor = (rows) =>
    stackPlanFor({ rows, folderOfKey, scope: SCOPE, tagDomains: TAG_DOMAINS })

  test('Should narrow a plants-only run to the plants services', () => {
    const plan = planFor([
      { id: 'inc-001', repos: ['plantsfrontend', 'workspace', 'tests'] },
      { id: 'inc-002', repos: ['plantsbackend', 'workspace'] }
    ])

    expect({
      needsStack: plan.needsStack,
      domains: plan.domains,
      services: plan.services.length,
      whole: plan.wholeStack.length
    }).toEqual({
      needsStack: true,
      domains: ['ins', 'plants'],
      services: 17,
      whole: 22
    })
  })

  test('Should need no stack when no row changes a service repo', () => {
    const plan = planFor([
      { id: 'inc-001', repos: ['workspace'] },
      { id: 'inc-002', repos: ['workspace', 'tests'] }
    ])

    expect({ needsStack: plan.needsStack, domains: plan.domains }).toEqual({
      needsStack: false,
      domains: []
    })
  })

  test('Should take every repo for a row that names none', () => {
    const plan = planFor([{ id: 'inc-001' }])

    expect(plan.domains).toEqual(['ins', 'plants'])
  })
})

describe('#stackPlanLines', () => {
  const folderOfKey = {
    plantsbackend: 'trade-imports-plants-backend',
    workspace: 'trade-imports-workspace'
  }

  test('Should say a run needs no stack, and why, row by row', () => {
    const plan = stackPlanFor({
      rows: [{ id: 'inc-001', repos: ['workspace'] }],
      folderOfKey,
      scope: SCOPE,
      tagDomains: TAG_DOMAINS
    })

    expect(stackPlanLines(plan)).toEqual([
      'No row changes a service repo, so no row runs an end-to-end suite.',
      'This run needs no stack at all, against 22 services for the whole stack.',
      '  inc-001: it changes no service repo'
    ])
  })

  test('Should say how many services a narrowed stack starts, and for which domains', () => {
    const plan = stackPlanFor({
      rows: [{ id: 'inc-001', repos: ['plantsbackend'] }],
      folderOfKey,
      scope: SCOPE,
      tagDomains: TAG_DOMAINS
    })

    expect(stackPlanLines(plan)[0]).toBe(
      'Narrowed: 10 of 22 services, for plants.'
    )
  })
})
