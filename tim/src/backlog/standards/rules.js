import { readFileSync, readdirSync, lstatSync } from 'node:fs'
import { join, relative, dirname, sep } from 'node:path'
import { load as yamlLoad } from 'js-yaml'
import picomatch from 'picomatch'
import { TimError } from '../../errors.js'

const WORKSPACE_PREFIX = '~/git/defra/trade-imports-workspace/'
const FRONT_MATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/
const LIST_ITEM_START_RE = /^-\s+(.*)$/
const CONTINUATION_RE = /^\s+\S/
const FENCE_RE = /^\s*```/
const BACKTICK_RE = /`([^`]+)`/g
const TOPIC_DIR_RE = /^Topic dir:\s*`([^`]+)`/
const CLAUDE_DIR_NAME = '.claude'
const RULES_DIR_NAME = 'rules'
const WORKTREES_DIR_NAME = 'worktrees'

const SKIP_DIR_NAMES = new Set(['node_modules', '.git', 'workareas'])

const isRealDirectory = (absPath) => {
  try {
    return lstatSync(absPath).isDirectory()
  } catch {
    return false
  }
}

const toRelPosix = (workspaceRoot, absPath) =>
  relative(workspaceRoot, absPath).split(sep).join('/')

/**
 * Expand one level of brace alternation: `a/{b.md,c.md}` -> `a/b.md, a/c.md`.
 * A token with no braces expands to itself.
 *
 * @param {string} token
 * @returns {string[]}
 */
export const expandBraces = (token) => {
  const match = token.match(/^(.*)\{([^}]+)\}(.*)$/)
  if (!match) return [token]
  const [, prefix, alternatives, suffix] = match
  return alternatives.split(',').map((alt) => `${prefix}${alt}${suffix}`)
}

const stripTrailingSlash = (dir) => dir.replace(/\/$/, '')

const joinRelative = (base, rel) =>
  base ? `${stripTrailingSlash(base)}/${rel}` : rel

const resolveToken = (token, { topicDirRelative, scopeRootRelative }) => {
  if (token.startsWith(WORKSPACE_PREFIX)) {
    return token.slice(WORKSPACE_PREFIX.length)
  }
  if (topicDirRelative) {
    return joinRelative(topicDirRelative, token)
  }
  return joinRelative(scopeRootRelative, token)
}

const resolveTopicDir = (topicDirRaw, scopeRootRelative) =>
  topicDirRaw.startsWith(WORKSPACE_PREFIX)
    ? topicDirRaw.slice(WORKSPACE_PREFIX.length)
    : joinRelative(scopeRootRelative, topicDirRaw)

const listItemsOf = (body) => {
  const items = []
  let current = null
  let inFence = false
  for (const line of body.split('\n')) {
    if (FENCE_RE.test(line)) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const startMatch = line.match(LIST_ITEM_START_RE)
    if (startMatch) {
      if (current !== null) items.push(current)
      current = startMatch[1]
      continue
    }
    if (current !== null && CONTINUATION_RE.test(line)) {
      current += `\n${line.trim()}`
      continue
    }
    if (current !== null) items.push(current)
    current = null
  }
  if (current !== null) items.push(current)
  return items
}

/**
 * The docs one rule's body points at, and its Topic dir.
 *
 * @param {string} body - The rule's markdown, front matter already removed
 * @param {object} args
 * @param {string} args.scopeRootRelative
 * @param {string} args.relRulePath - For error messages only
 * @returns {{pointsTo: string[], topicDirRelative: string|null}}
 * @throws {TimError} PARSE when a Topic dir token does not end with `/`
 */
export const extractPointers = (body, { scopeRootRelative, relRulePath }) => {
  const items = listItemsOf(body)

  const topicDirItem = items.find((item) => TOPIC_DIR_RE.test(item))
  const topicDirRaw = topicDirItem ? topicDirItem.match(TOPIC_DIR_RE)[1] : null

  if (topicDirRaw && !topicDirRaw.endsWith('/')) {
    throw new TimError(
      'PARSE',
      `\`${relRulePath}\`'s Topic dir \`${topicDirRaw}\` must end with "/".`
    )
  }

  const topicDirRelative = topicDirRaw
    ? resolveTopicDir(topicDirRaw, scopeRootRelative)
    : null

  const pointsTo = []
  const seen = new Set()
  for (const item of items) {
    const isTopicDirItem = TOPIC_DIR_RE.test(item)
    let match
    BACKTICK_RE.lastIndex = 0
    while ((match = BACKTICK_RE.exec(item)) !== null) {
      const token = match[1]
      if (isTopicDirItem && token === topicDirRaw) continue
      for (const expanded of expandBraces(token)) {
        if (!expanded.endsWith('.md')) continue
        const resolved = resolveToken(expanded, {
          topicDirRelative,
          scopeRootRelative
        })
        if (seen.has(resolved)) continue
        seen.add(resolved)
        pointsTo.push(resolved)
      }
    }
  }

  return { pointsTo, topicDirRelative }
}

