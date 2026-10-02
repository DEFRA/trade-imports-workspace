import { describe, test, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import {
  GATES_PATH,
  loadGates,
  looksRemote,
  parseGates,
  planRungs
} from './gates.js'

const here = dirname(fileURLToPath(import.meta.url))
const workspaceRoot = resolve(here, '..', '..', '..')

const gatesWith = (repos) => ({ repos })

const unitRung = (name, run = name) => ({ name, phase: 'unit', run })

const problemsOf = (value) => {
  try {
    parseGates(value)
    return null
  } catch (error) {
    return { code: error.code, message: error.message }
  }
}

const repo = (folder) => ({ folder, path: `/workspace/repos/${folder}` })

const sampleGates = () =>
  parseGates(
    gatesWith({
      'plants-frontend': {
        rungs: [
          unitRung('format', 'format:check'),
          unitRung('unit', 'test'),
          { name: 'fit', phase: 'fit', run: 'test:fit:ci', ports: [3053] }
        ]
      },
      'plants-backend': { rungs: [unitRung('verify', 'mvn verify')] },
      tests: {
        remoteScripts: ['test'],
        rungs: [
          unitRung('lint'),
          {
            name: 'e2e-plants',
            phase: 'e2e',
            run: 'test:docker-compose',
            scope: ['--project=plants'],
            forRepos: ['plants-frontend', 'plants-backend']
          },
          {
            name: 'e2e-animals',
            phase: 'e2e',
            run: 'test:docker-compose',
            scope: ['--project=e2e'],
            forRepos: ['animals-frontend']
          }
        ]
      }
    })
  )

const namesOf = (plan) => plan.map(({ repo, name }) => `${repo}:${name}`)

describe('the workspace gates.json', () => {
  test('passes every check tim makes of it', () => {
    const gates = loadGates(workspaceRoot)

    expect(Object.keys(gates.repos)).toEqual(
      expect.arrayContaining([
        'trade-imports-plants-frontend',
        'trade-imports-plants-backend',
        'trade-imports-ins-tests'
      ])
    )
  })

  test('gives each fit rung the port its test:fit:ci serves on, clear of the workspace stack', () => {
    const gates = loadGates(workspaceRoot)

    const fitPorts = Object.fromEntries(
      Object.entries(gates.repos).flatMap(([folder, { rungs }]) =>
        rungs
          .filter(({ phase }) => phase === 'fit')
          .map(({ ports }) => [folder, ports])
      )
    )

    expect(fitPorts).toEqual({
      'trade-imports-plants-frontend': [3053],
      'trade-imports-animals-frontend': [3050],
      'trade-imports-ins-frontend': [3052]
    })
  })

  test('runs the performance suite, and only it, as an exclusive rung', () => {
    const gates = loadGates(workspaceRoot)

    const exclusive = Object.entries(gates.repos).flatMap(
      ([folder, { rungs }]) =>
        rungs
          .filter(({ exclusive }) => exclusive)
          .map(({ name }) => `${folder}:${name}`)
    )

    expect(exclusive).toEqual(['trade-imports-performance-tests:e2e-k6'])
  })

  test('runs the tests repo end to end only through test:docker-compose', () => {
    const gates = loadGates(workspaceRoot)

    const e2eRuns = gates.repos['trade-imports-ins-tests'].rungs
      .filter(({ phase }) => phase === 'e2e')
      .map(({ run }) => run)

    expect(new Set(e2eRuns)).toEqual(new Set(['test:docker-compose']))
  })

  test('gates the workspace repo itself with tim’s format check, lint and unit tests, run in tim/', () => {
    const gates = loadGates(workspaceRoot)

    const rungs = gates.repos['trade-imports-workspace'].rungs.map(
      ({ name, phase, run, cwd }) => ({ name, phase, run, cwd })
    )

    expect(rungs).toEqual([
      { name: 'format', phase: 'unit', run: 'format:check', cwd: 'tim' },
      { name: 'lint', phase: 'unit', run: 'lint', cwd: 'tim' },
      { name: 'unit', phase: 'unit', run: 'test', cwd: 'tim' }
    ])
  })

  test('runs both end-to-end suites when a backlog builds the workspace, whose stack they run against', () => {
    const gates = loadGates(workspaceRoot)

    const covering = Object.entries(gates.repos).flatMap(
      ([folder, { rungs }]) =>
        rungs
          .filter(({ forRepos }) =>
            forRepos?.includes('trade-imports-workspace')
          )
          .map(({ name }) => `${folder}:${name}`)
    )

    expect(covering).toEqual([
      'trade-imports-performance-tests:e2e-k6',
      'trade-imports-ins-tests:e2e'
    ])
  })

  test('gates every service repo the INS performance-testing backlog builds', () => {
    const gates = loadGates(workspaceRoot)
    const serviceRepos = [
      'trade-imports-stub',
      'trade-imports-defra-id-stub',
      'trade-imports-ins-frontend',
      'trade-imports-animals-frontend',
      'trade-imports-plants-frontend',
      'trade-imports-reference-data',
      'trade-imports-dynamics-gateway'
    ].map(repo)

    const refusals = planRungs({ gates, repos: serviceRepos, phase: 'unit' })
      .filter(({ refusal }) => refusal)
      .map(({ refusal }) => refusal)

    expect(refusals).toEqual([])
  })
})

describe('parseGates', () => {
  test('refuses a rung whose script names CDP', () => {
    const problems = problemsOf(
      gatesWith({ tests: { rungs: [unitRung('smoke', 'test:cdp')] } })
    )

    expect(problems).toEqual({
      code: 'PARSE',
      message: expect.stringContaining(
        '"test:cdp" runs against a remote or CDP environment'
      )
    })
  })

  test("refuses a rung that names one of the repo's remote scripts", () => {
    const problems = problemsOf(
      gatesWith({
        tests: { remoteScripts: ['test'], rungs: [unitRung('unit', 'test')] }
      })
    )

    expect(problems.message).toContain(
      '"test" runs against a remote or CDP environment'
    )
  })

  test('refuses an e2e rung that does not run test:docker-compose', () => {
    const problems = problemsOf(
      gatesWith({
        tests: {
          rungs: [
            {
              name: 'e2e',
              phase: 'e2e',
              run: 'test:journeys',
              forRepos: ['frontend']
            }
          ]
        }
      })
    )

    expect(problems.message).toContain(
      'An e2e rung runs a test:docker-compose script'
    )
  })

  test('refuses an e2e rung that does not say which repos it covers', () => {
    const problems = problemsOf(
      gatesWith({
        tests: {
          rungs: [{ name: 'e2e', phase: 'e2e', run: 'test:docker-compose' }]
        }
      })
    )

    expect(problems.message).toContain('names the repos it covers in forRepos')
  })

  test('refuses an exclusive rung that is not an e2e rung', () => {
    const problems = problemsOf(
      gatesWith({
        frontend: {
          rungs: [{ ...unitRung('unit', 'test'), exclusive: true }]
        }
      })
    )

    expect(problems.message).toContain(
      'Only an e2e rung can be exclusive: an exclusive rung runs against the workspace stack on its own, after every other rung has finished.'
    )
  })

  test('refuses ports on a rung that is not a fit rung', () => {
    const problems = problemsOf(
      gatesWith({
        frontend: { rungs: [{ ...unitRung('unit', 'test'), ports: [3000] }] }
      })
    )

    expect(problems.message).toContain('Only a fit rung takes ports.')
  })

  test('refuses two rungs with the same name in one repo', () => {
    const problems = problemsOf(
      gatesWith({
        frontend: {
          rungs: [unitRung('unit', 'test'), unitRung('unit', 'lint')]
        }
      })
    )

    expect(problems.message).toContain('two rungs are called "unit"')
  })

  test('refuses a run that is neither an npm script name nor mvn verify', () => {
    const problems = problemsOf(
      gatesWith({ backend: { rungs: [unitRung('verify', 'mvn test')] } })
    )

    expect(problems.message).toContain('is not an npm script name')
  })

  test.each(['/tim', '../tim', '.'])(
    'refuses a rung cwd of %s, which is not a folder inside the repo',
    (cwd) => {
      const problems = problemsOf(
        gatesWith({
          workspace: { rungs: [{ ...unitRung('unit', 'test'), cwd }] }
        })
      )

      expect(problems.message).toContain(
        'A rung cwd is a folder inside the repo, such as "tim".'
      )
    }
  )

  test('names the repo each problem belongs to', () => {
    const problems = problemsOf(
      gatesWith({ tests: { rungs: [unitRung('smoke', 'test:cdp')] } })
    )

    expect(problems.message).toContain('repos.tests: rung "smoke"')
  })
})

describe('looksRemote', () => {
  test.each([
    'test:cdp',
    'test:security:active',
    'test:browserstack',
    'probe:cdp-session-reuse',
    'report:publish'
  ])('treats %s as remote', (script) => {
    expect(looksRemote(script)).toBe(true)
  })

  test.each(['test', 'test:docker-compose', 'format:check', 'test:fit:ci'])(
    'treats %s as local',
    (script) => {
      expect(looksRemote(script)).toBe(false)
    }
  )
})

describe('planRungs', () => {
  test('runs every unit rung before any fit rung, then the e2e rungs', () => {
    const plan = planRungs({
      gates: sampleGates(),
      repos: [repo('plants-frontend'), repo('plants-backend'), repo('tests')]
    })

    expect(namesOf(plan)).toEqual([
      'plants-frontend:format',
      'plants-frontend:unit',
      'plants-backend:verify',
      'tests:lint',
      'plants-frontend:fit',
      'tests:e2e-plants'
    ])
  })

  test('keeps the order the backlog lists its repos in', () => {
    const plan = planRungs({
      gates: sampleGates(),
      repos: [repo('plants-backend'), repo('plants-frontend')],
      phase: 'unit'
    })

    expect(namesOf(plan)).toEqual([
      'plants-backend:verify',
      'plants-frontend:format',
      'plants-frontend:unit'
    ])
  })

  test('carries the rung scope and ports through to the plan', () => {
    const plan = planRungs({
      gates: sampleGates(),
      repos: [repo('plants-frontend'), repo('tests')],
      phase: 'all'
    })

    expect(plan.filter(({ phase }) => phase !== 'unit')).toEqual([
      expect.objectContaining({ name: 'fit', ports: [3053], scope: [] }),
      expect.objectContaining({
        name: 'e2e-plants',
        run: 'test:docker-compose',
        scope: ['--project=plants'],
        path: '/workspace/repos/tests'
      })
    ])
  })

  test('runs a rung that names a cwd in that folder of its repo', () => {
    const gates = parseGates(
      gatesWith({
        'trade-imports-workspace': {
          rungs: [{ ...unitRung('lint'), cwd: 'tim' }]
        }
      })
    )

    const plan = planRungs({
      gates,
      repos: [{ folder: 'trade-imports-workspace', path: '/workspace' }],
      phase: 'unit'
    })

    expect(plan).toEqual([
      expect.objectContaining({
        repo: 'trade-imports-workspace',
        name: 'lint',
        path: '/workspace/tim'
      })
    ])
  })

  test('refuses a repo gates.json has no rungs for rather than leaving it out', () => {
    const plan = planRungs({
      gates: sampleGates(),
      repos: [repo('mystery-repo')],
      phase: 'unit'
    })

    expect(plan).toEqual([
      expect.objectContaining({
        repo: 'mystery-repo',
        refusal:
          'gates.json has no rungs for mystery-repo. Add them before building this repo.'
      })
    ])
  })

  test('refuses the e2e phase when no e2e rung covers the built repos', () => {
    const plan = planRungs({
      gates: sampleGates(),
      repos: [repo('tests')],
      phase: 'e2e'
    })

    expect(plan).toEqual([
      expect.objectContaining({
        name: 'e2e',
        refusal: 'No e2e rung in gates.json covers tests.'
      })
    ])
  })

  test('refuses a phase that no repo in the backlog has rungs for', () => {
    const plan = planRungs({
      gates: sampleGates(),
      repos: [repo('plants-backend')],
      phase: 'fit'
    })

    expect(plan).toEqual([
      expect.objectContaining({
        refusal: 'No repo in the backlog has fit rungs in gates.json.'
      })
    ])
  })
})

describe('loadGates', () => {
  test("names the file when the workspace doesn't have one", () => {
    const root = mkdtempSync(join(tmpdir(), 'tim-gates-'))

    expect(() => loadGates(root)).toThrowError(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message: `Can't find ${join(root, GATES_PATH)}.`
      })
    )

    rmSync(root, { recursive: true, force: true })
  })

  test('names the file when it has problems', () => {
    const root = mkdtempSync(join(tmpdir(), 'tim-gates-'))
    mkdirSync(dirname(join(root, GATES_PATH)), { recursive: true })
    writeFileSync(
      join(root, GATES_PATH),
      JSON.stringify(
        gatesWith({ tests: { rungs: [unitRung('x', 'test:cdp')] } })
      )
    )

    expect(() => loadGates(root)).toThrowError(
      expect.objectContaining({
        message: expect.stringContaining(
          `${join(root, GATES_PATH)} has problems:`
        )
      })
    )

    rmSync(root, { recursive: true, force: true })
  })
})
