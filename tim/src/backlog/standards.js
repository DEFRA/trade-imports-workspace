import { join, dirname, isAbsolute } from 'node:path'
import { existsSync, statSync } from 'node:fs'
import { TimError } from '../errors.js'
import { PROBLEM_KIND } from './standards/problem-kind.js'
import {
  rulesFoldersFor,
  loadRulesIn,
  matchRule,
  findAllRulesFolders
} from './standards/rules.js'
import {
  claudeChainFor,
  importsOf,
  memoryIndexPath
} from './standards/claude-chain.js'
import {
  loadCodeStyleRouting,
  topicsForPath,
  bestPracticeForTopics,
  CODE_STYLE_ROUTING_PATH
} from './standards/code-style-routing.js'
import {
  loadReviewRouting,
  detectTechnologies,
  REVIEW_ROUTING_PATH
} from './standards/review-routing.js'
import { listRepoFiles } from './standards/repo-files.js'
import { fileBlobSha } from './standards/blob-sha.js'

/**
 * inc-012's live standards resolver: for a set of planned files and repos,
 * lists the matching `.claude/rules`, the code-style and review skills'
 * routing, the CLAUDE.md chain with its `@` imports, and the memory
 * index — everything req-040/041/042/043/122 ask a build or review task to
 * read, resolved from the current working tree at call time (no bake
 * step, no bash router). `standards.js` composes; each concern is its own
 * sibling module under `standards/`.
 */

const problemMessage = (problem) => {
  if (problem.kind === PROBLEM_KIND.TOPIC_DIR) {
    return `\`${problem.source}\`'s Topic dir \`${problem.pointer}\` does not exist, or is not a folder.`
  }
  if (problem.kind === PROBLEM_KIND.IMPORT) {
    return `\`${problem.source}\` imports \`${problem.pointer}\`, which does not exist.`
  }
  if (problem.kind === PROBLEM_KIND.ROUTING) {
    return `\`${problem.source}\` names \`${problem.pointer}\`, which does not exist.`
  }
  return `\`${problem.source}\` points to \`${problem.pointer}\`, which does not exist.`
}

const failOnProblems = (problems) => {
  if (!problems.length) return
  throw new TimError('LINT', problems.map(problemMessage).join('\n'))
}

const topicDirProblem = (workspaceRoot, rule) => {
  if (!rule.topicDirRelative) return null
  const abs = join(workspaceRoot, rule.topicDirRelative)
  if (existsSync(abs) && statSync(abs).isDirectory()) return null
  return {
    kind: PROBLEM_KIND.TOPIC_DIR,
    source: rule.path,
    pointer: rule.topicDirRelative,
    resolved: rule.topicDirRelative
  }
}

const rulePointerProblems = (workspaceRoot, rule) => {
  const problems = []
  const topicDirProb = topicDirProblem(workspaceRoot, rule)
  if (topicDirProb) problems.push(topicDirProb)
  for (const pointer of rule.pointsTo) {
    if (!existsSync(join(workspaceRoot, pointer))) {
      problems.push({
        kind: PROBLEM_KIND.RULE_POINTER,
        source: rule.path,
        pointer,
        resolved: pointer
      })
    }
  }
  return problems
}

const routingPathProblems = (workspaceRoot, source, paths) =>
  paths
    .filter((path) => !existsSync(join(workspaceRoot, path)))
    .map((path) => ({
      kind: PROBLEM_KIND.ROUTING,
      source,
      pointer: path,
      resolved: path
    }))

/**
 * Every rule that matches one workspace-relative file, across every
 * `.claude/rules` folder on its ancestor chain — the union across folders
 * (req-040 §2.12: `copy.md` and `node.md` both match `copy.en.js`).
 *
 * @param {string} workspaceRoot
 * @param {string} path - Workspace-relative, `/`-separated
 * @returns {{rules: object[], problems: object[]}}
 */
const rulesForFile = (workspaceRoot, path) => {
  const matches = rulesFoldersFor({ workspaceRoot, path })
    .flatMap(({ scopeRootRelative }) =>
      loadRulesIn({ workspaceRoot, scopeRootRelative })
    )
    .map((rule) => ({ rule, match: matchRule(rule, path) }))
    .filter(({ match }) => match.matches)

  return {
    rules: matches.map(({ rule, match }) => ({
      path: rule.path,
      matchedBy: match.matchedBy,
      pointsTo: rule.pointsTo
    })),
    problems: matches.flatMap(({ rule }) =>
      rulePointerProblems(workspaceRoot, rule)
    )
  }
}

/**
 * The blob shas for a set of paths, each workspace-relative or absolute
 * (detected per path — a rule/best-practice/CLAUDE.md path is always
 * workspace-relative, an import or the memory index may be either).
 * Shared by `resolveFileEntry` and `resolveRepoEntry` so both categorise
 * imports the same way (an import outside the workspace still gets a sha).
 *
 * @param {string} workspaceRoot
 * @param {string[]} paths
 * @returns {Record<string, string>}
 */
