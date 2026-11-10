import { afterEach, describe, expect, test } from 'vitest'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { checkTestTitlesExist, testFileReader } from './test-titles.js'

const REPO = 'widget-frontend'
const TEST_FILE = 'src/widgets/controller.test.js'

const workspaces = []

const workspaceHolding = (files) => {
  const root = mkdtempSync(join(tmpdir(), 'tim-test-titles-'))
  workspaces.push(root)
  Object.entries(files).forEach(([path, source]) => {
    const fullPath = join(root, 'repos', REPO, path)
    mkdirSync(dirname(fullPath), { recursive: true })
    writeFileSync(fullPath, source)
  })
  return root
}

const capabilityLinking = (links) => ({
  path: 'widgets',
  hasSpec: true,
  hasCoverage: true,
  coverageParseError: null,
  coverage: {
    capability: 'widgets',
    areaCode: 'WIDGET',
    specFile: 'openspec/specs/widgets/spec.md',
    requirements: [
      {
        id: 'REQ-WIDGET-001',
        name: 'Widgets spin',
        coverage: 'full',
        scenarios: [
          {
            id: 'SCN-WIDGET-001-A',
            name: 'A widget spins on load',
            coverage: 'full',
            tests: links.map((link) => ({
              type: 'unit',
              repo: REPO,
              file: TEST_FILE,
              strength: 'full',
              ...link
            }))
          }
        ]
      }
    ]
  }
})

const findingsFor = (root, links) =>
  checkTestTitlesExist(capabilityLinking(links), testFileReader(root))

afterEach(() => {
  workspaces.splice(0).forEach((root) => rmSync(root, { recursive: true }))
})

describe('checkTestTitlesExist', () => {
  test('passes a link whose title the file holds word for word', () => {
    const root = workspaceHolding({
      [TEST_FILE]: "test('Should spin the widget on load', () => {})"
    })

    expect(
      findingsFor(root, [{ test: 'Should spin the widget on load' }])
    ).toEqual({ findings: [], uncheckedRepos: [] })
  })

  test('passes a link whose title a %s, $name or template literal title expands to', () => {
    const root = workspaceHolding({
      [TEST_FILE]: [
        "test.each(cases)('Should go to %s', () => {})",
        "test.each(rows)('Should show $label first', () => {})",
        `test(\`Should open the \${page} page\`, () => {})`
      ].join('\n')
    })

    expect(
      findingsFor(root, [
        { test: 'Should go to the review' },
        { test: 'Should show Spinner first' },
        { test: 'Should open the overview page' }
      ]).findings
    ).toEqual([])
  })

  test('passes a link whose title a relatively imported helper registers', () => {
    const root = workspaceHolding({
      [TEST_FILE]:
        "import { itGoesBack } from '../test-support.js'\nitGoesBack()",
      'src/test-support.js':
        "import { cases } from './cases.js'\nexport const itGoesBack = () => test.each(cases)('Should go back to %s', () => {})",
      'src/cases.js': "export const cases = ['the list']"
    })

    expect(
      findingsFor(root, [{ test: 'Should go back to the list' }]).findings
    ).toEqual([])
  })

  test('passes a link whose title is a method name rather than a string', () => {
    const root = workspaceHolding({
      [TEST_FILE]: 'void aWidgetSpinsOnLoad() {}'
    })

    expect(
      findingsFor(root, [{ test: 'aWidgetSpinsOnLoad' }]).findings
    ).toEqual([])
  })

  test('names the scenario and title of a link whose title the file does not hold', () => {
    const root = workspaceHolding({
      [TEST_FILE]: "test('Should spin the widget on load, then stop', () => {})"
    })

    expect(
      findingsFor(root, [{ test: 'Should spin the widget on load' }]).findings
    ).toEqual([
      {
        check: 'test-titles',
        capability: 'widgets',
        message: `SCN-WIDGET-001-A links the test "Should spin the widget on load", which is not in ${REPO}/${TEST_FILE}.`
      }
    ])
  })

  test('names the scenario and file of a link into a file the repo does not hold', () => {
    const root = workspaceHolding({ 'src/other.test.js': '' })

    expect(
      findingsFor(root, [{ test: 'Should spin the widget on load' }]).findings
    ).toEqual([
      {
        check: 'test-titles',
        capability: 'widgets',
        message: `SCN-WIDGET-001-A links ${TEST_FILE}, which is not in ${REPO}.`
      }
    ])
  })

  test('reports a repo that is not checked out instead of checking its links', () => {
    const root = mkdtempSync(join(tmpdir(), 'tim-test-titles-'))
    workspaces.push(root)

    expect(
      findingsFor(root, [{ test: 'Should spin the widget on load' }])
    ).toEqual({ findings: [], uncheckedRepos: [REPO] })
  })
})
