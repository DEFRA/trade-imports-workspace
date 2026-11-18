import { execFileSync } from 'node:child_process'
import { lstatSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const WORKSPACE_ROOT = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..'
)

const FIXED_PATH = 'git/defra/trade-imports-workspace'

const SCANNED = ['.claude', 'docs', 'CLAUDE.md']

const SKIPPED_FOLDERS = ['docs/analysis', 'docs/adr', 'docs/confluence']

// Lines that keep the path on purpose. A line passes when its file matches
// and it contains the given text.
const ALLOWED = [
  {
    file: '.claude/settings.json',
    text: '~/git/defra/trade-imports-workspace',
    why: 'permission rules, which only a person edits'
  },
  {
    file: '.claude/hooks/guard-bash.sh',
    text: 'npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> test',
    why: 'the guard hook, which only a person edits'
  },
  {
    file: 'CLAUDE.md',
    text: 'The default place to clone the workspace is `~/git/defra/trade-imports-workspace`',
    why: 'clone instructions'
  },
  {
    file: 'docs/agent-onboarding.md',
    text: 'The default place to clone the workspace is `~/git/defra/trade-imports-workspace`',
    why: 'clone instructions'
  },
  {
    file: 'docs/agent-onboarding.md',
    text: 'git clone git@github.com:DEFRA/trade-imports-workspace.git ~/git/defra/trade-imports-workspace',
    why: 'clone instructions'
  },
  {
    file: 'docs/reference/workflows.md',
    text: '`~/git/defra/trade-imports-workspace`. Any other folder works too',
    why: 'clone instructions'
  },
  {
    file: 'docs/onboarding/00-getting-started.md',
    text: '`cd ~/git/defra/trade-imports-workspace`',
    why: 'clone instructions'
  },
  {
    file: 'docs/onboarding/01-workspace.md',
    text: '`~/git/defra/trade-imports-workspace` — any other folder works',
    why: 'clone instructions'
  },
  {
    file: 'docs/onboarding/generator/build-deck.js',
    text: 'Clone to ~/git/defra/trade-imports-workspace',
    why: 'clone instructions in the onboarding deck'
  },
  {
    file: 'docs/onboarding/generator/build-getting-started.js',
    text: 'cd ~/git/defra/trade-imports-workspace',
    why: 'clone instructions in the onboarding deck'
  },
  {
    file: '.claude/skills/prototype/README.md',
    text: 'the workspace cloned (by default to `~/git/defra/trade-imports-workspace`)',
    why: 'clone instructions'
  },
  {
    file: '.claude/skills/requirements-pipeline/references/DISTIL.md',
    text: "workspace: '~/git/defra/trade-imports-workspace'",
    why: 'an example of the workflow argument, which takes the clone as a tilde path'
  },
  {
    file: '.claude/skills/requirements-pipeline/workflow/README.md',
    text: '~/git/defra/trade-imports-workspace',
    why: 'an example of the workflow argument, which takes the clone as a tilde path'
  },
  {
    file: '.claude/skills/requirements-pipeline/workflow/distil.js',
    text: '"~/git/defra/trade-imports-workspace"',
    why: 'an example of the workflow argument, which takes the clone as a tilde path'
  },
  {
    file: '.claude/skills/requirements-pipeline/workflow/increment-build-loop.js',
    text: "'~/git/defra/trade-imports-workspace',",
    why: 'the clones the build loop tries when no workspace is given'
  }
]

const isBinary = (buffer) => buffer.includes(0)

const isRegularFile = (path) => {
  try {
    return lstatSync(path).isFile()
  } catch {
    return false
  }
}

const isSkipped = (file) =>
  SKIPPED_FOLDERS.some((folder) => file.startsWith(`${folder}/`))

const trackedScannedFiles = (root) =>
  execFileSync('git', ['-C', root, 'ls-files', '-z', '--', ...SCANNED], {
    encoding: 'utf8'
  })
    .split('\0')
    .filter((file) => file !== '')
    .filter((file) => !isSkipped(file))
    .filter((file) => isRegularFile(join(root, file)))

const isAllowed = (file, line) =>
  ALLOWED.some((entry) => entry.file === file && line.includes(entry.text))

const fixedPathLinesIn = (file, text) =>
  text
    .split('\n')
    .map((line, index) => ({ line, number: index + 1 }))
    .filter(({ line }) => line.includes(FIXED_PATH))
    .filter(({ line }) => !isAllowed(file, line))
    .map(({ line, number }) => `${file}:${number}: ${line.trim()}`)

const fixedPathLinesInWorkspace = (root) =>
  trackedScannedFiles(root).flatMap((file) => {
    const buffer = readFileSync(join(root, file))
    return isBinary(buffer)
      ? []
      : fixedPathLinesIn(file, buffer.toString('utf8'))
  })

describe('workspace text: no fixed workspace path', () => {
  it('finds no fixed path in .claude, docs or CLAUDE.md outside the allowlist', () => {
    const found = fixedPathLinesInWorkspace(WORKSPACE_ROOT)

    expect(found).toEqual([])
  })

  it('reports a fixed path added to a skill', () => {
    const text =
      'Run `npm --prefix ~/git/defra/trade-imports-workspace/repos/x test`.'

    const found = fixedPathLinesIn('.claude/skills/x/SKILL.md', text)

    expect(found).toEqual([
      '.claude/skills/x/SKILL.md:1: Run `npm --prefix ~/git/defra/trade-imports-workspace/repos/x test`.'
    ])
  })

  it('reports an allowlisted line copied into another file', () => {
    const text =
      'git clone git@github.com:DEFRA/trade-imports-workspace.git ~/git/defra/trade-imports-workspace'

    const found = fixedPathLinesIn('docs/reference/workflows.md', text)

    expect(found).toHaveLength(1)
  })

  it('passes the clone instructions it allows', () => {
    const text =
      'git clone git@github.com:DEFRA/trade-imports-workspace.git ~/git/defra/trade-imports-workspace'

    const found = fixedPathLinesIn('docs/agent-onboarding.md', text)

    expect(found).toEqual([])
  })
})
