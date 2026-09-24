import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  parseDecisionsPage,
  comparePageWithBacklog,
  checkDecisionsPage
} from './decisions-page.js'
import { applyRuling } from './rule.js'

const here = dirname(fileURLToPath(import.meta.url))
const pagePath = join(here, '__fixtures__', 'ledger', 'decisions-page.md')
const backlogFixturePath = join(here, '__fixtures__', 'ledger', 'backlog.json')

const pageMarkdown = () => readFileSync(pagePath, 'utf8')
const backlogFixture = () =>
  JSON.parse(readFileSync(backlogFixturePath, 'utf8'))

const AT = '2026-09-21T10:00:00Z'

/** A backlog with both process defaults applied, matching the page fixture. */
const rulingAppliedBacklog = () => {
  const houseRules = applyRuling({
    backlog: backlogFixture(),
    questionId: 'q-house-rules-source',
    by: 'default',
    at: AT
  })
  const panel = applyRuling({
    backlog: houseRules.backlog,
    questionId: 'q-panel-authority',
    by: 'default',
    at: AT
  })
  return panel.backlog
}

describe('parseDecisionsPage', () => {
  test('the captured live-page excerpt parses to its ids, defaults and blocks (T-P1)', () => {
    const entries = parseDecisionsPage(pageMarkdown())

    expect(entries).toHaveLength(3)
    expect(entries[0]).toMatchObject({
      id: 'q-notification-list-scope',
      defaultInForce: null,
      blocks: ['inc-001']
    })
    expect(entries[1]).toMatchObject({
      id: 'q-house-rules-source',
      defaultInForce: { option: 'A', decision: 'd-001' },
      blocks: []
    })
    expect(entries[2]).toMatchObject({
      id: 'q-panel-authority',
      defaultInForce: { option: 'A', decision: 'd-002' },
      blocks: []
    })
  })

  test('"blocks inc-021, inc-016" parses to both ids (T-P2)', () => {
    const markdown = [
      '### A question',
      '',
      '`q-x` · process · blocks inc-021, inc-016'
    ].join('\n')

    expect(parseDecisionsPage(markdown)[0].blocks).toEqual([
      'inc-021',
      'inc-016'
    ])
  })

  test('"blocks nothing today" parses to [] (T-P2)', () => {
    const markdown = [
      '### A question',
      '',
      '`q-x` · process · blocks nothing today'
    ].join('\n')

    expect(parseDecisionsPage(markdown)[0].blocks).toEqual([])
  })

  test('no blocks segment parses to [] (T-P2)', () => {
    const markdown = [
      '### A question',
      '',
      '`q-x` · process · default in force: A (d-001)'
    ].join('\n')

    expect(parseDecisionsPage(markdown)[0].blocks).toEqual([])
  })
})

