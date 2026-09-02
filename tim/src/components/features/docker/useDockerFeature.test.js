import { describe, test, expect, vi } from 'vitest'
import { createElement, useState, useEffect } from 'react'
import { Text } from 'ink'
import { render } from 'ink-testing-library'
import { SCREENS } from '../../../constants/menuConfig.js'
import LoadingScreen from '../../common/screens/LoadingScreen.js'
import { useDockerFeature } from './useDockerFeature.js'

const Harness = ({ launchStackScript, workspaceRoot, onReturn = () => {} }) => {
  const [screen, setScreen] = useState(SCREENS.DOCKER_MENU)
  const [screenData, setScreenData] = useState({})
  const [loadingMessage, setLoadingMessage] = useState('')

  const feature = useDockerFeature({
    setScreen,
    setScreenData,
    setLoadingMessage,
    navigateToMain: onReturn,
    workspaceRoot,
    launchStackScript
  })

  if (screen === SCREENS.LOADING) {
    return createElement(LoadingScreen, { message: loadingMessage })
  }
  if (screen === SCREENS.ERROR) {
    return createElement(Text, null, `error:${screenData.error}`)
  }
  const route = feature.routes[screen]
  if (!route) return createElement(Text, null, `unknown:${screen}`)
  const props =
    typeof route.props === 'function' ? route.props(screenData) : route.props
  return createElement(route.component, props)
}

const RunActionHarness = ({
  launchStackScript,
  workspaceRoot,
  action,
  onReturn = () => {}
}) => {
  const [screen, setScreen] = useState(SCREENS.DOCKER_MENU)
  const [screenData, setScreenData] = useState({})
  const [loadingMessage, setLoadingMessage] = useState('')
  const feature = useDockerFeature({
    setScreen,
    setScreenData,
    setLoadingMessage,
    navigateToMain: onReturn,
    workspaceRoot,
    launchStackScript
  })
  useEffect(() => {
    const { items, onSelect } = feature.routes[SCREENS.DOCKER_MENU].props
    const item = items.find((i) => i.value === action)
    onSelect(item)
  }, [])
  if (screen === SCREENS.LOADING) {
    return createElement(LoadingScreen, { message: loadingMessage })
  }
  if (screen === SCREENS.ERROR) {
    return createElement(Text, null, `error:${screenData.error}`)
  }
  const route = feature.routes[screen]
  if (!route) return createElement(Text, null, `unknown:${screen}`)
  const props =
    typeof route.props === 'function' ? route.props(screenData) : route.props
  return createElement(route.component, props)
}

describe('useDockerFeature', () => {
  test('opens on a submenu listing every stack action and Back', () => {
    const { lastFrame } = render(
      createElement(Harness, {
        launchStackScript: async () => {},
        workspaceRoot: '/fake/workspace'
      })
    )

    const frame = lastFrame()
    expect(frame).toContain('Docker')
    for (const label of [
      'Start the stack',
      'Start the stack from local source',
      'Stop the stack',
      'Restart the whole stack',
      'Bounce backend',
      'Back'
    ]) {
      expect(frame).toContain(label)
    }
  })

  test('selecting Dev launches run-stack.sh with the -d flag', async () => {
    const captured = []
    const launchStackScript = async (spec) => {
      captured.push(spec)
    }

    const { lastFrame } = render(
      createElement(RunActionHarness, {
        launchStackScript,
        workspaceRoot: '/fake/workspace',
        action: 'dev'
      })
    )

    await vi.waitFor(() => expect(captured).toHaveLength(1))
    expect(captured[0]).toEqual({
      workspaceRoot: '/fake/workspace',
      script: 'run-stack.sh',
      args: ['-d']
    })
    await vi.waitFor(() => expect(lastFrame()).toMatch(/Handing control/i))
  })

  test('selecting Up launches run-stack.sh with no extra flags', async () => {
    const captured = []
    const launchStackScript = async (spec) => {
      captured.push(spec)
    }
    render(
      createElement(RunActionHarness, {
        launchStackScript,
        workspaceRoot: '/fake/workspace',
        action: 'up'
      })
    )

    await vi.waitFor(() => expect(captured).toHaveLength(1))
    expect(captured[0]).toEqual({
      workspaceRoot: '/fake/workspace',
      script: 'run-stack.sh',
      args: []
    })
  })

  test('selecting Down launches stop-stack.sh', async () => {
    const captured = []
    render(
      createElement(RunActionHarness, {
        launchStackScript: async (spec) => captured.push(spec),
        workspaceRoot: '/fake/workspace',
        action: 'down'
      })
    )

    await vi.waitFor(() => expect(captured).toHaveLength(1))
    expect(captured[0].script).toBe('stop-stack.sh')
  })

  test('selecting Bounce backend launches bounce-backend.sh', async () => {
    const captured = []
    render(
      createElement(RunActionHarness, {
        launchStackScript: async (spec) => captured.push(spec),
        workspaceRoot: '/fake/workspace',
        action: 'bounce-backend'
      })
    )

    await vi.waitFor(() => expect(captured).toHaveLength(1))
    expect(captured[0].script).toBe('bounce-backend.sh')
  })

  test('selecting Back returns to the main menu', async () => {
    let returned = false
    const BackHarness = () => {
      const [, setScreen] = useState(SCREENS.DOCKER_MENU)
      const [, setScreenData] = useState({})
      const [, setLoadingMessage] = useState('')
      const feature = useDockerFeature({
        setScreen,
        setScreenData,
        setLoadingMessage,
        navigateToMain: () => {
          returned = true
        },
        workspaceRoot: '/fake',
        launchStackScript: async () => {}
      })
      const { items, onSelect } = feature.routes[SCREENS.DOCKER_MENU].props
      onSelect(items.find((i) => i.value === 'back'))
      return null
    }
    render(createElement(BackHarness))

    await vi.waitFor(() => expect(returned).toBe(true))
  })

  test('a launch failure surfaces on the error screen', async () => {
    const launchStackScript = async () => {
      throw new Error('Cannot find run-stack.sh.')
    }
    const { lastFrame } = render(
      createElement(RunActionHarness, {
        launchStackScript,
        workspaceRoot: '/fake',
        action: 'up'
      })
    )

    await vi.waitFor(
      () => expect(lastFrame()).toMatch(/error:.*run-stack\.sh/),
      { timeout: 5000 }
    )
  })

  test('a non-Error throw from the launcher falls back to String(error)', async () => {
    const launchStackScript = async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'docker kaboom'
    }
    const { lastFrame } = render(
      createElement(RunActionHarness, {
        launchStackScript,
        workspaceRoot: '/fake',
        action: 'up'
      })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/error:docker kaboom/), {
      timeout: 5000
    })
  })
})
