import { Argument } from 'commander'
import { OK, ERROR } from '../../constants/exitCodes.js'
import { resolveWorkspaceRoot } from '../../env/workspace-root.js'
import { DOMAIN_NAMES, servicesForDomain } from '../../stack/definition.js'
import {
  runSuiteAgainstStack,
  verifyDomain,
  verifyLines
} from '../../stack/domain-verify.js'
import { terminalOutput } from '../../stack/services.js'
import { jsonEnvelope } from '../envelope.js'

const emit = (text) => process.stdout.write(`${text}\n`)
const emitError = (text) => process.stderr.write(`${text}\n`)

const listDomains = (timVersion, json) => {
  const result = DOMAIN_NAMES.map((domain) => ({
    domain,
    services: servicesForDomain(domain)
  }))
  if (json) {
    emit(JSON.stringify(jsonEnvelope({ ok: true, result, timVersion })))
  } else {
    for (const { domain, services } of result) {
      emit(`${domain} (${services.length})`)
      for (const service of services) emit(`  ${service}`)
    }
  }
  process.exit(OK)
}

const runVerify = async ({ domain, options, globalOpts, timVersion }) => {
  const json = globalOpts.json
  const output = terminalOutput()
  try {
    const workspaceRoot = resolveWorkspaceRoot({
      explicit: globalOpts.workspace
    })
    const result = await verifyDomain({
      domain,
      againstFull: Boolean(options.againstFull),
      runPhase: ({ domain: phaseDomain, script }) =>
        runSuiteAgainstStack({
          workspaceRoot,
          domain: phaseDomain,
          script,
          output,
          workers: options.workers
        })
    })
    if (json) {
      emit(JSON.stringify(jsonEnvelope({ ok: true, result, timVersion })))
    } else {
      for (const line of verifyLines(result)) emit(line)
    }
    process.exit(result.comparison.sufficient ? OK : ERROR)
  } catch (error) {
    if (json) {
      emit(
        JSON.stringify(
          jsonEnvelope({
            ok: false,
            timVersion,
            error: { code: 'ERROR', message: error.message }
          })
        )
      )
    } else {
      emitError(`error: ${error.message}`)
    }
    process.exit(ERROR)
  }
}

export const registerDomain = (docker, timVersion) => {
  const domain = docker
    .command('domain')
    .description(
      'The services each test domain needs, and whether they are enough. tim docker up --domain <name> starts one domain instead of the whole stack, which is 22 containers. A domain lists every service its specs reach, which is not the same as what compose resolves through depends_on, so verify proves the list by running the suite against it.'
    )

  domain
    .command('list')
    .description('List each domain and the services it starts')
    .action(function listAction() {
      listDomains(timVersion, this.optsWithGlobals().json)
    })

  domain
    .command('verify')
    .description(
      'Run one domain suite against that domain services alone and report every spec that did not pass. Exits 1 when any did. Takes the stack up and down itself, so no lease may be held.'
    )
    .addArgument(new Argument('<domain>', 'The domain').choices(DOMAIN_NAMES))
    .option(
      '--against-full',
      'Also run the suite against the whole stack, to tell a missing service from a spec that is broken anyway'
    )
    .option('--workers <count>', 'Passed to Playwright as --workers')
    .addHelpText(
      'after',
      '\nExamples:\n  tim docker domain verify plants\n  tim docker domain verify animals-admin --against-full --workers 2'
    )
    .action(async function verifyAction(domainName, options) {
      await runVerify({
        domain: domainName,
        options,
        globalOpts: this.optsWithGlobals(),
        timVersion
      })
    })
}
