import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { readJsonFile } from '../backlog/io.js'
import { writeJsonAtomic } from '../review/store.js'
import { assertRunId, decisionsPath, skillCreatorPaths } from './paths.js'
import {
  isPlainObject,
  jqField,
  jqPath,
  jqRaw,
  jsonTypeName,
  stringItems,
  withoutTrailingNewlines
} from './jq-text.js'
import { renderDecisions } from './render.js'
import {
  helperStubScript,
  skillMarkdown,
  stateBlock,
  stateSchemaMarkdown,
  step0Block,
  workerBlock,
  workerReferenceMarkdown
} from './templates.js'

const EXECUTABLE_MODE = 0o755

const hasKey = (object, key) =>
  isPlainObject(object) && Object.hasOwn(object, key)

const lengthAsJqCounts = (value) => {
  if (value === null || value === undefined || value === false) return 0
  if (Array.isArray(value)) return value.length
  if (typeof value === 'string') return [...value].length
  if (typeof value === 'number') return Math.abs(value)
  if (isPlainObject(value)) return Object.keys(value).length
  throw new TimError('PARSE', `${jsonTypeName(value)} has no length`)
}

const disambiguationOf = (answers) => {
  const disambiguation = jqPath(answers, ['triggers', 'disambiguation'])
  return disambiguation === false ? null : disambiguation
}

/**
 * The answers a scaffold still needs, in interview order. `purpose` and
 * `state_shape` must not be empty; `dispatcher`, `prebake`, `walker` and
 * `fanout.enabled` must be present, and `false` counts; `helpers` must be a
 * list; `triggers.phrases` must hold at least one phrase; and
 * `triggers.disambiguation` must not be empty.
 *
 * @param {object} answers - The `answers` of a decisions.json document
 * @returns {string[]} The dotted names of the missing answers
 */
export const missingAnswers = (answers) => {
  const checks = [
    ['purpose', hasKey(answers, 'purpose') && answers.purpose !== ''],
    [
      'state_shape',
      hasKey(answers, 'state_shape') && answers.state_shape !== ''
    ],
    ['dispatcher', hasKey(answers, 'dispatcher')],
    ['prebake', hasKey(answers, 'prebake')],
    ['fanout.enabled', hasKey(answers?.fanout, 'enabled')],
    ['walker', hasKey(answers, 'walker')],
    ['helpers', Array.isArray(answers?.helpers)],
    [
      'triggers.phrases',
      lengthAsJqCounts(jqPath(answers, ['triggers', 'phrases'])) > 0
    ],
    ['triggers.disambiguation', ![null, ''].includes(disambiguationOf(answers))]
  ]
  return checks.filter(([, answered]) => !answered).map(([field]) => field)
}

const shownRaw = (value) => withoutTrailingNewlines(jqRaw(value))

const scaffoldChoicesOf = (decisions, runId) => {
  const answers = jqField(decisions, 'answers')
  const fanoutOn = shownRaw(jqPath(answers, ['fanout', 'enabled'])) === 'true'
  return {
    name: runId,
    stateShape: shownRaw(answers.state_shape),
    dispatcher: shownRaw(answers.dispatcher),
    fanout: shownRaw(answers.fanout.enabled),
    walker: shownRaw(answers.walker),
    purpose: shownRaw(answers.purpose),
    disambiguation: shownRaw(answers.triggers.disambiguation),
    phrases: stringItems(answers.triggers.phrases, 'triggers.phrases'),
    helpers: stringItems(answers.helpers, 'helpers'),
    workers: fanoutOn
      ? stringItems(answers.fanout.workers, 'fanout.workers')
      : [],
    fanoutOn
  }
}

const dryRunText = (choices, skillDir) =>
  [
    `DRY RUN — would scaffold ${choices.name}:`,
    `  SKILL.md → ${join(skillDir, 'SKILL.md')}`,
    `  state_shape=${choices.stateShape} dispatcher=${choices.dispatcher} fanout=${choices.fanout} walker=${choices.walker}`,
    '  helpers:',
    ...choices.helpers.map(
      (helper) => `    tools/${choices.name}/${helper}.sh`
    ),
    ...(choices.fanoutOn
      ? [
          '  workers:',
          ...choices.workers.map((worker) => `    references/${worker}.md`)
        ]
      : [])
  ].join('\n')

const writeTextAtomic = (path, text) => {
  const tempPath = `${path}.tmp`
  writeFileSync(tempPath, text, 'utf8')
  renameSync(tempPath, path)
}

const allowlistEntriesFor = (name) => [
  `Bash(~/git/defra/trade-imports-workspace/tools/${name}/*)`,
  `Bash(~/git/defra/trade-imports-workspace/tools/${name}/*:*)`
]

/**
 * Settings with entries added to the end of `permissions.allow`, skipping
 * any already there and keeping the order of the rest.
 *
 * @param {object} settings - A `.claude/settings.json` document
 * @param {string[]} entries
 * @returns {object} New settings; the given ones are not changed
 */
export const withAllowEntries = (settings, entries) => {
  const current = settings.permissions?.allow ?? []
  const added = entries.filter((entry) => !current.includes(entry))
  return {
    ...settings,
    permissions: { ...settings.permissions, allow: [...current, ...added] }
  }
}

