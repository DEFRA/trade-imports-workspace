import { execa } from 'execa'
import {
  appendFileSync,
  chmodSync,
  mkdirSync,
  readFileSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { stageBashWorkspace } from '../../../test-support/bash-golden-harness.js'
import { markWorkspaceRoot } from '../../../test-support/workspace-marker.js'

export const BASH_SCRIPT_FOR = {
  specs: 'tools/service-tag/list-specs.sh',
  start: 'tools/service-tag/start-service-tag.sh'
}

const TESTS = 'repos/trade-imports-ins-tests'
const SCOPE_PATH = 'config/e2e-tests-pr-scope.json'
const PLAYWRIGHT_BIN = `${TESTS}/node_modules/.bin/playwright`
const TSX_BIN = `${TESTS}/node_modules/.bin/tsx`

export const listReport = readFileSync(
  new URL('./playwright-list-report.json', import.meta.url),
  'utf8'
)

export const scope = {
  default: { suites: ['all'] },
  'trade-imports-address-book': {
    suites: ['tests/ins/'],
    tags: ['@address-book']
  },
  'trade-imports-ins-frontend': {
    suites: ['tests/ins/'],
    tags: ['@ins-frontend']
  },
  'trade-imports-animals-backend': {
    suites: ['tests/animals/', 'tests/animals-admin/'],
    tags: ['@animals-backend']
  },
  'trade-imports-odd': { suites: ['tests/ins/e2e/'], tags: ['@wrong-name'] },
  'trade-imports-no-lists': {},
  'trade-imports-ins-frontend-base': { suites: ['tests/ins/'] }
}

export const tagMap = {
  '@address-book': ['ins'],
  '@ins-frontend': ['plants'],
  '@animals-backend': ['animals-admin', 'animals'],
  '@orphan': ['ins']
}

const composeFiles = {
  'docker/stack/a.compose.yml': [
    'services:',
    '  trade-imports-ins-frontend:',
    '    environment:',
    '      - TRADE_IMPORTS_ADDRESS_BOOK_URL=http://host.docker.internal:8089',
    '      - TRADE_IMPORTS_INS_FRONTEND_BASE_URL=http://localhost:3002',
    '      - TRADE_IMPORTS_ADDRESS_BOOK_URL=http://localhost:8089',
    '  trade-imports-animals-frontend:',
    '    environment:',
    '      - TRADE_IMPORTS_ANIMALS_BACKEND_URL=http://host.docker.internal:8085',
    '      - OTHER_URL=http://localhost:1',
    ''
  ].join('\n'),
  'docker/stack/b.compose.yml': [
    'x-env: &env',
    '  - TRADE_IMPORTS_ODD_URL=http://carried-over',
    'services:',
    '  zap:',
    '    environment:',
    '      ZAP_TRADE_IMPORTS_ADDRESS_BOOK_URL: http://localhost:8089',
    '      TRADE_IMPORTS_ADDRESS_BOOK_URL: http://localhost:8089',
    '  trade-imports-address-book:',
    '    environment:',
    '      - TRADE_IMPORTS_ANIMALS_BACKEND_URL=http://host.docker.internal:8085',
    ''
  ].join('\n')
}

const fakePlaywright = [
  '#!/usr/bin/env node',
  "const { readFileSync, realpathSync } = require('node:fs')",
  "const { resolve } = require('node:path')",
  "const tests = resolve(__dirname, '..', '..')",
  "const expected = ['test', '--list', '--reporter=json', '--config=playwright.docker-compose.config.ts']",
  'const argsMatch = JSON.stringify(process.argv.slice(2)) === JSON.stringify(expected)',
  'const inClone = realpathSync(process.cwd()) === realpathSync(tests)',
  'if (!argsMatch || !inClone) {',
  "  process.stderr.write('playwright run with ' + process.argv.slice(2).join(' ') + ' in ' + process.cwd() + '\\n')",
  '  process.exit(1)',
  '}',
  "process.stdout.write(readFileSync(resolve(tests, 'list-report.json'), 'utf8'))",
  ''
].join('\n')

const fakeTsx = [
  '#!/usr/bin/env node',
  "const { readFileSync } = require('node:fs')",
  'const code = process.argv[3] ?? ""',
  "const shape = /^import \\{ SERVICE_TAG_DOMAINS \\} from '(.+)'; console\\.log\\(JSON\\.stringify\\(SERVICE_TAG_DOMAINS\\)\\);$/",
  'const match = process.argv[2] === "-e" ? shape.exec(code) : null',
  'if (match === null) {',
  "  process.stderr.write('tsx run with ' + process.argv.slice(2).join(' ') + '\\n')",
  '  process.exit(1)',
  '}',
  "const source = readFileSync(match[1] + '.ts', 'utf8')",
  "const map = JSON.parse(source.slice(source.indexOf('{'), source.lastIndexOf('}') + 1))",
  'console.log(JSON.stringify(map))',
  ''
].join('\n')

const cloneFiles = () => ({
  [`${TESTS}/package.json`]:
    '{ "name": "trade-imports-ins-tests", "private": true }\n',
  [`${TESTS}/list-report.json`]: listReport,
  [`${TESTS}/config/service-tags.ts`]: `export const SERVICE_TAG_DOMAINS: Record<string, string[]> = ${JSON.stringify(tagMap, null, 2)};\n`,
  [PLAYWRIGHT_BIN]: fakePlaywright,
  [TSX_BIN]: fakeTsx
})

const IDENTITY = [
  '-c',
  'user.name=tim-test',
  '-c',
  'user.email=tim-test@example.invalid'
]

const git = (cwd, ...args) => execa('git', [...IDENTITY, ...args], { cwd })

const commitAll = async (path, branch, excluded) => {
  await git(path, 'init', '--quiet', '-b', branch)
  appendFileSync(join(path, '.git', 'info', 'exclude'), excluded.join('\n'))
  await git(path, 'add', '--all')
  await git(path, 'commit', '--quiet', '-m', 'fixture')
}

const leaveWork = async (root, { withClone }) => {
  writeFileSync(join(root, 'docs', 'notes.md'), 'draft\n')
  appendFileSync(join(root, SCOPE_PATH), '\n')
  if (!withClone) return
  writeFileSync(join(root, TESTS, 'draft.spec.ts'), '// draft\n')
}

/**
 * A workspace staged where the Bash scripts look, with a scope file,
 * compose files and an ins-tests clone whose Playwright and tsx are
 * stand-ins that answer from fixtures. Both are git repos with
 * uncommitted work.
 *
 * @param {object} [opts]
 * @param {boolean} [opts.withClone=true]
 * @param {boolean} [opts.withScope=true]
 * @param {string[]} [opts.scripts=[]] - Bash scripts to copy in
 * @returns {Promise<{home: string, root: string, remove: () => void}>}
 */
export const stageServiceTagWorkspace = async ({
  withClone = true,
  withScope = true,
  scripts = []
} = {}) => {
  const staged = stageBashWorkspace({
    scripts,
    files: {
      'docs/README.md': '# Fixture workspace\n',
      ...composeFiles,
      ...(withScope
        ? { [SCOPE_PATH]: `${JSON.stringify(scope, null, 2)}\n` }
        : {}),
      ...(withClone ? cloneFiles() : {})
    }
  })
  markWorkspaceRoot(staged.root)
  mkdirSync(join(staged.root, 'repos'), { recursive: true })
  if (withClone) {
    chmodSync(join(staged.root, PLAYWRIGHT_BIN), 0o755)
    chmodSync(join(staged.root, TSX_BIN), 0o755)
    await commitAll(join(staged.root, TESTS), 'main', [])
  }
  await commitAll(staged.root, 'feat/fixture', ['tools/', 'repos/'])
  if (withScope) await leaveWork(staged.root, { withClone })
  return staged
}

export const specsCases = [
  { name: 'every spec', args: [] },
  { name: 'one domain', args: ['--domain', 'animals'] },
  {
    name: 'a domain whose name starts another',
    args: ['--domain', 'animals-admin']
  },
  {
    name: 'a domain and a type',
    args: ['--domain', 'animals', '--type', 'e2e']
  },
  { name: 'one type', args: ['--type', 'security'] },
  {
    name: 'a tag written with and without @',
    args: ['--tag', '@address-book']
  },
  { name: 'a tag without @', args: ['--tag', 'address-book'] },
  { name: 'a tag no spec carries', args: ['--tag', '@nonexistent'] },
  { name: 'an empty domain', args: ['--domain', ''] }
]

export const startCases = [
  { name: 'every entry', args: [] },
  { name: 'a short name', args: ['--service', 'address-book'] },
  { name: 'a full name', args: ['--service', 'trade-imports-animals-backend'] },
  { name: 'an entry with every finding', args: ['--service', 'odd'] },
  { name: 'a service with no entry', args: ['--service', 'plants-frontend'] }
]

export const failureCases = [
  {
    name: 'specs with no clone',
    command: 'specs',
    withClone: false,
    withScope: true
  },
  {
    name: 'start with no clone',
    command: 'start',
    withClone: false,
    withScope: true
  },
  {
    name: 'start with no scope file',
    command: 'start',
    withClone: true,
    withScope: false
  }
]
