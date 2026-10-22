import { describe, test, expect, afterEach } from 'vitest'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { GATES_PATH } from '../gates.js'
import { machineFileAfterTune, tuneMachine, tuneTargets } from './tune.js'

let root

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

const writeExecutable = (path, body) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `#!/usr/bin/env bash\n${body}\n`)
  chmodSync(path, 0o755)
}

const PASSING = 'node -e "process.exit(0)" --'

const GATES = {
  'trade-imports-plants-frontend': {
    rungs: [
      { name: 'unit', phase: 'unit', run: 'test' },
      { name: 'fit', phase: 'fit', run: 'test:fit:ci' }
    ]
  },
  'trade-imports-ins-tests': {
    rungs: [
      {
        name: 'e2e',
        phase: 'e2e',
        run: 'test:docker-compose',
        forRepos: ['trade-imports-ins-tests']
      }
    ]
  },
  'trade-imports-animals-frontend': {
    rungs: [{ name: 'fit', phase: 'fit', run: 'test:fit:ci' }]
  },
  'trade-imports-performance-tests': {
    rungs: [
      {
        name: 'e2e-k6',
        phase: 'e2e',
        run: 'test:docker-compose',
        exclusive: true,
        forRepos: ['trade-imports-performance-tests']
      }
    ]
  }
}

const workspaceWith = (cloned) => {
  root = mkdtempSync(join(tmpdir(), 'tim-build-tune-'))
  writeFileSync(join(root, 'Makefile'), 'all:\n')
  mkdirSync(dirname(join(root, GATES_PATH)), { recursive: true })
  writeFileSync(join(root, GATES_PATH), JSON.stringify({ repos: GATES }))
  for (const [folder, scripts] of Object.entries(cloned)) {
    const dir = join(root, 'repos', folder)
    mkdirSync(dir, { recursive: true })
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ name: folder, version: '0.0.0', scripts })
    )
  }
}

const fakeStack = () => {
  const state = join(root, 'stack-state')
  writeExecutable(
    join(root, 'scripts', 'stack', 'run-stack.sh'),
    `echo up > '${state}'`
  )
  writeExecutable(
    join(root, 'scripts', 'stack', 'stop-stack.sh'),
    `rm -f '${state}'`
  )
  writeExecutable(
    join(root, 'fake-bin', 'docker'),
    `if [ "$1" = ps ] && [ -f '${state}' ]; then echo trade-imports-frontend-1; fi`
  )
  return {
    state,
    env: { PATH: `${join(root, 'fake-bin')}:${process.env.PATH}` }
  }
}

const quietMachine = async () => ({
  swapouts: 100,
  shellStartMs: 10,
  containers: []
})

const tune = (env, options = {}) =>
  tuneMachine({
    workspaceRoot: root,
    holder: 'tim build tune (test)',
    counts: [2, 3],
    outDir: join(root, 'tune-out'),
    leasePath: join(root, 'state', 'stack-lease.json'),
    intervalMs: 10,
    sample: quietMachine,
    env,
    ...options
  })

describe('#tuneTargets', () => {
  test('Should list the FIT and E2E rungs of the cloned repos, leaving out unit, performance and missing-script rungs', () => {
    workspaceWith({
      'trade-imports-plants-frontend': {
        test: PASSING,
        'test:fit:ci': PASSING
      },
      'trade-imports-ins-tests': { 'test:docker-compose': PASSING },
      'trade-imports-animals-frontend': { test: PASSING },
      'trade-imports-performance-tests': { 'test:docker-compose': PASSING }
    })

    const targets = tuneTargets(root)

    expect(targets.map(({ repo, name }) => `${repo}/${name}`)).toEqual([
      'trade-imports-plants-frontend/fit',
      'trade-imports-ins-tests/e2e'
    ])
  })
})

describe('#tuneMachine', () => {
  test('Should time each rung at each count, choose a count and give the stack back', async () => {
    workspaceWith({
      'trade-imports-plants-frontend': { 'test:fit:ci': PASSING }
    })
    const { state, env } = fakeStack()

    const result = await tune(env)

    expect({
      tuned: result.tuned,
      rungs: result.rungs.map(({ key, workers, trials }) => ({
        key,
        chosen: workers !== null,
        timed: trials.map(({ workers: count, exitCode }) => [count, exitCode])
      })),
      logs: [2, 3].map((count) =>
        existsSync(
          join(
            root,
            'tune-out',
            `trade-imports-plants-frontend-fit-w${count}.log`
          )
        )
      ),
      stackDown: !existsSync(state)
    }).toEqual({
      tuned: true,
      rungs: [
        {
          key: 'trade-imports-plants-frontend/fit',
          chosen: true,
          timed: [
            [2, 0],
            [3, 0]
          ]
        }
      ],
      logs: [true, true],
      stackDown: true
    })
  })

  test('Should pass each count to the rung as --workers after its scope', async () => {
    workspaceWith({
      'trade-imports-plants-frontend': {
        'test:fit:ci':
          'node -e "console.log(process.argv.slice(1).join(\' \'))" --'
      }
    })
    const { env } = fakeStack()

    await tune(env, { counts: [3] })

    expect(
      readFileSync(
        join(root, 'tune-out', 'trade-imports-plants-frontend-fit-w3.log'),
        'utf8'
      )
    ).toContain('--workers=3')
  })

  test('Should time nothing and leave the stack alone when somebody else holds it', async () => {
    workspaceWith({
      'trade-imports-plants-frontend': { 'test:fit:ci': PASSING }
    })
    const { state, env } = fakeStack()
    writeFileSync(state, 'up')
    const leasePath = join(root, 'state', 'stack-lease.json')
    mkdirSync(dirname(leasePath), { recursive: true })
    writeFileSync(
      leasePath,
      JSON.stringify({
        holder: 'ibl-20261022T120000Z',
        mode: 'dev',
        state: 'up',
        acquiredAt: '2026-10-22T12:00:00.000Z',
        containers: ['trade-imports-frontend-1']
      })
    )

    const result = await tune(env, { leasePath })

    expect({
      tuned: result.tuned,
      refused: result.refused.acquired,
      stackStillUp: existsSync(state),
      timed: existsSync(
        join(root, 'tune-out', 'trade-imports-plants-frontend-fit-w2.log')
      )
    }).toEqual({
      tuned: false,
      refused: false,
      stackStillUp: true,
      timed: false
    })
  })
})

describe('#machineFileAfterTune', () => {
  test("Should set each chosen count, keep the existing file's other settings and keep a rung no count was chosen for", () => {
    const existing = {
      path: '/ws/config/machine.json',
      parallelRepos: 1,
      stackAfterLocal: true,
      workers: {
        'trade-imports-plants-frontend/fit': 4,
        'trade-imports-ins-tests/e2e': 3
      }
    }

    const file = machineFileAfterTune(existing, [
      { key: 'trade-imports-plants-frontend/fit', workers: 3 },
      { key: 'trade-imports-ins-tests/e2e', workers: null }
    ])

    expect({ ...file, $comment: undefined }).toEqual({
      $comment: undefined,
      parallelRepos: 1,
      stackAfterLocal: true,
      workers: {
        'trade-imports-plants-frontend/fit': 3,
        'trade-imports-ins-tests/e2e': 3
      }
    })
  })

  test('Should hold only worker counts when the machine had no file', () => {
    const file = machineFileAfterTune(null, [
      { key: 'trade-imports-animals-frontend/fit', workers: 3 }
    ])

    expect(Object.keys(file)).toEqual(['$comment', 'workers'])
  })
})
