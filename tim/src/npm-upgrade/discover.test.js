import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  normaliseRecordedText,
  recordFolderFiles
} from '../test-support/bash-golden-harness.js'
import {
  argsIn,
  cases,
  NCU_UPGRADES,
  NCU_VERSION,
  readDiscoverGolden,
  RUN_FOLDER,
  stageDiscoverWorkspace
} from './__fixtures__/npm-discover-workspace.js'
import {
  blockRealNetwork,
  restoreRealNetwork,
  serveRegistryPackage,
  writeRegistryRepo
} from './__fixtures__/ncu-registry.js'
import { runNcu } from './ncu.js'
import {
  checkDiscoverOptions,
  discoverUpgrades,
  freshRowsOf,
  mergeWithEarlierRows,
  renderDiscoverText,
  repoNameOf,
  upgradeTypeOf
} from './discover.js'

const golden = readDiscoverGolden().discover

let staged

afterEach(() => {
  staged?.remove()
  staged = undefined
})

const optionValue = (args, name) => {
  const index = args.indexOf(name)
  return index === -1 ? undefined : args[index + 1]
}

const optionsOf = (args) => ({
  repoPath: args[0].startsWith('--') ? undefined : args[0],
  runId: optionValue(args, '--run-id'),
  strategy: optionValue(args, '--strategy') ?? 'latest',
  force: args.includes('--force'),
  json: args.includes('--json')
})

const discoverCase = async ({
  name,
  args,
  upgrades = NCU_UPGRADES,
  withPrior
}) => {
  staged = stageDiscoverWorkspace({ command: 'discover', withPrior })
  const options = optionsOf(argsIn(args, staged.root))
  const stdout = []
  const stderr = []
  checkDiscoverOptions({ ...options, warn: (line) => stderr.push(line) })
  const discovery = await discoverUpgrades({
    ...options,
    workspaceRoot: staged.root,
    runNcu: async () => upgrades,
    ncuVersion: NCU_VERSION,
    log: (line) => (options.json ? undefined : stdout.push(line))
  })
  stdout.push(
    options.json
      ? JSON.stringify(discovery.state, null, 2)
      : renderDiscoverText(discovery)
  )
  const lines = (list) => list.map((line) => `${line}\n`).join('')
  return {
    case: name,
    input: args,
    exitCode: 0,
    stdout: normaliseRecordedText(lines(stdout), staged.home),
    stderr: normaliseRecordedText(lines(stderr), staged.home),
    files: recordFolderFiles(join(staged.root, RUN_FOLDER), staged.home)
  }
}

