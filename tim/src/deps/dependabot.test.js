import { describe, test, expect } from 'vitest'
import * as yaml from 'js-yaml'
import { renderDependabotConfig } from './dependabot.js'
import {
  AXE_HOLD,
  SPRINGDOC_HOLD,
  fixtureDependencySets,
  fixtureDependencySetsHolding
} from '../test-support/deps-workspace.js'

const JAVA_REPO = 'trade-imports-animals-backend'

const renderMaven = (dependencySets = fixtureDependencySets()) =>
  renderDependabotConfig({
    repo: JAVA_REPO,
    dependencySets,
    ecosystem: 'maven'
  })

const mavenSetsWith = (dependabot) => {
  const dependencySets = fixtureDependencySets()
  return {
    ...dependencySets,
    maven: {
      ...dependencySets.maven,
      dependabot: { ...dependencySets.maven.dependabot, ...dependabot }
    }
  }
}

const renderParsed = (dependencySets = fixtureDependencySets()) =>
  yaml.load(
    renderDependabotConfig({
      repo: 'trade-imports-animals-frontend',
      dependencySets
    })
  )

const setIgnore = (dependencyName) => ({
  'dependency-name': dependencyName,
  'update-types': [
    'version-update:semver-major',
    'version-update:semver-minor',
    'version-update:semver-patch'
  ]
})

const npmUpdate = (config) =>
  config.updates.find((update) => update['package-ecosystem'] === 'npm')

const actionsUpdate = (config) =>
  config.updates.find(
    (update) => update['package-ecosystem'] === 'github-actions'
  )

