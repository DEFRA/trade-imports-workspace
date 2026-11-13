import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { rosterOf, realRepoPath } from '../../constants/repos.js'
import { run } from '../../exec/exec.js'
import { runAcross } from '../../exec/parallel.js'
import { makeTaskAction, toResultRecord } from './_task-output.js'

const hasLintScript = (dir) => {
  const pkgPath = join(dir, 'package.json')
  if (!existsSync(pkgPath)) return false
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    return Boolean(pkg.scripts?.lint)
  } catch {
    return false
  }
}

export const buildLintTasks = (workspaceRoot) => {
  const tasks = []
  for (const repo of rosterOf(workspaceRoot).nodeRepos) {
    const dir = realRepoPath(workspaceRoot, repo)
    if (!hasLintScript(dir)) continue
    const task = { id: repo, repo, label: `${repo} — npm run lint` }
    task.run = async () =>
      toResultRecord(task, await run('npm', ['--prefix', dir, 'run', 'lint']), {
        stderrSource: 'stderr-or-stdout'
      })
    tasks.push(task)
  }
  return tasks
}

export const lintAll = (workspaceRoot) =>
  runAcross(buildLintTasks(workspaceRoot), (task) => task.run())

export const register = (parent, { timVersion }) => {
  parent
    .command('lint')
    .description('Run lint in every Node.js repo that has a lint script')
    .action(makeTaskAction({ runTasks: lintAll, timVersion }))
}
