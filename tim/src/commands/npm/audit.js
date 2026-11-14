import { ERROR, OK, USAGE } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { isTimError } from '../../errors.js'
import {
  allowAdvisory,
  forgetAllowlistEntries,
  renderForgottenText,
  runAuditBaseline,
  runUpgradeGate
} from '../../npm-upgrade/audit.js'
import { baselineExitCodeOf, jqText } from '../../npm-upgrade/audit-rules.js'
import { makeRunAction } from '../_run-action.js'

const warnLine = (line) => process.stderr.write(`${line}\n`)

const jsonTextOf = (value) => jqText(value).trimEnd()

const exitCodeForAuditError = (error) =>
  isTimError(error) && error.code === 'REFUSED' ? ERROR : USAGE

const exitWithUsageOnError = (error) =>
  process.exit(error.exitCode === 0 ? OK : USAGE)

const GATE_EXIT_CODES = { green: OK, red: ERROR, not_run: USAGE }

const workspaceOf = (opts) => resolveWorkspaceRoot({ explicit: opts.workspace })

const examplesText = (examples) =>
  `\nExamples:\n${examples.map((example) => `  tim npm audit ${example}`).join('\n')}`

const auditCommand = (audit, name, description) =>
  audit
    .command(name)
    .description(description)
    .option('--run-id <ticket>', 'The run, such as EUDPA-500')
    .option('--repo <name>', 'The repo')
    .exitOverride(exitWithUsageOnError)

const registerBaseline = (audit, { timVersion }) =>
  auditCommand(
    audit,
    'baseline',
    "Run a repo's audit-ci check, save the npm audit report and print a summary: failing, allowlisted, stale and inactive entries, and which advisories have a fixed version. Exits 0 when green with no allowlisted advisory that now has a fix, 1 otherwise, and 2 when the audit cannot run."
  )
    .option(
      '--label <label>',
      'Names the saved files; any character other than a letter, digit, ".", "_" or "-" becomes "_"',
      'baseline'
    )
    .option('--repo-path <path>', 'Audit this checkout instead of repos/<repo>')
    .addHelpText(
      'after',
      examplesText([
        'baseline --run-id EUDPA-500 --repo trade-imports-animals-admin',
        'baseline --run-id EUDPA-500 --repo trade-imports-animals-admin --label before-upgrade --json'
      ])
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: workspaceOf(opts),
          runId: opts.runId,
          repo: opts.repo,
          label: opts.label,
          repoPath: opts.repoPath,
          warn: warnLine
        }),
        run: (_context, parsed) => runAuditBaseline(parsed),
        renderText: jsonTextOf,
        exitCodeForResult: baselineExitCodeOf,
        exitCodeForError: exitCodeForAuditError,
        timVersion
      })
    )

const registerAllow = (audit, { timVersion }) =>
  auditCommand(
    audit,
    'allow',
    "Write or renew one allowlist entry in a repo's audit-ci.jsonc and record it in the run's allowlist.<repo>.json. Refuses (exit 1) an expiry more than 3 calendar months away, a GHSA the audit does not report, and an advisory with a fixed version unless --blocked-by names what stops you taking it."
  )
    .option('--ghsa <id>', 'The advisory, such as GHSA-c475-qrg2-pj4r')
    .option('--reason <text>', 'Why the advisory is allowed')
    .option('--owner <name>', 'Who owns the entry')
    .option('--expiry-days <days>', 'Days until the entry expires')
    .option(
      '--blocked-by <text>',
      'The parent package that stops you taking the fix'
    )
    .option('--stage <number>', 'The upgrade stage that added it')
    .option('--repo-path <path>', 'Use this checkout instead of repos/<repo>')
    .addHelpText(
      'after',
      examplesText([
        'allow --run-id EUDPA-500 --repo trade-imports-animals-frontend --ghsa GHSA-c475-qrg2-pj4r --reason "basic-ftp FTP command injection; dev only" --owner "Sam Farrington" --expiry-days 90',
        'allow --run-id EUDPA-500 --repo trade-imports-animals-frontend --ghsa GHSA-c475-qrg2-pj4r --reason "Dev only" --owner "Sam Farrington" --expiry-days 30 --blocked-by "get-uri pins basic-ftp ^5" --stage 1'
      ])
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: workspaceOf(opts),
          runId: opts.runId,
          repo: opts.repo,
          ghsa: opts.ghsa,
          reason: opts.reason,
          owner: opts.owner,
          expiryDays: opts.expiryDays,
          blockedBy: opts.blockedBy,
          stage: opts.stage,
          repoPath: opts.repoPath,
          warn: warnLine
        }),
        run: (_context, parsed) => allowAdvisory(parsed),
        renderText: jsonTextOf,
        exitCodeForError: exitCodeForAuditError,
        timVersion
      })
    )

