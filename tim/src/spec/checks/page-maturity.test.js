import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { parseSpecMarkdown } from '../corpus.js'
import {
  checkPageLine,
  checkPageMaturityMatchesFrontend,
  pageMaturityReader
} from './page-maturity.js'

const PLANTS_FRONTEND = 'trade-imports-plants-frontend'

const specText = (purposeLines) => `# Origin Page Specification

## Purpose

${purposeLines.join('\n\n')}

The page asks where the consignment comes from.

## Requirements

### Requirement: The page asks for the country of origin
**ID**: REQ-ORIGIN-001
The system MUST ask for the country of origin.

#### Scenario: The page shows the country question
**ID**: SCN-ORIGIN-001-A
- **GIVEN** the user is on the origin page
- **WHEN** the page loads
- **THEN** it asks for the country of origin
`

const capabilityAt = (path, purposeLines) => {
  const text = specText(purposeLines)
  return {
    path,
    hasSpec: true,
    specText: text,
    requirements: parseSpecMarkdown(text)
  }
}

let workspaceRoot

const writePageFile = (repo, path, source) => {
  const fullPath = join(workspaceRoot, 'repos', repo, path)
  mkdirSync(dirname(fullPath), { recursive: true })
  writeFileSync(fullPath, source)
}

beforeEach(() => {
  workspaceRoot = mkdtempSync(join(tmpdir(), 'tim-page-maturity-'))
  writePageFile(
    PLANTS_FRONTEND,
    'src/server/app/features/origin/page.js',
    "export const originPage = {\n  id: 'origin',\n  slug: 'origin',\n  maturity: 'agreed'\n}\n"
  )
  writePageFile(
    PLANTS_FRONTEND,
    'src/server/app/features/hub/page.js',
    "export const hubPage = { id: 'hub', maturity: 'exploring' }\n"
  )
})

afterEach(() => {
  rmSync(workspaceRoot, { recursive: true, force: true })
})

const checked = (capability) =>
  checkPageMaturityMatchesFrontend(
    capability,
    pageMaturityReader(workspaceRoot)
  )

describe('#checkPageMaturityMatchesFrontend', () => {
  test('Should pass a page spec whose Maturity matches the page named by its folder', () => {
    const capability = capabilityAt('plants/journey-pages/origin', [
      '**Maturity**: agreed'
    ])

    expect(checked(capability)).toEqual({ findings: [], uncheckedRepos: [] })
  })

  test('Should report a Maturity line that differs from its page, naming the page file', () => {
    const capability = capabilityAt('plants/journey-pages/origin', [
      '**Maturity**: detailing'
    ])

    expect(checked(capability)).toEqual({
      findings: [
        {
          check: 'page-maturity',
          capability: 'plants/journey-pages/origin',
          message:
            'Maturity is detailing, but page "origin" in trade-imports-plants-frontend/src/server/app/features/origin/page.js is agreed. They must match.'
        }
      ],
      uncheckedRepos: []
    })
  })

  test('Should compare with the page its Page line names', () => {
    const capability = capabilityAt('plants/journey-pages/overview', [
      '**Maturity**: agreed',
      '**Page**: hub'
    ])

    expect(checked(capability).findings.map(({ message }) => message)).toEqual([
      'Maturity is agreed, but page "hub" in trade-imports-plants-frontend/src/server/app/features/hub/page.js is exploring. They must match.'
    ])
  })

  test('Should report a page spec whose page no page.js declares', () => {
    const capability = capabilityAt('plants/journey-pages/overview', [
      '**Maturity**: exploring'
    ])

    expect(checked(capability).findings.map(({ message }) => message)).toEqual([
      'No page.js in trade-imports-plants-frontend declares a page with the id "overview". Name the page this spec covers with **Page**: <page id> under ## Purpose.'
    ])
  })

  test('Should report a page id that two page.js files declare, naming both files', () => {
    writePageFile(
      PLANTS_FRONTEND,
      'src/server/app/features/origin-copy/page.js',
      "export const originCopyPage = { id: 'origin', maturity: 'detailing' }\n"
    )
    const capability = capabilityAt('plants/journey-pages/origin', [
      '**Maturity**: agreed'
    ])

    expect(checked(capability).findings.map(({ message }) => message)).toEqual([
      'Page "origin" is declared more than once in trade-imports-plants-frontend: src/server/app/features/origin-copy/page.js, src/server/app/features/origin/page.js. Give each page its own id.'
    ])
  })

  test('Should leave out a page spec whose frontend is not checked out, and report its repo', () => {
    const capability = capabilityAt('ins/journey-pages/address-book', [
      '**Maturity**: exploring'
    ])

    expect(checked(capability)).toEqual({
      findings: [],
      uncheckedRepos: ['trade-imports-ins-frontend']
    })
  })

  test('Should check nothing for an admin page spec or a spec outside journey-pages', () => {
    const results = [
      capabilityAt('admin/journey-pages/search', ['**Maturity**: agreed']),
      capabilityAt('plants/page-titles', [])
    ].map(checked)

    expect(results).toEqual([
      { findings: [], uncheckedRepos: [] },
      { findings: [], uncheckedRepos: [] }
    ])
  })
})

describe('#checkPageLine', () => {
  test('Should pass a page spec with one well-formed Page line, and one with none', () => {
    const findings = [
      capabilityAt('plants/journey-pages/overview', [
        '**Maturity**: exploring',
        '**Page**: hub'
      ]),
      capabilityAt('plants/journey-pages/origin', ['**Maturity**: exploring'])
    ].flatMap(checkPageLine)

    expect(findings).toEqual([])
  })

  test('Should report a Page line that sits outside ## Purpose', () => {
    const capability = capabilityAt('plants/journey-pages/overview', [
      '**Maturity**: exploring'
    ])
    const specText = capability.specText.replace(
      '## Requirements\n',
      '## Requirements\n\n**Page**: hub\n'
    )

    expect(
      checkPageLine({ ...capability, specText }).map(({ message }) => message)
    ).toEqual(['Page line must sit under ## Purpose.'])
  })

  test('Should report a malformed Page line, a repeated one and one outside a page spec', () => {
    const findings = [
      capabilityAt('plants/journey-pages/overview', ['**Page**: the hub']),
      capabilityAt('plants/journey-pages/origin', [
        '**Page**: origin',
        '**Page**: hub'
      ]),
      capabilityAt('plants/page-titles', ['**Page**: hub'])
    ].flatMap(checkPageLine)

    expect(
      findings.map(({ capability, message }) => [capability, message])
    ).toEqual([
      [
        'plants/journey-pages/overview',
        'Page line "**Page**: the hub" must read **Page**: <page id>.'
      ],
      [
        'plants/journey-pages/origin',
        'Page spec has 2 Page lines. It must have one at most.'
      ],
      [
        'plants/page-titles',
        'Only a journey-pages page spec carries a Page line.'
      ]
    ])
  })
})
