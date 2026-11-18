import { describe, test, expect, beforeEach, afterEach } from 'vitest'
import { execa } from 'execa'
import {
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  writeFileSync
} from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  allowed,
  deniedWith,
  guardBashCommand,
  runGuardHook
} from '../test-support/guard-hook.js'

const CHMOD =
  'chmod is blocked by policy (write-then-execute guard). If the execute bit is genuinely needed, the user can run it themselves: ! chmod ...'
const CHMOD_VIA_FIND_OR_XARGS =
  'chmod (via find -exec / xargs) is blocked by policy (write-then-execute guard). If genuinely needed, the user runs it: ! chmod ...'
const NO_VERIFY =
  'git commit --no-verify bypasses the pre-commit hooks. Fix what the hook flags rather than skipping it; if a hook is genuinely wrong, the user runs the commit themselves.'
const AMEND_PUSHED =
  'git commit --amend rewrites HEAD, but HEAD is already on a remote branch (pushed). Make a NEW commit instead of amending published history.'
const LITERAL_USERS_PATH =
  'Use ~/ instead of a literal /Users/<user>/ path — the permission matcher treats them as different prefixes, so /Users/ triggers avoidable prompts.'
const RAW_PLAYWRIGHT =
  "Use the project wrapper 'npm run test:docker-compose' rather than raw 'npx playwright test' — the wrapper does setup the raw invocation skips."
const CD_THEN_PUSH =
  "A 'cd' followed later by 'git push' in the same command runs the Sonar pre-push gate against the old directory, not the one being pushed, because the hook sees the working directory from before this command's own cd. It can skip the check or block the push over a failure in the wrong repo. Use 'git -C <path> push' in one command, or run 'cd <path>' and 'git push' as separate commands."
const CHAINED =
  "Prefer one command per Bash call — this chains commands with '&&'. Split into separate Bash calls; the tool result already carries each command's exit code."
const pipedTestRun = (projectDirShown) =>
  `Do not pipe a test run into tail, head or grep. The pipeline returns the trimmer's exit code, so a failed run reports exit 0, and the failure summary is cut off. Redirect the whole run to a file instead (for example: npm --prefix ${projectDirShown}/repos/<repo> test > ${projectDirShown}/workareas/<area>/test.log 2>&1), then read the file.`

const secretRead = (segment, reader) =>
  `Blocked: reading a secret/credential path (${segment}) via '${reader}'. Secrets must not be read through ad-hoc Bash readers. If genuinely needed, the user runs it themselves.`
const outsideGit = (first) =>
  `Blocked: '${first}' is an executable outside any git repository. Executables must live committed in a repo; otherwise ask the user to run it.`
const uncommitted = (relativePath, top) =>
  `Blocked: '${relativePath}' is not committed in ${top}. New executables must be committed (a visible, reviewable step) before they can run.`
const changedFromHead = (relativePath, top) =>
  `Blocked: '${relativePath}' differs from HEAD in ${top}. Commit the change before executing it.`

const READERS = [
  'jq',
  'grep',
  'egrep',
  'fgrep',
  'rg',
  'awk',
  'gawk',
  'file',
  'cut',
  'tr',
  'nl',
  'tac',
  'strings',
  'xxd',
  'od',
  'hexdump',
  'base64',
  'less',
  'more',
  'cmp',
  'comm',
  'paste',
  'join',
  'column'
]

const git = (cwd, ...args) =>
  execa(
    'git',
    [
      '-c',
      'user.name=tim-test',
      '-c',
      'user.email=tim-test@example.invalid',
      ...args
    ],
    { cwd }
  )

let baseDir

beforeEach(() => {
  baseDir = realpathSync(mkdtempSync(join(tmpdir(), 'tim-guard-bash-')))
})

afterEach(() => {
  rmSync(baseDir, { recursive: true, force: true })
})

const commandRun = (command, cwd) =>
  runGuardHook(guardBashCommand, {
    tool_input: { command },
    cwd: cwd ?? baseDir
  })

const repoWithCommittedScript = async () => {
  const repo = join(baseDir, 'repo')
  await execa('git', ['init', '--quiet', '-b', 'main', repo])
  writeFileSync(join(repo, 'run.sh'), 'echo run\n')
  await git(repo, 'add', 'run.sh')
  await git(repo, 'commit', '--quiet', '-m', 'add run script')
  return repo
}

const repoWithPushedHead = async () => {
  const repo = await repoWithCommittedScript()
  const origin = join(baseDir, 'origin.git')
  await execa('git', ['init', '--quiet', '--bare', origin])
  await git(repo, 'remote', 'add', 'origin', origin)
  await git(repo, 'push', '--quiet', 'origin', 'main')
  return repo
}

describe('guard-bash: input it leaves alone', () => {
  test('allows a hook input with no command', async () => {
    const result = await runGuardHook(guardBashCommand, { tool_input: {} })

    expect(result).toEqual(allowed)
  })

  test.each(['git status', 'ls -la', 'npm ci', 'cat .env', 'jq . .npmrc'])(
    'allows %s',
    async (command) => {
      expect(await commandRun(command)).toEqual(allowed)
    }
  )
})

