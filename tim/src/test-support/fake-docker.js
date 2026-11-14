import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execa } from 'execa'
import { TIM_CLI_PATH } from './tim-cli.js'
import { markWorkspaceRoot } from './workspace-marker.js'

const realWorkspaceRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
)

const FAKE_TOOL = `#!/usr/bin/env node
const fs = require('node:fs')
const path = require('node:path')

const dir = __dirname
const tool = path.basename(__filename)
const args = process.argv.slice(2)
const config = JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8'))
const recordedVariable = /^(TRADE_IMPORTS_[A-Z_]+|DEV_BUILD_PLATFORM|GIT_TERMINAL_PROMPT)$/
const env = Object.fromEntries(
  Object.entries(process.env)
    .filter(([name]) => recordedVariable.test(name))
    .sort(([left], [right]) => (left < right ? -1 : 1))
)
fs.appendFileSync(path.join(dir, 'calls.jsonl'), JSON.stringify({ tool, args, env }) + '\\n')

const takeCount = (key) => {
  const file = path.join(dir, 'counters', encodeURIComponent(key))
  const count = fs.existsSync(file) ? Number(fs.readFileSync(file, 'utf8')) : 0
  fs.writeFileSync(file, String(count + 1))
  return count
}
const answerAt = (answers, count) =>
  Array.isArray(answers) ? answers[Math.min(count, answers.length - 1)] : answers
const finish = (exitCode, stdout = '', stderr = '') => {
  process.stdout.write(stdout)
  process.stderr.write(stderr)
  process.exitCode = exitCode
}

const composeParts = (rest) => {
  const profiles = []
  let index = 0
  while (rest[index] === '-f' || rest[index] === '--profile') {
    if (rest[index] === '--profile') profiles.push(rest[index + 1])
    index += 2
  }
  return { profiles, command: rest.slice(index) }
}

const answerCompose = (rest) => {
  const { profiles, command } = composeParts(rest)
  const failure = (config.composeFailures || []).find(
    (candidate) => candidate.command === command.join(' ')
  )
  if (failure && takeCount('compose ' + failure.command) < failure.times) {
    return finish(failure.exitCode ?? 1, '', 'fake docker: compose failed\\n')
  }
  if (command[0] === 'config' && command.includes('--services')) {
    const services = profiles.flatMap((profile) => config.servicesByProfile[profile] || [])
    return finish(0, services.map((service) => service + '\\n').join(''))
  }
  return finish(0)
}

const answerDocker = () => {
  if (args[0] === 'version') {
    return config.serverArch ? finish(0, config.serverArch + '\\n') : finish(1)
  }
  if (args[0] === 'manifest' && args[1] === 'inspect') {
    const reference = args[2]
    const digest = answerAt((config.manifests || {})[reference], takeCount('manifest ' + reference))
    return digest
      ? finish(0, JSON.stringify({ digest }) + '\\n')
      : finish(1, '', 'no such manifest: ' + reference + '\\n')
  }
  if (args[0] === 'compose') return answerCompose(args.slice(1))
  return finish(0)
}

const answerGit = () => {
  if (args[0] === 'ls-remote') {
    const url = args.find((arg) => arg.startsWith('https://'))
    const repo = path.basename(url, '.git')
    return (config.branchesAbsent || []).includes(repo)
      ? finish(2)
      : finish(0, 'fakefakefake\\trefs/heads/branch\\n')
  }
  return finish(128, '', 'fake git: tests reach no network\\n')
}

if (tool === 'docker') answerDocker()
else answerGit()
`

/**
 * The services each profile holds, as the stack's compose files resolve
 * them.
 */
export const STACK_SERVICES_BY_PROFILE = {
  database: ['mongodb'],
  infrastructure: ['cdp-uploader', 'floci', 'floci-init', 'redis'],
  servicebus: ['mssql', 'servicebus-emulator', 'toxiproxy'],
  stubs: ['trade-imports-defra-id-stub', 'trade-imports-stub'],
  backend: [
    'trade-imports-address-book',
    'trade-imports-animals-backend',
    'trade-imports-dynamics-gateway',
    'trade-imports-ins-backend',
    'trade-imports-plants-backend',
    'trade-imports-reference-data'
  ],
  frontend: [
    'animals-frontend-nginx',
    'trade-imports-animals-admin',
    'trade-imports-animals-frontend',
    'trade-imports-ins-frontend',
    'trade-imports-plants-frontend',
    'trade-imports-routing-proxy'
  ],
  security: ['zap'],
  monitoring: ['grafana', 'prometheus']
}

const DEFAULT_FAKE_CONFIG = {
  serverArch: 'arm64',
  servicesByProfile: STACK_SERVICES_BY_PROFILE,
  manifests: {},
  branchesAbsent: [],
  composeFailures: []
}

