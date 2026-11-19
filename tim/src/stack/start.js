import { createHash } from 'node:crypto'
import { setTimeout as pause } from 'node:timers/promises'
import { execa } from 'execa'
import { ensureDockerRunning } from '../exec/docker-daemon.js'
import { run } from '../exec/exec.js'
import { composeArgs, devBuildPlatform } from './compose.js'
import { ALL_PROFILES, SERVICES, SIDECARS } from './definition.js'
import { parseStartFlags, StartFlagError, START_USAGE } from './flags.js'
import { githubRepoUrl, stageInitScripts } from './stage-init-scripts.js'

const MONGO = 'mongodb'
const UP_FOR_GOOD = ['up', '--wait', '--detach', '--pull', 'always']
const LABEL_WIDTH = 16
const MAX_TAG_LENGTH = 128
const GIT_NO_SUCH_BRANCH = 2

/**
 * A branch name as the repos tag their branch images with: slashes become
 * dashes, characters a Docker tag cannot hold go, letters are lower-cased,
 * leading dots and dashes go, and it is cut to 128 characters.
 *
 * @param {string} branch
 * @returns {string} Empty when nothing is left
 */
export const sanitiseBranch = (branch) =>
  branch
    .replaceAll('/', '-')
    .replace(/[^a-zA-Z0-9_.-]/g, '')
    .toLowerCase()
    .replace(/^[.-]+/, '')
    .slice(0, MAX_TAG_LENGTH)

const numberOr = (value, fallback) => (value ? Number(value) : fallback)

const labelColumn = (label) => `${label}:`.padEnd(LABEL_WIDTH)

const fingerprintOf = (manifest) =>
  createHash('sha256').update(manifest).digest('hex')

const isRepoImage = (service) =>
  SERVICES.some(({ composeName }) => composeName === service)

const branchAbsentOnGitHub = async ({ repo, branch, env }) => {
  try {
    const listed = await run(
      'git',
      [
        'ls-remote',
        '--exit-code',
        '--heads',
        githubRepoUrl(repo),
        `refs/heads/${branch}`
      ],
      { env: { ...env, GIT_TERMINAL_PROMPT: '0' }, extendEnv: false }
    )
    return listed.exitCode === GIT_NO_SUCH_BRANCH
  } catch (error) {
    if (error.code !== 'MISSING_DEP') throw error
    return false
  }
}

const branchTagFingerprint = async ({ repo, tag, branch, env }) => {
  if (await branchAbsentOnGitHub({ repo, branch, env })) return null
  const manifest = await run(
    'docker',
    ['manifest', 'inspect', `defradigital/${repo}:${tag}`],
    { env, extendEnv: false }
  )
  return manifest.exitCode === 0 ? fingerprintOf(manifest.stdout) : null
}

const probeBranchTags = async ({ services, tag, branch, env }) => {
  const probed = await Promise.all(
    services.map(async ({ label, composeName }) => [
      label,
      await branchTagFingerprint({ repo: composeName, tag, branch, env })
    ])
  )
  return new Map(probed.filter(([, fingerprint]) => fingerprint !== null))
}

const withTag = (env, tagVariable, tag) => ({ ...env, [tagVariable]: tag })

const withoutTag = (env, tagVariable) =>
  Object.fromEntries(
    Object.entries(env).filter(([name]) => name !== tagVariable)
  )

const earlyPulls = ({ compose, output }) => {
  const started = new Map()
  return {
    start: (name, services, env) => {
      if (services.length === 0) return
      started.set(
        name,
        execa(
          'docker',
          [...compose, 'pull', '--quiet', '--ignore-buildable', ...services],
          {
            env,
            extendEnv: false,
            reject: false,
            all: true,
            stdin: 'ignore',
            stripFinalNewline: false,
            cleanup: true
          }
        )
      )
    },
    finish: async (name) => {
      const pull = started.get(name)
      if (!pull) return
      const result = await pull
      if (!result.failed) return
      output.error(
        `the early ${name} image download failed; the stack up below downloads it again`
      )
      output.printError(result.all ?? '')
    },
    stopAll: () => {
      for (const pull of started.values()) pull.kill()
    }
  }
}

const servicesFromConfig = async ({ compose, env, output }) => {
  const config = await run('docker', [...compose, 'config', '--services'], {
    env,
    extendEnv: false
  })
  const services = config.stdout
    .split('\n')
    .filter((line) => line.length > 0)
    .sort()
  if (services.length > 0) return services
  output.error(
    'error: no services resolved from compose config — the compose files may be invalid'
  )
  const reason = config.stderr.replace(/\n+$/, '')
  if (reason) output.error(reason)
  return null
}

