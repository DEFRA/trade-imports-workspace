import { Option } from 'commander'
import { realpathSync } from 'node:fs'
import { ERROR, USAGE } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { isTimError } from '../../errors.js'
import { refreshLockfile } from '../../npm-upgrade/refresh-lockfile.js'
import { StepFailed } from '../../npm-upgrade/repo-commands.js'
import { resetOverrides } from '../../npm-upgrade/reset-overrides.js'
import { runAutomatedUpgrades } from '../../npm-upgrade/run-automated.js'
import { upgradePackage } from '../../npm-upgrade/upgrade-package.js'
import { runUpgradePhase } from '../../npm-upgrade/phases/index.js'
import { PhaseStopped } from '../../npm-upgrade/phases/run-repos.js'
import { errorPayloadFor, jsonEnvelope } from '../envelope.js'
import { writeLine } from '../_write-line.js'

const say = (line) => writeLine(process.stdout, line)
const warn = (line) => writeLine(process.stderr, line)

const workspaceOf = (opts) =>
  realpathSync(resolveWorkspaceRoot({ explicit: opts.workspace }))

const examplesText = (examples) =>
  `\nExamples:\n${examples.map((example) => `  tim npm ${example}`).join('\n')}`

const exitWith = (exitCodeOnUsage) => (error) =>
  process.exit(error.exitCode === 0 ? 0 : exitCodeOnUsage)

const failedExitCodeOf = (error, exitCodeOnUsage) => {
  if (error instanceof StepFailed) return error.exitCode
  return isTimError(error) && error.code === 'USAGE' ? exitCodeOnUsage : ERROR
}

const actionFor = ({ run, exitCodeOnUsage = USAGE }) =>
  async function upgradeAction(...positional) {
    const opts = this.optsWithGlobals()
    try {
      const exitCode = await run(opts, positional)
      process.exit(exitCode)
    } catch (error) {
      await warn(error.message)
      process.exit(failedExitCodeOf(error, exitCodeOnUsage))
    }
  }

const allowlistOptions = (command) =>
  command
    .option(
      '--allowlist-owner <name>',
      'Who owns an allowlist entry for a new advisory with no fixed version'
    )
    .option('--expiry-days <days>', 'Days until that entry expires')

const packageCommand = (npm, name, description) =>
  allowlistOptions(
    npm
      .command(name)
      .description(description)
      .option('--run-id <ticket>', 'The run, such as EUDPA-500')
      .option('--repo <name>', 'The repo')
      .option('--package <name>', 'The npm package, such as @hapi/hapi')
  )
    .option(
      '--repo-path <path>',
      'Upgrade this checkout instead of repos/<repo>'
    )
    .exitOverride(exitWith(USAGE))

const upgradeRunner = (mode) => (opts) =>
  upgradePackage({
    mode,
    workspaceRoot: workspaceOf(opts),
    runId: opts.runId,
    repo: opts.repo,
    packageName: opts.package,
    allowlistOwner: opts.allowlistOwner ?? '',
    expiryDays: opts.expiryDays ?? '',
    repoPath: opts.repoPath,
    say,
    warn
  })

const registerUpgradeOne = (npm) =>
  packageCommand(
    npm,
    'upgrade-one',
    'Upgrade one automatic package of an npm upgrade run in its repo: baseline tests and audit, install, tests, audit, then a commit. A failure after the install rolls package.json, package-lock.json and audit-ci.jsonc back and demotes the package to manual. Exits 0 when done or demoted, 1 when the tests still fail after a rollback, and 3 when the audit is red before the install or cannot run.'
  )
    .addHelpText(
      'after',
      examplesText([
        'upgrade-one --run-id EUDPA-500 --repo trade-imports-animals-frontend --package lodash',
        'upgrade-one --run-id EUDPA-500 --repo trade-imports-animals-frontend --package lodash --allowlist-owner "Sam Farrington" --expiry-days 30'
      ])
    )
    .action(actionFor({ run: upgradeRunner('auto') }))

