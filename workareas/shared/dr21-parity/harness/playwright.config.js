const path = require('path')
const { defineConfig, devices } = require('@playwright/test')

const PROTOTYPE_ROOT = '/Users/samfarrington/git/defra/defra-design/GB-notification-service'
// 3010: the real workspace stack already owns 3000/3001/3007/3100/3200.
const PORT = 3010

module.exports = defineConfig({
  testDir: path.join(__dirname, 'e2e'),
  testMatch: '**/*.spec.js',
  // The kit dev server races journey/session state across concurrent requests.
  workers: 1,
  timeout: 600_000,
  expect: { timeout: 15_000 },
  outputDir: path.join(__dirname, 'test-results'),
  reporter: [
    ['html', { open: 'never', outputFolder: path.join(__dirname, 'report') }],
    ['list']
  ],
  // 2x, and motion stopped. Everything here was 1x, which is visibly soft on a
  // Retina display, and the findings report shows a ribbon when a picture
  // changes under a decision somebody is about to make — which only means
  // anything if a no-op re-run changes nothing.
  use: {
    baseURL: `http://localhost:${PORT}`,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    viewport: { width: 1280, height: 1200 },
    deviceScaleFactor: Number(process.env.CAPTURE_DSF || 2),
    reducedMotion: 'reduce',
    trace: 'on',
    screenshot: 'only-on-failure',
    video: 'off'
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 1200 },
        deviceScaleFactor: Number(process.env.CAPTURE_DSF || 2),
        reducedMotion: 'reduce'
      }
    }
  ],
  webServer: {
    // Dev mode, not `serve`: production mode forces https on a plaintext server
    // and sets secure-only cookies, which breaks the kit's sessions over http.
    command: `node ${path.join(PROTOTYPE_ROOT, 'journey-demo', 'serve-prototype.js')}`,
    cwd: PROTOTYPE_ROOT,
    env: { PORT: String(PORT) },
    // Wait on the TCP port: the kit accepts connections before an HTTP probe
    // settles under Node 24.
    port: PORT,
    timeout: 180_000,
    reuseExistingServer: true
  }
})
