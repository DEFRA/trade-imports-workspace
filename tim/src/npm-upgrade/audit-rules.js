import semver from 'semver'

export const AUDIT_CONFIG_FILE = 'audit-ci.jsonc'
export const BLOCKED_MARKER = 'Fix blocked upstream:'

/**
 * @param {string} text
 * @returns {boolean} Whether `text` is a lower-case GHSA id
 */
export const isGhsaId = (text) =>
  /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/.test(text)

const typeOrder = (value) => {
  if (value === null) return 0
  if (value === false) return 1
  if (value === true) return 2
  if (typeof value === 'number') return 3
  if (typeof value === 'string') return 4
  return Array.isArray(value) ? 5 : 6
}

const compareText = (left, right) =>
  Buffer.compare(Buffer.from(left), Buffer.from(right))

/**
 * Orders two JSON values as jq's `sort` does: null, false, true, numbers,
 * strings by their UTF-8 bytes, then arrays and objects.
 *
 * @param {unknown} left
 * @param {unknown} right
 * @returns {number}
 */
export const compareAsJq = (left, right) => {
  const byType = typeOrder(left) - typeOrder(right)
  if (byType !== 0) return byType
  if (typeof left === 'number') return left - right
  if (typeof left === 'string') return compareText(left, right)
  if (typeof left !== 'object' || left === null) return 0
  return compareText(JSON.stringify(left), JSON.stringify(right))
}

const uniqueAsJq = (values) =>
  [...values]
    .sort(compareAsJq)
    .filter(
      (value, index, sorted) =>
        index === 0 || compareAsJq(sorted[index - 1], value) !== 0
    )

const severityRankOf = (severity) => {
  const ranks = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }
  return Object.hasOwn(ranks, severity) ? ranks[severity] : 0
}

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const viaRowOf = (via) => ({
  ghsa: via.url.split('/').at(-1),
  package: via.name ?? null,
  severity: via.severity ?? null,
  range: via.range ?? null,
  title: via.title ?? null
})

const groupedByGhsa = (rows) =>
  [...rows]
    .sort((left, right) => compareAsJq(left.ghsa, right.ghsa))
    .reduce((groups, row) => {
      const current = groups.at(-1)
      if (current && compareAsJq(current[0].ghsa, row.ghsa) === 0) {
        current.push(row)
        return groups
      }
      return [...groups, [row]]
    }, [])

const highestSeverityOf = (rows) =>
  rows.reduce((highest, row) =>
    severityRankOf(row.severity) >= severityRankOf(highest.severity)
      ? row
      : highest
  ).severity

const advisoryOf = (rows) => ({
  ghsa: rows[0].ghsa,
  package: rows[0].package,
  severity: highestSeverityOf(rows),
  severity_rank: Math.max(...rows.map((row) => severityRankOf(row.severity))),
  ranges: uniqueAsJq(rows.map((row) => row.range)),
  title: rows[0].title
})

/**
 * One row per GHSA in an npm audit v2 report: the vulnerable package, its
 * highest severity and every vulnerable range, in GHSA order.
 *
 * @param {object} report - `npm audit --json` output
 * @returns {{ghsa: string, package: string, severity: string, severity_rank: number, ranges: string[], title: string}[]}
 */
export const advisoriesOf = (report) => {
  const viaRows = Object.values(report.vulnerabilities || {}).flatMap(
    (vulnerability) => vulnerability.via.filter(isPlainObject).map(viaRowOf)
  )
  return groupedByGhsa(viaRows).map(advisoryOf)
}

const isUsableExpiry = (expiry, today) =>
  typeof expiry === 'string' &&
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}\n?$/.test(expiry) &&
  compareText(expiry, today) > 0

const objectEntryRowOf = (item) => {
  const [first] = Object.entries(item)
  if (!first) return { id: null, active: false, notes: null, expiry: null }
  const [id, value] = first
  return {
    id,
    active: value?.active === true,
    notes: value?.notes ?? null,
    expiry: value?.expiry ?? null
  }
}

const allowlistRowOf = (item) =>
  typeof item === 'string'
    ? { id: item, active: true, notes: null, expiry: null }
    : objectEntryRowOf(item)