const registerRunManual = (npm) =>
  packageCommand(
    npm,
    'run-manual',
    'Install, test, audit and commit one manual package of an npm upgrade run. It makes no code changes. A failure rolls package.json, package-lock.json and audit-ci.jsonc back and marks the package failed. Exits 0 when done or failed, 1 when the tests still fail after a rollback, and 2 when the repo has uncommitted changes.'
  )
    .addHelpText(
      'after',
      examplesText([
        'run-manual --run-id EUDPA-500 --repo trade-imports-animals-frontend --package @hapi/hapi',
        'run-manual --run-id EUDPA-500 --repo trade-imports-animals-frontend --package @hapi/hapi --allowlist-owner "Sam Farrington" --expiry-days 30'
      ])
    )
    .action(actionFor({ run: upgradeRunner('manual') }))

const registerRunAuto = (npm) =>
  allowlistOptions(
    npm
      .command('run-auto')
      .description(
        'Phase 2 for one repo: upgrade every automatic package still pending, one at a time, then refresh the lockfile. In trade-imports-ins-tests, then run npm run test:docker-compose once. Exits 0 when done, 1 on a cascade or uncommitted changes, and 3 when the audit is red before an install or cannot run.'
      )
      .argument('[repo]', 'The repo, the same as --repo')
      .option('--run-id <ticket>', 'The run, such as EUDPA-500')
      .option('--repo <name>', 'The repo')
      .addOption(new Option('--discover').hideHelp())
      .addOption(new Option('--no-discover').hideHelp())
  )
    .exitOverride(exitWith(ERROR))
    .addHelpText(
      'after',
      examplesText([
        'run-auto --run-id EUDPA-500 --repo trade-imports-animals-frontend',
        'run-auto --run-id EUDPA-500 --repo trade-imports-animals-frontend --allowlist-owner "Sam Farrington" --expiry-days 30'
      ])
    )
    .action(
      actionFor({
        exitCodeOnUsage: ERROR,
        run: (opts, [repoArgument]) =>
          runAutomatedUpgrades({
            workspaceRoot: workspaceOf(opts),
            runId: opts.runId,
            repo: opts.repo ?? repoArgument,
            allowlistOwner: opts.allowlistOwner ?? '',
            expiryDays: opts.expiryDays ?? '',
            say,
            warn
          })
      })
    )

const printOutcome = async (opts, { exitCode, result }) => {
  await say(
    JSON.stringify(
      opts.json
        ? jsonEnvelope({ ok: true, result, timVersion: opts.timVersion })
        : result
    )
  )
  return exitCode
}

const repoCommand = (npm, name, description) =>
  npm
    .command(name)
    .description(description)
    .option('--run-id <ticket>', 'The run, such as EUDPA-500')
    .option('--repo <name>', 'The repo')
    .option('--repo-path <path>', 'Use this checkout instead of repos/<repo>')
    .exitOverride(exitWith(USAGE))

const registerRefreshLockfile = (npm, { timVersion }) =>
  repoCommand(
    npm,
    'refresh-lockfile',
    'Run npm update in one repo, which moves transitive dependencies within their ranges, then its tests, lint and audit, and commit the lockfile. A failure rolls package.json and package-lock.json back. Prints one JSON line: repo, status (committed, no_change or rolled_back), commit, reason and log. Exits 0 when committed or nothing changed, 1 when rolled back, and 2 when the repo has uncommitted changes.'
  )
    .addHelpText(
      'after',
      examplesText([
        'refresh-lockfile --run-id EUDPA-500 --repo trade-imports-schemas'
      ])
    )
    .action(
      actionFor({
        run: async (opts) =>
          printOutcome(
            { ...opts, timVersion },
            await refreshLockfile({
              workspaceRoot: workspaceOf(opts),
              runId: opts.runId,
              repo: opts.repo,
              repoPath: opts.repoPath
            })
          )
      })
    )

const registerResetOverrides = (npm, { timVersion }) =>
  repoCommand(
    npm,
    'reset-overrides',
    'Phase 4 for one repo: remove every npm override in a throwaway worktree, put back only the ones a failing audit, test, lint or build needs, and commit "Remove overrides" with a table of the ones kept. Prints one JSON line: repo, status (committed, no_overrides, unchanged or stopped), commit, kept, removed, below_threshold, reason and worktree. Exits 0 when done, 1 when stopped (the worktree stays), and 2 when the repo has uncommitted changes.'
  )
    .addHelpText(
      'after',
      examplesText([
        'reset-overrides --run-id EUDPA-500 --repo trade-imports-animals-frontend'
      ])
    )
    .action(
      actionFor({
        run: async (opts) =>
          printOutcome(
            { ...opts, timVersion },
            await resetOverrides({
              workspaceRoot: workspaceOf(opts),
              runId: opts.runId,
              repo: opts.repo,
              repoPath: opts.repoPath,
              warn
            })
          )
      })
    )