const writeTool = (path) => {
  writeFileSync(path, FAKE_TOOL)
  chmodSync(path, 0o755)
}

/**
 * A folder holding a fake `docker` and a fake `git`, to put first on PATH.
 * Each records its arguments and the stack's image-tag variables, and
 * answers from `config`; neither reaches Docker or the network.
 *
 * @param {object} [config]
 * @param {string|null} [config.serverArch] - What `docker version` prints; null fails it
 * @param {Record<string, string[]>} [config.servicesByProfile]
 * @param {Record<string, string|null|Array<string|null>>} [config.manifests] - Digest per image reference, or a list answered call by call; null or missing is no such tag
 * @param {string[]} [config.branchesAbsent] - Repos `git ls-remote` reports have no such branch
 * @param {Array<{command: string, times: number, exitCode?: number}>} [config.composeFailures] - Compose subcommands that fail their first `times` calls
 * @returns {{binDir: string, calls: () => Array<{tool: string, args: string[], env: Record<string, string>}>, remove: () => void}}
 */
export const installFakeStackTools = (config = {}) => {
  const binDir = mkdtempSync(join(tmpdir(), 'tim-fake-docker-'))
  mkdirSync(join(binDir, 'counters'))
  writeFileSync(
    join(binDir, 'config.json'),
    JSON.stringify({ ...DEFAULT_FAKE_CONFIG, ...config })
  )
  writeTool(join(binDir, 'docker'))
  writeTool(join(binDir, 'git'))
  const callsPath = join(binDir, 'calls.jsonl')
  return {
    binDir,
    calls: () =>
      existsSync(callsPath)
        ? readFileSync(callsPath, 'utf8')
            .split('\n')
            .filter(Boolean)
            .map((line) => JSON.parse(line))
        : [],
    remove: () => rmSync(binDir, { recursive: true, force: true })
  }
}

const leaksIntoTrace = (name) =>
  /^(TRADE_IMPORTS_|DEV_BUILD_PLATFORM$|STUB_PROFILE$|MONGO_|CI$|NO_COLOR$)/.test(
    name
  )

/**
 * The environment a run against the fake tools gets: this process's,
 * less every variable that changes what the stack does, with the fakes
 * first on PATH and `env` laid over the top.
 *
 * @param {string} binDir - From {@link installFakeStackTools}
 * @param {Record<string, string>} [env]
 * @returns {Record<string, string>}
 */
export const fakeToolsEnv = (binDir, env = {}) => ({
  ...Object.fromEntries(
    Object.entries(process.env).filter(([name]) => !leaksIntoTrace(name))
  ),
  PATH: `${binDir}:${process.env.PATH}`,
  ...env
})

const INIT_SCRIPT_SOURCES = [
  'trade-imports-animals-backend/compose/start-floci.sh',
  'trade-imports-dynamics-gateway/servicebus/setup-notification-pipeline.sh',
  'trade-imports-dynamics-gateway/servicebus/servicebus-config.json',
  'trade-imports-ins-backend/floci/setup-ins-backend-pipeline.sh',
  'trade-imports-ins-tests/zap/automation-context.yaml',
  'trade-imports-ins-tests/zap/automation-passive.yaml',
  'trade-imports-ins-tests/zap/automation-active.yaml'
]

const isGeneratedStackFolder = (source) => source.split('/').includes('.staged')

/**
 * A temporary workspace holding copies of scripts/stack and docker/stack
 * (less docker/stack/.staged), with every init script the stack stages
 * present under repos/, so staging copies and never clones.
 *
 * @returns {{root: string, remove: () => void}}
 */
export const stageStackWorkspace = () => {
  const root = mkdtempSync(join(tmpdir(), 'tim-stack-workspace-'))
  for (const folder of ['scripts/stack', 'docker/stack']) {
    cpSync(join(realWorkspaceRoot, folder), join(root, folder), {
      recursive: true,
      filter: (source) => !isGeneratedStackFolder(source)
    })
  }
  for (const source of INIT_SCRIPT_SOURCES) {
    const path = join(root, 'repos', source)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, `${source}\n`)
  }
  return {
    root,
    remove: () => rmSync(root, { recursive: true, force: true })
  }
}

/**
 * Text with a staged workspace's path, as given or with symlinks resolved,
 * replaced by `<WORKSPACE>`.
 *
 * @param {string} text
 * @param {string} root
 * @returns {string}
 */
export const withWorkspacePlaceholder = (text, root) =>
  text
    .split(existsSync(root) ? realpathSync(root) : root)
    .join('<WORKSPACE>')
    .split(root)
    .join('<WORKSPACE>')

