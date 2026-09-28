import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { repoPath } from '../../constants/repos.js'
import { OK, PARTIAL_FAILURE, ERROR } from '../../constants/exitCodes.js'
import { isTimError } from '../../errors.js'
import { jsonEnvelope, exitCodeFor, errorPayloadFor } from '../envelope.js'
import { ensureUpstreamRemote } from '../workspace/setup.js'
import { installAll } from '../workspace/install.js'
import { probeAll } from '../auth.js'

export const PROTOTYPE_REPO = 'trade-imports-plants-prototype'
export const CLAUDE_LOCAL_MD = 'CLAUDE.local.md'

const MARKER_START = '<!-- tim:designer-note start -->'
const MARKER_END = '<!-- tim:designer-note end -->'
const NOTE_TEXT =
  'You are working with a designer. Route every request about pages, ' +
  'words, examples, journeys, demos, research or hand-offs through the ' +
  '`prototype` skill unless they name a real repo or a Jira ticket. ' +
  'Never ask them to name a skill.'

const BLOCK_PATTERN = new RegExp(`${MARKER_START}[\\s\\S]*?${MARKER_END}`, '')

/**
 * Add or refresh the designer-note block in `content`, leaving everything
 * else untouched. Calling it again on its own output is a no-op — the
 * existing block is replaced with the same text rather than duplicated.
 *
 * @param {string} [content]
 * @returns {string}
 */
export const upsertDesignerNote = (content = '') => {
  const block = `${MARKER_START}\n${NOTE_TEXT}\n${MARKER_END}`
  if (BLOCK_PATTERN.test(content)) return content.replace(BLOCK_PATTERN, block)
  const trimmed = content.replace(/\s+$/, '')
  return trimmed.length === 0 ? `${block}\n` : `${trimmed}\n\n${block}\n`
}

/**
 * Remove the designer-note block from `content`, leaving everything else
 * untouched. A no-op when the block isn't present.
 *
 * @param {string} [content]
 * @returns {string}
 */
