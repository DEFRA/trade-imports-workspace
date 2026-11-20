import { z } from 'zod'
import { ERROR, OK } from '../../constants/exitCodes.js'
import { TimError } from '../../errors.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { syncDependabotConfig } from '../../deps/dependabot-file.js'
import { makeRunAction } from '../_run-action.js'

const optionsSchema = z.object({
  write: z.boolean().optional(),
  check: z.boolean().optional(),
  workspace: z.string().optional()
})

const parseOptions = (opts) => {
  const parsed = optionsSchema.safeParse(opts)
  if (!parsed.success) {
    throw new TimError('USAGE', parsed.error.issues[0].message)
  }
  const { write, check, workspace } = parsed.data
  if (write && check) {
    throw new TimError('USAGE', 'Give --write or --check, not both.')
  }
  const mode = write ? 'write' : check ? 'check' : 'print'
  return { mode, workspace }
}

/**
 * The plain-text report of `tim deps dependabot`: the generated file in
 * print mode, otherwise one line on what happened to it.
 *
 * @param {{path: string, mode: string, upToDate: boolean, written: boolean, content: string}} result
 * @returns {string}
 */
export const renderDependabotText = ({
  path,
  mode,
  upToDate,
  written,
  content
}) => {
  if (mode === 'print') return content.trimEnd()
  if (mode === 'write') {
    return written ? `Wrote ${path}.` : `${path} is already up to date.`
  }
  return upToDate
    ? `${path} matches the dependency sets.`
    : `${path} does not match the dependency sets. Run the command with --write to regenerate it.`
}

export const register = (program, { timVersion }) => {
  program
    .command('dependabot <repo>')
    .description(
      "Generate a repo's .github/dependabot.yml from config/dependency-sets.json: a group for each set the repo moves on its own, an ignore for each set the nightly job moves across repos, and the cooldown. Prints the file unless you ask to write or check it."
    )
    .option('--write', 'Write the file into the repo')
    .option(
      '--check',
      'Compare the file with what the sets generate. Exits 1 when they differ or the file is missing.'
    )
    .addHelpText(
      'after',
      '\nThe repo must be in scope for the sets (see defaults.repos in config/dependency-sets.json) and cloned under repos/.\n' +
        "tim is the workspace's own tim folder: its file is the workspace's .github/dependabot.yml, with npm updates for /tim and GitHub Actions updates for the workspace's workflows and composite actions.\n" +
        '\nExamples:\n' +
        '  tim deps dependabot trade-imports-animals-frontend\n' +
        '  tim deps dependabot trade-imports-animals-frontend --write\n' +
        '  tim deps dependabot trade-imports-animals-frontend --check --json\n' +
        '  tim deps dependabot tim --write'
    )
    .action(
      makeRunAction({
        parseOptions,
        run: ({ args: [repo] }, { mode, workspace }) =>
          syncDependabotConfig({
            workspaceRoot: resolveWorkspaceRoot({ explicit: workspace }),
            repo,
            mode
          }),
        renderText: renderDependabotText,
        exitCodeForResult: (result) =>
          result.mode === 'check' && !result.upToDate ? ERROR : OK,
        timVersion
      })
    )
}
