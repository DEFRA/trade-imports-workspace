import { existsSync } from 'node:fs'
import {
  appendFile,
  mkdir,
  readdir,
  readFile,
  rm,
  writeFile
} from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { TimError } from '../errors.js'
import { htmlToMarkdown } from './html-to-markdown.js'

export const DEFAULT_ROOT_ID = '6447269328'

/**
 * The folder a workspace's Confluence mirror lives in.
 *
 * @param {string} workspaceRoot
 * @returns {string}
 */
export const mirrorFolderOf = (workspaceRoot) =>
  join(workspaceRoot, 'docs', 'confluence')

/**
 * The file and folder name a Confluence title becomes: lower case, `&` as
 * `and`, every other run of characters outside a-z and 0-9 as one `-`.
 *
 * @param {string} title
 * @returns {string}
 */
export const slugOf = (title) =>
  title
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-/, '')
    .replace(/-$/, '')

const shown = (value) => String(value ?? null)

const indentFor = (depth) => ' '.repeat(Math.max(depth, 0) * 2)

const secondsTimestamp = (date) => date.toISOString().replace(/\.\d+Z$/, 'Z')

/**
 * The text of one synced page file: front matter, the title as a heading
 * and the body as Markdown.
 *
 * @param {{id: string, title: string, version: number|null, space: string|null, updated: string|null, body: string}} page
 * @param {string} baseUrl - The Atlassian base URL, as `JIRA_BASE_URL` holds it
 * @returns {string}
 */
export const pageFileText = (page, baseUrl) => {
  const title = shown(page.title)
  const space = shown(page.space)
  const body = htmlToMarkdown(page.body ?? '').replace(/\n+$/, '')
  return [
    '---',
    `confluence-page-id: "${shown(page.id)}"`,
    `title: "${title.replaceAll('"', '\\"')}"`,
    `version: ${shown(page.version)}`,
    `space: ${space}`,
    `last-updated: "${shown(page.updated)}"`,
    `url: "${baseUrl}/wiki/spaces/${space}/pages/${shown(page.id)}"`,
    '---',
    '',
    `# ${title}`,
    '',
    `${body}\n`
  ].join('\n')
}

const markdownFilesUnder = async (folder) => {
  if (!existsSync(folder)) return []
  const entries = await readdir(folder, {
    recursive: true,
    withFileTypes: true
  })
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
}

const findSyncedFile = async (outputDir, pageId) => {
  const pageIdLine = `confluence-page-id: "${pageId}"`
  for (const path of await markdownFilesUnder(outputDir)) {
    const lines = (await readFile(path, 'utf8')).split('\n')
    if (lines.includes(pageIdLine)) return path
  }
  return null
}

const createSyncRun = ({ client, outputDir, baseUrl, dryRun, log, pause }) => {
  const indexFile = join(outputDir, '_index.md')
  const pages = []

  const writePage = async (page, outputPath) => {
    const relativePath = relative(outputDir, outputPath)
    if (dryRun) {
      await log(`  [dry-run] would write: ${relativePath}`)
      return relativePath
    }
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, pageFileText(page, baseUrl))
    pages.push({
      id: shown(page.id),
      title: shown(page.title),
      path: relativePath
    })
    return relativePath
  }

  const addIndexEntry = async (title, relativePath, depth) => {
    if (dryRun) return
    await appendFile(
      indexFile,
      `${indentFor(depth)}- [${title}](${relativePath})\n`
    )
  }

  const startIndex = async (rootId, now) => {
    if (dryRun) return
    await mkdir(outputDir, { recursive: true })
    await writeFile(
      indexFile,
      `# Confluence Docs\n\n> Synced from [Confluence](${baseUrl}/wiki/pages/viewpage.action?pageId=${rootId}) on ${secondsTimestamp(now)}\n\n`
    )
  }

  const syncChildren = async (children, folder, depth) => {
    for (const child of children) {
      await pause()
      await syncNode(child.id, child.type, folder, depth + 1)
    }
  }

  const syncFolder = async (nodeId, folder, depth) => {
    const { title } = await client.getContent(nodeId)
    const nodeFolder = join(folder, slugOf(shown(title)))
    if (!dryRun) await mkdir(nodeFolder, { recursive: true })
    await log(`${indentFor(depth)}[folder] ${shown(title)}`)
    await syncChildren(await client.getChildren(nodeId), nodeFolder, depth)
  }

  const syncPage = async (nodeId, folder, depth) => {
    const page = await client.getPageExport(nodeId)
    const title = shown(page.title)
    const slug = slugOf(title)
    const children = await client.getChildren(nodeId)
    if (children.length === 0) {
      await log(`${indentFor(depth)}[page] ${title}`)
      const relativePath = await writePage(page, join(folder, `${slug}.md`))
      await addIndexEntry(title, relativePath, depth - 1)
      return
    }
    const pageFolder = join(folder, slug)
    await log(
      `${indentFor(depth)}[section] ${title} (${children.length} children)`
    )
    const relativePath = await writePage(page, join(pageFolder, 'index.md'))
    await addIndexEntry(title, relativePath, depth - 1)
    await syncChildren(children, pageFolder, depth)
  }

  const syncNode = (nodeId, nodeType, folder, depth) =>
    nodeType === 'folder'
      ? syncFolder(nodeId, folder, depth)
      : syncPage(nodeId, folder, depth)

  const syncTree = async (rootId, now) => {
    await log('Syncing Confluence docs...')
    await log(`  Root: ${baseUrl}/wiki/pages/viewpage.action?pageId=${rootId}`)
    await log(`  Output: ${outputDir}`)
    if (dryRun) await log('  Mode: DRY RUN (no files written)')
    await log('')
    await startIndex(rootId, now)
    await log('[root-folder]')
    await syncChildren(await client.getChildren(rootId), outputDir, 0)
    await log('')
    if (dryRun) {
      await log('Dry run complete.')
      return
    }
    await log(`Done. ${pages.length} pages synced to ${outputDir}`)
    await log(`Index: ${indexFile}`)
  }

  const syncOnePage = async (pageId) => {
    const existing = await findSyncedFile(outputDir, pageId)
    if (existing === null) {
      throw new TimError(
        'NOT_FOUND',
        `No synced file found for page ${pageId} under ${outputDir}. Run a full sync first so its path is known: tim confluence sync`
      )
    }
    const page = await client.getPageExport(pageId)
    const relativePath = await writePage(page, existing)
    if (!dryRun) {
      await log(
        `Synced '${shown(page.title)}' (version ${shown(page.version)}) → ${relativePath}`
      )
    }
  }

  return { syncTree, syncOnePage, pages, indexFile }
}

