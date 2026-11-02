// Runs the Playwright suite, then collects traces and evidence indexes whether
// or not every test passed, and exits with Playwright's status.
const { spawnSync } = require('child_process')
const path = require('path')

const args = process.argv.slice(2)
const isFiltered = args.length > 0

const env = { ...process.env, KEEP_EVIDENCE: isFiltered ? '1' : (process.env.KEEP_EVIDENCE || '') }

const run = spawnSync('npx', ['playwright', 'test', ...args], { cwd: __dirname, stdio: 'inherit', env })

const collect = spawnSync(process.execPath, [path.join(__dirname, 'collect-traces.js')], {
  cwd: __dirname,
  stdio: 'inherit',
  env
})

process.exit(run.status ?? collect.status ?? 1)