/**
 * Every ancestor folder of `path`, from the workspace root down to the
 * file's own folder, that has a real (not symlinked) `.claude/rules` folder.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.path - Workspace-relative, `/`-separated
 * @returns {{scopeRootRelative: string, claudeDirAbs: string, rulesDirAbs: string}[]}
 */
export const rulesFoldersFor = ({ workspaceRoot, path }) => {
  const dirRel = dirname(path)
  const segments = dirRel === '.' ? [] : dirRel.split('/')
  const descendantPaths = segments.reduce((acc, segment) => {
    const next = acc.length ? `${acc.at(-1)}/${segment}` : segment
    return [...acc, next]
  }, [])
  const ancestors = ['', ...descendantPaths]

  return ancestors
    .map((scopeRootRelative) => ({
      scopeRootRelative,
      claudeDirAbs: join(workspaceRoot, scopeRootRelative, CLAUDE_DIR_NAME),
      rulesDirAbs: join(
        workspaceRoot,
        scopeRootRelative,
        CLAUDE_DIR_NAME,
        RULES_DIR_NAME
      )
    }))
    .filter(
      ({ claudeDirAbs, rulesDirAbs }) =>
        isRealDirectory(claudeDirAbs) && isRealDirectory(rulesDirAbs)
    )
}

const listMarkdownFilesRecursively = (dirAbs) => {
  const results = []
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const entryAbs = join(current, entry.name)
      if (entry.isDirectory()) {
        walk(entryAbs)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        results.push(entryAbs)
      }
    }
  }
  walk(dirAbs)
  return results.sort()
}

const parseFrontMatterGlobs = (raw, relRulePath) => {
  const frontMatterMatch = raw.match(FRONT_MATTER_RE)
  if (!frontMatterMatch) return { body: raw, globs: null }

  const body = raw.slice(frontMatterMatch[0].length)
  let parsed
  try {
    parsed = yamlLoad(frontMatterMatch[1])
  } catch (error) {
    throw new TimError(
      'PARSE',
      `Cannot read the front matter of \`${relRulePath}\`: ${error.message}`
    )
  }
  if (!parsed || parsed.paths === undefined) return { body, globs: null }

  const paths = parsed.paths
  if (typeof paths === 'string') return { body, globs: [paths] }
  if (
    Array.isArray(paths) &&
    paths.every((entry) => typeof entry === 'string')
  ) {
    return { body, globs: paths }
  }
  throw new TimError(
    'PARSE',
    `Cannot read the front matter of \`${relRulePath}\`: "paths" must be a string or a list of strings.`
  )
}

