import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import {
  basename,
  dirname,
  isAbsolute,
  join,
  relative,
  resolve,
  sep
} from 'node:path'
import { load as yamlLoad } from 'js-yaml'
import { run } from './exec.js'

export const DEV_OVERLAY_PATH = join('docker', 'stack', 'dev.compose.yml')

const UNKNOWN = { build: null, source: null }
const DELETED = 'deleted'

const contextOf = (build) =>
  typeof build === 'string' ? build : (build?.context ?? null)

const volumeSource = (volume) =>
  typeof volume === 'string' ? volume.split(':')[0] : volume?.source

const toPosix = (path) => path.split(sep).join('/')

const isInside = (path) =>
  path !== '' && !path.startsWith('..') && !isAbsolute(path)

const mountedPaths = (repoPath, volumes, overlayDir) =>
  (volumes ?? [])
    .map(volumeSource)
    .filter(Boolean)
    .map((source) => toPosix(relative(repoPath, resolve(overlayDir, source))))
    .filter(isInside)

/**
 * The overlay key naming the services whose answers a service keeps in memory,
 * so it must restart whenever one of them is rebuilt or restarted.
 */
export const REFRESH_WITH_KEY = 'x-refresh-with'

/**
 * The services the dev overlay builds from a local folder, read from
 * docker/stack/dev.compose.yml: each one's repo folder, the paths inside it
 * that are bind-mounted into the running container, and the services named
 * under `x-refresh-with`. A change under a mounted path reaches the container
 * by hot reload; anything else is baked into the image when it is built.
 *
 * @param {string} workspaceRoot
 * @returns {{service: string, repo: string, path: string, mounted: string[], refreshWith: string[]}[]} Empty when the workspace has no dev overlay
 */
export const devServices = (workspaceRoot) => {
  const overlayPath = join(workspaceRoot, DEV_OVERLAY_PATH)
  if (!existsSync(overlayPath)) return []
  const overlayDir = dirname(overlayPath)
  const { services = {} } = yamlLoad(readFileSync(overlayPath, 'utf8')) ?? {}
  return Object.entries(services)
    .filter(([, definition]) => contextOf(definition?.build))
    .map(([service, definition]) => {
      const path = resolve(overlayDir, contextOf(definition.build))
      return {
        service,
        repo: basename(path),
        path,
        mounted: mountedPaths(path, definition.volumes, overlayDir),
        refreshWith: definition[REFRESH_WITH_KEY] ?? []
      }
    })
}

const splitOnNul = (text) => text.split('\0').filter(Boolean)

// The id git gives a blob, so a file on disk that matches the index hashes
// the same as its index entry, whatever git's stat cache says about it.
const gitBlobId = (content) =>
  createHash('sha1')
    .update(`blob ${content.length}\0`)
    .update(content)
    .digest('hex')

const diskBlobId = (file) => {
  try {
    return gitBlobId(readFileSync(file))
  } catch (error) {
    return error.code === 'ENOENT' ? DELETED : null
  }
}

const limitedTo = (pathspecs) => (pathspecs ? ['--', ...pathspecs] : [])

const indexBlobs = async (path, pathspecs) => {
  const result = await run('git', [
    '-C',
    path,
    'ls-files',
    '-s',
    '-z',
    ...limitedTo(pathspecs)
  ])
  if (result.exitCode !== 0) return null
  return splitOnNul(result.stdout).map((line) => {
    const [meta, file] = line.split('\t')
    return [file, meta.split(' ')[1]]
  })
}

const changedOnDisk = async (path, pathspecs) => {
  const result = await run('git', [
    '-C',
    path,
    'ls-files',
    '--modified',
    '--others',
    '--exclude-standard',
    '-z',
    ...limitedTo(pathspecs)
  ])
  return result.exitCode === 0 ? splitOnNul(result.stdout) : null
}

const isUnder = (file, mounted) =>
  mounted.some((dir) => file === dir || file.startsWith(`${dir}/`))

