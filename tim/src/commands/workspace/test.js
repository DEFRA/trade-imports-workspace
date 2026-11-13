import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { rosterOf, repoPath, realRepoPath } from '../../constants/repos.js'
import { run } from '../../exec/exec.js'
import { runSerial } from '../../exec/parallel.js'
import { makeTaskAction, toResultRecord } from './_task-output.js'

const hasTestScript = (dir) => {
  const pkgPath = join(dir, 'package.json')
  if (!existsSync(pkgPath)) return false
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    return Boolean(pkg.scripts?.test)
  } catch {
    return false
  }
}

export const buildTestTasks = (workspaceRoot) => {
  const { nodeRepos, javaRepos, unitTestExemptRepos } = rosterOf(workspaceRoot)
  const tasks = []
  for (const repo of nodeRepos) {
    if (unitTestExemptRepos.includes(repo)) continue
    const dir = realRepoPath(workspaceRoot, repo)
    if (!hasTestScript(dir)) continue
    const task = { id: repo, repo, label: `${repo} — npm test` }
    task.run = async () =>
      toResultRecord(task, await run('npm', ['--prefix', dir, 'test']), {
        stderrSource: 'stderr-or-stdout'
      })
    tasks.push(task)
  }
  for (const repo of javaRepos) {
    const dir = repoPath(workspaceRoot, repo)
    const pom = join(dir, 'pom.xml')
    if (!existsSync(pom)) continue
    const task = { id: repo, repo, label: `${repo} — mvn verify` }
    task.run = async () =>
      toResultRecord(task, await run('mvn', ['-f', pom, 'verify']), {
        stderrSource: 'stderr-or-stdout'
      })
    tasks.push(task)
  }
  return tasks
}

export const testAll = (workspaceRoot) =>
  runSerial(buildTestTasks(workspaceRoot), (task) => task.run())

export const register = (parent, { timVersion }) => {
  parent
    .command('test')
    .description(
      'Run tests in every repo that has them (npm test for Node, mvn verify for Java) — serial'
    )
    .action(makeTaskAction({ runTasks: testAll, timVersion }))
}