const planServices = ({ active, excluded }) => {
  const isExcluded = (label) => excluded.includes(label)
  const left = new Set([
    ...SERVICES.filter(({ label }) => isExcluded(label)).map(
      ({ composeName }) => composeName
    ),
    ...SIDECARS.filter(({ label }) => isExcluded(label)).map(
      ({ composeName }) => composeName
    )
  ])
  const up = active.filter((service) => !left.has(service))
  return {
    isExcluded,
    up,
    repoServices: SERVICES.filter(
      ({ label, composeName }) =>
        !isExcluded(label) && active.includes(composeName)
    ),
    mongo: up.filter((service) => service === MONGO),
    thirdParty: up.filter(
      (service) => service !== MONGO && !isRepoImage(service)
    ),
    branchTagged: up.filter(isRepoImage)
  }
}

const printHeadings = ({ output, profiles, perf, env, tag }) => {
  const { bold, cyan, reset } = output.colours
  output.print(`${bold}Profiles:${reset} ${profiles.join(' ')}\n`)
  if (perf) {
    output.print(
      `${bold}Stub latency:${reset} ${env.STUB_PROFILE || 'sla'} (performance mode)\n`
    )
  }
  if (tag) {
    output.print(`${cyan}Probing Dockerhub for branch tag: ${tag}${reset}\n`)
  }
}

const chooseImages = ({ output, plan, active, dev, tag, branchTags, env }) => {
  const { green, grey, reset } = output.colours
  let chosen = env
  for (const { label, composeName, tagVariable } of SERVICES) {
    if (plan.isExcluded(label)) {
      chosen = withoutTag(chosen, tagVariable)
      output.print(`  ${labelColumn(label)} ${grey}excluded${reset}\n`)
    } else if (!active.includes(composeName)) {
      continue
    } else if (dev) {
      chosen = withoutTag(chosen, tagVariable)
      output.print(`  ${labelColumn(label)} ${green}built (source)${reset}\n`)
    } else if (tag && branchTags.has(label)) {
      chosen = withTag(chosen, tagVariable, tag)
      output.print(`  ${labelColumn(label)} ${green}branch  (${tag})${reset}\n`)
    } else {
      chosen = withoutTag(chosen, tagVariable)
      output.print(`  ${labelColumn(label)} latest\n`)
    }
  }
  return chosen
}

const printRemovedSidecars = ({ output, plan, active }) => {
  const { grey, reset } = output.colours
  for (const { label, composeName, loss } of SIDECARS) {
    if (plan.isExcluded(label) && active.includes(composeName)) {
      output.print(
        `  ${labelColumn(composeName)} ${grey}removed with ${label} - ${loss}${reset}\n`
      )
    }
  }
}

const startMongoFirst = async ({ compose, output, env }) => {
  const attempts = numberOr(env.MONGO_UP_ATTEMPTS, 6)
  const backoffSeconds = numberOr(env.MONGO_RETRY_BACKOFF_SECONDS, 2)
  for (let attempt = 1; ; attempt += 1) {
    const up = await output.docker([...compose, ...UP_FOR_GOOD, MONGO], env, {
      extendEnv: false
    })
    if (up.exitCode === 0) return true
    if (attempt >= attempts) {
      output.error(`mongo failed to start after ${attempts} attempts`)
      return false
    }
    output.error(
      `mongo failed to start (attempt ${attempt}/${attempts}), retrying`
    )
    await run(
      'docker',
      [...compose, 'rm', '--stop', '--force', '--volumes', MONGO],
      { env, extendEnv: false }
    )
    await pause(backoffSeconds * 1000)
  }
}

const recheckOutcome = ({ before, now }) => {
  if (now === undefined) return 'no change'
  if (before === undefined) return 'switched'
  return before === now ? 'no change' : 'updated'
}

const recheckBranchImages = async ({
  output,
  compose,
  plan,
  upArgs,
  tag,
  branch,
  branchTags,
  env
}) => {
  const { green, cyan, reset } = output.colours
  output.print(
    `${cyan}Re-checking Dockerhub for branch images now the stack is healthy: ${tag}${reset}\n`
  )
  const nowTags = await probeBranchTags({
    services: plan.repoServices,
    tag,
    branch,
    env
  })
  let recheckEnv = env
  const recreate = []
  for (const { label, composeName, tagVariable } of plan.repoServices) {
    const outcome = recheckOutcome({
      before: branchTags.get(label),
      now: nowTags.get(label)
    })
    if (outcome === 'no change') {
      output.print(`  ${labelColumn(label)} no change\n`)
      continue
    }
    recheckEnv = withTag(recheckEnv, tagVariable, tag)
    recreate.push(composeName)
    output.print(
      outcome === 'switched'
        ? `  ${labelColumn(label)} ${green}switched to branch (${tag})${reset}\n`
        : `  ${labelColumn(label)} ${green}digest updated${reset}\n`
    )
  }
  if (recreate.length === 0) return 0
  const recreated = await output.docker(
    [...compose, ...upArgs, ...recreate],
    recheckEnv,
    { extendEnv: false }
  )
  return recreated.exitCode
}

