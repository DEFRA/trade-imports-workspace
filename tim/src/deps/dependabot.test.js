import { describe, test, expect } from 'vitest'
import * as yaml from 'js-yaml'
import { renderDependabotConfig } from './dependabot.js'
import {
  AXE_HOLD,
  fixtureDependencySets,
  fixtureDependencySetsHolding
} from '../test-support/deps-workspace.js'

const renderParsed = (dependencySets = fixtureDependencySets()) =>
  yaml.load(
    renderDependabotConfig({
      repo: 'trade-imports-animals-frontend',
      dependencySets
    })
  )

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

  test('Should ignore every member of a cross-repo set and nothing for a set with no members', () => {
    const config = renderParsed()

    expect(npmUpdate(config).ignore).toEqual([
      { 'dependency-name': 'playwright' },
      { 'dependency-name': 'playwright-core' },
      { 'dependency-name': '@playwright/*' },
      { 'dependency-name': 'govuk-frontend' }
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
      { 'dependency-name': 'playwright' },
      { 'dependency-name': 'playwright-core' },
      { 'dependency-name': '@playwright/*' },
      { 'dependency-name': 'govuk-frontend' },
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
      { 'dependency-name': 'govuk-frontend' },
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