const collectGhsa = (ghsa, earlier) => [...earlier, ghsa]

const registerForget = (audit, { timVersion }) =>
  auditCommand(
    audit,
    'forget',
    "Drop entries from a run's allowlist.<repo>.json after you roll an upgrade back by hand. Leaves audit-ci.jsonc alone: restore that with git checkout HEAD --. An entry that is not there is not an error."
  )
    .option(
      '--ghsa <id>',
      'An advisory to drop; give it once for each',
      collectGhsa,
      []
    )
    .addHelpText(
      'after',
      examplesText([
        'forget --run-id EUDPA-500 --repo trade-imports-animals-frontend --ghsa GHSA-c475-qrg2-pj4r',
        'forget --run-id EUDPA-500 --repo trade-imports-animals-frontend --ghsa GHSA-c475-qrg2-pj4r --ghsa GHSA-grv7-fg5c-xmjg'
      ])
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: workspaceOf(opts),
          runId: opts.runId,
          repo: opts.repo,
          ghsas: opts.ghsa
        }),
        run: async (_context, parsed) => forgetAllowlistEntries(parsed),
        renderText: () => null,
        renderTextError: renderForgottenText,
        exitCodeForError: () => USAGE,
        timVersion
      })
    )

const registerGate = (audit, { timVersion }) =>
  auditCommand(
    audit,
    'gate',
    'Audit a repo after one package upgrade. When it fails only on advisories with no fixed version and you give an owner and expiry, allowlist them and audit again. Prints the status, the reason and the GHSAs it allowlisted. Exits 0 green, 1 red, 2 when the audit cannot run.'
  )
    .option('--package <name>', 'The package upgraded')
    .option('--target <version>', 'The version it was upgraded to')
    .option('--allowlist-owner <name>', 'Who owns any entry the gate writes')
    .option(
      '--expiry-days <days>',
      'Days until any entry the gate writes expires'
    )
    .option('--repo-path <path>', 'Audit this checkout instead of repos/<repo>')
    .addHelpText(
      'after',
      examplesText([
        'gate --run-id EUDPA-500 --repo trade-imports-animals-frontend --package lodash --target 4.17.21',
        'gate --run-id EUDPA-500 --repo trade-imports-animals-frontend --package lodash --target 4.17.21 --allowlist-owner "Sam Farrington" --expiry-days 30'
      ])
    )
    .action(
      makeRunAction({
        parseOptions: (opts) => ({
          workspaceRoot: workspaceOf(opts),
          runId: opts.runId,
          repo: opts.repo,
          packageName: opts.package,
          target: opts.target,
          allowlistOwner: opts.allowlistOwner,
          expiryDays: opts.expiryDays,
          repoPath: opts.repoPath,
          warn: warnLine
        }),
        run: (_context, parsed) => runUpgradeGate(parsed),
        renderText: jsonTextOf,
        exitCodeForResult: ({ status }) => GATE_EXIT_CODES[status],
        exitCodeForError: () => USAGE,
        timVersion
      })
    )

/**
 * `tim npm audit`: run a repo's audit-ci check and keep its allowlist.
 *
 * @param {import('commander').Command} npm
 * @param {{timVersion: string}} options
 */
export const registerAudit = (npm, { timVersion }) => {
  const audit = npm
    .command('audit')
    .description(
      "Run a repo's audit-ci check, gate a package upgrade on it, and write or forget allowlist entries"
    )
  registerBaseline(audit, { timVersion })
  registerAllow(audit, { timVersion })
  registerForget(audit, { timVersion })
  registerGate(audit, { timVersion })
}