describe('guard-bash: chmod', () => {
  test.each([
    'chmod +x run.sh',
    '/bin/chmod +x run.sh',
    'sudo chmod 600 key',
    'timeout 5 chmod +x run.sh',
    'nohup nice chmod +x run.sh',
    'MODE=1 chmod +x run.sh',
    '(chmod +x run.sh)',
    'echo ok; chmod +x run.sh',
    'echo $(chmod +x run.sh)'
  ])('denies %s', async (command) => {
    expect(await commandRun(command)).toEqual(deniedWith(CHMOD))
  })

  test.each([
    'find . -name "*.sh" -exec chmod +x {} ;',
    'find . -execdir /bin/chmod +x {} +',
    'ls | xargs chmod +x',
    'ls | xargs -0 -n1 chmod +x'
  ])('denies %s as chmod via find or xargs', async (command) => {
    expect(await commandRun(command)).toEqual(
      deniedWith(CHMOD_VIA_FIND_OR_XARGS)
    )
  })
})

describe('guard-bash: secret reads', () => {
  test.each(READERS)('denies %s reading a .env file', async (reader) => {
    const command = `${reader} TOKEN .env`

    expect(await commandRun(command)).toEqual(
      deniedWith(secretRead(command, reader))
    )
  })

  test.each([
    'jq . app.env',
    'jq . app.env.local',
    'jq . ~/.npmrc',
    'jq . ~/.netrc',
    'jq . ~/.aws/config',
    'jq . ~/.ssh/id_rsa',
    'jq . config/credentials',
    'jq . config/credentials.json',
    'jq . config/secrets',
    'jq . config/secrets.yaml'
  ])('denies %s', async (command) => {
    expect(await commandRun(command)).toEqual(
      deniedWith(secretRead(command, 'jq'))
    )
  })

  test('names the segment with its quotes removed', async () => {
    expect(await commandRun('grep -r "TOKEN" ".env"')).toEqual(
      deniedWith(secretRead('grep -r TOKEN .env', 'grep'))
    )
  })

  test('denies a secret read inside $( )', async () => {
    expect(await commandRun('echo $(awk 1 .env)')).toEqual(
      deniedWith(secretRead('awk 1 .env', 'awk'))
    )
  })

  test('denies a secret read inside backticks', async () => {
    expect(await commandRun('echo `xxd ~/.ssh/id_rsa`')).toEqual(
      deniedWith(secretRead('xxd ~/.ssh/id_rsa', 'xxd'))
    )
  })

  test('allows an option argument that names a secret path', async () => {
    expect(await commandRun('grep --exclude=.env -r TOKEN src')).toEqual(
      allowed
    )
  })

  test('denies a secret read after a pipe', async () => {
    expect(await commandRun('echo x | base64 .env')).toEqual(
      deniedWith(secretRead('base64 .env', 'base64'))
    )
  })
})

describe('guard-bash: executables run by path', () => {
  test('denies an executable outside any git repository', async () => {
    writeFileSync(join(baseDir, 'tool.sh'), 'echo tool\n')

    expect(await commandRun('./tool.sh')).toEqual(
      deniedWith(outsideGit('./tool.sh'))
    )
  })

  test('denies a quoted executable outside any git repository', async () => {
    writeFileSync(join(baseDir, 'tool.sh'), 'echo tool\n')

    expect(await commandRun('"./tool.sh"')).toEqual(
      deniedWith(outsideGit('./tool.sh'))
    )
  })

  test('denies an executable not committed in its repository', async () => {
    const repo = await repoWithCommittedScript()
    writeFileSync(join(repo, 'new.sh'), 'echo new\n')

    expect(await commandRun('./new.sh', repo)).toEqual(
      deniedWith(uncommitted('new.sh', repo))
    )
  })

  test('denies an executable that differs from HEAD', async () => {
    const repo = await repoWithCommittedScript()
    writeFileSync(join(repo, 'run.sh'), 'echo changed\n')

    expect(await commandRun('./run.sh', repo)).toEqual(
      deniedWith(changedFromHead('run.sh', repo))
    )
  })

  test('allows a committed executable that matches HEAD', async () => {
    const repo = await repoWithCommittedScript()

    expect(await commandRun('./run.sh', repo)).toEqual(allowed)
  })

  test('allows a committed executable named by absolute path', async () => {
    const repo = await repoWithCommittedScript()

    expect(await commandRun(`${repo}/run.sh --flag`, baseDir)).toEqual(allowed)
  })

  test('resolves a relative executable against PWD when the input has no cwd', async () => {
    const repo = await repoWithCommittedScript()
    writeFileSync(join(repo, 'new.sh'), 'echo new\n')

    const result = await runGuardHook(
      guardBashCommand,
      { tool_input: { command: './new.sh' } },
      { cwd: repo, env: { PWD: repo } }
    )

    expect(result).toEqual(deniedWith(uncommitted('new.sh', repo)))
  })

  test.each(['~/tool.sh', '$HOME/tool.sh'])(
    'expands %s against HOME',
    async (first) => {
      const home = join(baseDir, 'home')
      mkdirSync(home)
      writeFileSync(join(home, 'tool.sh'), 'echo tool\n')

      const result = await runGuardHook(
        guardBashCommand,
        { tool_input: { command: first }, cwd: baseDir },
        { env: { HOME: home } }
      )

      expect(result).toEqual(deniedWith(outsideGit(first)))
    }
  )

  test('allows an uncommitted executable under node_modules', async () => {
    const binDir = join(baseDir, 'node_modules', '.bin')
    mkdirSync(binDir, { recursive: true })
    writeFileSync(join(binDir, 'tool'), 'echo tool\n')

    expect(await commandRun('./node_modules/.bin/tool')).toEqual(allowed)
  })

  test.each(['/usr/bin/env node -v', './missing.sh'])(
    'allows %s',
    async (command) => {
      expect(await commandRun(command)).toEqual(allowed)
    }
  )
})

