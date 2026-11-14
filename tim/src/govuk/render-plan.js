import { existsSync, readFileSync } from 'node:fs'
import { TimError } from '../errors.js'
import { changelogPath, rawText, readState, versionsPath } from './state.js'

const checkRenderOptions = ({ runId, repo, version }) => {
  const missing = Object.entries({
    'run-id': runId,
    repo,
    'govuk-version': version
  }).find(([, value]) => !value)
  if (missing) throw new TimError('USAGE', `Missing --${missing[0]}`)
}

const textOrBlank = (value) =>
  value === null || value === undefined ? '' : rawText(value)

const optionalLine = (label, value) => (value ? [`${label}${value}`] : [])

const headerLines = (entry, { repo, version, classification }) => {
  const implementation = textOrBlank(entry.implementation_status)
  const commit = textOrBlank(entry.commit_sha)
  const implementationLines = implementation
    ? [
        `**Implementation:** ${implementation}`,
        ...optionalLine('**Commit:** ', commit && `\`${commit}\``),
        ...optionalLine(
          '**Failure reason:** ',
          textOrBlank(entry.failure_reason)
        )
      ]
    : []
  return [
    `# govuk-frontend v${version} — Plan`,
    '',
    `**Repository:** ${repo}`,
    `**Classification:** ${classification}`,
    ...optionalLine('**Summary:** ', textOrBlank(entry.summary)),
    ...optionalLine('**Classified at:** ', textOrBlank(entry.classified_at)),
    ...implementationLines,
    ''
  ]
}

const changeLines = ({ file, why, change }) => [
  `### ${rawText(file)}`,
  '',
  `**Why:** ${rawText(why)}`,
  '',
  `**Change:** ${rawText(change)}`,
  ''
]

const changesSectionLines = (changes) => [
  `## Changes Required (${changes.length})`,
  '',
  ...(changes.length === 0
    ? ['_No changes recorded yet._']
    : changes.flatMap(changeLines))
]

const assessmentLines = (classification, changes, version) => {
  if (classification === 'todo') return changesSectionLines(changes)
  if (classification === 'noop') {
    return [
      '## Assessment',
      '',
      `No code changes required for this repo at v${version}.`
    ]
  }
  return [
    '_Not yet classified — VERSION_PLANNER has not processed this version._'
  ]
}

const changelogText = (path) =>
  existsSync(path)
    ? readFileSync(path, 'utf8')
    : `_Pre-baked changelog section not found: ${path}_\n`

const findVersionEntry = (path, version) => {
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `Versions file not found: ${path}`)
  }
  const entry = (readState(path).versions ?? []).find(
    (candidate) => candidate.version === version
  )
  if (!entry) {
    throw new TimError('NOT_FOUND', `Version ${version} not found in ${path}`)
  }
  return entry
}

/**
 * One version's upgrade plan for one repo as markdown: its state, the
 * changes it needs and its pre-baked changelog section.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {string} [args.repo]
 * @param {string} [args.version]
 * @returns {{markdown: string}} Without a final newline
 * @throws {TimError} USAGE for a missing option, NOT_FOUND when the versions file or the version is missing
 */
export const renderVersionPlan = ({ workspaceRoot, runId, repo, version }) => {
  checkRenderOptions({ runId, repo, version })
  const entry = findVersionEntry(
    versionsPath(workspaceRoot, runId, repo),
    version
  )
  const classification = rawText(entry.classification ?? 'unplanned')
  const lines = [
    ...headerLines(entry, { repo, version, classification }),
    ...assessmentLines(classification, entry.changes ?? [], version),
    '',
    '## Changelog',
    ''
  ]
  const text = `${lines.join('\n')}\n${changelogText(changelogPath(workspaceRoot, runId, repo, version))}`
  return { markdown: text.replace(/\n$/, '') }
}
