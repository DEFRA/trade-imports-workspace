import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stageBashWorkspace } from '../../test-support/bash-golden-harness.js'

export const SCRIPT_FOR = {
  baseline: 'tools/npm/audit-baseline.sh',
  allow: 'tools/npm/audit-allowlist-add.sh',
  forget: 'tools/npm/audit-allowlist-forget.sh',
  exec: 'tools/npm/npm-in-repo.sh'
}

/** The files the audit scripts source or run beside themselves. */
export const HELPER_SCRIPTS = [
  'tools/npm/audit-lib.sh',
  'tools/npm/audit-fix-check.mjs'
]

export const RUN_ID = 'EUDPA-700'
export const REPO = 'trade-imports-animals-frontend'
export const RUN_FOLDER = `workareas/npm-upgrades/${RUN_ID}`
export const REPO_FOLDER = `repos/${REPO}`
export const OTHER_CHECKOUT = 'scratch/checkout'
export const TODAY = '2026-11-14'

const timSemver = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  '..',
  'node_modules',
  'semver'
)

/**
 * What the Bash scripts did on every case, as the golden test recorded it.
 *
 * @returns {Record<string, object[]>} Runs by tim command name
 */
export const readAuditGolden = () =>
  JSON.parse(
    readFileSync(
      new URL('./__golden__/npm-audit-scripts.json', import.meta.url),
      'utf8'
    )
  )

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`

export const GHSA = {
  braces: 'GHSA-grv7-fg5c-xmjg',
  basicFtp: 'GHSA-c475-qrg2-pj4r',
  minimatch: 'GHSA-3ppc-4f35-3m26',
  ws: 'GHSA-3h5v-q93c-6h6q'
}

const advisory = (ghsa, name, severity, range, title) => ({
  source: 1000,
  name,
  dependency: name,
  title,
  url: `https://github.com/advisories/${ghsa}`,
  severity,
  cwe: [],
  cvss: { score: 7.5 },
  range
})

/** An npm audit v2 report with fixable, unfixable and grouped advisories. */
export const REPORT = {
  auditReportVersion: 2,
  vulnerabilities: {
    braces: {
      name: 'braces',
      severity: 'high',
      isDirect: false,
      via: [
        advisory(
          GHSA.braces,
          'braces',
          'high',
          '<3.0.3',
          'Uncontrolled resource consumption in braces'
        )
      ],
      effects: ['micromatch'],
      range: '<3.0.3',
      nodes: ['node_modules/braces'],
      fixAvailable: true
    },
    micromatch: {
      name: 'micromatch',
      severity: 'high',
      isDirect: false,
      via: ['braces'],
      effects: [],
      range: '<=4.0.7',
      nodes: ['node_modules/micromatch'],
      fixAvailable: true
    },
    'basic-ftp': {
      name: 'basic-ftp',
      severity: 'critical',
      isDirect: false,
      via: [
        advisory(
          GHSA.basicFtp,
          'basic-ftp',
          'critical',
          '<=5.0.5',
          'basic-ftp FTP command injection.'
        )
      ],
      effects: [],
      range: '<=5.0.5',
      nodes: ['node_modules/basic-ftp'],
      fixAvailable: false
    },
    minimatch: {
      name: 'minimatch',
      severity: 'moderate',
      isDirect: true,
      via: [
        advisory(
          GHSA.minimatch,
          'minimatch',
          'moderate',
          '<9.0.5',
          'minimatch ReDoS'
        )
      ],
      effects: [],
      range: '<9.0.5',
      nodes: ['node_modules/minimatch'],
      fixAvailable: true
    },
    ws: {
      name: 'ws',
      severity: 'critical',
      isDirect: false,
      via: [
        advisory(
          GHSA.ws,
          'ws',
          'high',
          '>=8.0.0 <8.17.1',
          'ws denial of service'
        ),
        advisory(
          GHSA.ws,
          'ws',
          'critical',
          '>=7.0.0 <7.5.10',
          'ws denial of service'
        )
      ],
      effects: [],
      range: '>=7.0.0 <7.5.10 || >=8.0.0 <8.17.1',
      nodes: ['node_modules/ws', 'node_modules/legacy/node_modules/ws'],
      fixAvailable: true
    }
  },
  metadata: { vulnerabilities: { total: 5 } }
}

export const EMPTY_REPORT = {
  auditReportVersion: 2,
  vulnerabilities: {},
  metadata: { vulnerabilities: { total: 0 } }
}

