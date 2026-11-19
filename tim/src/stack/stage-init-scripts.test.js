import { execa } from 'execa'
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, test } from 'vitest'
import { commitAll, git, writeFiles } from '../test-support/branched-repo.js'
import { stagedInitFiles } from '../test-support/fake-docker.js'
import { stageInitScripts } from './stage-init-scripts.js'

const SOURCES = {
  'trade-imports-animals-backend': ['compose/start-floci.sh'],
  'trade-imports-dynamics-gateway': [
    'servicebus/setup-notification-pipeline.sh',
    'servicebus/servicebus-config.json'
  ],
  'trade-imports-ins-backend': ['floci/setup-ins-backend-pipeline.sh'],
  'trade-imports-ins-tests': [
    'zap/automation-context.yaml',
    'zap/automation-passive.yaml',
    'zap/automation-active.yaml'
  ]
}

const STAGED_WITHOUT_ZAP = [
  'floci/setup-ins-backend-pipeline.sh',
  'floci/setup-notification-pipeline.sh',
  'floci/start-floci.sh',
  'mongodb/10-database-setup.js',
  'servicebus/servicebus-config.json'
]

const ZAP_PLANS = [
  'zap/automation-active.yaml',
  'zap/automation-context.yaml',
  'zap/automation-passive.yaml'
]

let root

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'tim-stage-init-'))
  writeFiles(join(root, 'docker', 'stack', 'scripts', 'mongodb'), {
    '10-database-setup.js': 'mongo set-up\n'
  })
})

afterEach(() => rmSync(root, { recursive: true, force: true }))

const writeRepoSources = (repos = Object.keys(SOURCES)) => {
  for (const repo of repos) {
    writeFiles(
      join(root, 'repos', repo),
      Object.fromEntries(
        SOURCES[repo].map((path) => [path, `${repo}/${path} from repos\n`])
      )
    )
  }
}

const recordingOutput = () => {
  const lines = { stdout: '', stderr: '' }
  return {
    lines,
    print: (text) => {
      lines.stdout += text
    },
    printError: (text) => {
      lines.stderr += text
    },
    error: (line) => {
      lines.stderr += `${line}\n`
    }
  }
}

const staged = (path) =>
  readFileSync(join(root, 'docker', 'stack', '.staged', path), 'utf8')

const stage = (options = {}) => {
  const output = recordingOutput()
  return stageInitScripts({
    workspaceRoot: root,
    output,
    repoUrl: (repo) => `file://${join(root, 'remotes', `${repo}.git`)}`,
    ...options
  }).then((ok) => ({ ok, ...output.lines }))
}

const createRemote = async (repo, { mainFiles, branchFiles = null }) => {
  const work = join(root, 'remote-work', repo)
  await execa('git', ['init', '--quiet', '-b', 'main', work])
  writeFiles(work, mainFiles)
  await commitAll(work, 'main')
  if (branchFiles) {
    await git(work, 'switch', '--quiet', '-c', 'feat/x')
    writeFiles(work, branchFiles)
    await commitAll(work, 'branch')
    await git(work, 'switch', '--quiet', 'main')
  }
  await execa('git', [
    'clone',
    '--quiet',
    '--bare',
    work,
    join(root, 'remotes', `${repo}.git`)
  ])
}

