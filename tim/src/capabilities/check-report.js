const DOCUMENTED_STATUSES = [
  'NOT STARTED',
  'IN PROGRESS',
  'SKELETON',
  'COMPLETE',
  'POST DAY ONE'
]

const asField = (value) => String(value).replace(/[\t\n]/g, ' ')

const byCodeUnits = (left, right) => {
  if (left < right) return -1
  return left > right ? 1 : 0
}

const isCanonical = ({ verdict }) => verdict === 'ok'

const ruleCodePairsOf = (rows) =>
  rows
    .filter((row) => !isCanonical(row))
    .flatMap(({ code, verdict }) =>
      asField(verdict)
        .split(',')
        .map((rule) => ({ rule, code: asField(code) }))
    )
    .sort((left, right) =>
      byCodeUnits(`${left.rule}\t${left.code}`, `${right.rule}\t${right.code}`)
    )

const groupByRule = (pairs) =>
  pairs.reduce((groups, { rule, code }) => {
    const codes = groups.get(rule) ?? []
    return new Map(groups).set(rule, [...codes, code])
  }, new Map())

const isUndocumentedStatus = ({ status }) =>
  status !== '' && !DOCUMENTED_STATUSES.includes(asField(status))

/**
 * What the capability-map check reports about a map's rows: how many are
 * canonical, the codes that break each rule, in code-unit order, and the
 * status values outside the documented set.
 *
 * @param {Array<{code: string, status: string, name: string, verdict: string}>} rows - From `parseCapabilityMap`
 * @returns {{total: number, canonicalCount: number, canonical: boolean, rules: Array<{rule: string, codes: string[]}>, undocumentedStatuses: Array<{code: string, status: string}>}}
 */
export const checkReportOf = (rows) => {
  const canonicalCount = rows.filter(isCanonical).length
  return {
    total: rows.length,
    canonicalCount,
    canonical: rows.length > 0 && canonicalCount === rows.length,
    rules: [...groupByRule(ruleCodePairsOf(rows))].map(([rule, codes]) => ({
      rule,
      codes
    })),
    undocumentedStatuses: rows
      .filter(isUndocumentedStatus)
      .map(({ code, status }) => ({
        code: asField(code),
        status: asField(status)
      }))
  }
}

const padToBytes = (text, width) =>
  text + ' '.repeat(Math.max(0, width - Buffer.byteLength(text)))

const firstBytesOf = (text, byteCount) => {
  const characters = [...text]
  const firstOver = characters.findIndex(
    (_, index) =>
      Buffer.byteLength(characters.slice(0, index + 1).join('')) > byteCount
  )
  return firstOver === -1 ? text : characters.slice(0, firstOver).join('')
}

const shortenedName = (name) => {
  const widest = 42
  const kept = 39
  return Buffer.byteLength(name) > widest
    ? `${firstBytesOf(name, kept)}...`
    : name
}

const tableLine = (code, status, name, verdict) =>
  `${padToBytes(code, 18)} ${padToBytes(status, 14)} ${padToBytes(name, 42)} ${verdict}`

const rowLine = ({ code, status, name, verdict }) =>
  tableLine(
    asField(code),
    status === '' ? '-' : asField(status),
    shortenedName(asField(name)),
    asField(verdict)
  )

/**
 * The per-row table: code, status, name and verdict in columns padded by
 * bytes, names over 42 bytes cut to 39 and '...'.
 *
 * @param {object[]} rows - From `parseCapabilityMap`
 * @returns {string[]}
 */
export const renderRowTable = (rows) => [
  tableLine('CODE', 'STATUS', 'NAME', 'VERDICT'),
  tableLine('-'.repeat(18), '-'.repeat(14), '-'.repeat(42), '-'.repeat(7)),
  ...rows.map(rowLine)
]

const ruleLine = ({ rule, codes }) =>
  `  ${padToBytes(rule, 24)} ${String(codes.length).padStart(2)}  ${codes.join(', ')}`

/**
 * The 'Outstanding work' lines, one per broken rule, sorted.
 *
 * @param {Array<{rule: string, codes: string[]}>} rules - From {@link checkReportOf}
 * @returns {string[]}
 */
export const renderRuleLines = (rules) => rules.map(ruleLine).sort(byCodeUnits)

/**
 * @param {Array<{code: string, status: string}>} undocumentedStatuses - From {@link checkReportOf}
 * @returns {string[]}
 */
export const renderUndocumentedStatusLines = (undocumentedStatuses) =>
  undocumentedStatuses.map(({ code, status }) => `  ${code}  ${status}`)
