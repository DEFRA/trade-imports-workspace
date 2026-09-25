# Plants prototype — plan

`repos/trade-imports-plants-prototype` is a copy of `trade-imports-plants-frontend` for designers. It should:

- start with `npm start` and nothing else running
- only ever use stubs, never a real backend, Defra ID, Redis or reference data
- deploy to CDP from its Dockerfile
- keep taking changes from the real plants frontend, regularly and cheaply
- host several prototypes, each one a set, with a page for choosing between them
- look and behave as close to the real service as possible

Updated 2026-09-24, after EUDPA-619 merged.

---

## Done

**EUDPA-619 — one frontend serves more than one set (merged 2026-09-23).** In all three repos:

- `trade-imports-animals-frontend` `9b45dc9e`, `live-animals` now at `/live-animals`
- `trade-imports-plants-frontend` `0f2d972`, `high-risk-plants` now at `/high-risk-plants`
- `trade-imports-plants-prototype` `8dfb2c0`, which hosts two sets: `high-risk-plants` and a `sample-journey`

In the prototype:
- `src/server/app/shared/set-context.js` keys every engine seam by set and resolves the active set per request.
- `src/server/router.js` mounts each set under its own prefix. `/health`, `/signout`, `/auth/*` and static assets stay outside those prefixes.
- `src/server/sets-index/` serves the chooser at `/`. It reads the mounted sets at request time, so **a new prototype appears on the chooser purely by being mounted** — there's no list to maintain.
- Each set self-checks as it registers (`assertSetConfigured`), so a set that misses a seam fails the boot rather than rendering an empty page.

**Verified locally on 2026-09-24:** `STUB_MODE=true PORT=3103 npm run dev` starts with nothing else running, on in-memory sessions. Unit tests pass, 1,970 of 1,978 with 8 skipped.

**Increment 1 — stub-only runtime (2026-09-24, `f9abe24` on `feat/NO_JIRA-plants-prototype-setup`).** `src/prototype-defaults.js`, imported first from `src/index.js`, sets `STUB_MODE=true`, `SESSION_CACHE_ENGINE=memory` and `PORT=3103` when unset. `mode.js` honours stub mode in production. In stub mode the auth cookie (`src/plugins/auth.js`), the yar session cookie (`session-cache.js`) and the CSRF cookie (`src/plugins/csrf.js`) are not Secure, so sign-in and journey state survive plain http. The default port is 3103 in `config.js`, the README and the Dockerfile. So the patched upstream files are `src/index.js`, `mode.js`, `config.js`, `auth.js`, `csrf.js`, `session-cache.js`, the README and the Dockerfile (`overrides.json` must list them). Verified: lint clean, 1,978 unit tests pass (8 skipped), 231 FIT specs pass, and `npm start` with no env vars logs `server started` on 3103 in stub mode with a memory session cache. **Not yet verified over HTTP:** `curl` is denied in this workspace, so the chooser and each set under `npm start` and `docker run` still need an HTTP check.

**Increment 2 — CI and tooling trim (2026-09-24).** Deleted as the table said, plus `.sonarlint/connectedMode.json`. Removed the Sonar steps from `publish.yml`, `publish-hotfix.yml` and `check-pull-request.yml`, and trimmed the README and `.gitignore`. **Blocked on Sam:** the repo's `.claude/settings.json` still wires three hooks to the deleted Sonar scripts (`pretool-secrets.sh`, `prompt-secrets.sh`, `sonar-analyze.sh`). A guard stops agents editing that file, so Sam removes the `hooks` block. The app's own docs under `src/server/app/` still mention Lighthouse and E2E. They're upstream-owned content, so they're left for the sync to carry.

**Increment 4 — workspace (2026-09-24, workspace repo, branch `feat/NO_JIRA-plants-prototype-setup`).** `repos.json` has `"upstream": "trade-imports-plants-frontend"` on the prototype. `tim workspace setup` validates the field (it must name another repo in the roster) and adds or corrects the `upstream` remote: main only, `--no-tags`, `pushurl=DISABLED`. It leaves a correct one untouched. `scripts/setup.sh` (`make setup`) does the same. The port 3103 is in `docs/local-setup.md`, the CLAUDE.md repo map and `docs/repos/trade-imports-plants-prototype.md`. Verified: 1,511 tim tests pass, lint clean, and a real `tim workspace setup --json` was a no-op, with only the prototype carrying an upstream remote.

