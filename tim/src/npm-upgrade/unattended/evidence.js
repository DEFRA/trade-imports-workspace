import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { evidenceRepoPath } from '../../deps/evidence/count.js'
import {
  recordEvidenceRow,
  recountEvidenceRows
} from '../../deps/evidence/record.js'
import {
  evidenceRowSchema,
  evidenceRowsVerdict,
  hitsPhrase
} from '../../deps/evidence/row.js'
import { evidenceVerdictText } from '../../deps/evidence/render.js'
import { TimError } from '../../errors.js'
import { writeJsonAtomic } from '../../review/store.js'
import {
  fragmentFileName,
  packagesPath,
  readJson,
  readPackagesFile,
  runFolder,
  utcStamp
} from '../state.js'

const evidenceFileSchema = z.object({
  package: z.string().min(1),
  target: z.string().min(1),
  checked_at: z.string().nullable(),
  rows: z.array(evidenceRowSchema)
})

/**
 * Where one package's changelog evidence lives: its own file in the repo's
 * `evidence` folder, so planners recording evidence at once do not write
 * the same file.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} args.repo
 * @param {string} args.packageName
 * @returns {string}
 */
export const evidencePath = ({ workspaceRoot, runId, repo, packageName }) =>
  join(
    runFolder(workspaceRoot, runId),
    repo,
    'evidence',
    fragmentFileName(packageName)
  )

/**
 * One package's evidence file, validated.
 *
 * @param {string} path - From {@link evidencePath}
 * @returns {{package: string, target: string, checked_at: string|null, rows: object[]} | null} null when no evidence is recorded
 * @throws {TimError} PARSE when the file is not a valid evidence file
 */
export const readPackageEvidence = (path) => {
  if (!existsSync(path)) return null
  const parsed = evidenceFileSchema.safeParse(readJson(path))
  if (!parsed.success) {
    const [issue] = parsed.error.issues
    throw new TimError(
      'PARSE',
      `${path}: ${issue.path.join('.') || 'the file'} ${issue.message}`
    )
  }
  return parsed.data
}

const packageRowOf = ({ workspaceRoot, runId, repo, packageName }) => {
  const path = packagesPath(runFolder(workspaceRoot, runId), repo)
  const row = (readPackagesFile(path).packages ?? []).find(
    (candidate) => candidate.package === packageName
  )
  if (!row) {
    throw new TimError('NOT_FOUND', `Can't find ${packageName} in ${path}.`)
  }
  return row
}

const refuseEvidenceForAnotherTarget = (evidence, row, path) => {
  if (evidence && evidence.target !== row.target) {
    throw new TimError(
      'USAGE',
      `The evidence for ${row.package} is for ${evidence.target}, but the run now upgrades it to ${row.target}. Delete ${path} and record the evidence again.`
    )
  }
}

const addedMessage = (
  { packageName, repo },
  { outcome, pattern, hitsBefore }
) =>
  pattern
    ? `Added evidence for ${packageName} in ${repo}: ${outcome}, pattern "${pattern}" has ${hitsPhrase(hitsBefore)}.`
    : `Added evidence for ${packageName} in ${repo}: ${outcome}, no pattern.`

/**
 * Records one changelog item's evidence row for a package of an npm upgrade
 * run, counting the pattern's hits in the repo now as `hitsBefore`.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} args.repo
 * @param {string} args.packageName
 * @param {string} args.item - The changelog item
 * @param {string} args.outcome - applied, not-applicable or needs-a-person
 * @param {string} [args.pattern] - A fixed string; required when applied
 * @param {string} [args.reason]
 * @returns {Promise<{path: string, row: object, message: string}>}
 * @throws {TimError} NOT_FOUND for a missing packages file, package or checkout; USAGE when the outcome does not fit the pattern's hits, or the evidence is for another target
 */
export const addPackageEvidence = async ({
  workspaceRoot,
  runId,
  repo,
  packageName,
  item,
  outcome,
  pattern,
  reason = ''
}) => {
  const packageRow = packageRowOf({ workspaceRoot, runId, repo, packageName })
  const path = evidencePath({ workspaceRoot, runId, repo, packageName })
  const evidence = readPackageEvidence(path)
  refuseEvidenceForAnotherTarget(evidence, packageRow, path)
  const row = await recordEvidenceRow({
    repoPath: evidenceRepoPath(workspaceRoot, repo),
    item,
    outcome,
    pattern,
    reason
  })
  writeJsonAtomic(path, {
    package: packageName,
    target: packageRow.target,
    checked_at: null,
    rows: [...(evidence?.rows ?? []), row]
  })
  return { path, row, message: addedMessage({ packageName, repo }, row) }
}

/**
 * Counts each evidence row's pattern in the repo again as `hitsAfter`,
 * writes the rows back, and gives the verdict on them. Run it after the
 * package's source edits and before its commit.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} args.repo
 * @param {string} args.packageName
 * @param {Date} [args.now]
 * @returns {Promise<{package: string, repo: string, path: string, allClean: boolean, rowCount: number, notCleanCount: number, rows: object[]}>}
 * @throws {TimError} NOT_FOUND when no evidence is recorded, or the package or checkout is missing; USAGE when the evidence is for another target
 */
export const checkPackageEvidence = async ({
  workspaceRoot,
  runId,
  repo,
  packageName,
  now = new Date()
}) => {
  const packageRow = packageRowOf({ workspaceRoot, runId, repo, packageName })
  const path = evidencePath({ workspaceRoot, runId, repo, packageName })
  const evidence = readPackageEvidence(path)
  if (!evidence) {
    throw new TimError(
      'NOT_FOUND',
      `No evidence is recorded for ${packageName} in ${repo}. Record each changelog item with tim npm packages add-evidence.`
    )
  }
  refuseEvidenceForAnotherTarget(evidence, packageRow, path)
  const rows = await recountEvidenceRows(
    evidenceRepoPath(workspaceRoot, repo),
    evidence.rows
  )
  writeJsonAtomic(path, { ...evidence, checked_at: utcStamp(now), rows })
  return {
    package: packageName,
    repo,
    path,
    ...evidenceRowsVerdict(rows)
  }
}

/**
 * @param {Awaited<ReturnType<typeof checkPackageEvidence>>} checked
 * @returns {string} Whether every row is clean, and why each other row is not
 */
export const renderCheckedEvidenceText = (checked) =>
  evidenceVerdictText(checked, `for ${checked.package} in ${checked.repo}`)
