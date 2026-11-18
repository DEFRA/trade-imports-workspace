import { readFileSync, writeFileSync } from 'node:fs'
import { constants } from 'node:os'
import { join } from 'node:path'
import { runToLog } from '../../exec/exec.js'
import { isTimError } from '../../errors.js'

const LOG_PATH = join('.cache', 'sonar-push-check.log')
const TAIL_LINES = 60
const COMMAND_NOT_FOUND = 127

const signalExitCode = (signal) => {
  const killedBySignal = 128
  return killedBySignal + (constants.signals[signal] ?? 0)
}

/**
 * The last `count` lines of a text, as `tail -n` prints them: a final
 * line with no newline stays without one.
 *
 * @param {string} text
 * @param {number} count
 * @returns {string}
 */
export const lastLines = (text, count) => {
  if (text === '') return ''
  const endsWithNewline = text.endsWith('\n')
  const lines = (endsWithNewline ? text.slice(0, -1) : text).split('\n')
  const tail = lines.slice(-count).join('\n')
  return endsWithNewline ? `${tail}\n` : tail
}

const runOrNotFound = async (command, args, { dir, env, logPath }) => {
  try {
    const { exitCode } = await runToLog(command, args, {
      logPath,
      commandHeader: false,
      cwd: dir,
      env,
      extendEnv: false
    })
    return exitCode
  } catch (error) {
    if (typeof error?.signal === 'string') return signalExitCode(error.signal)
    if (!isTimError(error) || error.code !== 'MISSING_DEP') throw error
    writeFileSync(logPath, `${command}: command not found\n`)
    return COMMAND_NOT_FOUND
  }
}

/**
 * Runs a build command in `dir` with all its output in
 * `.cache/sonar-push-check.log`, replacing the last command's. When it
 * fails, only the log's last 60 lines go to `writeError`, so a build that
 * writes megabytes cannot flood the hook's caller.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {object} opts
 * @param {string} opts.dir
 * @param {Record<string, string|undefined>} opts.env - the whole environment the command gets
 * @param {(text: string) => void} opts.writeError
 * @returns {Promise<number>} the command's exit code: 127 when it is not installed, 128 plus the signal's number when a signal ends it
 */
export const runLogged = async (command, args, { dir, env, writeError }) => {
  const logPath = join(dir, LOG_PATH)
  const exitCode = await runOrNotFound(command, args, { dir, env, logPath })
  if (exitCode !== 0) {
    const tail = lastLines(readFileSync(logPath, 'utf8'), TAIL_LINES)
    writeError(
      `\nFailed: ${command}. Last ${TAIL_LINES} lines of ${logPath}:\n${tail}\n`
    )
  }
  return exitCode
}
