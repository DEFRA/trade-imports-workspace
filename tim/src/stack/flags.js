import {
  ALL_PROFILES,
  DOMAIN_NAMES,
  OPT_IN_PROFILES,
  SERVICES,
  STUB_LATENCY_PROFILES
} from './definition.js'

const SERVICE_LABELS = SERVICES.map(({ label }) => label)
const PROFILE_NAMES = [...ALL_PROFILES, ...OPT_IN_PROFILES]

/** `tim docker up --help`, and the start flags `dev` and `restart` take. */
export const START_USAGE = [
  'Usage: tim docker up [-b|--branch <name>] [-e|--exclude <label>]... [--profile <name>]... [--domain <name>] [-d|--dev] [--perf] [--force] [-- <docker compose up args>]',
  '',
  'Starts the workspace stack and waits until every service is healthy.',
  'Images are pulled fresh every time, so a stale :latest or branch tag',
  'never lags behind Dockerhub. tim docker dev is tim docker up -d.',
  '',
  '  -b, --branch <name>    The branch to look for on Dockerhub. A service',
  '                         whose image has a tag for this branch runs it;',
  '                         the rest run :latest. The tag is the branch name',
  '                         changed the way each repo publishes it, so',
  '                         feat/EUDPA-1-X becomes feat-eudpa-1-x. Cannot be',
  '                         used with --dev.',
  '  -e, --exclude <label>  Leave a repo-backed service out of the stack, to',
  '                         run it from your editor or npm. The other services',
  '                         reach it through host.docker.internal. Can be',
  '                         given more than once.',
  `                         Labels: ${SERVICE_LABELS.join(', ')}.`,
  '  --profile <name>       Start only the services in this profile. Can be',
  `                         given more than once. Profiles: ${PROFILE_NAMES.join(', ')}.`,
  `                         Without it, the stack starts ${ALL_PROFILES.join(', ')}.`,
  `                         ${OPT_IN_PROFILES.join(' and ')} start only when named.`,
  '                         A service whose dependency is in a profile you',
  '                         leave out will not have it, so use this only when',
  '                         you run that dependency yourself.',
  '  --domain <name>        Start only the services one test domain needs,',
  `                         instead of the whole stack. Domains: ${DOMAIN_NAMES.join(', ')}.`,
  '                         Use it to run the end-to-end suite for one domain',
  '                         on a machine the whole stack is too heavy for.',
  '                         Each domain names every service its specs reach,',
  '                         which is not the same as what compose starts by',
  '                         dependency, so prove a change with',
  '                         tim docker domain verify <name>.',
  '  -d, --dev              Build the repo-backed services from your local',
  '                         copies under repos/, with the source mounted.',
  '                         Node services reload by themselves. Java services',
  '                         reload too; after a pom.xml change run',
  '                         tim docker bounce-backend.',
  '  --perf                 Start the stack as a performance target: both stubs',
  '                         answer with the latency profile in STUB_PROFILE',
  `                         (${STUB_LATENCY_PROFILES.join(' or ')}, default sla). Uses the published`,
  '                         images unless you also give -d. Never use it for',
  "                         E2E runs: the build gate's stack runs without it.",
  '  --force                Go ahead under a lease or on a stack another clone',
  '                         started.',
  '  -h, --help             Show this help.',
  '',
  'Anything after -- is passed on to docker compose ... up.',
  '',
  'If docker manifest inspect starts failing after many runs, run docker',
  'login: Dockerhub limits how often an anonymous user can ask.',
  '',
  'Examples:',
  '  tim docker up',
  '  tim docker up -b feat/EUDPA-123',
  '  tim docker dev -e backend',
  '  tim docker up --profile database --profile infrastructure',
  ''
].join('\n')

/** A start flag that is wrong. `showUsage` asks for the usage after it. */
export class StartFlagError extends Error {
  constructor(message, { showUsage = false } = {}) {
    super(message)
    this.name = 'StartFlagError'
    this.showUsage = showUsage
  }
}