describe('#renderDependabotConfig', () => {
  test('Should list a group per repo-scoped set before the patch-and-minor catch-all', () => {
    const config = renderParsed()

    expect(Object.keys(npmUpdate(config).groups)).toEqual([
      'eslint',
      'vitest',
      'patch-and-minor'
    ])
  })

  test('Should give a set group its members as patterns and every update type', () => {
    const config = renderParsed()

    expect(npmUpdate(config).groups.vitest).toEqual({
      'applies-to': 'version-updates',
      patterns: ['vitest', '@vitest/*']
    })
  })

  test('Should keep patch and minor bumps of everything else in one group', () => {
    const config = renderParsed()

    expect(npmUpdate(config).groups['patch-and-minor']).toEqual({
      'applies-to': 'version-updates',
      'update-types': ['patch', 'minor'],
      patterns: ['*']
    })
  })

  test('Should ignore every version update of each cross-repo set member, and nothing for a set with no members', () => {
    const config = renderParsed()

    expect(npmUpdate(config).ignore).toEqual([
      setIgnore('playwright'),
      setIgnore('playwright-core'),
      setIgnore('@playwright/*'),
      setIgnore('govuk-frontend')
    ])
  })

  test('Should leave out ignore when no cross-repo set has members', () => {
    const dependencySets = fixtureDependencySets()
    const repoSetsOnly = {
      ...dependencySets,
      sets: dependencySets.sets.filter((set) => set.scope === 'repo')
    }

    const config = renderParsed(repoSetsOnly)

    expect(npmUpdate(config)).not.toHaveProperty('ignore')
  })

  test('Should ignore the held versions of a package in a repo the hold lists, after the cross-repo sets', () => {
    const config = renderParsed(fixtureDependencySetsHolding([AXE_HOLD]))

    expect(npmUpdate(config).ignore).toEqual([
      setIgnore('playwright'),
      setIgnore('playwright-core'),
      setIgnore('@playwright/*'),
      setIgnore('govuk-frontend'),
      { 'dependency-name': '@axe-core/playwright', versions: ['4.14.x'] }
    ])
  })

  test('Should keep a hold beside the ignore a cross-repo set gives the same package', () => {
    const govukHold = {
      ...AXE_HOLD,
      package: 'govuk-frontend',
      versions: '6.7.x'
    }

    const config = renderParsed(fixtureDependencySetsHolding([govukHold]))

    expect(
      npmUpdate(config).ignore.filter(
        (entry) => entry['dependency-name'] === 'govuk-frontend'
      )
    ).toEqual([
      setIgnore('govuk-frontend'),
      { 'dependency-name': 'govuk-frontend', versions: ['6.7.x'] }
    ])
  })

  test('Should leave a repo the hold does not list unchanged', () => {
    const elsewhere = { ...AXE_HOLD, repos: ['tim'] }

    const text = renderDependabotConfig({
      repo: 'trade-imports-animals-frontend',
      dependencySets: fixtureDependencySetsHolding([elsewhere])
    })

    expect(text).toBe(
      renderDependabotConfig({
        repo: 'trade-imports-animals-frontend',
        dependencySets: fixtureDependencySets()
      })
    )
  })

  test('Should write the ignore list for a hold when no cross-repo set has members', () => {
    const dependencySets = fixtureDependencySetsHolding([AXE_HOLD])
    const repoSetsOnly = {
      ...dependencySets,
      sets: dependencySets.sets.filter((set) => set.scope === 'repo')
    }

    const config = renderParsed(repoSetsOnly)

    expect(npmUpdate(config).ignore).toEqual([
      { 'dependency-name': '@axe-core/playwright', versions: ['4.14.x'] }
    ])
  })

  test("Should write a hold's package, date, reason, failing test, what clears it and link as comments above its entry", () => {
    const text = renderDependabotConfig({
      repo: 'trade-imports-animals-frontend',
      dependencySets: fixtureDependencySetsHolding([AXE_HOLD])
    })

    expect(text).toContain(
      [
        '      # held: @axe-core/playwright, since 2026-11-19',
        "      # axe 4.14 flags govuk-frontend's enhanced file upload button, which no",
        '      # govuk-frontend release fixes yet.',
        '      # Failing test: FIT accessibility tests (label-content-name-mismatch)',
        '      # Lift it with tim deps lift when a newer @axe-core/playwright or',
        '      # govuk-frontend clears it.',
        '      # https://github.com/DEFRA/trade-imports-animals-frontend/pull/492',
        "      - dependency-name: '@axe-core/playwright'",
        '        versions:',
        "          - '4.14.x'",
        ''
      ].join('\n')
    )
  })

  test('Should say only the held package clears a hold with no clashesWith, and write no link line without a link', () => {
    const { clashesWith, link, ...plainHold } = AXE_HOLD

    const text = renderDependabotConfig({
      repo: 'trade-imports-animals-frontend',
      dependencySets: fixtureDependencySetsHolding([plainHold])
    })

    expect(text).toContain(
      [
        '      # Failing test: FIT accessibility tests (label-content-name-mismatch)',
        '      # Lift it with tim deps lift when a newer @axe-core/playwright clears',
        '      # it.',
        "      - dependency-name: '@axe-core/playwright'"
      ].join('\n')
    )
  })

  test('Should keep the npm schedule, limit, versioning strategy and direct-only allow', () => {
    const update = npmUpdate(renderParsed())

    expect({
      directory: update.directory,
      limit: update['open-pull-requests-limit'],
      schedule: update.schedule,
      versioningStrategy: update['versioning-strategy'],
      allow: update.allow
    }).toEqual({
      directory: '/',
      limit: 10,
      schedule: {
        interval: 'daily',
        time: '10:30',
        timezone: 'Europe/London'
      },
      versioningStrategy: 'increase',
      allow: [{ 'dependency-type': 'direct' }]
    })
  })

  test('Should point npm at the given folder and GitHub Actions at each given folder', () => {
    const config = yaml.load(
      renderDependabotConfig({
        repo: 'tim',
        dependencySets: fixtureDependencySets(),
        directories: { npm: '/tim', actions: ['/', '/.github/actions/*'] }
      })
    )

    expect({
      npm: npmUpdate(config).directory,
      actions: actionsUpdate(config).directories,
      actionsDirectory: actionsUpdate(config).directory
    }).toEqual({
      npm: '/tim',
      actions: ['/', '/.github/actions/*'],
      actionsDirectory: undefined
    })
  })

  test('Should apply the cooldown to npm and GitHub Actions', () => {
    const dependencySets = fixtureDependencySets()
    const fiveDays = {
      ...dependencySets,
      defaults: { ...dependencySets.defaults, cooldownDays: 5 }
    }

    const config = renderParsed(fiveDays)

    expect([
      npmUpdate(config).cooldown,
      actionsUpdate(config).cooldown
    ]).toEqual([{ 'default-days': 5 }, { 'default-days': 5 }])
  })

  test('Should keep the GitHub Actions update with its patch-and-minor group', () => {
    const update = actionsUpdate(renderParsed())

    expect({
      directory: update.directory,
      groups: update.groups,
      schedule: update.schedule
    }).toEqual({
      directory: '/',
      groups: {
        'patch-and-minor': {
          'applies-to': 'version-updates',
          'update-types': ['patch', 'minor'],
          patterns: ['*']
        }
      },
      schedule: {
        interval: 'daily',
        time: '10:30',
        timezone: 'Europe/London'
      }
    })
  })

  test("Should write each set's reason as a comment above its group", () => {
    const text = renderDependabotConfig({
      repo: 'trade-imports-animals-frontend',
      dependencySets: fixtureDependencySets()
    })

    expect(text).toContain(
      '      # @vitest/coverage-v8 and the other @vitest packages pin the exact\n      # vitest version they were released with.\n      vitest:\n'
    )
  })

  test('Should name the command that regenerates the file in its header', () => {
    const text = renderDependabotConfig({
      repo: 'trade-imports-animals-frontend',
      dependencySets: fixtureDependencySets()
    })

    expect(text.split('\n')[0]).toBe(
      '# Generated by `tim deps dependabot trade-imports-animals-frontend --write` from'
    )
  })
})

const mavenUpdate = (config) =>
  config.updates.find((update) => update['package-ecosystem'] === 'maven')

