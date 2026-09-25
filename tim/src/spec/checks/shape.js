import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { z } from 'zod'
import { makeFinding } from './finding.js'

const testLinkSchema = z.object({
  type: z.enum(['e2e', 'fit', 'unit']),
  repo: z.string().min(1),
  file: z.string().min(1),
  test: z.string().min(1),
  strength: z.enum(['full', 'partial']),
  notes: z.string().optional()
})

const scenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  coverage: z.enum(['full', 'partial', 'none']),
  tests: z.array(testLinkSchema),
  notes: z.string().optional()
})

const requirementSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  coverage: z.enum(['full', 'partial', 'none']),
  scenarios: z.array(scenarioSchema).min(1)
})

export const coverageFileSchema = z.object({
  capability: z.string().min(1),
  areaCode: z.string().min(1),
  specFile: z.string().min(1),
  requirements: z.array(requirementSchema)
})

const finding = makeFinding('shape')

/**
 * A capability's coverage.json, parsed against `coverageFileSchema`, or
 * `null` when there is nothing to parse or it fails to parse — the
 * guard-and-safeParse pair every check below repeats, named once.
 *
 * @param {object} capability
 * @returns {object|null}
 */
export const parsedCoverage = (capability) => {
  if (!capability.hasCoverage || capability.coverageParseError) return null
  const result = coverageFileSchema.safeParse(capability.coverage)
  return result.success ? result.data : null
}

/**
 * Check 3 — coverage.json shape: required keys present, type in
 * e2e|fit|unit, strength in full|partial. Reports the JSON parse error
 * itself as a finding rather than throwing, so one malformed file doesn't
 * abort the whole lint run.
 *
 * @param {object} capability - from buildCorpus
 * @returns {object[]}
 */
export const checkCoverageShape = (capability) => {
  if (!capability.hasCoverage) return []
  if (capability.coverageParseError) {
    return [
      finding(
        capability.path,
        `coverage.json is not valid JSON: ${capability.coverageParseError}`
      )
    ]
  }
  const result = coverageFileSchema.safeParse(capability.coverage)
  if (result.success) return []
  return result.error.issues.map((issue) =>
    finding(
      capability.path,
      `coverage.json ${issue.path.join('.') || '(root)'}: ${issue.message}`
    )
  )
}

/**
 * Check 9 — a scenario recorded `coverage: "none"` must carry a `notes`
 * explaining the gap; a `none` scenario with no notes is a diagnosis
 * nobody wrote down.
 *
 * @param {object} capability
 * @returns {object[]}
 */
export const checkNoneHasNotes = (capability) => {
  const coverage = parsedCoverage(capability)
  if (!coverage) return []
  return coverage.requirements
    .flatMap((requirement) => requirement.scenarios)
    .filter(
      (scenario) => scenario.coverage === 'none' && !scenario.notes?.trim()
    )
    .map((scenario) =>
      finding(
        capability.path,
        `${scenario.id} is coverage: "none" with no notes explaining the gap.`
      )
    )
}

const AREAS_ROW = /^\|\s*([a-z0-9/-]+)\s*\|\s*([A-Z0-9-]+)\s*\|$/
const ALL_DASHES = /^-+$/

// A markdown separator row (`|---|---|`) matches AREAS_ROW too — both its
// capture groups are all-dashes, which satisfies `[a-z0-9/-]+` and
// `[A-Z0-9-]+` alike. Drop it rather than mapping it into a bogus
// '---' -> '---' entry.
const isDataRow = (match) =>
  Boolean(match) && !ALL_DASHES.test(match[1]) && !ALL_DASHES.test(match[2])

/**
 * The capability → areaCode map from openspec/coverage/AREAS.md.
 *
 * @param {string} root - A spec root
 * @returns {Map<string, string>}
 */
export const readAreasTable = (root) => {
  const path = join(root, 'openspec', 'coverage', 'AREAS.md')
  let text
  try {
    text = readFileSync(path, 'utf8')
  } catch (error) {
    if (error.code === 'ENOENT') return new Map()
    throw error
  }
  const lines = text.split('\n')
  return new Map(
    lines
      .map((line) => line.match(AREAS_ROW))
      .filter(isDataRow)
      .map((match) => [match[1], match[2]])
  )
}

/**
 * Check 10 — `areaCode` matches the capability's row in AREAS.md, and
 * `specFile` is `openspec/`-relative and points at this capability's own
 * spec.md.
 *
 * @param {object} capability
 * @param {Map<string, string>} areasTable
 * @returns {object[]}
 */
export const checkAreaCodeAndSpecFile = (capability, areasTable) => {
  const coverage = parsedCoverage(capability)
  if (!coverage) return []
  const { areaCode, specFile } = coverage
  const findings = []

  const expectedAreaCode = areasTable.get(capability.path)
  if (!expectedAreaCode) {
    findings.push(
      finding(
        capability.path,
        `AREAS.md has no row for "${capability.path}" — add one before recording coverage.`
      )
    )
  } else if (areaCode !== expectedAreaCode) {
    findings.push(
      finding(
        capability.path,
        `areaCode "${areaCode}" does not match AREAS.md's "${expectedAreaCode}" for this capability.`
      )
    )
  }

  const expectedSpecFile = `openspec/specs/${capability.path}/spec.md`
  if (specFile !== expectedSpecFile) {
    findings.push(
      finding(
        capability.path,
        `specFile "${specFile}" should be "${expectedSpecFile}".`
      )
    )
  }

  return findings
}
