import { join } from 'node:path'

// docker/stack/compose.yml's `name:`. Every container the stack starts
// carries it as its compose project label.
export const STACK_PROJECT = 'trade-imports'

/**
 * The repo-backed services: the short label `-e` takes, the compose service
 * name, and the variable that carries its image tag into the compose files.
 */
export const SERVICES = [
  {
    label: 'frontend',
    composeName: 'trade-imports-animals-frontend',
    tagVariable: 'TRADE_IMPORTS_ANIMALS_FRONTEND'
  },
  {
    label: 'backend',
    composeName: 'trade-imports-animals-backend',
    tagVariable: 'TRADE_IMPORTS_ANIMALS_BACKEND'
  },
  {
    label: 'admin',
    composeName: 'trade-imports-animals-admin',
    tagVariable: 'TRADE_IMPORTS_ANIMALS_ADMIN'
  },
  {
    label: 'ins-frontend',
    composeName: 'trade-imports-ins-frontend',
    tagVariable: 'TRADE_IMPORTS_INS_FRONTEND'
  },
  {
    label: 'routing-proxy',
    composeName: 'trade-imports-routing-proxy',
    tagVariable: 'TRADE_IMPORTS_ROUTING_PROXY'
  },
  {
    label: 'stub',
    composeName: 'trade-imports-stub',
    tagVariable: 'TRADE_IMPORTS_STUB'
  },
  {
    label: 'defra-id-stub',
    composeName: 'trade-imports-defra-id-stub',
    tagVariable: 'TRADE_IMPORTS_DEFRA_ID_STUB'
  },
  {
    label: 'reference-data',
    composeName: 'trade-imports-reference-data',
    tagVariable: 'TRADE_IMPORTS_REFERENCE_DATA'
  },
  {
    label: 'address-book',
    composeName: 'trade-imports-address-book',
    tagVariable: 'TRADE_IMPORTS_ADDRESS_BOOK'
  },
  {
    label: 'gateway',
    composeName: 'trade-imports-dynamics-gateway',
    tagVariable: 'TRADE_IMPORTS_DYNAMICS_GATEWAY'
  },
  {
    label: 'ins-backend',
    composeName: 'trade-imports-ins-backend',
    tagVariable: 'TRADE_IMPORTS_INS_BACKEND'
  },
  {
    label: 'plants-frontend',
    composeName: 'trade-imports-plants-frontend',
    tagVariable: 'TRADE_IMPORTS_PLANTS_FRONTEND'
  },
  {
    label: 'plants-backend',
    composeName: 'trade-imports-plants-backend',
    tagVariable: 'TRADE_IMPORTS_PLANTS_BACKEND'
  }
]

/**
 * A sidecar publishes its service's host port and proxies to that service,
 * so excluding the service takes the sidecar with it. Left in, the sidecar
 * holds the port the natively-run service binds and forwards to a container
 * that is no longer up. `loss` is what a host-side run of the service loses.
 */
export const SIDECARS = [
  {
    label: 'frontend',
    composeName: 'animals-frontend-nginx',
    loss: "host port 3000 is the natively-run frontend's, and /upload-and-scan is no longer proxied to cdp-uploader"
  }
]

/** The compose files every stack command names, in this order. */
export const COMPOSE_FILES = [
  'compose.yml',
  'database.compose.yml',
  'infrastructure.compose.yml',
  'stubs.compose.yml',
  'backend.compose.yml',
  'frontend.compose.yml',
  'security.compose.yml',
  'monitoring.compose.yml'
]

/** Builds the repo-backed services from local source under repos/. */
export const DEV_COMPOSE_FILE = 'dev.compose.yml'

/**
 * Puts both stubs on a latency profile. Only a performance run adds it: the
 * build gate's stack must stay on zero delay.
 */
export const PERF_COMPOSE_FILE = 'perf.compose.yml'

/** The profiles a stack starts with when none is named. */
export const ALL_PROFILES = [
  'database',
  'infrastructure',
  'servicebus',
  'stubs',
  'backend',
  'frontend'
]