describe('#renderDependabotConfig for Maven', () => {
  test('Should give the Maven update its folder, limit, schedule and direct-only allow, with no groups, ignore or cooldown', () => {
    const config = yaml.load(renderMaven())

    expect(config.updates.map((update) => update['package-ecosystem'])).toEqual(
      ['maven', 'github-actions']
    )
    expect(mavenUpdate(config)).toEqual({
      'package-ecosystem': 'maven',
      directory: '/',
      'open-pull-requests-limit': 10,
      schedule: {
        interval: 'weekly',
        time: '10:30',
        timezone: 'Europe/London'
      },
      allow: [{ 'dependency-type': 'direct' }]
    })
  })

  test('Should give GitHub Actions the Maven schedule, with no groups or cooldown', () => {
    const config = yaml.load(renderMaven())

    expect(actionsUpdate(config)).toEqual({
      'package-ecosystem': 'github-actions',
      directory: '/',
      schedule: {
        interval: 'weekly',
        time: '10:30',
        timezone: 'Europe/London'
      }
    })
  })

  test('Should ignore the held versions of a Maven package in a repo the hold lists', () => {
    const config = yaml.load(
      renderMaven(fixtureDependencySetsHolding([SPRINGDOC_HOLD]))
    )

    expect(mavenUpdate(config).ignore).toEqual([
      {
        'dependency-name': 'org.springdoc:springdoc-openapi-starter-webmvc-ui',
        versions: ['[3.0.0,4.0.0)']
      }
    ])
  })

  test("Should write a Maven hold's package, date, reason, failing test, what clears it and link as comments above its entry", () => {
    const text = renderMaven(fixtureDependencySetsHolding([SPRINGDOC_HOLD]))

    expect(text).toContain(
      [
        '    # A held package stays at its current version: Dependabot does not propose',
        '    # the versions it breaks, security fixes among them.',
        '    ignore:',
        '      # held: org.springdoc:springdoc-openapi-starter-webmvc-ui, since 2026-11-27',
        '      # springdoc-openapi 3 needs Spring Boot 4, and the service runs Spring',
        '      # Boot 3.5.',
        '      # Failing test: E2E Tests',
        '      # Lift it with tim deps lift when a newer',
        '      # org.springdoc:springdoc-openapi-starter-webmvc-ui or',
        '      # org.springframework.boot:spring-boot-starter-parent clears it.',
        '      # https://github.com/DEFRA/trade-imports-animals-backend/pull/144',
        "      - dependency-name: 'org.springdoc:springdoc-openapi-starter-webmvc-ui'",
        '        versions:',
        "          - '[3.0.0,4.0.0)'",
        ''
      ].join('\n')
    )
  })

  test('Should leave the Maven update without ignore when the hold lists another repo', () => {
    const elsewhere = { ...SPRINGDOC_HOLD, repos: ['trade-imports-stub'] }

    const text = renderMaven(fixtureDependencySetsHolding([elsewhere]))

    expect(text).toBe(renderMaven())
  })

  test('Should leave an npm hold out of the Maven update, and a Maven hold out of the npm update', () => {
    const bothRepos = { ...AXE_HOLD, repos: [JAVA_REPO] }
    const springdocInFrontend = {
      ...SPRINGDOC_HOLD,
      repos: ['trade-imports-animals-frontend']
    }

    expect({
      maven: renderMaven(fixtureDependencySetsHolding([bothRepos])),
      npm: renderDependabotConfig({
        repo: 'trade-imports-animals-frontend',
        dependencySets: fixtureDependencySetsHolding([springdocInFrontend])
      })
    }).toEqual({
      maven: renderMaven(),
      npm: renderDependabotConfig({
        repo: 'trade-imports-animals-frontend',
        dependencySets: fixtureDependencySets()
      })
    })
  })

  test('Should group patch and minor bumps of Maven and GitHub Actions when the config asks', () => {
    const config = yaml.load(
      renderMaven(mavenSetsWith({ groupPatchAndMinor: true }))
    )

    const patchAndMinor = {
      'patch-and-minor': {
        'applies-to': 'version-updates',
        'update-types': ['patch', 'minor'],
        patterns: ['*']
      }
    }
    expect([mavenUpdate(config).groups, actionsUpdate(config).groups]).toEqual([
      patchAndMinor,
      patchAndMinor
    ])
  })

  test('Should apply a Maven cooldown to Maven and GitHub Actions when the config gives one', () => {
    const config = yaml.load(renderMaven(mavenSetsWith({ cooldownDays: 3 })))

    expect([
      mavenUpdate(config).cooldown,
      actionsUpdate(config).cooldown
    ]).toEqual([{ 'default-days': 3 }, { 'default-days': 3 }])
  })

  test('Should name the Java repo in the header', () => {
    expect(renderMaven().split('\n')[0]).toBe(
      '# Generated by `tim deps dependabot trade-imports-animals-backend --write` from'
    )
  })
})