const skillMarkdownFor = (choices) =>
  skillMarkdown({
    name: choices.name,
    purpose: choices.purpose,
    disambiguation: choices.disambiguation,
    phrases: choices.phrases,
    helpers: choices.helpers,
    workerSection: choices.fanoutOn
      ? workerBlock(choices.name, choices.workers)
      : '',
    stateSection: choices.stateShape === 'json' ? stateBlock(choices.name) : '',
    step0Section: choices.dispatcher === 'true' ? step0Block(choices.name) : ''
  })

const writeScaffold = (choices, { skillDir, toolsDir, schemaPath }) => {
  mkdirSync(join(skillDir, 'references'), { recursive: true })
  mkdirSync(join(skillDir, 'assets'), { recursive: true })
  mkdirSync(toolsDir, { recursive: true })
  writeTextAtomic(join(skillDir, 'SKILL.md'), skillMarkdownFor(choices))
  for (const worker of choices.workers.filter((each) => each !== '')) {
    writeTextAtomic(
      join(skillDir, 'references', `${worker}.md`),
      workerReferenceMarkdown()
    )
  }
  if (choices.stateShape === 'json') {
    writeTextAtomic(schemaPath, stateSchemaMarkdown(choices.name))
  }
  for (const helper of choices.helpers.filter((each) => each !== '')) {
    const helperPath = join(toolsDir, `${helper}.sh`)
    writeTextAtomic(helperPath, helperStubScript(helper))
    chmodSync(helperPath, EXECUTABLE_MODE)
  }
}

const appendAllowEntries = (settingsPath, entries) => {
  const settings = JSON.parse(readFileSync(settingsPath, 'utf8'))
  writeJsonAtomic(settingsPath, withAllowEntries(settings, entries))
}

const loadDecisions = (workspaceRoot, runId) => {
  if (!runId) throw new TimError('USAGE', 'Missing --run-id')
  assertRunId(runId)
  const path = decisionsPath(workspaceRoot, runId)
  if (!existsSync(path)) {
    throw new TimError('NOT_FOUND', `No decisions.json at ${path}`)
  }
  return { path, decisions: readJsonFile(path) }
}

const refuseMissingAnswers = (decisions) => {
  const missing = missingAnswers(jqField(decisions, 'answers'))
  if (missing.length > 0) {
    throw new TimError(
      'USAGE',
      `Cannot scaffold — missing answers: ${missing.join(',')}\nRun tim skill answer for each missing field, then retry.`
    )
  }
}

const summaryText = (result) =>
  [
    `Scaffolded skill: ${result.name}`,
    `  SKILL.md:    ${result.skill_md}`,
    ...result.references.map((reference) => `  reference:   ${reference}`),
    ...(result.schema === null ? [] : [`  schema:      ${result.schema}`]),
    ...result.helpers.map((helper) => `  helper:      ${helper}`),
    `  decisions:   ${result.decisions_md}`,
    `  allowlist:   ${result.settings} (appended ${result.allowlist_entries[0]})`,
    '',
    'Open the SKILL.md and replace the TODO markers.'
  ].join('\n')

/**
 * Builds a new workspace skill from a run's finished interview: SKILL.md,
 * a reference per fan-out worker, a state schema for JSON state, a stub
 * script per helper, decisions.md, two allowlist entries appended to
 * `.claude/settings.json`, and a `scaffolded_at` stamp. Each file is
 * written through a temp file and a rename, one after another, so a
 * failure part way leaves the files already written.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} [args.runId]
 * @param {boolean} [args.dryRun=false] - Change nothing and report the plan
 * @param {string} args.now - The `scaffolded_at` stamp
 * @returns {object} What was written, or would be, and the text to print
 * @throws {TimError} USAGE for a bad run id or missing answers, NOT_FOUND with no decisions.json, PARSE for an answer of the wrong shape
 */
export const scaffoldSkill = ({
  workspaceRoot,
  runId,
  dryRun = false,
  now
}) => {
  const { path, decisions } = loadDecisions(workspaceRoot, runId)
  refuseMissingAnswers(decisions)
  const choices = scaffoldChoicesOf(decisions, runId)
  const paths = skillCreatorPaths(workspaceRoot)
  const skillDir = join(paths.skillsDir, runId)
  const toolsDir = join(paths.toolsDir, runId)
  const schemaPath = join(skillDir, 'assets', `${runId}-schema.md`)
  if (dryRun) {
    return { dry_run: true, name: runId, text: dryRunText(choices, skillDir) }
  }
  writeScaffold(choices, { skillDir, toolsDir, schemaPath })
  const decisionsMarkdownPath = join(skillDir, 'decisions.md')
  writeTextAtomic(decisionsMarkdownPath, `${renderDecisions(decisions)}\n`)
  const entries = allowlistEntriesFor(runId)
  appendAllowEntries(paths.settingsPath, entries)
  writeJsonAtomic(path, { ...decisions, scaffolded_at: now })
  const result = {
    dry_run: false,
    name: runId,
    skill_md: join(skillDir, 'SKILL.md'),
    references: choices.workers.map((worker) =>
      join(skillDir, 'references', `${worker}.md`)
    ),
    schema: choices.stateShape === 'json' ? schemaPath : null,
    helpers: choices.helpers.map((helper) => join(toolsDir, `${helper}.sh`)),
    decisions_md: decisionsMarkdownPath,
    settings: paths.settingsPath,
    allowlist_entries: entries
  }
  return { ...result, text: summaryText(result) }
}
