import { join } from 'node:path'
import { z } from 'zod'
import { readJsonFile } from '../backlog/io.js'
import { TimError } from '../errors.js'

export const GATES_PATH = join(
  '.claude',
  'skills',
  'requirements-pipeline',
  'references',
  'gates.json'
)

export const PHASES = ['unit', 'fit', 'e2e']

export const MVN_VERIFY = 'mvn verify'

const E2E_SCRIPT = /^test:docker-compose(:[a-z0-9-]+)*$/
const NPM_SCRIPT = /^[a-z0-9][a-z0-9:_-]*$/i
const RUNG_NAME = /^[a-z0-9][a-z0-9-]*$/
const MAX_PORT = 65535

// Words in a script name that mean it reaches past the laptop: a CDP
// environment, BrowserStack, a ZAP scan, a publish. The gate proves a change
// against local code only, so a rung never names one.
const REMOTE_SEGMENTS = new Set([
  'cdp',
  'remote',
  'browserstack',
  'security',
  'zap',
  'perf',
  'publish',
  'probe',
  'purge'
])

/**
 * Whether a script name reads as one that reaches a remote or CDP
 * environment, from the words its `:` and `-` separated parts use.
 *
 * @param {string} script
 * @returns {boolean}
 */
export const looksRemote = (script) =>
  script
    .toLowerCase()
    .split(/[:-]/)
    .some((segment) => REMOTE_SEGMENTS.has(segment))

const rungSchema = z
  .object({
    name: z
      .string()
      .regex(RUNG_NAME, 'A rung name is lowercase letters, digits and "-".'),
    phase: z.enum(PHASES),
    run: z.string().min(1),
    scope: z.array(z.string().min(1)).optional(),
    ports: z.array(z.number().int().min(1).max(MAX_PORT)).optional(),
    forRepos: z.array(z.string().min(1)).min(1).optional()
  })
  .strict()

const repoGatesSchema = z
  .object({
    remoteScripts: z.array(z.string().min(1)).default([]),
    rungs: z.array(rungSchema).min(1)
  })
  .strict()

const rungProblems = (rung, remoteScripts) => {
  const { name, phase, run, ports, forRepos } = rung
  const isMaven = run === MVN_VERIFY
  return [
    !isMaven && !NPM_SCRIPT.test(run)
      ? `"${run}" is not an npm script name or "${MVN_VERIFY}".`
      : null,
    looksRemote(run) || remoteScripts.includes(run)
      ? `"${run}" runs against a remote or CDP environment. The gate only runs local checks.`
      : null,
    phase === 'e2e' && !E2E_SCRIPT.test(run)
      ? `An e2e rung runs a test:docker-compose script against the workspace stack, not "${run}".`
      : null,
    phase === 'e2e' && !forRepos
      ? 'An e2e rung names the repos it covers in forRepos.'
      : null,
    phase !== 'e2e' && forRepos ? 'Only an e2e rung takes forRepos.' : null,
    phase !== 'fit' && ports ? 'Only a fit rung takes ports.' : null
  ]
    .filter(Boolean)
    .map((message) => `rung "${name}": ${message}`)
}

const duplicateNames = (rungs) =>
  rungs
    .map(({ name }) => name)
    .filter((name, index, names) => names.indexOf(name) !== index)

export const gatesSchema = z
  .object({
    $comment: z.string().optional(),
    repos: z.record(z.string().min(1), repoGatesSchema)
  })
  .strict()
  .superRefine(({ repos }, context) => {
    for (const [repo, { remoteScripts, rungs }] of Object.entries(repos)) {
      const problems = [
        ...rungs.flatMap((rung) => rungProblems(rung, remoteScripts)),
        ...duplicateNames(rungs).map(
          (name) => `two rungs are called "${name}".`
        )
      ]
      for (const message of problems) {
        context.addIssue({
          code: 'custom',
          path: ['repos', repo],
          message
        })
      }
    }
  })

