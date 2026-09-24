import { describe, test, expect, afterEach } from 'vitest'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  countRequestRows,
  coverageFor,
  pageUrlPattern,
  readTraceCoverage
} from './coverage.js'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = (name) => join(here, '__fixtures__', name)
const fixtureText = (name) => readFileSync(fixture(name), 'utf8')

const PAGE_PATH = '/notifications/{journeyId}/{slug}'

const matches = (slug, url) =>
  new RegExp(pageUrlPattern({ pagePath: PAGE_PATH, slug })).test(url)

describe('pageUrlPattern', () => {
  test('matches the page it names', () => {
    expect(
      matches('origin', 'http://localhost:3000/notifications/GBN-1/origin')
    ).toBe(true)
  })

  test('matches the page with a query string after it', () => {
    expect(
      matches(
        'origin',
        'http://localhost:3000/notifications/GBN-1/origin?change=1'
      )
    ).toBe(true)
  })

  test('does not match a page nested below it', () => {
    expect(
      matches(
        'commodities',
        'http://localhost:3000/notifications/GBN-1/commodities/identification'
      )
    ).toBe(false)
  })

  test('matches a slug of more than one segment', () => {
    expect(
      matches(
        'commodities/identification',
        'http://localhost:3000/notifications/GBN-1/commodities/identification'
      )
    ).toBe(true)
  })

  test('matches the journey root for the page with an empty slug', () => {
    expect(matches('', 'http://localhost:3000/notifications/GBN-1')).toBe(true)
  })

  test('does not match another page for the page with an empty slug', () => {
    expect(
      matches('', 'http://localhost:3000/notifications/GBN-1/origin')
    ).toBe(false)
  })

  test('treats the id placeholder as exactly one path segment', () => {
    expect(
      matches(
        'origin',
        'http://localhost:3000/notifications/GBN-1/extra/origin'
      )
    ).toBe(false)
  })
})

describe('countRequestRows', () => {
  test('counts one row when the trace has one matching request', () => {
    expect(countRequestRows(fixtureText('requests-one-hit.txt'))).toBe(1)
  })

  test('counts every row when the trace has several', () => {
    expect(countRequestRows(fixtureText('requests-many-hits.txt'))).toBe(4)
  })

  test('counts nothing when the trace has no matching request', () => {
    expect(countRequestRows(fixtureText('requests-no-hits.txt'))).toBe(0)
  })
})

describe('readTraceCoverage', () => {
  const pages = [
    { id: 'dashboard', slug: '' },
    { id: 'origin', slug: 'origin' },
    { id: 'cphNumber', slug: 'cph-number' }
  ]

  const fakeCli = (stdoutByGrep) => {
    const commands = []
    return {
      commands,
      run: async (_command, args) => {
        commands.push(args.slice(1).join(' '))
        const grep = args.at(-1)
        return { stdout: stdoutByGrep[grep] ?? '  No network requests\n' }
      }
    }
  }

  test('reports the pages whose URL the trace requested', async () => {
    const { run } = fakeCli({
      [pageUrlPattern({ pagePath: PAGE_PATH, slug: 'origin' })]: fixtureText(
        'requests-one-hit.txt'
      )
    })

    await expect(
      readTraceCoverage({
        tracePath: '/captures/journey.zip',
        pages,
        pagePath: PAGE_PATH,
        workDir: '/tmp/work',
        run
      })
    ).resolves.toEqual(['origin'])
  })

  test('opens the trace, asks about each page, then closes it', async () => {
    const { commands, run } = fakeCli({})

    await readTraceCoverage({
      tracePath: '/captures/journey.zip',
      pages,
      pagePath: PAGE_PATH,
      workDir: '/tmp/work',
      run
    })

    expect([commands.at(0), commands.length, commands.at(-1)]).toEqual([
      'trace open /captures/journey.zip',
      5,
      'trace close'
    ])
  })

  test('closes the trace even when a query fails', async () => {
    const commands = []
    const run = async (_command, args) => {
      commands.push(args.at(2))
      if (args.at(2) === 'requests') throw new Error('trace is corrupt')
      return { stdout: '' }
    }

    await expect(
      readTraceCoverage({
        tracePath: '/captures/journey.zip',
        pages,
        pagePath: PAGE_PATH,
        workDir: '/tmp/work',
        run
      })
    ).rejects.toThrow('trace is corrupt')
    expect(commands.at(-1)).toBe('close')
  })
})

describe('readTraceCoverage against a real trace', () => {
  let workDir

  afterEach(() => {
    if (workDir) rmSync(workDir, { recursive: true, force: true })
  })

  test('reports the pages the recorded journey actually reached', async () => {
    workDir = mkdtempSync(join(tmpdir(), 'tim-capture-trace-'))

    await expect(
      readTraceCoverage({
        tracePath: fixture('journey-trace.zip'),
        pages: [
          { id: 'dashboard', slug: '' },
          { id: 'origin', slug: 'origin' },
          { id: 'commodities', slug: 'commodities' },
          { id: 'animalIdentification', slug: 'commodities/identification' },
          { id: 'cphNumber', slug: 'cph-number' }
        ],
        pagePath: PAGE_PATH,
        workDir
      })
    ).resolves.toEqual([
      'dashboard',
      'origin',
      'commodities',
      'animalIdentification'
    ])
  }, 60_000)
})

describe('coverageFor', () => {
  const inventory = [
    { section: 'start', id: 'dashboard', slug: '', order: 1 },
    { section: 'origin', id: 'origin', slug: 'origin', order: 2 },
    { section: 'addresses', id: 'cphNumber', slug: 'cph-number', order: 3 }
  ]

  test('marks a page reached and names every trace that reached it', () => {
    const { pages } = coverageFor({
      inventory,
      perTrace: [
        { file: 'journey.zip', reached: ['dashboard', 'origin'] },
        { file: 'origin.zip', reached: ['origin'] }
      ]
    })

    expect(pages.at(1)).toEqual({
      section: 'origin',
      id: 'origin',
      slug: 'origin',
      order: 2,
      reached: true,
      reachedBy: ['journey.zip', 'origin.zip']
    })
  })

  test('lists the pages no trace reached', () => {
    const { gaps, reachedCount, pageCount } = coverageFor({
      inventory,
      perTrace: [{ file: 'journey.zip', reached: ['dashboard', 'origin'] }]
    })

    expect({ gaps: gaps.map(({ id }) => id), reachedCount, pageCount }).toEqual(
      {
        gaps: ['cphNumber'],
        reachedCount: 2,
        pageCount: 3
      }
    )
  })

  test('counts every page as a gap when no trace was recorded', () => {
    const { gaps, reachedCount } = coverageFor({ inventory, perTrace: [] })

    expect({ gaps: gaps.length, reachedCount }).toEqual({
      gaps: 3,
      reachedCount: 0
    })
  })
})
