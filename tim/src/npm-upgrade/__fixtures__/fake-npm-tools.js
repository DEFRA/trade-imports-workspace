import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const [tool, ...argv] = process.argv.slice(2)
const fakeBin = process.env.FAKE_BIN
const controlPath = join(fakeBin, 'control.json')
const control = JSON.parse(readFileSync(controlPath, 'utf8'))
const SEVERITY_RANK = { info: 0, low: 1, moderate: 2, high: 3, critical: 4 }

const jsonText = (value) => `${JSON.stringify(value, null, 2)}\n`
const readJson = (path) => JSON.parse(readFileSync(path, 'utf8'))
const say = (line) => process.stdout.write(`${line}\n`)
const complain = (line) => process.stderr.write(`${line}\n`)

const nextFrom = (queueName, fallback) => {
  const queue = control.queues?.[queueName]
  if (!queue || queue.length === 0) return fallback
  if (queue.length > 1) {
    const [head] = queue.splice(0, 1)
    writeFileSync(controlPath, jsonText(control))
    return head
  }
  return queue[0]
}

const leafPaths = (value, prefix = []) =>
  Object.entries(value ?? {}).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null
      ? leafPaths(child, [...prefix, key])
      : [[...prefix, key].join('/')]
  )

const overridePathsIn = (dir) =>
  leafPaths(readJson(join(dir, 'package.json')).overrides)

const vulnerabilityOf = (rule) => ({
  name: rule.package,
  severity: rule.severity,
  isDirect: false,
  via: [
    {
      source: 1,
      name: rule.package,
      dependency: rule.package,
      title: rule.title,
      url: `https://github.com/advisories/${rule.ghsa}`,
      severity: rule.severity,
      cwe: [],
      cvss: { score: 7.5 },
      range: rule.range
    }
  ],
  effects: rule.effects ?? [],
  range: rule.range,
  nodes: [`node_modules/${rule.package}`],
  fixAvailable: false
})

const chainOf = (rule) =>
  (rule.chain ?? []).map((link) => [
    link.name,
    {
      name: link.name,
      severity: rule.severity,
      isDirect: false,
      via: [rule.package],
      effects: link.effects,
      range: '*',
      nodes: [`node_modules/${link.name}`],
      fixAvailable: false
    }
  ])

const allowlistedIn = (dir) => {
  const configPath = join(dir, 'audit-ci.jsonc')
  if (!existsSync(configPath)) return []
  return readJson(configPath).allowlist.flatMap((entry) =>
    typeof entry === 'string' ? [entry] : Object.keys(entry)
  )
}

const auditByRules = (dir) => {
  const present = overridePathsIn(dir)
  const rules = control.auditRules.filter(
    (rule) => !rule.unlessOverride || !present.includes(rule.unlessOverride)
  )
  const report = {
    auditReportVersion: 2,
    vulnerabilities: Object.fromEntries(
      rules.flatMap((rule) => [
        [rule.package, vulnerabilityOf(rule)],
        ...chainOf(rule)
      ])
    ),
    metadata: { vulnerabilities: { total: rules.length } }
  }
  const allowed = allowlistedIn(dir)
  const failing = rules.some(
    (rule) =>
      SEVERITY_RANK[rule.severity] >= SEVERITY_RANK.high &&
      !allowed.includes(rule.ghsa)
  )
  return { report, exit: failing ? 1 : 0 }
}

const auditOutcome = (dir) => {
  if (control.auditBroken) {
    return { report: 'audit-ci: registry offline', exit: 1 }
  }
  if (control.auditRules) return auditByRules(dir)
  return nextFrom('audit', {
    report: { auditReportVersion: 2, vulnerabilities: {}, metadata: {} },
    exit: 0
  })
}

const reportText = (report) =>
  typeof report === 'string' ? `${report}\n` : jsonText(report)