/**
 * Profiles that start only when named. Nothing in the default stack needs
 * ZAP (security), and Prometheus with Grafana (monitoring) is only for
 * looking at meters locally.
 */
export const OPT_IN_PROFILES = ['security', 'monitoring']

/** The values STUB_PROFILE may take in a performance run. */
export const STUB_LATENCY_PROFILES = ['zero-delay', 'sla']

/**
 * The services every domain needs, whichever one you start: the databases
 * and queues each backend writes to and specs read from, the session cache
 * every frontend uses, and the sign-in stub all four UIs go through.
 */
export const CORE_SERVICES = [
  'mongodb',
  'redis',
  'floci',
  'floci-init',
  'trade-imports-defra-id-stub',
  'trade-imports-address-book'
]

/**
 * What each test domain in trade-imports-ins-tests needs on top of the core,
 * so `--domain` can start one domain's suite instead of the whole stack.
 *
 * A domain lists every service its specs reach, not only the ones compose
 * resolves through `depends_on`, and not only its own. The graphs differ in
 * two ways. A service can be called over HTTP at request time with no
 * `depends_on` edge, as the admin UI's DLQ page calls the dynamics gateway.
 * And a domain's specs can drive another domain's frontend: animals-admin
 * seeds its notifications through the animals frontend, and ins drives the
 * animals and plants journeys. Only plants stays within itself.
 *
 * Each of those was found by running a suite without a service, never by
 * reading the compose files. See
 * docs/analysis/local-stack-domain-subsets.md, and prove a change here with
 * `tim docker domain verify <name>`.
 */
export const DOMAIN_SERVICES = {
  animals: [
    'trade-imports-animals-frontend',
    'animals-frontend-nginx',
    'trade-imports-animals-backend',
    'trade-imports-reference-data',
    'trade-imports-stub',
    'cdp-uploader',
    'trade-imports-animals-admin',
    'trade-imports-ins-frontend',
    'trade-imports-ins-backend'
  ],
  'animals-admin': [
    'trade-imports-animals-admin',
    'trade-imports-animals-backend',
    'trade-imports-dynamics-gateway',
    'toxiproxy',
    'servicebus-emulator',
    'mssql',
    'trade-imports-animals-frontend',
    'animals-frontend-nginx',
    'trade-imports-reference-data',
    'trade-imports-stub',
    'cdp-uploader'
  ],
  ins: [
    'trade-imports-ins-frontend',
    'trade-imports-ins-backend',
    'trade-imports-routing-proxy',
    'trade-imports-reference-data',
    'trade-imports-stub',
    'trade-imports-animals-frontend',
    'animals-frontend-nginx',
    'trade-imports-animals-backend',
    'cdp-uploader',
    'trade-imports-plants-frontend',
    'trade-imports-plants-backend'
  ],
  plants: [
    'trade-imports-plants-frontend',
    'trade-imports-plants-backend',
    'trade-imports-reference-data',
    'trade-imports-stub'
  ]
}

/** The domains `--domain` takes. */
export const DOMAIN_NAMES = Object.keys(DOMAIN_SERVICES)

/**
 * Every compose service one domain's stack runs: its own and the core.
 *
 * @param {string} domain - One of {@link DOMAIN_NAMES}
 * @returns {string[]} Compose service names, sorted
 */
export const servicesForDomain = (domain) =>
  [...CORE_SERVICES, ...(DOMAIN_SERVICES[domain] ?? [])].sort()

/**
 * Every compose service a stack for these domains runs, with no repeats.
 * Naming every domain gives the whole stack.
 *
 * @param {string[]} domains - Any of {@link DOMAIN_NAMES}
 * @returns {string[]} Compose service names, sorted
 */
export const servicesForDomains = (domains) => [
  ...new Set(domains.flatMap((domain) => servicesForDomain(domain)).sort())
]

/**
 * The folder holding the stack's compose files.
 *
 * @param {string} workspaceRoot
 * @returns {string}
 */
export const stackDir = (workspaceRoot) =>
  join(workspaceRoot, 'docker', 'stack')