const collectRepo = (repo, repos) => [...repos, repo]

const printPhaseOutcome = async (opts, { exitCode, result, text }) => {
  await say(
    opts.json
      ? JSON.stringify(
          jsonEnvelope({ ok: true, result, timVersion: opts.timVersion })
        )
      : text
  )
  return exitCode
}

const printPhaseFailure = async (opts, error) => {
  if (opts.json) {
    await say(
      JSON.stringify(
        jsonEnvelope({
          ok: false,
          error: errorPayloadFor(error),
          timVersion: opts.timVersion
        })
      )
    )
  }
  if (!(error instanceof PhaseStopped)) await warn(error.message)
  return error instanceof PhaseStopped ? error.exitCode : ERROR
}

const registerUpgradeRun = (npm, { timVersion }) =>
  allowlistOptions(
    npm
      .command('upgrade')
      .description(
        'Run one phase of an npm upgrade run across its repos. 0 audits every repo and records the run in phase0.json. 1, once a green phase 0 covers every repo at its HEAD, discovers outdated packages and lists one PACKAGE_PLANNER task per unclassified package. 2 runs run-auto in every repo at once. 3 lists the manual and failed packages, the held ones, the allowlist and the audits for the WALKER. 4 runs reset-overrides in every repo at once. Without --repo it runs on every repo repos.json flags npmUpgradeDefault, skipping any with no checkout or no package.json. Exits 1 on a refusal, a red audit, a failed batch or a stopped reset.'
      )
      .argument('[ticket...]', 'The run, such as EUDPA-500')
      .option('--phase <phase>', '0, 1, 2, 3 or 4')
      .option(
        '--repo <name>',
        'Run on this repo; give it again for more',
        collectRepo,
        []
      )
      .option(
        '--strategy <level>',
        'How far phase 1 upgrades: latest, minor or patch',
        'latest'
      )
      .option(
        '--branch <name>',
        'Refuse to run unless every repo is checked out on this branch'
      )
      .allowUnknownOption()
  )
    .exitOverride(exitWith(ERROR))
    .addHelpText(
      'after',
      examplesText([
        'upgrade EUDPA-500 --phase 0 --branch chore/EUDPA-500-npm',
        'upgrade EUDPA-500 --phase 1 --branch chore/EUDPA-500-npm --json',
        'upgrade EUDPA-500 --phase 2 --branch chore/EUDPA-500-npm --allowlist-owner "Sam Farrington" --expiry-days 30',
        'upgrade EUDPA-500 --phase 3 --repo trade-imports-animals-frontend --json'
      ])
    )
    .action(async function upgradeRunAction(operands) {
      const opts = { ...this.optsWithGlobals(), timVersion }
      try {
        const outcome = await runUpgradePhase({
          workspaceRoot: workspaceOf(opts),
          operands,
          phase: opts.phase,
          repos: opts.repo,
          strategy: opts.strategy,
          branch: opts.branch ?? '',
          allowlistOwner: opts.allowlistOwner,
          expiryDays: opts.expiryDays,
          warn
        })
        process.exit(await printPhaseOutcome(opts, outcome))
      } catch (error) {
        process.exit(await printPhaseFailure(opts, error))
      }
    })

/**
 * `tim npm upgrade`, `upgrade-one`, `run-manual`, `run-auto`,
 * `refresh-lockfile` and `reset-overrides`: the phases of an npm upgrade
 * run and the steps that change a repo.
 *
 * @param {import('commander').Command} npm
 * @param {{timVersion: string}} options
 */
export const registerUpgradeSteps = (npm, { timVersion }) => {
  registerUpgradeRun(npm, { timVersion })
  registerUpgradeOne(npm)
  registerRunManual(npm)
  registerRunAuto(npm)
  registerRefreshLockfile(npm, { timVersion })
  registerResetOverrides(npm, { timVersion })
}
