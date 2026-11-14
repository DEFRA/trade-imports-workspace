import { join } from 'node:path'

export const CAPABILITY_MAP_PAGE_ID = '6468764101'

/**
 * Where a workspace keeps its synced copy of the capability map.
 *
 * @param {string} workspaceRoot
 * @returns {string}
 */
export const capabilityMapPathOf = (workspaceRoot) =>
  join(
    workspaceRoot,
    'docs',
    'confluence',
    'import-notification-capability-map.md'
  )

/**
 * The second blank-separated word of the first line that starts
 * `version:`, as the synced front matter records the page version.
 *
 * @param {string} text - The synced map
 * @returns {string} The version, or '' when no line gives one
 */
export const syncedVersionOf = (text) => {
  const versionLine = text
    .split('\n')
    .find((line) => line.startsWith('version:'))
  return versionLine?.split(/[ \t]+/).filter(Boolean)[1] ?? ''
}
