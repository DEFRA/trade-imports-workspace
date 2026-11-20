const pause = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds))

/**
 * Read Jira again until a write shows, since Jira can trail a write it has
 * accepted. Waits `delayMs` before each of up to `attempts` reads.
 *
 * @param {() => Promise<boolean>} hasLanded - One read, answering whether the write shows
 * @param {{attempts: number, delayMs: number}} timing
 * @returns {Promise<boolean>} Whether the write showed within the attempts
 */
export const readBackUntilLanded = async (hasLanded, { attempts, delayMs }) => {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    await pause(delayMs)
    if (await hasLanded()) return true
  }
  return false
}
