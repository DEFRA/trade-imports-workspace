import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import {
  normaliseRecordedText,
  stageBashWorkspace
} from '../../test-support/bash-golden-harness.js'

export const BASH_SCRIPT_FOR = {
  start: 'tools/skill-creator/start-skill-creator.sh',
  answer: 'tools/skill-creator/interview-add-answer.sh',
  render: 'tools/skill-creator/render-interview.sh',
  scaffold: 'tools/skill-creator/scaffold-skill.sh'
}

const settingsFixture = {
  $schema: 'https://json.schemastore.org/claude-code-settings.json',
  permissions: {
    allow: [
      'Bash(tim:*)',
      'Bash(~/git/defra/trade-imports-workspace/tools/fanout-no-walker/*:*)',
      'Read(//tmp/**)'
    ],
    deny: ['Bash(node:*)']
  },
  hooks: {
    PreToolUse: [
      {
        matcher: 'Bash',
        hooks: [
          {
            type: 'command',
            command: 'echo "café — guard" >&2',
            timeout: 30
          }
        ]
      }
    ]
  },
  enabledPlugins: {},
  env: { EMPTY: '' }
}

const settingsFixtureText = `${JSON.stringify(settingsFixture, null, 2)}\n`

/**
 * What the Bash scripts did on every case, as the golden test recorded it.
 *
 * @returns {{start: object, answer: object[], render: object[], scaffold: object[]}}
 */
export const readSkillGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/skill-creator-scripts.json', import.meta.url),
      'utf8'
    )
  )

const decisionsFile = (name, answers) => [
  `workareas/skill-creator/${name}/decisions.json`,
  `${JSON.stringify(
    {
      name,
      started_at: '2026-11-13T10:00:00Z',
      answered_at: null,
      scaffolded_at: null,
      answers
    },
    null,
    2
  )}\n`
]

export const renderDecisions = {
  'render-full': {
    purpose: 'Scaffold workspace skills end to end.',
    state_shape: 'json',
    dispatcher: true,
    prebake: false,
    fanout: { enabled: true, workers: ['AUDITOR', 'PLANNER'] },
    walker: true,
    helpers: ['add-item', 'render-items'],
    triggers: {
      phrases: ['scaffold skill', 'skill-create'],
      disambiguation: 'Not for editing an existing skill.'
    }
  },
  'render-empty': {},
  'render-partial': {
    purpose: '',
    dispatcher: false,
    walker: false,
    fanout: { enabled: false },
    helpers: [],
    triggers: { phrases: [] }
  },
  'render-odd': {
    purpose: 'Ends with blank lines\n\n',
    state_shape: 42,
    dispatcher: ['yes'],
    prebake: { mode: 'eager', ratio: 1.5 },
    fanout: { enabled: 'true', workers: [] },
    walker: 'café — ok',
    helpers: ['only-one'],
    triggers: { phrases: ['say "hi"'], disambiguation: false }
  }
}

export const scaffoldDecisions = {
  'json-fanout': renderDecisions['render-full'],
  'prose-plain': {
    purpose: 'Write prose notes.',
    state_shape: 'prose',
    dispatcher: false,
    prebake: false,
    fanout: { enabled: false },
    walker: false,
    helpers: [],
    triggers: {
      phrases: ['write notes'],
      disambiguation: 'Not for tickets.'
    }
  },
  'fanout-no-walker': {
    purpose: 'Check things in parallel.',
    state_shape: 'prose',
    dispatcher: true,
    prebake: true,
    fanout: { enabled: true, workers: ['CHECKER'] },
    walker: false,
    helpers: ['start-fanout-no-walker'],
    triggers: {
      phrases: ['check things', 'run checks'],
      disambiguation: 'Not for reviews.'
    }
  },
  'half-answered': {
    purpose: 'Half done.',
    dispatcher: false,
    fanout: { workers: [] },
    helpers: 'not-a-list',
    triggers: { phrases: [], disambiguation: '' }
  },
  unanswered: {}
}

/**
 * A workspace laid out where the Bash scripts look, holding three skills
 * with a SKILL.md (skill-creator among them), one skill folder without one,
 * a small `.claude/settings.json`, and seeded decisions for the render and
 * scaffold cases.
 *
 * @param {object} [opts]
 * @param {string[]} [opts.scripts]
 */
