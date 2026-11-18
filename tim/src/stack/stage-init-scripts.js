import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  statSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { run } from '../exec/exec.js'
import { stackDir } from './definition.js'

const STAGED_FOLDERS = ['mongodb', 'floci', 'servicebus', 'zap']
const MONGO_SETUP = join('scripts', 'mongodb', '10-database-setup.js')

const stagedRepos = ({ stageZap }) => [
  {
    repo: 'trade-imports-animals-backend',
    paths: [['compose/start-floci.sh', 'floci']]
  },
  {
    repo: 'trade-imports-dynamics-gateway',
    paths: [
      ['servicebus/setup-notification-pipeline.sh', 'floci'],
      ['servicebus/servicebus-config.json', 'servicebus']
    ]
  },
  {
    repo: 'trade-imports-ins-backend',
    paths: [['floci/setup-ins-backend-pipeline.sh', 'floci']]
  },
  ...(stageZap
    ? [
        {
          repo: 'trade-imports-ins-tests',
          paths: [
            ['zap/automation-context.yaml', 'zap'],
            ['zap/automation-passive.yaml', 'zap'],
            ['zap/automation-active.yaml', 'zap']
          ]
        }
      ]
    : [])
]

/**
 * Where the stack's init scripts are cloned from when repos/ lacks them.
 *
 * @param {string} repo
 * @returns {string}
 */
export const githubRepoUrl = (repo) => `https://github.com/DEFRA/${repo}.git`

const copyInto = (source, destination) => {
  const target = statSync(source).isDirectory()
    ? destination
    : join(destination, basename(source))
  cpSync(source, target, { recursive: true })
}

const emptyFolder = (folder) => {
  for (const entry of readdirSync(folder)) {
    if (!entry.startsWith('.')) {
      rmSync(join(folder, entry), { recursive: true, force: true })
    }
  }
}

const cloneSparse = async ({ url, ref, clone, env }) => {
  const cloneArgs = [
    'clone',
    '--quiet',
    '--depth',
    '1',
    '--filter=blob:none',
    '--sparse'
  ]
  if (ref) {
    const onBranch = await run(
      'git',
      [...cloneArgs, '--branch', ref, url, clone],
      { env }
    )
    if (onBranch.exitCode === 0) return { cloned: true, resolvedRef: ref }
  }
  const onDefault = await run('git', [...cloneArgs, url, clone], { env })
  return {
    cloned: onDefault.exitCode === 0,
    resolvedRef: 'the default branch',
    stdout: onDefault.stdout,
    stderr: onDefault.stderr
  }
}

const writeCaptured = (output, { stdout, stderr }) => {
  if (stdout) output.print(`${stdout}\n`)
  if (stderr) output.printError(`${stderr}\n`)
}

const fetchFromGitHub = async ({
  repo,
  ref,
  missing,
  output,
  repoUrl,
  env
}) => {
  const url = repoUrl(repo)
  const scratch = mkdtempSync(join(tmpdir(), 'tim-stage-'))
  const clone = join(scratch, 'clone')
  try {
    const cloned = await cloneSparse({ url, ref, clone, env })
    if (!cloned.cloned) {
      writeCaptured(output, cloned)
      output.error(
        `error: cannot clone ${url} — offline? Run 'tim workspace setup' to clone repos/ instead.`
      )
      return false
    }
    const sparse = await run(
      'git',
      [
        '-C',
        clone,
        'sparse-checkout',
        'set',
        '--no-cone',
        ...missing.map(([path]) => `/${path}`)
      ],
      { env }
    )
    if (sparse.stderr) output.printError(`${sparse.stderr}\n`)
    for (const [path, destination] of missing) {
      if (!existsSync(join(clone, path))) {
        output.error(
          `error: ${repo}: path '${path}' not found in ${repo}@${cloned.resolvedRef}`
        )
        return false
      }
      copyInto(join(clone, path), destination)
    }
    return true
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

const stageRepo = async ({
  workspaceRoot,
  repo,
  paths,
  ref,
  staged,
  output,
  repoUrl,
  env
}) => {
  const missing = []
  for (const [path, folder] of paths) {
    const source = join(workspaceRoot, 'repos', repo, path)
    const destination = join(staged, folder)
    if (existsSync(source)) {
      copyInto(source, destination)
    } else {
      output.print(
        `Fetching ${repo}/${path} from GitHub (not present under repos/)\n`
      )
      missing.push([path, destination])
    }
  }
  if (missing.length === 0) return true
  return fetchFromGitHub({ repo, ref, missing, output, repoUrl, env })
}

/**
 * Rebuild docker/stack/.staged from the repos that own the stack's init
 * scripts: each from repos/<repo> when it is there, else from one sparse
 * clone of the repo on GitHub, on `ref` when that branch exists and on the
 * default branch otherwise. Repos are staged side by side. Each staged
 * folder is emptied and refilled, never removed, so a container that has
 * one mounted keeps it. The ZAP plans are staged only when `stageZap` is
 * set.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {string} [opts.ref] - The branch to clone, when a repo is cloned
 * @param {boolean} [opts.stageZap=false]
 * @param {{print: (text: string) => void, printError: (text: string) => void, error: (line: string) => void}} opts.output
 * @param {(repo: string) => string} [opts.repoUrl=githubRepoUrl]
 * @param {Record<string, string | undefined>} [opts.env=process.env]
 * @returns {Promise<boolean>} Whether every script was staged
 */
export const stageInitScripts = async ({
  workspaceRoot,
  ref = '',
  stageZap = false,
  output,
  repoUrl = githubRepoUrl,
  env = process.env
}) => {
  const stack = stackDir(workspaceRoot)
  const staged = join(stack, '.staged')
  for (const folder of STAGED_FOLDERS) {
    mkdirSync(join(staged, folder), { recursive: true })
  }
  for (const folder of STAGED_FOLDERS) {
    if (folder !== 'zap' || stageZap) emptyFolder(join(staged, folder))
  }
  const mongoSetup = join(stack, MONGO_SETUP)
  if (!existsSync(mongoSetup)) {
    output.error(`error: cannot find ${mongoSetup}`)
    return false
  }
  copyInto(mongoSetup, join(staged, 'mongodb'))
  const results = await Promise.all(
    stagedRepos({ stageZap }).map(({ repo, paths }) =>
      stageRepo({
        workspaceRoot,
        repo,
        paths,
        ref,
        staged,
        output,
        repoUrl,
        env
      })
    )
  )
  return results.every(Boolean)
}
