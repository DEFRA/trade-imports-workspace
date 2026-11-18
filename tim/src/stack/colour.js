const ESCAPES = {
  reset: '\u001b[0m',
  red: '\u001b[31m',
  green: '\u001b[32m',
  yellow: '\u001b[33m',
  cyan: '\u001b[36m',
  grey: '\u001b[90m',
  bold: '\u001b[1m'
}

const NO_ESCAPES = Object.fromEntries(
  Object.keys(ESCAPES).map((name) => [name, ''])
)

/**
 * Whether a stream gets colour: never under CI or NO_COLOR (any non-empty
 * value), and only when the stream is a terminal.
 *
 * @param {object} opts
 * @param {Record<string, string | undefined>} opts.env
 * @param {{isTTY?: boolean}} opts.stream
 * @returns {boolean}
 */
export const colourEnabled = ({ env, stream }) =>
  !env.CI && !env.NO_COLOR && Boolean(stream.isTTY)

/**
 * The escape codes for a stream, each an empty string when colour is off.
 *
 * @param {object} [opts]
 * @param {Record<string, string | undefined>} [opts.env=process.env]
 * @param {{isTTY?: boolean}} [opts.stream=process.stdout]
 * @returns {{reset: string, red: string, green: string, yellow: string, cyan: string, grey: string, bold: string}}
 */
export const coloursFor = ({
  env = process.env,
  stream = process.stdout
} = {}) => (colourEnabled({ env, stream }) ? ESCAPES : NO_ESCAPES)

/**
 * An error line as the stack prints it to standard error: red when that
 * stream gets colour, plain otherwise, ending in a newline.
 *
 * @param {string} text
 * @param {object} [opts]
 * @param {Record<string, string | undefined>} [opts.env=process.env]
 * @param {{isTTY?: boolean}} [opts.stream=process.stderr]
 * @returns {string}
 */
export const errorLine = (
  text,
  { env = process.env, stream = process.stderr } = {}
) => {
  const { red, reset } = coloursFor({ env, stream })
  return `${red}${text}${reset}\n`
}
