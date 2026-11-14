import { existsSync, readFileSync, statSync } from 'node:fs'
import { renderUpdateResult, runUpdate } from '../commands/jira/update.js'
import { TimError } from '../errors.js'
import { hardWrappedLines, usesExpandMacro } from './wiki-markup.js'

const isFolder = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false

const textField = (file, field) => {
  if (!existsSync(file)) return ''
  const value = JSON.parse(readFileSync(file, 'utf8'))[field]
  if (value === null || value === undefined || value === false) return ''
  return String(value)
}

const refuse = (message) =>
  new TimError('UNKNOWN', `tim theme-ticket push: ${message}`)

const checkWikiMarkup = (descriptionFile, description) => {
  const wrapped = hardWrappedLines(description)
  if (wrapped.length) {
    throw refuse(
      [
        `${descriptionFile} looks hard-wrapped at these lines: ${wrapped.map((number) => `${number} `).join('')}`,
        'Jira treats a single newline as a line break. Put each paragraph on one line.'
      ].join('\n')
    )
  }
  if (usesExpandMacro(description)) {
    throw refuse(
      [
        `${descriptionFile} uses {expand}. Jira Cloud renders wiki markup through`,
        'rest/api/2, which drops macros — it would appear as literal text. Remove it.'
      ].join('\n')
    )
  }
}

const newlineCount = (text) => text.split('\n').length - 1

/**
 * Posts a ticket folder's `description.txt` and the summary from its
 * `ticket.json` to Jira in one update, once the description passes the
 * wiki-markup checks. Without `confirm` it sends nothing and reads
 * nothing from Jira.
 *
 * @param {object} args
 * @param {string} [args.folder] - The ticket folder
 * @param {string} [args.key] - The Jira key; read from `ticket.created.json` when left out
 * @param {boolean} [args.confirm=false]
 * @returns {Promise<{key: string, descriptionFile: string, descriptionLines: number, summary: string|null, mode: 'dry-run'|'updated'|'unchanged', update?: object}>}
 * @throws {TimError} USAGE without a folder; UNKNOWN without a description or key, or for a hard-wrapped description or one using {expand}
 */
export const pushDescription = async ({ folder, key, confirm = false }) => {
  if (!folder || !isFolder(folder)) {
    throw new TimError('USAGE', 'tim theme-ticket push: give a ticket folder')
  }
  const descriptionFile = `${folder}/description.txt`
  const manifestFile = `${folder}/ticket.json`
  if (!existsSync(descriptionFile)) {
    throw refuse(`no description.txt in ${folder}`)
  }

  const ticketKey = key || textField(`${folder}/ticket.created.json`, 'key')
  if (!ticketKey) {
    throw refuse(
      [
        'no Jira key. Pass --key, or create the ticket first with:',
        `  tim jira create --from ${manifestFile}`
      ].join('\n')
    )
  }

  const summary = textField(manifestFile, 'summary')
  const description = readFileSync(descriptionFile, 'utf8')
  checkWikiMarkup(descriptionFile, description)

  const pushed = {
    key: ticketKey,
    descriptionFile,
    descriptionLines: newlineCount(description),
    summary: summary || null
  }
  if (!confirm) return { ...pushed, mode: 'dry-run' }

  const update = await runUpdate({
    key: ticketKey,
    summary: summary || undefined,
    descriptionFile,
    confirm: true
  })
  return { ...pushed, mode: update.mode, update }
}

/**
 * What `tim theme-ticket push` prints: the ticket, the description file
 * and the summary, then the dry-run notice or the Jira update's own result.
 *
 * @param {object} result - From {@link pushDescription}
 * @returns {string}
 */
export const renderPushText = (result) =>
  [
    `Ticket:      ${result.key}`,
    `Description: ${result.descriptionFile} (${result.descriptionLines} lines)`,
    ...(result.summary ? [`Summary:     ${result.summary}`] : []),
    ...(result.mode === 'dry-run'
      ? ['', 'Dry run. Nothing sent. Add --confirm to send it.']
      : [renderUpdateResult(result.update)])
  ].join('\n')