**Increment 3 — sync automation (2026-09-24, `f9d2dba`).** `overrides.json` (deleted / ours / patched), `scripts/sync-upstream/` run by `npm run sync:upstream [-- --push --summary <file>]`, `.github/workflows/sync-upstream.yml` (Mondays 04:00 UTC plus manual runs), and `fit/sets-chooser.fit.spec.js`, which opens every set the chooser lists. A PR is a draft labelled `needs-person` only when there's a conflict or a failed check. The sync's own commit uses `--no-verify`, because it may have to record conflict markers and its checks run straight afterwards. `overrides.test.js` keeps the lists consistent with the tree. **A dry run in a throwaway clone merged 11 upstream commits with 47 conflicts.** Plants-frontend did its own EUDPA-619 port under the same file names (router, routes, set-context, bridge, engine, high-risk-plants journeys). That's why the first sync is increment 3b.

**Increment 3b — first sync (2026-09-24, `f0a18aa` merge + `f5373f2`).** **Ruling: upstream's shape wins wherever the two EUDPA-619 ports overlap.** All 47 conflicts took plants-frontend's version. The prototype-only parts now sit on upstream's seams:
- `src/server/prototype-sets/index.js` (prototype-owned) mounts sample-journey and the chooser. `router.js` registers it in place of the redirect to the default set, which is one import and one line.
- The chooser (`src/server/sets-index/`) builds its rows from upstream's `mountedSetIds()` and `withSetContext`.
- `routes-sample-journey.js` uses the shared stub `records`. Upstream's store keeps sets apart.

The diff against `upstream/main` is down from 187 files to 79. Most of that is increment 2's deletions and prototype-owned files. **Only 22 plants-frontend files still carry patches**, each listed by path with a reason in `overrides.json`. `npm run sync:upstream` now reports that upstream is already merged. Verified: lint clean, 1,992 unit tests pass, and all 232 FIT specs pass, including the chooser boot check for both sets. Left as plants-frontend's: `src/server/app/docs/add-a-set.md` still says `/` redirects. `PROTOTYPE.md` covers the prototype's version.

**Increment 6 — CDP drafts (2026-09-24).** `cdp-app-config-draft/` holds `defaults.env` and a `dev` env file mirroring `cdp-app-config`'s layout. The env file sets `STUB_MODE=true` and `SESSION_CACHE_ENGINE=memory` and drops every dependency URL. There's no `PORT`: CDP fixes 8085. There are also specs for the deployment (one instance, everywhere) and service registration (frontend zone). Only `cdp-app-config` is cloned locally, so CPU/memory and the tenant name are left for Sam to copy from plants-frontend. The one secret is `SESSION_COOKIE_PASSWORD`, created in the portal. Sam commits all of it.

**Increment 5 — for designers (2026-09-24, `2682b0f`).** What it adds:
- **The chooser** (`src/server/sets-index/`) gives each prototype a description (`prototype-sets/descriptions.js`). It has a "Reset <organisation>'s data" button per set, which clears and re-seeds only the signed-in organisation's records, and a way to sign in as another organisation (it uses stub sign-in's `?organisationId=`).
- **`src/server/prototype-seed/`** seeds four high-risk-plants notifications (two drafts at different stages, one submitted, one submitted and then amended) for each of two example organisations: Acme Produce Ltd and Riverside Growers Ltd. It creates them through the journey's real routes, using the journey's `happy-path.json` canned data, at `onPostStart`. `stub-org-1`, which the FIT suite uses, is never seeded.
- **`npm run new:set -- <id> [--from <set>]`** (`scripts/new-set/`) scaffolds a set, mounts it in `prototype-sets` and adds it to `ours`. It was proven end to end, and the chooser's boot check picked the new set up.
- **`PROTOTYPE.md`** is the designers' guide, linked from the README.

Two plants-frontend stub files are now patched, taking the total to 24. The stub records store `create`/`copy` store the organisation, and `clear(organisationId)` clears one organisation. Without that, a reset wiped every organisation's data: every designer's on the shared instance, and in FIT, other specs' journeys mid-run. **This belongs in plants-frontend**, and after that it arrives by sync. Verified: 2,044 unit tests pass (8 skipped), 236 FIT specs pass across repeated full runs, and the sync reports upstream already merged.

**Not done: the richer stub address book.** plants-frontend's `services/address-book/stub/index.js` is a hardcoded `STUB_BOOK` with no seam. It needs a `configureStubBook`-style seam in plants-frontend first.

**Seen, not introduced here:** the dashboard lists whatever a browser session's `knownJourneys` cookie names, with no organisation check. So switching organisation in the same browser still shows notifications that browser opened before. It's plants-frontend behaviour.

