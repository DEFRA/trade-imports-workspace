import { SCREENS } from '../../../constants/menuConfig.js'
import { runStackScript } from '../../../exec/stack.js'
import { unmount } from '../../inkControl.js'
import MenuScreen from '../../common/screens/MenuScreen.js'

const DOCKER_ITEMS = [
  { label: 'Start the stack (run-stack.sh)', value: 'up' },
  {
    label: 'Start the stack from local source (run-stack.sh -d)',
    value: 'dev'
  },
  { label: 'Stop the stack (stop-stack.sh)', value: 'down' },
  { label: 'Restart the whole stack (restart-stack.sh)', value: 'restart' },
  { label: 'Bounce backend (bounce-backend.sh)', value: 'bounce-backend' },
  { label: 'Back', value: 'back' }
]

const ACTION_SPEC = {
  up: { script: 'run-stack.sh', args: [], label: 'docker compose up' },
  dev: { script: 'run-stack.sh', args: ['-d'], label: 'docker compose dev' },
  down: { script: 'stop-stack.sh', args: [], label: 'docker compose down' },
  restart: { script: 'restart-stack.sh', args: [], label: 'restart stack' },
  'bounce-backend': {
    script: 'bounce-backend.sh',
    args: [],
    label: 'bounce backend'
  }
}

const defaultLaunchStackScript = async ({ workspaceRoot, script, args }) => {
  unmount()
  const result = await runStackScript({ workspaceRoot, script, args })
  process.exit(result.exitCode)
}

export const useDockerFeature = ({
  setScreen,
  setScreenData,
  setLoadingMessage,
  navigateToMain,
  workspaceRoot,
  launchStackScript = defaultLaunchStackScript
}) => {
  const launch = async (action) => {
    const spec = ACTION_SPEC[action]
    setLoadingMessage(`Handing control to ${spec.label}…`)
    setScreen(SCREENS.LOADING)
    try {
      await launchStackScript({
        workspaceRoot,
        script: spec.script,
        args: spec.args
      })
    } catch (error) {
      setScreenData({ error: error.message ?? String(error) })
      setScreen(SCREENS.ERROR)
    }
  }

  const handleDockerSelect = (item) => {
    if (item.value === 'back') return navigateToMain()
    if (ACTION_SPEC[item.value]) return launch(item.value)
  }

  const handleMainMenuSelect = () => setScreen(SCREENS.DOCKER_MENU)

  const routes = {
    [SCREENS.DOCKER_MENU]: {
      component: MenuScreen,
      props: {
        title: 'Docker',
        subtitle: 'Choose a stack action — control passes to the script',
        items: DOCKER_ITEMS,
        onSelect: handleDockerSelect
      }
    }
  }

  return { routes, handleMainMenuSelect }
}
