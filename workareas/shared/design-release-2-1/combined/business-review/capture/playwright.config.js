const path = require('path')
const { defineConfig, devices } = require('@playwright/test')

// Hosts mirror trade-imports-ins-tests/playwright.docker-compose.config.ts so OIDC stays on one hostname.
module.exports = defineConfig({
  testDir: __dirname,
  testMatch: 'capture.spec.js',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 900_000,
  expect: { timeout: 15_000 },
  outputDir: path.join(__dirname, 'test-results'),
  reporter: [['list']],
  use: {
    actionTimeout: 20_000,
    navigationTimeout: 45_000,
    viewport: { width: 1280, height: 900 },
    trace: 'off',
    screenshot: 'off'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } }
    }
  ]
})