const LOCKFILE = {
  name: REPO,
  lockfileVersion: 3,
  packages: {
    '': { name: REPO },
    'node_modules/braces': { version: '3.0.2' },
    'node_modules/micromatch/node_modules/braces': { version: '2.3.2' },
    'node_modules/micromatch': { version: '4.0.7' },
    'node_modules/basic-ftp': { version: '5.0.5' },
    'node_modules/minimatch': { version: '9.0.4' },
    'node_modules/ws': { version: '8.16.0' },
    'node_modules/legacy/node_modules/ws': { version: '7.5.9' },
    'node_modules/not-ws': { version: '1.0.0' }
  }
}

/** Every version the registry publishes, by package. */
export const REGISTRY = {
  braces: ['2.3.2', '3.0.2', '3.0.3', '4.0.0-beta.1', '4.0.0'],
  'basic-ftp': ['5.0.4', '5.0.5'],
  minimatch: ['9.0.4', '9.0.5'],
  ws: ['7.5.9', '7.5.10', '8.16.0', '8.17.1']
}

const entry = (ghsa, value) => ({ [ghsa]: value })
const active = (notes, expiry) => ({ active: true, notes, expiry })

/** An allowlist entry for every high and critical advisory, none blocked. */
const ALL_HIGH_ALLOWED = [
  entry(GHSA.braces, active('Braces in tooling. Owner: Sam', '2099-01-01')),
  entry(GHSA.ws, active('ws in tests. Owner: Sam', '2099-01-01')),
  entry(GHSA.basicFtp, active('No release yet. Owner: Sam', '2099-01-01'))
]

const BLOCKED_HIGH_ALLOWED = [
  entry(
    GHSA.braces,
    active(
      'Braces in tooling. Fix blocked upstream: micromatch pins braces ^2. Owner: Sam',
      '2099-01-01'
    )
  ),
  entry(
    GHSA.ws,
    active(
      'ws in tests. Fix blocked upstream: legacy pins ws ^7. Owner: Sam',
      '2099-01-01'
    )
  ),
  entry(GHSA.basicFtp, active('No release yet. Owner: Sam', '2099-01-01'))
]

/** One entry of every shape audit-ci honours or ignores. */
const MIXED_ALLOWLIST = [
  entry(GHSA.braces, active('Braces. Owner: Sam', '2099-01-01')),
  entry(
    GHSA.ws,
    active(
      'ws. Fix blocked upstream: legacy pins ws ^7. Owner: Sam',
      '2026-11-15'
    )
  ),
  entry(GHSA.basicFtp, active('Expires today. Owner: Sam', TODAY)),
  'GHSA-zzzz-zzzz-zzzz',
  entry('GHSA-yyyy-yyyy-yyyy', {
    active: false,
    notes: 'Switched off',
    expiry: '2099-01-01'
  }),
  entry('GHSA-xxxx-xxxx-xxxx', { active: true, expiry: 'next year' }),
  entry('GHSA-wwww-wwww-wwww', { active: true }),
  entry('GHSA-vvvv-vvvv-vvvv', { active: true, notes: 7, expiry: 20991231 })
]

const config = (levels, allowlist) => ({
  $schema: 'https://github.com/IBM/audit-ci/raw/main/docs/schema.json',
  ...levels,
  'report-type': 'summary',
  allowlist
})

const HIGH = { high: true }

const repoFiles = (folder, auditConfig) => ({
  [`${folder}/package.json`]: jsonText({ name: REPO, version: '1.0.0' }),
  [`${folder}/package-lock.json`]: jsonText(LOCKFILE),
  ...(auditConfig === undefined
    ? {}
    : {
        [`${folder}/audit-ci.jsonc`]:
          typeof auditConfig === 'string' ? auditConfig : jsonText(auditConfig)
      })
})

const priorAllowlistState = {
  ticket: RUN_ID,
  repo: REPO,
  entries: [
    {
      ghsa: GHSA.basicFtp,
      package: 'basic-ftp',
      kind: 'no_fix',
      blocked_by: null,
      fixed_version: null,
      reason: 'First reason',
      owner: 'Sam',
      notes: 'First reason. Owner: Sam',
      expiry: '2026-12-01',
      added_at: '2026-11-01T09:00:00Z',
      stage: 1,
      renewed_at: null,
      renewed_stage: null
    },
    {
      ghsa: GHSA.braces,
      package: 'braces',
      kind: 'fix_blocked_upstream',
      blocked_by: 'micromatch pins braces ^2',
      fixed_version: '3.0.3',
      reason: 'Tooling only',
      owner: 'Sam',
      notes:
        'Tooling only. Fix blocked upstream: micromatch pins braces ^2. Owner: Sam',
      expiry: '2026-12-01',
      added_at: '2026-11-02T09:00:00Z',
      stage: 2,
      renewed_at: null,
      renewed_stage: null
    }
  ]
}

