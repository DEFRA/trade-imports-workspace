import { execa } from 'execa'
import { chmodSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const FIXED_GIT_ENV = {
  GIT_AUTHOR_NAME: 'Fixture Author',
  GIT_AUTHOR_EMAIL: 'fixture@example.com',
  GIT_AUTHOR_DATE: '2026-11-01T09:00:00Z',
  GIT_COMMITTER_NAME: 'Fixture Author',
  GIT_COMMITTER_EMAIL: 'fixture@example.com',
  GIT_COMMITTER_DATE: '2026-11-01T09:00:00Z',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1'
}

const git = async (dir, args) => {
  const result = await execa('git', ['-C', dir, ...args], {
    env: FIXED_GIT_ENV,
    extendEnv: true
  })
  return result.stdout.trim()
}

const writeFiles = (dir, files) => {
  for (const [path, content] of Object.entries(files)) {
    const dest = join(dir, path)
    if (content === null) {
      rmSync(dest)
      continue
    }
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, content)
  }
}

const commit = async (dir, files, message, extraArgs = []) => {
  writeFiles(dir, files)
  await git(dir, ['add', '-A'])
  await git(dir, ['commit', '--quiet', ...extraArgs, '-m', message])
  return git(dir, ['rev-parse', 'HEAD'])
}

const initRepo = async (dir) => {
  mkdirSync(dir, { recursive: true })
  await git(dir, ['init', '--quiet', '-b', 'main'])
}

const MERGE_MESSAGE = [
  "Merge branch 'side'",
  '',
  '# Conflicts:',
  '#\tsrc/a.js',
  '#\tdocs/same.md',
  '#',
  'Resolved by hand',
  ''
].join('\n')

const buildStubHistory = async (dir) => {
  await initRepo(dir)
  const base = await commit(
    dir,
    {
      'README.md': 'readme\n',
      'src/a.js': 'a0\n',
      'src/b.js': 'b0\n',
      'src/c.js': 'c0\n',
      'src/gone.js': 'gone\n',
      'docs/same.md': 'same\n'
    },
    'Base'
  )
  const mainChange = await commit(dir, { 'src/c.js': 'c1\n' }, 'Change c')
  await git(dir, ['checkout', '--quiet', '-b', 'side', base])
  await commit(dir, { 'src/a.js': 'a-side\n', 'src/b.js': 'b-side\n' }, 'Side')
  await git(dir, ['checkout', '--quiet', 'main'])
  await git(dir, ['merge', '--quiet', '--no-ff', '--no-commit', 'side'])
  writeFiles(dir, { 'src/a.js': 'a-resolved\n' })
  await git(dir, ['add', '-A'])
  const messagePath = join(dirname(dir), 'merge-message.txt')
  writeFileSync(messagePath, MERGE_MESSAGE)
  await git(dir, ['commit', '--quiet', '--cleanup=verbatim', '-F', messagePath])
  const merge = await git(dir, ['rev-parse', 'HEAD'])
  const head = await commit(
    dir,
    { 'README.md': 'readme two\n', 'src/gone.js': null },
    'After merge'
  )
  return { base, mainChange, merge, head }
}

const buildSchemasHistory = async (dir) => {
  await initRepo(dir)
  const base = await commit(dir, { 'schema.json': '{}\n' }, 'Schema')
  const head = await commit(dir, { 'schema.json': '{"a":1}\n' }, 'Grow')
  return { base, head }
}

const bareRemoteOf = async (workDir, bareDir, refs) => {
  await execa('git', ['clone', '--quiet', '--bare', workDir, bareDir], {
    env: FIXED_GIT_ENV,
    extendEnv: true
  })
  for (const [ref, sha] of Object.entries(refs)) {
    await git(bareDir, ['update-ref', ref, sha])
  }
}

const reviewCloneOf = async (bareDir, cloneDir, sha) => {
  mkdirSync(dirname(cloneDir), { recursive: true })
  await execa('git', ['clone', '--quiet', bareDir, cloneDir], {
    env: FIXED_GIT_ENV,
    extendEnv: true
  })
  await git(cloneDir, ['checkout', '--quiet', '--detach', sha])
}

/**
 * Two repos with fixed authors and dates, so every SHA is the same on
 * every run: `trade-imports-stub`, whose history holds a merge commit that
 * lists `# Conflicts:`, and `trade-imports-schemas`. Each gets a bare
 * remote under `<home>/remotes` that serves `refs/pull/<n>/head`.
 *
 * @param {string} home
 * @returns {Promise<{stub: object, schemas: object, remotes: Record<string, string>}>}
 */
export const buildRefreshRemotes = async (home) => {
  const work = join(home, 'work')
  const stub = await buildStubHistory(join(work, 'stub', 'repo'))
  const schemas = await buildSchemasHistory(join(work, 'schemas', 'repo'))
  const remotes = {
    'trade-imports-stub': join(home, 'remotes', 'trade-imports-stub.git'),
    'trade-imports-schemas': join(home, 'remotes', 'trade-imports-schemas.git')
  }
  await bareRemoteOf(
    join(work, 'stub', 'repo'),
    remotes['trade-imports-stub'],
    {
      'refs/heads/main': stub.mainChange,
      'refs/pull/7/head': stub.head,
      'refs/pull/9/head': stub.head
    }
  )
  await bareRemoteOf(
    join(work, 'schemas', 'repo'),
    remotes['trade-imports-schemas'],
    {
      'refs/heads/main': schemas.head,
      'refs/pull/5/head': schemas.base
    }
  )
  rmSync(work, { recursive: true, force: true })
  return { stub, schemas, remotes }
}

/**
 * Clones a fixture remote into a review's `repos/<repo>` and detaches it
 * at `sha`.
 *
 * @param {object} args
 * @param {string} args.remote - From {@link buildRefreshRemotes}
 * @param {string} args.reviewFolder
 * @param {string} args.repo
 * @param {string} args.sha
 */
export const cloneForReview = ({ remote, reviewFolder, repo, sha }) =>
  reviewCloneOf(remote, join(reviewFolder, 'repos', repo), sha)

const GH_STAND_IN = `#!/bin/bash
if [[ "$1 $2" == "pr view" ]]; then
    f="$HOME/gh/pr-files/\${5#DEFRA/}-$3.txt"
elif [[ "$1 $2" == "pr diff" ]]; then
    f="$HOME/gh/pr-diff/\${5#DEFRA/}-$3.diff"
fi
[[ -n "$f" && -f "$f" ]] || { echo "gh stand-in: no answer for $*" >&2; exit 1; }
cat "$f"
`

/**
 * Writes a `gh` stand-in under `<home>/bin` that answers `gh pr view
 * <n> --repo DEFRA/<repo> --json files` from `<home>/gh/pr-files/<repo>-<n>.txt`
 * and `gh pr diff <n> --repo DEFRA/<repo>` from `<home>/gh/pr-diff/<repo>-<n>.diff`.
 *
 * @param {string} home
 * @returns {string} The folder to put first on PATH
 */
export const writeGhStandIn = (home) => {
  const bin = join(home, 'bin')
  mkdirSync(bin, { recursive: true })
  writeFileSync(join(bin, 'gh'), GH_STAND_IN)
  chmodSync(join(bin, 'gh'), 0o755)
  return bin
}
