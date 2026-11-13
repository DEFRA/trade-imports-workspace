import { register as registerDependabot } from './dependabot.js'

export const register = (program, { timVersion }) => {
  const deps = program
    .command('deps')
    .description(
      'Packages that must move together, from config/dependency-sets.json, and the Dependabot config generated from them'
    )

  registerDependabot(deps, { timVersion })
}
