import { SCREENS } from '../../../constants/menuConfig.js'
import { runStackCommand } from '../../../stack/commands.js'
import { unmount } from '../../inkControl.js'
import MenuScreen from '../../common/screens/MenuScreen.js'

const DOCKER_ITEMS = [
  { label: 'Start the stack (run-stack.sh)', value: 'up' },
  {
    label: 'Start the stack from local source (run-stack.sh -d)',
    value: 'dev'
  },
  { label: 'Stop the stack (stop-stack.sh)', value: 'down' },
  { label: 'Restart the whole stack (tim docker restart)', value: 'restart' },
  {
    label: 'Bounce backend (tim docker bounce-backend)',
    value: 'bounce-backend'
  },
  { label: 'Back', value: 'back' }
]

const LOADING_LABELS = {
  up: 'docker compose up',
  dev: 'docker compose dev',
  down: 'docker compose down',
  restart: 'restart stack',
  'bounce-backend': 'bounce backend'
}

const defaultLaunchStackCommand = async ({ workspaceRoot, command }) => {
  unmount()
  const result = await runStackCommand({ workspaceRoot, command })
  process.exit(result.exitCode)
}

export const useDockerFeature = ({
  setScreen,
  setScreenData,
  setLoadingMessage,
  navigateToMain,
  workspaceRoot,
  launchStackCommand = defaultLaunchStackCommand
}) => {
  const launch = async (command) => {
    setLoadingMessage(`Handing control to ${LOADING_LABELS[command]}…`)
    setScreen(SCREENS.LOADING)
    try {
      await launchStackCommand({ workspaceRoot, command })
    } catch (error) {
      setScreenData({ error: error.message ?? String(error) })
      setScreen(SCREENS.ERROR)
    }
  }

  const handleDockerSelect = (item) => {
    if (item.value === 'back') return navigateToMain()
    if (LOADING_LABELS[item.value]) return launch(item.value)
  }

  const handleMainMenuSelect = () => setScreen(SCREENS.DOCKER_MENU)

  const routes = {
    [SCREENS.DOCKER_MENU]: {
      component: MenuScreen,
      props: {
        title: 'Docker',
        subtitle: 'Choose a stack action — control passes to it',
        items: DOCKER_ITEMS,
        onSelect: handleDockerSelect
      }
    }
  }

  return { routes, handleMainMenuSelect }
}
