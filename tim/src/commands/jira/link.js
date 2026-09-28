import { z } from 'zod'
import { createJiraClient } from '../../clients/jira-client.js'
import { TimError } from '../../errors.js'
import { makeJiraAction } from './shared.js'

const optionsSchema = z.object({
  confirm: z.boolean().optional().default(false)
})

/**
 * Validate `link`'s options before any side-effect runs.
 *
 * @param {object} opts
 * @returns {{confirm: boolean}}
 * @throws {TimError} USAGE
 */
export const parseLinkOptions = (opts) => {
  const result = optionsSchema.safeParse(opts)
  if (!result.success) {
    throw new TimError('USAGE', result.error.issues[0].message)
  }
  return result.data
}

/**
 * `tim jira link`'s full behaviour: dry run by default; with `--confirm`,
 * create the Relates link then GET-verify it actually shows up before
 * reporting success.
 *
 * @param {object} args
 * @param {string} args.key
 * @param {string} args.relationship - Must be `'relates'` (case-insensitive)
 * @param {string} args.target
 * @param {boolean} args.confirm
 * @returns {Promise<object>}
 * @throws {TimError} USAGE when `relationship` isn't `'relates'`; NETWORK
 *   when the link can't be verified after creating it
 */
export const runLink = async ({ key, relationship, target, confirm }) => {
  if (!relationship || relationship.toLowerCase() !== 'relates') {
    throw new TimError(
      'USAGE',
      `Only "relates" is supported, got "${relationship}".`
    )
  }
  if (!confirm) {
    return { mode: 'dry-run', key, target, type: 'Relates' }
  }
  const client = createJiraClient()
  await client.linkIssues('Relates', key, target)
  const links = await client.getIssueLinks(key)
  const verified = links.some(
    (link) =>
      link.type === 'Relates' &&
      (link.outwardKey === target || link.inwardKey === target)
  )
  if (!verified) {
    throw new TimError(
      'NETWORK',
      `Linked ${key} to ${target}, but the link isn't showing up yet. Check Jira and try \`tim jira link\` again.`
    )
  }
  return { mode: 'linked', key, target, type: 'Relates', verified: true }
}

export const renderLinkResult = (result) =>
  result.mode === 'dry-run'
    ? [
        `Would link ${result.key} to ${result.target} (Relates).`,
        'This is a dry run. No request has been sent. Add --confirm to link for real.'
      ].join('\n')
    : `Linked ${result.key} to ${result.target} (Relates). Verified on Jira.`

export const register = (jira, { timVersion }) => {
  jira
    .command('link <key> <relationship> <target>')
    .description(
      'Link two Jira tickets. Only "relates" is supported. Dry run by default; --confirm creates the link and checks it landed.'
    )
    .option(
      '--confirm',
      'Create the link for real and verify it (the default is a dry run)'
    )
    .addHelpText(
      'after',
      '\nExample: tim jira link EUDPA-200 relates EUDPA-100 --confirm --json'
    )
    .action(
      makeJiraAction({
        parseOptions: parseLinkOptions,
        run: ({ args }, opts) =>
          runLink({
            key: args[0],
            relationship: args[1],
            target: args[2],
            confirm: opts.confirm
          }),
        renderText: renderLinkResult,
        timVersion
      })
    )
}
