import { mkdirSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { runStreamed } from '../exec/exec.js'
import { DOMAIN_NAMES, servicesForDomain } from './definition.js'
import { stopStack } from './down.js'
import { startStack } from './start.js'

/** Where a verify run keeps each phase's Playwright report. */
export const VERIFY_REPORT_DIR = join('workareas', 'domain-verify')

const TESTS_REPO = join('repos', 'trade-imports-ins-tests')

/** The npm script in trade-imports-ins-tests that runs one domain's suite. */
export const suiteScriptFor = (domain) => `test:docker-compose:${domain}`

const specsIn = (suite, filePath) => {
  const file = suite.file ?? filePath
  return [
    ...(suite.specs ?? []).map((spec) => ({
      id: `${file} > ${spec.title}`,
      status: spec.ok ? 'passed' : 'failed',
      ran: (spec.tests ?? []).some((test) => test.status !== 'skipped')
    })),
    ...(suite.suites ?? []).flatMap((inner) => specsIn(inner, file))
  ]
}

/**
 * What one Playwright JSON report says happened, as a count per outcome and
 * one entry per spec. A spec Playwright never ran is `skipped`, which is a
 * real outcome here: a suite that stops early leaves specs unrun, and those
 * are not evidence the services under test were enough.
 *
 * @param {object} report - A parsed Playwright JSON report
 * @returns {{counts: {passed: number, failed: number, flaky: number, skipped: number}, specs: {id: string, status: string}[]}}
 */
export const outcomesOf = (report) => {
  const specs = (report.suites ?? [])
    .flatMap((suite) => specsIn(suite))
    .map(({ id, status, ran }) => ({ id, status: ran ? status : 'skipped' }))
  const stats = report.stats ?? {}
  return {
    counts: {
      passed: stats.expected ?? 0,
      failed: stats.unexpected ?? 0,
      flaky: stats.flaky ?? 0,
      skipped: stats.skipped ?? 0
    },
    specs: specs.sort((left, right) => (left.id < right.id ? -1 : 1))
  }
}

/**
 * Whether a domain's services were enough for its suite, from the run
 * against them alone: every spec passed and none was left unrun. A failure
 * here is evidence the domain is missing a service its specs reach, but it
 * is not proof — the spec may be broken on any stack. `full` settles that,
 * when a control run against the whole stack is given.
 *
 * @param {object} opts
 * @param {object} opts.subset - outcomesOf the run against the domain's services
 * @param {object} [opts.full] - outcomesOf a control run against the whole stack
 * @returns {{sufficient: boolean, failed: string[], onlyOnFullStack: string[], brokenOnBoth: string[]}}
 */
export const compareOutcomes = ({ subset, full }) => {
  const failedOn = (outcomes) =>
    outcomes.specs
      .filter(({ status }) => status !== 'passed')
      .map(({ id }) => id)
  const failed = failedOn(subset)
  if (!full) {
    return {
      sufficient: failed.length === 0,
      failed,
      onlyOnFullStack: [],
      brokenOnBoth: []
    }
  }
  const alsoFailedOnFull = new Set(failedOn(full))
  const onlyOnFullStack = failed.filter((id) => !alsoFailedOnFull.has(id))
  return {
    sufficient: onlyOnFullStack.length === 0,
    failed,
    onlyOnFullStack,
    brokenOnBoth: failed.filter((id) => alsoFailedOnFull.has(id))
  }
}

/**
 * The lines a verify result prints, in GDS plain English.
 *
 * @param {object} result - What {@link verifyDomain} returned
 * @returns {string[]}
 */
export const verifyLines = ({
  domain,
  services,
  comparison,
  ranAgainstFull
}) => [
  `Domain ${domain}: ${services.length} services`,
  comparison.sufficient
    ? `Every spec passed. The ${domain} services are enough for its suite.`
    : `${comparison.failed.length} spec(s) did not pass against the ${domain} services:`,
  ...(comparison.sufficient ? [] : comparison.failed.map((id) => `  ${id}`)),
  ...(comparison.onlyOnFullStack.length > 0
    ? [
        'These pass on the whole stack, so the domain is missing a service they reach:',
        ...comparison.onlyOnFullStack.map((id) => `  ${id}`),
        'Add it to DOMAIN_SERVICES in tim/src/stack/definition.js.'
      ]
    : []),
  ...(comparison.brokenOnBoth.length > 0
    ? [
        'These fail on the whole stack too, so the domain is not what broke them:',
        ...comparison.brokenOnBoth.map((id) => `  ${id}`)
      ]
    : []),
  ...(!comparison.sufficient && !ranAgainstFull
    ? [
        'Run again with --against-full to find out whether the domain or the spec is at fault.'
      ]
    : [])
]

/**
 * Start the stack for one phase, run the domain's suite against it with the
 * JSON reporter, then take the stack down whatever the suite did, and come
 * back with the parsed report. A null domain starts the whole stack.
 *
 * @param {object} opts
 * @param {string} opts.workspaceRoot
 * @param {string|null} opts.domain
 * @param {string} opts.script - The npm script that runs the suite
 * @param {import('./services.js').StackOutput} opts.output
 * @param {string} [opts.workers] - Passed to Playwright as --workers
 * @returns {Promise<object>} The parsed Playwright JSON report
 * @throws {Error} when the stack will not start, or the suite wrote no report
 */
export const runSuiteAgainstStack = async ({
  workspaceRoot,
  domain,
  script,
  output,
  workers
}) => {
  const reportDir = join(workspaceRoot, VERIFY_REPORT_DIR)
  const reportPath = join(reportDir, `${domain ?? 'full-stack'}.json`)
  mkdirSync(reportDir, { recursive: true })
  rmSync(reportPath, { force: true })
  output.heading(
    `Starting the stack for ${domain ? `domain ${domain}` : 'the whole stack'}...`
  )
  const started = await startStack({
    workspaceRoot,
    args: domain ? ['--domain', domain] : [],
    output
  })
  if (started.exitCode !== 0) {
    throw new Error(
      `the stack for ${domain ?? 'the whole stack'} exited ${started.exitCode}`
    )
  }
  try {
    output.heading(`Running ${script}...`)
    await runStreamed(
      'npm',
      [
        'run',
        script,
        '--',
        '--reporter=json',
        ...(workers ? [`--workers=${workers}`] : [])
      ],
      {
        cwd: join(workspaceRoot, TESTS_REPO),
        env: { ...process.env, PLAYWRIGHT_JSON_OUTPUT_NAME: reportPath },
        reject: false
      }
    )
  } finally {
    await stopStack({ workspaceRoot, output })
  }
  try {
    return JSON.parse(readFileSync(reportPath, 'utf8'))
  } catch {
    throw new Error(
      `${script} wrote no report to ${reportPath}, so the run proved nothing`
    )
  }
}

/**
 * Run one domain's suite against its own services, and optionally against
 * the whole stack, then say whether the domain's services were enough.
 *
 * `runPhase` owns starting the stack, running the suite and taking the
 * stack down; it comes back with the suite's parsed Playwright JSON report.
 *
 * @param {object} opts
 * @param {string} opts.domain - One of {@link DOMAIN_NAMES}
 * @param {boolean} [opts.againstFull=false] - Also run the control against the whole stack
 * @param {(phase: {domain: string|null, script: string}) => Promise<object>} opts.runPhase
 * @returns {Promise<{domain: string, services: string[], comparison: object, ranAgainstFull: boolean}>}
 * @throws {RangeError} when the domain is not one of {@link DOMAIN_NAMES}
 */
export const verifyDomain = async ({
  domain,
  againstFull = false,
  runPhase
}) => {
  if (!DOMAIN_NAMES.includes(domain)) {
    throw new RangeError(
      `unknown domain '${domain}'; valid: ${DOMAIN_NAMES.join(', ')}`
    )
  }
  const script = suiteScriptFor(domain)
  const subset = outcomesOf(await runPhase({ domain, script }))
  const full = againstFull
    ? outcomesOf(await runPhase({ domain: null, script }))
    : undefined
  return {
    domain,
    services: servicesForDomain(domain),
    comparison: compareOutcomes({ subset, full }),
    ranAgainstFull: againstFull
  }
}
