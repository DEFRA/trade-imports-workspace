import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { TimError } from '../errors.js'
import { writeJsonAtomic } from '../review/store.js'
import { utcSeconds } from '../commands/refine/workarea.js'
import { detectTechPerRepo } from './repo-tech.js'
import { planningDir } from './workarea.js'

const reposInPlanMeta = (metaPath) => {
  try {
    const { repos } = JSON.parse(readFileSync(metaPath, 'utf8'))
    return (Array.isArray(repos) ? repos : [])
      .map((entry) => entry?.repo)
      .filter((repo) => typeof repo === 'string' && repo !== '')
  } catch {
    return []
  }
}

const revalidateRepos = async ({ workspaceRoot, repos, log }) => {
  if (repos.length === 0) return []
  await log('')
  await log('Re-validating detect-tech per repo...')
  return detectTechPerRepo({ workspaceRoot, repos, log })
}

/**
 * Checks a ticket's plan is there, detects the technologies again for the
 * repos its `.plan-meta.json` names (or for `repo` alone), and writes
 * `.implement-meta.json` beside the plan.
 *
 * @param {object} args
 * @param {string} args.workspaceRoot
 * @param {string} args.ticket
 * @param {string} [args.repo] - Detects for this repo in place of the meta's list
 * @param {(line: string) => Promise<void>} [args.log] - Receives each progress line
 * @param {() => Date} [args.now]
 * @returns {Promise<{directory: string, planPath: string, meta: object}>}
 * @throws {TimError} NOT_FOUND when the ticket has no plan.md
 */
export const prepareImplement = async ({
  workspaceRoot,
  ticket,
  repo,
  log = async () => {},
  now = () => new Date()
}) => {
  const directory = planningDir(workspaceRoot, ticket)
  const planPath = join(directory, 'plan.md')
  if (!statSync(planPath, { throwIfNoEntry: false })?.isFile()) {
    throw new TimError(
      'NOT_FOUND',
      `Error: plan not found at ${planPath} — run PLANNER first`
    )
  }
  await log(`Plan present: ${planPath}`)

  const repos = repo
    ? [repo]
    : reposInPlanMeta(join(directory, '.plan-meta.json'))
  const meta = {
    ticket,
    plan: 'plan.md',
    validated_at: utcSeconds(now()),
    repos: await revalidateRepos({ workspaceRoot, repos, log })
  }
  writeJsonAtomic(join(directory, '.implement-meta.json'), meta)
  return { directory, planPath, meta }
}