**Catch-up with plants-frontend #69 (2026-09-25, `f4c4abd`, merge not pushed).** Took upstream's three new commits, including #69 "Align plants with ins and animals, and backport ins's chassis hardening". Seven conflicts, all resolved with upstream's shape and the prototype's deltas re-attached. What moved for the prototype:
- `router.js` now gates the set routes and the root on `auth.enabled`, and the set plugin is exported as `serviceRoutes`. `prototype-sets` registers inside that gate, in place of the redirect.
- `/signout` is gone. Sign-out is `/auth/sign-out`, which stub mode now serves. The co-residency test uses upstream's `registerTestSessionAuth` instead of the prototype's anonymous default strategy.
- Set routes now name the `session` strategy. The chooser and its reset route name it too, with mode `try`.
- `config.js` takes the strict-boolean formats. The new `auth.cookieName` gets `plants-prototype-sid` in development, so `config.test.js` is newly patched. **25 plants-frontend files now carry patches.**
- Upstream dropped the npm pin from its Dockerfile and workflows. The Dockerfile follows. The prototype-owned workflows keep the pin, and `npm-version.js`'s comment names them.
- Upstream now links the header's address book to the INS frontend (`TRADE_IMPORTS_INS_FRONTEND_URL`, default `localhost:3002`), which the prototype doesn't run, so that link goes nowhere. Stub sign-in's signing key is now random per process, so sessions end on restart.

Verified: format and lint clean, 2,101 unit tests pass (8 skipped), all 240 FIT specs pass including the chooser checks, and the sync reports upstream already merged.

**Auth follows plants-frontend (2026-09-25, `0203baa`, not pushed).** Sam's rulings: "Just do what Plants currently does ... get anything custom to do with auth out of the way", and get rid of the organisation switching.
- Sign-in is plants-frontend's, unpatched. `auth.js`, `csrf.js`, `session-cache.js` and `mode.js`'s `isStubMode()` are back to upstream, so production ignores STUB_MODE for sign-in and signs in through Defra ID. Locally, `npm run dev` uses plants-frontend's stub sign-in.
- Data stays stubbed everywhere. `mode.js` gains `isStubDataMode()` (STUB_MODE, or production), which the records, address-book, countries and ports seams call. The session seam is left as plants-frontend's: in production that is yar on the memory cache.
- Organisation handling is gone: no switcher, no "Signed in as", no organisation registry, and the org-scoped stub `clear` patches are reverted. Seeding writes one shared set of example notifications per set, at boot and after a reset, authenticated through `server.inject`'s `auth` option, so it needs no sign-in route. Every signed-in session is given the seeded ids through the session seam. "Reset this prototype's data" clears the set for everyone. `PROTOTYPE_SEED=false` on the FIT web server keeps every spec's dashboard empty.
- **20 plants-frontend files now carry patches** (was 25).
- CDP draft: the dev env adds `AUTH_ENABLED=true` and plants-frontend's `DEFRA_ID_*` values, with the prototype's own redirect URLs. The Defra ID stub keeps no registration list, so nothing needs registering. `DEFRA_ID_CLIENT_SECRET` joins the secrets.

Verified: format and lint clean, 2,103 unit tests pass (8 skipped), 236 FIT specs pass, and the sync reports upstream already merged.

**Note on installing:** ambient npm is 11.17.0 and the repo pins 11.6.2, so plain `npm ci` fails with a false "lockfile out of sync". Use `npx --yes npm@11.6.2 ci`.

---

## Still to do

Nothing on the prototype branch. Everything below landed on 2026-09-24 (see Done), except the richer address book. What's left is Sam's: remove the prototype's stale `.claude/settings.json` hooks, run the HTTP check on `npm start`/`docker run` (curl is denied to agents), commit the CDP drafts, answer the two questions below, and merge the PRs. It's also worth taking an address-book seam upstream into plants-frontend.

The original scope, kept for reference:

### 1. Stub-only runtime, so `npm start` just works

Today `npm start` is `NODE_ENV=production node .`, and `isStubMode()` (`src/server/common/services/mode.js`) is hard-wired to false in production, so the app attempts OIDC discovery and exits after about 7 seconds. A designer must know to set `STUB_MODE=true` and a port.

- Add a prototype-owned defaults module, applied only where a variable isn't already set: `STUB_MODE=true`, `SESSION_CACHE_ENGINE=memory`, `PORT=3103`.
- Load it from one added line at the top of `src/index.js`. Every way of starting the app goes through there: `npm start`, `npm run dev`, the Docker `CMD ["node","src"]` and the FIT web server. So `package.json` and the `Dockerfile` stay as plants-frontend has them.
- `mode.js`: allow stub mode in production. This is the one deliberate change to plants-frontend's behaviour. Upstream the guard stops a committed signing key being used for real sessions; in the prototype there's no real data or real service behind a session.
- Port: a prototype's port is its real twin's plus 100, so **3103**. Only the default changes; `PORT` still wins. `config.js` still says 3003, and the README and Dockerfile still say 3003.