const allowlistStatePath = `${RUN_FOLDER}/${REPO}/allowlist.${REPO}.json`

/**
 * The workspace files a case starts from: the repo checkout, with the
 * audit-ci config the case names, and any run state it says is already
 * there.
 *
 * @param {object} fixtureCase - One of {@link cases}
 * @returns {Record<string, string>} Workspace-relative path to content
 */
const workspaceFilesOf = (fixtureCase) => {
  const auditConfig =
    'auditConfig' in fixtureCase ? fixtureCase.auditConfig : config(HIGH, [])
  return {
    'repos.json':
      '{ "reposDir": "repos", "githubOrg": "DEFRA", "repos": [] }\n',
    'docs/best-practices/README.md': '# Best practices\n',
    ...(fixtureCase.withoutRepo ? {} : repoFiles(REPO_FOLDER, auditConfig)),
    ...(fixtureCase.withOtherCheckout
      ? repoFiles(OTHER_CHECKOUT, config(HIGH, ALL_HIGH_ALLOWED))
      : {}),
    ...(fixtureCase.withPriorState === 'raw'
      ? { [allowlistStatePath]: JSON.stringify(priorAllowlistState) }
      : {}),
    ...(fixtureCase.withPriorState === true
      ? { [allowlistStatePath]: jsonText(priorAllowlistState) }
      : {})
  }
}

const linkSemver = (root, folder) => {
  const modules = join(root, folder, 'node_modules')
  mkdirSync(modules, { recursive: true })
  symlinkSync(timSemver, join(modules, 'semver'))
}

/**
 * A temporary workspace for one case: the repo under repos/ (or a symlink
 * to it, for `symlinkRepo`), a second checkout when the case audits one,
 * and the named Bash scripts.
 *
 * @param {object} fixtureCase - One of {@link cases}
 * @param {string[]} [scripts] - Workspace scripts to copy in
 * @returns {{home: string, root: string, remove: () => void}}
 */
export const stageAuditWorkspace = (fixtureCase, scripts = []) => {
  const staged = stageBashWorkspace({
    scripts,
    files: workspaceFilesOf(fixtureCase)
  })
  if (existsSync(join(staged.root, REPO_FOLDER))) {
    linkSemver(staged.root, REPO_FOLDER)
  }
  if (fixtureCase.withOtherCheckout) linkSemver(staged.root, OTHER_CHECKOUT)
  if (fixtureCase.symlinkRepo) {
    const real = join(staged.root, 'checkouts', REPO)
    mkdirSync(dirname(real), { recursive: true })
    cpSync(join(staged.root, REPO_FOLDER), real, {
      recursive: true,
      verbatimSymlinks: true
    })
    rmSync(join(staged.root, REPO_FOLDER), { recursive: true, force: true })
    symlinkSync(real, join(staged.root, REPO_FOLDER))
  }
  if (fixtureCase.withClone) {
    mkdirSync(join(staged.root, 'workareas', 'clones', REPO), {
      recursive: true
    })
  }
  return staged
}

const fakeNpx = [
  '#!/bin/sh',
  'if [ "$*" != "--no-install audit-ci --config audit-ci.jsonc --report-type full --output-format json" ] || [ ! -f audit-ci.jsonc ]; then',
  '  echo "fake npx: unexpected call in $(pwd): $*" >&2',
  '  exit 9',
  'fi',
  'echo "audit-ci: checked $(basename "$(pwd)")" >&2',
  'cat "$FAKE_BIN/audit-ci-output"',
  'set -- $(cat "$FAKE_BIN/audit-ci-exit")',
  'code="$1"',
  'shift',
  'if [ $# -gt 0 ]; then echo "$*" > "$FAKE_BIN/audit-ci-exit"; fi',
  'exit "$code"'
]