/**
 * Check a parsed gates.json against the schema and the remote-script rules.
 *
 * @param {unknown} value
 * @param {string} [source] - Where the value came from, for the message
 * @returns {object} The gates, with defaults filled in
 * @throws {TimError} PARSE — naming every problem found
 */
export const parseGates = (value, source = 'gates.json') => {
  const result = gatesSchema.safeParse(value)
  if (result.success) return result.data
  const problems = result.error.issues.map(
    ({ path, message }) => `  ${path.join('.') || 'gates.json'}: ${message}`
  )
  throw new TimError(
    'PARSE',
    [`${source} has problems:`, ...problems].join('\n')
  )
}

/**
 * Read and check the workspace's gates.json.
 *
 * @param {string} workspaceRoot
 * @returns {object}
 * @throws {TimError} NOT_FOUND or PARSE
 */
export const loadGates = (workspaceRoot) => {
  const path = join(workspaceRoot, GATES_PATH)
  return parseGates(readJsonFile(path), path)
}

const selectedPhases = (phase) => (phase === 'all' ? PHASES : [phase])

const planned = (repo, rung) => ({
  repo: repo.folder,
  path: repo.path,
  name: rung.name,
  phase: rung.phase,
  run: rung.run,
  scope: rung.scope ?? [],
  ports: rung.ports ?? [],
  refusal: null
})

const refused = (repo, name, phase, refusal) => ({
  repo,
  path: null,
  name,
  phase,
  run: null,
  scope: [],
  ports: [],
  refusal
})

const coversBuiltRepo = (rung, folders) =>
  rung.phase !== 'e2e' || rung.forRepos.some((repo) => folders.includes(repo))

const repoPlan = (gates, repo, phase, folders) => {
  const inPhase = gates.repos[repo.folder].rungs.filter(
    (rung) => rung.phase === phase
  )
  const covering = inPhase.filter((rung) => coversBuiltRepo(rung, folders))
  if (phase === 'e2e' && inPhase.length > 0 && covering.length === 0) {
    return [
      refused(
        repo.folder,
        'e2e',
        'e2e',
        `No e2e rung in gates.json covers ${folders.join(', ')}.`
      )
    ]
  }
  return covering.map((rung) => planned(repo, rung))
}

const firstSelectedPhase = (phase) => selectedPhases(phase)[0]

/**
 * The rungs a gate runs, in order: every repo's rungs for one phase before
 * the next phase starts, repos in backlog order, rungs in gates.json order.
 * A repo with no rungs, or an e2e suite with nothing covering the built
 * repos, comes back as a refused entry — never left out.
 *
 * @param {object} args
 * @param {object} args.gates - A parsed gates.json
 * @param {{folder: string, path: string}[]} args.repos - The backlog's repos, in order
 * @param {'unit'|'fit'|'e2e'|'all'} [args.phase]
 * @returns {object[]}
 */
export const planRungs = ({ gates, repos, phase = 'all' }) => {
  const folders = repos.map(({ folder }) => folder)
  const missing = repos
    .filter(({ folder }) => !gates.repos[folder])
    .map(({ folder }) =>
      refused(
        folder,
        'rungs',
        firstSelectedPhase(phase),
        `gates.json has no rungs for ${folder}. Add them before building this repo.`
      )
    )
  const known = repos.filter(({ folder }) => gates.repos[folder])
  const rungs = selectedPhases(phase).flatMap((selected) =>
    known.flatMap((repo) => repoPlan(gates, repo, selected, folders))
  )
  const plan = [...missing, ...rungs]
  if (plan.length > 0) return plan
  return [
    refused(
      folders.join(', ') || 'none',
      phase,
      firstSelectedPhase(phase),
      `No repo in the backlog has ${phase === 'all' ? 'any' : phase} rungs in gates.json.`
    )
  ]
}