/**
 * Read and parse one rule file: its front matter `paths` and the docs its
 * body points at.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.ruleAbsPath
 * @param {string} args.scopeRootRelative
 * @returns {{path: string, scopeRootRelative: string, globs: string[]|null, topicDirRelative: string|null, pointsTo: string[]}}
 * @throws {TimError} PARSE when the front matter does not parse, `paths`
 *   is not a string or a list of strings, or a Topic dir does not end `/`
 */
export const loadRule = ({ workspaceRoot, ruleAbsPath, scopeRootRelative }) => {
  const relRulePath = toRelPosix(workspaceRoot, ruleAbsPath)
  const raw = readFileSync(ruleAbsPath, 'utf8')

  const { body, globs } = parseFrontMatterGlobs(raw, relRulePath)
  const { pointsTo, topicDirRelative } = extractPointers(body, {
    scopeRootRelative,
    relRulePath
  })

  return {
    path: relRulePath,
    scopeRootRelative,
    globs,
    topicDirRelative,
    pointsTo
  }
}

/**
 * Test one loaded rule against a file's workspace-relative path.
 *
 * @param {{globs: string[]|null, scopeRootRelative: string}} rule
 * @param {string} path - Workspace-relative, `/`-separated
 * @returns {{matches: boolean, matchedBy: string|null}}
 */
export const matchRule = (rule, path) => {
  if (
    rule.scopeRootRelative &&
    !path.startsWith(`${rule.scopeRootRelative}/`)
  ) {
    return { matches: false, matchedBy: null }
  }
  const relToScope = rule.scopeRootRelative
    ? path.slice(rule.scopeRootRelative.length + 1)
    : path

  if (!rule.globs) {
    return { matches: true, matchedBy: null }
  }
  const matchedBy = rule.globs.find((glob) =>
    picomatch(glob, { dot: true })(relToScope)
  )
  return matchedBy
    ? { matches: true, matchedBy }
    : { matches: false, matchedBy: null }
}

/**
 * Every `.claude/rules` folder in the workspace, found by a folder walk
 * that skips `node_modules`, `.git`, `workareas`, `.claude/worktrees` and
 * every dot-folder other than `.claude`.
 *
 * @param {string} workspaceRoot
 * @returns {string[]} scope-root-relative folders, each with its own
 *   `.claude/rules`
 */
export const findAllRulesFolders = (workspaceRoot) => {
  const shouldDescend = (name, isClaudeChild) => {
    if (SKIP_DIR_NAMES.has(name)) return false
    if (name.startsWith('.') && name !== CLAUDE_DIR_NAME) return false
    if (isClaudeChild && name === WORKTREES_DIR_NAME) return false
    return true
  }

  const walk = (dirAbs, dirRel) => {
    const claudeDirAbs = join(dirAbs, CLAUDE_DIR_NAME)
    const rulesDirAbs = join(claudeDirAbs, RULES_DIR_NAME)
    const self =
      isRealDirectory(claudeDirAbs) && isRealDirectory(rulesDirAbs)
        ? [dirRel]
        : []

    const children = readdirSync(dirAbs, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) =>
        shouldDescend(entry.name, dirAbs.endsWith(sep + CLAUDE_DIR_NAME))
      )
      .flatMap((entry) => {
        const childRel = dirRel ? `${dirRel}/${entry.name}` : entry.name
        return walk(join(dirAbs, entry.name), childRel)
      })

    return [...self, ...children]
  }

  return walk(workspaceRoot, '').sort()
}

/**
 * Every rule under one scope-root-relative `.claude/rules` folder, loaded
 * and parsed.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.scopeRootRelative
 * @returns {ReturnType<typeof loadRule>[]}
 */
export const loadRulesIn = ({ workspaceRoot, scopeRootRelative }) => {
  const rulesDirAbs = join(workspaceRoot, scopeRootRelative, '.claude', 'rules')
  return listMarkdownFilesRecursively(rulesDirAbs).map((ruleAbsPath) =>
    loadRule({ workspaceRoot, ruleAbsPath, scopeRootRelative })
  )
}
