import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import {
  normaliseRecordedText,
  recordFolderFiles
} from '../test-support/bash-golden-harness.js'
import { closeHttpMocks, installHttpMocks } from '../test-support/http-mock.js'
import {
  cases,
  readDiscoverGolden,
  RESPONSES,
  RUN_FOLDER,
  stageDiscoverWorkspace
} from './__fixtures__/npm-discover-workspace.js'
import {
  githubRepoOf,
  prebakeContext,
  renderPrebakeLine,
  usagePatternFor
} from './prebake.js'

const golden = readDiscoverGolden().prebake
const REGISTRY = 'https://registry.npmjs.org'
const RAW = 'https://raw.githubusercontent.com'

let staged

const answerAs = (origin) => (path) => {
  const body = RESPONSES[`${origin}${path}`]
  return body === undefined ? [404, 'Not Found'] : [200, body]
}

beforeEach(() => {
  const { mockPool } = installHttpMocks()
  for (const origin of [REGISTRY, RAW]) {
    mockPool(origin)
      .persist()
      .get(() => true)
      .reply(answerAs(origin))
  }
})

afterEach(() => {
  closeHttpMocks()
  staged?.remove()
  staged = undefined
})

const optionValue = (args, name) => args[args.indexOf(name) + 1]

const withUsagesSorted = (files) =>
  Object.fromEntries(
    Object.entries(files).map(([path, text]) => [
      path,
      path.endsWith('usages.txt')
        ? text.split('\n').filter(Boolean).sort().join('\n')
        : text
    ])
  )

const prebakeCase = async ({ name, args }) => {
  staged = stageDiscoverWorkspace({ command: 'prebake' })
  const prebake = await prebakeContext({
    workspaceRoot: staged.root,
    runId: optionValue(args, '--run-id'),
    repo: optionValue(args, '--repo'),
    packageName: optionValue(args, '--package')
  })
  return {
    case: name,
    input: args,
    exitCode: 0,
    stdout: '',
    stderr: normaliseRecordedText(
      `${renderPrebakeLine(prebake)}\n`,
      staged.home
    ),
    files: withUsagesSorted(
      recordFolderFiles(join(staged.root, RUN_FOLDER), staged.home)
    )
  }
}

describe('#prebakeContext', () => {
  const baked = cases.prebake.filter(({ name }) =>
    golden.some((run) => run.case === name && run.exitCode === 0)
  )

  test.each(baked.map((fixtureCase) => [fixtureCase.name, fixtureCase]))(
    'Should write the context and set the row as prebake-context.sh did for %s',
    async (name, fixtureCase) => {
      const run = await prebakeCase(fixtureCase)

      const recorded = golden.find((candidate) => candidate.case === name)
      expect(run).toEqual({
        ...recorded,
        files: withUsagesSorted(recorded.files)
      })
    }
  )

  test('Should list usage lines in path order', async () => {
    staged = stageDiscoverWorkspace({ command: 'prebake' })

    const { contextFolder } = await prebakeContext({
      workspaceRoot: staged.root,
      runId: 'EUDPA-600',
      repo: 'trade-imports-animals-frontend',
      packageName: 'lodash'
    })

    const files = recordFolderFiles(contextFolder, staged.home)
    expect(
      files['usages.txt'].split('\n').map((line) => line.split(':')[0])
    ).toEqual([
      '<HOME>/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/config.js',
      '<HOME>/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/index.js',
      '<HOME>/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend/src/server/logging/logger.js',
      ''
    ])
  })

  test('Should refuse a run with no packages file for the repo as NOT_FOUND', async () => {
    staged = stageDiscoverWorkspace({ command: 'prebake' })

    await expect(
      prebakeContext({
        workspaceRoot: staged.root,
        runId: 'EUDPA-600',
        repo: 'trade-imports-stub',
        packageName: 'react'
      })
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('#githubRepoOf', () => {
  test.each([
    [{ url: 'git+https://github.com/hapijs/hapi.git' }, 'hapijs/hapi'],
    [{ url: 'git+ssh://git@github.com/lodash/lodash.git' }, 'lodash/lodash'],
    [{ url: 'git://github.com/bare/bare.git' }, 'bare/bare'],
    [{ url: 'https://github.com/owner/name/' }, 'owner/name'],
    [{ url: 'https://gitlab.com/pino/pino' }, undefined],
    ['https://github.com/owner/name', undefined],
    [{ type: 'git' }, undefined],
    [undefined, undefined]
  ])('Should read %j as %s', (repository, githubRepo) => {
    expect(githubRepoOf({ repository })).toBe(githubRepo)
  })
})

describe('#usagePatternFor', () => {
  test.each([
    ["import x from 'lodash'", true],
    ['import fp from "lodash/fp"', true],
    ["const _ = require('lodash')", true],
    ["import y from 'lodashy'", false],
    ["import z from 'lodash.merge'", false]
  ])('Should match %s for lodash: %s', (line, matches) => {
    expect(usagePatternFor('lodash').test(line)).toBe(matches)
  })

  test('Should match a dot in a package name only as a dot', () => {
    expect(usagePatternFor('lodash.merge').test("from 'lodashxmerge'")).toBe(
      false
    )
  })
})
