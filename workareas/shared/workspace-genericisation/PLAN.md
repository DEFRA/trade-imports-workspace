# Workspace genericisation — execution plan

`DEFRA/trade-imports-animals-workspace` → `DEFRA/trade-imports-workspace`.
Local checkout surveyed: `~/git/defra/trade-imports-animals`, branch `feat/EUDPA-328-dr21-parity`.
Source ledgers: `workareas/shared/workspace-genericisation/ledger-*.json` (10 files, ~1,900 findings).

Measured baseline (tracked files, `workareas/` excluded):

| Token | Occurrences | Files |
|---|---|---|
| `trade-imports-animals-workspace` | 721 | 196 |
| `-p trade-imports-animals` (compose project) | 5 | 5 |
| `name: trade-imports-animals` (compose project anchor) | 2 | 2 |
| `git/defra/trade-imports-animals` (bare checkout dir) | 2 | 2 |
| residual `animal` once the KEEP set is excluded | 118 | 56 |
| `EUDPA` | — | 204 |

Two untracked files also carry the path and are invisible to `git grep`:
`.claude/rules/copy.md` (1 hit) and `tim/.claude/settings.local.json` (18 hits).

---

## 1. Substitution table

Apply **strictly in this order**. Every rule is anchored; the ordering exists so a longer token is
consumed before a shorter one that would otherwise eat it.

### The absolute guard

**Nothing may ever `sed` the bare token `trade-imports-animals`.** It is a prefix of, at minimum:

- four real GitHub repos — `trade-imports-animals-frontend|backend|tests|admin`
- ten `repos/trade-imports-animals-*` checkout paths
- three Dockerhub images — `defradigital/trade-imports-animals-{frontend,admin,backend}`
- three SonarCloud project keys (`.claude/settings.json:93-98` `enabledMcpjsonServers`)
- an S3 bucket — `trade-imports-animals-documents` (`docker/stack/backend.compose.yml:21`, `infrastructure.compose.yml:15`)
- AWS FIFO resources — `trade_imports_animals_eu_notifications*`
- env vars — `TRADE_IMPORTS_ANIMALS_BACKEND_URL`, `TRADE_IMPORTS_ANIMALS_BACKEND_BASE_URL`, the `TRADE_IMPORTS_ANIMALS_{FRONTEND,ADMIN,BACKEND}` image-tag vars, `LIVE_ANIMALS_MODE`
- a Java package — `uk.gov.defra.tradeimportsanimals` — and an HTTP header — `Trade-Imports-Animals-Admin-Secret`

All of these are KEEP under R2. Every rule below is anchored by a suffix (`-workspace`), a preceding
token (`name: `, `-p `, `DEFRA/`), or a following space so it cannot reach them.

**Canary file: `Makefile:171`.** That one line carries the compose project name *and* three sub-repo
service names:

```
docker compose -p trade-imports-animals logs -f trade-imports-animals-frontend trade-imports-animals-admin trade-imports-animals-backend
```

After the whole pass it must read `-p trade-imports logs -f trade-imports-animals-frontend …`.
If any service name lost its `animals`, a rule was unanchored — stop and revert.

### Rules

| # | From → To | Applies to (pathspec) | Excluded from | Occ. | Verify |
|---|---|---|---|---|---|
| **1** | `trade-imports-animals-workspace` → `trade-imports-workspace` | whole repo, tracked **and** untracked (drive the file list off `find` / `rg --files`, **not** `git grep -l` — `.claude/rules/copy.md` is untracked) | `workareas/**`, `repos/**`, `docs/adr/0001-consolidate-workspace-docs-under-docs.md` (3 hits held for D4), `*.pptx`, `**/node_modules/**`, `.git/**` | 721 tracked + 19 untracked | `git -C ~/git/defra/trade-imports-animals grep -c trade-imports-animals-workspace -- . ':!workareas' ':!docs/adr'` → 0 |
| **2** | `DEFRA/trade-imports-animals` → `DEFRA/trade-imports-workspace`, line-anchored to the comment | `tim/.claude/hooks/guard-git-push.sh` **only**, line 47 | everywhere else — after rule 1 the bare `DEFRA/trade-imports-animals` prefix still fronts four live sub-repo slugs | 1 | `grep -c 'DEFRA/trade-imports-workspace' tim/.claude/hooks/guard-git-push.sh` → 1 |
| **3** | `-p trade-imports-animals ` (**trailing space load-bearing**) → `-p trade-imports ` | `Makefile`, `.github/workflows/e2e-tests.yml`, `docs/onboarding/01-workspace.md`, `docs/onboarding/generator/build-deck.js` | everything else; the trailing space is what stops the match reaching the three service names on `Makefile:171` | 5 | `git grep -c -- '-p trade-imports-animals' -- . ':!workareas'` → 0, then eyeball `Makefile:171` |
| **4** | `name: trade-imports-animals` (end-of-value anchored) → `name: trade-imports` | `docker/stack/compose.yml` (L1), `docker/stack/AGENTS.md` (L209) | `docker/stack/*.compose.yml` service keys — those read `trade-imports-animals-admin:`, never `name:` | 2 | `head -1 docker/stack/compose.yml` → `name: trade-imports`; `docker compose -f docker/stack/compose.yml config` parses |
| **5** | `trade-imports-animals workspace` → `trade-imports workspace` (space, not hyphen) | `CLAUDE.md`, `README.md`, `scripts/setup.sh`, `scripts/update.sh`, `tim/CLAUDE.md`, `tim/package.json`, `tim/src/env/workspace-root.js`, `tim/src/exec/stack.js` | everywhere else | 8 | `git grep -c 'trade-imports-animals workspace' -- . ':!workareas'` → 0 |
| **6** | `git/defra/trade-imports-animals` → `git/defra/trade-imports-workspace` — **gated on D1** | `scripts/sonar/sonar-check-pending.sh` (L18), `scripts/sonar/sonar-record-push.sh` (L14) | everywhere else. **Must run after rule 1** — run it first and `…-workspace` becomes `…-workspace-workspace` | 2 | `git grep -n CLAUDE_PROJECT_DIR -- scripts/sonar` — both literals identical |
| **7** | `trade-imports-animals-onboarding-decks` → `trade-imports-onboarding-decks` | `docs/onboarding/generator/package.json` (L2) | — | 1 | `npm --prefix docs/onboarding/generator run build` still resolves |
| **8** | `trade-imports-animals onboarding` → `trade-imports workspace onboarding`; `TRADE-IMPORTS-ANIMALS ONBOARDING` → `TRADE-IMPORTS WORKSPACE ONBOARDING` | `docs/onboarding/generator/*.js` only | — | 8, incl. the two suffixed variants `… · ticket deep dive` / `… · DEEP DIVE` at `build-ticket-walkthrough.js:53,142` that a full-string matcher misses | `git grep -ci 'trade-imports-animals onboarding' -- docs/onboarding` → 0 |
| **9** | `pres.author = "trade-imports-animals"` → `"trade-imports workspace"` | `docs/onboarding/generator/build-deck.js` (L79) | — | 1 | PPTX properties after rebuild |
| **10** | `mongodb://localhost:27017/trade-imports-animals}` → `…/trade-imports}`; `return "trade-imports-animals";` → `return "trade-imports";` | `docs/best-practices/java/spring-boot.md` (L405), `docs/best-practices/java/spring-data-mongodb.md` (L54, L545) | all other java-guide content — `uk.gov.defra.tradeimportsanimals`, `TradeImportsAnimalsApplication`, the ECS `serviceName`, `Trade-Imports-Animals-Admin-Secret` are real values (R2) | 3 | `git grep -n trade-imports-animals -- docs/best-practices/java` → only R2 lines remain |
| **11** | `Where are the animals coming from?` → `Where are the goods coming from?`; `the country the animals are coming from` → `the country the goods are coming from` | `docs/best-practices/node/govuk-frontend.md`, `nunjucks.md`, `playwright.md` | — | 9 (7 headings + 2 hints) | `git grep -c 'animals coming from' -- docs/best-practices` → 0 and `git grep -c 'goods coming from'` → 9 |

