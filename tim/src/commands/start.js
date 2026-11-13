import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { repoPath, realRepoPath } from '../constants/repos.js'
import { resolveWorkspaceRoot } from '../env/workspace-root.js'
import { runStreamed } from '../exec/exec.js'
import { OK, USAGE, ERROR } from '../constants/exitCodes.js'
import { isTimError } from '../errors.js'

const SCHEMA_VERSION = 1

const nodeDevServer = ({ repo, env = {}, description }) => ({
  repo,
  description,
  spawn: (workspaceRoot) => ({
    command: 'npm',
    args: ['--prefix', realRepoPath(workspaceRoot, repo), 'run', 'dev'],
    env
  })
})

const springBootService = ({ repo, env = {}, description }) => ({
  repo,
  description,
  spawn: (workspaceRoot) => ({
    command: 'mvn',
    args: [
      '-f',
      join(repoPath(workspaceRoot, repo), 'pom.xml'),
      'spring-boot:run'
    ],
    env: { SPRING_PROFILES_ACTIVE: 'local', ...env }
  })
})

const needsJavaAndMongo = 'needs Java 25 and MongoDB on port 27017'

const SERVICES = {
  frontend: nodeDevServer({
    repo: 'trade-imports-animals-frontend',
    description:
      'Start the animals frontend dev server from source, on its own default port'
  }),
  backend: springBootService({
    repo: 'trade-imports-animals-backend',
    description:
      'Start the animals backend from source with the local Spring profile, on its own default port'
  }),
  admin: nodeDevServer({
    repo: 'trade-imports-animals-admin',
    env: { PORT: '3001' },
    description: 'Start the animals admin dev server from source, on port 3001'
  }),
  gateway: springBootService({
    repo: 'trade-imports-dynamics-gateway',
    description:
      'Start the dynamics gateway from source with the local Spring profile, on its own default port'
  }),
  'address-book': springBootService({
    repo: 'trade-imports-address-book',
    env: { PORT: '8089' },
    description: `Start the address book API from source, on port 8089 (${needsJavaAndMongo})`
  }),
  'ins-backend': springBootService({
    repo: 'trade-imports-ins-backend',
    env: { PORT: '8090' },
    description: `Start the INS backend API from source, on port 8090 (${needsJavaAndMongo})`
  }),
  'plants-frontend': nodeDevServer({
    repo: 'trade-imports-plants-frontend',
    env: { PORT: '3003' },
    description:
      'Start the plants frontend dev server from source, on port 3003'
  }),
  'plants-backend': springBootService({
    repo: 'trade-imports-plants-backend',
    env: { PORT: '8091' },
    description: `Start the plants backend API from source, on port 8091 (${needsJavaAndMongo})`
  })
}

export const startService = async (workspaceRoot, serviceName) => {
  const service = SERVICES[serviceName]
  if (!service) {
    throw new Error(
      `Unknown service "${serviceName}". Pick one of: ${Object.keys(SERVICES).join(', ')}.`
    )
  }
  const dir = repoPath(workspaceRoot, service.repo)
  if (!existsSync(dir)) {
    throw new Error(
      `${service.repo} is not cloned. Run \`tim workspace setup\` first.`
    )
  }
  const { command, args, env } = service.spawn(workspaceRoot)
  return runStreamed(command, args, { env: { ...process.env, ...env } })
}

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const makeStartAction = (serviceName, { timVersion }) =>
  async function startAction() {
    const globalOpts = this.optsWithGlobals()
    try {
      const workspaceRoot = resolveWorkspaceRoot({
        explicit: globalOpts.workspace
      })
      const result = await startService(workspaceRoot, serviceName)
      if (globalOpts.json) {
        emit(
          JSON.stringify({
            ok: result.exitCode === 0,
            schema_version: SCHEMA_VERSION,
            tim_version: timVersion,
            result: {
              service: serviceName,
              exitCode: result.exitCode,
              durationMs: result.durationMs
            },
            errors:
              result.exitCode === 0
                ? []
                : [
                    {
                      code: 'ERROR',
                      message: `${serviceName} exited ${result.exitCode}`
                    }
                  ]
          })
        )
      }
      process.exit(result.exitCode === 0 ? OK : ERROR)
    } catch (error) {
      if (isTimError(error) && globalOpts.json) {
        emit(
          JSON.stringify({
            ok: false,
            schema_version: SCHEMA_VERSION,
            tim_version: timVersion,
            result: null,
            errors: [{ code: error.code, message: error.message }]
          })
        )
      } else {
        emitError(error.message ?? String(error))
      }
      process.exit(isTimError(error) && error.code === 'USAGE' ? USAGE : ERROR)
    }
  }

export const register = (program, { timVersion }) => {
  const start = program
    .command('start')
    .description('Start a single service from source (foreground process)')

  for (const [name, { description }] of Object.entries(SERVICES)) {
    start
      .command(name)
      .description(description)
      .action(makeStartAction(name, { timVersion }))
  }
}
