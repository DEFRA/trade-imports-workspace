import { describe, test, expect, vi } from 'vitest'
import { createElement, useState, useEffect } from 'react'
import { Text } from 'ink'
import { render } from 'ink-testing-library'
import { SCREENS } from '../../../constants/menuConfig.js'
import LoadingScreen from '../../common/screens/LoadingScreen.js'
import { useJiraFeature } from './useJiraFeature.js'

const Harness = ({ getTicket, getComments, onReturn = () => {} }) => {
  const [screen, setScreen] = useState(SCREENS.JIRA_MENU)
  const [screenData, setScreenData] = useState({})
  const [loadingMessage, setLoadingMessage] = useState('')

  const feature = useJiraFeature({
    setScreen,
    setScreenData,
    setLoadingMessage,
    navigateToMain: onReturn,
    getTicket,
    getComments
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
  getTicket,
  getComments,
  action,
  onReturn = () => {}
}) => {
  const [screen, setScreen] = useState(SCREENS.JIRA_MENU)
  const [screenData, setScreenData] = useState({})
  const [loadingMessage, setLoadingMessage] = useState('')
  const feature = useJiraFeature({
    setScreen,
    setScreenData,
    setLoadingMessage,
    navigateToMain: onReturn,
    getTicket,
    getComments
  })
  useEffect(() => {
    const { items, onSelect } = feature.routes[SCREENS.JIRA_MENU].props
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

describe('useJiraFeature', () => {
  test('opens on a submenu with a Ticket lookup option and Back', () => {
    const { lastFrame } = render(
      createElement(Harness, { getTicket: async () => ({}) })
    )

    const frame = lastFrame()
    expect(frame).toContain('Jira')
    expect(frame).toMatch(/Look up a ticket/i)
    expect(frame).toContain('Back')
  })

  test('the submenu lists Read comments on a ticket', () => {
    const { lastFrame } = render(
      createElement(Harness, { getTicket: async () => ({}) })
    )

    expect(lastFrame()).toMatch(/Read comments on a ticket/i)
  })

  test('selecting Back returns to the main menu', async () => {
    let returned = false
    const BackHarness = () => {
      const [, setScreen] = useState(SCREENS.JIRA_MENU)
      const [, setScreenData] = useState({})
      const [, setLoadingMessage] = useState('')
      const feature = useJiraFeature({
        setScreen,
        setScreenData,
        setLoadingMessage,
        navigateToMain: () => {
          returned = true
        },
        getTicket: async () => ({})
      })
      const { items, onSelect } = feature.routes[SCREENS.JIRA_MENU].props
      const back = items.find((i) => i.value === 'back')
      onSelect(back)
      return null
    }
    render(createElement(BackHarness))

    await vi.waitFor(() => expect(returned).toBe(true))
  })

  test('selecting Ticket lookup opens the input screen', async () => {
    const { lastFrame } = render(
      createElement(RunActionHarness, {
        getTicket: async () => ({}),
        action: 'ticket'
      })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/Ticket id/i))
    expect(lastFrame()).toMatch(/EUDPA/i)
  })

  test('submitting a ticket id fetches the ticket and renders the result', async () => {
    const ticket = {
      id: 'EUDPA-200',
      summary: 'Build the CLI',
      status: 'In Dev',
      type: 'Story',
      assignee: 'Sam',
      priority: 'High',
      description: 'Plan + ship.'
    }
    const getTicket = async (id) => {
      expect(id).toBe('EUDPA-200')
      return ticket
    }

    const { stdin, lastFrame } = render(
      createElement(RunActionHarness, { getTicket, action: 'ticket' })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/Ticket id/i))
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('EUDPA-200')
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('\r')

    await vi.waitFor(() => expect(lastFrame()).toContain('Build the CLI'))
    expect(lastFrame()).toContain('In Dev')
    expect(lastFrame()).toContain('Sam')
  })

  test('blank input on the ticket prompt cancels back to the main menu', async () => {
    let returned = false
    const { stdin, lastFrame } = render(
      createElement(RunActionHarness, {
        getTicket: async () => ({}),
        action: 'ticket',
        onReturn: () => {
          returned = true
        }
      })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/Ticket id/i))
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('\r')

    await vi.waitFor(() => expect(returned).toBe(true))
  })

  test('a failed lookup shows the error screen with the client message', async () => {
    const getTicket = async () => {
      const err = new Error('EUDPA-NOPE: not found.')
      err.code = 'NOT_FOUND'
      throw err
    }
    const { stdin, lastFrame } = render(
      createElement(RunActionHarness, { getTicket, action: 'ticket' })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/Ticket id/i))
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('EUDPA-NOPE')
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('\r')

    await vi.waitFor(() => expect(lastFrame()).toMatch(/error:.*not found/i))
  })

  test('a non-Error throw from getTicket falls back to String(error)', async () => {
    const getTicket = async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'ticket kaboom'
    }
    const { stdin, lastFrame } = render(
      createElement(RunActionHarness, { getTicket, action: 'ticket' })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/Ticket id/i))
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('EUDPA-9')
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('\r')

    await vi.waitFor(() => expect(lastFrame()).toMatch(/error:ticket kaboom/))
  })

  test('selecting Read comments opens the input screen', async () => {
    const { lastFrame } = render(
      createElement(RunActionHarness, {
        getComments: async () => [],
        action: 'comments'
      })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/Ticket id/i))
    expect(lastFrame()).toMatch(/Read comments on a Jira ticket/i)
  })

  test('submitting a ticket id fetches comments and renders the result', async () => {
    const comments = [
      {
        id: '1',
        author: 'Sam',
        createdAt: '2026-06-09T10:00:00.000+0000',
        body: 'Started work on this.'
      },
      {
        id: '2',
        author: 'Alex',
        createdAt: '2026-06-09T11:30:00.000+0000',
        body: 'Reviewed the plan.'
      }
    ]
    const getComments = async (id) => {
      expect(id).toBe('EUDPA-200')
      return comments
    }

    const { stdin, lastFrame } = render(
      createElement(RunActionHarness, { getComments, action: 'comments' })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/Ticket id/i))
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('EUDPA-200')
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('\r')

    await vi.waitFor(() =>
      expect(lastFrame()).toContain('Comments on EUDPA-200')
    )
    expect(lastFrame()).toContain('Sam')
    expect(lastFrame()).toContain('Started work on this.')
    expect(lastFrame()).toContain('Alex')
    expect(lastFrame()).toContain('Reviewed the plan.')
  })

  test('blank input on the comments prompt cancels back to the main menu', async () => {
    let returned = false
    const { stdin, lastFrame } = render(
      createElement(RunActionHarness, {
        getComments: async () => [],
        action: 'comments',
        onReturn: () => {
          returned = true
        }
      })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/Ticket id/i))
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('\r')

    await vi.waitFor(() => expect(returned).toBe(true))
  })

  test('a non-Error throw from getComments falls back to String(error)', async () => {
    const getComments = async () => {
      // eslint-disable-next-line no-throw-literal
      throw 'comments kaboom'
    }
    const { stdin, lastFrame } = render(
      createElement(RunActionHarness, { getComments, action: 'comments' })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/Ticket id/i))
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('EUDPA-9')
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('\r')

    await vi.waitFor(() => expect(lastFrame()).toMatch(/error:comments kaboom/))
  })

  test('a failed comments fetch shows the error screen with the client message', async () => {
    const getComments = async () => {
      const error = new Error('EUDPA-NOPE: not found.')
      error.code = 'NOT_FOUND'
      throw error
    }
    const { stdin, lastFrame } = render(
      createElement(RunActionHarness, { getComments, action: 'comments' })
    )

    await vi.waitFor(() => expect(lastFrame()).toMatch(/Ticket id/i))
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('EUDPA-NOPE')
    await new Promise((resolve) => setTimeout(resolve, 50))
    stdin.write('\r')

    await vi.waitFor(() => expect(lastFrame()).toMatch(/error:.*not found/i))
  })
})
