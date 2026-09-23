import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  linksOf,
  prepareLinkResolution,
  checkLinkFilesExist,
  checkLinkTestsResolve
} from './links.js'

const capabilityWith = (tests) => ({
  path: 'widgets',
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
            name: 'A widget spins',
            coverage: 'full',
            tests
          }
        ]
      }
    ]
  }
})

describe('linksOf', () => {
  test('flattens every link across requirements and scenarios, with its scenario id', () => {
    const link = {
      type: 'unit',
      repo: 'x',
      file: 'a.js',
      test: 't',
      strength: 'full'
    }

    expect(linksOf(capabilityWith([link]))).toEqual([
      { ...link, scenarioId: 'SCN-WIDGET-001-A' }
    ])
  })
})

let root

const writeGates = (repos) => {
  mkdirSync(
    join(root, '.claude', 'skills', 'requirements-pipeline', 'references'),
    {
      recursive: true
    }
  )
  writeFileSync(
    join(
      root,
      '.claude',
      'skills',
      'requirements-pipeline',
      'references',
      'gates.json'
    ),
    JSON.stringify({ repos })
  )
}

const NODE_RUNGS = { rungs: [{ name: 'unit', phase: 'unit', run: 'test' }] }
const JAVA_RUNGS = {
  rungs: [{ name: 'verify', phase: 'unit', run: 'mvn verify' }]
}

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-spec-links-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const fakeRun = async () => ({
  stdout: JSON.stringify([
    {
      name: 'a widget > spins',
      file: join(root, 'repos', 'trade-imports-x', 'src', 'a.test.js')
    }
  ]),
  stderr: '',
  exitCode: 0
})

describe('prepareLinkResolution', () => {
  test('skips both checks for a repo that is not cloned', async () => {
    writeGates({ 'trade-imports-x': NODE_RUNGS })
    const corpus = {
      capabilities: [
        capabilityWith([
          {
            type: 'unit',
            repo: 'trade-imports-x',
            file: 'a.js',
            test: 't',
            strength: 'full'
          }
        ])
      ]
    }

    const resolution = await prepareLinkResolution({
      corpus,
      workspaceRoot: root,
      run: fakeRun
    })

    expect(resolution.cloned.has('trade-imports-x')).toBe(false)
    expect(resolution.skipped).toEqual([
      {
        check: 'link-file',
        repo: 'trade-imports-x',
        reason: 'not cloned under repos/'
      },
      {
        check: 'link-test',
        repo: 'trade-imports-x',
        reason: 'not cloned under repos/'
      }
    ])
  })

  test('skips only link-test for a cloned repo with no node_modules', async () => {
    writeGates({ 'trade-imports-x': NODE_RUNGS })
    mkdirSync(join(root, 'repos', 'trade-imports-x'), { recursive: true })
    const corpus = {
      capabilities: [
        capabilityWith([
          {
            type: 'unit',
            repo: 'trade-imports-x',
            file: 'a.js',
            test: 't',
            strength: 'full'
          }
        ])
      ]
    }

    const resolution = await prepareLinkResolution({
      corpus,
      workspaceRoot: root,
      run: fakeRun
    })

    expect(resolution.cloned.has('trade-imports-x')).toBe(true)
    expect(resolution.skipped).toEqual([
      {
        check: 'link-test',
        repo: 'trade-imports-x',
        reason: 'no node_modules — run npm ci'
      }
    ])
  })

  test('builds a unit index for a cloned, npm-ci-d repo', async () => {
    writeGates({ 'trade-imports-x': NODE_RUNGS })
    mkdirSync(join(root, 'repos', 'trade-imports-x', 'node_modules'), {
      recursive: true
    })
    const corpus = {
      capabilities: [
        capabilityWith([
          {
            type: 'unit',
            repo: 'trade-imports-x',
            file: 'a.js',
            test: 't',
            strength: 'full'
          }
        ])
      ]
    }

    const resolution = await prepareLinkResolution({
      corpus,
      workspaceRoot: root,
      run: fakeRun
    })

    expect(resolution.indexes['trade-imports-x'].unit).toEqual([
      { file: 'src/a.test.js', title: 'spins', fullTitle: 'a widget > spins' }
    ])
    expect(resolution.skipped).toEqual([])
  })

  test('needs no index at all for a Java repo — cloned is enough', async () => {
    writeGates({ 'trade-imports-y': JAVA_RUNGS })
    mkdirSync(join(root, 'repos', 'trade-imports-y'), { recursive: true })
    const corpus = {
      capabilities: [
        capabilityWith([
          {
            type: 'unit',
            repo: 'trade-imports-y',
            file: 'A.java',
            test: 'shouldSpin',
            strength: 'full'
          }
        ])
      ]
    }

    const resolution = await prepareLinkResolution({
      corpus,
      workspaceRoot: root,
      run: fakeRun
    })

    expect(resolution.cloned.has('trade-imports-y')).toBe(true)
    expect(resolution.indexes['trade-imports-y']).toBeUndefined()
    expect(resolution.skipped).toEqual([])
  })
})

