/**
 * What a golden holds of one run: the exit code and stdout, and stderr only
 * when the run failed, since a run that worked writes npm's notices there.
 *
 * @param {string} name
 * @param {{exitCode: number, stdout: string, stderr: string}} run
 * @returns {{case: string, exitCode: number, stdout: string, stderr?: string}}
 */
export const recordingOf = (name, { exitCode, stdout, stderr }) =>
  exitCode === 0
    ? { case: name, exitCode, stdout }
    : { case: name, exitCode, stdout, stderr }
