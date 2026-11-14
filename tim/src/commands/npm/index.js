import { ERROR, OK } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import {
  countPackages,
  listPackages,
  renderCountsText,
  renderPackagesTsv
} from '../../npm-upgrade/queries.js'
import {
  aggregateClassifications,
  renderAggregateText,
  renderVerifyPendingText,
  renderVerifyText,
  setPackageClassification,
  setPackageStatus,
  verifyClassificationCoverage
} from '../../npm-upgrade/writers.js'
import { makeRunAction } from '../_run-action.js'
import { registerAudit } from './audit.js'
import { registerContext } from './context.js'
import { registerExec } from './exec.js'
import { registerDiscover } from './discover.js'
import { writeLine } from '../_write-line.js'

const workspaceRootOf = (opts) =>
  resolveWorkspaceRoot({ explicit: opts.workspace })

const runIdsOf = (opts) => ({
  workspaceRoot: workspaceRootOf(opts),
  runId: opts.runId,
  repo: opts.repo
})

const examplesText = (examples) =>
  `\nExamples:\n${examples.map((example) => `  tim npm packages ${example}`).join('\n')}`

const runOptions = (command) =>
  command
    .option('--run-id <ticket>', 'The run, such as EUDPA-500')
    .option('--repo <name>', 'Only this repo')

const packageOptions = (command) =>
  command
    .option('--run-id <ticket>', 'The run, such as EUDPA-500')
    .option('--repo <name>', 'The repo')
    .option('--package <name>', 'The npm package, such as @hapi/hapi')

const registerList = (packages, { timVersion }) =>
  runOptions(
    packages
      .command('list')
      .description(
        "List an npm upgrade run's packages, one tab-separated line each: repo, package, current, target, upgrade type, dependency type, classification, risk, status, commit and failure reason. A missing run is an error, but gives an empty list with --json."
      )
  )
    .option('--package <name>', 'Only this package')
    .option(
      '--classification <classification>',
      'Only pending (not classified yet), auto or manual'
    )
    .option('--filter <classification>', 'The same as --classification')
    .option('--risk <risk>', 'Only LOW, MEDIUM or HIGH')
    .option(
      '--status <status>',
      'Only pending (no status or todo), todo, inprogress, done or failed'
    )
    .addHelpText(
      'after',
      examplesText([
        'list --run-id EUDPA-500',
        'list --run-id EUDPA-500 --classification manual --json',
        'list --run-id EUDPA-500 --repo trade-imports-animals-frontend --classification auto --status pending --json'
      ])
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          ...runIdsOf(opts),
          packageName: opts.package,
          classification: opts.classification ?? opts.filter,
          risk: opts.risk,
          status: opts.status,
          emptyWhenRunMissing: opts.json === true
        }),
        run: (_context, parsed) => listPackages(parsed),
        renderText: renderPackagesTsv,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )

const registerCounts = (packages, { timVersion }) =>
  runOptions(
    packages
      .command('counts')
      .description(
        "Count an npm upgrade run's packages by classification, by status, by risk for the manual ones and by repo. A missing run is an error, but gives zero counts with --json."
      )
  )
    .addHelpText(
      'after',
      examplesText([
        'counts --run-id EUDPA-500',
        'counts --run-id EUDPA-500 --repo trade-imports-animals-frontend --json'
      ])
    )
    .action(function countsAction(...positional) {
      const { json, runId, repo } = this.optsWithGlobals()
      return makeRunAction({
        parseOptions: (opts) => ({
          ...runIdsOf(opts),
          emptyWhenRunMissing: opts.json === true
        }),
        run: async (_context, parsed) => {
          const counts = countPackages(parsed)
          return json ? counts.summary : counts
        },
        renderText: (counts) => renderCountsText(counts, { runId, repo }),
        exitCodeForError: () => ERROR,
        timVersion
      }).apply(this, positional)
    })

const registerSetStatus = (packages, { timVersion }) =>
  packageOptions(
    packages
      .command('set-status')
      .description(
        "Set one package's implementation status in an npm upgrade run. done and failed stamp the time; done keeps the commit and failed keeps the reason."
      )
  )
    .option('--status <status>', 'todo, inprogress, done or failed')
    .option('--commit-sha <sha>', 'The commit that upgraded it, for done')
    .option('--failure-reason <text>', 'Why it failed, for failed')
    .addHelpText(
      'after',
      examplesText([
        'set-status --run-id EUDPA-500 --repo trade-imports-animals-frontend --package lodash --status done --commit-sha 0123abc',
        'set-status --run-id EUDPA-500 --repo trade-imports-animals-frontend --package lodash --status failed --failure-reason "npm test failed"'
      ])
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          ...runIdsOf(opts),
          packageName: opts.package,
          status: opts.status,
          commitSha: opts.commitSha,
          failureReason: opts.failureReason
        }),
        run: (_context, parsed) => setPackageStatus(parsed),
        renderText: ({ message }) => message,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )

const registerSetClassification = (packages, { timVersion }) =>
  packageOptions(
    packages
      .command('set-classification')
      .description(
        "Classify one package of an npm upgrade run. Each package's classification goes to its own file under the repo's classifications folder, so planners can run at once; aggregate folds them into the packages file."
      )
  )
    .option('--classification <classification>', 'auto or manual')
    .option('--risk <risk>', 'LOW, MEDIUM or HIGH')
    .option('--safe-for-automation <answer>', 'true or false')
    .option('--rationale <text>', 'Why, in one sentence')
    .option(
      '--files-affected <paths>',
      'Comma-separated files to change; an empty one is no files'
    )
    .option('--changes-required <text>', 'What to change, in a sentence or two')
    .option('--changelog-url <url>', "The package's changelog")
    .option('--migration-guide-url <url>', "The package's migration guide")
    .option(
      '--demoted-from-auto <answer>',
      'true when an automatic upgrade failed and the package became manual'
    )
    .addHelpText(
      'after',
      examplesText([
        'set-classification --run-id EUDPA-500 --repo trade-imports-animals-frontend --package lodash --classification auto --risk LOW --safe-for-automation true --rationale "Patch fix only"',
        'set-classification --run-id EUDPA-500 --repo trade-imports-animals-frontend --package @hapi/hapi --classification manual --risk HIGH --safe-for-automation false --rationale "Route options moved" --files-affected "src/server/index.js,src/server/router.js"'
      ])
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          ...runIdsOf(opts),
          packageName: opts.package,
          classification: opts.classification,
          risk: opts.risk,
          safeForAutomation: opts.safeForAutomation,
          rationale: opts.rationale,
          filesAffected: opts.filesAffected,
          changesRequired: opts.changesRequired,
          changelogUrl: opts.changelogUrl,
          migrationGuideUrl: opts.migrationGuideUrl,
          demotedFromAuto: opts.demotedFromAuto
        }),
        run: (_context, parsed) => setPackageClassification(parsed),
        renderText: ({ message }) => message,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )

const registerAggregate = (packages, { timVersion }) =>
  runOptions(
    packages
      .command('aggregate')
      .description(
        "Fold an npm upgrade run's classification files into each repo's packages file. Run it once the planners have finished."
      )
  )
    .addHelpText(
      'after',
      examplesText([
        'aggregate --run-id EUDPA-500',
        'aggregate --run-id EUDPA-500 --repo trade-imports-animals-frontend --json'
      ])
    )
    .action(
      makeRunAction({
        parseOptions: runIdsOf,
        run: (_context, parsed) => aggregateClassifications(parsed),
        renderText: renderAggregateText,
        exitCodeForError: () => ERROR,
        timVersion
      })
    )

const registerVerify = (packages, { timVersion }) =>
  runOptions(
    packages
      .command('verify')
      .description(
        'Check every package of an npm upgrade run is classified. Folds the classification files in first, writing what that did to stderr. Exits 1 and lists the packages still pending when any are.'
      )
  )
    .addHelpText(
      'after',
      examplesText([
        'verify --run-id EUDPA-500',
        'verify --run-id EUDPA-500 --repo trade-imports-animals-frontend --json'
      ])
    )
    .action(function verifyAction(...positional) {
      const { runId, repo } = this.optsWithGlobals()
      return makeRunAction({
        parseOptions: runIdsOf,
        run: (_context, parsed) =>
          verifyClassificationCoverage({
            ...parsed,
            warn: (line) => writeLine(process.stderr, line)
          }),
        renderText: (coverage) => renderVerifyText(coverage, { runId, repo }),
        renderTextError: renderVerifyPendingText,
        exitCodeForResult: ({ pending_count: pendingCount }) =>
          pendingCount === 0 ? OK : ERROR,
        exitCodeForError: () => ERROR,
        timVersion
      }).apply(this, positional)
    })

/**
 * `tim npm`: discover an npm upgrade run's packages, prepare its planners,
 * read and change its state, audit its repos and run npm in them.
 *
 * @param {import('commander').Command} program
 * @param {{timVersion: string}} options
 */
export const register = (program, { timVersion }) => {
  const npm = program
    .command('npm')
    .description(
      'Discover the outdated packages of an npm upgrade run, prepare its planners, read and change its state, audit its repos and run npm in them'
    )
  const packages = npm
    .command('packages')
    .description(
      "List, count, classify and set the status of an npm upgrade run's packages"
    )
  registerList(packages, { timVersion })
  registerCounts(packages, { timVersion })
  registerSetStatus(packages, { timVersion })
  registerSetClassification(packages, { timVersion })
  registerAggregate(packages, { timVersion })
  registerVerify(packages, { timVersion })
  registerDiscover(npm, { timVersion })
  registerContext(npm, { timVersion })
  registerAudit(npm, { timVersion })
  registerExec(npm)
}
