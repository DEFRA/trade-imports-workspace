const path = require('path')
const { defineConfig, devices } = require('@playwright/test')

// Drives the workspace Docker stack on the same hosts the tests repo's
// playwright.docker-compose.config.ts uses, so OIDC stays on one hostname.
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'capture.spec.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  expect: { timeout: 15_000 },
  outputDir: path.join(__dirname, 'test-results'),
  reporter: [['list']],
  use: {
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } }
    }
  ]
})
