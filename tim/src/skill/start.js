import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { writeJsonAtomic } from '../review/store.js'
import { decisionsPath, skillCreatorPaths } from './paths.js'

const CREATE_PREFIXES = [
  'scaffold skill ',
  'skill-create ',
  'new workspace skill '
]
const AUDIT_ONE_PREFIXES = ['audit skill ', 'review skill ']
const AUDIT_ALL_TRIGGERS = ['audit skills', 'audit all skills']
const SKILL_CREATOR = 'skill-creator'

const lowerCaseAscii = (text) =>
  text.replace(/[A-Z]/g, (letter) => letter.toLowerCase())

const kebabNameFrom = (candidate) => {
  const name = candidate.replace(/[.,;!?]$/, '')
  if (name === '' || name.startsWith('-') || /[^a-z0-9-]/.test(name)) {
    return null
  }
  return name
}

const nameAfterPrefix = (trigger, prefixes) => {
  for (const prefix of prefixes.filter((each) => trigger.startsWith(each))) {
    const name = kebabNameFrom(trigger.slice(prefix.length).split(' ')[0])
    if (name !== null) return name
  }
  return null
}

const unparsedTriggerMessage = (trigger) =>
  [
    `Could not parse trigger: ${trigger}`,
    '',
    'Recognised forms:',
    '  CREATE:    "scaffold skill <name>" | "skill-create <name>" | "new workspace skill <name>"',
    '  AUDIT one: "audit skill <name>" | "review skill <name>"',
    '  AUDIT all: "audit skills"',
    '',
    '<name> must be kebab-case ([a-z][a-z0-9-]+).'
  ].join('\n')

/**
 * The skill-creator mode a trigger phrase asks for, and the skill it names.
 * Matching ignores upper case, takes the first word after the prefix and
 * drops one trailing `.`, `,`, `;`, `!` or `?` from it.
 *
 * @param {string} trigger
 * @returns {{mode: 'CREATE' | 'AUDIT_ONE', name: string} | {mode: 'AUDIT_ALL'}}
 * @throws {TimError} USAGE when the phrase matches no mode
 */
export const parseTrigger = (trigger) => {
  const lowered = lowerCaseAscii(trigger)
  const createName = nameAfterPrefix(lowered, CREATE_PREFIXES)
  if (createName !== null) return { mode: 'CREATE', name: createName }
  const auditName = nameAfterPrefix(lowered, AUDIT_ONE_PREFIXES)
  if (auditName !== null) return { mode: 'AUDIT_ONE', name: auditName }
  if (AUDIT_ALL_TRIGGERS.includes(lowered)) return { mode: 'AUDIT_ALL' }
  throw new TimError('USAGE', unparsedTriggerMessage(trigger))
}

const auditTarget = (paths, name) => ({
  name,
  skill_md_path: join(paths.skillsDir, name, 'SKILL.md'),
  output_path: join(paths.auditsDir, `${name}.md`)
})

const isFolder = (path) =>
  statSync(path, { throwIfNoEntry: false })?.isDirectory() ?? false

const byCodePoint = (left, right) => {
  if (left < right) return -1
  return left > right ? 1 : 0
}

const auditableSkillNames = (skillsDir) =>
  readdirSync(skillsDir)
    .filter((name) => !name.startsWith('.') && name !== SKILL_CREATOR)
    .filter((name) => isFolder(join(skillsDir, name)))
    .filter((name) => existsSync(join(skillsDir, name, 'SKILL.md')))
    .sort(byCodePoint)

const seedDecisions = (path, name, startedAt) => {
  if (existsSync(path)) return
  writeJsonAtomic(path, {
    name,
    started_at: startedAt,
    answered_at: null,
    scaffolded_at: null,
    answers: {}
  })
}

const startCreate = (workspaceRoot, paths, name, now) => {
  const skillDir = join(paths.skillsDir, name)
  if (isFolder(skillDir)) {
    throw new TimError(
      'USAGE',
      `Skill already exists at ${skillDir} — refusing to overwrite.\nPick a different name, or delete the existing scaffold first.`
    )
  }
  const path = decisionsPath(workspaceRoot, name)
  seedDecisions(path, name, now)
  return { mode: 'CREATE', name, decisions_path: path }
}

const startAuditOne = (paths, name) => {
  const target = auditTarget(paths, name)
  if (!existsSync(target.skill_md_path)) {
    throw new TimError(
      'NOT_FOUND',
      `No skill at ${target.skill_md_path} — nothing to audit.`
    )
  }
  return { mode: 'AUDIT_ONE', ...target }
}

const startAuditAll = (paths) => {
  const names = isFolder(paths.skillsDir)
    ? auditableSkillNames(paths.skillsDir)
    : []
  if (names.length === 0) {
    throw new TimError(
      'NOT_FOUND',
      `No skills to audit under ${paths.skillsDir} (excluding skill-creator).`
    )
  }
  return {
    mode: 'AUDIT_ALL',
    targets: names.map((name) => auditTarget(paths, name))
  }
}

/**
 * Starts the skill-creator skill from a trigger phrase. CREATE refuses a
 * skill folder that exists and seeds
 * `workareas/skill-creator/<name>/decisions.json` unless it is there
 * already. AUDIT_ONE names the skill's SKILL.md and audit file. AUDIT_ALL
 * lists every skill with a SKILL.md except skill-creator.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.trigger
 * @param {string} args.now - The `started_at` stamp for a new decisions file
 * @returns {{mode: string} & Record<string, any>}
 * @throws {TimError} USAGE or NOT_FOUND
 */
export const startSkillCreator = ({ workspaceRoot, trigger, now }) => {
  const paths = skillCreatorPaths(workspaceRoot)
  mkdirSync(paths.auditsDir, { recursive: true })
  mkdirSync(paths.interviewsDir, { recursive: true })
  const parsed = parseTrigger(trigger)
  if (parsed.mode === 'CREATE') {
    return startCreate(workspaceRoot, paths, parsed.name, now)
  }
  if (parsed.mode === 'AUDIT_ONE') return startAuditOne(paths, parsed.name)
  return startAuditAll(paths)
}

/**
 * The two lines `tim skill start` prints: the mode, then the rest of the
 * result as one line of JSON.
 *
 * @param {{mode: string}} result
 * @returns {string}
 */
export const renderStartText = ({ mode, ...payload }) =>
  `MODE: ${mode}\n${JSON.stringify(payload)}`