describe('comparePageWithBacklog', () => {
  test('a page matching the backlog gives no mismatches (T-P3)', () => {
    const page = parseDecisionsPage(pageMarkdown())
    const backlog = rulingAppliedBacklog()

    expect(comparePageWithBacklog({ page, backlog })).toEqual([])
  })

  test('wrong default letter gives one mismatch naming the id and headline (T-P4)', () => {
    const page = parseDecisionsPage(pageMarkdown())
    page[1].defaultInForce.option = 'B'
    const backlog = rulingAppliedBacklog()

    const mismatches = comparePageWithBacklog({ page, backlog })

    expect(mismatches).toHaveLength(1)
    expect(mismatches[0]).toMatch(/q-house-rules-source/)
  })

  test('wrong decision id gives one mismatch (T-P4)', () => {
    const page = parseDecisionsPage(pageMarkdown())
    page[1].defaultInForce.decision = 'd-999'
    const backlog = rulingAppliedBacklog()

    expect(comparePageWithBacklog({ page, backlog })).toHaveLength(1)
  })

  test('a missing question (present in backlog, awaiting, absent from page) gives one mismatch (T-P4)', () => {
    const page = parseDecisionsPage(pageMarkdown()).filter(
      (entry) => entry.id !== 'q-panel-authority'
    )
    const backlog = rulingAppliedBacklog()

    const mismatches = comparePageWithBacklog({ page, backlog })

    expect(mismatches).toHaveLength(1)
    expect(mismatches[0]).toMatch(/q-panel-authority/)
  })

  test('an unknown question on the page gives one mismatch (T-P4)', () => {
    const page = parseDecisionsPage(pageMarkdown())
    page.push({
      id: 'q-not-real',
      headline: 'Not real',
      defaultInForce: null,
      blocks: [],
      line: 99
    })
    const backlog = rulingAppliedBacklog()

    const mismatches = comparePageWithBacklog({ page, backlog })

    expect(mismatches).toHaveLength(1)
    expect(mismatches[0]).toMatch(/q-not-real/)
  })

  test('a ruled question still listed on the page gives one mismatch (T-P4)', () => {
    const page = parseDecisionsPage(pageMarkdown())
    const ruled = applyRuling({
      backlog: rulingAppliedBacklog(),
      questionId: 'q-notification-list-scope',
      option: 'A',
      by: 'sam',
      at: AT,
      words: 'A',
      note: 'n'
    }).backlog

    const mismatches = comparePageWithBacklog({ page, backlog: ruled })

    expect(
      mismatches.some((line) => /q-notification-list-scope/.test(line))
    ).toBe(true)
  })

  test('a wrong blocked list gives one mismatch (T-P4)', () => {
    const page = parseDecisionsPage(pageMarkdown())
    page[0].blocks = ['inc-999']
    const backlog = rulingAppliedBacklog()

    const mismatches = comparePageWithBacklog({ page, backlog })

    expect(mismatches).toHaveLength(1)
    expect(mismatches[0]).toMatch(/q-notification-list-scope/)
  })

  test('reordering the page sections gives no mismatches (T-P5)', () => {
    const page = [...parseDecisionsPage(pageMarkdown())].reverse()
    const backlog = rulingAppliedBacklog()

    expect(comparePageWithBacklog({ page, backlog })).toEqual([])
  })

  test('the page shows a default but backlog.json has none in force yet gives a mismatch naming it (F16)', () => {
    const page = parseDecisionsPage(pageMarkdown())
    const backlog = backlogFixture()

    const mismatches = comparePageWithBacklog({ page, backlog })

    expect(
      mismatches.some((line) =>
        /q-house-rules-source.*the page says the default in force is A \(d-001\), but backlog\.json has none in force\./.test(
          line
        )
      )
    ).toBe(true)
  })

  test('backlog.json has a default in force but the page shows none gives a mismatch naming it (F16)', () => {
    const page = parseDecisionsPage(pageMarkdown())
    page[1].defaultInForce = null
    const backlog = rulingAppliedBacklog()

    const mismatches = comparePageWithBacklog({ page, backlog })

    expect(
      mismatches.some((line) =>
        /q-house-rules-source.*backlog\.json's default in force is A \(d-001\), but the page shows none\./.test(
          line
        )
      )
    ).toBe(true)
  })
})

describe('checkDecisionsPage (T-P6, T-P7, T-P8)', () => {
  let dir

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'tim-decisions-page-'))
  })

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  const writeBacklog = (backlog) => {
    const path = join(dir, 'backlog.json')
    writeFileSync(path, JSON.stringify(backlog))
    return path
  }

  test('T-P6: throws LINT listing every mismatch at once', () => {
    const page = pageMarkdown().replace(
      'default in force: A (d-001)',
      'default in force: B (d-001)'
    )
    const pageFile = join(dir, 'page.md')
    writeFileSync(pageFile, page)
    const backlogPath = writeBacklog(rulingAppliedBacklog())

    expect(() =>
      checkDecisionsPage({
        profile: { paths: { backlog: backlogPath } },
        pagePath: pageFile
      })
    ).toThrowError(expect.objectContaining({ code: 'LINT' }))
  })

  test('T-P6: a clean check returns matched and questions', () => {
    const pageFile = join(dir, 'page.md')
    writeFileSync(pageFile, pageMarkdown())
    const backlogPath = writeBacklog(rulingAppliedBacklog())

    const result = checkDecisionsPage({
      profile: { paths: { backlog: backlogPath } },
      pagePath: pageFile
    })

    expect(result.matched).toBe(3)
    expect(result.questions).toEqual([
      'q-notification-list-scope',
      'q-house-rules-source',
      'q-panel-authority'
    ])
  })

  test('T-P7: a missing page is NOT_FOUND naming the path', () => {
    const backlogPath = writeBacklog(rulingAppliedBacklog())
    const missingPath = join(dir, 'nope.md')

    expect(() =>
      checkDecisionsPage({
        profile: { paths: { backlog: backlogPath } },
        pagePath: missingPath
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: expect.stringContaining(missingPath)
      })
    )
  })

  test('T-P8: a backlog that fails checkLedger is PARSE, naming the question', () => {
    const pageFile = join(dir, 'page.md')
    writeFileSync(pageFile, pageMarkdown())
    const badBacklog = rulingAppliedBacklog()
    badBacklog.questions[0].headline = ''
    const backlogPath = writeBacklog(badBacklog)

    expect(() =>
      checkDecisionsPage({
        profile: { paths: { backlog: backlogPath } },
        pagePath: pageFile
      })
    ).toThrowError(
      expect.objectContaining({
        code: 'PARSE',
        message: expect.stringContaining('q-notification-list-scope')
      })
    )
  })
})