const VALUED_FLAGS = {
  '-b': 'branch',
  '--branch': 'branch',
  '-e': 'exclude',
  '--exclude': 'exclude',
  '--profile': 'profile',
  '--domain': 'domain'
}

const LONG_NAMES = {
  branch: '--branch',
  exclude: '--exclude',
  profile: '--profile',
  domain: '--domain'
}

const withValue = (flags, name, value) => {
  if (name === 'branch') return { ...flags, branch: value }
  if (name === 'domain') return { ...flags, domain: value }
  if (name === 'exclude') {
    return { ...flags, excluded: [...flags.excluded, value] }
  }
  return { ...flags, profiles: [...flags.profiles, value] }
}

const inlineValue = (arg) => {
  const match = /^--(branch|exclude|profile|domain)=(.*)$/s.exec(arg)
  return match ? { name: match[1], value: match[2] } : null
}

const readArgs = (args) => {
  let flags = {
    help: false,
    branch: '',
    excluded: [],
    profiles: [],
    domain: '',
    dev: false,
    perf: false,
    extra: []
  }
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    const valued = VALUED_FLAGS[arg]
    const inline = inlineValue(arg)
    if (valued) {
      if (index + 1 >= args.length) {
        throw new StartFlagError(
          `error: ${LONG_NAMES[valued]} requires a value`
        )
      }
      flags = withValue(flags, valued, args[index + 1])
      index += 1
    } else if (inline) {
      flags = withValue(flags, inline.name, inline.value)
    } else if (arg === '-d' || arg === '--dev') {
      flags = { ...flags, dev: true }
    } else if (arg === '--perf') {
      flags = { ...flags, perf: true }
    } else if (arg === '-h' || arg === '--help') {
      return { ...flags, help: true }
    } else if (arg === '--') {
      return { ...flags, extra: args.slice(index + 1) }
    } else {
      throw new StartFlagError(`error: unexpected argument: ${arg}`, {
        showUsage: true
      })
    }
  }
  return flags
}

const checkEach = (given, valid, describe) => {
  const unknown = given.find((value) => !valid.includes(value))
  if (unknown !== undefined) {
    throw new StartFlagError(
      `error: unknown ${describe} '${unknown}'; valid: ${valid.join(', ')}`
    )
  }
}

const checkFlags = (flags, env) => {
  if (flags.branch && flags.dev) {
    throw new StartFlagError('error: --branch and --dev are mutually exclusive')
  }
  if (
    flags.perf &&
    env.STUB_PROFILE &&
    !STUB_LATENCY_PROFILES.includes(env.STUB_PROFILE)
  ) {
    throw new StartFlagError(
      `error: STUB_PROFILE must be zero-delay or sla, not '${env.STUB_PROFILE}'`
    )
  }
  checkEach(flags.excluded, SERVICE_LABELS, '--exclude label')
  checkEach(flags.profiles, PROFILE_NAMES, '--profile name')
  if (flags.domain) checkEach([flags.domain], DOMAIN_NAMES, '--domain name')
}

/**
 * The start flags `tim docker up`, `dev` and `restart` take, read in order
 * the way the stack has always read them: -h or --help stops the reading,
 * and everything after `--` goes to docker compose up as it is. An empty
 * --branch value means no branch.
 *
 * @param {string[]} args
 * @param {object} [opts]
 * @param {Record<string, string | undefined>} [opts.env=process.env] - STUB_PROFILE is checked under --perf
 * @returns {{help: boolean, branch: string, excluded: string[], profiles: string[], domain: string, dev: boolean, perf: boolean, extra: string[]}}
 * @throws {StartFlagError} when a flag is unknown, lacks its value, names an unknown label, profile or domain, or clashes with another
 */
export const parseStartFlags = (args, { env = process.env } = {}) => {
  const flags = readArgs(args)
  if (!flags.help) checkFlags(flags, env)
  return flags
}
