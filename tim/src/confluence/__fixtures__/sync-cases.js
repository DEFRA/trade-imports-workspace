import { CONFLUENCE_ORIGIN, ROOT_ID } from './confluence-tree.js'

export const SYNC_SCRIPT = 'tools/confluence/sync-docs.sh'
export const CLEAN_SCRIPT = 'tools/confluence/clean-docs.sh'
export const HTML_TO_MD_SCRIPT = 'tools/confluence/html_to_md.js'
export const MIRROR_FOLDER = 'docs/confluence'

const staleDataFlow = [
  '---',
  'confluence-page-id: "301"',
  'title: "Data Flow"',
  'version: 11',
  '---',
  '',
  '# Data Flow',
  '',
  'Old body',
  ''
].join('\n')

const syncedOnce = {
  [`${MIRROR_FOLDER}/architecture/data-flow.md`]: staleDataFlow,
  [`${MIRROR_FOLDER}/overview-and-goals.md`]: 'Left alone\n'
}

const signedIn = {
  JIRA_USER: 'sam',
  JIRA_TOKEN: 'token',
  JIRA_BASE_URL: CONFLUENCE_ORIGIN
}

/**
 * Each run of the Bash sync and clean scripts the goldens record, and the
 * tim command line that replaces it.
 */
export const syncCases = [
  {
    name: 'full sync',
    script: SYNC_SCRIPT,
    args: ['--root-id', ROOT_ID],
    env: signedIn
  },
  {
    name: 'dry run',
    script: SYNC_SCRIPT,
    args: ['--dry-run', '--root-id', ROOT_ID],
    env: signedIn
  },
  {
    name: 'one page refreshed in place',
    script: SYNC_SCRIPT,
    args: ['--page-id', '301'],
    env: signedIn,
    files: syncedOnce
  },
  {
    name: 'one page dry run',
    script: SYNC_SCRIPT,
    args: ['--dry-run', '--page-id', '301'],
    env: signedIn,
    files: syncedOnce
  },
  {
    name: 'one page never synced',
    script: SYNC_SCRIPT,
    args: ['--page-id', '999'],
    env: signedIn,
    files: syncedOnce
  },
  {
    name: 'unknown root',
    script: SYNC_SCRIPT,
    args: ['--root-id', '999'],
    env: signedIn
  },
  {
    name: 'no base URL',
    script: SYNC_SCRIPT,
    args: ['--root-id', ROOT_ID],
    env: { ...signedIn, JIRA_BASE_URL: undefined }
  },
  {
    name: 'clean removes an orphan then syncs',
    script: CLEAN_SCRIPT,
    args: ['--root-id', ROOT_ID],
    env: signedIn,
    files: { [`${MIRROR_FOLDER}/orphan.md`]: 'Deleted in Confluence\n' }
  },
  {
    name: 'clean with nothing to remove',
    script: CLEAN_SCRIPT,
    args: ['--dry-run', '--root-id', ROOT_ID],
    env: signedIn
  }
]
