import { describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listReport } from '../commands/service-tag/__fixtures__/service-tag-workspace.js'
import { listPlaywrightTests, listSpecs, specsFromReport } from './specs.js'

const report = JSON.parse(listReport)

const filesOf = (specs) => specs.map(({ file, line }) => `${file}:${line}`)

describe('#specsFromReport', () => {
  test('Should list specs from nested suites, a parent suite before its children', () => {
    const specs = specsFromReport(report)

    expect(filesOf(specs)).toEqual([
      'animals/a11y/a11y-scan-detects-violations.spec.ts:9',
      'animals/e2e/features/address-book/address-book-navigation.spec.ts:40',
      'animals/e2e/features/address-book/address-book-navigation.spec.ts:59',
      'animals/e2e/features/address-book/addresses-copied.spec.ts:57',
      'animals-admin/e2e/admin-search.spec.ts:12',
      'ins/e2e/dashboard.spec.ts:8',
      'ins/security/zap-baseline.spec.ts:15',
      'global-setup.spec.ts:3'
    ])
  })

  test('Should give every tag one leading @, and a spec with no tags an empty list', () => {
    const specs = specsFromReport(report)

    expect(specs[2].tags).toEqual([
      '@compose',
      '@ins-frontend',
      '@address-book'
    ])
    expect(specs[4].tags).toEqual([])
  })

  test('Should keep only specs whose first folder is the domain', () => {
    const specs = specsFromReport(report, { domain: 'animals' })

    expect(filesOf(specs)).toHaveLength(4)
    expect(specs.every(({ file }) => file.startsWith('animals/'))).toBe(true)
  })

  test('Should match the type against the second folder only', () => {
    const specs = specsFromReport(report, { type: 'e2e' })

    expect(filesOf(specs)).toEqual([
      'animals/e2e/features/address-book/address-book-navigation.spec.ts:40',
      'animals/e2e/features/address-book/address-book-navigation.spec.ts:59',
      'animals/e2e/features/address-book/addresses-copied.spec.ts:57',
      'animals-admin/e2e/admin-search.spec.ts:12',
      'ins/e2e/dashboard.spec.ts:8'
    ])
  })

  test('Should match a tag exactly, @ included', () => {
    expect(filesOf(specsFromReport(report, { tag: '@address-book' }))).toEqual([
      'animals/e2e/features/address-book/address-book-navigation.spec.ts:40',
      'animals/e2e/features/address-book/address-book-navigation.spec.ts:59',
      'ins/security/zap-baseline.spec.ts:15'
    ])
    expect(specsFromReport(report, { tag: 'address-book' })).toEqual([])
  })
})

describe('#listSpecs', () => {
  test('Should refuse a workspace with no ins-tests clone', async () => {
    const root = mkdtempSync(join(tmpdir(), 'tim-specs-'))

    const listing = listSpecs({ workspaceRoot: root })

    await expect(listing).rejects.toMatchObject({
      code: 'MISSING_DEP',
      message: `No ins-tests clone at ${root}/repos/trade-imports-ins-tests`
    })
    rmSync(root, { recursive: true, force: true })
  })

  test('Should filter the report the list runner gives', async () => {
    const root = mkdtempSync(join(tmpdir(), 'tim-specs-'))
    mkdirSync(join(root, 'repos', 'trade-imports-ins-tests'), {
      recursive: true
    })

    const specs = await listSpecs({
      workspaceRoot: root,
      filters: { type: 'security' },
      listTests: async () => report
    })

    expect(specs).toEqual([
      {
        file: 'ins/security/zap-baseline.spec.ts',
        line: 15,
        title: 'the ZAP baseline scan finds no high alerts',
        tags: ['@security', '@address-book']
      }
    ])
    rmSync(root, { recursive: true, force: true })
  })
})

describe('#listPlaywrightTests', () => {
  test('Should refuse when Playwright prints no readable report', async () => {
    const folder = mkdtempSync(join(tmpdir(), 'tim-specs-'))
    mkdirSync(join(folder, 'node_modules'))

    const listing = listPlaywrightTests(folder)

    await expect(listing).rejects.toMatchObject({ code: 'PARSE' })
    await expect(listing).rejects.toThrow(
      `Playwright did not list the tests in ${folder}`
    )
    rmSync(folder, { recursive: true, force: true })
  })
})
