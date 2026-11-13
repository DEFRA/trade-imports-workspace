import { describe, test, expect, afterEach } from 'vitest'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { syncDependabotConfig } from './dependabot-file.js'
import { renderDependabotConfig } from './dependabot.js'
import {
  createDepsWorkspace,
  fixtureDependencySets
} from '../test-support/deps-workspace.js'

const REPO = 'trade-imports-animals-frontend'
const CONFIG_PATH = join('repos', REPO, '.github', 'dependabot.yml')

let root

afterEach(() => {
  if (root) rmSync(root, { recursive: true, force: true })
  root = undefined
})

const generated = () =>
  renderDependabotConfig({
    repo: REPO,
    dependencySets: fixtureDependencySets()
  })

const seedConfig = (text) => {
  mkdirSync(join(root, 'repos', REPO, '.github'))
  writeFileSync(join(root, CONFIG_PATH), text)
}

describe('#syncDependabotConfig', () => {
  test('Should return the generated text without writing it in print mode', () => {
    root = createDepsWorkspace()

    const result = syncDependabotConfig({
      workspaceRoot: root,
      repo: REPO,
      mode: 'print'
    })

    expect({
      result,
      fileExists: existsSync(join(root, CONFIG_PATH))
    }).toEqual({
      result: {
        repo: REPO,
        path: CONFIG_PATH,
        mode: 'print',
        upToDate: false,
        written: false,
        content: generated()
      },
      fileExists: false
    })
  })

  test('Should write the generated text into the repo in write mode', () => {
    root = createDepsWorkspace()

    const result = syncDependabotConfig({
      workspaceRoot: root,
      repo: REPO,
      mode: 'write'
    })

    expect({
      written: result.written,
      onDisk: readFileSync(join(root, CONFIG_PATH), 'utf8')
    }).toEqual({ written: true, onDisk: generated() })
  })

  test('Should leave a file that already matches untouched in write mode', () => {
    root = createDepsWorkspace()
    seedConfig(generated())

    const result = syncDependabotConfig({
      workspaceRoot: root,
      repo: REPO,
      mode: 'write'
    })

    expect({ upToDate: result.upToDate, written: result.written }).toEqual({
      upToDate: true,
      written: false
    })
  })

  test('Should report a hand-edited file as out of date in check mode and leave it as it is', () => {
    root = createDepsWorkspace()
    const handEdited = generated().replace('default-days: 3', 'default-days: 1')
    seedConfig(handEdited)

    const result = syncDependabotConfig({
      workspaceRoot: root,
      repo: REPO,
      mode: 'check'
    })

    expect({
      upToDate: result.upToDate,
      onDisk: readFileSync(join(root, CONFIG_PATH), 'utf8')
    }).toEqual({ upToDate: false, onDisk: handEdited })
  })

  test('Should refuse a repo the sets do not cover, listing the repos they do', () => {
    root = createDepsWorkspace({ cloned: ['trade-imports-animals-backend'] })

    expect(() =>
      syncDependabotConfig({
        workspaceRoot: root,
        repo: 'trade-imports-animals-backend',
        mode: 'print'
      })
    ).toThrow(
      expect.objectContaining({
        code: 'USAGE',
        message:
          'trade-imports-animals-backend is not in scope for the dependency sets. Repos in scope: tim, trade-imports-animals-frontend.'
      })
    )
  })

  test('Should refuse a repo in scope that is not cloned under repos/', () => {
    root = createDepsWorkspace({ cloned: [] })

    expect(() =>
      syncDependabotConfig({ workspaceRoot: root, repo: 'tim', mode: 'print' })
    ).toThrow(
      expect.objectContaining({
        code: 'NOT_FOUND',
        message:
          "Can't find tim under repos/. This command writes Dependabot config for repos cloned there."
      })
    )
  })
})