/**
 * One row per audit-ci allowlist entry, with whether audit-ci honours it
 * on `today`: active, and with no expiry or a `YYYY-MM-DD` one after today.
 *
 * @param {{allowlist: (string | object)[]}} config - The parsed audit-ci.jsonc
 * @param {string} today - `YYYY-MM-DD`, in UTC
 * @returns {{id: string | null, active: boolean, notes: unknown, expiry: unknown, effective: boolean}[]}
 */
export const allowlistOf = (config, today) =>
  config.allowlist.map(allowlistRowOf).map((row) => ({
    ...row,
    effective:
      row.active && (row.expiry === null || isUsableExpiry(row.expiry, today))
  }))

/**
 * The lowest severity rank the config fails on: 1 for `low: true` up to 4
 * for `critical: true`, 99 when it sets no level.
 *
 * @param {object} config - The parsed audit-ci.jsonc
 * @returns {number}
 */
export const thresholdOf = (config) => {
  const levels = { low: 1, moderate: 2, high: 3, critical: 4 }
  const ranks = Object.entries(levels)
    .filter(([level]) => config[level] === true)
    .map(([, rank]) => rank)
  return ranks.length === 0 ? 99 : Math.min(...ranks)
}

const without = (list, removed) =>
  list.filter((item) => !removed.includes(item))

/**
 * Splits the advisories at or above the threshold the way audit-ci does:
 * failing, allowlisted by an entry it honours, and the entries it honours
 * that match nothing (stale) or ignores (inactive).
 *
 * @param {object} audit
 * @param {object[]} audit.advisories - From {@link advisoriesOf}
 * @param {object[]} audit.allowlist - From {@link allowlistOf}
 * @param {number} audit.threshold - From {@link thresholdOf}
 * @returns {{failing: string[], allowlisted: string[], stale: string[], inactive_allowlist: string[], advisories: object[]}}
 */
export const classifyAudit = ({ advisories, allowlist, threshold }) => {
  const atThreshold = advisories.filter(
    (advisory) => advisory.severity_rank >= threshold
  )
  const honoured = allowlist
    .filter((entry) => entry.effective)
    .map((entry) => entry.id)
  const found = atThreshold.map((advisory) => advisory.ghsa)
  return {
    failing: without(found, honoured),
    allowlisted: without(found, without(found, honoured)),
    stale: without(honoured, found),
    inactive_allowlist: allowlist
      .filter((entry) => !entry.effective)
      .map((entry) => entry.id),
    advisories: atThreshold.map(
      ({ severity_rank: severityRank, ...advisory }) => advisory
    )
  }
}

/**
 * Every version of a package a lockfile installs, in lockfile order.
 *
 * @param {object} lock - The parsed package-lock.json
 * @param {string} packageName
 * @returns {string[]}
 */
export const installedVersionsOf = (lock, packageName) => {
  const suffix = `node_modules/${packageName}`
  const versions = Object.entries(lock.packages ?? {})
    .filter(
      ([key, value]) =>
        (key === suffix || key.endsWith(`/${suffix}`)) && value.version
    )
    .map(([, value]) => value.version)
  return [...new Set(versions)]
}

const inRanges = (version, ranges) =>
  ranges.some((range) =>
    semver.satisfies(version, range, { includePrerelease: true })
  )

const safeReleasesOf = (published, ranges) =>
  published
    .filter((version) => semver.valid(version) && !semver.prerelease(version))
    .filter((version) => !inRanges(version, ranges))
    .sort(semver.compare)

const nearestFixesOf = (vulnerable, safe) =>
  vulnerable
    .map((version) => ({
      installed: version,
      fixed: safe.find((candidate) => semver.gt(candidate, version))
    }))
    .filter((fix) => fix.fixed)

/**
 * Each advisory with the versions the lockfile installs, the vulnerable
 * ones, the nearest published non-prerelease version outside every range
 * above each vulnerable one, and the fix for the newest vulnerable version
 * that has one (`fixed_version`, null when none has).
 *
 * @param {{ghsa: string, package: string, ranges: string[]}[]} advisories
 * @param {object} sources
 * @param {object} sources.lock - The parsed package-lock.json, or `{}`
 * @param {(packageName: string) => Promise<string[]>} sources.publishedVersionsOf - Asked once per package that has a vulnerable version
 * @returns {Promise<object[]>}
 */
