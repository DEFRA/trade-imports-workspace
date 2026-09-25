import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const REQUIREMENT_HEADING = /^### Requirement: (.+)$/
const SCENARIO_HEADING = /^#### Scenario: (.+)$/
const ID_LINE = /^\*\*ID\*\*:\s*((?:REQ|SCN)-[A-Z0-9-]+)\s*$/

/**
 * Every requirement and scenario in a `spec.md`, with the id read only from
 * its own `**ID**: ` line — never grepped from the whole file, which would
 * also catch a prose cross-reference such as `REQ-FLOW-012` mentioned in
 * another capability's Purpose section.
 *
 * @param {string} specText
 * @returns {{name: string, id: string|null, body: string, scenarios: {name: string, id: string|null, body: string}[]}[]}
 */
export const parseSpecMarkdown = (specText) => {
  const requirements = []
  let requirement = null
  let scenario = null
  let mode = null

  const closeScenario = () => {
    if (requirement && scenario) {
      requirement.scenarios.push({
        ...scenario,
        body: scenario.lines.join('\n')
      })
    }
    scenario = null
  }
  const closeRequirement = () => {
    closeScenario()
    if (requirement) {
      requirements.push({ ...requirement, body: requirement.lines.join('\n') })
    }
    requirement = null
  }

  for (const line of specText.split(/\r\n|\r|\n/)) {
    const requirementHeading = line.match(REQUIREMENT_HEADING)
    if (requirementHeading) {
      closeRequirement()
      requirement = {
        name: requirementHeading[1].trim(),
        id: null,
        lines: [],
        scenarios: []
      }
      mode = 'requirement'
      continue
    }
    const scenarioHeading = line.match(SCENARIO_HEADING)
    if (scenarioHeading) {
      closeScenario()
      scenario = { name: scenarioHeading[1].trim(), id: null, lines: [] }
      mode = 'scenario'
      continue
    }
    if (!requirement) continue
    const idLine = line.match(ID_LINE)
    if (idLine) {
      if (mode === 'scenario' && scenario) scenario.id = idLine[1]
      else if (mode === 'requirement') requirement.id = idLine[1]
      continue
    }
    if (mode === 'scenario' && scenario) scenario.lines.push(line)
    else if (mode === 'requirement') requirement.lines.push(line)
  }
  closeRequirement()

  return requirements.map(({ lines: _lines, ...rest }) => rest)
}

const findDirs = (dir) => {
  const entries = readdirSync(dir, { withFileTypes: true }).filter((entry) =>
    entry.isDirectory()
  )
  return [dir, ...entries.flatMap((entry) => findDirs(join(dir, entry.name)))]
}

const toPosixRelative = (root, dir) => relative(root, dir).split(sep).join('/')

/**
 * Every capability path — a directory holding the named file — under a root,
 * relative to that root with posix separators.
 *
 * @param {string} root
 * @param {string} fileName
 * @returns {string[]} sorted
 */
const findCapabilityPaths = (root, fileName) =>
  existsSync(root)
    ? findDirs(root)
        .filter((dir) => existsSync(join(dir, fileName)))
        .map((dir) => toPosixRelative(root, dir))
        .sort()
    : []

const readJsonOrError = (path) => {
  try {
    return { value: JSON.parse(readFileSync(path, 'utf8')), parseError: null }
  } catch (error) {
    return { value: null, parseError: error.message }
  }
}

/**
 * Walk `openspec/specs` and `openspec/coverage`, pairing each capability's
 * `spec.md` with its `coverage.json`. A capability present on only one side
 * is still returned, with the missing half left `null` — callers turn that
 * into the "coverage.json for every spec.md, and the reverse" finding
 * rather than this module deciding what counts as a violation.
 *
 * @param {object} args
 * @param {string} args.root - A spec root, from resolveSpecRoot
 * @returns {{root: string, capabilities: object[]}}
 */
export const buildCorpus = ({ root }) => {
  const specsRoot = join(root, 'openspec', 'specs')
  const coverageRoot = join(root, 'openspec', 'coverage')
  const specPaths = findCapabilityPaths(specsRoot, 'spec.md')
  const coveragePaths = findCapabilityPaths(coverageRoot, 'coverage.json')
  const allPaths = [...new Set([...specPaths, ...coveragePaths])].sort()
  const specPathSet = new Set(specPaths)
  const coveragePathSet = new Set(coveragePaths)

  const capabilities = allPaths.map((path) => {
    const hasSpec = specPathSet.has(path)
    const hasCoverage = coveragePathSet.has(path)
    const specFile = join(specsRoot, path, 'spec.md')
    const coverageFile = join(coverageRoot, path, 'coverage.json')
    const specText = hasSpec ? readFileSync(specFile, 'utf8') : null
    const coverageRead = hasCoverage ? readJsonOrError(coverageFile) : null
    return {
      path,
      hasSpec,
      hasCoverage,
      specFile,
      coverageFile,
      specText,
      requirements: specText ? parseSpecMarkdown(specText) : [],
      coverage: coverageRead?.value ?? null,
      coverageParseError: coverageRead?.parseError ?? null
    }
  })

  return { root, specsRoot, coverageRoot, capabilities }
}
