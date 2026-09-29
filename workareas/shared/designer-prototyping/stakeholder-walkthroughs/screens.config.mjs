// Throwaway: photographs the local stakeholder demo page. Run with
//   npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run test:fit -- --config ~/git/defra/trade-imports-workspace/workareas/shared/designer-prototyping/stakeholder-walkthroughs/screens.config.mjs
// A plain object (no @playwright/test import) because nothing above this
// folder has node_modules; the spec imports the prototype's copy by path.
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = path.dirname(fileURLToPath(import.meta.url))

export default {
  testDir: HERE,
  testMatch: 'screens.spec.mjs',
  outputDir: path.join(HERE, 'screens', '.results'),
  reporter: 'list',
  workers: 1,
  use: { browserName: 'chromium' }
}
