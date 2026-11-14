import { execa } from 'execa'
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { stageBashWorkspace } from '../../test-support/bash-golden-harness.js'

export const BASH_SCRIPT_FOR = {
  start: 'tools/theme-ticket/start-theme-ticket.sh',
  derive: 'tools/theme-ticket/derive-scenarios.sh',
  stale: 'tools/theme-ticket/check-stale.sh',
  push: 'tools/theme-ticket/push-description.sh'
}

export const BASH_SCRIPTS = [
  ...Object.values(BASH_SCRIPT_FOR),
  'tools/theme-ticket/derive-scenarios.mjs'
]

const FAKE_JIRA_SEARCH = 'tools/jira/search.sh'

const DEFAULT_COMMIT_DATE = '2026-03-01T10:00:00+00:00'

/**
 * When each ticket in the stale fixtures was last updated on Jira, by key.
 * A key missing here is a ticket Jira cannot find.
 */
export const JIRA_UPDATED = {
  'EUDPA-1': '2026-03-02T09:00:00.000+0000',
  'EUDPA-2': '2026-02-20T09:00:00.000+0000',
  'EUDPA-3': '2026-03-02T09:00:00.000+0000',
  'EUDPA-5': '2026-04-01T09:30:00.000+0000',
  'EUDPA-6': '2026-03-02T09:00:00.000+0000'
}

const fakeJiraSearch = () =>
  [
    '#!/bin/bash',
    'case "$1" in',
    ...Object.entries(JIRA_UPDATED).map(
      ([key, updated]) =>
        `  "key = ${key}") echo '{"issues":[{"fields":{"updated":"${updated}"}}]}' ;;`
    ),
    `  *) echo '{"issues":[]}' ;;`,
    'esac',
    ''
  ].join('\n')

const scenarioText = ({ heading, id, then }) =>
  [
    `#### Scenario: ${heading}`,
    ...(id ? [`**ID**: ${id}`] : []),
    '- **GIVEN** a user',
    `- **THEN** ${then ?? heading}`,
    ''
  ].join('\n')

const specText = (title, scenarios) =>
  [
    `# ${title}`,
    '',
    '## Requirements',
    '',
    `### Requirement: ${title}`,
    '',
    ...scenarios.map(scenarioText),
    ''
  ].join('\n')

const json = (value) => `${JSON.stringify(value, null, 2)}\n`

const backlog = (increments) => json({ increments })

const row = (id, title, repos, extra = {}) => ({
  id,
  title,
  status: 'done',
  repos,
  ...extra
})

const RELEASE_SOURCES = json({
  repos: {
    frontend: 'repos/trade-imports-animals-frontend',
    plants: 'repos/trade-imports-plants-frontend',
    insfrontend: 'repos/trade-imports-ins-frontend',
    admin: 'repos/trade-imports-animals-admin',
    refdata: 'repos/trade-imports-reference-data',
    tests: 'repos/trade-imports-ins-tests'
  }
})

const ARRIVAL_SPEC =
  'openspec/specs/live-animals/journey-pages/arrival-details/spec.md'
const ADDRESS_SPEC = 'openspec/specs/ins/address-book/spec.md'
const WIDE_ANIMALS_SPEC = 'openspec/specs/live-animals/wide/spec.md'
const WIDE_PLANTS_SPEC = 'openspec/specs/plants/wide/spec.md'
const WIDE_ADMIN_SPEC = 'openspec/specs/admin/wide/spec.md'
const ELSEWHERE_SPEC = 'openspec/specs/ins/elsewhere/spec.md'
const FLOW_SPEC = 'openspec/specs/live-animals/journey-flow/spec.md'
const ALPHA_SPEC = 'openspec/specs/plants/alpha/spec.md'
const OFFSET_SPEC = 'openspec/specs/plants/offset/spec.md'

const write = (files) => ({ kind: 'write', files })
const commit = (message, date = DEFAULT_COMMIT_DATE) => ({
  kind: 'commit',
  message,
  date
})
const git = (...args) => ({ kind: 'git', args })
const runOf = (command) => (name, args) => ({
  kind: 'run',
  command,
  name,
  args
})
const start = runOf('start')
const derive = runOf('derive')
const stale = runOf('stale')
const push = runOf('push')

