import { createElement, useState } from 'react'
import { useApp } from 'ink'
import { SCREENS } from '../constants/menuConfig.js'
import { useWorkspaceFeature } from './features/workspace/useWorkspaceFeature.js'
import { useAuthFeature } from './features/auth/useAuthFeature.js'
import { useJiraFeature } from './features/jira/useJiraFeature.js'
import { useConfluenceFeature } from './features/confluence/useConfluenceFeature.js'
import { useDockerFeature } from './features/docker/useDockerFeature.js'
import { useStartFeature } from './features/start/useStartFeature.js'
import { useMainMenuFeature } from './features/mainMenu/useMainMenuFeature.js'
import LoadingScreen from './common/screens/LoadingScreen.js'
import ErrorScreen from './common/screens/ErrorScreen.js'

/**
 * Top-level Ink orchestrator for the interactive menu.
 *
 * Every injectable prop overrides the default integration used by one
 * feature hook. Defaults call the real library client (or shell script
 * launcher); pass an override in tests to stub the boundary without
 * mocking the module. Each override forwards to the same-named option
 * on `use<Name>Feature.js` — see those hooks for the full prop list.
 *
 * @param {object} [props]
 * @param {string} [props.initialScreen] - Starting screen id (defaults to the main menu)
 * @param {string} [props.workspaceRoot] - Override the resolved workspace root used by workspace, docker and start features
 * @param {() => Promise<Array<{service: string, ok: boolean, [k: string]: any}>>} [props.probe] - Override `useAuthFeature` probe; defaults to `auth.probeAll`
 * @param {(id: string) => Promise<object>} [props.getTicket] - Override `useJiraFeature` ticket fetch; defaults to `jiraClient.getTicket`
 * @param {(id: string) => Promise<object>} [props.getPage] - Override `useConfluenceFeature` page fetch; defaults to `confluenceClient.getPage`
 * @param {(opts: {workspaceRoot: string, script: string, args: string[]}) => Promise<void>} [props.launchStackScript] - Override `useDockerFeature` stack launcher; defaults to unmount + `runStackScript` + `process.exit`
 * @param {(opts: {workspaceRoot: string, service: string}) => Promise<void>} [props.launchService] - Override `useStartFeature` service launcher; defaults to unmount + `startService` + `process.exit`
 */
const MainMenu = ({
  initialScreen = SCREENS.MAIN,
  workspaceRoot,
  probe,
  getTicket,
  getPage,
  launchStackScript,
  launchService
} = {}) => {
  const { exit } = useApp()
  const [screen, setScreen] = useState(initialScreen)
  const [screenData, setScreenData] = useState({})
  const [loadingMessage, setLoadingMessage] = useState('')

  const navigateToMain = () => {
    setScreen(SCREENS.MAIN)
    setScreenData({})
  }

  const workspace = useWorkspaceFeature({
    setScreen,
    setScreenData,
    setLoadingMessage,
    navigateToMain,
    workspaceRoot
  })

  const auth = useAuthFeature({
    setScreen,
    setScreenData,
    setLoadingMessage,
    navigateToMain,
    ...(probe ? { probe } : {})
  })

  const jira = useJiraFeature({
    setScreen,
    setScreenData,
    setLoadingMessage,
    navigateToMain,
    ...(getTicket ? { getTicket } : {})
  })

  const confluence = useConfluenceFeature({
    setScreen,
    setScreenData,
    setLoadingMessage,
    navigateToMain,
    ...(getPage ? { getPage } : {})
  })

  const docker = useDockerFeature({
    setScreen,
    setScreenData,
    setLoadingMessage,
    navigateToMain,
    workspaceRoot,
    ...(launchStackScript ? { launchStackScript } : {})
  })

  const start = useStartFeature({
    setScreen,
    setScreenData,
    setLoadingMessage,
    navigateToMain,
    workspaceRoot,
    ...(launchService ? { launchService } : {})
  })

  const mainMenu = useMainMenuFeature({
    workspace,
    auth,
    jira,
    confluence,
    docker,
    start,
    exit
  })

  if (screen === SCREENS.LOADING) {
    return createElement(LoadingScreen, { message: loadingMessage })
  }
  if (screen === SCREENS.ERROR) {
    return createElement(ErrorScreen, {
      error: screenData.error,
      onReturn: navigateToMain
    })
  }

  const routes = {
    ...workspace.routes,
    ...auth.routes,
    ...jira.routes,
    ...confluence.routes,
    ...docker.routes,
    ...start.routes,
    ...mainMenu.routes
  }
  const route = routes[screen]
  if (!route) return null
  const props =
    typeof route.props === 'function' ? route.props(screenData) : route.props
  return createElement(route.component, props)
}

export default MainMenu
