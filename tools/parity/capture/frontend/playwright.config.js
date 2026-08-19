import { defineConfig, devices } from '@playwright/test'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const appRoot =
  process.env.CAPTURE_APP_ROOT ??
  join(here, '..', '..', '..', '..', 'repos', 'trade-imports-animals-frontend')

// Its own port, so a capture run never collides with the app's fit suite or
// with a stack the developer already has up.
const PORT = Number(process.env.CAPTURE_PORT ?? 3060)

export default defineConfig({
  testDir: here,
  testMatch: '**/walk.spec.js',
  // The app races its own session state across concurrent requests, and a
  // capture walks one journey from end to end. Parallelism would interleave
  // two journeys into one session.
  workers: 1,
  timeout: 600_000,
  expect: { timeout: 15_000 },
  outputDir: join(here, 'test-results'),
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    // Everything below is about two runs at the same commit producing the same
    // bytes. A fixed viewport, 2x so the image is legible on a Retina display,
    // and motion stopped. Without it a no-op re-capture drifts every screen and
    // the report's drift panel fills with noise and stops being read.
    viewport: { width: 1280, height: 1200 },
    deviceScaleFactor: Number(process.env.CAPTURE_DSF ?? 2),
    reducedMotion: 'reduce',
    video: 'off',
    trace: 'retain-on-failure'
  },
  projects: [{ name: 'frontend', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run fit:start',
    cwd: appRoot,
    env: { PORT: String(PORT) },
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000
  }
})
