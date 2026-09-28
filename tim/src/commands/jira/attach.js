import { basename, resolve } from 'node:path'
import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { OK, PARTIAL_FAILURE } from '../../constants/exitCodes.js'
import { makeJiraAction } from './shared.js'

const optionsSchema = z.object({
  confirm: z.boolean().optional().default(false),
  replace: z.boolean().optional().default(false)
})

/**
 * Validate `attach`'s options before any side-effect runs.
 *
 * @param {object} opts
 * @returns {{confirm: boolean, replace: boolean}}
 * @throws {TimError} USAGE
 */
export const parseAttachOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

/**
 * `tim jira attach`'s full behaviour: list what's already on the issue,
 * skip any filename already there unless `--replace`, and — only with
 * `--confirm` — upload what's left.
 *
 * @param {object} args
 * @param {string} args.key
 * @param {string[]} args.filePaths
 * @param {boolean} args.confirm
 * @param {boolean} args.replace
 * @returns {Promise<object>}
 * @throws {TimError} USAGE when no file is named
 */
export const runAttach = async ({ key, filePaths, confirm, replace }) => {
  if (!filePaths || filePaths.length === 0) {
    throw new TimError('USAGE', 'Name at least one file to attach.')
  }
  const client = createJiraClient()
  const existing = await client.listAttachments(key)
  const existingNames = new Set(
    existing.map((attachment) => attachment.filename)
  )

  const planned = filePaths.map((filePath) => {
    const path = resolve(process.cwd(), filePath)
    const filename = basename(path)
    return { path, filename, skip: !replace && existingNames.has(filename) }
  })

  if (!confirm) {
    return { mode: 'dry-run', key, planned }
  }

  const toUpload = planned.filter((file) => !file.skip)
  const attached = toUpload.length
    ? await client.attachFiles(
        key,
        toUpload.map((file) => file.path)
      )
    : []
  const skipped = planned
    .filter((file) => file.skip)
    .map((file) => file.filename)
  const partialFailure = attached.some(
    (attachment) => attachment.status === 'failed'
  )

  return { mode: 'attached', key, attached, skipped, partialFailure }
}

export const renderAttachResult = (result) => {
  if (result.mode === 'dry-run') {
    return [
      `Plan for ${result.key}:`,
      ...result.planned.map(
        (file) =>
          `  ${file.filename}${file.skip ? ' (already there — skipped)' : ''}`
      ),
      '',
      'This is a dry run. No request has been sent. Add --confirm to attach for real.'
    ].join('\n')
  }
  return [
    result.attached.length
      ? `Attached to ${result.key}: ${result.attached
          .map((attachment) => `${attachment.filename} (${attachment.status})`)
          .join(', ')}`
      : `Attached nothing new to ${result.key}.`,
    result.skipped.length
      ? `Skipped (already there): ${result.skipped.join(', ')}`
      : 'Skipped: none.',
    ...(result.partialFailure
      ? ['Some attachments failed. Check the output above.']
      : [])
  ].join('\n')
}

export const register = (jira, { timVersion }) => {
  jira
    .command('attach <key> <file...>')
    .description(
      'Attach files to a Jira ticket. Dry run by default; skips a filename already on the issue unless you pass --replace.'
    )
    .option('--confirm', 'Attach for real (the default is a dry run)')
    .option(
      '--replace',
      'Attach even when a file with the same name is already on the issue'
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim jira attach EUDPA-200 screenshot.png --json\n' +
        '  tim jira attach EUDPA-200 screenshot.png --confirm --replace --json'
    )
    .action(
      makeJiraAction({
        parseOptions: parseAttachOptions,
        run: ({ args }, opts) =>
          runAttach({
            key: args[0],
            filePaths: args[1],
            confirm: opts.confirm,
            replace: opts.replace
          }),
        renderText: renderAttachResult,
        exitCodeForResult: (result) =>
          result.partialFailure ? PARTIAL_FAILURE : OK,
        timVersion
      })
    )
}
