import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

/**
 * Inputs shared by the routing golden test (captures the three bash
 * routers' pre-move output) and by `standards.test.js` group G (proves the
 * in-process resolver agrees with those same routers). One list, so the two
 * suites can never drift onto different fixtures.
 */

/** One path per `file-topics.sh` `case` arm and edge, in the order the table in inc-012's plan section 3 lists them. */
export const fixturePaths = [
  'src/Main.java',
  'src/app.js',
  'lib/a.mjs',
  'lib/b.cjs',
  'ui/c.jsx',
  'src/views/page.njk',
  'tests/specs/a.spec.ts',
  'a.spec.js',
  'tests/visual/b.visual.spec.ts',
  'perf/k6/load.js',
  'x/k6/data.json',
  'k6/load.js',
  'load.k6.js',
  'x/perf/a/b.js',
  'perf/b.js',
  'src/copy/copy.en.js',
  'a.ts',
  'README.md',
  'X.JS'
]

/** `bake-rules-bundle.sh` argv tuples: one per topic, plus the unknown-topic and usage branches. */
export const bakeCases = [
  ['EUDPA-0', 'repo', 'node'],
  ['EUDPA-0', 'repo', 'java'],
  ['EUDPA-0', 'repo', 'gds'],
  ['EUDPA-0', 'repo', 'playwright'],
  ['EUDPA-0', 'repo', 'k6'],
  ['EUDPA-0', 'repo', 'ruby'],
  []
]

/**
 * `detect-tech.sh` fixture repos: `{relativePath: content}` per repo, per
 * the table in inc-012's plan section 3. `empty` is materialised with no
 * files at all — its directory still exists because the golden test creates
 * every repo's root folder before calling `materialise`.
 */
export const fixtureRepos = {
  empty: {},
  'k6-package': {
    'package.json': '{"name":"x","dependencies":{"k6":"^0.1.0"}}\n'
  },
  'k6-import': {
    'src/load.js': "import http from 'k6/http'\n"
  },
  'k6-dir': {
    'k6/notes.txt': 'notes\n'
  },
  'k6-config': {
    'app/k6.config.js': 'export default {}\n'
  },
  'playwright-package': {
    'package.json': '{"devDependencies":{"@playwright/test":"^1.0.0"}}\n'
  },
  'playwright-config': {
    'playwright.config.ts': 'export default {}\n'
  },
  'playwright-import': {
    'tests/a.ts': "import { test } from '@playwright/test'\n"
  },
  'spring-pom-all': {
    'pom.xml': [
      '<project>',
      '  <dependencies>',
      '    <dependency><artifactId>spring-boot-starter</artifactId></dependency>',
      '    <dependency><artifactId>spring-boot-starter-data-mongodb</artifactId></dependency>',
      '    <dependency><artifactId>springdoc-openapi-starter-webmvc-ui</artifactId></dependency>',
      '    <dependency><groupId>software.amazon.awssdk</groupId></dependency>',
      '  </dependencies>',
      '</project>',
      ''
    ].join('\n')
  },
  'spring-gradle': {
    'service/build.gradle':
      "plugins { id 'org.springframework.boot' version '3.2.0' }\n"
  },
  'spring-annotation': {
    'src/A.java': '@Service\npublic class A {}\n'
  },
  'rest-java': {
    'src/C.java': '@RestController\npublic class C {}\n'
  },
  'subs-without-spring': {
    'pom.xml':
      '<project><dependency>software.amazon.awssdk</dependency></project>\n'
  },
  'node-package-all': {
    'package.json':
      '{"dependencies":{"@hapi/hapi":"^21.0.0","hapi-pino":"^12.0.0","nunjucks":"^3.0.0","govuk-frontend":"^5.0.0"}}\n'
  },
  'hapi-import': {
    'src/server.js': [
      "import Hapi from '@hapi/hapi'",
      '',
      'const server = Hapi.server()',
      "server.route({ method: 'GET', path: '/', handler: () => {} })",
      ''
    ].join('\n')
  },
  'hapi-server': {
    'index.js': 'const server = Hapi.server()\n'
  },
  'rest-node': {
    'routes.js': "router.get('/x', handler)\n"
  },
  'gds-views': {
    'src/views/a.njk': '{{ govukButton({text: "Go"}) }}\n'
  },
  'gds-second-view-dir': {
    'service/views/a.njk': '{{ govukInput({name: "x"}) }}\n'
  },
  'gds-class': {
    'templates/x.njk': '<div class="govuk-body">Text</div>\n'
  },
  'gds-views-no-component': {
    'views/a.njk': '<p>plain</p>\n'
  }
}

/**
 * Every best-practice path `bake-rules-bundle.sh`'s per-topic lists name,
 * minus `docs/best-practices/k6/BEST_PRACTICES.md` — left absent so the
 * golden capture pins bake's `(missing)` branch.
 */
export const bestPracticeStubs = [
  'docs/best-practices/node/code-style.md',
  'docs/best-practices/doc-comments/BEST_PRACTICES.md',
  'docs/best-practices/doc-comments/jsdoc.md',
  'docs/best-practices/java/modern-java.md',
  'docs/best-practices/doc-comments/javadoc.md',
  'docs/best-practices/gds/components.md',
  'docs/best-practices/gds/styles.md',
  'docs/best-practices/gds/patterns.md',
  'docs/best-practices/playwright/BEST_PRACTICES.md'
]

/**
 * Write a `{relativePath: content}` map under `root`.
 *
 * @param {string} root
 * @param {Record<string, string>} files
 */
export const materialise = (root, files) => {
  for (const [relPath, content] of Object.entries(files)) {
    const target = join(root, relPath)
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, content, 'utf8')
  }
}
