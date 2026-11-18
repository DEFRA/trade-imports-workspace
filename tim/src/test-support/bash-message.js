/**
 * The message tim gives for an error a retired Bash script printed: the
 * same words without the `Error: ` prefix, as a sentence with a capital
 * letter and a full stop.
 *
 * @param {{stderr: string}} golden - A captured Bash run
 * @returns {string}
 */
export const timMessageFor = ({ stderr }) => {
  const words = stderr.replace(/^Error: /, '')
  const sentence = words.charAt(0).toUpperCase() + words.slice(1)
  return sentence.endsWith('.') ? sentence : `${sentence}.`
}