const byPath = ([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)

const digest = (entries) =>
  createHash('sha256')
    .update(
      [...entries]
        .sort(byPath)
        .map(([file, blob]) => `${file}\t${blob}`)
        .join('\n')
    )
    .digest('hex')

const workingTreeBlobs = (path, index, changed) => {
  const fromDisk = changed
    .map((file) => [file, diskBlobId(join(path, file))])
    .filter(([, blob]) => blob)
  return [...new Map([...index, ...fromDisk])]
}

/**
 * Two fingerprints of one dev service's working tree, from git's index and
 * whatever differs from it on disk (edits, deletions, untracked files that
 * are not ignored). `build` covers every file outside the bind-mounted
 * paths: a change there needs the image rebuilt. `source` covers the
 * bind-mounted paths: a change there needs only a restart.
 *
 * @param {{path: string, mounted: string[]}} service
 * @returns {Promise<{build: string|null, source: string|null}>} Both null when the folder is missing or is not a git checkout
 */
export const repoFingerprints = async ({ path, mounted }) => {
  if (!existsSync(path)) return UNKNOWN
  const [index, changed] = await Promise.all([
    indexBlobs(path),
    changedOnDisk(path)
  ])
  if (!index || !changed) return UNKNOWN
  const blobs = workingTreeBlobs(path, index, changed)
  return {
    build: digest(blobs.filter(([file]) => !isUnder(file, mounted))),
    source: digest(blobs.filter(([file]) => isUnder(file, mounted)))
  }
}

/**
 * The folders of the workspace repo that define the stack itself: its
 * compose files, env and init scripts, and the scripts that start it.
 */
export const STACK_FILE_FOLDERS = ['docker/stack', 'scripts/stack']

// Written on every stack start from the owning repos, never edited by hand.
const GENERATED_STACK_FOLDERS = ['docker/stack/.staged']

/**
 * One fingerprint of the workspace repo's own stack files (docker/stack and
 * scripts/stack, less the generated docker/stack/.staged): the sorted paths of
 * the files on disk with their contents, from git's index and whatever
 * differs from it on disk, so an edit, a new file, a deleted file and a rename
 * all change it. A stack started before such a change is not the stack those
 * files now describe.
 *
 * @param {string} workspaceRoot
 * @returns {Promise<string|null>} null when the workspace is not a git checkout
 */
export const stackFilesFingerprint = async (workspaceRoot) => {
  const [index, changed] = await Promise.all([
    indexBlobs(workspaceRoot, STACK_FILE_FOLDERS),
    changedOnDisk(workspaceRoot, STACK_FILE_FOLDERS)
  ])
  if (!index || !changed) return null
  return digest(
    workingTreeBlobs(workspaceRoot, index, changed).filter(
      ([file]) =>
        !isUnder(file, GENERATED_STACK_FOLDERS) &&
        existsSync(join(workspaceRoot, file))
    )
  )
}

/**
 * The build and source fingerprints of every service the dev overlay
 * builds, keyed by compose service name.
 *
 * @param {string} workspaceRoot
 * @returns {Promise<Record<string, {build: string|null, source: string|null}>>}
 */
export const serviceFingerprints = async (workspaceRoot) => {
  const services = devServices(workspaceRoot)
  const fingerprints = await Promise.all(services.map(repoFingerprints))
  return Object.fromEntries(
    services.map(({ service }, index) => [service, fingerprints[index]])
  )
}

/**
 * What a running dev service needs so it serves the working tree now:
 * `rebuild` when anything baked into its image changed, or when either
 * fingerprint is unknown (a lease written before fingerprints were kept, or
 * a folder git cannot read); `restart` when only its bind-mounted source
 * changed; `leave` when nothing did.
 *
 * @param {{build?: string|null, source?: string|null}|undefined} recorded - The fingerprints on the lease
 * @param {{build: string|null, source: string|null}} current
 * @returns {'rebuild'|'restart'|'leave'}
 */
export const refreshDecision = (recorded, current) => {
  if (!recorded?.build || !current?.build) return 'rebuild'
  if (recorded.build !== current.build) return 'rebuild'
  return recorded.source === current.source ? 'leave' : 'restart'
}

const followsAnyOf = (upstreams, refreshed) =>
  upstreams.some((upstream) => refreshed.includes(upstream))

/**
 * Which dev services to rebuild, restart or leave, comparing the
 * fingerprints a lease recorded with the working tree's now.
 *
 * A service whose own fingerprints are unchanged is still restarted when a
 * service it names in `refreshWith` is rebuilt or restarted, so it drops the
 * answers it kept from that service. Only one step is followed.
 *
 * @param {Record<string, object>|undefined} recorded
 * @param {Record<string, object>} current
 * @param {Record<string, string[]>} [refreshWith] - Each service's `x-refresh-with` list
 * @returns {{rebuild: string[], restart: string[], leave: string[]}}
 */
export const planRefresh = (recorded, current, refreshWith = {}) => {
  const plan = { rebuild: [], restart: [], leave: [] }
  for (const [service, fingerprints] of Object.entries(current)) {
    plan[refreshDecision(recorded?.[service], fingerprints)].push(service)
  }
  const refreshed = [...plan.rebuild, ...plan.restart]
  const followers = plan.leave.filter((service) =>
    followsAnyOf(refreshWith[service] ?? [], refreshed)
  )
  return {
    rebuild: plan.rebuild,
    restart: [...plan.restart, ...followers],
    leave: plan.leave.filter((service) => !followers.includes(service))
  }
}