**Done when:** a fresh clone with no environment variables runs `npx --yes npm@11.6.2 ci` then `npm start`, `:3103/` lists both sets, each one opens, and `docker run` behaves the same.

### 2. CI and tooling trim

The prototype owns all of `.github/` and its tooling files.

| File | Action | Why |
|---|---|---|
| `publish.yml`, `publish-hotfix.yml` | Keep, remove the Sonar step | CDP publishes from these |
| `check-pull-request.yml` | Keep build, format, lint, unit tests, Docker smoke build, audit and FIT. Remove Sonar | Cheap checks that stop a broken prototype deploying |
| `e2e-tests.yml`, `lighthouse.yml`, `publish-branch.yml`, `cleanup-e2e-reports.yml` | Delete | E2E and Lighthouse are out; branch images only fed them |
| `dependabot.yml` | Delete | Updates arrive by sync, and its lockfile changes would conflict with every sync |
| `sonar-project.properties`, `.sonarcloud.properties`, `.mcp.json`, `.claude/hooks/sonar-secrets/`, `.claude/sonar-analyze.sh` | Delete | No Sonar project for the prototype |
| `lighthouserc.cjs`, `scripts/lighthouse/`, `scripts/check-workspace-stack.js` | Delete | Nothing left uses them |
| `.dependency-cruiser*`, `.husky/` | Keep | Part of lint, and keeps the code shaped like plants-frontend |
| FIT tests | Keep | Stub-only already, and they're the proof both sets work |

`package.json` scripts pointing at deleted files stay: editing a file plants-frontend changes often, just to delete unused scripts, isn't worth the conflicts.

### 3. Syncing from plants-frontend

- `overrides.json` lists every difference: `deleted` files the sync keeps deleted, `ours` files where the prototype always wins (all of `.github/`), and `patched` upstream files carrying a hook (`src/index.js`, `mode.js`, the identity lines, and now the router and set wiring).
- A sync script fetches `upstream/main`, branches, merges, applies those rules, then runs lint, unit tests **and boots every mounted set**, and opens a PR.
- A weekly workflow runs it and can be triggered by hand. A conflict, or a set that no longer boots, gives a PR marked as needing a person.
- Prototype-only sets, such as `sample-journey`, live only here and never conflict.
- Watch for the reverse case: plants-frontend changing a seam that a prototype-only set implements. The boot check catches it.

### 4. Workspace

- An optional `"upstream"` field in `repos.json`, so `tim workspace setup` adds the `upstream` remote itself (fetch `main` only, no tags, pushing disabled). Only this hand-configured clone has it today.
- Add 3103 to the `docs/local-setup.md` port tables, and note the prototype's port in the CLAUDE.md repo map.

### 5. For designers

1. **`PROTOTYPE.md`**: how to run it, what a set is, how to add one, how syncing works, how a change reaches the real service.
2. **A scaffold command** for a new prototype set: copy or derive a set folder, rename its `TEMPLATES` and cookie names, mount it in the router. It then shows on the chooser automatically.
3. **Chooser extras:** a description per prototype, a "reset this prototype's data" button, and "sign in as another organisation" (stub sign-in accepts `?organisationId=`).
4. **Seeded example notifications** per set, so dashboards aren't empty.
5. **Richer stub data:** a bigger address book, realistic organisations.

### 6. CDP

- The Dockerfile runs unchanged, so no Dockerfile conflicts.
- **Run exactly one instance.** Stub data is in memory, so a second instance would split a designer's journey.
- Draft the `cdp-app-config` entries in `workareas/shared/plants-prototype/cdp-app-config-draft/` for Sam to commit. AI doesn't write to CDP platform repos.
- No SonarCloud project or `SONAR_TOKEN` exists, which is why the Sonar step is skipped when the token is absent.

---

## Decisions already made

1. **Every set is prefixed, none at the root.** A set at the root hides doubled or dropped prefixes.
2. **Keep the real-mode code** rather than stripping it, because syncing matters more than a smaller codebase.
3. **Port 3103:** the real twin's port plus 100.
4. **No Dependabot** in the prototype. Updates arrive by weekly sync.
5. **A prototype is a set.** Prototype-only sets live only in this repo, so designers never edit a file plants-frontend owns.

## Open for Sam

1. **Who can reach the deployed prototype?** It signs in through the Defra ID stub, which lets anyone who reaches it pick a test user. Is CDP's internal-only access enough?
2. **Which CDP environment**, and should every merge to `main` deploy?
