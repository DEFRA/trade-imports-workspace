import { execa } from 'execa'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const hooksDir = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  '.claude',
  'hooks'
)

export const guardBashCommand = ['bash', join(hooksDir, 'guard-bash.sh')]
export const guardEditsCommand = ['bash', join(hooksDir, 'guard-edits.sh')]

/**
 * Run a guard hook the way Claude Code does: hook JSON on stdin, decision
 * JSON (or nothing) on stdout.
 *
 * @returns {Promise<{exitCode: number, decision: object|null}>}
 */
export const runGuardHook = async (
  [program, ...args],
  hookInput,
  { cwd, env = {} } = {}
) => {
  const { exitCode, stdout } = await execa(program, args, {
    input: JSON.stringify(hookInput),
    cwd,
    env: { ...process.env, ...env },
    reject: false
  })
  return { exitCode, decision: stdout === '' ? null : JSON.parse(stdout) }
}

export const allowed = { exitCode: 0, decision: null }

export const deniedWith = (reason) => ({
  exitCode: 0,
  decision: {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason
    }
  }
})