const fakeNpm = [
  '#!/bin/sh',
  'case "$1" in',
  '  audit)',
  '    [ "$2" = "--json" ] || exit 9',
  '    echo "npm warn audit noise" >&2',
  '    cat "$FAKE_BIN/npm-audit-output"',
  '    exit 1 ;;',
  '  view)',
  '    [ "$3 $4" = "versions --json" ] || exit 9',
  '    file="$FAKE_BIN/registry/$(echo "$2" | sed "s#/#__#g").json"',
  '    if [ ! -f "$file" ]; then echo "npm error 404 $2" >&2; exit 1; fi',
  '    cat "$file" ;;',
  '  root)',
  '    echo "$FAKE_BIN/no-global-root" ;;',
  '  *)',
  '    echo "npm $*"',
  '    echo "cwd $(pwd -P)"',
  '    exit "$FAKE_NPM_EXIT" ;;',
  'esac'
]

/** Runs the real BSD date as if today were FAKE_TODAY. */
const fakeDate = [
  '#!/bin/bash',
  'options=()',
  'format=',
  'for arg in "$@"; do',
  '  case "$arg" in',
  '    +*) format="$arg" ;;',
  '    *) options+=("$arg") ;;',
  '  esac',
  'done',
  // eslint-disable-next-line no-template-curly-in-string
  'exec /bin/date -j "${options[@]}" -f %Y-%m-%d "$FAKE_TODAY" "$format"'
]

/**
 * A folder of stand-ins for the commands the audit runs: `npx` answers as
 * audit-ci with the case's report and exit code, `npm` answers `audit
 * --json`, `view <name> versions --json` from {@link REGISTRY} and echoes
 * anything else with the folder it ran in, and `date` (Bash only) runs as
 * if today were the case's day.
 *
 * @param {object} fixtureCase - One of {@link cases}
 * @returns {{bin: string, env: Record<string, string>, remove: () => void}}
 */
export const stageFakeCommands = (fixtureCase) => {
  const bin = mkdtempSync(join(tmpdir(), 'tim-npm-audit-fake-bin-'))
  const report = fixtureCase.report ?? REPORT
  const auditCiOutput =
    typeof report === 'string' ? report : JSON.stringify(report, null, 2)
  writeFileSync(join(bin, 'audit-ci-output'), `${auditCiOutput}\n`)
  writeFileSync(
    join(bin, 'audit-ci-exit'),
    `${[fixtureCase.auditExit ?? 0].flat().join(' ')}\n`
  )
  writeFileSync(
    join(bin, 'npm-audit-output'),
    `${JSON.stringify(fixtureCase.npmAuditReport ?? REPORT)}\n`
  )
  mkdirSync(join(bin, 'registry'))
  const registry = fixtureCase.registry ?? REGISTRY
  for (const [name, versions] of Object.entries(registry)) {
    writeFileSync(
      join(bin, 'registry', `${name.replaceAll('/', '__')}.json`),
      JSON.stringify(versions)
    )
  }
  const commands = { npx: fakeNpx, npm: fakeNpm, date: fakeDate }
  for (const [name, lines] of Object.entries(commands)) {
    const path = join(bin, name)
    writeFileSync(path, `${lines.join('\n')}\n`)
    chmodSync(path, 0o755)
  }
  return {
    bin,
    env: {
      PATH: `${bin}:${process.env.PATH}`,
      FAKE_BIN: bin,
      FAKE_TODAY: fixtureCase.today ?? TODAY,
      FAKE_NPM_EXIT: String(fixtureCase.npmExit ?? 0)
    },
    remove: () => rmSync(bin, { recursive: true, force: true })
  }
}

/**
 * An argument list with `<ROOT>` swapped for the staged workspace root.
 *
 * @param {string[]} args
 * @param {string} root
 * @returns {string[]}
 */
export const argsIn = (args, root) =>
  args.map((arg) => arg.replaceAll('<ROOT>', root))

const run = (...args) => ['--run-id', RUN_ID, '--repo', REPO, ...args]

const allowArgs = (ghsa, ...rest) =>
  run(
    '--ghsa',
    ghsa,
    '--reason',
    'No fixed release.',
    '--owner',
    'Sam Farrington',
    '--expiry-days',
    '30',
    ...rest
  )

/**
 * Each case runs on a fresh workspace from {@link stageAuditWorkspace}
 * and fresh commands from {@link stageFakeCommands}. `<ROOT>` in an
 * argument is the staged workspace root. `stderrDiffers` marks a case
 * whose Bash stderr carries a Node stack trace tim does not print.
 */
