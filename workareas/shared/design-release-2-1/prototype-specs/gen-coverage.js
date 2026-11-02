// Builds the route → test → states table in COVERAGE.md from the collected
// trace index (pages each test visited) and the evidence index (states shot).
const fs = require('fs')
const path = require('path')

const BASE = '/design-release-2.1'
const traces = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'sources', 'traces-prototype', 'index.json'), 'utf8'))
const evidence = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'evidence', 'prototype', 'index.json'), 'utf8'))

// Every GET route in the DR2.1 mount a user can land on (app/routes.js, copied
// by version-mount.js), with the DR2.1 override view it renders, if any.
const ROUTES = [
  ['/', 'dashboard-home'], ['/index', '(shared index)'], ['/dashboard', 'redirect'],
  ['/live-animals', 'dashboard'], ['/germinal-products', 'dashboard'],
  ['/actions', 'dashboard-actions'], ['/changes', 'dashboard-changes'], ['/inspection', 'dashboard-inspection'],
  ['/create-notification', 'redirect'], ['/notification-type', 'notification-type'],
  ['/origin-of-the-import', 'origin-of-the-import'], ['/what-are-you-importing', 'what-are-you-importing'],
  ['/prototype/reason-for-import', 'redirect'], ['/reason-for-import', 'reason-for-import'],
  ['/consignment-details', 'consignment-details'], ['/animal-identification-details', 'animal-identification-details'],
  ['/additional-animal-details', 'additional-animal-details'], ['/arrival-details', 'arrival-details'],
  ['/transit-countries', 'transit-countries'], ['/transport-details', 'redirect'], ['/transporter', 'transporter'],
  ['/transporter/add', 'transporter-add'], ['/transporter/add/private', 'transporter-add-private'],
  ['/transporter/add/commercial', 'transporter-add-commercial'], ['/upload-documents', 'upload-documents'],
  ['/roles-and-addresses', 'roles-and-addresses'],
  ['/place-of-origin', 'consignment-address-select'], ['/consignor-or-exporter', 'consignment-address-select'],
  ['/consignee', 'consignment-address-select'], ['/importer', 'consignment-address-select'],
  ['/place-of-destination', 'consignment-address-select'],
  ['/place-of-origin/add-address', 'consignment-add-address'], ['/consignor-or-exporter/add-address', 'consignment-add-address'],
  ['/consignee/add-address', 'consignment-add-address'], ['/importer/add-address', 'consignment-add-address'],
  ['/place-of-destination/add-address', 'consignment-add-address'],
  ['/cph-number', 'cph-number'], ['/permanent-address', 'redirect'], ['/permanent-address/select', 'permanent-address-animals'],
  ['/permanent-address/enter-address', 'redirect'], ['/contact-address-for-consignment', 'contact-address-for-consignment'],
  ['/notification-hub', 'notification-hub'], ['/review-notification', 'review-notification'],
  ['/declaration', 'declaration'], ['/notification-submitted', 'notification-submitted'],
  ['/notifications/delete', 'delete-notification'], ['/notifications/amend', 'redirect'],
  ['/notifications/cancel-amend', 'redirect'], ['/notifications/copy-as-new', 'redirect'],
  ['/templates', 'dashboard-templates'], ['/templates/create', 'create-template'], ['/templates/save', 'redirect'],
  ['/templates/discard', 'delete-template'], ['/templates/:templateId', 'view-template'],
  ['/templates/:templateId/change/:section', 'redirect'], ['/templates/:templateId/use', 'redirect'],
  ['/templates/:templateId/edit', 'redirect'], ['/templates/:templateId/delete', 'delete-template'],
  ['/address-book', '(shared address-book)'], ['/address-book/add', '(shared address-book-add)'],
  ['/address-book/add/lookup', '(shared address-book-lookup / consignment-add-address)'],
  ['/address-book/add/usage', '(shared address-book-add-usage)'], ['/address-book/:addressId', '(shared address-book-view)'],
  ['/address-book/:addressId/edit', '(shared address-book edit)'], ['/address-book/:addressId/delete', 'delete-address']
]

function toRegex (route) {
  const pattern = route === '/'
    ? ''
    : route.replace(/\./g, '\\.').replace(/:[a-zA-Z]+/g, '(?!create$|save$|discard$|add$)[^/]+')
  return new RegExp(`^${BASE.replace(/\./g, '\\.')}${pattern}$`)
}

const used = (p) => p.replace(/^POST /, '').split('?')[0]
const rows = ROUTES.map(([route, view]) => {
  const re = toRegex(route)
  const tests = traces.filter((t) => t.pages.some((p) => re.test(used(p))))
  const states = [...new Set(evidence.filter((e) => re.test(used(e.url))).map((e) => e.file.replace(/\.png$/, '')))]
  const testCell = tests.length
    ? `${tests.length} test(s), e.g. \`${tests[0].spec}\` › ${tests[0].test.replace(/\|/g, '/')}`
    : '**not visited**'
  return `| \`${BASE}${route === '/' ? '' : route}\` | ${view} | ${testCell} | ${states.join(', ') || '—'} |`
})

const table = [
  '| Route | View (DR2.1 override unless marked) | Visited by | Evidence states captured |',
  '|---|---|---|---|',
  ...rows
].join('\n')

// Replace the generated block in COVERAGE.md; print the table if it has none.
const coverageFile = path.join(__dirname, 'COVERAGE.md')
const START = '<!-- routes:start -->'
const END = '<!-- routes:end -->'
const doc = fs.existsSync(coverageFile) ? fs.readFileSync(coverageFile, 'utf8') : ''
if (doc.includes(START) && doc.includes(END)) {
  const updated = doc.slice(0, doc.indexOf(START) + START.length) + '\n' + table + '\n' + doc.slice(doc.indexOf(END))
  fs.writeFileSync(coverageFile, updated)
  console.log(`coverage: ${rows.length} routes written to COVERAGE.md`)
} else {
  process.stdout.write(table + '\n')
}
