const writeToStdout = (text) =>
  new Promise((resolve) => process.stdout.write(text, () => resolve()))

const reportToStderr = (error) =>
  process.stderr.write(`Hook skipped: ${error?.message ?? error}\n`)

const exitZero = () => process.stdout.write('', () => process.exit(0))

const rejectAfter = (timeoutMs) =>
  new Promise((_resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`no answer within ${timeoutMs} ms`)),
      timeoutMs
    )
    timer.unref()
  })

/**
 * Runs a hook's work and writes what it returns to stdout. Nothing is
 * written when the work throws, rejects or outlasts the timeout: the
 * reason goes to stderr instead. Never throws.
 *
 * @param {() => Promise<string>|string} produceOutput - the text to write, or '' for none
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs=10000]
 * @param {(text: string) => Promise<void>|void} [opts.write] - where the text goes
 * @returns {Promise<string>} the text written, '' when none
 */
export const runFailOpen = async (
  produceOutput,
  { timeoutMs = 10_000, write = writeToStdout } = {}
) => {
  let output
  try {
    output = await Promise.race([
      Promise.resolve().then(produceOutput),
      rejectAfter(timeoutMs)
    ])
  } catch (error) {
    reportToStderr(error)
    return ''
  }
  if (!output) return ''
  await write(output)
  return output
}

/**
 * Makes a commander command fail open for use as a Claude Code hook: a bad
 * flag, a missing option or any other usage error exits 0 instead of 2, so
 * the hook can never block or erase the prompt. Commander still prints the
 * usage error to stderr.
 *
 * @param {import('commander').Command} command
 * @returns {import('commander').Command} the same command
 */
export const failOpenCommand = (command) =>
  command.exitOverride(() => process.exit(0))

/**
 * A commander action for a hook command: runs the work through
 * {@link runFailOpen}, then exits 0 once stdout has flushed, whatever
 * happened. An error thrown later by a stray timer or promise also exits 0
 * with nothing more on stdout.
 *
 * @param {(...actionArgs: unknown[]) => Promise<string>|string} produceOutput - receives commander's action arguments
 * @param {object} [opts]
 * @param {number} [opts.timeoutMs]
 * @returns {(...actionArgs: unknown[]) => Promise<void>}
 */
export const failOpenAction =
  (produceOutput, { timeoutMs } = {}) =>
  async (...actionArgs) => {
    const exitOnStrayError = (error) => {
      reportToStderr(error)
      exitZero()
    }
    process.on('uncaughtException', exitOnStrayError)
    process.on('unhandledRejection', exitOnStrayError)
    await runFailOpen(() => produceOutput(...actionArgs), { timeoutMs })
    exitZero()
  }
