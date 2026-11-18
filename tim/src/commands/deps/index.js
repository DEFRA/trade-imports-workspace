import { register as registerDependabot } from './dependabot.js'
import { register as registerEvidence } from './evidence.js'
import { register as registerPolicy } from './policy.js'

export const register = (program, { timVersion }) => {
  const deps = program
    .command('deps')
    .description(
      'Packages that must move together, from config/dependency-sets.json: the Dependabot config generated from them, the merge policy for an upgrade, and the changelog evidence a changelog-driven upgrade needs'
    )

  registerDependabot(deps, { timVersion })
  registerPolicy(deps, { timVersion })
  registerEvidence(deps, { timVersion })
}
