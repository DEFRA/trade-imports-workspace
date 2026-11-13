import { execa } from 'execa'
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tmpdir } from 'node:os'

const realWorkspaceRoot = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
)

const ISO_TIMESTAMP =
  /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?/g

/**
 * Whether a workspace script still exists, so a recording test can skip
 * once the script has been retired and only its golden remains.
 *
 * @param {string} relScript - Path from the workspace root
 * @returns {boolean}
 */
export const workspaceScriptExists = (relScript) =>
  existsSync(join(realWorkspaceRoot, relScript))

/**
 * A temporary HOME holding a workspace at the path the Bash scripts write
 * into themselves, with the named scripts copied from the real workspace
 * and the given files written under it.
 *
 * @param {object} opts
 * @param {string[]} opts.scripts - Paths from the workspace root to copy in
 * @param {Record<string, string>} [opts.files] - Workspace-relative path to content
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stageBashWorkspace = ({ scripts, files = {} }) => {
  const home = mkdtempSync(join(tmpdir(), 'tim-bash-golden-'))
  const root = join(home, 'git', 'defra', 'trade-imports-workspace')
  for (const relScript of scripts) {
    const dest = join(root, relScript)
    mkdirSync(dirname(dest), { recursive: true })
    cpSync(join(realWorkspaceRoot, relScript), dest)
  }
  for (const [relPath, content] of Object.entries(files)) {
    const dest = join(root, relPath)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, content)
  }
  return {
    home,
    root,
    remove: () => rmSync(home, { recursive: true, force: true })
  }
}

/**
 * Text as a recording holds it: `home` becomes `<HOME>` and ISO timestamps
 * become `<TIMESTAMP>`.
 *
 * @param {string | undefined} text
 * @param {string} home
 * @returns {string}
 */
export const normaliseRecordedText = (text, home) =>
  (text ?? '').split(home).join('<HOME>').replace(ISO_TIMESTAMP, '<TIMESTAMP>')

const filesUnder = (dir) =>
  readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
    .sort()

/**
 * Every file under a folder, by its path inside the folder, with its text
 * normalised as {@link normaliseRecordedText} does. Empty when the folder
 * is missing.
 *
 * @param {string} folder
 * @param {string} home
 * @returns {Record<string, string>}
 */
export const recordFolderFiles = (folder, home) => {
  const files = existsSync(folder) ? filesUnder(folder) : []
  return Object.fromEntries(
    files.map((path) => [
      relative(folder, path),
      normaliseRecordedText(readFileSync(path, 'utf8'), home)
    ])
  )
}

/**
 * Runs a staged script with HOME pointed at the staged workspace and
 * records what it did: exit code, stdout, stderr and, when `watch` names a
 * workspace-relative folder, every file under it. The temporary HOME
 * becomes `<HOME>` and ISO timestamps become `<TIMESTAMP>`, so a recording
 * is the same on every run and every machine.
 *
 * @param {{home: string, root: string}} staged - From {@link stageBashWorkspace}
 * @param {string} relScript - Path from the workspace root
 * @param {string[]} args
 * @param {object} [opts]
 * @param {string} [opts.watch] - Workspace-relative folder whose files to record
 * @param {Record<string, string | undefined>} [opts.env] - Variables to set; `undefined` unsets one
 * @param {boolean} [opts.exactOutput=false] - Keep the final newline of stdout and stderr, for output that must match byte for byte
 * @returns {Promise<{exitCode: number, stdout: string, stderr: string, files?: Record<string, string>}>}
 */
export const recordBashRun = async (
  staged,
  relScript,
  args,
  { watch, env = {}, exactOutput = false } = {}
) => {
  const result = await execa(
    '/bin/bash',
    [join(staged.root, relScript), ...args],
    {
      env: { ...env, HOME: staged.home },
      extendEnv: true,
      reject: false,
      stripFinalNewline: !exactOutput
    }
  )
  const recording = {
    exitCode: result.exitCode,
    stdout: normaliseRecordedText(result.stdout, staged.home),
    stderr: normaliseRecordedText(result.stderr, staged.home)
  }
  if (watch === undefined) return recording
  return {
    ...recording,
    files: recordFolderFiles(join(staged.root, watch), staged.home)
  }
}

/**
 * The text a set of recordings is frozen as in a `__golden__` snapshot.
 *
 * @param {object[]} recordings
 * @returns {string}
 */
export const goldenText = (recordings) =>
  `${JSON.stringify(recordings, null, 2)}\n`