describe('#discoverUpgrades', () => {
  const discovered = cases.discover.filter(({ name }) =>
    golden.some((run) => run.case === name && run.exitCode === 0)
  )

  test.each(discovered.map((fixtureCase) => [fixtureCase.name, fixtureCase]))(
    'Should print and write what discover-upgrades.sh did for %s',
    async (name, fixtureCase) => {
      const run = await discoverCase(fixtureCase)

      expect(run).toEqual(golden.find((recorded) => recorded.case === name))
    }
  )

  test('Should refuse a repo path with no package.json as NOT_FOUND', async () => {
    staged = stageDiscoverWorkspace({ command: 'discover' })

    await expect(
      discoverUpgrades({
        workspaceRoot: staged.root,
        runId: 'EUDPA-600',
        repoPath: join(staged.root, 'repos', 'no-manifest'),
        strategy: 'latest',
        runNcu: async () => ({}),
        ncuVersion: NCU_VERSION,
        log: () => undefined
      })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      message: `No package.json found in ${join(staged.root, 'repos', 'no-manifest')}`
    })
  })

  test('Should name the failure when npm-check-updates fails', async () => {
    staged = stageDiscoverWorkspace({ command: 'discover' })

    await expect(
      discoverUpgrades({
        workspaceRoot: staged.root,
        runId: 'EUDPA-600',
        repoPath: join(staged.root, 'repos', 'trade-imports-animals-frontend'),
        strategy: 'latest',
        runNcu: async () => {
          throw new Error('registry unreachable')
        },
        ncuVersion: NCU_VERSION,
        log: () => undefined
      })
    ).rejects.toMatchObject({
      message: 'Failed to run npm-check-updates: registry unreachable'
    })
  })

  describe('With npm-check-updates asking a served registry', () => {
    let workspaceRoot

    beforeEach(() => {
      blockRealNetwork()
      serveRegistryPackage('widget', ['1.2.3', '1.2.9', '1.5.0', '2.1.0'])
      workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-discover-'))
    })

    afterEach(() => {
      restoreRealNetwork()
      rmSync(workspaceRoot, { recursive: true, force: true })
    })

    test.each([
      ['latest', '2.1.0', 'major'],
      ['minor', '1.5.0', 'minor'],
      ['patch', '1.2.9', 'patch']
    ])(
      'Should record the %s strategy’s target for the repo at the given path',
      async (strategy, target, upgradeType) => {
        const repoPath = writeRegistryRepo(
          join(workspaceRoot, 'repos', 'widget-repo'),
          { widget: '^1.2.3' }
        )

        const discovery = await discoverUpgrades({
          workspaceRoot,
          runId: 'EUDPA-600',
          repoPath,
          strategy,
          runNcu,
          ncuVersion: NCU_VERSION,
          log: () => undefined
        })

        expect(discovery.state.packages).toHaveLength(1)
        expect(discovery.state.packages[0]).toMatchObject({
          package: 'widget',
          current: '1.2.3',
          target,
          upgrade_type: upgradeType
        })
      }
    )
  })
})

describe('#upgradeTypeOf', () => {
  test.each([
    ['^21.3.0', '^22.0.0', 'major'],
    ['~4.17.20', '~4.18.0', 'minor'],
    ['>=1.2.0', '>=1.2.5', 'patch'],
    ['1', '1.1', 'minor'],
    ['latest', 'latest', 'patch']
  ])('Should call %s to %s a %s upgrade', (current, target, type) => {
    expect(upgradeTypeOf(current, target)).toBe(type)
  })
})

describe('#freshRowsOf', () => {
  test('Should take the current version from dependencies before devDependencies, and the target when neither lists it', () => {
    const rows = freshRowsOf(
      { both: '^2.0.0', unlisted: '^1.0.0' },
      {
        dependencies: { both: '^1.0.0' },
        devDependencies: { both: '^0.5.0' }
      }
    )

    expect(
      rows.map(({ package: name, current, dependency_type: type }) => ({
        name,
        current,
        type
      }))
    ).toEqual([
      { name: 'both', current: '1.0.0', type: 'dependencies' },
      { name: 'unlisted', current: '1.0.0', type: 'dependencies' }
    ])
  })
})

describe('#mergeWithEarlierRows', () => {
  test('Should keep an earlier row’s work, give null for a field it lacked and drop packages no longer outdated', () => {
    const fresh = freshRowsOf({ lodash: '4.17.21' }, { dependencies: {} })

    const merged = mergeWithEarlierRows(fresh, [
      { package: 'lodash', classification: 'auto', demoted_from_auto: false },
      { package: 'left-pad', classification: 'manual' }
    ])

    expect(merged).toEqual([
      {
        ...fresh[0],
        classification: 'auto',
        demoted_from_auto: false,
        context_missing: null
      }
    ])
  })
})

describe('#repoNameOf', () => {
  test.each([
    ['/w/repos/trade-imports-stub', 'trade-imports-stub'],
    ['/w/repos/trade-imports-stub/service', 'trade-imports-stub'],
    ['/w/repos/trade-imports-stub/app', 'trade-imports-stub'],
    ['/w/repos/trade-imports-stub/src', 'trade-imports-stub']
  ])('Should name %s %s', (path, name) => {
    expect(repoNameOf(path)).toBe(name)
  })
})