const bringUp = async ({ workspaceRoot, flags, output, env, repoUrl }) => {
  const staged = await stageInitScripts({
    workspaceRoot,
    ref: flags.branch,
    stageZap: flags.profiles.includes('security'),
    output,
    repoUrl,
    env
  })
  if (!staged) return 1
  const profiles = flags.profiles.length > 0 ? flags.profiles : ALL_PROFILES
  const stackEnv = flags.dev
    ? { ...env, DEV_BUILD_PLATFORM: await devBuildPlatform({ env }) }
    : env
  const compose = composeArgs({
    workspaceRoot,
    dev: flags.dev,
    perf: flags.perf,
    profiles
  })
  const active = await servicesFromConfig({ compose, env: stackEnv, output })
  if (!active) return 1
  const plan = planServices({ active, excluded: flags.excluded })
  const tag = flags.branch ? sanitiseBranch(flags.branch) : ''
  printHeadings({ output, profiles, perf: flags.perf, env: stackEnv, tag })
  if (flags.branch && !tag) {
    output.error(`error: branch '${flags.branch}' is empty after sanitisation`)
    return 1
  }
  const probesBranches = Boolean(tag) && !flags.dev
  const pulls = earlyPulls({ compose, output })
  try {
    pulls.start('mongo', plan.mongo, stackEnv)
    pulls.start('third-party', plan.thirdParty, stackEnv)
    const branchTags = probesBranches
      ? await probeBranchTags({
          services: plan.repoServices,
          tag,
          branch: flags.branch,
          env: stackEnv
        })
      : new Map()
    const upEnv = chooseImages({
      output,
      plan,
      active,
      dev: flags.dev,
      tag,
      branchTags,
      env: stackEnv
    })
    printRemovedSidecars({ output, plan, active })
    if (plan.up.length === 0) {
      output.error('error: would start no services')
      return 1
    }
    pulls.start('service', plan.branchTagged, upEnv)
    await pulls.finish('mongo')
    if (
      plan.mongo.length > 0 &&
      !(await startMongoFirst({ compose, output, env: upEnv }))
    ) {
      return 1
    }
    await pulls.finish('third-party')
    await pulls.finish('service')
    const upArgs = [...UP_FOR_GOOD, ...(flags.dev ? ['--build'] : [])]
    const up = await output.docker(
      [...compose, ...upArgs, ...flags.extra, ...plan.up],
      upEnv,
      { extendEnv: false }
    )
    if (up.exitCode !== 0 || !probesBranches) return up.exitCode
    return recheckBranchImages({
      output,
      compose,
      plan,
      upArgs: [...upArgs, ...flags.extra],
      tag,
      branch: flags.branch,
      branchTags,
      env: upEnv
    })
  } finally {
    pulls.stopAll()
  }
}

const readFlags = ({ args, output, env }) => {
  try {
    return parseStartFlags(args, { env })
  } catch (error) {
    if (!(error instanceof StartFlagError)) throw error
    output.error(error.message)
    if (error.showUsage) output.printError(START_USAGE)
    return null
  }
}

/**
 * Start the workspace stack and wait until it is healthy, the way
 * `tim docker up` does with the given flags: stage the init scripts, look
 * for each repo's branch image on Dockerhub when given a branch, download
 * images early and side by side, start mongo first (retrying a start that
 * fails, MONGO_UP_ATTEMPTS times, MONGO_RETRY_BACKOFF_SECONDS apart), then
 * the rest. With a branch, it looks again once the stack is healthy and
 * recreates any service whose branch image appeared or changed meanwhile.
 * Each repo's image tag reaches compose in its TRADE_IMPORTS_* variable,
 * which is unset for a service on :latest, built from source or left out.
 * Docker Desktop is started first when it has quit. Early downloads still
 * running are stopped when the start ends or tim is interrupted.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {string[]} [opts.args] - The start flags (see {@link START_USAGE})
 * @param {import('./services.js').StackOutput} opts.output
 * @param {object} [opts.env] - Extra environment for docker and git
 * @param {(repo: string) => string} [opts.repoUrl] - Where an init script missing from repos/ is cloned from
 * @returns {Promise<{exitCode: number, durationMs: number}>} 2 for a wrong flag; else 0, 1 or docker compose up's own exit code
 * @throws {TimError} MISSING_DEP when docker is not installed, and as ensureDockerRunning does
 */
export const startStack = async ({
  workspaceRoot,
  args = [],
  output,
  env = {},
  repoUrl
}) => {
  const started = performance.now()
  const stackEnv = { ...process.env, ...env }
  const finished = (exitCode) => ({
    exitCode,
    durationMs: Math.round(performance.now() - started)
  })
  const flags = readFlags({ args, output, env: stackEnv })
  if (!flags) return finished(2)
  if (flags.help) {
    output.print(START_USAGE)
    return finished(0)
  }
  await ensureDockerRunning({ env })
  return finished(
    await bringUp({ workspaceRoot, flags, output, env: stackEnv, repoUrl })
  )
}
