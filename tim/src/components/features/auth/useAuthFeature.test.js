import { describe, test, expect, vi } from 'vitest'
import { createElement, useState, useEffect } from 'react'
import { Text } from 'ink'
import { render } from 'ink-testing-library'
import { SCREENS } from '../../../constants/menuConfig.js'
import LoadingScreen from '../../common/screens/LoadingScreen.js'
import { useAuthFeature } from './useAuthFeature.js'

const Harness = ({ probe, onReturn = () => {} }) => {
  const [screen, setScreen] = useState(SCREENS.LOADING)
  const [screenData, setScreenData] = useState({})
  const [loadingMessage, setLoadingMessage] = useState('Loading')

  const feature = useAuthFeature({
    setScreen,
    setScreenData,
    setLoadingMessage,
    navigateToMain: onReturn,
    probe
  })

  useEffect(() => {
    feature.handleMainMenuSelect()
    // Run once on mount.
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

describe('useAuthFeature', () => {
  test('selecting Auth probes every service and renders the results screen', async () => {
    const results = [
      {
        service: 'jira',
        ok: false,
        error: { code: 'AUTH', message: 'Missing JIRA_TOKEN' }
      },
      { service: 'confluence', ok: true, user: { displayName: 'Sam F' } }
    ]
    const probe = async () => results

    const { lastFrame } = render(createElement(Harness, { probe }))

    await vi.waitFor(() => expect(lastFrame()).toContain('confluence'))
    const frame = lastFrame()
    expect(frame).toContain('jira')
    expect(frame).toContain('confluence')
    expect(frame).toContain('Missing JIRA_TOKEN')
  })

  test('a probe that throws surfaces the error screen', async () => {
    const probe = async () => {
      throw new Error('Jira is unavailable')
    }

    const { lastFrame } = render(createElement(Harness, { probe }))

    await vi.waitFor(() =>
      expect(lastFrame()).toMatch(/error:Jira is unavailable/)
    )
  })

  test('a probe that throws a non-Error value falls back to String(error)', async () => {
    const probe = async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'auth probe kaboom'
    }

    const { lastFrame } = render(createElement(Harness, { probe }))

    await vi.waitFor(() =>
      expect(lastFrame()).toMatch(/error:auth probe kaboom/)
    )
  })

  test('pressing Enter on the results screen returns to the main menu', async () => {
    const probe = async () => [
      { service: 'jira', ok: true, user: { displayName: 'Sam F' } }
    ]
    let returned = false
    const { stdin, lastFrame } = render(
      createElement(Harness, {
        probe,
        onReturn: () => {
          returned = true
        }
      })
    )

    await vi.waitFor(() => expect(lastFrame()).toContain('signed in'))
    await new Promise((resolve) => setTimeout(resolve, 30))
    stdin.write('\r')
    await vi.waitFor(() => expect(returned).toBe(true))
  })
})
