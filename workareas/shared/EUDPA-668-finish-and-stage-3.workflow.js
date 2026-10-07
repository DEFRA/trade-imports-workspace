export const meta = {
  name: 'eudpa-668-finish-and-stage-3',
  description: 'EUDPA-668: fix lockfiles/production images, align Node and eslint config, dependabot, coverage check, then stage 3 override reset and gate per repo, then E2E incl. a locally built defra-id-stub',
  phases: [
    { title: 'Housekeeping' },
    { title: 'Fixes', detail: 'per repo: Node 24.21.0, lockfile, prod image, eslint config, dependabot' },
    { title: 'Stage 3', detail: 'per repo override and pin reset' },
    { title: 'Gate', detail: 'per repo stage 3 gate incl. Linux npm ci and production docker build' },
    { title: 'E2E', detail: 'dev stack with locally built defra-id-stub, suite plus smoke' },
    { title: 'Report' },
  ],
}

const WS = '~/git/defra/trade-imports-workspace'
const BRANCH = 'chore/EUDPA-668-npm-security-sweep'
const STATE = `${WS}/workareas/npm-upgrades/EUDPA-668`
const PLAN = `${WS}/workareas/ticket-planning/EUDPA-668/plan.md`
const REPOS = ['trade-imports-animals-admin','trade-imports-animals-frontend','trade-imports-ins-frontend','trade-imports-plants-frontend','trade-imports-ins-tests','trade-imports-performance-tests','trade-imports-schemas','trade-imports-defra-id-stub']
const NODE = `Node: the host now has Node 24.21.0 (npm 11.19.0) via nvm, but a fresh shell may default to 24.11.1. Run every npm/node command through: bash -lc 'source ~/.nvm/nvm.sh && nvm exec 24.21.0 <cmd>' (from the repo dir via npm --prefix <repo> or nvm exec ... npm --prefix <repo> ...). Check with node -v first.`
const RULES = `Rules: only your repo under ${WS}/repos, on ${BRANCH} (stop if not on it). Never push, never --no-verify. One command per Bash call. The test bar stays as it is: never skip, delete or weaken tests, lower thresholds or add blanket lint disables. Keep npm-upgrade state correct via ${WS}/tools/npm scripts. Commit subjects lower case after "chore(EUDPA-668): ", ending with:
Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012fYmmxKjcTfkCPfjDg7vj7
${NODE}`

phase('Housekeeping')
const house = await agent(`EUDPA-668 housekeeping, workspace ${WS}. (1) Remove leftover git worktrees under ${STATE}/*/main-wt (and any other worktrees under ${STATE}) with git -C <repo> worktree remove --force <path> then git worktree prune; list them first. (2) Delete the gitignored probe file ${WS}/repos/trade-imports-performance-tests/reports/zz-probe/bad.js and its empty folder (confirm it is untracked/ignored first). (3) Remove throwaway docker images created by the run: eudpa668-plants-frontend:dev-s01, eudpa668-plants-frontend:prod-s01, admin-gate2-check, and any other image whose name starts with eudpa668 or ends -gate2-check (list docker images first; do not touch stack images or volumes; leave the running stack alone). One command per Bash call. Report what was removed.`, { label: 'housekeeping', phase: 'Housekeeping' })

const fixPrompt = repo => `EUDPA-668 fixes for ${repo} (${WS}/repos/${repo}). Read ${PLAN} Implementation Notes for context. Do whichever apply to this repo, one commit each:
1. Node alignment: every repo ends on Node 24.21.0. If .nvmrc / engines / CI node-version / Dockerfile ARG PARENT_VERSION are on another version, move them to 24.21.0 and the Dockerfile parent to 3.2.3-node24.21.0 (that tag exists for defradigital/node-development and defradigital/node). Keep CI using node-version-file .nvmrc where it already does.
2. Lockfile integrity: the Docker base image ships npm 12, CI's setup-node with Node 24.21.0 ships npm 11.19. Earlier steps used host npm 11.6.2, which strips optional lock entries npm 12 needs (admin's production build fails: "Missing: sass@1.105.1 / chokidar@5.0.0 / readdirp@5.1.1 from lock file"). Prove the lockfile is good: (a) run npm ci in a node:24.21.0 container (docker run --rm -v <copy>:/work -w /work node:24.21.0 npm ci --ignore-scripts) against a scratch copy of the repo, and (b) if the repo has a Dockerfile, docker build --target production (or the repo's production target) with a throwaway tag, then delete the image. If either fails on missing lock entries, regenerate with host npm 11.19 (nvm exec 24.21.0 npm install --package-lock-only), check git diff is lockfile-only and sensible, re-run (a) and (b), and commit "regenerate the lockfile with npm 11.19". If packageManager pins npm@11.6.2, move it to npm@11.19.0 in the same commit so local installs match.
3. eslint config: if eslint.config.js uses globalIgnores(resolveIgnoresFromGitignore()) or a bare { ignores: resolveIgnoresFromGitignore() }, switch to the includeIgnoreFile form used in ${WS}/repos/trade-imports-animals-admin/eslint.config.js (works from any working directory); run npm run lint from the repo and from another directory (npx eslint --config <repo>/eslint.config.js <repo>) to prove it.
4. dependabot: if .github/dependabot.yml ignores eslint or eslint-* (or neostandard), remove that ignore now the repo is on eslint 10. Don't change anything else in it.
After all: npm test, npm run lint, format:check, build:frontend where present, npm run security-audit. Return a short report per item: applied / not applicable, commit, evidence.
${RULES}`

