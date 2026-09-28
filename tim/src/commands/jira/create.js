import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { OK, PARTIAL_FAILURE } from '../../constants/exitCodes.js'
import { loadManifest } from './manifest.js'
import { buildPlan } from './plan.js'
import { makeJiraAction } from './shared.js'

export const CREATED_FILE = 'ticket.created.json'

const optionsSchema = z
  .object({
    from: z.string().trim().min(1, 'Give --from <path to a ticket manifest>.'),
    confirm: z.string().trim().min(1).optional(),
    dryRun: z.boolean().optional().default(false)
  })
  .refine((opts) => !(opts.confirm && opts.dryRun), {
    message: '--confirm and --dry-run cannot both be given.'
  })

/**
 * Validate `create`'s options before any side-effect runs
 * (`.claude/rules/cli-patterns.md`).
 *
 * @param {object} opts
 * @returns {{from: string, confirm: string|undefined, dryRun: boolean}}
 * @throws {TimError} USAGE
 */
export const parseCreateOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

/**
 * Refuse to create a duplicate when a receipt from an earlier `--confirm`
 * already sits next to the manifest.
 *
 * @param {string} createdPath
 * @throws {TimError} USAGE when a receipt already exists at `createdPath`
 */
const refuseIfAlreadyCreated = (createdPath) => {
  if (!existsSync(createdPath)) return
  const existing = JSON.parse(readFileSync(createdPath, 'utf8'))
  throw new TimError(
    'USAGE',
    `This ticket was already created as ${existing.key} (${existing.url}). Delete ${CREATED_FILE} to create a new one from this manifest.`
  )
}

/**
 * `tim jira create`'s full behaviour: load and validate the manifest,
 * build the plan, and either report the dry run or — with a `--confirm`
 * that matches the current plan id — create the issue, attach every file,
 * link every `relates` target, and write the receipt.
 *
 * @param {object} args
 * @param {string} args.fromPath - `--from`, resolved against the current working directory
 * @param {string} [args.confirmPlanId] - `--confirm`
 * @returns {Promise<object>} `{mode: 'dry-run', ...plan}` or `{mode: 'created', ...}`
 * @throws {TimError} USAGE — a bad manifest, missing files, a changed plan, or an existing receipt
 */
export const runCreate = async ({ fromPath, confirmPlanId }) => {
  const manifestPath = resolve(process.cwd(), fromPath)
  const { manifest, dir } = loadManifest(manifestPath)
  const plan = buildPlan({ manifest, dir })

  if (!confirmPlanId) {
    return { mode: 'dry-run', manifestPath, ...plan }
  }

  const createdPath = join(dir, CREATED_FILE)
  refuseIfAlreadyCreated(createdPath)

  if (confirmPlanId !== plan.planId) {
    throw new TimError(
      'USAGE',
      'The ticket has changed since you checked it. Run the check again.'
    )
  }

  const client = createJiraClient()
  const created = await client.createIssue(plan.fields)

  const attachmentPaths = plan.attachments.map((attachment) => attachment.path)
  const attachments = attachmentPaths.length
    ? await client.attachFiles(created.key, attachmentPaths)
    : []

  const relates = []
  for (const target of manifest.relates) {
    await client.linkIssues('Relates', created.key, target)
    relates.push(target)
  }

  const partialFailure = attachments.some(
    (attachment) => attachment.status === 'failed'
  )

  const receipt = {
    key: created.key,
    url: created.url,
    planId: plan.planId,
    createdAt: new Date().toISOString(),
    attachments,
    relates
  }
  writeFileSync(createdPath, `${JSON.stringify(receipt, null, 2)}\n`)

  return { mode: 'created', ...receipt, partialFailure }
}

const line = (label, value) => `${label.padEnd(11)}${value}`

export const renderCreatePlan = (result) =>
  [
    line('Plan id:', result.planId),
    line('Project:', result.fields.project.key),
    line('Type:', result.fields.issuetype.name),
    line('Summary:', result.fields.summary),
    line('Labels:', result.fields.labels.join(', ') || '(none)'),
    ...(result.fields.priority
      ? [line('Priority:', result.fields.priority.name)]
      : []),
    ...(result.fields.parent
      ? [line('Parent:', result.fields.parent.key)]
      : []),
    '',
    'Attachments:',
    ...(result.attachments.length
      ? result.attachments.map(
          (attachment) => `  ${attachment.filename} (${attachment.size} bytes)`
        )
      : ['  (none)']),
    '',
    result.warnings.length
      ? [
          'Warnings:',
          ...result.warnings.map((warning) => `  - ${warning}`)
        ].join('\n')
      : 'Warnings: none.',
    '',
    'This is a dry run. No request has been sent.',
    `Run again with --confirm ${result.planId} to create this ticket for real.`
  ].join('\n')

export const renderCreated = (result) =>
  [
    `Created ${result.key}`,
    result.url,
    result.attachments.length
      ? `Attachments: ${result.attachments
          .map((attachment) => `${attachment.filename} (${attachment.status})`)
          .join(', ')}`
      : 'Attachments: none.',
    result.relates.length
      ? `Linked (relates): ${result.relates.join(', ')}`
      : 'Linked: none.',
    ...(result.partialFailure
      ? [
          'Some attachments failed. Check the receipt file and retry with `tim jira attach`.'
        ]
      : [])
  ].join('\n')

export const renderCreateResult = (result) =>
  result.mode === 'dry-run' ? renderCreatePlan(result) : renderCreated(result)

export const register = (jira, { timVersion }) => {
  jira
    .command('create')
    .description(
      'Create a Jira ticket from a manifest. Without --confirm, this only prints the plan — no request is sent.'
    )
    .requiredOption(
      '--from <path>',
      'Path to a tim-ticket/1 manifest JSON file'
    )
    .option(
      '--confirm <planId>',
      'Create for real, confirming the exact plan id the dry run printed'
    )
    .option(
      '--dry-run',
      'Print the plan without creating anything (the default when --confirm is not given)'
    )
    .addHelpText(
      'after',
      '\nExamples:\n' +
        '  tim jira create --from ticket.json --json\n' +
        '  tim jira create --from ticket.json --confirm 3f2e...c9 --json'
    )
    .action(
      makeJiraAction({
        parseOptions: parseCreateOptions,
        run: (_context, opts) =>
          runCreate({ fromPath: opts.from, confirmPlanId: opts.confirm }),
        renderText: renderCreateResult,
        exitCodeForResult: (result) =>
          result.partialFailure ? PARTIAL_FAILURE : OK,
        timVersion
      })
    )
}