Rules 1 and 3–5 are the atomic core (WP0). Rules 2 and 6–11 are file-scoped and land in their owning
work package.

### One-line sweep verifying the whole table

```bash
git -C ~/git/defra/trade-imports-animals grep -In -i animal -- . ':!workareas' ':!repos' ':!*.pptx' \
  | grep -vE 'trade-imports-animals-(frontend|backend|tests|admin|documents)|trade_imports_animals|tradeimportsanimals|Trade-Imports-Animals-Admin-Secret|LIVE_ANIMALS_MODE|^docs/talks/|^\.claude/skills/(frontend-change|journey-builder)|^tools/journey-builder/targets\.json'
```

Expected residue after the job: the section 5 allowlist, nothing else.

---

## 2. Files needing a rewrite, not a swap

### Root front door

- **`CLAUDE.md`** — L1 title → `# trade-imports workspace`. L3 → "aggregating 10 independent GitHub
  repos for the DEFRA trade imports services" (drop "animals service"). L98 says "all 8 repos" and L99
  "the 6 repo-backed services"; the truth is **10 repos / 9 repo-backed services** (`scripts/stack/run-stack.sh`
  services array). L42 `frontend-change` routing row — see D5.
- **`README.md`** — L1/L3 the same. **The repo table at L9–14 is stale: it lists 6 of 10 repos**, missing
  `trade-imports-defra-id-stub`, `-dynamics-gateway`, `-address-book`, `-ins-frontend`. Regenerate the
  table wholesale from `CLAUDE.md`'s repo map rather than patching rows.

### Workspace docs identity

- **`docs/onboarding/README.md`** — L4 "the trade-imports-animals service" → "the DEFRA trade-imports
  workspace". L18/L101/L103/L109-110/L125 say "eight repos"/"eight services"; drop the count entirely
  ("the workspace's repos"), do not re-count.
- **`docs/onboarding/01-workspace.md`** — L11/18/27/34/44/59/126/132 assert "eight repos", and L44 reads
  "**The service** spans eight repos" — the sharpest single-commodity framing in the tree. New wording:
  "The estate spans the DEFRA trade-imports repos in two stacks."
- **`docs/team-workflow.md`** L5 — the Repos section presents the animals three as *the* workspace.
  New text: "The repo map lives in the root `CLAUDE.md`. Most tickets touch a frontend, its backend and
  the matching test suite — for the animals service that is `repos/trade-imports-animals-frontend`,
  `repos/trade-imports-animals-backend` and `repos/trade-imports-animals-tests`."
