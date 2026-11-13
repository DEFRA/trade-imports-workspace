import { existsSync } from 'node:fs'
import { readJsonFile } from '../../backlog/io.js'
import { TimError } from '../../errors.js'
import { writeJsonAtomic } from '../../review/store.js'
import { metaPath, refinementDir, utcSeconds } from './workarea.js'

export const VERDICTS = ['READY', 'NEEDS WORK', 'SPIKE REQUIRED']

/**
 * @param {string} verdict
 * @returns {string} the verdict, unchanged
 * @throws {TimError} USAGE when it is not one of {@link VERDICTS}, exactly
 */
export const checkedVerdict = (verdict) => {
  if (VERDICTS.includes(verdict)) return verdict
  throw new TimError(
    'USAGE',
    `Error: --verdict must be one of: ${VERDICTS.join(', ')}\nGot: '${verdict}'`
  )
}

/**
 * Stamps the verdict, its reason (null when empty or not given) and the
 * time onto a refinement's `.refinement-meta.json`, keeping every other key
 * where it was.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.ticket
 * @param {string} args.verdict - From {@link checkedVerdict}
 * @param {string} [args.reason]
 * @param {() => Date} [args.now]
 * @returns {{ticket: string, verdict: string, reason: string|null, metaPath: string, meta: object}}
 * @throws {TimError} NOT_FOUND when the ticket has no refinement meta
 */
export const finalizeRefinement = ({
  workspaceRoot,
  ticket,
  verdict,
  reason = '',
  now = () => new Date()
}) => {
  const path = metaPath(refinementDir(workspaceRoot, ticket))
  if (!existsSync(path)) {
    throw new TimError(
      'NOT_FOUND',
      `Error: ${path} not found — run tim refine prepare ${ticket} first`
    )
  }
  const meta = {
    ...readJsonFile(path),
    verdict,
    verdict_reason: reason === '' ? null : reason,
    completed_at: utcSeconds(now())
  }
  writeJsonAtomic(path, meta)
  return { ticket, verdict, reason: meta.verdict_reason, metaPath: path, meta }
}
