// Boots the GB-notification-service prototype in dev mode on PROTOTYPE_PORT
// (default 3010). Dev mode, never `serve`: production mode forces https and
// secure-only cookies, which break the plaintext session.
const fs = require('fs')
const os = require('os')
const path = require('path')
const { spawn } = require('child_process')

const root = process.env.PROTOTYPE_DIR ||
  path.join(os.homedir(), 'git', 'defra', 'defra-design', 'GB-notification-service')
const port = process.env.PROTOTYPE_PORT || '3010'

const usageConfig = path.join(root, 'usage-data-config.json')
if (!fs.existsSync(usageConfig)) {
  fs.writeFileSync(usageConfig, `${JSON.stringify({ collectUsageData: false }, null, 2)}\n`)
}

const child = spawn('npm', ['run', 'dev'], {
  cwd: root,
  stdio: 'inherit',
  env: { ...process.env, PORT: port }
})
child.on('exit', (code) => process.exit(code ?? 0))
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => child.kill(signal))
}