- **`docs/git-conventions.md`** L3 — "all four repos" → "the trade-imports repos".
- **`docs/adr/0001-consolidate-workspace-docs-under-docs.md`** — the one ADR the migration makes factually
  false (L42's Decision defines the best-practices citation path every `SKILL.md` follows). Per D4:
  prepend a dated amendment note, then swap the three paths so the ADR is internally consistent.

### Best-practice guides

- **`docs/best-practices/github-actions.md`** L3 — "every repo in the EUDP Live Animals workspace" →
  "every repo in the trade-imports workspace". L9/14/49/62 carry the workspace's own GitHub slug inside
  `uses:` snippets people copy into sub-repos; rule 1 fixes the strings, but see breakage 4.
- **`docs/best-practices/node/nunjucks.md`** — L82 hardcodes a service name in a layout example:
  `{{ pageTitle }} — Trade Imports Animals` → `{{ pageTitle }} — {{ serviceName }}`. The same snippet
  already passes `serviceName` into `appServiceHeader` four lines below, so the variable form is both
  generic *and* better guidance. L856/L863 (anti-pattern 13): replace `unweanedAnimals` with
  `placeOfDestination` in prose **and** override map; keep `VETERINARY_HEALTH_CERTIFICATE` — health
  certificates span commodity lines.
- **`docs/best-practices/node/playwright.md`** L235 — `'Origin — Trade Imports Animals'` →
  `'Origin — Import Notifications'`, matching the nunjucks change.
- **`docs/best-practices/node/govuk-frontend.md`** L955–968 — a11y rule 17 renames the loop variable
  `species` → `item` across four coupled lines: 955 prose ("which species or row" → "which item or row"),
  960 wrong-example, 966 correct-example, 968 `aria-label` "Number of animals for" → "Quantity for".
  All four or none, or the paired example contradicts itself.
- **`docs/best-practices/java/openapi-springdoc.md`** — **missed by every surveyor.** L105
  `title = "Trade Imports Animals API"` → `"Trade Imports API"`; L107 `"REST API for managing animal import
  notifications"` → drop "animal"; L260 `@Schema(description = "An animal import notification")` → drop
  "animal". L82 `packages-to-scan: uk.gov.defra.tradeimportsanimals` and L503 "Current state in
  `trade-imports-animals-backend`" are real values — KEEP.
- **`docs/best-practices/node/hapi.md`** — also unsurveyed; I read it. All 4 hits (L3 repo names,
  L914–925 `TRADE_IMPORTS_ANIMALS_BACKEND_URL` convict entries) are R2 KEEP. No change.

### tim

- `tim/README.md` L3 — the animals token is markdown **link text**, so a substring swap yields
  `[trade-imports](../) workspace`. Rewrite as
  `Node.js Ink/React CLI for the [trade-imports workspace](../).`
- `tim/src/env/workspace-root.js` L84 — not a swap: "Run from inside the trade-imports-animals checkout"
  must gain the word *workspace* → "Run from inside the trade-imports workspace checkout, set
  `TIM_WORKSPACE`, or symlink your checkout to `${canonical}`." The existing test asserts
  `/Cannot find the workspace root/` only, so it survives.
- `tim/src/env/workspace-root.test.js` L106 asserts the canonical literal exactly — it **must land in the
  same commit** as `workspace-root.js:16` or the suite goes red.
- `tim/src/commands/workspace/branch-resolver.js` L11 — the regex hardcodes `EUDPA` ten lines below
  `TICKET_PREFIX`. Point it at the constant:
  ``new RegExp(`^(?:${TICKET_PREFIX}-)?(\\d+)$`, 'i')``. Behaviour-identical; removes one of the two
  literals regardless of D3.

### Agent skills (routing descriptions)

Replace **"EUDP Live Animals" → "EUDP trade-imports"**. Never delete `EUDP` — it is the programme
(cf. the cross-commodity "EUDP Import Notification Capability Map"). All trigger phrases untouched, so
routing is unaffected:

- `.claude/skills/code-style/SKILL.md` L3 (single-quoted YAML on one very long line — hand-edit), L9
- `.claude/skills/govuk-upgrade/SKILL.md` L3
- `.claude/skills/npm-upgrade/SKILL.md` L3, L9, L55
- `.claude/skills/review/SKILL.md` L3, L9; `references/CONSISTENCY_REVIEWER.md` L1
- `.claude/skills/understanding-check/SKILL.md` L9
- `.claude/skills/npm-upgrade/references/DISCOVERY_AND_PLANNING.md` L19 — drop the hardcoded count too
- `.claude/skills/ticket-refiner/SKILL.md` L100–103 — delete the parenthesised 6-repo enumeration. The
  sentence names `CLAUDE.md` as the authoritative list and then immediately contradicts it.

**Deliberately NOT genericised:** `frontend-change` and `journey-builder`. `frontend-change` drives
`src/server/app/sets/live-animals/docs` recipes and `npm run test:live-animals`; genericising its
description makes routing *worse*. `journey-builder` is already target-data-driven via
`tools/journey-builder/targets.json` and says "currently the live-animals set". Do not let a later sweep
flatten these two.

### tools

- `tools/npm/README.md` — L3 branding, plus L26/29/32/35/89 point at
  `~/git/defra/eudp-live-animals/eudp-live-animals-qa-automation`, a clone layout that **does not exist in
  this workspace**. Rewrite all five against
  `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend`.
- `tools/npm/start-upgrade.sh` L48 — "runs against all 4 EUDP Live Animals Node repos" → "runs against the
  default repo set (see `DEFAULT_REPOS`)". The list itself is D2.
- `tools/govuk/start-upgrade.sh` L39 — hardcoded parent epic `EUDPA-144` in generic help text → "the DevOps
  parent epic for your project". Lines 59/67 are D3.
- `tools/confluence/sync-docs.sh` L214-215 and L324 — the `EUDP` **space key** is baked into display URLs
  written into every generated `docs/confluence/_index.md`. Content is fetched by ID, so the space key is
  purely cosmetic: emit `%s/wiki/pages/viewpage.action?pageId=%s`. The default folder id stays (see §7).
- `tools/journey-builder/prepare-digest.sh` — the machinery is generic but the **requirement sources were
  never moved into the profile**: L18 Confluence page id, L19 canvas filename, L39
  `SPEC_BRANCH="spike/$RUN_ID-live-animals-spec"`, L98 `journey: "live-animals-import-notification"`. Add
  three optional `targets.json` fields (`sources.confluencePageId`, `sources.canvasFile`, `journeyId`) and
  use the already-exported `TARGET_ID` for the branch name.
- `tools/journey-builder/backlog-generate.sh` — two **generated** strings propagate the animals domain into
  every `backlog.json` whatever the target: L114 "(e.g. animal identification)" and L131 "the live-animals
  domain (commodityLines etc.)". Those matter more than the comments at L5/13/14/85, which also go. The
  vendored `CAR_SECTIONS` at L46-47 and the `remove-car-section` increment type at L129 are D2 — see §6.
- `tools/journey-builder/spec-add-page.sh` L9 — usage example `"Where the animals come from"` →
  `"Where the goods come from"`. The `EUDPA-X` on the same line is KEEP.
- `tools/style/refresh/scope.sh` L2 — drop `EUDPA` from the header prose.
- `.github/workflows/cleanup-e2e-reports.yml` L94 — `"chore: prune + orphan-reset gh-pages (EUDPA-199)"`
  attributes every future run to a long-closed ticket. Drop the key; nothing parses the message.

### `tim/src/constants/repos.js` + `tim/src/commands/start.js`

Gated on D2. If D2 says yes these two are **one piece of work** sharing one `repos.json`; do not do either
alone. `repos.js` keeps every exported name and shape (`NODE_REPOS`, `JAVA_REPOS`, `REPOS`,
`UNIT_TEST_EXEMPT_REPOS`) and falls back to today's literals when no manifest is present. `start.js`
derives `SERVICES` from the same manifest, preserving the `realRepoPath` (npm `--prefix`) vs `repoPath`
(mvn `-f`) distinction, which is load-bearing per its JSDoc. Test impact if it lands:
`constants/repos.test.js`, `commands/start.test.js`, `commands/workspace/{clean,install,lint,status,test}.test.js`,
`components/features/workspace/useWorkspaceFeature.test.js`, `components/MainMenu.test.js`,
`components/common/screens/TaskResultsScreen.test.js` all need a manifest fixture instead of seeded name
strings. None of that blocks the rename.

---

## 3. Files renamed or moved on disk

**Inside the repo — one move, recommended (my call, §7):**

| From | To |
|---|---|
| `docs/frontend.md` | `docs/repos/trade-imports-animals-frontend.md` |
| `docs/backend.md` | `docs/repos/trade-imports-animals-backend.md` |
| `docs/admin.md` | `docs/repos/trade-imports-animals-admin.md` |
| `docs/tests.md` | `docs/repos/trade-imports-animals-tests.md` |

`docs/frontend.md` is already ambiguous **today** — the workspace has two frontends
(`trade-imports-animals-frontend` and `trade-imports-ins-frontend`). Role-named files only work when there
is one of each role. Zero inbound links, verified:
`git grep -n 'docs/frontend.md\|docs/backend.md\|docs/admin.md\|docs/tests.md'` returns nothing. Use
`git mv` so history follows, and add a `docs/repos/README.md` index row per repo.

**Outside the repo (machine-local, gated on D1):**

- `~/git/defra/trade-imports-animals` → `~/git/defra/trade-imports-workspace` (the real checkout)
- `~/git/defra/trade-imports-animals-workspace` — today a symlink to that checkout; redundant once the
  checkout carries the canonical name. Keep it, and add `trade-imports-animals` → the new dir, as
  transitional back-compat, then delete both.
- The GitHub rename: `DEFRA/trade-imports-animals-workspace` → `DEFRA/trade-imports-workspace`, plus
  `git remote set-url origin git@github.com:DEFRA/trade-imports-workspace.git`.

**Nothing else moves.** No file under `.claude/`, `tools/`, `tim/`, `docker/` or `scripts/` has an
animals-bearing filename.

---

## 4. Ordered work packages

### WP0 — canonical rename (SERIAL, blocks everything, one commit)

**Owns:** the whole repo, for substitution rules **1, 3, 4, 5** only.

Preconditions, in order:

1. `docker compose -p trade-imports-animals down --volumes --remove-orphans` — compose namespaces
   containers, the default network and named volumes by project name, so any running stack is orphaned by
   rule 4 (breakage 1).
2. Check for in-flight `workareas/govuk-upgrades/<run-id>/` and `workareas/journey-builder/<run-id>/` state.
   Those directories are addressed by the old literal from ~130 scripts and R3 forbids editing
   `workareas/` — **finish or abandon in-flight runs before landing**, do not migrate them.
3. Create `~/git/defra/trade-imports-workspace` (rename or symlink per D1) **before** the commit. Every
   `tools/**` script hard-fails the instant the literal points at a missing directory, and
   `tools/govuk/start-upgrade.sh` alone chains through seven of them.

Then, in one commit:

- rule 1 across tracked **and** untracked files (drive the file list off `find`/`rg --files`, not
  `git grep -l` — `.claude/rules/copy.md` is untracked and would be silently skipped)
- rules 5, 3, 4
- `.claude/settings.json` L63-90 (15 allowlist entries) — **must be in this commit**. The old and new
  strings share no substring relationship, so a split means every `git -C`, `tools/**`, `scripts/**`,
  `npm --prefix` and `mvn -f` call starts prompting and unattended subagent runs stall.
- `.claude/hooks/guard-bash.sh` L168 — the directory name is embedded in a `grep -E` pattern; keep it
  consistent with `settings.json:85`
- `tools/skill-creator/scaffold-skill.sh` L362-363 — these **write** the allowlist entries for every
  future skill. Split them from `settings.json` and every new skill gets non-matching entries forever.
  L182-184 (the "Path conventions" block) and L251 (the worker "Bash call hygiene" rule) teach the
  canonical literal, so they must show the new path or the rule teaches the wrong thing.
- `tim/src/env/workspace-root.js` L16 **and** `tim/src/env/workspace-root.test.js` L106, together
- `.github/workflows/e2e-tests.yml` L39 (the workspace's own slug)

**Verify:**
```bash
git grep -c trade-imports-animals-workspace -- . ':!workareas' ':!docs/adr'   # 0
grep -rc trade-imports-animals-workspace .claude/rules/                        # 0
sed -n '171p' Makefile          # -p trade-imports, three service names intact
npm --prefix tim test           # green; workspace-root.test.js:106 is the tripwire
shellcheck $(git ls-files '*.sh')
docker compose -f docker/stack/compose.yml config >/dev/null
```

---

The nine packages below have **disjoint pathspecs** and can run in parallel once WP0 has landed.

### WP-A — root front door + scripts
- **Owns:** `CLAUDE.md`, `README.md`, `Makefile`, `scripts/**`
- **Does:** CLAUDE.md L1/L3 plus the repo/service counts (10 / 9); README L1/L3 plus a regenerated repo
  table; `scripts/update.sh` roster drift 8 → 10 (adds `trade-imports-address-book` and
  `trade-imports-ins-frontend` — today `bash scripts/update.sh` with no args silently skips two repos);
  `scripts/stack/lib/flags.sh:22` "the 7 repo-backed services" → 9; rule 6 in `scripts/sonar/*` if D1 says
  the checkout is renamed.
- **Verify:** `make help`; `bash -n scripts/*.sh scripts/**/*.sh`; `shellcheck $(git ls-files 'scripts/*.sh' 'scripts/**/*.sh')`;
  `git grep -c 'eight repos\|all 8 repos\|all four repos\|6 repo-backed' -- CLAUDE.md README.md scripts` → 0.

### WP-B — docker + CI
- **Owns:** `docker/**`, `.github/**`
- **Does:** `docker/stack/AGENTS.md` count drift (L4 "all ten repos" vs L12 "8 repo-backed services");
  drop `(EUDPA-199)` from `cleanup-e2e-reports.yml:94`.
- **Verify:** `docker compose -f docker/stack/compose.yml config >/dev/null`; `tim docker dev` brings the
  stack up under the new project name; `actionlint .github/workflows/*.yml`.

### WP-C — tim
- **Owns:** `tim/**`
- **Does:** `package.json:4`, `CLAUDE.md:3`, `README.md:3` (link-text rewrite), `workspace-root.js:74` and
  `:84`, `exec/stack.js:19`, `branch-resolver.js:11`, `guard-git-push.sh:47` (rule 2); and, only if D2
  lands, the `repos.json` manifest across `constants/repos.js` + `commands/start.js` + their tests.
- **Verify:** `npm --prefix tim test`; `npm --prefix tim run lint`; `npm --prefix tim run format:check`;
  `tim workspace status --json` from an unrelated cwd.

### WP-D — agent skills
- **Owns:** `.claude/skills/**`
- **Does:** the 11 "EUDP Live Animals" → "EUDP trade-imports" routing/body edits; delete the stale 6-repo
  enumeration in `ticket-refiner/SKILL.md:100-103`; leave `frontend-change` and `journey-builder`
  animals-worded on purpose.
- **Verify:** `git grep -c 'EUDP Live Animals' -- .claude/skills` → 0; every frontmatter still parses;
  `git diff -U0 .claude/skills | grep -ci 'trigger'` → 0 (no trigger phrase moved).

### WP-E — tools: journey-builder
- **Owns:** `tools/journey-builder/**`
- **Does:** `prepare-digest.sh` L18/19/39/98 → target-profile fields; `backlog-generate.sh` L114/L131
  generated strings plus the L5/13/14/85 comments; `spec-add-page.sh:9`. **Leave `targets.json` and
  `target-profile.sh` alone** — the profile mechanism is already generic and the animals profile is data.
- **Verify:** `bash -n tools/journey-builder/*.sh`; `shellcheck tools/journey-builder/*.sh`;
  `jq . tools/journey-builder/targets.json`; regenerate one backlog against the existing spec and diff —
  only note text may change and **no increment `type` may change** (the type is half the content key that
  preserves status across regenerations).

### WP-F — tools: everything else
- **Owns:** `tools/**` except `tools/journey-builder/**`
- **Does:** `tools/npm/README.md` stale-example rewrite plus branding; `tools/npm/start-upgrade.sh:48`;
  `tools/govuk/start-upgrade.sh:39` (and 59/67 per D3); `tools/confluence/sync-docs.sh` space-key removal;
  `tools/style/refresh/scope.sh:2`.
- **Verify:** `shellcheck $(git ls-files 'tools/**/*.sh')`; `bash tools/govuk/start-upgrade.sh --help`;
  `bash tools/npm/start-upgrade.sh --help`; `git grep -c eudp-live-animals -- tools` → 0.

### WP-G — docs: best practices + ADR
- **Owns:** `docs/best-practices/**`, `docs/adr/**`
- **Does:** the 9 worked-example headings/hints ("goods"), the a11y `species` → `item` block, the two
  service titles, the mongo db-name examples, `openapi-springdoc.md` L105/107/260, `github-actions.md:3`,
  and ADR-0001 per D4. **Do not touch `skills/anti-patterns.md:127`** — that `$HOME/git/defra/…` is the
  anti-pattern A10 illustrates and it reinforces R1; only its correction at L133 changes.
- **Verify:** `git grep -c 'animals coming from\|Trade Imports Animals\|species\.' -- docs/best-practices` → 0;
  `git grep -c 'goods coming from' -- docs/best-practices` → 9 (the three guides agree).

### WP-H — docs: onboarding
- **Owns:** `docs/onboarding/**`
- **Does:** rules 7/8/9 in the generators; the README and `01-workspace.md` count/framing rewrites; then
  **rebuild**. Four generated `.md` pages are duplicates by construction — fix the generator *and* the page
  in the same commit: `00-getting-started.md:37` ← `build-getting-started.js:68`; `02-ticket.md:54` ←
  `skill-specs.js:41`; `09-ticket-creator.md:53` ← `skill-specs.js:348`; `10-ticket-refiner.md:53` ←
  `skill-specs.js:392`. Hand-written and safe to edit directly: `01-workspace.md`,
  `02b-ticket-walkthrough.md`, `README.md`, `slide-theme.md`, `generator/README.md`.
- **Verify:** `npm --prefix docs/onboarding/generator install` then
  `npm --prefix docs/onboarding/generator run build` (`sharp` is a native build — expect a compile);
  `git status --short docs/onboarding` shows 12 regenerated `.pptx` and no reverted `.md`.

### WP-I — docs: reference, top-level, agent onboarding
- **Owns:** `docs/reference/**`, `docs/agent-*.md`, `docs/team-workflow.md`, `docs/git-conventions.md`,
  `docs/local-setup.md`, `docs/frontend.md`, `docs/backend.md`, `docs/admin.md`, `docs/tests.md`
- **Does:** the `team-workflow.md:5` reframe; `git-conventions.md:3`; the four `git mv`s from §3 plus a
  `docs/repos/README.md` index. `docs/reference/tools-index.md`'s `EUDPA-X` placeholder is D3.
- **Verify:** `git grep -c 'all four repos' -- docs` → 0; relative links resolve
  (`npx --yes markdown-link-check docs/*.md docs/reference/*.md`); `docs/.claude → ../.claude` is a relative
  symlink and must stay untouched.

### WP-J — untracked machine-local (optional, no commit)
- **Owns:** `.claude/rules/copy.md`, `tim/.claude/settings.local.json`, `.claude/settings.local.json`
- **Does:** rule 1 in `copy.md` (untracked — a `git grep -l`-driven sweep misses it); the 18 path entries in
  `tim/.claude/settings.local.json` using the **trailing-slash-anchored** form
  `~/git/defra/trade-imports-animals-workspace/` so the sub-repo arguments on L12/13/14/22/25 and the two
  SonarCloud keys on L16/19 survive.
- **Verify:** `grep -c trade-imports-animals-workspace .claude/rules/copy.md tim/.claude/settings.local.json` → 0.
  Skipping this package costs extra permission prompts, never breakage.

### WP-K — sub-repo caller sweep (SEPARATE repos, must land with the GitHub rename)
- **Owns:** `repos/*/.github/**` — outside this repo's git history; 10 separate PRs.
- **Measured:** 40 files across all 10 sub-repos reference `DEFRA/trade-imports-animals-workspace`
  (address-book 4, animals-admin 4, animals-backend 5, animals-frontend 6, animals-tests 6, defra-id-stub 4,
  dynamics-gateway 2, ins-frontend 2, reference-data 4, stub 3) — `e2e-tests.yml`,
  `cleanup-e2e-reports.yml`, `publish-branch.yml`, `lighthouse.yml`, and the composite actions
  `report-e2e-status` / `report-lighthouse-status`.
- **Verify:** `grep -rc 'DEFRA/trade-imports-animals-workspace' repos/*/.github` → 0; trigger one E2E run
  per repo and confirm the reusable workflow resolves.

---

## 5. Verification ladder

Run top to bottom; each rung gates the next.

**1. Residual grep sweep**

```bash
git grep -In -i animal -- . ':!workareas' ':!repos' ':!*.pptx'
```

Expected surviving hits — the **complete allowlist**:

| Pattern | Why it survives |
|---|---|
| `trade-imports-animals-{frontend,backend,tests,admin}` | real GitHub repos (R2) |
| `repos/trade-imports-animals-*` | real checkout paths (R2) |
| `defradigital/trade-imports-animals-*` | real Dockerhub images (R2) |
| `TRADE_IMPORTS_ANIMALS_*`, `LIVE_ANIMALS_MODE` | real env vars (R2) |
| `trade-imports-animals-documents` | real S3 bucket (R2) |
| `trade_imports_animals_eu_notifications*` | real AWS FIFO names (R2) |
| `uk.gov.defra.tradeimportsanimals`, `TradeImportsAnimalsApplication` | real Java package/class (R2) |
| `Trade-Imports-Animals-Admin-Secret` | live wire-protocol header (R2, D6) |
| `sonar-{frontend,admin,backend,gateway}` MCP entries | real SonarCloud projects (R2) |
| `.claude/skills/frontend-change/**` (16 hits) | animals-scoped by design (D5) |
| `.claude/skills/journey-builder/**` + `tools/journey-builder/targets.json` (8 hits) | animals is the *current target*, held as data |
| `docs/talks/agentic-prototyping/**` | delivered talk — a historical record; rewriting it falsifies the record |
| `docs/repos/trade-imports-animals-*.md` prose | per-repo docs describing animals sub-repos |
| `tools/style/file-topics.sh:9` (`EUDPA-275`), `.claude/hooks/guard-bash.sh` `[EUDPA-221]`, onboarding `EUDPA-213` | historical provenance markers |
| ~200 `EUDPA-*` case arms and `EUDPA-XXXXX` placeholders | R6 — live project key, reported not replaced |

Zero-tolerance greps — any hit is a defect:

```bash
git grep -c trade-imports-animals-workspace    -- . ':!workareas'   # 0
git grep -c 'EUDP Live Animals'                -- . ':!workareas'   # 0
git grep -c -- '-p trade-imports-animals'      -- . ':!workareas'   # 0
git grep -c eudp-live-animals                  -- . ':!workareas'   # 0
git grep -c 'trade-imports-animals workspace'  -- . ':!workareas'   # 0
grep -rc trade-imports-animals-workspace .claude/rules/ tim/.claude/  # 0 (untracked)
```

**2. tim** — `npm --prefix tim test` (vitest; `workspace-root.test.js:106` is the tripwire for a
half-applied rename), `npm --prefix tim run lint`, `npm --prefix tim run format:check`.

**3. Shell lint** — `shellcheck $(git ls-files '*.sh')` plus `bash -n` on each. ~130 scripts carry the
literal, and a botched sed shows up as a bad path rather than a syntax error, so rung 4 is the real proof.

**4. Path dry-run** — the rung that actually proves R1 landed:

```bash
git ls-files -z | xargs -0 grep -ho '[~$]\{0,1\}{\?HOME\?}\?/git/defra/[a-z-]*' | sort -u
# expect exactly: ~/git/defra/trade-imports-workspace and $HOME/git/defra/trade-imports-workspace
test -d ~/git/defra/trade-imports-workspace/tools && echo OK
bash tools/review/prepare-review.sh --help    # a dispatcher chaining 7 path-literal scripts
bash tools/govuk/start-upgrade.sh --help      # chains 7 more
```

**5. Permission allowlist** — from a fresh agent session run one command of each shape
(`git -C ~/git/defra/trade-imports-workspace status`,
`~/git/defra/trade-imports-workspace/tools/auth.sh`,
`npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend run lint`) and
confirm none prompts. Prompts are not observable from inside the agent — ask Sam to confirm.

**6. Stack** — `tim docker dev`, then `docker compose -p trade-imports ps` lists every service and
`docker ps -a --filter name=trade-imports-animals` lists nothing stale.

**7. Docs build** — `npm --prefix docs/onboarding/generator run build`, then `git status --short` shows only
regenerated `.pptx` and no reverted `.md`.

**8. CI** — push the branch; the workspace's own `tim-ci.yml` must pass, and one sub-repo E2E run must
resolve `DEFRA/trade-imports-workspace/.github/workflows/e2e-tests.yml@main`.

---

## 6. Decisions the human must make

**D1 — Is the on-disk checkout renamed, or only the symlink repointed?**
Today `~/git/defra/trade-imports-animals` is the real directory and `~/git/defra/trade-imports-animals-workspace`
is a symlink to it; R1 governs the canonical path only.
*Recommendation: rename the real checkout to `~/git/defra/trade-imports-workspace` and retire the symlink.*
One name beats a name plus an alias, and it lets substitution rule 6 fix both Sonar hooks. Both hooks are
fail-open, so a wrong value produces **silence, not an error** — no BLOCKER/CRITICAL finding ever surfaces
again and nothing tells you.

**D2 — Does the repo roster become data (`repos.json`), and in this migration or a follow-up?**
The roster is hardcoded **six** times and has already drifted: `Makefile:2` (10), `scripts/setup.sh:49-58`
(10), `scripts/update.sh:13-20` (**8** — silently skips address-book and ins-frontend today),
`tim/src/constants/repos.js`, `tools/npm/start-upgrade.sh:33-36` (4, and it lists the Java backend in an npm
list), `.claude/skills/npm-upgrade/SKILL.md:57-60` (4, omitting two Node repos).
*Recommendation: fix `update.sh`'s drift now in WP-A and raise `repos.json` as a follow-up ticket.* It is a
behaviour change with a fixture tail across ~8 tim suites; bundling it into a rename doubles the blast
radius. The same ruling covers `backlog-generate.sh`'s vendored `CAR_SECTIONS` and the `remove-car-section`
increment type — renaming that type re-keys existing backlogs and resurrects completed increments as todo,
so it does not belong in a sed pass either.

**D3 — Does `EUDPA` stay a literal, or resolve from `JIRA_PROJECT_KEY`?**
R6 keeps it functional. Only **two** sites in the whole workspace actually *reject* another project's key:
`tools/govuk/start-upgrade.sh:59` (validator) and `:67` (run-id derivation, which otherwise silently changes
where state is written). Everything else is a `EUDPA-*)` case arm (33 in `tools/journey-builder`, 20 in
style/ticket/understanding-check), an `EUDPA-XXXXX` help placeholder, or the `TICKET_PREFIX` const in
`tim/src/commands/workspace/branch-resolver.js:1`.
*Recommendation: bind those two lines to `${JIRA_PROJECT_KEY:-EUDPA}` now — `tools/jira/create-ticket.sh:184`
and `add-subtask.sh:182` already require that variable, so the source of truth exists. Leave the other ~200
alone.* The question you must actually answer: **would a second commodity line get its own Jira board?** If
not, keep EUDPA hardcoded and close this. Densest sites for a future single source of truth:
`docs/reference/tools-index.md` (65 lines), `docs/best-practices/jira/ticket-conventions.md` (10 plus board
id 13780 at L68), `tools/ticket-creator/prepare-ticket-creation.sh:19-20` (board 13780 + cap page id),
`.claude/skills/govuk-upgrade/SKILL.md:70` (parent epic `EUDPA-144` — the sharpest coupling, it rots when
that epic closes).

**D4 — ADR-0001: amend in place, or preserve and annotate?**
Its Decision section (L42) defines the best-practices citation path every `SKILL.md` follows, and becomes
factually false post-migration.
*Recommendation: prepend a dated amendment note, then swap all three paths.* An ADR that instructs authors to
write a dead path is worse than an amended one.

**D5 — Does `frontend-change` stay animals-scoped?**
It is a **workspace-owned** skill hardcoded to the live-animals journey, advertised from the generic
workspace's routing table at `CLAUDE.md:42`. `journey-builder` already solved the same problem with
`targets.json`, so precedent for making it multi-domain exists.
*Recommendation: keep it animals-scoped and say so — "One recipe-verbatim increment on the live-animals
frontend (`trade-imports-animals-frontend`, src/server/app)".* Naming the repo makes the scoping deliberate
rather than accidental.

**D6 — Is the `Trade-Imports-Animals-Admin-Secret` header in scope?**
A **generic** service (`trade-imports-dynamics-gateway`) defines an animals-named admin header, documented at
`docker/stack/AGENTS.md:106`.
*Recommendation: out of scope — raise a ticket against that repo.* It is a live wire contract; renaming the
runbook text alone would only make the runbook wrong.

---

## 7. Calls made

- **"EUDP Live Animals" → "EUDP trade-imports", never `EUDP` deleted.** EUDP is the programme (cf. the
  cross-commodity "EUDP Import Notification Capability Map"), so the descriptions stay accurate.
- **"animals" → "goods" in every worked example**; example service title → **"Import Notifications"**, used
  identically in `nunjucks.md:82` and `playwright.md:235` so the guides do not contradict each other.
- **Repo/service counts get dropped, not re-counted** ("the workspace's repos", not "ten repos"). The counts
  have already rotted twice — 4 → 8 → 10 — and will again.
- **ADR-0001 gets an amendment note plus corrected paths** (D4's recommendation is mine to execute unless overruled).
- **`sync-docs.sh` keeps its default folder id** (`6447269328`) — making it required breaks the CLI contract
  that `clean-docs.sh` execs into. Only the cosmetic `EUDP` space key comes out of the display URLs.
- **`docs/{frontend,backend,admin,tests}.md` move to `docs/repos/<repo-name>.md`** — already ambiguous with
  two frontends in the workspace; zero inbound links, so the move is free.
- **The 12 `.pptx` decks regenerate in the same PR, separate commit** — a text-only sweep leaves 12
  animals-branded binaries in the new repo, and they are the artefact people actually open and present.
- **`branch-resolver.js:11` points at `TICKET_PREFIX`** whatever D3 decides — two literals ten lines apart is
  a defect either way.
- **`(EUDPA-199)` comes out of the gh-pages commit message** — nothing parses it, and every future run is
  currently attributed to a closed ticket.
- **`scripts/update.sh`'s roster goes 8 → 10** — it silently skips two repos today. That is a live bug, not
  scope creep.
- **`guard-git-push.sh:47` is corrected, not preserved** — it already names `DEFRA/trade-imports-animals`, a
  repo that has never existed. The migration fixes a live inaccuracy rather than introducing risk.
- **`frontend-change`, `journey-builder`, `targets.json` and `docs/talks/**` keep their animals wording** —
  genericising them makes routing worse or falsifies a delivered record.
- **`anti-patterns.md:127`'s wrong `$HOME/git/defra/…` stays wrong** — it is the anti-pattern being illustrated.
- **`openapi-springdoc.md` and `hapi.md` were surveyed by nobody** — I read both: three illustrative strings to
  genericise in the former, all four hits in the latter are R2 KEEP.
- **`guard-bash.sh:164`'s `npm run test:docker-compose` stays** — a shared Playwright-runner convention across
  the workspace's Node repos, not an animals coupling.
- **`DEFRA` org hardcodes stay** (7 `tools/github/` + 6 `tools/github-actions/` scripts) — DEFRA owns every
  repo the workspace aggregates.
- **`tools/github-actions/*` and `.claude/skills/*` teaching examples keep `trade-imports-animals-frontend`**
  as the worked example — it is a real repo (R2) and the most-used one; swapping it for a placeholder makes
  the examples uncheckable.
- **WP-J is optional** — skipping the untracked machine-local files costs extra permission prompts, never
  breakage or a wrong action.

---

## 8. Breakage register

| # | What breaks | Trigger | What Sam must do |
|---|---|---|---|
| 1 | **Any running docker stack is orphaned.** Compose namespaces containers, the default network and named/anon volumes by project name; the old containers keep running, `stop-stack.sh` under the new name cannot see them, and the mongo/floci volumes are abandoned. | `docker/stack/compose.yml:1` changes | `docker compose -p trade-imports-animals down --volumes --remove-orphans` **before** WP0, then `tim docker dev`. Confirm `docker ps -a --filter name=trade-imports-animals` is empty afterwards. |
| 2 | **The permission allowlist stops matching.** 15 entries in `.claude/settings.json` are keyed on the old literal, and the two strings share no substring relationship — there is no graceful overlap. Every `git -C`, `tools/**`, `scripts/**`, `npm --prefix` and `mvn -f` call starts prompting; unattended subagent runs stall. | the checkout/symlink moves without `settings.json` | Both in WP0's single commit; then rung 5 of the ladder. |
| 3 | **Every skill sends its subagents to a dead path.** 451 occurrences across 53 `.claude/skills/**` files and ~180 more in `tools/**` are prose and command examples pointing at the old canonical path. | the checkout moves without WP0, or WP0 without the move | Directory move and WP0 land together. |
| 4 | **All 10 sub-repos' CI breaks.** 40 workflow files call `DEFRA/trade-imports-animals-workspace/.github/workflows/{e2e-tests,cleanup-e2e-reports,publish-branch}.yml@main` plus two composite actions. GitHub leaves a redirect on rename, but `uses:` against a renamed repo is not something to rely on, and `docs/best-practices/github-actions.md` is the copy-paste source developers use. | the GitHub repo rename | WP-K: 10 PRs merged in the same window as the rename. |
| 5 | **`git remote` is stale** — `origin` is `git@github.com:DEFRA/trade-imports-animals-workspace.git`. | GitHub rename | `git remote set-url origin git@github.com:DEFRA/trade-imports-workspace.git` |
| 6 | **The symlink.** `~/git/defra/trade-imports-animals-workspace → ~/git/defra/trade-imports-animals`. `tim link` plans the symlink off `CANONICAL_WORKSPACE_PATH`, so it creates the new one correctly, but it does **not** remove the stale old one. | D1 | Create the new path before WP0; delete the two old names once nothing has prompted for a fortnight. |
| 7 | **Sonar hooks go silent, not loud.** `scripts/sonar/sonar-check-pending.sh:18` and `sonar-record-push.sh:14` default `ROOT` to the old checkout path and derive `$ROOT/.sonar-checks` independently. Both are fail-open, so if the literals diverge the record hook writes markers the check hook never reads and **no BLOCKER/CRITICAL finding surfaces again, with nothing to tell you**. | D1 applied to one file and not the other | Change both or neither. Verify by making a deliberate CRITICAL-triggering edit and confirming the Stop hook still reports. |
| 8 | **In-flight `workareas/` runs lose their state directories.** `workareas/govuk-upgrades/<run-id>/`, `workareas/journey-builder/<run-id>/` and the review/style/understanding-check workareas are addressed by the old literal from ~130 scripts, and R3 forbids editing `workareas/`. | WP0 | Finish or abandon in-flight runs first. `tools/govuk/start-upgrade.sh` alone chains seven path-literal scripts, so a half-done rename breaks a govuk-upgrade mid-run. |
| 9 | **`spike/<run-id>-live-animals-spec` worktrees orphan** if `prepare-digest.sh:39` lands. | WP-E | Clean the worktree before landing, or defer that one line. |
| 10 | **12 `.pptx` decks stay animals-branded** — grep cannot see inside a zip archive, so a text-only sweep leaves the footer, title eyebrow, author metadata, canonical path and compose project name compiled in. | always, unless rebuilt | WP-H. `npm install` in `docs/onboarding/generator` first; `sharp` is a native build. |
| 11 | **IDE and machine-local config.** `~/git/defra/.idea/` (workspace-level IntelliJ config including `dataSources.local.xml` and `modules.xml`), `tim/.claude/settings.local.json`'s 18 absolute checkout paths, plus any shell alias or editor workspace file. None are in git. | D1 checkout rename | Reopen the project in IntelliJ and let it re-resolve modules; re-point aliases; run WP-J. |
| 12 | **`tim` from an unrelated cwd stops resolving** — it falls back to `CANONICAL_WORKSPACE_PATH` only when the walk-up from cwd finds nothing. Running from inside the checkout still works. | WP0 | Create the new directory first (breakage 6). |