const ticketFolder = (base, { key, summary, description }) => ({
  ...(key ? { [`${base}/ticket.created.json`]: json({ key }) } : {}),
  ...(summary ? { [`${base}/ticket.json`]: json({ summary }) } : {}),
  ...(description === undefined
    ? {}
    : { [`${base}/description.txt`]: description })
})

const CLEAN_DESCRIPTION = [
  'h2. Background',
  '',
  'One paragraph on one line that runs well past the seventy-eight character limit, as Jira wants it.',
  '',
  '* a bullet',
  '* another',
  '',
  '|| a || b ||',
  '| 1 | 2 |',
  ''
].join('\n')

const WRAPPED_DESCRIPTION = [
  'h2. Background',
  '',
  'This paragraph is wrapped at a short width so that it',
  'runs over two lines and Jira breaks it.',
  '',
  '* a bullet',
  '|| a ||',
  'First line of another wrapped one',
  'second line here',
  'third line too',
  'fourth line',
  ''
].join('\n')

const EXPAND_DESCRIPTION = [
  'h2. Background',
  '',
  'One paragraph on one line.',
  '',
  '{expand:Details}',
  ''
].join('\n')

const citing = (...specs) =>
  `h2. Specs\n\n${specs.map((spec) => `* [spec|https://github.com/DEFRA/trade-imports-workspace/blob/main/${spec}]`).join('\n')}\n`

/**
 * The fixture's history and the runs recorded against it, in order. Each
 * step writes files, commits, runs git, or runs one theme-ticket command.
 */
export const THEME_TICKET_STEPS = [
  write({
    '.gitignore': 'tools/\nworkareas/release/tickets/derived.json\n',
    'docs/best-practices/README.md': 'Marker.\n',
    'repos.json': '{}\n',
    'workareas/release/sources.json': RELEASE_SOURCES,
    'workareas/release/themes/arrival/backlog.json': backlog([
      row('inc-1', 'Arrival page', ['frontend'])
    ]),
    [ARRIVAL_SPEC]: specText('Arrival details', [
      { heading: 'Kept as written', id: 'SCN-A' },
      { heading: 'Renamed later', id: 'SCN-B' },
      { heading: 'Removed later', id: 'SCN-C' }
    ])
  }),
  commit('feat(release-arrival): Arrival page'),
  write({
    [ARRIVAL_SPEC]: specText('Arrival details', [
      { heading: 'Kept as written', id: 'SCN-A' },
      { heading: 'Now reads this way', id: 'SCN-B' }
    ])
  }),
  commit('docs(OTHER-1): reword arrival', '2026-03-01T11:00:00+00:00'),

  write({
    'workareas/release/themes/address-book/backlog.json': backlog([
      row('inc-1', 'Address list', ['insfrontend'])
    ]),
    [ADDRESS_SPEC]: specText('Address book', [
      { heading: 'The list shows addresses', id: 'ADR-A' }
    ])
  }),
  commit('chore(KEY-1): spec the address list'),
  write({
    [ADDRESS_SPEC]: specText('Address book', [
      { heading: 'The list shows addresses', id: 'ADR-A' },
      { heading: 'An address can be deleted', id: 'ADR-B' }
    ])
  }),
  commit('chore(KEY-2): spec deleting an address'),
  derive('address book without row scopes', [
    '--workarea',
    'release',
    '--theme',
    'address-book'
  ]),

  write({
    'workareas/release/themes/wide/backlog.json': backlog([
      row('w-1', 'Wide animals and plants', ['frontend', 'plants', 'tests']),
      row('w-2', 'Shared reference data', ['refdata']),
      row('w-3', 'Only tests', ['tests']),
      row('w-4', 'Dropped thing', ['frontend'], { status: 'dropped' }),
      row('w-5', 'Mystery row', ['mystery'], {
        status: 'deferred',
        gate: 'milestone'
      }),
      row('w-6', 'Admin row', ['admin'])
    ]),
    [WIDE_ANIMALS_SPEC]: specText('Wide animals', [
      { heading: 'Animals are wide', id: 'W-A' },
      { heading: 'No id here' }
    ]),
    [WIDE_PLANTS_SPEC]: specText('Wide plants', [
      { heading: 'Plants are wide', id: 'W-P1' },
      { heading: 'Plants judged elsewhere', id: 'W-P2' }
    ])
  }),
  commit('feat(release-wide): Wide animals and plants'),
  write({
    [WIDE_ADMIN_SPEC]: specText('Wide admin', [
      { heading: 'Admin is wide', id: 'W-AD' }
    ])
  }),
  commit('feat(release-wide): Admin row'),
  write({
    [WIDE_ANIMALS_SPEC]: specText('Wide animals', [
      { heading: 'Animals are wide', id: 'W-A' },
      { heading: 'Reworded with no id' },
      { heading: 'Animals are reviewed', id: 'W-A2' }
    ]),
    [ELSEWHERE_SPEC]: specText('Elsewhere', [
      { heading: 'Kept by a person', id: 'E-1' },
      { heading: 'Left out', id: 'E-2' }
    ])
  }),
  commit('docs(KEY-9): review the wide theme'),
  write({
    'workareas/release/themes/unknown-area/backlog.json': backlog([
      row('u-1', 'Mystery area', ['frontend'])
    ]),
    'openspec/specs/mystery-area/spec.md': specText('Mystery', [
      { heading: 'Somewhere unmapped', id: 'M-1' }
    ]),
    'workareas/release/themes/no-rows/backlog.json': backlog([]),
    'workareas/release/themes/no-commits/backlog.json': backlog([
      row('n-1', 'Never built', ['frontend'])
    ]),
    'workareas/nobacklog/README.md': 'No backlog here.\n'
  }),
  commit('feat(release-unknown-area): Mystery area'),
  write({
    'workareas/themed-main/sources.json': RELEASE_SOURCES,
    'workareas/themed-main/backlog.json': backlog([
      row('a-1', 'Alpha row', ['plants'], { theme: 'alpha' }),
      row('b-1', 'Beta row', ['frontend'], { theme: 'beta' })
    ]),
    [ALPHA_SPEC]: specText('Alpha', [{ heading: 'Alpha works', id: 'AL-1' }])
  }),
  commit('feat(themed-main-alpha): Alpha row'),

  write({
    'workareas/release/tickets/tickets.json': json({
      themes: { wide: { animals: 'KEY-9' } },
      rowScopes: { 'address-book': ['KEY-1', 'KEY-2'] }
    }),
    'workareas/release/tickets/footprint-overrides.json': json({
      include: { wide: { 'ins/elsewhere/spec.md': ['Kept by a person'] } },
      exclude: { wide: { 'plants/wide/spec.md': ['Plants judged elsewhere'] } }
    })
  }),
  derive('address book with row scopes', [
    '--workarea',
    'release',
    '--theme',
    'address-book'
  ]),
  derive('a removed and a renamed scenario', [
    '--workarea',
    'release',
    '--theme',
    'arrival'
  ]),
  derive('rows across domains, review commits and overrides', [
    '--workarea',
    'release',
    '--theme',
    'wide',
    '--branch',
    'feat/KEY-9-wide',
    '--commits-from',
    'main'
  ]),
  derive('a spec area with no domain', [
    '--workarea',
    'release',
    '--theme',
    'unknown-area'
  ]),
  derive('a theme with no rows', [
    '--workarea',
    'release',
    '--theme',
    'no-rows'
  ]),
  derive('a theme with no commits', [
    '--workarea',
    'release',
    '--theme',
    'no-commits'
  ]),
  derive('a backlog whose rows carry themes', [
    '--workarea',
    'themed-main',
    '--theme',
    'alpha'
  ]),
  derive('a workarea with no backlog', [
    '--workarea',
    'nobacklog',
    '--theme',
    'alpha'
  ]),
  derive('a workarea that is not there', [
    '--workarea',
    'missing',
    '--theme',
    'alpha'
  ]),
  derive('no theme', ['--workarea', 'release']),
  derive('written to a file', [
    '--workarea',
    'release',
    '--theme',
    'arrival',
    '--out',
    'workareas/release/tickets/derived.json'
  ]),

  write({
    [ADDRESS_SPEC]: specText('Address book', [
      { heading: 'An address can be deleted', id: 'ADR-B' },
      { heading: 'The list shows addresses', id: 'ADR-A' }
    ])
  }),
  commit('chore(KEY-2): order the address scenarios'),
  derive('address book after a scenario moves', [
    '--workarea',
    'release',
    '--theme',
    'address-book'
  ]),

  write({
    'workareas/programme/sources.json': json({
      repos: { frontend: 'repos/trade-imports-animals-frontend' }
    }),
    'workareas/programme/backlog.json': backlog([
      row('inc-1', 'Page order', ['frontend']),
      row('inc-2', 'Back', ['frontend'])
    ]),
    [FLOW_SPEC]: specText('Journey flow', [
      { heading: 'The journey has one page order', id: 'FL-A' }
    ])
  }),
  commit('chore: start the flow'),
  git('checkout', '-q', '-b', 'feat/KEY-1-flow'),
  write({
    [FLOW_SPEC]: specText('Journey flow', [
      { heading: 'The journey has one page order', id: 'FL-A' },
      { heading: 'Save and continue goes to the next page', id: 'FL-B' }
    ])
  }),
  commit('feat(programme-flow): Save and continue goes to the next page'),
  write({
    [FLOW_SPEC]: specText('Journey flow', [
      { heading: 'The journey has one page order', id: 'FL-A' },
      { heading: 'Save and continue goes to the next page', id: 'FL-B' },
      { heading: 'Back goes to where the trader came from', id: 'FL-C' }
    ])
  }),
  commit('feat(programme-flow): Back goes to where the trader came from'),
  git('checkout', '-q', 'main'),
  git('merge', '-q', '--squash', 'feat/KEY-1-flow'),
  commit('KEY-1: the flow (#1)'),
  derive('main alone after a squash merge', [
    '--workarea',
    'programme',
    '--theme',
    'programme-flow',
    '--branch',
    'main'
  ]),
  derive('row commits read from the feature branch', [
    '--workarea',
    'programme',
    '--theme',
    'programme-flow',
    '--branch',
    'main',
    '--commits-from',
    'feat/KEY-1-flow'
  ]),
  write({
    'workareas/programme/tickets/footprint-overrides.json': json({
      exclude: {
        'programme-flow': {
          'live-animals/journey-flow/spec.md': [
            'Back goes to where the trader came from'
          ]
        }
      }
    })
  }),
  derive('a scenario judged another ticket’s', [
    '--workarea',
    'programme',
    '--theme',
    'programme-flow',
    '--branch',
    'main',
    '--commits-from',
    'feat/KEY-1-flow'
  ]),

  ...[
    ['STUB', 'STUB'],
    ['START', 'START'],
    ['WRITE', 'WRITE'],
    ['MERGE', 'MERGE'],
    ['STALE', 'STALE'],
    ['lower-case stale', 'stale']
  ].map(([name, mode]) =>
    start(`--mode ${name}`, [
      '',
      '--workarea',
      'release',
      '--theme',
      'arrival',
      '--mode',
      mode
    ])
  ),
  start('an unknown mode', [
    '',
    '--workarea',
    'release',
    '--theme',
    'arrival',
    '--mode',
    'bogus'
  ]),
  ...[
    'which theme tickets are stale',
    'is this out of date',
    'the build loop is starting on arrival',
    'the build is starting',
    'starting on arrival',
    'arrival has merged',
    'arrival was split off',
    'stub it',
    'write the theme ticket',
    'MERGE NOW'
  ].map((phrase) =>
    start(`phrase: ${phrase}`, [
      phrase,
      '--workarea',
      'release',
      '--theme',
      'arrival'
    ])
  ),
  start('STALE needs no theme', [
    'which theme tickets are stale',
    '--workarea',
    'programme'
  ]),
  start('a theme missing lists the themes', [
    'write it',
    '--workarea',
    'release'
  ]),
  start('a theme missing where there are no themes', [
    'write it',
    '--workarea',
    'programme'
  ]),
  start('a workarea that is not there', [
    'write it',
    '--workarea',
    'missing',
    '--theme',
    'x'
  ]),
  start('no workarea', ['write it']),

  write({
    ...ticketFolder('workareas/release/tickets/animals', {
      key: 'EUDPA-9',
      summary: 'A clean summary',
      description: CLEAN_DESCRIPTION
    }),
    ...ticketFolder('workareas/release/tickets/no-summary', {
      key: 'EUDPA-9',
      description: 'Short\nlines\n'
    }),
    ...ticketFolder('workareas/release/tickets/wrapped', {
      key: 'EUDPA-9',
      description: WRAPPED_DESCRIPTION
    }),
    ...ticketFolder('workareas/release/tickets/expand', {
      key: 'EUDPA-9',
      description: EXPAND_DESCRIPTION
    }),
    ...ticketFolder('workareas/release/tickets/no-key', {
      summary: 'No key yet',
      description: CLEAN_DESCRIPTION
    }),
    ...ticketFolder('workareas/release/tickets/no-description', {
      key: 'EUDPA-9'
    })
  }),
  ...[
    'animals',
    'no-summary',
    'wrapped',
    'expand',
    'no-key',
    'no-description'
  ].map((folder) =>
    push(`folder: ${folder}`, [`<ROOT>/workareas/release/tickets/${folder}`])
  ),
  push('a key given for a folder with none', [
    '<ROOT>/workareas/release/tickets/no-key',
    '--key',
    'EUDPA-7'
  ]),
  push('a folder that is not there', ['<ROOT>/workareas/release/tickets/gone']),
  push('no folder', []),

  write({
    [OFFSET_SPEC]: specText('Offset', [{ heading: 'Offset works', id: 'OF-1' }])
  }),
  commit('docs(OFFSET-1): spec an offset change', '2026-04-01T10:00:00+01:00'),
  write({
    'workareas/stale-wa/tickets/README.md': 'Not a ticket folder.\n',
    ...ticketFolder('workareas/stale-wa/tickets/a-current', {
      key: 'EUDPA-1',
      description: citing(ARRIVAL_SPEC)
    }),
    ...ticketFolder('workareas/stale-wa/tickets/b-stale', {
      key: 'EUDPA-2',
      description: citing(ARRIVAL_SPEC, ADDRESS_SPEC, ARRIVAL_SPEC)
    }),
    ...ticketFolder('workareas/stale-wa/tickets/c-no-key', {
      description: citing(ARRIVAL_SPEC)
    }),
    ...ticketFolder('workareas/stale-wa/tickets/d-no-specs', {
      key: 'EUDPA-3',
      description: 'h2. Nothing cited\n'
    }),
    ...ticketFolder('workareas/stale-wa/tickets/e-jira-has-none', {
      key: 'EUDPA-4',
      description: citing(ARRIVAL_SPEC)
    }),
    ...ticketFolder('workareas/stale-wa/tickets/f-offset', {
      key: 'EUDPA-5',
      description: citing(OFFSET_SPEC)
    }),
    ...ticketFolder('workareas/stale-wa/tickets/g-never-committed', {
      key: 'EUDPA-6',
      description: citing('openspec/specs/never/spec.md')
    }),
    ...ticketFolder('workareas/stale-wa/tickets/h-no-description', {
      key: 'EUDPA-1'
    })
  }),
  stale('every verdict', ['--workarea', 'stale-wa']),
  stale('a branch named', [
    '--workarea',
    'stale-wa',
    '--branch',
    'feat/KEY-1-flow'
  ]),
  stale('a branch that is not there', [
    '--workarea',
    'stale-wa',
    '--branch',
    'nope'
  ]),
  stale('nothing stale', ['--workarea', 'programme']),
  stale('a workarea with no tickets folder', ['--workarea', 'missing']),
  stale('no workarea', [])
]

const gitIn = (root, args, env = {}) =>
  execa('git', ['-C', root, ...args], {
    env: {
      GIT_AUTHOR_NAME: 'Test',
      GIT_AUTHOR_EMAIL: 'test@example.com',
      GIT_COMMITTER_NAME: 'Test',
      GIT_COMMITTER_EMAIL: 'test@example.com',
      GIT_CONFIG_GLOBAL: '/dev/null',
      GIT_CONFIG_NOSYSTEM: '1',
      ...env
    }
  })

const writeFiles = (root, files) => {
  for (const [relPath, content] of Object.entries(files)) {
    const dest = join(root, relPath)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, content)
  }
}

