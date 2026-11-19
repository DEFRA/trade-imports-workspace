import { TimError } from '../errors.js'

const CHANGELOG_URL =
  'https://raw.githubusercontent.com/alphagov/govuk-frontend/main/CHANGELOG.md'

/**
 * Create a client for govuk-frontend's published CHANGELOG.md: a plain,
 * unauthenticated download of the raw file.
 *
 * @param {object} [opts]
 * @param {string} [opts.url] - Defaults to the file on govuk-frontend's main branch
 * @returns {{url: string, fetchChangelog: () => Promise<string>}}
 */
export const createGovukChangelogClient = ({ url = CHANGELOG_URL } = {}) => ({
  url,

  /**
   * @returns {Promise<string>} The whole CHANGELOG.md
   * @throws {TimError} NETWORK when the download fails or returns an error status
   */
  fetchChangelog: async () => {
    const refusal = `Cannot download CHANGELOG.md from ${url}`
    let response
    try {
      response = await fetch(url)
    } catch (error) {
      throw new TimError('NETWORK', `${refusal}: ${error.message}`, error)
    }
    if (!response.ok) {
      throw new TimError(
        'NETWORK',
        `${refusal}: it returned ${response.status}`
      )
    }
    return response.text()
  }
})