export const checkFixes = async (advisories, { lock, publishedVersionsOf }) => {
  const published = new Map()
  const publishedOf = async (packageName) => {
    if (!published.has(packageName)) {
      published.set(packageName, await publishedVersionsOf(packageName))
    }
    return published.get(packageName)
  }
  const rows = []
  for (const advisory of advisories) {
    const installed = installedVersionsOf(lock, advisory.package)
    const vulnerable = installed
      .filter((version) => inRanges(version, advisory.ranges))
      .sort(semver.compare)
    const safe =
      vulnerable.length > 0
        ? safeReleasesOf(await publishedOf(advisory.package), advisory.ranges)
        : []
    const fixes = nearestFixesOf(vulnerable, safe)
    rows.push({
      ...advisory,
      installed,
      vulnerable,
      fixes,
      fixed_version: fixes.at(-1)?.fixed ?? null
    })
  }
  return rows
}

const notesTextOf = (notes) => (notes === null || notes === false ? '' : notes)

const isBlockedUpstream = (allowlist, ghsa) =>
  allowlist
    .filter((entry) => entry.id === ghsa)
    .some((entry) => {
      const notes = notesTextOf(entry.notes)
      return typeof notes === 'string' && notes.includes(BLOCKED_MARKER)
    })

const fixRowOf = (row) => ({
  ghsa: row.ghsa,
  package: row.package,
  fixes: row.fixes,
  fixed_version: row.fixed_version
})

/**
 * The summary `tim npm audit baseline` prints and saves.
 *
 * @param {object} audit
 * @param {string} audit.repo
 * @param {string} audit.label
 * @param {boolean} audit.green - audit-ci exited 0
 * @param {object} audit.classified - From {@link classifyAudit}
 * @param {object[]} audit.fixRows - From {@link checkFixes}, for the classified advisories
 * @param {object[]} audit.allowlist - From {@link allowlistOf}
 * @param {string} audit.snapshot - Where the npm audit report was saved
 * @returns {object}
 */
export const summariseAudit = ({
  repo,
  label,
  green,
  classified,
  fixRows,
  allowlist,
  snapshot
}) => {
  const allowlistedWithFix = fixRows
    .filter(
      (row) =>
        classified.allowlisted.includes(row.ghsa) && row.fixed_version !== null
    )
    .map((row) => ({ ...row, blocked: isBlockedUpstream(allowlist, row.ghsa) }))
  const failingRows = fixRows.filter((row) =>
    classified.failing.includes(row.ghsa)
  )
  const titleOf = (ghsa) =>
    classified.advisories.find((advisory) => advisory.ghsa === ghsa).title
  return {
    repo,
    label,
    green,
    failing: classified.failing,
    allowlisted: classified.allowlisted,
    stale: classified.stale,
    inactive_allowlist: classified.inactive_allowlist,
    fixable_allowlisted: allowlistedWithFix
      .filter((row) => !row.blocked)
      .map(fixRowOf),
    blocked_allowlisted: allowlistedWithFix
      .filter((row) => row.blocked)
      .map(fixRowOf),
    failing_fixable: failingRows
      .filter((row) => row.fixed_version !== null)
      .map(fixRowOf),
    failing_no_fix: failingRows
      .filter((row) => row.fixed_version === null)
      .map((row) => ({
        ghsa: row.ghsa,
        package: row.package,
        title: titleOf(row.ghsa)
      })),
    advisories: classified.advisories,
    snapshot
  }
}

/**
 * @param {object} summary - From {@link summariseAudit}
 * @returns {0 | 1} 1 when audit-ci failed or an allowlisted advisory now has a fix
 */
export const baselineExitCodeOf = (summary) =>
  !summary.green || summary.fixable_allowlisted.length > 0 ? 1 : 0

/**
 * @param {Date} now
 * @returns {string} `now`'s day, `YYYY-MM-DD`, in UTC
 */
export const utcDayOf = (now) => now.toISOString().slice(0, 10)

/**
 * @param {Date} now
 * @param {number} days
 * @returns {string} The UTC day `days` after `now`, `YYYY-MM-DD`
 */
export const utcDayAfterDays = (now, days) =>
  utcDayOf(
    new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + days)
    )
  )