export const stageSkillWorkspace = ({ scripts = [] } = {}) =>
  stageBashWorkspace({
    scripts,
    files: {
      'repos.json': '{}\n',
      'docs/best-practices/README.md': '# Best practices\n',
      '.claude/settings.json': settingsFixtureText,
      '.claude/skills/skill-creator/SKILL.md': '# skill-creator\n',
      '.claude/skills/alpha/SKILL.md': '# alpha\n',
      '.claude/skills/beta-two/SKILL.md': '# beta-two\n',
      '.claude/skills/gamma/notes.md': 'No SKILL.md here.\n',
      ...Object.fromEntries(
        Object.entries({
          ...renderDecisions,
          ...scaffoldDecisions,
          'kept-run': { purpose: 'Already started.' }
        }).map(([name, answers]) => decisionsFile(name, answers))
      )
    }
  })

export const startCases = [
  { name: 'scaffold prefix', trigger: 'scaffold skill new-thing' },
  { name: 'skill-create prefix', trigger: 'skill-create other-thing' },
  {
    name: 'new workspace skill prefix',
    trigger: 'new workspace skill third-one'
  },
  { name: 'mixed case', trigger: 'Scaffold Skill Mixed-Case' },
  { name: 'trailing full stop', trigger: 'scaffold skill dotted.' },
  {
    name: 'two-word name takes the first word',
    trigger: 'scaffold skill first second'
  },
  { name: 'leading digit', trigger: 'scaffold skill 9lives' },
  { name: 'existing skill refused', trigger: 'scaffold skill alpha' },
  {
    name: 'existing folder without SKILL.md refused',
    trigger: 'skill-create gamma'
  },
  { name: 'existing decisions kept', trigger: 'scaffold skill kept-run' },
  { name: 'audit one', trigger: 'audit skill alpha' },
  { name: 'review one', trigger: 'Review skill beta-two!' },
  { name: 'audit one missing', trigger: 'audit skill nobody' },
  { name: 'audit one without SKILL.md', trigger: 'audit skill gamma' },
  { name: 'audit all', trigger: 'audit skills' },
  { name: 'audit all skills', trigger: 'audit all skills' },
  { name: 'audit all with full stop is not parsed', trigger: 'audit skills.' },
  { name: 'underscore name not parsed', trigger: 'scaffold skill bad_name' },
  { name: 'leading hyphen not parsed', trigger: 'scaffold skill -dash' },
  { name: 'unparseable', trigger: 'make me a skill' }
]

export const answerRunId = 'answer-run'

export const answerCases = [
  {
    name: 'string',
    args: ['--field', 'purpose', '--value', '"Track things."']
  },
  {
    name: 'state shape',
    args: ['--field', 'state_shape', '--value', '"json"']
  },
  { name: 'boolean', args: ['--field', 'dispatcher', '--value', 'true'] },
  { name: 'false boolean', args: ['--field', 'prebake', '--value', 'false'] },
  {
    name: 'nested creates parent',
    args: ['--field', 'fanout.enabled', '--value', 'true']
  },
  {
    name: 'nested array',
    args: ['--field', 'fanout.workers', '--value', '["AUDITOR", "PLANNER"]']
  },
  { name: 'helpers array', args: ['--field', 'helpers', '--value', '[]'] },
  {
    name: 'triggers phrases',
    args: [
      '--field',
      'triggers.phrases',
      '--value',
      '["scaffold skill","skill-create"]'
    ]
  },
  {
    name: 'unicode string',
    args: [
      '--field',
      'triggers.disambiguation',
      '--value',
      '"Not for café — work"'
    ]
  },
  {
    name: 'object value',
    args: ['--field', 'walker', '--value', '{"b": 2, "a": [1, {"c": null}]}']
  },
  {
    name: 'overwrite',
    args: ['--field', 'purpose', '--value', '"Track things, again."']
  },
  {
    name: 'bad JSON value',
    args: ['--field', 'purpose', '--value', 'not json']
  },
  {
    name: 'scalar parent',
    args: ['--field', 'dispatcher.deep', '--value', '1']
  },
  { name: 'array parent', args: ['--field', 'helpers.first', '--value', '1'] },
  { name: 'missing value', args: ['--field', 'purpose', '--value', ''] },
  { name: 'missing field', args: ['--value', '1'] }
]

