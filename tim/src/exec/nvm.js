import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const NVM_USE_THEN_RUN =
  '. "$NVM_DIR/nvm.sh" >/dev/null 2>&1; nvm use >/dev/null 2>&1 || true; exec "$@"'

/**
 * The nvm folder: `NVM_DIR` when it is set, else `$HOME/.nvm`.
 *
 * @param {Record<string, string | undefined>} [env]
 * @returns {string}
 */
export const nvmDirOf = (env = process.env) =>
  env.NVM_DIR || join(env.HOME || homedir(), '.nvm')

/**
 * The command line that runs `command` on the Node version the `.nvmrc`
 * of the folder it runs in names. With nvm installed, bash loads nvm,
 * runs `nvm use` and carries on whatever it says, as the Bash did; with
 * no nvm, the command runs as it is, on PATH.
 *
 * @param {string} command
 * @param {string[]} args
 * @param {Record<string, string | undefined>} [env]
 * @returns {{command: string, args: string[], env: Record<string, string>}} `env` holds the NVM_DIR to add
 */
export const onRepoNode = (command, args, env = process.env) => {
  const nvmDir = nvmDirOf(env)
  if (!existsSync(join(nvmDir, 'nvm.sh'))) return { command, args, env: {} }
  return {
    command: '/bin/bash',
    args: ['-c', NVM_USE_THEN_RUN, 'tim-nvm', command, ...args],
    env: { NVM_DIR: nvmDir }
  }
}
