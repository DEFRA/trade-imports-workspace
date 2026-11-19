import { markWorkspaceRoot } from '../../../test-support/workspace-marker.js'
import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest'
import { createElement, useState, useEffect } from 'react'
import { Text } from 'ink'
import { render } from 'ink-testing-library'
import { mkdtemp, mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { SCREENS } from '../../../constants/menuConfig.js'
import LoadingScreen from '../../common/screens/LoadingScreen.js'
import { useWorkspaceFeature } from './useWorkspaceFeature.js'

const createFakeWorkspace = async () => {
  const root = await mkdtemp(join(tmpdir(), 'tim-ws-'))
  await mkdir(join(root, 'repos'))
  markWorkspaceRoot(root)
  return root
}

const Harness = ({
  workspaceRoot,
  onReturn = () => {},
  runners,
  cleanRunner
}) => {
  const [screen, setScreen] = useState(SCREENS.WORKSPACE_MENU)
  const [screenData, setScreenData] = useState({})
  const [loadingMessage, setLoadingMessage] = useState('')

  const navigateToMain = () => onReturn()

  const feature = useWorkspaceFeature({
    setScreen,
    setScreenData,
    setLoadingMessage,
    navigateToMain,
    workspaceRoot,
    ...(runners ? { runners } : {}),
    ...(cleanRunner ? { cleanRunner } : {})
  })

  if (screen === SCREENS.LOADING) {
    return createElement(LoadingScreen, { message: loadingMessage })
  }

  const route = feature.routes[screen]
  if (!route) return createElement(Text, null, `unknown:${screen}`)
  const props =
    typeof route.props === 'function' ? route.props(screenData) : route.props
  return createElement(route.component, props)
}

const stubBuilders = (overrides = {}) => ({
  install: () => [],
  lint: () => [],
  test: () => [],
  setup: () => [],
  update: () => [],
  reset: () => [],
  ...overrides
})

let fakeRoot

beforeAll(async () => {
  fakeRoot = await createFakeWorkspace()
})

afterAll(async () => {
  await rm(fakeRoot, { recursive: true, force: true })
})

const ProbeStatusOutputRoute = ({ workspaceRoot, onProbe }) => {
  const [, setScreen] = useState(SCREENS.WORKSPACE_STATUS_OUTPUT)
  const [, setScreenData] = useState({})
  const [, setLoadingMessage] = useState('')
  const feature = useWorkspaceFeature({
    setScreen,
    setScreenData,
    setLoadingMessage,
    navigateToMain: () => {},
    workspaceRoot
  })
  const route = feature.routes[SCREENS.WORKSPACE_STATUS_OUTPUT]
  onProbe(route.props({}))
  return null
}

describe('useWorkspaceFeature', () => {
  test('status-output route falls back to an empty list when no statuses are present in screenData', () => {
    let probedProps
    render(
      createElement(ProbeStatusOutputRoute, {
        workspaceRoot: '/tmp/anything',
        onProbe: (props) => {
          probedProps = props
        }
      })
    )

    expect(probedProps).toEqual({
      statuses: [],
      onReturn: expect.any(Function)
    })
  })

  test('opens on the workspace menu with Status and Back options', () => {
    const { lastFrame } = render(
      createElement(Harness, { workspaceRoot: fakeRoot })
    )

    const frame = lastFrame()
    expect(frame).toContain('Workspace')
    expect(frame).toContain('Status')
    expect(frame).toContain('Back')
  })

  test('selecting Back returns the user to the main menu', async () => {
    let returnedToMain = false
    const BackHarness = ({ workspaceRoot, onReturn }) => {
      const [, setScreen] = useState(SCREENS.WORKSPACE_MENU)
      const [, setScreenData] = useState({})
      const [, setLoadingMessage] = useState('')
      const feature = useWorkspaceFeature({
        setScreen,
        setScreenData,
        setLoadingMessage,
        navigateToMain: onReturn,
        workspaceRoot
      })
      const { items, onSelect } = feature.routes[SCREENS.WORKSPACE_MENU].props
      const backItem = items.find((item) => item.value === 'back')
      expect(backItem).toBeDefined()
      onSelect(backItem)
      return null
    }

    render(
      createElement(BackHarness, {
        workspaceRoot: fakeRoot,
        onReturn: () => {
          returnedToMain = true
        }
      })
    )

    await vi.waitFor(() => expect(returnedToMain).toBe(true))
  })

  test('selecting Status renders the status output for every repo', async () => {
    const { stdin, lastFrame } = render(
      createElement(Harness, { workspaceRoot: fakeRoot })
    )

    stdin.write('\r')

    await vi.waitFor(() => expect(lastFrame()).toContain('Workspace status'))
    const frame = lastFrame()
    expect(frame).toContain('trade-imports-animals-frontend')
    expect(frame).toContain('trade-imports-animals-backend')
    expect(frame).toContain('Not cloned')
  })

  test('selecting Status when the workspace is invalid surfaces an error screen', async () => {
    let capturedError
    const ErrorHarness = ({ workspaceRoot }) => {
      const [screen, setScreen] = useState(SCREENS.WORKSPACE_MENU)
      const [screenData, setScreenData] = useState({})
      const [, setLoadingMessage] = useState('')
      const feature = useWorkspaceFeature({
        setScreen,
        setScreenData,
        setLoadingMessage,
        navigateToMain: () => {},
        workspaceRoot
      })
      if (screen === SCREENS.ERROR) {
        capturedError = screenData.error
        return createElement(Text, null, `error:${screenData.error}`)
      }
      const route = feature.routes[screen]
      const props =
        typeof route.props === 'function'
          ? route.props(screenData)
          : route.props
      return createElement(route.component, props)
    }

    const bogusRoot = join(tmpdir(), 'tim-not-a-workspace-' + Date.now())
    const { stdin } = render(
      createElement(ErrorHarness, { workspaceRoot: bogusRoot })
    )

    stdin.write('\r')
    await vi.waitFor(() => expect(capturedError).toBeTruthy())
    expect(capturedError).toMatch(/workspace/i)
  })

  const RunVerbHarness = ({ workspaceRoot, runners, cleanRunner, verb }) => {
    const [screen, setScreen] = useState(SCREENS.WORKSPACE_MENU)
    const [screenData, setScreenData] = useState({})
    const [loadingMessage, setLoadingMessage] = useState('')
    const feature = useWorkspaceFeature({
      setScreen,
      setScreenData,
      setLoadingMessage,
      navigateToMain: () => {},
      workspaceRoot,
      ...(runners ? { runners } : {}),
      ...(cleanRunner ? { cleanRunner } : {})
    })
    useEffect(() => {
      const { items, onSelect } = feature.routes[SCREENS.WORKSPACE_MENU].props
      const item = items.find((i) => i.value === verb)
      onSelect(item)
    }, [])
    if (screen === SCREENS.LOADING) {
      return createElement(LoadingScreen, { message: loadingMessage })
    }
    const route = feature.routes[screen]
    if (!route) return createElement(Text, null, `unknown:${screen}`)
    const props =
      typeof route.props === 'function' ? route.props(screenData) : route.props
    return createElement(route.component, props)
  }

  test('selecting Install builds tasks and renders the parallel progress screen', async () => {
    const installTasks = [
      {
        id: 'trade-imports-animals-frontend',
        repo: 'trade-imports-animals-frontend',
        label: 'trade-imports-animals-frontend — npm ci',
        run: async () => ({
          repo: 'trade-imports-animals-frontend',
          label: 'trade-imports-animals-frontend — npm ci',
          ok: true,
          exitCode: 0,
          durationMs: 12,
          stderrTail: null
        })
      },
      {
        id: 'trade-imports-animals-backend',
        repo: 'trade-imports-animals-backend',
        label: 'trade-imports-animals-backend — mvn install -DskipTests',
        run: async () => ({
          repo: 'trade-imports-animals-backend',
          label: 'trade-imports-animals-backend — mvn install -DskipTests',
          ok: false,
          exitCode: 1,
          durationMs: 34,
          stderrTail: 'BUILD FAILURE'
        })
      }
    ]
    const runners = stubBuilders({ install: () => installTasks })

    const { lastFrame } = render(
      createElement(RunVerbHarness, {
        workspaceRoot: fakeRoot,
        runners,
        verb: 'install'
      })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/1 passed, 1 failed/i))
    const frame = lastFrame()
    expect(frame).toContain('trade-imports-animals-frontend')
    expect(frame).toContain('trade-imports-animals-backend')
    expect(frame).toMatch(/failed/i)
    expect(frame).toContain('BUILD FAILURE')
  })

  test('selecting Clean handles sync results that report ok directly', async () => {
    const cleanResults = [
      { repo: 'trade-imports-animals-frontend', ok: true, removed: true }
    ]
    const cleanRunner = async () => cleanResults

    const { lastFrame } = render(
      createElement(RunVerbHarness, {
        workspaceRoot: fakeRoot,
        cleanRunner,
        verb: 'clean'
      })
    )

    await vi.waitFor(() =>
      expect(lastFrame()).toContain('trade-imports-animals-frontend')
    )
    expect(lastFrame()).toMatch(/done/i)
  })

  test('a failing clean runner surfaces the message on the error screen', async () => {
    const cleanRunner = async () => {
      throw new Error('rm exploded')
    }
    const ErrorHarness = ({ workspaceRoot }) => {
      const [screen, setScreen] = useState(SCREENS.WORKSPACE_MENU)
      const [screenData, setScreenData] = useState({})
      const [, setLoadingMessage] = useState('')
      const feature = useWorkspaceFeature({
        setScreen,
        setScreenData,
        setLoadingMessage,
        navigateToMain: () => {},
        workspaceRoot,
        cleanRunner
      })
      useEffect(() => {
        const { items, onSelect } = feature.routes[SCREENS.WORKSPACE_MENU].props
        const cleanItem = items.find((item) => item.value === 'clean')
        onSelect(cleanItem)
      }, [])
      if (screen === SCREENS.ERROR) {
        return createElement(Text, null, `error:${screenData.error}`)
      }
      if (screen === SCREENS.LOADING) {
        return createElement(Text, null, 'loading')
      }
      const route = feature.routes[screen]
      const props =
        typeof route.props === 'function'
          ? route.props(screenData)
          : route.props
      return createElement(route.component, props)
    }

    const { lastFrame } = render(
      createElement(ErrorHarness, { workspaceRoot: fakeRoot })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/error:rm exploded/))
  })

  test('a failing builder surfaces the message on the error screen', async () => {
    const runners = stubBuilders({
      install: () => {
        throw new Error('builder exploded')
      }
    })
    const ErrorHarness = ({ workspaceRoot }) => {
      const [screen, setScreen] = useState(SCREENS.WORKSPACE_MENU)
      const [screenData, setScreenData] = useState({})
      const [, setLoadingMessage] = useState('')
      const feature = useWorkspaceFeature({
        setScreen,
        setScreenData,
        setLoadingMessage,
        navigateToMain: () => {},
        workspaceRoot,
        runners
      })
      useEffect(() => {
        const { items, onSelect } = feature.routes[SCREENS.WORKSPACE_MENU].props
        const installItem = items.find((item) => item.value === 'install')
        onSelect(installItem)
      }, [])
      if (screen === SCREENS.ERROR) {
        return createElement(Text, null, `error:${screenData.error}`)
      }
      if (screen === SCREENS.LOADING) {
        return createElement(Text, null, 'loading')
      }
      const route = feature.routes[screen]
      const props =
        typeof route.props === 'function'
          ? route.props(screenData)
          : route.props
      return createElement(route.component, props)
    }

    const { lastFrame } = render(
      createElement(ErrorHarness, { workspaceRoot: fakeRoot })
    )

    await vi.waitFor(() =>
      expect(lastFrame()).toMatch(/error:builder exploded/)
    )
  })

  test('a non-Error throw from a builder falls back to String(error)', async () => {
    const runners = stubBuilders({
      install: () => {
        // eslint-disable-next-line no-throw-literal
        throw 'workspace kaboom'
      }
    })
    const ErrorHarness = ({ workspaceRoot }) => {
      const [screen, setScreen] = useState(SCREENS.WORKSPACE_MENU)
      const [screenData, setScreenData] = useState({})
      const [, setLoadingMessage] = useState('')
      const feature = useWorkspaceFeature({
        setScreen,
        setScreenData,
        setLoadingMessage,
        navigateToMain: () => {},
        workspaceRoot,
        runners
      })
      useEffect(() => {
        const { items, onSelect } = feature.routes[SCREENS.WORKSPACE_MENU].props
        const installItem = items.find((item) => item.value === 'install')
        onSelect(installItem)
      }, [])
      if (screen === SCREENS.ERROR) {
        return createElement(Text, null, `error:${screenData.error}`)
      }
      if (screen === SCREENS.LOADING) {
        return createElement(Text, null, 'loading')
      }
      const route = feature.routes[screen]
      const props =
        typeof route.props === 'function'
          ? route.props(screenData)
          : route.props
      return createElement(route.component, props)
    }

    const { lastFrame } = render(
      createElement(ErrorHarness, { workspaceRoot: fakeRoot })
    )

    await vi.waitFor(() =>
      expect(lastFrame()).toMatch(/error:workspace kaboom/)
    )
  })

  const BranchHarness = ({ workspaceRoot, branchRunner, input }) => {
    const [screen, setScreen] = useState(SCREENS.WORKSPACE_MENU)
    const [screenData, setScreenData] = useState({})
    const [, setLoadingMessage] = useState('')
    const feature = useWorkspaceFeature({
      setScreen,
      setScreenData,
      setLoadingMessage,
      navigateToMain: () => {},
      workspaceRoot,
      branchRunner
    })
    useEffect(() => {
      feature.routes[SCREENS.WORKSPACE_BRANCH_INPUT].props.onSubmit(input)
    }, [])
    if (screen === SCREENS.ERROR) {
      return createElement(Text, null, `error:${screenData.error}`)
    }
    if (screen === SCREENS.LOADING) return createElement(Text, null, 'loading')
    const route = feature.routes[screen]
    if (!route) return createElement(Text, null, `unknown:${screen}`)
    const props =
      typeof route.props === 'function' ? route.props(screenData) : route.props
    return createElement(route.component, props)
  }

  const appliedOutcome = {
    kind: 'applied',
    branch: 'feat/EUDPA-1-alpha',
    ticket: 'EUDPA-1',
    dryRun: false,
    repos: [
      {
        repo: 'trade-imports-animals-frontend',
        from: 'main',
        target: 'feat/EUDPA-1-alpha',
        action: 'switched',
        fetchFailed: false,
        uncommitted: 2,
        stashed: true,
        worktreePath: null,
        exitCode: 0,
        stderrTail: null,
        ok: true
      }
    ]
  }

  test('the workspace menu offers a Branch action', () => {
    const { lastFrame } = render(
      createElement(Harness, { workspaceRoot: fakeRoot })
    )

    expect(lastFrame()).toContain('Branch')
  })

  test('submitting a branch renders the per-repo outcome and the stash warning', async () => {
    const { lastFrame } = render(
      createElement(BranchHarness, {
        workspaceRoot: fakeRoot,
        branchRunner: async () => appliedOutcome,
        input: 'EUDPA-1'
      })
    )

    await vi.waitFor(() =>
      expect(lastFrame()).toContain('Switched to feat/EUDPA-1-alpha (EUDPA-1)')
    )
    const frame = lastFrame()
    expect(frame).toContain('switched from main (work stashed)')
    expect(frame).toContain('Work stashed in: trade-imports-animals-frontend')
  })

  test('an ambiguous ticket lands on the error screen listing the candidates', async () => {
    const { lastFrame } = render(
      createElement(BranchHarness, {
        workspaceRoot: fakeRoot,
        branchRunner: async () => ({
          kind: 'ambiguous',
          input: 'EUDPA-2',
          ticket: 'EUDPA-2',
          candidates: [
            { branch: 'feat/EUDPA-2-beta', repos: ['trade-imports-stub'] },
            { branch: 'feat/EUDPA-2-gamma', repos: ['trade-imports-stub'] }
          ]
        }),
        input: 'EUDPA-2'
      })
    )

    await vi.waitFor(() =>
      expect(lastFrame()).toMatch(/EUDPA-2 matches 2 branches/)
    )
    expect(lastFrame()).toContain('Run again with the full branch name.')
  })

  test('a throwing branch runner surfaces the message on the error screen', async () => {
    const { lastFrame } = render(
      createElement(BranchHarness, {
        workspaceRoot: fakeRoot,
        branchRunner: async () => {
          throw new Error('git exploded')
        },
        input: 'EUDPA-1'
      })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/error:git exploded/))
  })

  test('a non-Error throw from statusCollector falls back to String(error)', async () => {
    const statusCollector = async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'status kaboom'
    }
    const ErrorHarness = ({ workspaceRoot }) => {
      const [screen, setScreen] = useState(SCREENS.WORKSPACE_MENU)
      const [screenData, setScreenData] = useState({})
      const [, setLoadingMessage] = useState('')
      const feature = useWorkspaceFeature({
        setScreen,
        setScreenData,
        setLoadingMessage,
        navigateToMain: () => {},
        workspaceRoot,
        statusCollector
      })
      useEffect(() => {
        const { items, onSelect } = feature.routes[SCREENS.WORKSPACE_MENU].props
        const statusItem = items.find((item) => item.value === 'status')
        onSelect(statusItem)
      }, [])
      if (screen === SCREENS.ERROR) {
        return createElement(Text, null, `error:${screenData.error}`)
      }
      if (screen === SCREENS.LOADING) {
        return createElement(Text, null, 'loading')
      }
      const route = feature.routes[screen]
      const props =
        typeof route.props === 'function'
          ? route.props(screenData)
          : route.props
      return createElement(route.component, props)
    }

    const { lastFrame } = render(
      createElement(ErrorHarness, { workspaceRoot: fakeRoot })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/error:status kaboom/))
  })
})
