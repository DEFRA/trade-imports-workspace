import { defineConfig, configDefaults } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    clearMocks: true,
    // Subprocess-spawning tests (docker, start, exec, status — anything
    // that shells out or spawns `node src/cli.js`) hit the default 5s
    // timeout under parallel load when many test files run concurrently.
    // 30s is the headroom they need without slowing passing tests; the
    // status.test.js beforeEach also runs `git init` per test which can
    // queue up behind sibling subprocess work.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Many test files spawn `node src/cli.js` subprocesses. Letting vitest
    // run one worker per CPU saturates the box and starves Ink tests'
    // vi.waitFor windows. (poolOptions.threads.maxThreads is ignored by
    // Vitest 4 outside `test`, and superseded by maxWorkers within it.)
    maxWorkers: 4,
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.js'],
      exclude: [
        ...configDefaults.exclude,
        'coverage',
        'vitest.config.js',
        'eslint.config.js',
        'src/**/*.test.js',
        'src/test-support/**',
        'src/**/__fixtures__/**',
        'src/**/fixtures/**',
        // cli.js is the bin entry and program.js the commander program it
        // loads — covered behaviourally via subprocess tests in cli.test.js,
        // which v8 coverage can't instrument.
        'src/cli.js',
        'src/program.js',
        // Command action handlers are integration-tested through the CLI
        // (real subprocess spawn in *.test.js). The logic inside each
        // command file (buildTasks, parseBranch, collectStatuses, etc.) is
        // exercised through those tests; the action() boilerplate is glue.
        'src/commands/**'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80
      }
    }
  }
})
