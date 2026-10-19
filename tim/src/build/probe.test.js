import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  createRepoOnBranchFromMain,
  git as gitIn
} from '../test-support/branched-repo.js'
import { runProbe, invertedText, testCommandFor } from './probe.js'

const PRICES = [
  'export const basePrice = 10',
  'export const vatRate = 0.2',
  'export const unusedDiscount = 0.5',
  ''
].join('\n')

const PRICE_CHECK = [
  "import { basePrice, vatRate } from './src/prices.js'",
  'if (basePrice * (1 + vatRate) !== 12) process.exit(1)',
  ''
].join('\n')

let root
let logsDir

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
  rmSync(logsDir, { recursive: true, force: true })
})

const git = (...args) => gitIn(root, ...args)

const committedRepo = async () => {
  root = mkdtempSync(join(tmpdir(), 'tim-probe-'))
  logsDir = mkdtempSync(join(tmpdir(), 'tim-probe-logs-'))
  await createRepoOnBranchFromMain(root, {
    'package.json': '{ "type": "module" }\n',
    'src/prices.js': PRICES,
    'prices.check.js': PRICE_CHECK
  })
}

const PRICE_TEST = [process.execPath, 'prices.check.js']

const probe = (options) =>
  runProbe({
    repoPath: root,
    file: 'src/prices.js',
    testCommand: PRICE_TEST,
    logsDir,
    ...options
  })

const gitStatus = async () => (await git('status', '--porcelain')).stdout

const verdictOf = ({ redWhenInverted, greenAfterRestore, restored }) => ({
  redWhenInverted,
  greenAfterRestore,
  restored
})

describe('runProbe', () => {
  test('turns red on a line the test witnesses, and green again once the file is back', async () => {
    await committedRepo()

    const outcome = await probe({ inversion: { line: 2 } })

    expect(verdictOf(outcome)).toEqual({
      redWhenInverted: true,
      greenAfterRestore: true,
      restored: true
    })
  })

  test('stays green on a line the test does not witness', async () => {
    await committedRepo()

    const outcome = await probe({ inversion: { line: 3 } })

    expect(verdictOf(outcome)).toEqual({
      redWhenInverted: false,
      greenAfterRestore: true,
      restored: true
    })
  })

  test('applies a search and replace instead of blanking a line', async () => {
    await committedRepo()

    const outcome = await probe({
      inversion: { search: 'basePrice = 10', replace: 'basePrice = 11' }
    })

    expect(outcome.redWhenInverted).toBe(true)
  })

  test('leaves the file byte for byte as git has it, with nothing for git status to show', async () => {
    await committedRepo()

    await probe({ inversion: { line: 2 } })

    expect({
      prices: readFileSync(join(root, 'src', 'prices.js'), 'utf8'),
      status: await gitStatus()
    }).toEqual({ prices: PRICES, status: '' })
  })

  test('writes each run to its own log', async () => {
    await committedRepo()
    writeFileSync(
      join(root, 'prices.check.js'),
      `console.log('checked prices')\n${PRICE_CHECK}`
    )
    await git('commit', '--quiet', '--all', '-m', 'say so')

    const { logs } = await probe({ inversion: { line: 3 } })

    expect([
      readFileSync(logs.inverted, 'utf8').includes('checked prices'),
      readFileSync(logs.restored, 'utf8').includes('checked prices')
    ]).toEqual([true, true])
  })

  test('counts a test run that times out as red', async () => {
    await committedRepo()

    const outcome = await probe({
      inversion: { line: 3 },
      testCommand: [process.execPath, '-e', 'setTimeout(() => {}, 10000)'],
      timeoutMs: 300
    })

    expect(outcome.redWhenInverted).toBe(true)
  })

  test('puts the file back when the test command cannot start', async () => {
    await committedRepo()

    await expect(
      probe({
        inversion: { line: 2 },
        testCommand: ['tim-probe-no-such-command']
      })
    ).rejects.toMatchObject({ code: 'MISSING_DEP' })
    expect(readFileSync(join(root, 'src', 'prices.js'), 'utf8')).toBe(PRICES)
  })

  test('refuses a file with uncommitted changes and leaves them alone', async () => {
    await committedRepo()
    const edited = `${PRICES}export const shipping = 4\n`
    writeFileSync(join(root, 'src', 'prices.js'), edited)

    await expect(probe({ inversion: { line: 2 } })).rejects.toMatchObject({
      code: 'DIRTY_TREE',
      message:
        'src/prices.js has uncommitted changes. Commit them first, so the probe can put the file back exactly as git has it.'
    })
    expect(readFileSync(join(root, 'src', 'prices.js'), 'utf8')).toBe(edited)
  })

  test('refuses a file outside the repo', async () => {
    await committedRepo()

    await expect(
      probe({ file: '../elsewhere.js', inversion: { line: 1 } })
    ).rejects.toMatchObject({
      code: 'USAGE',
      message: `../elsewhere.js is not inside ${root}.`
    })
  })
})

describe('testCommandFor', () => {
  test('runs a Vitest file through npm test without coverage', () => {
    expect(testCommandFor('src/prices.test.js')).toEqual([
      'npm',
      'test',
      '--',
      '--no-coverage',
      'src/prices.test.js'
    ])
  })

  test('runs a FIT spec through the test:fit:ci script', () => {
    expect(testCommandFor('fit/origin.fit.spec.js')).toEqual([
      'npm',
      'run',
      'test:fit:ci',
      '--',
      'fit/origin.fit.spec.js'
    ])
  })

  test('runs a Java test class through mvn verify, unit or integration', () => {
    expect(testCommandFor('src/test/java/uk/gov/NotificationIT.java')).toEqual([
      'mvn',
      '-B',
      'verify',
      '-Dtest=NotificationIT',
      '-Dit.test=NotificationIT',
      '-Dsurefire.failIfNoSpecifiedTests=false',
      '-Dfailsafe.failIfNoSpecifiedTests=false'
    ])
  })

  test('asks for the command when it cannot tell how to run the file', () => {
    expect(() => testCommandFor('tests/plants/origin.spec.ts')).toThrow(
      "Can't tell how to run tests/plants/origin.spec.ts. Give the test command after --, such as: -- npm test -- tests/plants/origin.spec.ts"
    )
  })
})

describe('invertedText', () => {
  test('blanks the one line and keeps the line count', () => {
    expect(invertedText('one\ntwo\nthree\n', { line: 2 }, 'a.js')).toBe(
      'one\n\nthree\n'
    )
  })

  test('refuses a line the file does not have', () => {
    expect(() => invertedText('one\ntwo', { line: 3 }, 'a.js')).toThrow(
      'a.js has 2 lines, so it has no line 3.'
    )
  })

  test('refuses search text that appears more than once', () => {
    expect(() =>
      invertedText(
        'total = 1\ntotal = 1\n',
        { search: 'total = 1', replace: 'total = 2' },
        'a.js'
      )
    ).toThrow(
      'The search text appears 2 times in a.js. Give text that appears exactly once.'
    )
  })

  test('replaces the text literally, whatever it holds', () => {
    expect(
      invertedText(
        'price = 1\n',
        { search: 'price = 1', replace: 'price = $&2' },
        'a.js'
      )
    ).toBe('price = $&2\n')
  })
})