export const removeDesignerNote = (content = '') => {
  if (!BLOCK_PATTERN.test(content)) return content
  const collapsed = content
    .replace(BLOCK_PATTERN, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return collapsed.length === 0 ? '' : `${collapsed}\n`
}

const writeDesignerNote = (workspaceRoot, { remove }) => {
  const path = join(workspaceRoot, CLAUDE_LOCAL_MD)
  const before = existsSync(path) ? readFileSync(path, 'utf8') : ''
  const after = remove ? removeDesignerNote(before) : upsertDesignerNote(before)
  const changed = after !== before
  if (changed) writeFileSync(path, after)
  return { path, changed, removed: remove }
}

const readinessLine = ({ service, ok, user, error }) => {
  if (ok) {
    const who = user.displayName ?? user.name ?? user.login ?? user.user
    return `${service}: OK — signed in as ${who ?? 'an unknown user'}`
  }
  if (service === 'jira') {
    return `jira: not available (${error.message}) — you can still hand off by pasting`
  }
  return `${service}: not available — ${error.message}`
}

/**
 * Set the workspace up for a designer working on the plants prototype:
 * write (or remove) the routing note in `CLAUDE.local.md`, add the
 * prototype's fetch-only upstream remote, install its dependencies, and
 * summarise Jira/GitHub readiness. Never touches Jira or pushes anything.
 *
 * @param {string} workspaceRoot
 * @param {object} [options]
 * @param {boolean} [options.remove] - Remove the designer note instead of adding it
 * @param {() => Promise<Array>} [options.readinessProbe] - Override for `probeAll`, for tests
 * @returns {Promise<object>}
 */
export const runPrototypeSetup = async (
  workspaceRoot,
  { remove = false, readinessProbe = probeAll } = {}
) => {
  const note = writeDesignerNote(workspaceRoot, { remove })

  if (remove) {
    return { ok: true, note, upstream: null, install: null, readiness: null }
  }

  const dir = repoPath(workspaceRoot, PROTOTYPE_REPO)
  const cloned = existsSync(join(dir, '.git'))

  const upstream = cloned
    ? await ensureUpstreamRemote(PROTOTYPE_REPO, dir)
    : { status: 'not-cloned' }

  const install = cloned
    ? await installAll(workspaceRoot, { repo: [PROTOTYPE_REPO] })
    : []

  const readiness = await readinessProbe()

  const ok = upstream.status !== 'failed' && install.every((r) => r.ok)

  return { ok, note, upstream, install, readiness }
}

const renderNoteLine = ({ note, remove }) => {
  if (remove) {
    return `Designer note: ${note.changed ? 'removed' : 'was not present'} in ${CLAUDE_LOCAL_MD}`
  }
  return `Designer note: ${note.changed ? 'added to' : 'already set in'} ${CLAUDE_LOCAL_MD}`
}

const UPSTREAM_LINES = {
  'not-configured': 'Upstream remote: none declared for this repo',
  'not-cloned': `Upstream remote: skipped — ${PROTOTYPE_REPO} is not cloned`,
  'already-set-up': 'Upstream remote: already set up',
  added: 'Upstream remote: added (fetch-only)',
  failed: 'Upstream remote: FAILED to add'
}

const renderInstallLine = (install) => {
  if (install === null) return null
  if (install.length === 0) {
    return `Install: skipped — ${PROTOTYPE_REPO} is not cloned`
  }
  const [result] = install
  return result.ok ? 'Install: done' : 'Install: FAILED'
}

const renderText = (result, { remove }) => {
  const lines = [renderNoteLine({ note: result.note, remove })]
  if (remove) return lines.join('\n')
  lines.push(UPSTREAM_LINES[result.upstream.status])
  const installLine = renderInstallLine(result.install)
  if (installLine) lines.push(installLine)
  for (const entry of result.readiness) lines.push(readinessLine(entry))
  return lines.join('\n')
}

const SCHEMA_VERSION = 1

// jsonEnvelope forces `result: null` on failure, which fits a thrown
// exception but not this command's own partial-failure result object
// (upstream or install failed, but there is still a report worth
// returning) — so the success path builds its envelope directly and
// reserves jsonEnvelope for the exception path below.
const renderJson = (result, timVersion) =>
  JSON.stringify({
    ok: result.ok,
    schema_version: SCHEMA_VERSION,
    tim_version: timVersion,
    result,
    errors: [],
    metadata: { ranAt: new Date().toISOString() }
  })

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

export const register = (parent, { timVersion }) => {
  parent
    .command('setup')
    .description(
      "Set the workspace up for a designer working on the plants prototype: note in CLAUDE.local.md that requests route through the `prototype` skill, add the prototype's fetch-only upstream remote, install its dependencies, and check Jira and GitHub readiness. Never touches Jira and never pushes."
    )
    .option(
      '--remove',
      'Remove the designer note from CLAUDE.local.md instead of adding it'
    )
    .action(async function prototypeSetupAction(opts) {
      const globalOpts = this.optsWithGlobals()
      try {
        const workspaceRoot = resolveWorkspaceRoot({
          explicit: globalOpts.workspace
        })
        const remove = Boolean(opts.remove)
        const result = await runPrototypeSetup(workspaceRoot, { remove })
        if (globalOpts.json) emit(renderJson(result, timVersion))
        else emit(renderText(result, { remove }))
        process.exit(result.ok ? OK : PARTIAL_FAILURE)
      } catch (error) {
        if (globalOpts.json) {
          emit(
            JSON.stringify(
              jsonEnvelope({
                ok: false,
                error: errorPayloadFor(error),
                timVersion
              })
            )
          )
        } else {
          emitError(error.message ?? String(error))
        }
        process.exit(isTimError(error) ? exitCodeFor(error) : ERROR)
      }
    })
}