export const answerRefusalCases = [
  {
    name: 'bad run-id',
    args: ['--run-id', 'Bad_Id', '--field', 'purpose', '--value', '"x"']
  },
  {
    name: 'leading hyphen run-id',
    args: ['--run-id', '-x', '--field', 'purpose', '--value', '"x"']
  },
  {
    name: 'no decisions',
    args: ['--run-id', 'nobody', '--field', 'purpose', '--value', '"x"']
  }
]

export const renderCases = [
  ...Object.keys(renderDecisions).map((name) => ({
    name,
    args: ['--run-id', name]
  })),
  { name: 'no decisions', args: ['--run-id', 'nobody'] }
]

export const scaffoldCases = [
  {
    name: 'json-fanout dry run',
    args: ['--run-id', 'json-fanout', '--dry-run']
  },
  {
    name: 'fanout-no-walker dry run',
    args: ['--run-id', 'fanout-no-walker', '--dry-run']
  },
  {
    name: 'prose-plain dry run',
    args: ['--run-id', 'prose-plain', '--dry-run']
  },
  { name: 'json-fanout', args: ['--run-id', 'json-fanout'] },
  { name: 'json-fanout again', args: ['--run-id', 'json-fanout'] },
  { name: 'prose-plain', args: ['--run-id', 'prose-plain'] },
  { name: 'fanout-no-walker', args: ['--run-id', 'fanout-no-walker'] },
  { name: 'half-answered', args: ['--run-id', 'half-answered'] },
  { name: 'unanswered', args: ['--run-id', 'unanswered'] },
  { name: 'bad run-id', args: ['--run-id', '../escape'] },
  { name: 'no decisions', args: ['--run-id', 'nobody'] }
]

const folderAndEntriesUnder = (folder) => [
  folder,
  ...readdirSync(folder, { recursive: true, withFileTypes: true })
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()
]

const recordEntry = (path, home) => {
  const stats = statSync(path)
  if (stats.isDirectory()) return 'folder'
  return {
    mode: (stats.mode & 0o777).toString(8),
    text: normaliseRecordedText(readFileSync(path, 'utf8'), home)
  }
}

/**
 * Each given workspace folder that exists, and every folder and file under it, keyed by its
 * path from the workspace root: a folder records as `folder`, a file as its
 * permission bits and its text with HOME and timestamps masked.
 *
 * @param {{home: string, root: string}} staged
 * @param {string[]} folders - Workspace-relative folders
 * @returns {Record<string, string | {mode: string, text: string}>}
 */
export const recordTree = (staged, folders) =>
  Object.fromEntries(
    folders
      .map((folder) => join(staged.root, folder))
      .filter((folder) => existsSync(folder))
      .flatMap(folderAndEntriesUnder)
      .map((path) => [
        relative(staged.root, path),
        recordEntry(path, staged.home)
      ])
  )

/**
 * The allowlist entries a run added to the settings file, and the SHA-256
 * of the whole file, so a recording shows any other byte that changed.
 *
 * @param {{root: string}} staged
 * @returns {{added: string[], sha256: string}}
 */
export const recordSettings = (staged) => {
  const text = readFileSync(
    join(staged.root, '.claude', 'settings.json'),
    'utf8'
  )
  const allowBefore = JSON.parse(settingsFixtureText).permissions.allow
  return {
    added: JSON.parse(text).permissions.allow.slice(allowBefore.length),
    sha256: createHash('sha256').update(text).digest('hex')
  }
}

export const SCAFFOLD_WATCHED_FOLDERS = [
  '.claude/skills/json-fanout',
  '.claude/skills/prose-plain',
  '.claude/skills/fanout-no-walker',
  '.claude/skills/half-answered',
  'tools/json-fanout',
  'tools/prose-plain',
  'tools/fanout-no-walker',
  'workareas/skill-creator/json-fanout',
  'workareas/skill-creator/prose-plain',
  'workareas/skill-creator/fanout-no-walker'
]