const applyStep = async (root, step) => {
  if (step.kind === 'write') writeFiles(root, step.files)
  if (step.kind === 'git') await gitIn(root, step.args)
  if (step.kind === 'commit') {
    await gitIn(root, ['add', '-A'])
    await gitIn(root, ['commit', '-q', '--allow-empty', '-m', step.message], {
      GIT_AUTHOR_DATE: step.date,
      GIT_COMMITTER_DATE: step.date
    })
  }
}

/**
 * An empty git workspace in a temporary folder, with helpers to write
 * files, commit them at a fixed date and run git.
 *
 * @returns {Promise<{root: string, home: string, write: (files: Record<string, string>) => void, commit: (message: string, date?: string) => Promise<void>, git: (...args: string[]) => Promise<void>, remove: () => void}>}
 */
export const createGitWorkspace = async () => {
  const staged = stageBashWorkspace({ scripts: [] })
  mkdirSync(staged.root, { recursive: true })
  await gitIn(staged.root, ['init', '-q', '-b', 'main'])
  writeFiles(staged.root, { 'repos.json': '{}\n' })
  return {
    ...staged,
    write: (files) => writeFiles(staged.root, files),
    commit: (message, date = DEFAULT_COMMIT_DATE) =>
      applyStep(staged.root, { kind: 'commit', message, date }),
    git: (...args) => applyStep(staged.root, { kind: 'git', args })
  }
}

