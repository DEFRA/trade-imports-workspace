import { register as registerDependabot } from './dependabot.js'
import { register as registerDrift } from './drift.js'
import { register as registerEvidence } from './evidence.js'
import { register as registerHolds } from './holds.js'
import { register as registerPolicy } from './policy.js'
import { register as registerVersions } from './versions.js'

export const register = (program, { timVersion }) => {
  const deps = program
    .command('deps')
    .description(
      'Packages that must move together, from config/dependency-sets.json: the Dependabot config generated from them, the merge policy for an upgrade, the changelog evidence a changelog-driven upgrade needs, the packages held at their current version, and the versions a registry has published'
    )

  registerDependabot(deps, { timVersion })
  registerPolicy(deps, { timVersion })
  registerEvidence(deps, { timVersion })
  registerHolds(deps, { timVersion })
  registerDrift(deps, { timVersion })
  registerVersions(deps, { timVersion })
}
