import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { jqText } from '../audit-rules.js'
import { listPackages } from '../queries.js'
import { readJson, runFolder } from '../state.js'
import { phase0Path } from './audit-phase.js'
import { checkoutOf } from './run-repos.js'
import { foldLeftoverClassifications } from './runner-phases.js'

const HELD_PREFIX = 'Deferred by walker'

const runPackages = (request, filters) =>
  listPackages({
    workspaceRoot: request.workspaceRoot,
    runId: request.runId,
    emptyWhenRunMissing: true,
    ...filters
  })

const configEntryOf = (entry) => {
  if (typeof entry === 'string') {
    return { ghsa: entry, notes: null, expiry: null }
  }
  const [ghsa, details] = Object.entries(entry)[0]
  return {
    ghsa,
    notes: details?.notes ?? null,
    expiry: details?.expiry ?? null
  }
}

const reasonOf = (notes) =>
  notes
    .replace(/ *Fix blocked upstream:.*$/, '')
    .replace(/ *Owner:.*$/, '')
    .replace(/\.$/, '')

const allowlistRowOf = (repo, recorded) => (entry) => {
  const { ghsa, notes, expiry } = configEntryOf(entry)
  const record = recorded.find((candidate) => candidate.ghsa === ghsa)
  const text = notes ?? ''
  return {
    repo,
    ghsa,
    package: record?.package ?? null,
    kind: record?.kind ?? null,
    reason: reasonOf(text),
    blocked_by:
      text.match(/Fix blocked upstream: (?<blocked>.*?)\. Owner:/)?.groups
        .blocked ?? null,
    owner: text.match(/Owner: (?<owner>.*)$/)?.groups.owner ?? null,
    expiry
  }
}

const allowlistOfRepo = (request, repo) => {
  const config = join(checkoutOf(request.workspaceRoot, repo), 'audit-ci.jsonc')
  if (!existsSync(config)) return []
  const statePath = join(
    runFolder(request.workspaceRoot, request.runId),
    repo,
    `allowlist.${repo}.json`
  )
  const recorded = existsSync(statePath)
    ? (readJson(statePath).entries ?? [])
    : []
  return (readJson(config).allowlist ?? []).map(allowlistRowOf(repo, recorded))
}

const auditBriefOf = (run) => ({
  ran_at: run?.ran_at ?? null,
  label: run?.label ?? null,
  per_repo: (run?.per_repo ?? []).map((row) => ({
    repo: row.repo ?? null,
    green: row.green ?? null,
    failing: row.failing ?? null,
    allowlisted: row.allowlisted ?? null,
    stale: row.stale ?? null,
    fixable_allowlisted: (row.fixable_allowlisted ?? []).map(
      ({ ghsa }) => ghsa ?? null
    ),
    error: row.error ?? null
  }))
})

const auditsOf = (request) => {
  const path = phase0Path(request.workspaceRoot, request.runId)
  if (!existsSync(path)) return { before: null, after: null }
  const { runs } = readJson(path)
  return { before: auditBriefOf(runs[0]), after: auditBriefOf(runs.at(-1)) }
}

const heldOf = (packages) =>
  packages
    .filter((row) => (row.failure_reason ?? '').startsWith(HELD_PREFIX))
    .map((row) => ({
      repo: row.repo ?? null,
      package: row.package ?? null,
      current: row.current ?? null,
      target: row.target ?? null,
      reason: row.failure_reason.replace(/^Deferred by walker: */, '')
    }))

/**
 * Phase 3: the WALKER's handoff. Every manual package and every automatic
 * one that failed, the ones the walker deferred, every allowlist entry in
 * each repo's `audit-ci.jsonc` with what the run recorded about it, and
 * the first and latest phase 0 runs. An unattended run's stderr points at
 * the skill's unattended mode, not the walker.
 *
 * @param {object} request
 * @param {string} request.workspaceRoot
 * @param {string} request.runId
 * @param {string[]} request.repos
 * @param {(line: string) => Promise<void>} request.warn
 * @returns {Promise<{exitCode: number, result: object, text: string}>}
 */
export const handoffPhase = async (request) => {
  const { workspaceRoot, runId, repos, unattended = false, warn } = request
  await foldLeftoverClassifications(request)
  const manual = runPackages(request, { classification: 'manual' })
  const failedAuto = runPackages(request, {
    classification: 'auto',
    status: 'failed'
  })
  const packages = [...manual, ...failedAuto]
  const audits = auditsOf(request)
  const result = {
    ticket: runId,
    manual_count: manual.length,
    failed_auto_count: failedAuto.length,
    packages,
    held: heldOf(packages),
    allowlist: repos.flatMap((repo) => allowlistOfRepo(request, repo)),
    audit_before: audits.before,
    audit_after: audits.after
  }
  await warn('')
  for (const line of nextStepLinesOf({ workspaceRoot, runId, unattended })) {
    await warn(line)
  }
  return { exitCode: 0, result, text: jqText(result).trimEnd() }
}

const nextStepLinesOf = ({ workspaceRoot, runId, unattended }) =>
  unattended
    ? [
        `Phase 3 manifest emitted. These packages are the unattended job's own work, not a walker's: follow "Unattended mode" in ${join(workspaceRoot, '.claude/skills/npm-upgrade/SKILL.md')} (run-id ${runId}).`
      ]
    : [
        'Phase 3 manifest emitted. Spawn the WALKER to triage:',
        `  Follow ${join(workspaceRoot, '.claude/skills/npm-upgrade/references/WALKER.md')} (run-id ${runId})`
      ]
