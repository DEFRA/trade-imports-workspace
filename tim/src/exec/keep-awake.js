import { spawn } from 'node:child_process'

export const keepAwakeCommand = ({ pid, platform = process.platform }) =>
  platform === 'darwin'
    ? { command: 'caffeinate', args: ['-s', '-i', '-w', String(pid)] }
    : null

const writeToStderr = (message) => process.stderr.write(`${message}\n`)

/**
 * Stops a Mac sleeping, idle or scheduled, until the given process ends. Does
 * nothing on another platform. When the command cannot start, it writes why to
 * `warn` and the caller carries on.
 *
 * @param {{ pid?: number, platform?: string, env?: NodeJS.ProcessEnv, warn?: (message: string) => void }} [options]
 * @returns {import('node:child_process').ChildProcess | null} the process holding the machine awake
 */
export const keepSystemAwakeWhile = ({
  pid = process.pid,
  platform = process.platform,
  env = process.env,
  warn = writeToStderr
} = {}) => {
  const keepAwake = keepAwakeCommand({ pid, platform })
  if (!keepAwake) return null
  const holder = spawn(keepAwake.command, keepAwake.args, {
    detached: true,
    stdio: 'ignore',
    env
  })
  holder.on('error', (error) =>
    warn(
      `Can't stop the machine sleeping while process ${pid} runs: ${error.message}. A machine that sleeps freezes the stack and every test running against it.`
    )
  )
  holder.unref()
  return holder
}