const shasForPaths = (workspaceRoot, paths) =>
  Object.fromEntries(
    paths
      .map((path) => [
        path,
        fileBlobSha(isAbsolute(path) ? path : join(workspaceRoot, path))
      ])
      .filter(([, sha]) => sha)
  )

const chainAndMemoryFor = ({
  workspaceRoot,
  folder,
  claudeConfigDir,
  homeDir
}) => {
  const claudeMd = claudeChainFor({ workspaceRoot, folder })
  const { imports, problems } = importsOf({
    workspaceRoot,
    files: claudeMd,
    homeDir
  })
  const memPath = memoryIndexPath({ workspaceRoot, claudeConfigDir })
  const memoryExists = existsSync(memPath)
  return {
    claudeMd,
    imports,
    problems,
    memory: memoryExists ? [memPath] : [],
    notes: memoryExists ? [] : [`No memory index at ${memPath}.`],
    memPath,
    memoryExists
  }
}

const resolveFileEntry = ({
  workspaceRoot,
  repoKey,
  relPathInRepo,
  repoRootRelative,
  codeStyleRouting,
  claudeConfigDir,
  homeDir
}) => {
  const path = repoRootRelative
    ? `${repoRootRelative}/${relPathInRepo}`
    : relPathInRepo

  const { rules, problems: ruleProblems } = rulesForFile(workspaceRoot, path)
  const topics = topicsForPath(codeStyleRouting, relPathInRepo)
  const bestPractice = bestPracticeForTopics(codeStyleRouting, topics)
  const bpProblems = routingPathProblems(
    workspaceRoot,
    CODE_STYLE_ROUTING_PATH,
    bestPractice
  )

  const dir = dirname(path)
  const {
    claudeMd,
    imports,
    problems: importProblems,
    memory,
    notes,
    memPath,
    memoryExists
  } = chainAndMemoryFor({
    workspaceRoot,
    folder: dir === '.' ? '' : dir,
    claudeConfigDir,
    homeDir
  })

  const shas = {
    ...shasForPaths(
      workspaceRoot,
      rules.map((rule) => rule.path)
    ),
    ...shasForPaths(
      workspaceRoot,
      rules.flatMap((rule) => rule.pointsTo)
    ),
    ...shasForPaths(workspaceRoot, bestPractice),
    ...shasForPaths(workspaceRoot, claudeMd),
    ...shasForPaths(workspaceRoot, imports),
    ...(memoryExists ? shasForPaths(workspaceRoot, [memPath]) : {})
  }

  return {
    entry: {
      file: `${repoKey}:${relPathInRepo}`,
      repoKey,
      path: relPathInRepo,
      rules,
      topics,
      bestPractice,
      claudeMd,
      imports,
      memory,
      shas
    },
    problems: [...ruleProblems, ...bpProblems, ...importProblems],
    notes
  }
}

const resolveRepoEntry = ({
  workspaceRoot,
  repoKey,
  repoAbs,
  repoRootRelative,
  otherRepoAbsPaths,
  reviewRouting,
  claudeConfigDir,
  homeDir
}) => {
  const skip = [
    ...otherRepoAbsPaths,
    ...['workareas', join('.claude', 'worktrees')]
      .map((name) => join(repoAbs, name))
      .filter((abs) => existsSync(abs))
  ]
  const repoFiles = listRepoFiles({ repoDir: repoAbs, skip })
  const { technologies, bestPractice } = detectTechnologies({
    routing: reviewRouting,
    repoDir: repoAbs,
    repoFiles
  })
  const bpProblems = routingPathProblems(
    workspaceRoot,
    REVIEW_ROUTING_PATH,
    bestPractice
  )

  const {
    claudeMd,
    imports,
    problems: importProblems,
    memory,
    notes,
    memPath,
    memoryExists
  } = chainAndMemoryFor({
    workspaceRoot,
    folder: repoRootRelative,
    claudeConfigDir,
    homeDir
  })

  const shas = {
    ...shasForPaths(workspaceRoot, bestPractice),
    ...shasForPaths(workspaceRoot, claudeMd),
    ...shasForPaths(workspaceRoot, imports),
    ...(memoryExists ? shasForPaths(workspaceRoot, [memPath]) : {})
  }

  return {
    entry: {
      repoKey,
      path: repoRootRelative || '.',
      technologies,
      bestPractice,
      claudeMd,
      imports,
      memory,
      shas
    },
    problems: [...bpProblems, ...importProblems],
    notes
  }
}

