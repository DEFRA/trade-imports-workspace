import { execa } from 'execa'
import {
  appendFileSync,
  closeSync,
  mkdirSync,
  openSync,
  writeFileSync
} from 'node:fs'
import { dirname } from 'node:path'
import { TimError } from '../errors.js'

const isMissingExecutable = (error) =>
  error?.code === 'ENOENT' || error?.cause?.code === 'ENOENT'

const isExecaExitError = (error) =>
  typeof error?.exitCode === 'number' && error?.shortMessage !== undefined

const wrapMissing = (error, command) =>
  new TimError('MISSING_DEP', `Cannot find executable: ${command}.`, error)

/**
 * Run a subprocess and capture its output. Resolves with the result
 * on any non-zero exit so the caller can branch on exitCode without
 * try/catch. Only throws when the executable itself is missing.
 *
 * @param {string} command
 * @param {string[]} [args]
 * @param {object} [opts] - Passed to execa (cwd, env, signal, ...)
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number, durationMs: number, command: string}>}
 * @throws {TimError} MISSING_DEP when the executable is not found
 */
export const run = async (command, args = [], opts = {}) => {
  const start = performance.now()
  const settle = (result) => ({
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.exitCode ?? 0,
    durationMs: Math.round(performance.now() - start),
    command: result.command ?? `${command} ${args.join(' ')}`.trim()
  })
  try {
    return settle(await execa(command, args, opts))
  } catch (error) {
    if (isMissingExecutable(error)) throw wrapMissing(error, command)
    if (isExecaExitError(error)) return settle(error)
    throw error
  }
}

/**
 * Run a subprocess with stdio inherited from the parent — for live-streaming
 * commands such as `docker compose logs -f` or a foreground dev server.
 *
 * @param {string} command
 * @param {string[]} [args]
 * @param {object} [opts] - Passed to execa (cwd, env, signal, ...)
 * @returns {Promise<{exitCode: number, durationMs: number}>}
 * @throws {TimError} MISSING_DEP when the executable is not found
 */
export const runStreamed = async (command, args = [], opts = {}) => {
  const start = performance.now()
  const settle = (result) => ({
    exitCode: result.exitCode ?? 0,
    durationMs: Math.round(performance.now() - start)
  })
  try {
    return settle(await execa(command, args, { stdio: 'inherit', ...opts }))
  } catch (error) {
    if (isMissingExecutable(error)) throw wrapMissing(error, command)
    if (isExecaExitError(error)) return settle(error)
    throw error
  }
}

const commandLine = (command, args) => [command, ...args].join(' ')

/**
 * Run a subprocess with its stdout and stderr written to a log file, so
 * nothing streams to the terminal. The log starts with the command line and
 * the folder it ran in, unless `commandHeader` is false, and is replaced on
 * every run unless `append` is true.
 *
 * @param {string} command
 * @param {string[]} [args]
 * @param {object} opts - Passed to execa (cwd, env, ...), plus `logPath`, `commandHeader` and `append`
 * @param {string} opts.logPath
 * @param {boolean} [opts.commandHeader=true] - false starts the log with the command's own output
 * @param {boolean} [opts.append=false] - true adds to the end of the log instead of replacing it
 * @returns {Promise<{exitCode: number, durationMs: number, log: string}>}
 * @throws {TimError} MISSING_DEP when the executable is not found
 */
export const runToLog = async (
  command,
  args = [],
  { logPath, commandHeader = true, append = false, ...opts }
) => {
  mkdirSync(dirname(logPath), { recursive: true })
  const header = commandHeader
    ? `$ ${commandLine(command, args)}\n# in ${opts.cwd ?? process.cwd()}\n\n`
    : ''
  if (append) {
    appendFileSync(logPath, header)
  } else {
    writeFileSync(logPath, header)
  }
  const logFd = openSync(logPath, 'a')
  const start = performance.now()
  const settle = (result) => ({
    exitCode: result.exitCode ?? 0,
    durationMs: Math.round(performance.now() - start),
    log: logPath
  })
  try {
    return settle(
      await execa(command, args, {
        ...opts,
        stdin: 'ignore',
        stdout: logFd,
        stderr: logFd
      })
    )
  } catch (error) {
    if (isMissingExecutable(error)) throw wrapMissing(error, command)
    if (isExecaExitError(error)) return settle(error)
    throw error
  } finally {
    closeSync(logFd)
  }
}
