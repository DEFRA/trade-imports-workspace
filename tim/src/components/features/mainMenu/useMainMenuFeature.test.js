import { describe, test, expect, vi } from 'vitest'
import { createElement, useState } from 'react'
import { Text } from 'ink'
import { render } from 'ink-testing-library'
import { SCREENS } from '../../../constants/menuConfig.js'
import { useMainMenuFeature } from './useMainMenuFeature.js'

const stubFeature = (onSelect = () => {}) => ({
  routes: {},
  handleMainMenuSelect: onSelect
})

const defaults = () => ({
  workspace: stubFeature(),
  auth: stubFeature(),
  jira: stubFeature(),
  confluence: stubFeature(),
  docker: stubFeature(),
  start: stubFeature(),
  exit: () => {}
})

const Harness = ({ overrides = {}, onExit = () => {} }) => {
  const [screen] = useState(SCREENS.MAIN)
  const [screenData] = useState({})
  const feature = useMainMenuFeature({
    ...defaults(),
    ...overrides,
    exit: onExit
  })

  if (screen === SCREENS.WORKSPACE_MENU) {
    return createElement(Text, null, 'workspace-menu')
  }
  const route = feature.routes[screen]
  if (!route) return createElement(Text, null, `unknown:${screen}`)
  const props =
    typeof route.props === 'function' ? route.props(screenData) : route.props
  return createElement(route.component, props)
}

const dispatchValue = (value, overrides) => {
  const feature = useMainMenuFeature({ ...defaults(), ...overrides })
  const { items, onSelect } = feature.routes[SCREENS.MAIN].props
  const item = items.find((i) => i.value === value)
  expect(item).toBeDefined()
  onSelect(item)
}

describe('useMainMenuFeature', () => {
  test('lists every top-level command group on the main menu', () => {
    const { lastFrame } = render(createElement(Harness))

    const frame = lastFrame()
    for (const label of [
      'Workspace',
      'Docker',
      'Start',
      'Auth',
      'Jira',
      'Confluence',
      'Quit'
    ]) {
      expect(frame).toContain(label)
    }
  })

  test('lists no GitHub command group on the main menu', () => {
    const { lastFrame } = render(createElement(Harness))

    expect(lastFrame()).not.toContain('GitHub')
  })

  test('selecting Workspace hands control to the workspace feature', async () => {
    let opened = false
    const { stdin } = render(
      createElement(Harness, {
        overrides: {
          workspace: stubFeature(() => {
            opened = true
          })
        }
      })
    )

    stdin.write('\r')
    await vi.waitFor(() => expect(opened).toBe(true))
  })

  test.each([
    ['docker', 'Docker'],
    ['start', 'Start'],
    ['auth', 'Auth'],
    ['jira', 'Jira'],
    ['confluence', 'Confluence']
  ])('selecting %s hands control to the %s feature', async (value, label) => {
    let opened = false
    const Capture = () => {
      dispatchValue(value, {
        [value]: stubFeature(() => {
          opened = true
        })
      })
      return null
    }
    render(createElement(Capture))

    expect(label).toBeTruthy()
    await vi.waitFor(() => expect(opened).toBe(true))
  })

  test('selecting Quit calls the exit handler', async () => {
    let exited = false
    const Capture = () => {
      dispatchValue('quit', {
        exit: () => {
          exited = true
        }
      })
      return null
    }
    render(createElement(Capture))

    await vi.waitFor(() => expect(exited).toBe(true))
  })

  test('an unknown menu value is a silent no-op', () => {
    const features = defaults()
    const seen = []
    const wrap = (key) => stubFeature(() => seen.push(key))
    const Capture = () => {
      const feature = useMainMenuFeature({
        ...features,
        workspace: wrap('workspace'),
        docker: wrap('docker'),
        start: wrap('start'),
        auth: wrap('auth'),
        jira: wrap('jira'),
        confluence: wrap('confluence'),
        exit: () => seen.push('exit')
      })
      const { onSelect } = feature.routes[SCREENS.MAIN].props
      onSelect({ label: 'Mystery', value: 'mystery' })
      return null
    }
    render(createElement(Capture))

    expect(seen).toEqual([])
  })
})