/**
 * The UTC day `months` calendar months after `now`. A day past the end of
 * the target month becomes its last day: 31 January plus one month is 28
 * (or 29) February.
 *
 * @param {Date} now
 * @param {number} months
 * @returns {string} `YYYY-MM-DD`
 */
export const utcDayAfterMonths = (now, months) => {
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth() + months
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return utcDayOf(
    new Date(Date.UTC(year, month, Math.min(now.getUTCDate(), lastDay)))
  )
}

/**
 * @param {Date} now
 * @returns {string} `now` as `date -u +%Y-%m-%dT%H:%M:%SZ` prints it
 */
export const utcStampOf = (now) => `${now.toISOString().slice(0, 19)}Z`

const allowlistEntryIdOf = (item) =>
  typeof item === 'string'
    ? item
    : (Object.keys(item).sort(compareAsJq)[0] ?? null)

/**
 * The config with `entry` in place of every allowlist entry for its GHSA,
 * or added at the end when there is none.
 *
 * @param {object} config - The parsed audit-ci.jsonc
 * @param {string} ghsa
 * @param {object} entry - `{[ghsa]: {active, notes, expiry}}`
 * @returns {object}
 */
export const withAllowlistEntry = (config, ghsa, entry) => {
  const isForGhsa = (item) => allowlistEntryIdOf(item) === ghsa
  const allowlist = config.allowlist.some(isForGhsa)
    ? config.allowlist.map((item) => (isForGhsa(item) ? entry : item))
    : [...config.allowlist, entry]
  return { ...config, allowlist }
}

const trimmedOfOneFullStop = (text) =>
  text.endsWith('.') ? text.slice(0, -1) : text

/**
 * The notes an allowlist entry carries: the reason, the blocked-upstream
 * marker when there is a parent to name, and the owner.
 *
 * @param {{reason: string, blockedBy: string, owner: string}} parts
 * @returns {string}
 */
export const allowlistNotesOf = ({ reason, blockedBy, owner }) => {
  const blocked = blockedBy
    ? ` ${BLOCKED_MARKER} ${trimmedOfOneFullStop(blockedBy)}.`
    : ''
  return `${trimmedOfOneFullStop(reason)}.${blocked} Owner: ${owner}`
}

/**
 * The run's allowlist state with the entry for `record.ghsa` written last.
 * A renewal keeps the first `added_at` and `stage` and stamps `renewed_at`.
 *
 * @param {{entries: object[]}} state - allowlist.<repo>.json
 * @param {object} record
 * @param {string} record.stage - Digits, or empty for none
 * @param {string} record.stamp - From {@link utcStampOf}
 * @returns {object}
 */
export const withAllowlistRecord = (
  state,
  {
    ghsa,
    packageName,
    kind,
    blockedBy,
    fixedVersion,
    reason,
    owner,
    notes,
    expiry,
    stamp,
    stage
  }
) => {
  const prior = state.entries.find((row) => row.ghsa === ghsa) ?? null
  const stageNumber = stage === '' ? null : Number(stage)
  return {
    ...state,
    entries: [
      ...state.entries.filter((row) => row.ghsa !== ghsa),
      {
        ghsa,
        package: packageName,
        kind,
        blocked_by: blockedBy || null,
        fixed_version: fixedVersion || null,
        reason: trimmedOfOneFullStop(reason),
        owner,
        notes,
        expiry,
        added_at: prior?.added_at ?? stamp,
        stage: prior ? (prior.stage ?? null) : stageNumber,
        renewed_at: prior ? stamp : null,
        renewed_stage: prior ? stageNumber : null
      }
    ]
  }
}

/**
 * @param {{entries: object[]}} state - allowlist.<repo>.json
 * @param {string[]} ghsas
 * @returns {object} The state without the entries for `ghsas`
 */
export const withoutAllowlistRecords = (state, ghsas) => ({
  ...state,
  entries: state.entries.filter((row) => !ghsas.includes(row.ghsa))
})

/**
 * A JSON value as `jq .` prints it: two-space indent, DEL escaped, and a
 * final newline.
 *
 * @param {unknown} value
 * @returns {string}
 */
export const jqText = (value) =>
  `${JSON.stringify(value, null, 2).replaceAll('\u007f', '\\u007f')}\n`