const removeMirror = async (outputDir, log) => {
  if (existsSync(outputDir)) {
    await log(`Removing ${outputDir}...`)
    await rm(outputDir, { recursive: true, force: true })
  } else {
    await log(`Nothing to clean (${outputDir} does not exist)`)
  }
  await log('Re-syncing...')
}

/**
 * Mirror a Confluence tree, or refresh one already-synced page, as Markdown
 * under `<workspaceRoot>/docs/confluence`. A page with children becomes
 * `<slug>/index.md`, a page without becomes `<slug>.md`, and a folder becomes
 * `<slug>/`. A full sync also writes `_index.md`. With `clean`, the mirror
 * folder is removed first, so pages deleted in Confluence go too.
 *
 * @param {object} opts
 * @param {object} opts.client - From `createConfluenceClient`
 * @param {string} opts.workspaceRoot
 * @param {string} opts.baseUrl - The Atlassian base URL, as `JIRA_BASE_URL` holds it
 * @param {string} [opts.rootId] - The folder or page the tree starts at
 * @param {string} [opts.pageId] - Refresh only this page, in the file it was synced to
 * @param {boolean} [opts.dryRun] - Fetch and report, but write and remove nothing in the mirror
 * @param {boolean} [opts.clean] - Remove the mirror folder before syncing
 * @param {(line: string) => Promise<void>|void} [opts.log] - Receives each progress line
 * @param {() => Promise<void>} [opts.pause] - Waited on before each child is fetched
 * @param {Date} [opts.now] - When the index says the sync ran
 * @returns {Promise<{outputDir: string, indexFile: string|null, rootId: string|null, pageId: string|null, dryRun: boolean, pages: {id: string, title: string, path: string}[]}>}
 * @throws {TimError} NOT_FOUND when `pageId` has no synced file; the client's errors otherwise
 */
export const syncConfluence = async ({
  client,
  workspaceRoot,
  baseUrl,
  rootId = DEFAULT_ROOT_ID,
  pageId = null,
  dryRun = false,
  clean = false,
  log = () => {},
  pause = () => delay(50),
  now = new Date()
}) => {
  const outputDir = mirrorFolderOf(workspaceRoot)
  if (clean) await removeMirror(outputDir, log)
  const run = createSyncRun({ client, outputDir, baseUrl, dryRun, log, pause })
  if (pageId === null) {
    await run.syncTree(rootId, now)
  } else {
    await run.syncOnePage(pageId)
  }
  const isTree = pageId === null
  return {
    outputDir,
    indexFile: isTree && !dryRun ? run.indexFile : null,
    rootId: isTree ? rootId : null,
    pageId,
    dryRun,
    pages: run.pages
  }
}
