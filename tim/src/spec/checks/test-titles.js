import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parsedCoverage } from './shape.js'
import { makeFinding } from './finding.js'

const finding = makeFinding('test-titles')

const STRING_LITERAL =
  /'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g
const PLACEHOLDER = /%[sdifjop#%]|\$\{[^}]*\}|\$[A-Za-z_][\w.]*/g
const HAS_PLACEHOLDER = new RegExp(PLACEHOLDER.source)

const unescaped = (literal) => literal.replaceAll(/\\(.)/g, '$1')

const escapedForRegex = (text) => text.replaceAll(/[.*+?^${}()|[\]\\]/g, '\\$&')

const titlePatternOf = (literal) =>
  new RegExp(
    `^${literal
      .split(PLACEHOLDER)
      .map((part) => escapedForRegex(unescaped(part)))
      .join('.+')}$`,
    's'
  )

const RELATIVE_IMPORT = /(?:from|import)\s*\(?\s*['"](\.{1,2}\/[^'"]+)['"]/g

const titlesIn = (source) => {
  const literals = [...source.matchAll(STRING_LITERAL)].map(
    (match) => match[1] ?? match[2] ?? match[3]
  )
  return {
    sources: [source],
    exact: new Set(literals.map(unescaped)),
    patterns: literals
      .filter((literal) => HAS_PLACEHOLDER.test(literal))
      .map(titlePatternOf)
  }
}

const mergedTitles = (titlesList) => ({
  sources: titlesList.flatMap((titles) => titles.sources),
  exact: new Set(titlesList.flatMap((titles) => [...titles.exact])),
  patterns: titlesList.flatMap((titles) => titles.patterns)
})

const relativeImportsOf = (source, path) =>
  [...source.matchAll(RELATIVE_IMPORT)].map((match) =>
    join(dirname(path), match[1])
  )

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/

const holdsMethodNamed = (sources, name) => {
  const wholeName = new RegExp(`(?<![\\w$])${escapedForRegex(name)}(?![\\w$])`)
  return sources.some((source) => wholeName.test(source))
}

const holdsTitle = ({ sources, exact, patterns }, title) =>
  exact.has(title) ||
  patterns.some((pattern) => pattern.test(title)) ||
  (IDENTIFIER.test(title) && holdsMethodNamed(sources, title))

const linksOf = (coverage) =>
  coverage.requirements.flatMap((requirement) =>
    requirement.scenarios.flatMap((scenario) =>
      (scenario.tests ?? [])
        .filter((link) => link.repo && link.file && link.test)
        .map((link) => ({ scenarioId: scenario.id, ...link }))
    )
  )

const isFile = (path) => existsSync(path) && statSync(path).isFile()

/**
 * Reads each test file once per lint run, so many links into one file cost
 * one read. A file's titles include those of every module it imports by a
 * relative path, followed transitively, because shared test helpers register
 * tests under the importing file.
 *
 * @param {string} workspaceRoot
 * @returns {{ repoCheckedOut: (repo: string) => boolean, titlesOf: (repo: string, file: string) => (object | null) }}
 */
export const testFileReader = (workspaceRoot) => {
  const ownTitlesByPath = new Map()
  const repoPath = (repo) => join(workspaceRoot, 'repos', repo)

  const ownTitlesOf = (path) => {
    if (!ownTitlesByPath.has(path)) {
      const source = readFileSync(path, 'utf8')
      ownTitlesByPath.set(path, {
        titles: titlesIn(source),
        imports: relativeImportsOf(source, path).filter(isFile)
      })
    }
    return ownTitlesByPath.get(path)
  }

  const reachableFrom = (path) => {
    const seen = new Set()
    const pending = [path]
    while (pending.length > 0) {
      const next = pending.pop()
      if (seen.has(next)) continue
      seen.add(next)
      pending.push(...ownTitlesOf(next).imports)
    }
    return [...seen]
  }

  return {
    repoCheckedOut: (repo) => existsSync(repoPath(repo)),
    titlesOf: (repo, file) => {
      const path = join(repoPath(repo), file)
      if (!isFile(path)) return null
      return mergedTitles(
        reachableFrom(path).map((reached) => ownTitlesOf(reached).titles)
      )
    }
  }
}

const problemWith = (reader, link) => {
  const titles = reader.titlesOf(link.repo, link.file)
  if (!titles) {
    return `${link.scenarioId} links ${link.file}, which is not in ${link.repo}.`
  }
  if (holdsTitle(titles, link.test)) return null
  return `${link.scenarioId} links the test "${link.test}", which is not in ${link.repo}/${link.file}.`
}

/**
 * Check 13 — every coverage link names a file that exists in its repo, and a
 * test title that file holds, either word for word or as a parameterised
 * title (`%s`, `$name`, `${…}`) it expands to. A link into a repo that is not
 * checked out under `repos/` is left out and its repo reported, so the
 * caller can say what it did not check.
 *
 * @param {object} capability
 * @param {ReturnType<typeof testFileReader>} reader
 * @returns {{ findings: object[], uncheckedRepos: string[] }}
 */
export const checkTestTitlesExist = (capability, reader) => {
  const coverage = parsedCoverage(capability)
  if (!coverage) return { findings: [], uncheckedRepos: [] }
  const links = linksOf(coverage)
  const checkable = links.filter((link) => reader.repoCheckedOut(link.repo))
  const uncheckedRepos = [
    ...new Set(
      links
        .filter((link) => !reader.repoCheckedOut(link.repo))
        .map((link) => link.repo)
    )
  ]
  const findings = checkable
    .map((link) => problemWith(reader, link))
    .filter(Boolean)
    .map((message) => finding(capability.path, message))
  return { findings, uncheckedRepos }
}
