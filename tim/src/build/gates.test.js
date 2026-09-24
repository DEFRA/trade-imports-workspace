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
        'trade-imports-animals-tests'
      ])
    )
  })

  test('runs the tests repo end to end only through test:docker-compose', () => {
    const gates = loadGates(workspaceRoot)

    const e2eRuns = gates.repos['trade-imports-animals-tests'].rungs
      .filter(({ phase }) => phase === 'e2e')
      .map(({ run }) => run)

    expect(new Set(e2eRuns)).toEqual(new Set(['test:docker-compose']))
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