describe('#stageInitScripts', () => {
  describe('with every repo under repos/', () => {
    test('Should copy each init script into its staged folder, as it is, leaving out the ZAP plans', async () => {
      writeRepoSources()

      const result = await stage()

      expect({
        ok: result.ok,
        files: stagedInitFiles(root),
        floci: staged('floci/start-floci.sh'),
        mongo: staged('mongodb/10-database-setup.js'),
        stdout: result.stdout
      }).toEqual({
        ok: true,
        files: STAGED_WITHOUT_ZAP,
        floci:
          'trade-imports-animals-backend/compose/start-floci.sh from repos\n',
        mongo: 'mongo set-up\n',
        stdout: ''
      })
    })

    test('Should stage the ZAP plans when asked to', async () => {
      writeRepoSources()

      await stage({ stageZap: true })

      expect(stagedInitFiles(root)).toEqual(
        [...STAGED_WITHOUT_ZAP, ...ZAP_PLANS].sort()
      )
    })

    test('Should empty the staged folders it refills, keeping the ZAP plans when not staging them', async () => {
      writeRepoSources()
      await stage({ stageZap: true })
      const stagedFolder = join(root, 'docker', 'stack', '.staged')
      writeFileSync(join(stagedFolder, 'floci', 'left-over.sh'), 'old\n')

      await stage()

      expect(stagedInitFiles(root)).toEqual(
        [...STAGED_WITHOUT_ZAP, ...ZAP_PLANS].sort()
      )
    })

    test('Should keep the same ZAP folder, refilled, so a running container keeps its mount', async () => {
      writeRepoSources()
      await stage({ stageZap: true })
      const zapFolder = join(root, 'docker', 'stack', '.staged', 'zap')
      const before = statSync(zapFolder).ino
      writeFileSync(join(zapFolder, 'stale.yaml'), 'old\n')

      await stage({ stageZap: true })

      expect({
        inode: statSync(zapFolder).ino,
        files: stagedInitFiles(root).filter((file) => file.startsWith('zap/'))
      }).toEqual({ inode: before, files: ZAP_PLANS })
    })

    test('Should fail, saying so, when the mongo set-up script is missing', async () => {
      writeRepoSources()
      rmSync(join(root, 'docker', 'stack', 'scripts'), { recursive: true })

      const result = await stage()

      expect({ ok: result.ok, stderr: result.stderr }).toEqual({
        ok: false,
        stderr: `error: cannot find ${join(root, 'docker', 'stack', 'scripts', 'mongodb', '10-database-setup.js')}\n`
      })
    })
  })

  describe('with a repo missing from repos/', () => {
    const missingRepo = 'trade-imports-ins-backend'
    const path = 'floci/setup-ins-backend-pipeline.sh'

    beforeEach(() => {
      writeRepoSources(
        Object.keys(SOURCES).filter((repo) => repo !== missingRepo)
      )
    })

    test('Should clone the branch asked for and stage its copy', async () => {
      await createRemote(missingRepo, {
        mainFiles: { [path]: 'main\n' },
        branchFiles: { [path]: 'branch\n' }
      })

      const result = await stage({ ref: 'feat/x' })

      expect({
        ok: result.ok,
        staged: staged(path),
        stdout: result.stdout
      }).toEqual({
        ok: true,
        staged: 'branch\n',
        stdout: `Fetching ${missingRepo}/${path} from GitHub (not present under repos/)\n`
      })
    })

    test('Should clone the default branch when the repo has no such branch', async () => {
      await createRemote(missingRepo, { mainFiles: { [path]: 'main\n' } })

      const result = await stage({ ref: 'feat/none' })

      expect({ ok: result.ok, staged: staged(path) }).toEqual({
        ok: true,
        staged: 'main\n'
      })
    })

    test('Should fail, naming the path and branch, when the clone lacks the script', async () => {
      await createRemote(missingRepo, { mainFiles: { 'README.md': 'x\n' } })

      const result = await stage()

      expect({ ok: result.ok, stderr: result.stderr }).toEqual({
        ok: false,
        stderr: `error: ${missingRepo}: path '${path}' not found in ${missingRepo}@the default branch\n`
      })
    })

    test('Should fail, saying how to get repos/, when the repo cannot be cloned', async () => {
      mkdirSync(join(root, 'remotes'), { recursive: true })

      const result = await stage()

      expect({
        ok: result.ok,
        lastLine: result.stderr.trimEnd().split('\n').at(-1)
      }).toEqual({
        ok: false,
        lastLine: `error: cannot clone file://${join(root, 'remotes', `${missingRepo}.git`)} — offline? Run 'tim workspace setup' to clone repos/ instead.`
      })
    })
  })
})