describe('checkLinkFilesExist', () => {
  test('flags a link whose file is missing from a cloned repo', () => {
    mkdirSync(join(root, 'repos', 'trade-imports-x'), { recursive: true })
    const cloned = new Set(['trade-imports-x'])
    const capability = capabilityWith([
      {
        type: 'unit',
        repo: 'trade-imports-x',
        file: 'src/missing.js',
        test: 't',
        strength: 'full'
      }
    ])

    expect(checkLinkFilesExist(capability, root, cloned)).toEqual([
      expect.objectContaining({ check: 'link-file', capability: 'widgets' })
    ])
  })

  test('leaves a link alone when its repo is not cloned', () => {
    const capability = capabilityWith([
      {
        type: 'unit',
        repo: 'trade-imports-x',
        file: 'src/missing.js',
        test: 't',
        strength: 'full'
      }
    ])

    expect(checkLinkFilesExist(capability, root, new Set())).toEqual([])
  })

  test('passes a link whose file exists', () => {
    mkdirSync(join(root, 'repos', 'trade-imports-x', 'src'), {
      recursive: true
    })
    writeFileSync(
      join(root, 'repos', 'trade-imports-x', 'src', 'a.test.js'),
      ''
    )
    const capability = capabilityWith([
      {
        type: 'unit',
        repo: 'trade-imports-x',
        file: 'src/a.test.js',
        test: 't',
        strength: 'full'
      }
    ])

    expect(
      checkLinkFilesExist(capability, root, new Set(['trade-imports-x']))
    ).toEqual([])
  })
})

describe('checkLinkTestsResolve', () => {
  test('flags a link whose title does not resolve in the runner index', () => {
    const capability = capabilityWith([
      {
        type: 'unit',
        repo: 'trade-imports-x',
        file: 'src/a.test.js',
        test: 'not the real title',
        strength: 'full'
      }
    ])
    const resolution = {
      gates: { repos: {} },
      cloned: new Set(['trade-imports-x']),
      indexes: {
        'trade-imports-x': {
          unit: [
            {
              file: 'src/a.test.js',
              title: 'spins',
              fullTitle: 'widget > spins'
            }
          ]
        }
      }
    }

    expect(checkLinkTestsResolve(capability, root, resolution)).toEqual([
      expect.objectContaining({ check: 'link-test', capability: 'widgets' })
    ])
  })

  test('passes a link the runner index resolves', () => {
    const capability = capabilityWith([
      {
        type: 'unit',
        repo: 'trade-imports-x',
        file: 'src/a.test.js',
        test: 'spins',
        strength: 'full'
      }
    ])
    const resolution = {
      gates: { repos: {} },
      cloned: new Set(['trade-imports-x']),
      indexes: {
        'trade-imports-x': {
          unit: [
            {
              file: 'src/a.test.js',
              title: 'spins',
              fullTitle: 'widget > spins'
            }
          ]
        }
      }
    }

    expect(checkLinkTestsResolve(capability, root, resolution)).toEqual([])
  })

  test('resolves a Java link by grepping the real source file', () => {
    mkdirSync(join(root, 'repos', 'trade-imports-y', 'src'), {
      recursive: true
    })
    writeFileSync(
      join(root, 'repos', 'trade-imports-y', 'src', 'A.java'),
      'class A { void shouldSpin() {} }'
    )
    const capability = capabilityWith([
      {
        type: 'unit',
        repo: 'trade-imports-y',
        file: 'src/A.java',
        test: 'shouldSpin',
        strength: 'full'
      }
    ])
    const resolution = {
      gates: { repos: { 'trade-imports-y': JAVA_RUNGS } },
      cloned: new Set(['trade-imports-y']),
      indexes: {}
    }

    expect(checkLinkTestsResolve(capability, root, resolution)).toEqual([])
  })
})