export { specText }

/**
 * Stages the fixture workspace, applies its steps in order and hands each
 * run step to `runCommand`, collecting what it returns.
 *
 * @param {object} args
 * @param {string[]} [args.scripts] - Workspace scripts to copy in, for the Bash recording
 * @param {(staged: {home: string, root: string}, step: object) => Promise<object>} args.runCommand
 * @returns {Promise<object[]>} One recording per run step, named by its case
 */
export const playThemeTicketSteps = async ({ scripts = [], runCommand }) => {
  const staged = stageBashWorkspace({ scripts })
  try {
    writeFiles(staged.root, { [FAKE_JIRA_SEARCH]: fakeJiraSearch() })
    chmodSync(join(staged.root, FAKE_JIRA_SEARCH), 0o755)
    await gitIn(staged.root, ['init', '-q', '-b', 'main'])
    const recordings = []
    for (const step of THEME_TICKET_STEPS) {
      if (step.kind === 'run') {
        const args = step.args.map((arg) => arg.replace('<ROOT>', staged.root))
        recordings.push({
          case: `${step.command}: ${step.name}`,
          ...(await runCommand(staged, { ...step, args }))
        })
      } else {
        await applyStep(staged.root, step)
      }
    }
    return recordings
  } finally {
    staged.remove()
  }
}

/**
 * The text a recording keeps: the temporary HOME becomes `<HOME>`.
 *
 * @param {string} text
 * @param {string} home
 * @returns {string}
 */
export const withHomeMarked = (text, home) => text.split(home).join('<HOME>')

/**
 * The derived JSON a run wrote with `--out`, when it wrote one.
 *
 * @param {{root: string, home: string}} staged
 * @param {string[]} args
 * @returns {{out?: string}}
 */
export const writtenOut = (staged, args) => {
  const outAt = args.indexOf('--out')
  if (outAt === -1) return {}
  const outFile = join(staged.root, args[outAt + 1])
  return { out: withHomeMarked(readFileSync(outFile, 'utf8'), staged.home) }
}

/**
 * What the Bash scripts did on every step, as the recording test froze it.
 *
 * @returns {object[]}
 */
export const readThemeTicketGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/theme-ticket-scripts.json', import.meta.url),
      'utf8'
    )
  )
