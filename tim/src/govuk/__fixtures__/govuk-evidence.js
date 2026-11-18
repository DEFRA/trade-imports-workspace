import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyEnv, stageApplyRepos } from './govuk-apply.js'
import { ADMIN, stageGovukWorkspace } from './govuk-workspace.js'

export const EVIDENCE_RUN = 'NO_JIRA-govuk-frontend-5.7.0'
export const EVIDENCE_REPO = ADMIN
export const OLD_CLASS = 'govuk-header__link--service-name'
export const NEW_CLASS = 'govuk-service-navigation__link'
export const ABSENT_PATTERN = 'govukServiceNavigation'

const LAYOUT = 'src/layout.njk'

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

const dependencySetsText = () =>
  readFileSync(
    new URL('../../deps/fixtures/dependency-sets.json', import.meta.url),
    'utf8'
  )

const versionEntry = (version, classification) => ({
  version,
  classification,
  classified_at: '2026-11-14T03:00:00Z',
  implementation_status: null,
  implemented_at: null,
  commit_sha: null,
  failure_reason: null,
  changelog_path: `version__${version}.changelog.md`,
  summary: null,
  changes: []
})

const runFolder = (staged) =>
  join(staged.root, 'workareas', 'govuk-upgrades', EVIDENCE_RUN)

/**
 * The path of the evidence run's state file for the evidence repo.
 *
 * @param {{root: string}} staged
 * @returns {string}
 */
export const evidenceStatePath = (staged) =>
  join(runFolder(staged), EVIDENCE_REPO, `versions.${EVIDENCE_REPO}.json`)

/**
 * The evidence run's state file for the evidence repo, parsed.
 *
 * @param {{root: string}} staged
 * @returns {object}
 */
export const readEvidenceState = (staged) =>
  JSON.parse(readFileSync(evidenceStatePath(staged), 'utf8'))

/**
 * One version's entry in the evidence run's state file.
 *
 * @param {{root: string}} staged
 * @param {string} version
 * @returns {object}
 */
export const evidenceVersion = (staged, version) =>
  readEvidenceState(staged).versions.find((entry) => entry.version === version)

/**
 * Changes fields of versions in the evidence run's state file.
 *
 * @param {{root: string}} staged
 * @param {Record<string, object>} fieldsByVersion
 */
export const editEvidenceVersions = (staged, fieldsByVersion) => {
  const state = readEvidenceState(staged)
  const versions = state.versions.map((entry) => ({
    ...entry,
    ...fieldsByVersion[entry.version]
  }))
  writeFileSync(evidenceStatePath(staged), jsonText({ ...state, versions }))
}

/**
 * Writes the evidence repo's tracked layout with two lines using a class,
 * without committing it.
 *
 * @param {{root: string}} staged
 * @param {string} linkClass
 * @param {string} [extraLine]
 */
export const writeLayout = (staged, linkClass, extraLine) =>
  writeFileSync(
    join(staged.root, 'repos', EVIDENCE_REPO, LAYOUT),
    [
      '{% from "govuk/components/header/macro.njk" import govukHeader %}',
      `<a class="${linkClass}">One</a>`,
      `<a class="${linkClass}">Two</a>`,
      ...(extraLine ? [extraLine] : []),
      ''
    ].join('\n')
  )

const git = (staged, args) =>
  execFileSync('git', args, {
    cwd: join(staged.root, 'repos', EVIDENCE_REPO),
    env: { ...process.env, ...applyEnv(staged) },
    encoding: 'utf8'
  })

const stageRepoFiles = (staged) => {
  const repoDir = join(staged.root, 'repos', EVIDENCE_REPO)
  mkdirSync(join(repoDir, 'src'), { recursive: true })
  mkdirSync(join(repoDir, 'nested'), { recursive: true })
  writeLayout(staged, OLD_CLASS)
  const lockfile = jsonText({ packages: { [OLD_CLASS]: {} } })
  writeFileSync(join(repoDir, 'package-lock.json'), lockfile)
  writeFileSync(join(repoDir, 'nested', 'package-lock.json'), lockfile)
  git(staged, ['add', '-A'])
  git(staged, ['commit', '--quiet', '-m', 'Add the layout'])
  writeFileSync(join(repoDir, 'untracked.txt'), `${OLD_CLASS}\n`)
}

const stageRun = (staged) => {
  const folder = join(runFolder(staged), EVIDENCE_REPO)
  mkdirSync(folder, { recursive: true })
  writeFileSync(
    join(runFolder(staged), '.run-meta.json'),
    jsonText({
      ticket: 'NO_JIRA',
      mode: 'unattended',
      branch: `chore/${EVIDENCE_RUN}`,
      target_version: '5.7.0',
      repos: [EVIDENCE_REPO],
      discovered_at: '2026-11-14T03:00:00Z'
    })
  )
  writeFileSync(
    join(folder, 'version__5.5.0.changelog.md'),
    '## govuk-frontend v5.5.0 — Changelog\n'
  )
  writeFileSync(
    join(folder, 'version__5.6.0.changelog.md'),
    '## govuk-frontend v5.6.0 — Changelog\n'
  )
  writeFileSync(
    evidenceStatePath(staged),
    jsonText({
      ticket: EVIDENCE_RUN,
      repo: EVIDENCE_REPO,
      package: 'govuk-frontend',
      current_version: '5.4.0',
      target_version: '5.7.0',
      original_constraint_prefix: '^',
      created_at: '2026-11-14T03:00:00Z',
      last_discovered_at: '2026-11-14T03:00:00Z',
      versions: [
        versionEntry('5.5.0', 'todo'),
        versionEntry('5.6.0', 'noop'),
        versionEntry('5.7.0', 'noop')
      ]
    })
  )
}

/**
 * A workspace from `stageGovukWorkspace` plus the stub `npm` and git repos
 * of `stageApplyRepos`, with config/dependency-sets.json and an unattended
 * run, NO_JIRA-govuk-frontend-5.7.0, for the admin repo: 5.5.0 is todo,
 * 5.6.0 and the target 5.7.0 are noop, and only 5.5.0 and 5.6.0 have a
 * changelog section. The admin repo tracks a layout with two lines using
 * {@link OLD_CLASS} and two package-lock.json files that also contain it,
 * and has an untracked file containing it.
 *
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stageEvidenceWorkspace = () => {
  const staged = stageGovukWorkspace()
  stageApplyRepos(staged)
  mkdirSync(join(staged.root, 'config'), { recursive: true })
  writeFileSync(
    join(staged.root, 'config', 'dependency-sets.json'),
    dependencySetsText()
  )
  stageRepoFiles(staged)
  stageRun(staged)
  return staged
}

/**
 * The evidence repo's log, one line per commit with its subject.
 *
 * @param {{root: string, home: string}} staged
 * @returns {string[]}
 */
export const evidenceRepoLog = (staged) =>
  git(staged, ['log', '--format=%s']).trim().split('\n')
