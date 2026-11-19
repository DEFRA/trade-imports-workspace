import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { execa } from 'execa'
import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { OK, USAGE } from '../../constants/exitCodes.js'
import {
  createCliWorkspace,
  envelopeOf,
  runTimInWorkspace
} from '../../test-support/tim-cli.js'
import {
  createPullRequestOrigin,
  pinFetchCases,
  PULL_REQUEST_NUMBER,
  prepareCaseFolder,
  readPinnedState
} from './__fixtures__/pin-fetch-clones.js'
import { renderPinFetchText } from './pin-fetch.js'

const golden = JSON.parse(
  readFileSync(
    new URL('./__fixtures__/__golden__/light-remote.json', import.meta.url),
    'utf8'
  )
)

let base

beforeEach(() => {
  base = createCliWorkspace('tim-pin-fetch-')
})

afterEach(() => {
  rmSync(base, { recursive: true, force: true })
})

const pinFetchRun = (dir, flags) =>
  runTimInWorkspace(base, ['workspace', 'pin-fetch', dir, ...flags])

const asHome = (text) => text.split(base).join('<HOME>')

const originIn = async () => {
  const originsDir = join(base, 'origins')
  mkdirSync(originsDir)
  return createPullRequestOrigin(originsDir)
}

const objectExists = async (dir, sha) =>
  (await execa('git', ['-C', dir, 'cat-file', '-e', sha], { reject: false }))
    .exitCode === 0

describe('tim workspace pin-fetch matches light-remote.sh', () => {
  test.each(
    pinFetchCases.map((pinFetchCase, index) => ({ ...pinFetchCase, index }))
  )(
    'Should give the recorded exit, output, refspecs and remote refs when it $name',
    async ({ index, ...pinFetchCase }) => {
      const { barePath } = await originIn()
      const dir = await prepareCaseFolder(
        pinFetchCase,
        barePath,
        join(base, 'clones'),
        index
      )

      let result
      for (const { tim } of pinFetchCase.runs) {
        result = await pinFetchRun(dir, tim)
      }
      const state =
        pinFetchCase.clone === null ? {} : await readPinnedState(dir)

      const recorded = golden[index]
      expect(recorded.case).toBe(pinFetchCase.name)
      expect(result.exitCode).toBe(recorded.exitCode === 0 ? OK : USAGE)
      expect(asHome(result.stdout)).toBe(recorded.stdout)
      expect(asHome(result.stderr)).toBe(recorded.stderr)
      expect(state).toEqual({
        ...(recorded.refspecs ? { refspecs: recorded.refspecs } : {}),
        ...(recorded.remoteRefs ? { remoteRefs: recorded.remoteRefs } : {})
      })
    },
    30_000
  )
})

describe('tim workspace pin-fetch --json', () => {
  test('Should report the folder, mode and refspecs of a pull request pin', async () => {
    const { barePath } = await originIn()
    const dir = await prepareCaseFolder(
      { clone: 'review' },
      barePath,
      join(base, 'clones'),
      0
    )

    const result = await pinFetchRun(dir, [
      '--pr',
      PULL_REQUEST_NUMBER,
      '--include-main',
      '--json'
    ])

    expect(result.exitCode).toBe(OK)
    expect(envelopeOf(result).result).toEqual({
      dir,
      mode: 'pr-only',
      refspecs: [
        '+refs/pull/7/head:refs/remotes/origin/pr-7',
        '+refs/heads/main:refs/remotes/origin/main'
      ],
      pruned: false
    })
  })

  test('Should report a folder that is not a git repo as a USAGE error', async () => {
    const dir = join(base, 'not-a-repo')
    mkdirSync(dir)

    const result = await pinFetchRun(dir, ['--exclude-gh-pages', '--json'])

    expect(result.exitCode).toBe(USAGE)
    expect(envelopeOf(result).errors).toEqual([
      { code: 'USAGE', message: `Not a git repo: ${dir}` }
    ])
  })
})

describe('tim workspace pin-fetch --exclude-gh-pages --prune', () => {
  test('Should drop the gh-pages objects a full clone already fetched', async () => {
    const { barePath, shas } = await originIn()
    const dir = await prepareCaseFolder(
      { clone: 'dev' },
      barePath,
      join(base, 'clones'),
      0
    )

    const result = await pinFetchRun(dir, [
      '--exclude-gh-pages',
      '--prune',
      '--json'
    ])

    expect(result.exitCode).toBe(OK)
    expect(envelopeOf(result).result.pruned).toBe(true)
    expect(await objectExists(dir, shas.ghPages)).toBe(false)
    expect(await objectExists(dir, shas.main)).toBe(true)
  })

  test('Should keep the gh-pages objects without --prune', async () => {
    const { barePath, shas } = await originIn()
    const dir = await prepareCaseFolder(
      { clone: 'dev' },
      barePath,
      join(base, 'clones'),
      0
    )

    const result = await pinFetchRun(dir, ['--exclude-gh-pages', '--json'])

    expect(envelopeOf(result).result.pruned).toBe(false)
    expect(await objectExists(dir, shas.ghPages)).toBe(true)
  })
})

describe('tim workspace pin-fetch invalid options', () => {
  test.each([
    [[], 'Choose one of --exclude-gh-pages or --pr <number>.'],
    [
      ['--exclude-gh-pages', '--pr', '7'],
      'Choose one of --exclude-gh-pages or --pr <number>.'
    ],
    [['--pr', '7', '--prune'], 'Use --prune only with --exclude-gh-pages.'],
    [
      ['--exclude-gh-pages', '--include-main'],
      'Use --include-main only with --pr <number>.'
    ],
    [['--pr', 'abc'], 'Give --pr a pull request number, such as 42.']
  ])(
    'Should refuse %j with exit 2 and leave the refspec alone',
    async (flags, message) => {
      const { barePath } = await originIn()
      const dir = await prepareCaseFolder(
        { clone: 'dev' },
        barePath,
        join(base, 'clones'),
        0
      )

      const result = await pinFetchRun(dir, flags)

      expect(result.exitCode).toBe(USAGE)
      expect(result.stderr).toBe(message)
      expect((await readPinnedState(dir)).refspecs).toEqual([
        '+refs/heads/*:refs/remotes/origin/*'
      ])
    }
  )
})

describe('#renderPinFetchText', () => {
  test('Should list each refspec indented under the mode and folder', () => {
    expect(
      renderPinFetchText({
        dir: 'repos/x',
        mode: 'exclude',
        refspecs: [
          '+refs/heads/*:refs/remotes/origin/*',
          '^refs/heads/gh-pages'
        ]
      })
    ).toBe(
      'remote.origin.fetch pinned (exclude) for repos/x:\n  +refs/heads/*:refs/remotes/origin/*\n  ^refs/heads/gh-pages'
    )
  })
})

describe('tim workspace pin-fetch --help', () => {
  test('Should name both modes and give examples', async () => {
    const result = await runTimInWorkspace(base, [
      'workspace',
      'pin-fetch',
      '--help'
    ])

    expect(result.stdout).toContain('--exclude-gh-pages')
    expect(result.stdout).toContain('--pr <number>')
    expect(result.stdout).toContain(
      'tim workspace pin-fetch . --exclude-gh-pages --prune'
    )
  })
})
