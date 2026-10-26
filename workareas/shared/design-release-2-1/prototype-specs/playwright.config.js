const path = require('path')
const { defineConfig, devices } = require('@playwright/test')

const PORT = Number(process.env.PROTOTYPE_PORT || 3010)

// Fit-style walk of every Design Release 2.1 journey in the GB-notification-service
// prototype. The traces, videos and screenshots are requirement sources, so they
// are recorded for every test, pass or fail.
//
// workers: 1 — the kit's dev server keeps journey state in one session store and
// races it across concurrent requests.
module.exports = defineConfig({
  testDir: './e2e',
  testMatch: '**/*.fit.spec.js',
  globalSetup: require.resolve('./global-setup.js'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 10_000 },
  outputDir: path.join(__dirname, 'test-results'),
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: path.join(__dirname, 'playwright-report') }],
    ['json', { outputFile: path.join(__dirname, 'test-results', 'results.json') }]
  ],
  use: {
    baseURL: `http://localhost:${PORT}`,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    viewport: { width: 1280, height: 1200 },
    video: { mode: 'on', size: { width: 1280, height: 1200 } },
    trace: 'on',
    screenshot: 'on'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 1200 } }
    }
  ],
  webServer: {
    // Dev mode, never `serve`: production mode forces https and secure cookies.
    command: 'node serve-prototype.js',
    cwd: __dirname,
    env: { PROTOTYPE_PORT: String(PORT) },
    // Wait on the TCP port, not an HTTP GET.
    port: PORT,
    timeout: 240_000,
    reuseExistingServer: !process.env.CI
  }
})
