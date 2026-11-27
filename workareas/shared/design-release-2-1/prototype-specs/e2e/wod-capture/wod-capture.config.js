const path = require('path')
const base = require('../../playwright.config.js')

const HARNESS_DIR = path.join(__dirname, '..', '..')

module.exports = {
  ...base,
  testDir: __dirname,
  testMatch: '**/*.capture.spec.js',
  globalSetup: undefined,
  outputDir: path.join(HARNESS_DIR, 'test-results', 'wod-capture'),
  reporter: [['list']],
  webServer: { ...base.webServer, cwd: HARNESS_DIR }
}
