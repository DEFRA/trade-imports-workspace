const CHANGE_WORDS = {
  added: 'Added, already signed off',
  changed: 'Name or steps changed',
  removed: 'Removed',
  unmarked: 'Signed off mark removed',
  'test-edited': 'A linked test is edited',
  'test-deleted': 'A linked test is deleted'
}

const SHORT_SHA_LENGTH = 12

const foundInWords = ({ commit, sha, range, repo, base }) => {
  if (commit !== undefined) return `commit ${sha.slice(0, SHORT_SHA_LENGTH)}`
  if (range !== undefined) return `range ${range}`
  return `repos/${repo} against ${base}, committed and uncommitted`
}

const versionLines = (label, version, missing) =>
  version
    ? [
        `${label}:`,
        `  ${version.name}`,
        ...version.steps.map((step) => `  ${step}`)
      ]
    : [`${label}: ${missing}`]

const testLines = (test) =>
  test
    ? [
        `Test: ${test.repo}/${test.file}`,
        ...test.titles.map((title) => `  "${title}"`)
      ]
    : []

const behaviourLines = ({ test, before, after }) =>
  test
    ? versionLines('Steps, unchanged in the spec', after, 'not in the spec')
    : [
        ...versionLines('Before', before, 'not in the spec'),
        ...versionLines('After', after, 'removed from the spec')
      ]

const scenarioSection = (scenario) => [
  `${scenario.name} (${scenario.id ?? 'no id'})`,
  `Capability: ${scenario.capability}`,
  `What happens: ${CHANGE_WORDS[scenario.change]}`,
  `Why it counts: ${scenario.why}`,
  `Found in: ${foundInWords(scenario.foundIn)}`,
  ...testLines(scenario.test),
  ...behaviourLines(scenario)
]

const distinctScenarioCount = (signedOff) =>
  new Set(
    signedOff.map(({ capability, id, name }) => `${capability}:${id ?? name}`)
  ).size

const summaryOf = (count) =>
  count === 1
    ? 'Approve or refuse a change to a signed-off scenario'
    : `Approve or refuse changes to ${count} signed-off scenarios`

const INTRODUCTION = [
  'This work changes behaviour that was signed off. The pull requests stay as drafts until a person approves or refuses it.',
  '',
  'Approve: take the pull requests out of draft and merge them as normal.',
  'Refuse: take the spec change out, and the code behind it. For a linked test, fix the code, not the test.'
]

/**
 * The Jira ticket a person approves or refuses: which signed-off scenarios
 * change, how, why each counts, and their steps before and after.
 *
 * @param {object[]} signedOff - The `signedOff` entries of `diffSignedOff`
 * @returns {{summary: string, description: string}|null} Null when nothing changes
 */
export const draftSignedOffTicket = (signedOff) => {
  if (signedOff.length === 0) return null
  return {
    summary: summaryOf(distinctScenarioCount(signedOff)),
    description: [
      ...INTRODUCTION,
      ...signedOff.flatMap((scenario) => ['', ...scenarioSection(scenario)])
    ].join('\n')
  }
}
