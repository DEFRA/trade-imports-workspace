import { SCREENS } from '../../../constants/menuConfig.js'
import { probeAll } from '../../../commands/auth.js'
import AuthResultsScreen from './screens/AuthResultsScreen.js'

export const useAuthFeature = ({
  setScreen,
  setScreenData,
  setLoadingMessage,
  navigateToMain,
  probe = probeAll
}) => {
  const handleMainMenuSelect = async () => {
    setLoadingMessage('Checking sign-in for Jira and Confluence…')
    setScreen(SCREENS.LOADING)
    try {
      const results = await probe()
      setScreenData({ results })
      setScreen(SCREENS.AUTH_RESULTS)
    } catch (error) {
      setScreenData({ error: error.message ?? String(error) })
      setScreen(SCREENS.ERROR)
    }
  }

  const routes = {
    [SCREENS.AUTH_RESULTS]: {
      component: AuthResultsScreen,
      props: (screenData) => ({
        results: screenData.results ?? [],
        onReturn: navigateToMain
      })
    }
  }

  return { routes, handleMainMenuSelect }
}