const isConcurrentCall = ({ tool, args }) =>
  (tool === 'git' && args[0] === 'ls-remote') ||
  (tool === 'docker' && args[0] === 'manifest') ||
  (tool === 'docker' && args[0] === 'compose' && args.includes('pull'))

/**
 * Recorded calls split into the ones made one after another, in order, and
 * the ones made side by side (branch probes and image pulls), sorted, so a
 * trace is the same on every run.
 *
 * @param {Array<{tool: string, args: string[], env: Record<string, string>}>} calls
 * @param {string} root - The staged workspace, replaced by `<WORKSPACE>`
 * @returns {{sequence: object[], concurrent: object[]}}
 */
export const traceOf = (calls, root) => {
  const placed = calls.map((call) =>
    JSON.parse(withWorkspacePlaceholder(JSON.stringify(call), root))
  )
  return {
    sequence: placed.filter((call) => !isConcurrentCall(call)),
    concurrent: placed
      .filter(isConcurrentCall)
      .map((call) => JSON.stringify(call))
      .sort()
      .map((call) => JSON.parse(call))
  }
}

/**
 * Every file under a staged workspace's docker/stack/.staged, by its path
 * inside that folder, sorted.
 *
 * @param {string} root
 * @returns {string[]}
 */
export const stagedInitFiles = (root) => {
  const staged = join(root, 'docker', 'stack', '.staged')
  if (!existsSync(staged)) return []
  return readdirSync(staged, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(staged, join(entry.parentPath, entry.name)))
    .sort()
}

const goldenFolder = join(
  realWorkspaceRoot,
  'tim',
  'src',
  'test-support',
  'fixtures',
  'stack'
)

/**
 * One scenario the stack scripts were recorded running, from
 * fixtures/stack/<script>.json.
 *
 * @param {string} script - The script's name less `.sh`, such as "dev-service"
 * @param {string} name - The scenario's name
 * @returns {object}
 */
export const recordedStackScenario = (script, name) =>
  JSON.parse(readFileSync(join(goldenFolder, `${script}.json`), 'utf8')).find(
    (scenario) => scenario.name === name
  )

const isOwnershipCheck = ({ tool, args }) =>
  tool === 'docker' && args[0] === 'ps'

/**
 * Runs `tim docker <args>` against a staged stack workspace with the fake
 * tools first on PATH and no stack lease, and records it in the shape the
 * stack scripts were recorded in. The `docker ps` calls tim makes to find
 * the clone that owns the stack are left out.
 *
 * @param {string[]} args - tim's arguments after `docker`
 * @param {object} [opts]
 * @param {object} [opts.fake] - Config for {@link installFakeStackTools}
 * @param {Record<string, string>} [opts.env]
 * @returns {Promise<{exitCode: number, stdout: string, stderr: string, sequence: object[], concurrent: object[], stagedInitFiles: string[]}>}
 */
export const recordTimStackRun = async (
  args,
  { fake: config, env = {} } = {}
) => {
  const workspace = stageStackWorkspace()
  markWorkspaceRoot(workspace.root)
  const fake = installFakeStackTools(config)
  try {
    const result = await execa(
      'node',
      [TIM_CLI_PATH, '--workspace', workspace.root, 'docker', ...args],
      {
        env: fakeToolsEnv(fake.binDir, {
          TIM_NO_AUTO_PULL: '1',
          TIM_STACK_LEASE: join(fake.binDir, 'stack-lease.json'),
          ...env
        }),
        extendEnv: false,
        reject: false,
        stripFinalNewline: false
      }
    )
    return {
      exitCode: result.exitCode,
      stdout: withWorkspacePlaceholder(result.stdout, workspace.root),
      stderr: withWorkspacePlaceholder(result.stderr, workspace.root),
      ...traceOf(
        fake.calls().filter((call) => !isOwnershipCheck(call)),
        workspace.root
      ),
      stagedInitFiles: stagedInitFiles(workspace.root)
    }
  } finally {
    fake.remove()
    workspace.remove()
  }
}

/**
 * A line for a hand-written fake `docker` that answers
 * `docker compose ... down`: it records "docker compose down" in the calls
 * file, when one is given, then fails with exit 5 or removes the state file
 * that marks the stack up.
 *
 * @param {object} opts
 * @param {string} opts.statePath
 * @param {string} [opts.callsPath]
 * @param {boolean} [opts.fails=false]
 * @returns {string}
 */
export const fakeComposeDownLine = ({ statePath, callsPath, fails = false }) =>
  [
    'case " $* " in *" compose "*" down "*)',
    callsPath ? `echo "docker compose down" >> '${callsPath}';` : '',
    fails ? 'exit 5 ;;' : `rm -f '${statePath}'; exit 0 ;;`,
    'esac'
  ].join(' ')