const runAuditCi = () => {
  const dir = process.cwd()
  if (
    argv.join(' ') !==
    '--no-install audit-ci --config audit-ci.jsonc --report-type full --output-format json'
  ) {
    complain(`fake npx: unexpected call: ${argv.join(' ')}`)
    process.exit(9)
  }
  const { report, exit } = auditOutcome(dir)
  writeFileSync(join(fakeBin, 'last-report.json'), reportText(report))
  complain(`audit-ci: checked ${basename(dir)}`)
  process.stdout.write(reportText(report))
  process.exit(exit)
}

const runScript = (dir, script) => {
  const required = control.requires?.[script]
  if (required) {
    const present = overridePathsIn(dir)
    const missing = required.filter((path) => !present.includes(path))
    say(`fake npm ${script} in ${basename(dir)}`)
    if (missing.length > 0) {
      complain(`fake npm ${script}: needs override ${missing.join(', ')}`)
      process.exit(1)
    }
    process.exit(0)
  }
  const code = nextFrom(script, 0)
  say(`fake npm ${script} in ${basename(dir)}`)
  if (code !== 0) complain(`fake npm ${script} failed`)
  process.exit(code)
}

const writePackageFiles = (dir, change) => {
  const packageJson = readJson(join(dir, 'package.json'))
  const lock = readJson(join(dir, 'package-lock.json'))
  change(packageJson, lock)
  writeFileSync(join(dir, 'package.json'), jsonText(packageJson))
  writeFileSync(join(dir, 'package-lock.json'), jsonText(lock))
}

const installPackage = (dir, spec) => {
  const at = spec.lastIndexOf('@')
  const name = spec.slice(0, at)
  const version = spec.slice(at + 1)
  const code = nextFrom('install', 0)
  if (code !== 0) {
    complain(`npm error ERESOLVE could not resolve ${spec}`)
    process.exit(code)
  }
  writePackageFiles(dir, (packageJson, lock) => {
    packageJson.dependencies = {
      ...packageJson.dependencies,
      [name]: `^${version}`
    }
    lock.packages[''].dependencies = packageJson.dependencies
    lock.packages[`node_modules/${name}`] = { version }
  })
  say(`added 1 package: ${spec}`)
}

const installAll = (dir) => {
  writePackageFiles(dir, (packageJson, lock) => {
    if (packageJson.overrides) {
      lock.packages[''].overrides = packageJson.overrides
    } else {
      delete lock.packages[''].overrides
    }
  })
  say('up to date')
  process.exit(nextFrom('installAll', 0))
}

const update = (dir) => {
  const mode = nextFrom('update', 'none')
  if (mode === 'fail') {
    complain('npm error network')
    process.exit(1)
  }
  if (mode === 'none') {
    say('up to date')
    return
  }
  writePackageFiles(dir, (packageJson, lock) => {
    lock.packages['node_modules/braces'] = { version: '3.0.3' }
    if (mode === 'package-json') {
      packageJson.dependencies = {
        ...packageJson.dependencies,
        braces: '^3.0.3'
      }
    }
  })
  say('changed 1 package')
}

const view = (name) => {
  const versions = control.registry?.[name]
  if (!versions) {
    complain(`npm error 404 ${name}`)
    process.exit(1)
  }
  say(JSON.stringify(versions))
}

const runNpm = () => {
  const hasPrefix = argv[0] === '--prefix'
  const dir = hasPrefix ? argv[1] : process.cwd()
  const [command, ...rest] = hasPrefix ? argv.slice(2) : argv
  if (command === 'test') return runScript(dir, 'test')
  if (command === 'run') return runScript(dir, rest[0])
  if (command === 'install' && rest.length > 0) {
    return installPackage(dir, rest[0])
  }
  if (command === 'install') return installAll(dir)
  if (command === 'update') return update(dir)
  if (command === 'view') return view(rest[0])
  if (command === 'audit') {
    process.stdout.write(
      readFileSync(join(fakeBin, 'last-report.json'), 'utf8')
    )
    process.exit(1)
  }
  complain(`fake npm: unexpected call: ${argv.join(' ')}`)
  process.exit(9)
}

if (tool === 'npx') runAuditCi()
else runNpm()
