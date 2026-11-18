import { Command } from 'commander'
import { createSonarClient } from '../../clients/sonar-client.js'
import { failOpenAction, failOpenCommand } from '../hook-runtime.js'

const unreachableSonarCloud = 'http://127.0.0.1:9'

const behaviours = {
  answer: () => '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit"}}\n',
  silent: () => '',
  throw: () => {
    throw new Error('the hook broke')
  },
  offline: async () => {
    const client = createSonarClient({ baseUrl: unreachableSonarCloud })
    await client.listPullRequests('trade-imports-animals-frontend')
    return 'reached SonarCloud\n'
  },
  hang: () => new Promise(() => setInterval(() => {}, 1000)),
  'stray-rejection': () => {
    setTimeout(() => Promise.reject(new Error('stray')), 10)
    return new Promise(() => setInterval(() => {}, 1000))
  }
}

const program = new Command().name('fail-open-program')

failOpenCommand(
  program
    .command('hook')
    .requiredOption('--behaviour <name>')
    .action(
      failOpenAction(({ behaviour }) => behaviours[behaviour](), {
        timeoutMs: 1000
      })
    )
)

program.parse(process.argv)
