import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { makeFinding } from './finding.js'
import { pageSpecDomain, purposeLineRange, specMaturityOf } from './maturity.js'

const finding = makeFinding('page-maturity')

const PAGE_MENTION = /^\s*\*\*page\*\*/i
const PAGE_LINE = /^\*\*Page\*\*: (\S+)$/

const linesOf = (text) => text.split(/\r\n|\r|\n/)

const frontendOf = (specPrefix) =>
  ({
    'live-animals': 'trade-imports-animals-frontend',
    plants: 'trade-imports-plants-frontend',
    ins: 'trade-imports-ins-frontend'
  })[specPrefix] ?? null

const quotedField = (objectText, field) =>
  objectText.match(new RegExp(`\\b${field}:\\s*['"]([^'"]+)['"]`))?.[1]

const pagesDeclaredIn = (source) =>
  [...source.matchAll(/\{[^{}]*\}/g)]
    .map(([objectText]) => ({
      id: quotedField(objectText, 'id'),
      maturity: quotedField(objectText, 'maturity')
    }))
    .filter((page) => page.id && page.maturity)

const pageFilesUnder = (sourcePath) =>
  readdirSync(sourcePath, { recursive: true })
    .map(String)
    .filter((path) => basename(path) === 'page.js')
    .sort()

const readPages = (repoPath) => {
  const sourcePath = join(repoPath, 'src')
  if (!existsSync(sourcePath)) return new Map()
  const declarations = pageFilesUnder(sourcePath).flatMap((path) =>
    pagesDeclaredIn(readFileSync(join(sourcePath, path), 'utf8')).map(
      (page) => ({ ...page, file: `src/${path}` })
    )
  )
  return new Map(
    Object.entries(Object.groupBy(declarations, ({ id }) => id)).map(
      ([id, pages]) => [
        id,
        pages.map(({ maturity, file }) => ({ maturity, file }))
      ]
    )
  )
}

/**
 * Reads the pages each frontend declares in its `page.js` files under
 * `src/`, once per repo per lint run. A page is an object literal holding
 * a quoted `id` and a quoted `maturity`. `declarationsOf` lists every
 * page that declares an id, in file order, and is empty when none does.
 *
 * @param {string} workspaceRoot
 * @returns {{ repoCheckedOut: (repo: string) => boolean, declarationsOf: (repo: string, pageId: string) => {maturity: string, file: string}[] }}
 */
export const pageMaturityReader = (workspaceRoot) => {
  const pagesByRepo = new Map()
  const repoPath = (repo) => join(workspaceRoot, 'repos', repo)
  const pagesOf = (repo) => {
    if (!pagesByRepo.has(repo)) pagesByRepo.set(repo, readPages(repoPath(repo)))
    return pagesByRepo.get(repo)
  }
  return {
    repoCheckedOut: (repo) => existsSync(repoPath(repo)),
    declarationsOf: (repo, pageId) => pagesOf(repo).get(pageId) ?? []
  }
}

const pageMentionsOf = (capability) =>
  linesOf(capability.specText)
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => PAGE_MENTION.test(line))

const pageIdOf = (capability) =>
  pageMentionsOf(capability)[0]?.line.match(PAGE_LINE)?.[1] ??
  capability.path.split('/').at(-1)

const pageLineFindings = (capability, { line, index }) => {
  const findings = []
  if (!PAGE_LINE.test(line)) {
    findings.push(
      finding(
        capability.path,
        `Page line "${line.trim()}" must read **Page**: <page id>.`
      )
    )
  }
  const purpose = purposeLineRange(linesOf(capability.specText))
  if (!purpose || index <= purpose.start || index >= purpose.end) {
    findings.push(
      finding(capability.path, 'Page line must sit under ## Purpose.')
    )
  }
  return findings
}

/**
 * A `**Page**: <page id>` line appears only in a journey-pages page spec,
 * once, well formed, under its Purpose.
 *
 * @param {object} capability
 * @returns {object[]}
 */
export const checkPageLine = (capability) => {
  if (!capability.hasSpec) return []
  const mentions = pageMentionsOf(capability)
  if (mentions.length === 0) return []
  if (pageSpecDomain(capability.path) === null) {
    return [
      finding(
        capability.path,
        'Only a journey-pages page spec carries a Page line.'
      )
    ]
  }
  if (mentions.length > 1) {
    return [
      finding(
        capability.path,
        `Page spec has ${mentions.length} Page lines. It must have one at most.`
      )
    ]
  }
  return pageLineFindings(capability, mentions[0])
}

const maturityFindings = (capability, level, repo, reader) => {
  const pageId = pageIdOf(capability)
  const declarations = reader.declarationsOf(repo, pageId)
  if (declarations.length === 0) {
    return [
      finding(
        capability.path,
        `No page.js in ${repo} declares a page with the id "${pageId}". Name the page this spec covers with **Page**: <page id> under ## Purpose.`
      )
    ]
  }
  if (declarations.length > 1) {
    return [
      finding(
        capability.path,
        `Page "${pageId}" is declared more than once in ${repo}: ${declarations.map(({ file }) => file).join(', ')}. Give each page its own id.`
      )
    ]
  }
  const [page] = declarations
  if (page.maturity === level) return []
  return [
    finding(
      capability.path,
      `Maturity is ${level}, but page "${pageId}" in ${repo}/${page.file} is ${page.maturity}. They must match.`
    )
  ]
}

/**
 * A journey-pages page spec's Maturity line matches the maturity its
 * frontend's page declares. The page is the one whose id is the spec's
 * folder name, or the one its Page line names. A spec whose frontend is
 * not checked out under `repos/` is left out and its repo reported.
 *
 * @param {object} capability
 * @param {ReturnType<typeof pageMaturityReader>} reader
 * @returns {{ findings: object[], uncheckedRepos: string[] }}
 */
export const checkPageMaturityMatchesFrontend = (capability, reader) => {
  const level = specMaturityOf(capability)
  const repo = level && frontendOf(pageSpecDomain(capability.path))
  if (!repo) return { findings: [], uncheckedRepos: [] }
  if (!reader.repoCheckedOut(repo)) {
    return { findings: [], uncheckedRepos: [repo] }
  }
  return {
    findings: maturityFindings(capability, level, repo, reader),
    uncheckedRepos: []
  }
}
