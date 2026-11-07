import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { run } from '../exec/exec.js'
import { TimError } from '../errors.js'
import picomatch from 'picomatch'
import { gitLines } from './git-files.js'
import { DEFAULT_BASE } from './duplication.js'

export const DEFAULT_FLOOR = 90

export const LCOV_REPORT = 'coverage/lcov.info'

export const JACOCO_REPORT = 'target/site/jacoco/jacoco.xml'

const ADDED_HUNK = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/

const DIFF_FILE = /^\+\+\+ b\/(.+)$/

// Jacoco writes its report as one line, so this reads the whole document in
// element order rather than line by line.
const JACOCO_ELEMENT =
  /<package name="([^"]*)"|<sourcefile name="([^"]*)"|<line nr="(\d+)" mi="(\d+)" ci="(\d+)" mb="(\d+)" cb="(\d+)"/g

const assertBaseExists = async (repoPath, base) => {
  const { exitCode } = await run(
    'git',
    ['rev-parse', '--verify', '--quiet', `${base}^{commit}`],
    { cwd: repoPath }
  )
  if (exitCode !== 0) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find ${base} in ${repoPath}. Fetch it, or name another base with --base.`
    )
  }
}

const repoRootOf = async (repoPath) =>
  (await gitLines(repoPath, ['rev-parse', '--show-toplevel']))[0]

const linesOfHunk = (header) => {
  const [, first, count] = header.match(ADDED_HUNK)
  const added = count === undefined ? 1 : Number(count)
  const from = Number(first)
  return Array.from({ length: added }, (_, offset) => from + offset)
}

const addedLinesOfDiff = (diff) => {
  const files = new Map()
  let current = null
  for (const line of diff.split('\n')) {
    const named = line.match(DIFF_FILE)
    if (named) {
      current = named[1]
      if (!files.has(current)) files.set(current, new Set())
      continue
    }
    if (current && ADDED_HUNK.test(line)) {
      for (const number of linesOfHunk(line)) files.get(current).add(number)
    }
  }
  return files
}

const everyLineOf = (root, file) => {
  const contents = readFileSync(join(root, file), 'utf8')
  const count = contents.split('\n').length - (contents.endsWith('\n') ? 1 : 0)
  return new Set(Array.from({ length: count }, (_, index) => index + 1))
}

const withUntracked = async (root, files) => {
  const untracked = await gitLines(root, [
    'ls-files',
    '--others',
    '--exclude-standard'
  ])
  for (const file of untracked) {
    if (!existsSync(join(root, file))) continue
    if (statSync(join(root, file)).isDirectory()) continue
    files.set(file, everyLineOf(root, file))
  }
  return files
}

/**
 * The lines a branch adds to each file since `base`, committed or not, keyed by
 * the file's path relative to the checkout's root. Every line of an untracked
 * file counts as added.
 *
 * @param {string} root - The checkout's root
 * @param {string} base - The ref the branch is measured against
 * @returns {Promise<Map<string, Set<number>>>}
 * @throws {TimError} UNKNOWN when git fails
 */
export const addedLines = async (root, base) => {
  const { exitCode, stdout, stderr } = await run(
    'git',
    ['diff', '--merge-base', base, '--unified=0', '--diff-filter=d'],
    { cwd: root }
  )
  if (exitCode !== 0) {
    throw new TimError(
      'UNKNOWN',
      `git diff against ${base} failed in ${root}: ${stderr.trim()}`
    )
  }
  return withUntracked(root, addedLinesOfDiff(stdout))
}

const measurement = (covered, conditions, coveredConditions) => ({
  covered,
  conditions,
  coveredConditions
})

const lcovMeasurements = (text) => {
  const files = new Map()
  let lines = null
  for (const line of text.split('\n')) {
    if (line.startsWith('SF:')) {
      lines = new Map()
      files.set(line.slice(3).trim(), lines)
      continue
    }
    if (!lines) continue
    if (line.startsWith('DA:')) {
      const [number, hits] = line.slice(3).split(',')
      const held = lines.get(Number(number))
      lines.set(
        Number(number),
        measurement(
          Number(hits) > 0,
          held?.conditions ?? 0,
          held?.coveredConditions ?? 0
        )
      )
      continue
    }
    if (line.startsWith('BRDA:')) {
      const [number, , , taken] = line.slice(5).split(',')
      const held = lines.get(Number(number)) ?? measurement(false, 0, 0)
      const hit = taken !== '-' && Number(taken) > 0
      lines.set(
        Number(number),
        measurement(
          held.covered,
          held.conditions + 1,
          held.coveredConditions + (hit ? 1 : 0)
        )
      )
    }
  }
  return files
}

const jacocoMeasurements = (text) => {
  const files = new Map()
  let packageName = null
  let lines = null
  for (const [
    ,
    inPackage,
    sourcefile,
    number,
    ,
    covered,
    missedBranches,
    coveredBranches
  ] of text.matchAll(JACOCO_ELEMENT)) {
    if (inPackage !== undefined) {
      packageName = inPackage
      continue
    }
    if (sourcefile !== undefined) {
      lines = new Map()
      files.set(`${packageName}/${sourcefile}`, lines)
      continue
    }
    if (!lines) continue
    lines.set(
      Number(number),
      measurement(
        Number(covered) > 0,
        Number(missedBranches) + Number(coveredBranches),
        Number(coveredBranches)
      )
    )
  }
  return files
}

const SONAR_PROPERTIES = 'sonar-project.properties'

const POM_SONAR_PROPERTY = /<(sonar\.[\w.]+)>([^<]*)<\/sonar\.[\w.]+>/

const propertiesFile = (text) =>
  Object.fromEntries(
    text
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => [
        line.slice(0, line.indexOf('=')).trim(),
        line.slice(line.indexOf('=') + 1).trim()
      ])
  )

const pomProperties = (text) =>
  Object.fromEntries(
    text
      .split('\n')
      .map((line) => line.match(POM_SONAR_PROPERTY))
      .filter(Boolean)
      .map(([, key, value]) => [key, value.trim()])
  )

const sonarPropertiesIn = (root, folder) => {
  const properties = join(root, rootRelative(folder, SONAR_PROPERTIES))
  if (existsSync(properties)) {
    return propertiesFile(readFileSync(properties, 'utf8'))
  }
  const pom = join(root, rootRelative(folder, 'pom.xml'))
  return existsSync(pom) ? pomProperties(readFileSync(pom, 'utf8')) : {}
}

const listOf = (value) =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

const asPrefix = (path) => (path.endsWith('/') ? path : `${path}/`)

const matchesAny = (patterns) => {
  if (patterns.length === 0) return null
  const matches = picomatch(patterns, { dot: true })
  return (file) =>
    matches(file) ||
    patterns.some(
      (pattern) => file === pattern || file.startsWith(asPrefix(pattern))
    )
}

/**
 * Whether SonarCloud measures a file's coverage, from the project's own Sonar
 * properties: it must be under `sonar.sources` where that is set, and out of
 * `sonar.exclusions`, `sonar.coverage.exclusions` and `sonar.test.inclusions`.
 * A project that sets none measures every file its coverage report names.
 *
 * @param {object} properties - The project's sonar.* properties
 * @returns {(file: string) => boolean} Takes a path relative to the project
 */
export const measuredBySonar = (properties) => {
  const inSources = matchesAny(listOf(properties['sonar.sources']))
  const excluded = matchesAny([
    ...listOf(properties['sonar.exclusions']),
    ...listOf(properties['sonar.coverage.exclusions']),
    ...listOf(properties['sonar.test.inclusions'])
  ])
  return (file) =>
    (inSources === null || inSources(file)) &&
    (excluded === null || !excluded(file))
}

// A narrow test run overwrites the report with its own files' coverage, so what
// the report measures is only the whole repo when the whole suite wrote it. The
// result carries when it was written, and the caller says which run that was.
const writtenAt = (root, reports) =>
  new Date(
    Math.max(...reports.map(({ path }) => statSync(join(root, path)).mtimeMs))
  ).toISOString()

const projectFolders = async (root) => {
  const manifests = await gitLines(root, [
    'ls-files',
    '--cached',
    '--others',
    '--exclude-standard',
    '*package.json',
    '*pom.xml'
  ])
  return [
    ...new Set(['.', ...manifests.map((manifest) => dirname(manifest))])
  ].sort()
}

const reportsIn = async (root) =>
  (await projectFolders(root)).flatMap((folder) =>
    [
      { path: join(folder, LCOV_REPORT), kind: 'lcov', folder },
      { path: join(folder, JACOCO_REPORT), kind: 'jacoco', folder }
    ].filter(({ path }) => existsSync(join(root, path)))
  )

const rootRelative = (folder, file) =>
  folder === '.' ? file : join(folder, file)

const underTheRoot = (folder, files) =>
  new Map(
    [...files].map(([file, lines]) => [rootRelative(folder, file), lines])
  )

const withinFolder = (folder, file) =>
  folder === '.' || !file.startsWith(asPrefix(folder))
    ? file
    : file.slice(asPrefix(folder).length)

const measurementsOf = (root, reports) =>
  reports.map(({ path, kind, folder }) => {
    const text = readFileSync(join(root, path), 'utf8')
    return {
      path,
      kind,
      folder,
      measures: measuredBySonar(sonarPropertiesIn(root, folder)),
      files:
        kind === 'lcov'
          ? underTheRoot(folder, lcovMeasurements(text))
          : jacocoMeasurements(text)
    }
  })

const measuredLinesIn = (file, { kind, files }) => {
  if (kind === 'lcov') return files.get(file) ?? null
  for (const [suffix, lines] of files) {
    if (file === suffix || file.endsWith(`/${suffix}`)) return lines
  }
  return null
}

const measuredLinesOf = (file, measurements) => {
  for (const report of measurements) {
    const lines = measuredLinesIn(file, report)
    if (!lines) continue
    return report.measures(withinFolder(report.folder, file)) ? lines : null
  }
  return null
}

const countsOf = (added, measured) => {
  const uncovered = []
  let lines = 0
  let covered = 0
  let conditions = 0
  let coveredConditions = 0
  for (const number of [...added].sort((first, second) => first - second)) {
    const measurement = measured.get(number)
    if (!measurement) continue
    lines += 1
    conditions += measurement.conditions
    coveredConditions += measurement.coveredConditions
    if (measurement.covered) covered += 1
    const everyCondition =
      measurement.conditions === measurement.coveredConditions
    if (!measurement.covered || !everyCondition) uncovered.push(number)
  }
  return { lines, covered, conditions, coveredConditions, uncovered }
}

const fileCoverage = (file, added, measurements) => {
  const measured = measuredLinesOf(file, measurements)
  if (!measured) return null
  const counts = countsOf(added, measured)
  return counts.lines === 0 ? null : { file, ...counts }
}

const percentOf = (files) => {
  const toCover = files.reduce(
    (total, { lines, conditions }) => total + lines + conditions,
    0
  )
  const met = files.reduce(
    (total, { covered, coveredConditions }) =>
      total + covered + coveredConditions,
    0
  )
  return { toCover, met, percent: toCover === 0 ? null : (met / toCover) * 100 }
}

/**
 * How much of the code a branch adds its own tests cover, measured the way a
 * SonarCloud `new_coverage` condition measures it: every line and condition the
 * branch added that the repo's own coverage report knows about, covered over
 * coverable. A file the report does not name is left out, so a test file the
 * report excludes never counts against the number.
 *
 * It reads the report the test rung has already written — `coverage/lcov.info`
 * for a Node repo, `target/site/jacoco/jacoco.xml` for each Maven module of a
 * Java one — and runs no test of its own.
 *
 * @param {object} args
 * @param {string} args.repoPath - A git checkout, or a folder inside one
 * @param {string} [args.base] - The ref the branch is measured against
 * @param {number} [args.floor] - The percentage the branch must reach
 * @returns {Promise<{base: string, floor: number, reports: string[], measuredAt: string, percent: number|null, floorMet: boolean, toCover: number, met: number, files: {file: string, lines: number, covered: number, conditions: number, coveredConditions: number, uncovered: number[]}[]}>}
 * @throws {TimError} NOT_FOUND when `base` or a coverage report is missing; UNKNOWN when git fails
 */
export const newCodeCoverage = async ({
  repoPath,
  base = DEFAULT_BASE,
  floor = DEFAULT_FLOOR
}) => {
  await assertBaseExists(repoPath, base)
  const root = await repoRootOf(repoPath)
  const reports = await reportsIn(root)
  if (reports.length === 0) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find a coverage report in ${root}. Looked for ${LCOV_REPORT} and ${JACOCO_REPORT} beside every pom.xml. Run the repo's test suite first: this reads what the suite writes and runs nothing itself.`
    )
  }
  const measurements = measurementsOf(root, reports)
  const added = await addedLines(root, base)
  const files = [...added]
    .map(([file, lines]) => fileCoverage(file, lines, measurements))
    .filter(Boolean)
    .sort((first, second) => first.file.localeCompare(second.file))
  const { toCover, met, percent } = percentOf(files)
  return {
    base,
    floor,
    reports: reports.map(({ path }) => path),
    measuredAt: writtenAt(root, reports),
    files,
    toCover,
    met,
    percent,
    floorMet: percent === null || percent >= floor
  }
}