const stage3Prompt = repo => `EUDPA-668 stage 3 for ${repo}: plan ${PLAN} steps 14 and 15 and decision D6 (an override/pin is only put back for a high/critical advisory or a failing test, lint or build; moderates/lows are listed for information). Use ${WS}/tools/npm/reset-overrides.sh (see ${WS}/tools/npm/README.md; it works in a throwaway worktree and commits only the proven result). Beyond package.json overrides, also review the other temporary security pins/patches listed for this repo in the plan's stage 3 inventory (e.g. exact pins added only for an advisory, .snyk files, resolutions): remove each that is no longer needed, proving it with audit + tests, one commit per kind. Before you start, capture the current overrides; after, give a table: entry, removed/kept, reason (GHSA or failing check + log excerpt). Make sure the commit body of a "keep" includes that table.
${RULES}`

const gatePrompt = repo => `EUDPA-668 stage 3 gate for ${repo} (plan ${PLAN} step 15). Read-only, do not commit. On ${BRANCH}: git status clean; git log main..HEAD --oneline; in a scratch copy, docker run node:24.21.0 npm ci (Linux) succeeds; if a Dockerfile exists, docker build its production target succeeds and the container starts (run it briefly and check it listens/logs startup; delete the image after); host (Node 24.21.0) npm ci, npm test, npm run lint, format:check, build:frontend, test:fit:ci where present; npm run security-audit and ${WS}/tools/npm/audit-baseline.sh green with no fixable_allowlisted; npm outdated --json lists only knowingly-ahead/prerelease items (cssnano false latest, neostandard 0.14.0-next.1); every remaining override has a recorded reason. ${NODE}
Return PASS/FAIL with evidence and any problem.`

const results = await pipeline(
  REPOS,
  repo => agent(fixPrompt(repo), { label: `fix:${repo.replace('trade-imports-', '')}`, phase: 'Fixes' }),
  (fix, repo) => agent(stage3Prompt(repo), { label: `stage3:${repo.replace('trade-imports-', '')}`, phase: 'Stage 3' }).then(s3 => ({ fix, s3 })),
  (prev, repo) => agent(gatePrompt(repo), { label: `gate:${repo.replace('trade-imports-', '')}`, phase: 'Gate' }).then(gate => ({ repo, ...prev, gate })),
)

const coverage = await agent(`EUDPA-668: explain defra-id-stub's coverage drop (statements 94.78 → ~91.6, branches 90.37 → 84.21 vs main) without changing the branch. Make two git worktrees of ${WS}/repos/trade-imports-defra-id-stub under ${STATE}/trade-imports-defra-id-stub/cov-main and cov-branch (main and ${BRANCH}), npm ci in each (${NODE}), run the coverage the way CI does (npm test), and compare per-file coverage (json-summary or the text report). Decide whether the drop is (a) vitest 4+'s different counting / include set (e.g. new files counted, v8 remapping changes) or (b) real lost coverage (a test no longer exercising code). Prove it, e.g. by running main's code with vitest 5 config. Then remove both worktrees. Read-only on the repo. Return verdict, per-file evidence for the biggest movers, and any fix needed.`, { label: 'coverage:defra-id-stub', phase: 'Gate' })

phase('E2E')
const e2e = await agent(`EUDPA-668 E2E. Read ${WS}/docker/stack/AGENTS.md and ${WS}/docs/reference/workflows.md. The dev stack may be running. Goal: run the whole ins-tests suite against a stack built from local source on ${BRANCH} in every repo, INCLUDING trade-imports-defra-id-stub (dev.compose.yml normally runs the stub from :latest). Find the supported way to run defra-id-stub from local source (e.g. a dev overlay, a build flag, or building the image locally with the tag the compose file uses: docker build -t <that image>:<tag> ${WS}/repos/trade-imports-defra-id-stub); do not edit docker/stack/.staged/. Rebuild/restart the stack (run-stack.sh -d), wait for health, confirm the running stub container is the local build (image id / created time). Run npm run test:docker-compose in trade-imports-ins-tests (no extra reporter flags). Re-run failures once; classify regression / pre-existing / flake with evidence. Then a manual smoke through the stub: sign in to animals-frontend and ins-frontend via the stub (curl or Playwright script) and confirm a session is created; check the stub's logs for proxy/TLS (global-agent 4, undici 8) or pino errors. Leave the stack running. One command per Bash call; never push, never commit.
Return totals, failures classified, smoke result, and how the local stub was wired in.`, { label: 'e2e', phase: 'E2E' })

phase('Report')
const report = await agent(`Write the EUDPA-668 report for the parent from these results: housekeeping; per repo the fixes, stage 3 override table (removed / kept with reason), gate verdict; the defra-id-stub coverage verdict; the E2E outcome. Then whether every repo is ready to push, and anything that needs the user. Plain English, tables, no filler.
HOUSEKEEPING: ${house}
RESULTS: ${JSON.stringify(results)}
COVERAGE: ${coverage}
E2E: ${e2e}`, { label: 'report', phase: 'Report' })

return { house, results, coverage, e2e, report }