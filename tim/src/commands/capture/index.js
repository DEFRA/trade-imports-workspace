import { z } from 'zod'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { OK } from '../../constants/exitCodes.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { TimError } from '../../errors.js'
import { runCapture } from '../../capture/run.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const optionsSchema = z.object({
  workarea: z
    .string()
    .trim()
    .min(1, 'Name a workarea, such as shared/my-programme.'),
  app: z
    .string()
    .trim()
    .min(1, 'Name an app with --app, such as --app animals-frontend.')
})

const parseOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

const GAP = 2
const REACHED_WIDTH = 'reached'.length + GAP

const pad = (text, width) => String(text).padEnd(width)

const widthOf = (heading, values) =>
  Math.max(heading.length, ...values.map((value) => value.length)) + GAP

const renderTable = (pages) => {
  const sectionWidth = widthOf(
    'section',
    pages.map(({ section }) => section)
  )
  const idWidth = widthOf(
    'page',
    pages.map(({ id }) => id)
  )
  const row = (reached, section, id, slug) =>
    `  ${pad(reached, REACHED_WIDTH)}${pad(section, sectionWidth)}${pad(id, idWidth)}${slug}`.trimEnd()
  return [
    row('reached', 'section', 'page', 'slug'),
    ...pages.map(({ reached, section, id, slug }) =>
      row(reached ? 'yes' : 'NO', section, id, slug)
    )
  ]
}

const plural = (count, noun) => `${count} ${noun}${count === 1 ? '' : 's'}`

const gapLine = ({ gaps, pageCount }) =>
  gaps.length === 0
    ? 'The suite reached every page.'
    : `${gaps.length} of ${pageCount} pages not reached. Write specs for: ${gaps.map(({ id }) => id).join(', ')}.`

/**
 * The plain-text report of `tim capture`.
 *
 * @param {object} outcome
 * @returns {string}
 */
export const renderCaptureText = ({
  app,
  sha,
  captureDir,
  suite,
  traces,
  pages,
  gaps,
  pageCount
}) =>
  [
    `Captured ${app} at ${sha.slice(0, 12)}. The FIT suite ${suite.passed ? 'passed' : `failed — it exited ${suite.exitCode}`}.`,
    `${plural(traces.length, 'trace')} in ${captureDir}.`,
    ...renderTable(pages),
    gapLine({ gaps, pageCount })
  ].join('\n')

export const register = (program, { timVersion }) => {
  program
    .command('capture')
    .argument(
      '<workarea>',
      'The workarea under workareas/, such as shared/my-programme'
    )
    .requiredOption('--app <name>', 'The app in capture.json to capture')
    .description(
      "Run an app's own FIT suite with tracing on, keep the traces under the workarea, and say which of the journey's pages the suite reached. The pages it did not reach are the ones still needing a spec."
    )
    .addHelpText(
      'after',
      '\nExample:\n  tim capture shared/my-programme --app animals-frontend --json'
    )
    .action(async function captureAction(workarea, opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const parsed = parseOptions({ workarea, app: opts.app })
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const result = await runCapture({ workspaceRoot, ...parsed })
        emit(
          globalOpts.json
            ? JSON.stringify(jsonEnvelope({ ok: true, result, timVersion }))
            : renderCaptureText(result)
        )
        process.exit(OK)
      } catch (error) {
        if (globalOpts.json) {
          emit(
            JSON.stringify(
              jsonEnvelope({
                ok: false,
                error: errorPayloadFor(error),
                timVersion
              })
            )
          )
        } else {
          emitError(error.message ?? String(error))
        }
        process.exit(exitCodeFor(error))
      }
    })
}