describe('guard-bash: git commit', () => {
  test('denies git commit --no-verify', async () => {
    expect(await commandRun('git commit -m "wip" --no-verify')).toEqual(
      deniedWith(NO_VERIFY)
    )
  })

  test('denies git commit --amend when HEAD is on a remote branch', async () => {
    const repo = await repoWithPushedHead()

    expect(await commandRun('git commit --amend --no-edit', repo)).toEqual(
      deniedWith(AMEND_PUSHED)
    )
  })

  test('allows git commit --amend when HEAD is not pushed', async () => {
    const repo = await repoWithPushedHead()
    writeFileSync(join(repo, 'more.txt'), 'more\n')
    await git(repo, 'add', 'more.txt')
    await git(repo, 'commit', '--quiet', '-m', 'local only')

    expect(await commandRun('git commit --amend --no-edit', repo)).toEqual(
      allowed
    )
  })
})

describe('guard-bash: command shape', () => {
  test('denies a literal /Users/<user>/ path', async () => {
    expect(await commandRun('ls /Users/someone/notes')).toEqual(
      deniedWith(LITERAL_USERS_PATH)
    )
  })

  test('denies npx playwright test', async () => {
    expect(await commandRun('npx playwright test --project chromium')).toEqual(
      deniedWith(RAW_PLAYWRIGHT)
    )
  })

  test.each(['cd ../repo; git push', 'cd ../repo && git push origin main'])(
    'denies %s as cd before git push',
    async (command) => {
      expect(await commandRun(command)).toEqual(deniedWith(CD_THEN_PUSH))
    }
  )

  test.each(['git -C ../repo push', 'cd ../repo'])(
    'allows %s',
    async (command) => {
      expect(await commandRun(command)).toEqual(allowed)
    }
  )

  test('denies commands chained with an unquoted &&', async () => {
    expect(await commandRun('npm ci && npm run build')).toEqual(
      deniedWith(CHAINED)
    )
  })

  test.each([`awk '$1 && $2' data.txt`, 'echo "a && b"'])(
    'allows %s, whose && is quoted',
    async (command) => {
      expect(await commandRun(command)).toEqual(allowed)
    }
  )
})

describe('guard-bash: test runs piped into a trimmer', () => {
  const pipedCommands = [
    'npm test | tail -20',
    'npm t | grep FAIL',
    'npm --prefix tim test | head',
    'npm run test:unit 2>&1 | head -50',
    'npx vitest run |& grep FAIL',
    'mvn verify | tail',
    './mvnw verify | egrep ERROR',
    'npx playwright show-report | rg passed'
  ]

  const pipedCommandRunInSecondClone = async (command) => {
    const home = join(baseDir, 'home')
    const projectDir = join(home, 'clones', 'second-clone')
    mkdirSync(projectDir, { recursive: true })

    return runGuardHook(
      guardBashCommand,
      { tool_input: { command }, cwd: baseDir },
      { env: { HOME: home, CLAUDE_PROJECT_DIR: projectDir } }
    )
  }

  const openingSentenceOf = (reason) => reason.split('. ').at(0)

  test.each(pipedCommands)('denies %s', async (command) => {
    const { exitCode, decision } = await pipedCommandRunInSecondClone(command)

    expect({
      exitCode,
      permissionDecision: decision?.hookSpecificOutput.permissionDecision,
      openingSentence: openingSentenceOf(
        decision?.hookSpecificOutput.permissionDecisionReason ?? ''
      )
    }).toEqual({
      exitCode: 0,
      permissionDecision: 'deny',
      openingSentence: 'Do not pipe a test run into tail, head or grep'
    })
  })

  test.fails.each(pipedCommands)(
    'denies %s, naming the clone in use under ~',
    async (command) => {
      const result = await pipedCommandRunInSecondClone(command)

      expect(result).toEqual(deniedWith(pipedTestRun('~/clones/second-clone')))
    }
  )

  test.each([
    'npm test > test.log 2>&1',
    'git log | head',
    'npm test | tee test.log'
  ])('allows %s', async (command) => {
    expect(await commandRun(command)).toEqual(allowed)
  })
})