/**
 * Resolve every standard a set of planned files and repos must read.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {Record<string, {abs: string, rel: string}>} args.repos - Every
 *   repo key this call may reference, resolved to an absolute path and a
 *   workspace-relative path
 * @param {{repoKey: string, path: string}[]} [args.files] - Planned files,
 *   `path` relative to the named repo
 * @param {string[]} [args.repoLevel] - Repo keys to run repo-level
 *   technology detection over
 * @param {string} args.claudeConfigDir
 * @param {string} args.homeDir
 * @returns {{schemaVersion: number, routing: {path: string, sha: string}[], files: object[], repos: object[], standards: {path: string, sha: string}[], notes: string[]}}
 * @throws {TimError} LINT when a matched rule's pointer, a routed
 *   best-practice file, or an import on the chain does not exist
 */
export const resolveStandards = ({
  workspaceRoot,
  repos,
  files = [],
  repoLevel = [],
  claudeConfigDir,
  homeDir
}) => {
  const needsCodeStyle = files.length > 0
  const needsReview = repoLevel.length > 0

  const codeStyleRouting = needsCodeStyle
    ? loadCodeStyleRouting(workspaceRoot)
    : null
  const reviewRouting = needsReview ? loadReviewRouting(workspaceRoot) : null

  const routingShas = {
    ...(needsCodeStyle
      ? shasForPaths(workspaceRoot, [CODE_STYLE_ROUTING_PATH])
      : {}),
    ...(needsReview ? shasForPaths(workspaceRoot, [REVIEW_ROUTING_PATH]) : {})
  }
  const routing = [
    ...(needsCodeStyle
      ? [
          {
            path: CODE_STYLE_ROUTING_PATH,
            sha: routingShas[CODE_STYLE_ROUTING_PATH]
          }
        ]
      : []),
    ...(needsReview
      ? [{ path: REVIEW_ROUTING_PATH, sha: routingShas[REVIEW_ROUTING_PATH] }]
      : [])
  ]

  const fileResults = files.map(({ repoKey, path }) =>
    resolveFileEntry({
      workspaceRoot,
      repoKey,
      relPathInRepo: path,
      repoRootRelative: repos[repoKey].rel,
      codeStyleRouting,
      claudeConfigDir,
      homeDir
    })
  )

  const repoResults = repoLevel.map((repoKey) => {
    const otherRepoAbsPaths = Object.entries(repos)
      .filter(([key]) => key !== repoKey)
      .map(([, value]) => value.abs)
      .filter((abs) => abs.startsWith(`${repos[repoKey].abs}/`))
    return resolveRepoEntry({
      workspaceRoot,
      repoKey,
      repoAbs: repos[repoKey].abs,
      repoRootRelative: repos[repoKey].rel,
      otherRepoAbsPaths,
      reviewRouting,
      claudeConfigDir,
      homeDir
    })
  })

  const results = [...fileResults, ...repoResults]
  failOnProblems(results.flatMap((result) => result.problems))

  const standardsShas = results.reduce(
    (shas, result) => ({ ...shas, ...result.entry.shas }),
    routingShas
  )
  const standards = Object.keys(standardsShas)
    .sort()
    .map((path) => ({ path, sha: standardsShas[path] }))

  return {
    schemaVersion: 1,
    routing,
    files: fileResults.map((result) => result.entry),
    repos: repoResults.map((result) => result.entry),
    standards,
    notes: [...new Set(results.flatMap((result) => result.notes))]
  }
}

/**
 * `--lint`: check every rule under every `.claude/rules` folder in the
 * workspace (whether or not it matches any particular file), both routing
 * files' `bestPractice` paths, and the root CLAUDE.md chain's imports.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.homeDir
 * @returns {{rules: string[], problems: object[]}} `problems` is always
 *   empty here — a non-empty list throws LINT before this returns
 * @throws {TimError} LINT naming every problem found
 */
export const lintStandards = ({ workspaceRoot, homeDir }) => {
  const problems = []
  const ruleSummaries = []

  for (const scopeRootRelative of findAllRulesFolders(workspaceRoot)) {
    for (const rule of loadRulesIn({ workspaceRoot, scopeRootRelative })) {
      ruleSummaries.push(rule.path)
      problems.push(...rulePointerProblems(workspaceRoot, rule))
    }
  }

  const codeStyleRouting = loadCodeStyleRouting(workspaceRoot)
  problems.push(
    ...routingPathProblems(
      workspaceRoot,
      CODE_STYLE_ROUTING_PATH,
      Object.values(codeStyleRouting.topics).flatMap((t) => t.bestPractice)
    )
  )

  const reviewRouting = loadReviewRouting(workspaceRoot)
  problems.push(
    ...routingPathProblems(
      workspaceRoot,
      REVIEW_ROUTING_PATH,
      reviewRouting.technologies.flatMap((t) => t.bestPractice)
    )
  )

  const rootChain = claudeChainFor({ workspaceRoot, folder: '' })
  const { problems: importProblems } = importsOf({
    workspaceRoot,
    files: rootChain,
    homeDir
  })
  problems.push(...importProblems)

  failOnProblems(problems)

  return { rules: ruleSummaries.sort(), problems }
}
