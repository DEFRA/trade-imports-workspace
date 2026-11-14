const replaceIn = (value, replacements) =>
  replacements.reduce((text, [from, to]) => text.split(from).join(to), value)

const todayUtc = () => new Date().toISOString().slice(0, 10)

/**
 * A recording with the fixture server's base as `<BASE>` and today's date
 * as `<DATE>`, so it reads the same on every run.
 *
 * @param {{stdout: string, stderr: string, files?: Record<string, string>}} recording
 * @param {{base: string}} opts
 * @returns {object}
 */
export const normaliseRecording = (recording, { base }) => {
  const replacements = [
    [base, '<BASE>'],
    [todayUtc(), '<DATE>']
  ]
  const normalised = {
    ...recording,
    stdout: replaceIn(recording.stdout, replacements),
    stderr: replaceIn(recording.stderr, replacements)
  }
  if (recording.files === undefined) return normalised
  return {
    ...normalised,
    files: Object.fromEntries(
      Object.entries(recording.files).map(([name, content]) => [
        name,
        replaceIn(content, replacements)
      ])
    )
  }
}
