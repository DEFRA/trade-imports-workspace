import { z } from 'zod'
import { ERROR, OK } from '../../constants/exitCodes.js'
import { EVIDENCE_OUTCOMES } from '../../deps/evidence/row.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { zodOptionsParser } from '../_parse-options.js'
import {
  addPackageEvidence,
  checkPackageEvidence,
  renderCheckedEvidenceText
} from '../../npm-upgrade/unattended/evidence.js'
import {
  recordPackagePolicies,
  renderPoliciesText
} from '../../npm-upgrade/unattended/policy.js'
import { renderRunEvidence } from '../../npm-upgrade/unattended/render.js'
import { makeRunAction } from '../_run-action.js'

const required = (option) =>
  z.string({ error: `Give ${option}.` }).min(1, `Give ${option}.`)

const runSchema = z.object({
  workspace: z.string().optional(),
  runId: required('the run with --run-id'),
  repo: z.string().min(1).optional()
})

const repoSchema = runSchema.extend({ repo: required('the repo with --repo') })

const packageSchema = repoSchema.extend({
  package: required('the npm package with --package')
})

const addEvidenceSchema = packageSchema.extend({
  item: required('the changelog item with --item'),
  outcome: z.enum(EVIDENCE_OUTCOMES, {
    error: `Give --outcome as one of ${EVIDENCE_OUTCOMES.join(', ')}.`
  }),
  pattern: z.string().min(1).optional(),
  reason: z.string().optional()
})

const optionsParser = (schema) => (opts) => {
  const { workspace, ...options } = zodOptionsParser(schema)(opts)
  return {
    ...options,
    workspaceRoot: resolveWorkspaceRoot({ explicit: workspace })
  }
}

const examplesText = (examples) =>
  `\nExamples:\n${examples.map((example) => `  tim npm packages ${example}`).join('\n')}`

const exitCodeForClean = ({ allClean }) => (allClean ? OK : ERROR)

const registerSetPolicy = (packages, { timVersion }) =>
  packages
    .command('set-policy')
    .description(
      "Record the merge policy of every package in one repo's packages.<repo>.json, from config/dependency-sets.json: ci-is-enough or changelog-driven, its set and why. tim npm upgrade --unattended does this in phase 1."
    )
    .option('--run-id <ticket>', 'The run, such as EUDPA-802-vitest-4.2')
    .option('--repo <name>', 'The repo')
    .addHelpText(
      'after',
      examplesText([
        'set-policy --run-id EUDPA-802-vitest-4.2 --repo trade-imports-animals-frontend',
        'set-policy --run-id EUDPA-500 --repo trade-imports-animals-frontend --json'
      ])
    )
    .action(
      makeRunAction({
        parseOptions: optionsParser(repoSchema),
        run: async (_context, parsed) => recordPackagePolicies(parsed),
        renderText: renderPoliciesText,
        timVersion
      })
    )

const registerAddEvidence = (packages, { timVersion }) =>
  packages
    .command('add-evidence')
    .description(
      "Record one changelog item's evidence for one package of an npm upgrade run, with the number of lines of the repo's tracked files that hold --pattern now. Each package's evidence goes to its own file under the repo's evidence folder, so planners can record at once."
    )
    .option('--run-id <ticket>', 'The run, such as EUDPA-802-vitest-4.2')
    .option('--repo <name>', 'The repo')
    .option('--package <name>', 'The npm package, such as @hapi/hapi')
    .option('--item <text>', 'The changelog item')
    .option('--outcome <outcome>', 'applied, not-applicable or needs-a-person')
    .option(
      '--pattern <text>',
      'The old form a change removes, as a fixed string; needed for applied'
    )
    .option(
      '--reason <text>',
      'Why it does not apply, or what a person has to decide; needed for not-applicable and needs-a-person'
    )
    .addHelpText(
      'after',
      '\napplied needs a --pattern the repo holds now. not-applicable needs a --reason, and any --pattern must have no hits. needs-a-person needs a --reason.\n' +
        examplesText([
          'add-evidence --run-id EUDPA-802-eslint-10 --repo trade-imports-animals-frontend --package eslint --item "Remove the no-old-rule rule" --outcome applied --pattern no-old-rule',
          'add-evidence --run-id EUDPA-802-eslint-10 --repo trade-imports-animals-frontend --package eslint --item "New flat config option" --outcome not-applicable --reason "The repo sets no flat config options."'
        ])
    )
    .action(
      makeRunAction({
        parseOptions: optionsParser(addEvidenceSchema),
        run: (_context, { package: packageName, ...parsed }) =>
          addPackageEvidence({ ...parsed, packageName }),
        renderText: ({ message }) => message,
        timVersion
      })
    )

const registerCheckEvidence = (packages, { timVersion }) =>
  packages
    .command('check-evidence')
    .description(
      "Count each of a package's evidence rows again in the repo, record the hits after the change, and check every row is clean. Run it after the package's edits and before its commit. Exits 0 when every row is clean and 1 when any is not."
    )
    .option('--run-id <ticket>', 'The run, such as EUDPA-802-vitest-4.2')
    .option('--repo <name>', 'The repo')
    .option('--package <name>', 'The npm package, such as @hapi/hapi')
    .addHelpText(
      'after',
      '\nAn applied row is clean when its pattern has 0 hits now. A not-applicable row is clean when it has a reason and its pattern, if any, still has 0 hits. A needs-a-person row is never clean.\n' +
        examplesText([
          'check-evidence --run-id EUDPA-802-eslint-10 --repo trade-imports-animals-frontend --package eslint',
          'check-evidence --run-id EUDPA-802-eslint-10 --repo trade-imports-animals-frontend --package eslint --json'
        ])
    )
    .action(
      makeRunAction({
        parseOptions: optionsParser(packageSchema),
        run: (_context, { package: packageName, ...parsed }) =>
          checkPackageEvidence({ ...parsed, packageName }),
        renderText: renderCheckedEvidenceText,
        exitCodeForResult: exitCodeForClean,
        timVersion
      })
    )

const registerRenderEvidence = (packages, { timVersion }) =>
  packages
    .command('render-evidence')
    .description(
      "Print an npm upgrade run's packages and their changelog evidence as the markdown for a pull request description, per repo. A package is clean when it is classified, has a policy recorded and is upgraded, and every evidence row is clean; a changelog-driven package needs evidence. --json gives the clean flag for the run, each repo and each package."
    )
    .option('--run-id <ticket>', 'The run, such as EUDPA-802-vitest-4.2')
    .option('--repo <name>', 'Only this repo')
    .addHelpText(
      'after',
      examplesText([
        'render-evidence --run-id EUDPA-802-eslint-10 --repo trade-imports-animals-frontend',
        'render-evidence --run-id EUDPA-802-eslint-10 --json'
      ])
    )
    .action(
      makeRunAction({
        parseOptions: optionsParser(runSchema),
        run: async (_context, parsed) => renderRunEvidence(parsed),
        renderText: ({ markdown }) => markdown,
        timVersion
      })
    )

/**
 * `tim npm packages set-policy`, `add-evidence`, `check-evidence` and
 * `render-evidence`: the merge policy and changelog evidence of an
 * unattended npm upgrade run.
 *
 * @param {import('commander').Command} packages - The `tim npm packages` command
 * @param {{timVersion: string}} options
 */
export const registerPackageEvidence = (packages, { timVersion }) => {
  registerSetPolicy(packages, { timVersion })
  registerAddEvidence(packages, { timVersion })
  registerCheckEvidence(packages, { timVersion })
  registerRenderEvidence(packages, { timVersion })
}
