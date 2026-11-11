import { makeFinding } from './finding.js'

const finding = makeFinding('maturity')

export const MATURITY_LEVELS = [
  'exploring',
  'detailing',
  'agreed',
  'readyForLive'
]

const SIGNED_OFF_MENTION = /^\s*\*\*signed off\*\*/i

const linesOf = (text) => text.split(/\r\n|\r|\n/)

const pageSpecDomain = (path) =>
  path.match(/^([^/]+)\/journey-pages\/[^/]+$/)?.[1] ?? null

const requiresMaturity = (domain) => domain !== 'admin'

const purposeLineRange = (lines) => {
  const start = lines.findIndex((line) => /^## Purpose\s*$/.test(line))
  if (start === -1) return null
  const next = lines.findIndex(
    (line, index) => index > start && /^## /.test(line)
  )
  return { start, end: next === -1 ? lines.length : next }
}

const maturityLineFindings = (capability, { line, index }, purpose) => {
  const findings = []
  const level = line.match(/^\*\*Maturity\*\*: (\S+)$/)?.[1]
  if (!MATURITY_LEVELS.includes(level)) {
    findings.push(
      finding(
        capability.path,
        `Maturity line "${line.trim()}" must read **Maturity**: <${MATURITY_LEVELS.join('|')}>.`
      )
    )
  }
  if (!purpose || index <= purpose.start || index >= purpose.end) {
    findings.push(
      finding(capability.path, 'Maturity line must sit under ## Purpose.')
    )
  }
  return findings
}

/**
 * Every journey-pages page spec carries one `**Maturity**: <level>` line
 * under its Purpose. Admin page specs may leave it out. No other spec
 * carries one.
 *
 * @param {object} capability
 * @returns {object[]}
 */
export const checkMaturityLine = (capability) => {
  if (!capability.hasSpec) return []
  const domain = pageSpecDomain(capability.path)
  const lines = linesOf(capability.specText)
  const mentions = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => /^\s*\*\*maturity\*\*/i.test(line))

  if (domain === null) {
    return mentions.map(() =>
      finding(
        capability.path,
        'Only a journey-pages page spec carries a Maturity line.'
      )
    )
  }
  if (mentions.length === 0) {
    return requiresMaturity(domain)
      ? [
          finding(
            capability.path,
            'Page spec has no **Maturity** line under ## Purpose.'
          )
        ]
      : []
  }
  if (mentions.length > 1) {
    return [
      finding(
        capability.path,
        `Page spec has ${mentions.length} Maturity lines. It must have one.`
      )
    ]
  }
  return maturityLineFindings(capability, mentions[0], purposeLineRange(lines))
}

const isRealDate = (isoDate) => {
  const parsed = new Date(`${isoDate}T00:00:00Z`)
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === isoDate
  )
}

const signedOffMentions = (text) =>
  linesOf(text).filter((line) => SIGNED_OFF_MENTION.test(line))

const scenarioSignedOffFindings = (capability, scenario) => {
  const mentions = signedOffMentions(scenario.body)
  if (mentions.length === 0) return []
  if (mentions.length > 1) {
    return [
      finding(
        capability.path,
        `Scenario "${scenario.name}" has ${mentions.length} Signed off lines. It must have one.`
      )
    ]
  }
  const [mark] = mentions
  const findings = []
  const firstLine = linesOf(scenario.body).find((line) => line.trim() !== '')
  if (firstLine !== mark) {
    findings.push(
      finding(
        capability.path,
        `Scenario "${scenario.name}" has its Signed off line away from its ID line. It must sit directly after it.`
      )
    )
  }
  const date = mark.match(/^\*\*Signed off\*\*: (\d{4}-\d{2}-\d{2})$/)?.[1]
  if (!date || !isRealDate(date)) {
    findings.push(
      finding(
        capability.path,
        `Scenario "${scenario.name}" Signed off line "${mark.trim()}" must read **Signed off**: <YYYY-MM-DD>, with a real date.`
      )
    )
  }
  return findings
}

/**
 * Every `**Signed off**: <YYYY-MM-DD>` mark sits on a scenario, directly
 * after its ID line, once, with a real date.
 *
 * @param {object} capability
 * @returns {object[]}
 */
export const checkSignedOffMarks = (capability) => {
  if (!capability.hasSpec) return []
  const scenarios = capability.requirements.flatMap(
    (requirement) => requirement.scenarios
  )
  const onScenarios = scenarios.flatMap((scenario) =>
    signedOffMentions(scenario.body)
  ).length
  const outsideScenarios =
    signedOffMentions(capability.specText).length - onScenarios
  const misplaced =
    outsideScenarios > 0
      ? [
          finding(
            capability.path,
            'A Signed off line sits outside a scenario. Only a scenario carries one.'
          )
        ]
      : []
  return [
    ...scenarios.flatMap((scenario) =>
      scenarioSignedOffFindings(capability, scenario)
    ),
    ...misplaced
  ]
}
