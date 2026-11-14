import {
  accessSync,
  constants,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { createSonarClient } from '../../clients/sonar-client.js'
import { run } from '../../exec/exec.js'
import { removeNewUntracked, untrackedPaths } from './artefacts.js'
import { runLogged } from './build-log.js'
import { analysisScope, scopeArguments, sonarPullRequestFor } from './scope.js'

export const PASSED = 0
export const BLOCKED = 2

const NO_TOKEN_HELP = [
  'SONAR_TOKEN not set — skipping local Sonar pre-push check (CI will still run it).',
  '',
  'To enable this check locally:',
  '  1. Generate a personal token at https://sonarcloud.io/account/security',
  '  2. Add it to your shell profile, e.g. in ~/.zshrc:',
  '       export SONAR_TOKEN=<token>',
  '  3. Restart your terminal (or run: source ~/.zshrc)',
  ''
].join('\n')

const DETACHED_HEAD_SKIP = [
  'Detached HEAD with no open PR — skipping local Sonar pre-push check,',
  'as an unnamed analysis would be recorded against main. CI still runs it.',
  ''
].join('\n')

const SCANNER_MISSING_SKIP =
  'sonar-scanner not installed — skipping local Sonar pre-push check (CI will still run it)\n'

const NODE_STEPS = [
  { args: ['ci'], blocked: 'npm ci failed — push blocked\n' },
  {
    args: ['run', '--if-present', 'format:check'],
    blocked:
      '\nFormatting check failed — push blocked. Fix it with:\n  npm run format\nthen amend or add a commit.\n'
  },
  {
    args: ['run', '--if-present', 'lint'],
    blocked:
      '\nLint failed — push blocked. Auto-fixable problems:\n  npm run lint:js:fix\nthen amend or add a commit.\n'
  },
  { args: ['test'], blocked: 'npm test failed — push blocked\n' }
]

const PROJECT_KEY_LINE = /^sonar\.projectKey=/

/**
 * The project key in a repo's sonar-project.properties: every
 * `sonar.projectKey=` line's value. Null when the file or the key is
 * missing.
 *
 * @param {string} dir
 * @returns {string|null}
 */
export const projectKeyIn = (dir) => {
  const propertiesPath = join(dir, 'sonar-project.properties')
  if (!existsSync(propertiesPath)) return null
  const key = readFileSync(propertiesPath, 'utf8')
    .split('\n')
    .filter((line) => PROJECT_KEY_LINE.test(line))
    .map((line) => line.slice(line.indexOf('=') + 1))
    .join('\n')
    .replace(/\n+$/, '')
  return key || null
}

const gitOutput = async (dir, env, args) => {
  const result = await run('git', args, { cwd: dir, env, extendEnv: false })
  return result.exitCode === 0 ? result.stdout : ''
}

const isOnPath = (command, env) =>
  (env.PATH ?? '').split(':').some((folder) => {
    try {
      accessSync(join(folder, command), constants.X_OK)
      return true
    } catch {
      return false
    }
  })

const analysisArguments = ({ token, project, scope }) => [
  `-Dsonar.token=${token}`,
  '-Dsonar.host.url=https://sonarcloud.io',
  '-Dsonar.organization=defra',
  `-Dsonar.projectKey=${project}`,
  '-Dsonar.qualitygate.wait=true',
  ...scopeArguments(scope)
]

const gateFailure = ({ project, scope }) => {
  const key = scope.pullRequest?.key
  const repo = project.replace(/^DEFRA_/, '')
  const flag = key ? ` --pull-request ${key}` : ''
  return [
    '',
    `Local build/test/Sonar quality gate failed — push blocked. See https://sonarcloud.io/dashboard?id=${project}${key ? `&pullRequest=${key}` : ''}`,
    'Which conditions it failed, and the issues behind them:',
    `  tim sonar gate ${repo}${flag} --json`,
    `  tim sonar issues ${repo}${flag} --json`,
    ''
  ].join('\n')
}

const writeVerifiedMarker = async (dir, env) => {
  const head = await gitOutput(dir, env, ['rev-parse', 'HEAD'])
  mkdirSync(join(dir, '.cache'), { recursive: true })
  writeFileSync(
    join(dir, '.cache', 'prepush-verified'),
    head ? `${head}\n` : ''
  )
}

const markVerifiedWhenClean = async (dir, env) => {
  const status = await gitOutput(dir, env, ['status', '--porcelain'])
  if (status === '') await writeVerifiedMarker(dir, env)
}

const outcomeOf = (exitCode, context) => {
  if (exitCode === 0) return 'passed'
  context.writeError(gateFailure(context))
  return 'blocked'
}

const checkJava = async (context) => {
  const exitCode = await runLogged(
    'mvn',
    ['-q', 'clean', 'verify', 'sonar:sonar', ...analysisArguments(context)],
    context
  )
  return outcomeOf(exitCode, context)
}

const checkNode = async (context) => {
  const { env, writeError, dir, removeArtefacts } = context
  if (!isOnPath('sonar-scanner', env)) {
    writeError(SCANNER_MISSING_SKIP)
    return 'skipped'
  }
  for (const step of NODE_STEPS) {
    if ((await runLogged('npm', step.args, context)) !== 0) {
      writeError(step.blocked)
      return 'blocked'
    }
  }
  await removeArtefacts()
  await markVerifiedWhenClean(dir, env)
  const exitCode = await runLogged(
    'sonar-scanner',
    analysisArguments(context),
    context
  )
  return outcomeOf(exitCode, context)
}

const buildAndAnalyse = (context) => {
  if (existsSync(join(context.dir, 'pom.xml'))) return checkJava(context)
  if (existsSync(join(context.dir, 'package.json'))) return checkNode(context)
  return 'skipped'
}

const SIGNAL_EXIT_CODES = { SIGINT: 130, SIGTERM: 143 }

const removeArtefactsOnSignals = (removeArtefacts) => {
  const handlers = Object.entries(SIGNAL_EXIT_CODES).map(
    ([signal, exitCode]) => {
      const handler = async () => {
        await removeArtefacts()
        process.exit(exitCode)
      }
      process.once(signal, handler)
      return [signal, handler]
    }
  )
  return () =>
    handlers.forEach(([signal, handler]) => process.off(signal, handler))
}

const runChecked = async ({ dir, env, writeError, project, scope, token }) => {
  const before = await untrackedPaths(dir, env)
  const removeArtefacts = () => removeNewUntracked(dir, before, env)
  const stopWatchingSignals = removeArtefactsOnSignals(removeArtefacts)
  writeError(
    `Running local Sonar pre-push check for ${project} (this can take a few minutes; needs Docker running for repos with Testcontainers-based integration tests)...\n`
  )
  try {
    return await buildAndAnalyse({
      dir,
      env,
      writeError,
      project,
      scope,
      token,
      removeArtefacts
    })
  } finally {
    await removeArtefacts()
    stopWatchingSignals()
  }
}

const EXIT_CODES = { passed: PASSED, skipped: PASSED, blocked: BLOCKED }

const resultOf = (outcome, { project = null, scope = null } = {}) => ({
  outcome,
  exitCode: EXIT_CODES[outcome],
  project,
  pullRequest: scope?.pullRequest?.key ?? null,
  branch: scope?.pullRequest?.branch ?? scope?.branch ?? null
})

/**
 * The pre-push check for one repo: the build, the tests and a SonarCloud
 * analysis that waits for the quality gate, as CI runs them. Java runs
 * `mvn -q clean verify sonar:sonar`; Node runs `npm ci`, `format:check`,
 * `lint` and `npm test`, writes `.cache/prepush-verified` when the tree is
 * clean, then runs `sonar-scanner`. All its text goes to `writeError`.
 * Untracked paths the check creates are deleted, however it ends.
 *
 * @param {object} args
 * @param {string} args.dir - the repo's top folder
 * @param {Record<string, string|undefined>} args.env - the whole environment the build gets
 * @param {string} [args.token] - the SonarCloud token; the check is skipped without one
 * @param {string} [args.pullRequest] - the pull request to analyse, instead of asking SonarCloud
 * @param {string} [args.base] - that pull request's base branch
 * @param {(text: string) => void} [args.writeError]
 * @returns {Promise<{outcome: 'passed'|'skipped'|'blocked', exitCode: number, project: string|null, pullRequest: string|null, branch: string|null}>}
 */
export const runPushCheck = async ({
  dir,
  env,
  token,
  pullRequest,
  base,
  writeError = (text) => process.stderr.write(text)
}) => {
  if (!token) {
    writeError(NO_TOKEN_HELP)
    return resultOf('skipped')
  }
  const project = projectKeyIn(dir)
  if (!project) return resultOf('skipped')
  const branch = await gitOutput(dir, env, ['branch', '--show-current'])
  const sonarClient = createSonarClient({ token })
  const scope = await analysisScope({
    branch,
    pullRequest,
    base,
    findPullRequest: (forBranch) =>
      sonarPullRequestFor({
        sonarClient,
        project,
        branch: forBranch,
        writeError
      })
  })
  if (!scope) {
    writeError(DETACHED_HEAD_SKIP)
    return resultOf('skipped', { project })
  }
  const outcome = await runChecked({
    dir,
    env,
    writeError,
    project,
    scope,
    token
  })
  return resultOf(outcome, { project, scope })
}
