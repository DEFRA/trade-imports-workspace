import { run } from '../exec/exec.js'

const lastLineOf = (text) => text.split('\n').at(-1)

const emptyAfter = (timeoutMs) =>
  new Promise((resolve) => setTimeout(() => resolve(''), timeoutMs).unref())

const printedToken = async (env, timeoutMs) => {
  const { stdout } = await run('zsh', ['-ic', 'printenv SONAR_TOKEN'], {
    env,
    extendEnv: false,
    stdin: 'ignore',
    stderr: 'ignore',
    timeout: Number.isFinite(timeoutMs) ? timeoutMs : undefined
  })
  return lastLineOf(stdout)
}

const printedTokenWithin = (env, timeoutMs) =>
  Number.isFinite(timeoutMs)
    ? Promise.race([printedToken(env, timeoutMs), emptyAfter(timeoutMs)])
    : printedToken(env, timeoutMs)

const readTokenFromInteractiveZsh = async (env, timeoutMs) => {
  try {
    return await printedTokenWithin(env, timeoutMs)
  } catch {
    return ''
  }
}

/**
 * The SonarCloud token for a hook: SONAR_TOKEN from the environment, else
 * the last line an interactive zsh prints for it, which reads ~/.zshenv and
 * ~/.zshrc. Undefined when neither has one, so the client calls SonarCloud
 * without a token.
 *
 * @param {object} [opts]
 * @param {Record<string, string|undefined>} [opts.env] - The environment to read and to start zsh with
 * @param {number} [opts.timeoutMs=5000] - How long zsh may take before the lookup gives up; Infinity waits for zsh however long it takes
 * @returns {Promise<string|undefined>}
 */
export const resolveSonarToken = async ({
  env = process.env,
  timeoutMs = 5000
} = {}) => {
  if (env.SONAR_TOKEN) return env.SONAR_TOKEN
  const fromZsh = await readTokenFromInteractiveZsh(env, timeoutMs)
  return fromZsh || undefined
}