export const cases = {
  baseline: [
    {
      name: 'red on advisories with and without a fix',
      args: run(),
      auditExit: 1
    },
    {
      name: 'green with nothing reported',
      args: run('--label', 'clean'),
      report: EMPTY_REPORT
    },
    {
      name: 'every allowlist shape: honoured, expired, inactive and stale',
      args: run(),
      auditConfig: config(HIGH, MIXED_ALLOWLIST),
      auditExit: 1
    },
    {
      name: 'an allowlisted advisory that now has a fix is red',
      args: run(),
      auditConfig: config(HIGH, ALL_HIGH_ALLOWED)
    },
    {
      name: 'a fix blocked upstream stays green',
      args: run(),
      auditConfig: config(HIGH, BLOCKED_HIGH_ALLOWED)
    },
    {
      name: 'a moderate threshold counts moderate advisories',
      args: run(),
      auditConfig: config({ moderate: true }, BLOCKED_HIGH_ALLOWED),
      auditExit: 1
    },
    {
      name: 'no level set fails on nothing',
      args: run(),
      auditConfig: config({}, [])
    },
    {
      name: 'audit-ci disagreeing with the classification warns',
      args: run(),
      auditConfig: config(HIGH, BLOCKED_HIGH_ALLOWED),
      auditExit: 1
    },
    {
      name: 'a label is made safe for a file name',
      args: run('--label', 'upgrade-@hapi/hapi 21.0.0')
    },
    {
      name: 'another checkout by --repo-path',
      args: run('--repo-path', `<ROOT>/${OTHER_CHECKOUT}`),
      withOtherCheckout: true
    },
    {
      name: 'a symlinked repo is audited at its real path',
      args: run('--label', 'linked'),
      auditConfig: config(HIGH, BLOCKED_HIGH_ALLOWED),
      symlinkRepo: true
    },
    {
      name: 'no audit-ci config',
      args: run(),
      auditConfig: undefined
    },
    {
      name: 'a config with a comment',
      args: run(),
      auditConfig: '{\n  // high only\n  "high": true,\n  "allowlist": []\n}\n'
    },
    {
      name: 'a config without an allowlist array',
      args: run(),
      auditConfig: config(HIGH, {})
    },
    {
      name: 'audit-ci gives no report',
      args: run(),
      report: 'npm error code ENOTFOUND\nnpm error network unreachable',
      auditExit: 1
    },
    {
      name: 'the registry cannot be asked',
      args: run(),
      auditExit: 1,
      registry: { 'basic-ftp': REGISTRY['basic-ftp'] },
      stderrDiffers: true
    },
    { name: 'no such repo', args: run(), withoutRepo: true },
    { name: 'no run id', args: ['--repo', REPO] },
    { name: 'an empty label', args: run('--label', '') }
  ],
  allow: [
    {
      name: 'a new entry for an advisory with no fix',
      args: allowArgs(GHSA.basicFtp, '--stage', '2')
    },
    {
      name: 'a renewal keeps the first time and stage',
      args: allowArgs(GHSA.basicFtp, '--stage', '4'),
      auditConfig: config(HIGH, [
        entry(GHSA.basicFtp, active('First reason. Owner: Sam', '2026-12-01')),
        GHSA.braces
      ]),
      withPriorState: true
    },
    {
      name: 'a renewal without a stage',
      args: allowArgs(GHSA.basicFtp),
      withPriorState: 'raw'
    },
    {
      name: 'a plain id entry is replaced in place',
      args: allowArgs(GHSA.basicFtp),
      auditConfig: config(HIGH, [GHSA.braces, GHSA.basicFtp, GHSA.ws])
    },
    {
      name: 'an advisory with a fix is refused',
      args: allowArgs(GHSA.braces)
    },
    {
      name: 'a fix blocked upstream is allowed and marked',
      args: allowArgs(GHSA.ws, '--blocked-by', 'legacy pins ws ^7.')
    },
    {
      name: 'blocked-by on an advisory with no fix is dropped',
      args: allowArgs(GHSA.basicFtp, '--blocked-by', 'nothing')
    },
    {
      name: 'a moderate advisory below the threshold can be allowlisted',
      args: allowArgs(GHSA.minimatch, '--blocked-by', 'eslint pins it'),
      registry: { minimatch: ['9.0.4'] }
    },
    {
      name: 'an advisory not in the audit is refused',
      args: allowArgs('GHSA-zzzz-zzzz-zzzz')
    },
    {
      name: 'an expiry past three months is refused',
      args: [...allowArgs(GHSA.basicFtp).slice(0, -1), '100']
    },
    {
      name: 'month end: 90 days from 30 November reaches the limit',
      args: [...allowArgs(GHSA.basicFtp).slice(0, -1), '90'],
      today: '2026-11-30'
    },
    {
      name: 'month end: 91 days from 30 November is past the limit',
      args: [...allowArgs(GHSA.basicFtp).slice(0, -1), '91'],
      today: '2026-11-30'
    },
    {
      name: 'month end: three months from 30 November in a leap year',
      args: [...allowArgs(GHSA.basicFtp).slice(0, -1), '91'],
      today: '2027-11-30'
    },
    {
      name: 'month end: 31 January',
      args: [...allowArgs(GHSA.basicFtp).slice(0, -1), '89'],
      today: '2026-01-31'
    },
    {
      name: 'month end: 31 January, a day further',
      args: [...allowArgs(GHSA.basicFtp).slice(0, -1), '90'],
      today: '2026-01-31'
    },
    {
      name: 'a repo path override',
      args: allowArgs(GHSA.basicFtp, '--repo-path', `<ROOT>/${OTHER_CHECKOUT}`),
      withOtherCheckout: true
    },
    {
      name: 'npm audit gives no report',
      args: allowArgs(GHSA.basicFtp),
      npmAuditReport: { error: { code: 'ENOTFOUND' } }
    },
    {
      name: 'the registry cannot be asked',
      args: allowArgs(GHSA.basicFtp),
      registry: {},
      stderrDiffers: true
    },
    {
      name: 'a GHSA in upper case',
      args: allowArgs('GHSA-C475-QRG2-PJ4R')
    },
    {
      name: 'expiry days of zero',
      args: [...allowArgs(GHSA.basicFtp).slice(0, -1), '0']
    },
    {
      name: 'a stage that is not a number',
      args: allowArgs(GHSA.basicFtp, '--stage', 'two')
    },
    {
      name: 'a reason naming the owner',
      args: [
        ...run('--ghsa', GHSA.basicFtp),
        '--reason',
        'Owner: me',
        '--owner',
        'Sam',
        '--expiry-days',
        '30'
      ]
    },
    {
      name: 'a reason with the blocked marker',
      args: [
        ...run('--ghsa', GHSA.basicFtp),
        '--reason',
        'Fix blocked upstream: x',
        '--owner',
        'Sam',
        '--expiry-days',
        '30'
      ]
    },
    {
      name: 'no owner',
      args: [
        ...run('--ghsa', GHSA.basicFtp),
        '--reason',
        'r',
        '--expiry-days',
        '30'
      ]
    },
    {
      name: 'no audit-ci config',
      args: allowArgs(GHSA.basicFtp),
      auditConfig: undefined
    }
  ],
  forget: [
    {
      name: 'drops one entry',
      args: run('--ghsa', GHSA.braces),
      withPriorState: 'raw'
    },
    {
      name: 'drops several, missing ones too',
      args: run(
        '--ghsa',
        GHSA.braces,
        '--ghsa',
        GHSA.basicFtp,
        '--ghsa',
        'GHSA-zzzz-zzzz-zzzz'
      ),
      withPriorState: true
    },
    {
      name: 'no state file',
      args: run('--ghsa', GHSA.braces)
    },
    {
      name: 'not a GHSA id',
      args: run('--ghsa', GHSA.braces, '--ghsa', 'CVE-2024-1'),
      withPriorState: true
    },
    { name: 'no GHSA', args: run(), withPriorState: true }
  ],
  exec: [
    {
      name: 'runs npm in the repo',
      args: ['--repo', REPO, 'install', 'date-fns@4.3.0']
    },
    {
      name: 'runs npm at the real path of a symlinked repo',
      args: ['--repo', REPO, 'test'],
      symlinkRepo: true
    },
    {
      name: 'runs npm in a clone',
      args: ['--clone', REPO, 'ci'],
      withClone: true
    },
    {
      name: "npm's exit code passes through",
      args: ['--repo', REPO, 'run', 'lint'],
      npmExit: 3
    },
    { name: 'no such clone', args: ['--clone', REPO, 'ci'] },
    { name: 'no npm command', args: ['--repo', REPO] },
    { name: 'no repo', args: ['test'] }
  ]
}

export const auditConfigPathIn = (root) =>
  join(root, REPO_FOLDER, 'audit-ci.jsonc')
