import { renderEvidenceTable } from '../../deps/evidence/render.js'
import { TimError } from '../../errors.js'
import {
  packagesFilesOfRun,
  readJson,
  requireRunFolder,
  runFolder
} from '../state.js'
import { evidencePath, readPackageEvidence } from './evidence.js'
import { recordedPolicyOf } from './policy.js'

const OUTCOME_LABELS = {
  upgraded: 'Upgraded',
  'not-upgraded': '**Not upgraded**',
  'not-started': '**Not started**'
}

const outcomeOf = ({ implementation_status: status }) => {
  if (status === 'done') return 'upgraded'
  if (status === 'failed') return 'not-upgraded'
  return 'not-started'
}

const isClassified = (row) =>
  row.classification !== null && row.classification !== undefined

const problemsOf = (row, policy, evidence) => {
  const outcome = outcomeOf(row)
  return [
    [!isClassified(row), 'The planner has not classified it.'],
    [
      policy === null,
      'No policy is recorded. Run tim npm packages set-policy.'
    ],
    [
      outcome === 'not-upgraded',
      `It was not upgraded: ${row.failure_reason ?? 'no reason is recorded'}.`
    ],
    [
      isClassified(row) && outcome === 'not-started',
      'It is not upgraded yet: phase 2 or its implementer has not finished.'
    ],
    [
      evidence !== null && evidence.target !== row.target,
      `Its evidence is for ${evidence?.target}, not ${row.target}.`
    ]
  ]
    .filter(([applies]) => applies)
    .map(([, problem]) => problem)
}

const needsEvidenceTable = (policy, evidence) =>
  policy?.policy === 'changelog-driven' || evidence !== null

const packageEvidenceOf = (request, row) => {
  const policy = recordedPolicyOf(row)
  const evidence = readPackageEvidence(
    evidencePath({ ...request, packageName: row.package })
  )
  const problems = problemsOf(row, policy, evidence)
  const table = needsEvidenceTable(policy, evidence)
    ? renderEvidenceTable(evidence?.rows ?? [])
    : null
  return {
    package: row.package,
    current: row.current ?? null,
    target: row.target ?? null,
    policy: policy?.policy ?? null,
    set: policy?.set ?? null,
    outcome: outcomeOf(row),
    clean: problems.length === 0 && (table?.allClean ?? true),
    problems,
    evidence: table
  }
}

const repoEvidenceOf = (request, packagesFile) => {
  const packages = (packagesFile.packages ?? []).map((row) =>
    packageEvidenceOf({ ...request, repo: packagesFile.repo }, row)
  )
  return {
    repo: packagesFile.repo,
    clean: packages.every(({ clean }) => clean),
    packages
  }
}

const tableCell = (value) =>
  value === null ? '-' : String(value).replaceAll('|', '\\|')

const packageLine = (entry) =>
  `| \`${entry.package}\` | ${tableCell(entry.current)} | ${tableCell(entry.target)} | ${tableCell(entry.policy)} | ${tableCell(entry.set)} | ${OUTCOME_LABELS[entry.outcome]} |`

const evidenceSection = (entry) => [
  `#### \`${entry.package}\` ${entry.current} to ${entry.target}`,
  '',
  entry.evidence.markdown,
  ''
]

const problemsSection = (packages) => {
  const lines = packages.flatMap((entry) =>
    entry.problems.map((problem) => `- \`${entry.package}\`: ${problem}`)
  )
  return lines.length === 0 ? [] : ['**Needs a person:**', '', ...lines, '']
}

const repoSummaryLine = ({ clean, packages }) => {
  if (clean) return 'Every package is clean.'
  const notClean = packages.filter((entry) => !entry.clean).length
  return `**${notClean} of ${packages.length} packages are not clean.**`
}

const repoMarkdown = (repoEvidence) => [
  `### \`${repoEvidence.repo}\``,
  '',
  '| Package | From | To | Policy | Set | Outcome |',
  '|---|---|---|---|---|---|',
  ...repoEvidence.packages.map(packageLine),
  '',
  ...repoEvidence.packages
    .filter((entry) => entry.evidence !== null)
    .flatMap(evidenceSection),
  ...problemsSection(repoEvidence.packages),
  repoSummaryLine(repoEvidence),
  ''
]

/**
 * The packages an npm upgrade run moves, and their changelog evidence, as
 * the markdown for a pull request description. A package is clean when it
 * is classified, has a policy recorded and is upgraded, and every evidence
 * row is clean. A `changelog-driven` package with no evidence is not
 * clean. A repo is clean when every package is, and the run when every
 * repo is.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.runId
 * @param {string} [args.repo] - Only this repo
 * @returns {{runId: string, clean: boolean, repos: object[], markdown: string}}
 * @throws {TimError} NOT_FOUND when the run folder or its packages files are missing
 */
export const renderRunEvidence = ({ workspaceRoot, runId, repo }) => {
  const folder = runFolder(workspaceRoot, runId)
  requireRunFolder(folder)
  const paths = packagesFilesOfRun(folder, repo)
  if (paths.length === 0) {
    throw new TimError(
      'NOT_FOUND',
      `Can't find a packages file for ${repo ?? 'any repo'} in ${folder}.`
    )
  }
  const repos = paths.map((path) =>
    repoEvidenceOf({ workspaceRoot, runId }, readJson(path))
  )
  return {
    runId,
    clean: repos.every(({ clean }) => clean),
    repos,
    markdown: [
      '## Packages and changelog evidence',
      '',
      ...repos.flatMap(repoMarkdown)
    ]
      .join('\n')
      .trimEnd()
  }
}
