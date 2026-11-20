import { DEPENDENCY_SETS_FILE } from './dependency-sets.js'

const appendWord = (lines, word, room) => {
  const last = lines.at(-1)
  const joined = `${last} ${word}`
  return last !== undefined && joined.length <= room
    ? [...lines.slice(0, -1), joined]
    : [...lines, word]
}

const wrapComment = (text, indent) => {
  const commentWidth = 78
  const prefix = `${indent}# `
  const room = commentWidth - prefix.length
  return text
    .split(/\s+/)
    .filter(Boolean)
    .reduce((lines, word) => appendWord(lines, word, room), [])
    .map((line) => `${prefix}${line}`)
}

const quoted = (value) => `'${value}'`

const listOf = (key, values, indent) => [
  `${indent}${key}:`,
  ...values.map((value) => `${indent}  - ${quoted(value)}`)
]

const setGroup = ({ name, reason, members }) => [
  ...wrapComment(reason, '      '),
  `      ${name}:`,
  '        applies-to: version-updates',
  ...listOf('patterns', members, '        ')
]

const patchAndMinorGroup = [
  '      patch-and-minor:',
  '        applies-to: version-updates',
  ...listOf('update-types', ['patch', 'minor'], '        '),
  ...listOf('patterns', ['*'], '        ')
]

const npmGroups = (repoSets) => [
  ...wrapComment(
    'Dependabot puts a dependency in the first group it matches, so each coupled set comes before the catch-all. A set takes every update type, so even a major arrives as one PR for the whole set.',
    '    '
  ),
  '    groups:',
  ...repoSets.flatMap((set) => [...setGroup(set), '']),
  ...wrapComment(
    'One rolling PR for every other patch and minor bump. Majors match no group, so Dependabot raises each one on its own: they are the likeliest to break, and the nightly job reads their changelogs before merging.',
    '      '
  ),
  ...patchAndMinorGroup
]

const ignoredSetLines = ({ name, reason, members }) => [
  `      # ${name}`,
  ...wrapComment(reason, '      '),
  ...members.map((member) => `      - dependency-name: ${quoted(member)}`)
]

const liftWhen = ({ package: packageName, clashesWith }) =>
  clashesWith
    ? `Lift it with tim deps lift when a newer ${packageName} or ${clashesWith} clears it.`
    : `Lift it with tim deps lift when a newer ${packageName} clears it.`

const heldPackageLines = (hold) => [
  `      # held: ${hold.package}, since ${hold.since}`,
  ...[
    hold.reason,
    `Failing test: ${hold.failingTest}`,
    liftWhen(hold),
    ...(hold.link ? [hold.link] : [])
  ].flatMap((text) => wrapComment(text, '      ')),
  `      - dependency-name: ${quoted(hold.package)}`,
  ...listOf('versions', [hold.versions], '        ')
]

const ignoreComment = (ignoredSets, repoHolds) => [
  ...(ignoredSets.length > 0
    ? [
        'The nightly job moves these sets in every repo at once, on one branch name, so Dependabot leaves them alone.'
      ]
    : []),
  ...(repoHolds.length > 0
    ? [
        'A held package stays at its current version: Dependabot does not propose the versions it breaks.'
      ]
    : [])
]

const npmIgnores = (crossRepoSets, repoHolds) => {
  const ignoredSets = crossRepoSets.filter((set) => set.members.length > 0)
  if (ignoredSets.length === 0 && repoHolds.length === 0) return []
  return [
    '',
    ...wrapComment(ignoreComment(ignoredSets, repoHolds).join(' '), '    '),
    '    ignore:',
    ...ignoredSets.flatMap(ignoredSetLines),
    ...repoHolds.flatMap(heldPackageLines)
  ]
}

const cooldownLines = (cooldownDays) => [
  ...wrapComment(
    `Wait ${cooldownDays} days after a release before proposing it, so a broken release is usually withdrawn first.`,
    '    '
  ),
  '    cooldown:',
  `      default-days: ${cooldownDays}`
]

const scheduleLines = ({ interval, time, timezone }) => [
  '    # Check for updates on this schedule, local time',
  '    schedule:',
  `      interval: ${interval}`,
  `      time: ${quoted(time)}`,
  `      timezone: ${quoted(timezone)}`
]

const directoryLines = (directories) =>
  directories.length === 1
    ? [`    directory: ${directories[0]}`]
    : listOf('directories', directories, '    ')

const npmUpdate = (repo, npmDirectory, { defaults, sets, holds }) => [
  '  # Update npm packages',
  '  - package-ecosystem: npm',
  `    directory: ${npmDirectory}`,
  `    open-pull-requests-limit: ${defaults.dependabot.openPullRequestsLimit}`,
  '',
  ...npmGroups(sets.filter((set) => set.scope === 'repo')),
  ...npmIgnores(
    sets.filter((set) => set.scope === 'cross-repo'),
    holds.filter((hold) => hold.repos.includes(repo))
  ),
  '',
  ...cooldownLines(defaults.cooldownDays),
  '',
  ...scheduleLines(defaults.dependabot.schedule),
  '',
  `    versioning-strategy: ${defaults.dependabot.versioningStrategy}`,
  '',
  '    allow:',
  '      # Include direct package.json updates',
  '      - dependency-type: direct'
]

const githubActionsUpdate = (actionsDirectories, { defaults }) => [
  '  # Update GitHub Actions',
  '  - package-ecosystem: github-actions',
  ...directoryLines(actionsDirectories),
  '',
  ...wrapComment(
    'Same policy as npm: one rolling PR for patch and minor bumps, majors raised one at a time. Action majors change inputs or runtime, so they are the ones worth reading.',
    '    '
  ),
  '    groups:',
  ...patchAndMinorGroup,
  '',
  ...cooldownLines(defaults.cooldownDays),
  '',
  ...scheduleLines(defaults.dependabot.schedule)
]

/**
 * The text of a repo's `.github/dependabot.yml`, generated from the
 * workspace's coupled package sets. The same sets always give the same
 * text, so a file can be compared with it byte for byte.
 *
 * @param {object} args
 * @param {string} args.repo - Named in the header's regenerate command; only the holds that list it are ignored
 * @param {{defaults: object, sets: object[], holds: object[]}} args.dependencySets - From `loadDependencySets`
 * @param {{npm: string, actions: string[]}} [args.directories] - Folders relative to the GitHub repo's root: the npm project's, and those holding the workflows and composite actions to update
 * @returns {string}
 */
export const renderDependabotConfig = ({
  repo,
  dependencySets,
  directories = { npm: '/', actions: ['/'] }
}) =>
  [
    `# Generated by \`tim deps dependabot ${repo} --write\` from`,
    `# ${DEPENDENCY_SETS_FILE} in the trade-imports workspace. Change that`,
    '# file and regenerate. A hand edit here fails `--check`.',
    'version: 2',
    '',
    'updates:',
    ...npmUpdate(repo, directories.npm, dependencySets),
    '',
    ...githubActionsUpdate(directories.actions, dependencySets),
    ''
  ].join('\n')
