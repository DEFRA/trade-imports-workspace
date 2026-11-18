import { describe, expect, test } from 'vitest'
import { execa } from 'execa'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { ERROR, OK } from '../../constants/exitCodes.js'
import { envelopeOf, TIM_CLI_PATH } from '../../test-support/tim-cli.js'

const fixturePath = (name) =>
  fileURLToPath(new URL(`./__fixtures__/${name}`, import.meta.url))

const goldenBytes = (name) => readFileSync(fixturePath(`__golden__/${name}`))

const goldenRun = (fixture, format) => ({
  stdout: goldenBytes(`${fixture}.${format}.stdout`),
  stderr: goldenBytes(`${fixture}.${format}.stderr`),
  exitCode: Number(goldenBytes(`${fixture}.${format}.exit`).toString())
})

const runExtractExactly = (args) =>
  execa('node', [TIM_CLI_PATH, 'capabilities', 'extract', ...args], {
    reject: false,
    encoding: 'buffer',
    stripFinalNewline: false,
    env: { TIM_NO_AUTO_PULL: '1' }
  })

const runExtract = (args) => runExtractExactly([...args, '--no-ui'])

const asRecorded = ({ stdout, stderr, exitCode }) => ({
  stdout: Buffer.from(stdout),
  stderr: Buffer.from(stderr),
  exitCode
})

const textOf = (run) => ({
  stdout: Buffer.from(run.stdout).toString(),
  stderr: Buffer.from(run.stderr).toString(),
  exitCode: run.exitCode
})

describe('tim capabilities extract', () => {
  describe.each(['canonical', 'violations', 'edges', 'empty'])(
    'the %s map',
    (fixture) => {
      test.each(['list', 'tsv'])(
        'Should print the golden stdout and stderr bytes and exit with the golden code for --format %s',
        async (format) => {
          const run = await runExtract([
            fixturePath(`${fixture}.md`),
            '--format',
            format
          ])

          expect(asRecorded(run)).toEqual(goldenRun(fixture, format))
        }
      )
    }
  )

  test('Should print the list format when no format is given', async () => {
    const run = await runExtract([fixturePath('canonical.md')])

    expect(asRecorded(run)).toEqual(goldenRun('canonical', 'list'))
  })

  test('Should refuse a format other than list or tsv with exit 1', async () => {
    const run = await runExtract([
      fixturePath('canonical.md'),
      '--format',
      'csv'
    ])

    expect(textOf(run)).toEqual({
      stdout: '',
      stderr: "Error: --format must be 'list' or 'tsv', got: csv\n",
      exitCode: ERROR
    })
  })

  test('Should refuse a path that is not a file with exit 1', async () => {
    const missing = fixturePath('no-such-map.md')

    const run = await runExtract([missing])

    expect(textOf(run)).toEqual({
      stdout: '',
      stderr: `Error: file not found: ${missing}\n`,
      exitCode: ERROR
    })
  })

  test('Should report the missing file before a bad format', async () => {
    const missing = fixturePath('no-such-map.md')

    const run = await runExtract(['--format', 'csv', missing])

    expect(textOf(run)).toEqual({
      stdout: '',
      stderr: `Error: file not found: ${missing}\n`,
      exitCode: ERROR
    })
  })

  test('Should refuse a folder as a path that is not a file', async () => {
    const folder = fixturePath('__golden__')

    const run = await runExtract([folder])

    expect(textOf(run)).toEqual({
      stdout: '',
      stderr: `Error: file not found: ${folder}\n`,
      exitCode: ERROR
    })
  })

  test.each([
    ['no file', []],
    ['an empty file argument', ['']]
  ])('Should print the usage line and exit 1 given %s', async (_case, args) => {
    const run = await runExtract(args)

    expect(textOf(run)).toEqual({
      stdout: '',
      stderr:
        'Usage: tim capabilities extract <markdown-file> [--format list|tsv]\n',
      exitCode: ERROR
    })
  })

  test('Should refuse a second file as an unknown argument with exit 1', async () => {
    const map = fixturePath('canonical.md')

    const run = await runExtract([map, map])

    expect(textOf(run)).toEqual({
      stdout: '',
      stderr: `Unknown argument: ${map}\n`,
      exitCode: ERROR
    })
  })

  test.each([
    ['an empty value', [fixturePath('canonical.md'), '--format', '']],
    ['no value', [fixturePath('canonical.md'), '--format']],
    [
      'an empty value before a second file',
      ['--format', '', fixturePath('canonical.md'), fixturePath('canonical.md')]
    ]
  ])(
    'Should refuse --format with %s as needing a value with exit 1',
    async (_case, args) => {
      const run = await runExtract(args)

      expect(textOf(run)).toEqual({
        stdout: '',
        stderr: '--format requires a value\n',
        exitCode: ERROR
      })
    }
  )

  test('Should parse the file that follows an empty file argument', async () => {
    const run = await runExtract(['', fixturePath('canonical.md')])

    expect(asRecorded(run)).toEqual(goldenRun('canonical', 'list'))
  })

  test('Should take --format=tsv as the file and refuse the next file as an unknown argument', async () => {
    const map = fixturePath('canonical.md')

    const run = await runExtract(['--format=tsv', map])

    expect(textOf(run)).toEqual({
      stdout: '',
      stderr: `Unknown argument: ${map}\n`,
      exitCode: ERROR
    })
  })

  test('Should take an unknown option as the file', async () => {
    const run = await runExtract(['--bogus'])

    expect(textOf(run)).toEqual({
      stdout: '',
      stderr: 'Error: file not found: --bogus\n',
      exitCode: ERROR
    })
  })

  test('Should end the options at -- and parse the file that follows it', async () => {
    const run = await runExtractExactly([
      '--no-ui',
      '--',
      fixturePath('canonical.md')
    ])

    expect(asRecorded(run)).toEqual(goldenRun('canonical', 'list'))
  })

  describe('--json', () => {
    test('Should give the rows and violations of a map that is not canonical in tsv format', async () => {
      const run = await runExtract([
        fixturePath('violations.md'),
        '--format',
        'tsv',
        '--json'
      ])

      const { result } = envelopeOf(textOf(run))
      expect({
        exitCode: run.exitCode,
        total: result.total,
        canonical: result.canonical,
        firstRow: result.rows[0],
        lastViolation: result.violations.at(-1)
      }).toEqual({
        exitCode: OK,
        total: 17,
        canonical: false,
        firstRow: {
          code: 'COMMON-CAP-00.1',
          status: '',
          name: 'Sign in',
          verdict: 'ok',
          line: 12
        },
        lastViolation: {
          line: 31,
          code: '?',
          rule: 'row-truncated',
          detail: 'row has fewer than three cells'
        }
      })
    })

    test('Should refuse a map that is not canonical in list format, naming each broken row', async () => {
      const run = await runExtract([fixturePath('edges.md'), '--json'])

      const { ok, errors } = envelopeOf(textOf(run))
      expect({
        exitCode: run.exitCode,
        ok,
        problems: errors[0].problems
      }).toEqual({
        exitCode: ERROR,
        ok: false,
        problems: [
          { scope: 'line 10', message: 'CAP-1.4 status-cell-invalid' },
          { scope: 'line 11', message: 'CAP-1.5 status-cell-invalid' },
          { scope: 'line 14', message: 'CAP-1.8 id-not-clean' }
        ]
      })
    })
  })
})
