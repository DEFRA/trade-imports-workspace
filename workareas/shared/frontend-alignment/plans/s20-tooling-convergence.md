# s20 — tooling convergence: one tooling shape across the three frontends

Questions 17, 18, 21, 23 and 26, landing as **one commit per repo** on
`feat/NO_JIRA-frontend-alignment`.

Sam's ruling, 16 September 2026:

> Q17 and Q18 together. A non-Node developer did these; not convinced the
> solution was required, so step back, implement a nice succinct minimal
> solution and make it consistent across them all. Watch the ins pipeline and
> make sure it all works. Q21 yes, add the cleanup workflow. Q23 yes, take the
> plugin. Q26 yes, do the housekeeping.

## Repos and their two path spellings

| Key | Bash path (tilde — a literal `/Users/...` in Bash is DENIED) | Read/Write/Edit path (absolute) |
| --- | --- | --- |
| ins | `~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend` |
| animals | `~/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-animals-frontend` |
| plants | `~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` | `/Users/samfarrington/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend` |
| workspace | `~/git/defra/trade-imports-workspace` | `/Users/samfarrington/git/defra/trade-imports-workspace` |

All three repo checkouts are on `feat/NO_JIRA-frontend-alignment` with clean
working trees. Logs go to
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/`
and are read **once** with the Read tool.

### Baseline, captured before planning (all green)

| Repo | build:frontend | format:check | lint | test |
| --- | --- | --- | --- | --- |
| ins | 0 | 0 | 0 | 61 files, 595 tests, 94.68% statements |
| animals | — | 0 | 0 | 183 passed + 2 skipped files, 2350 passed + 8 skipped |
| plants | — | 0 | 0 | 146 passed + 2 skipped files, 1921 passed + 8 skipped |

`s20-tooling-convergence-baseline-<repo>-<script>.log` in the logs directory.
Also captured: `…-ins-audit-critical.log` (exit 0), `…-ins-audit-high.log`
(exit 1, 27 vulnerabilities — 5 low, 5 moderate, 17 high),
`…-animals-audit.log` and `…-plants-audit.log` (both exit 0 at `high`).

---

## 0. Decisions

Everything the brief left open is settled here. **Do not re-open any of it and
do not invent a variant.**

### D1 — Q17/Q18: the npm pin goes; the lockfiles get fixed instead

The brief asks four questions before deciding. The answers, from evidence:

**What problem does the pin solve?** One unstable lockfile. `sass` is an
optional peer of `sass-loader@17`. A newer npm resolves it into the tree; an
older one does not. A lockfile written without a `node_modules/sass` entry is
therefore rejected by the newer npm with `Missing: sass@1.100.0, chokidar@5.0.0,
readdirp@5.1.1 from lock file`. Grep proves the asymmetry — only ins's
`package-lock.json` has a `"node_modules/sass"` entry:

```bash
grep -n '"node_modules/sass"' <each repo>/package-lock.json
# hits ins only
```

ins gained it during the Lighthouse stage by declaring `sass` as a
devDependency, and ins consequently installs cleanly under the ambient
npm 11.17.0 while both journeys fail. The pin is a workaround for that one
lockfile, generalised into machinery.

**Does `install:pinned-npm` add anything the journeys' `npx` route does
not?** No. It is `npx --yes "$(node scripts/npm-version.js)" install` — the
same `npx` route the journeys document, wrapped in a script and a validator.
Once the lockfile installs under any modern npm it adds nothing at all.

**Does the temporary issue still exist on the current Node and npm?** Only
where the lockfile is missing the `sass` entry. On ins it is already gone. In
CI it was near-redundant even before that: `actions/setup-node` with
`node-version-file: .nvmrc` already fixes the npm, so the align step was
re-installing a version within a patch or two of what the runner already had.

**What is the one simplest shape?** Declare `sass` where it is missing, and
delete the pin. `engines` becomes the single statement about tool versions:

```json
"engines": {
  "node": ">=24",
  "npm": ">=11.6.2"
}
```

So, in all three repos:

- **delete** `scripts/npm-version.js`
- **delete** the `packageManager` field from `package.json`
- **delete** every "Align npm with the version pinned in package.json" step and
  its comment from `check-pull-request.yml`, `publish.yml`,
  `publish-hotfix.yml` and `lighthouse.yml`
- **delete** both `USER root … npm install --global "$(node scripts/npm-version.js)"`
  blocks from the `Dockerfile`, with their comments and the two
  `COPY … scripts/npm-version.js` lines that feed them
- **delete** ins's `install:pinned-npm` script and the README paragraph that
  sends you to it
- **keep** `engines` exactly as it is in all three (already identical)
- **add** `"sass": "1.100.0"` to animals' and plants' devDependencies and
  regenerate their lockfiles, so their trees stop depending on which npm
  resolves them

This is the minimal shape and it removes about sixty lines of bespoke
machinery, a hand-written validator script and a root-run global install from
every Docker build. The residual risk — a developer on a much newer npm
regenerating a lockfile an older CI npm rejects — is carried by the `engines`
floor and caught by `npm ci` on the PR, which is where it was always caught.

### D2 — direction where the three differ

The header's rule applies: ins moves toward the journeys, and where the
journeys differ from each other, plants is the tidier fork and wins.
Concretely:

| File | Who is right | Why |
| --- | --- | --- |
| `check-pull-request.yml` | plants | has the separate `security-audit` job with its rationale, `actions/*@v7`, and the accurate STUB_MODE comment |
| `publish.yml` | plants | has the `concurrency` block; animals has none and carries commented-out template cruft; ins's is copied wrong (`$${{`) with an invalid `queue: max` key |
| `publish-hotfix.yml` | plants | has `concurrency`, an active SonarCloud scan and `actions/*@v7`; ins's SonarCloud step is commented out |
| `eslint.config.js` | animals **and** plants (byte-identical) | ins takes it verbatim |
| `.husky/pre-commit` | all three (already identical) | no change |
| `Dockerfile` | all three (already identical bar `ARG PORT` and `PARENT_VERSION`) | only the pin blocks come out |
| `lighthouse.yml` | already converged in s14 | only the align step comes out |

### D3 — Q17: ins takes `postinstall`, and the hook loses the audit

ins gains `"postinstall": "npm run setup:husky"`, so the hook installs on
clone as it does in the journeys. In exchange ins's
`git:pre-commit-hook` drops `npm run security-audit` and becomes the
journeys' `npm run format:check && npm run lint && npm test`. An automatic
pre-commit hook that runs `npm audit` against a live advisory feed turns every
commit red for a newly published advisory in a transitive dependency — exactly
the failure mode the journeys' CI comment already documents as the reason the
audit is its own job. The audit stays in CI, in its own job, in all three.

### D4 — Q17: `security-audit` runs at `high` in all three, and ins is fixed to pass

ins moves `critical` → `high`. It currently fails at `high` with 17 highs in
two clusters, both fixable with non-breaking `overrides` the journeys already
carry:

| Cluster | ins today | journeys | Fix |
| --- | --- | --- | --- |
| `brace-expansion` (high, GHSA-rgw5-rvv9-x895) | overridden to `5.0.8`, which is itself inside the vulnerable `4.0.0 - 5.0.8` range | `^5.0.9` | take `^5.0.9` |
| `tmp` (high, GHSA-52f5-9888-hmc6 / GHSA-ph9p-34f9-6g65) via `@lhci/cli` and `external-editor` | no override | `0.2.7` | add `0.2.7` |

`uuid` (moderate, GHSA-w5hq-g745-h8pq) is cleared for free by the journeys'
`"uuid": "11.1.1"`; take it too. `minimatch: "10.2.4"` comes out — the
journeys carry no such override and `brace-expansion@^5.0.9` removes the
reason for it. The `@hapi/joi` prototype-pollution finding under `blankie` and
`hapi-pulse` is **below high** and is present in the animals tree as well
(animals passes at `high` with it), so it needs no dependency bump; do **not**
touch `hapi-pulse`. If, after the overrides, a high remains that has no
non-breaking fix, record it in the stage notes with the package name and why,
and keep `high` — never lower the level and never add an audit exclusion.

### D5 — Q26: `ARG PORT=3002` is safe

`src/config/config.js` defaults `port` to `3002` and the compose stack sets
`PORT=3002` explicitly
(`docker/stack/frontend.compose.yml:103`), so the `ARG` default only affects
`EXPOSE` metadata and a bare `docker run`. Change it.

### D6 — the Playwright artifact name becomes the same in all three

ins uploads `ins-frontend-playwright-report`; both journeys upload
`frontend-playwright-report`. Nothing in the workspace reads either name
(grepped across `tools/`, `tim/`, `.github/`, `docs/`, `scripts/`). Artifacts
are scoped to a workflow run, so uniqueness across repos buys nothing. All
three become `frontend-playwright-report`.

### D7 — `PARENT_VERSION` is left alone

ins is on `3.0.5-node24.14.1`, the journeys on `2.10.1-node24.11.1`. That is a
base-image version, not tooling shape, and moving it is a dependency bump with
its own blast radius. Out of scope; each repo keeps its own.

### D8 — the `docker build` tag in animals is corrected

animals tags the PR smoke build `cdp-node-frontend-template`, a template
leftover; ins and plants already use their own repo name. animals becomes
`trade-imports-animals-frontend`.

### D9 — Q23: fix findings, never silence them

Adding `eslint-plugin-sonarjs` and the `no-magic-numbers` block to ins will
raise findings in `src/server/**`. Every one is fixed in the source. **No
`eslint-disable` comments, no rule removed from the config, no `files`/
`ignores` pattern widened to dodge a file.** The fixes follow
`docs/best-practices/node/code-style.md`: rule 13 (extract a named constant —
ins already has `src/server/common/constants/status-codes.js` to put HTTP
codes in), rule 5 (extract a small named helper when
`sonarjs/cognitive-complexity`, `sonarjs/max-lines-per-function` or
`sonarjs/cyclomatic-complexity` fires), rule 6 (explicit names, no
abbreviations, when renaming a shadowed binding for `no-shadow`), and rule 15
(no comment explaining the fix — the name carries it). The findings are
recorded in the stage notes.

### D10 — one commit per repo

Three commits, one per repo, all on `feat/NO_JIRA-frontend-alignment`. The ins
commit is the one whose pipeline is the proof.

---

## 1. Moves

| From | To | Repos |
| --- | --- | --- |
| `scripts/npm-version.js` | deleted (`git rm`) | ins, animals, plants |
| `.github/workflows/cleanup-e2e-reports.yml` (animals) | new file, byte-identical, in ins | ins |

No other file moves. No test file moves. Delete with
`git -C <repo> rm scripts/npm-version.js`, never a bare recursive `rm`.

---

## 2. Edits

### 2.1 `package.json`

#### ins — `/Users/samfarrington/…/trade-imports-ins-frontend/package.json`

1. Delete line 12, `"packageManager": "npm@11.6.2",`. Leave `engines`
   (lines 8–11) untouched.
2. Delete line 21, the `install:pinned-npm` entry.
3. Change `git:pre-commit-hook` to drop the audit, so it reads exactly as the
   journeys':

   ```json
   "git:pre-commit-hook": "npm run format:check && npm run lint && npm test",
   ```

4. Add `postinstall` directly after `git:pre-commit-hook`, in the journeys'
   position:

   ```json
   "postinstall": "npm run setup:husky",
   ```

5. Change `security-audit` to:

   ```json
   "security-audit": "npm audit --audit-level=high",
   ```

6. Add `"eslint-plugin-sonarjs": "4.2.0"` to `devDependencies`, alphabetically
   between `eslint` and `husky` — the journeys' position and version.
7. Replace the `overrides` block with (keeping ins's existing `lighthouse` and
   `puppeteer-core` entries, which the journeys also carry):

   ```json
   "overrides": {
     "brace-expansion": "^5.0.9",
     "tmp": "0.2.7",
     "uuid": "11.1.1",
     "lighthouse": {
       ".": "13.4.1",
       "ws": "7.5.11"
     },
     "puppeteer-core": {
       "ws": "8.21.0"
     }
   }
   ```

   `minimatch` is gone deliberately (D4). Do not import the journeys' other
   override entries (`qs`, `postcss`, `serialize-javascript`, `flatted`,
   `vite`, `esbuild`) — they pin packages ins's audit does not flag, and an
   override for a package that is not in the tree is dead config.

#### animals and plants — both `package.json`

1. Delete line 12, `"packageManager": "npm@11.6.2",`.
2. Add `"sass": "1.100.0"` to `devDependencies`, immediately before
   `"sass-embedded": "1.100.0"` — the same pair and the same version ins
   carries at lines 110–111.

Nothing else in either file changes.

### 2.2 Lockfiles

After the `package.json` edits, in each of the three repos:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> install
```

Commit the resulting `package-lock.json` in all three. Then prove the lockfile
is the thing that was broken, in animals and plants:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> ci
```

must exit 0 under the ambient npm (11.17.0 here). That is the check that
replaces the pin. If it still reports `Missing: … from lock file`, the `sass`
entry did not land — inspect with
`grep -n '"node_modules/sass"' <repo>/package-lock.json` before changing
anything else, and **stop and report** rather than restoring the pin.

### 2.3 `Dockerfile` — all three

Delete four regions, identical in all three files:

- line 17, `COPY --chown=node:node --chmod=755 scripts/npm-version.js ./scripts/`
- lines 19–32, the six-line comment starting `# Same pin as the GitHub Actions
  workflows:` through `USER node`, leaving one blank line between the
  `COPY … package*.json` line and `RUN npm install`
- line 59, `COPY --from=production_build /home/node/scripts/npm-version.js ./scripts/`
- lines 63–68, the comment `# See the development stage: …` through
  `USER node`, leaving one blank line before `RUN npm ci --omit=dev`

The development stage then reads:

```dockerfile
COPY --chown=node:node --chmod=755 package*.json ./

RUN npm install
COPY --chown=node:node --chmod=755 . .
RUN npm run build:frontend
```

and the production stage:

```dockerfile
COPY --from=production_build /home/node/package*.json ./
COPY --from=production_build /home/node/src ./src/
COPY --from=production_build /home/node/.public/ ./.public/

RUN npm ci --omit=dev
```

**ins only, additionally:** line 2, `ARG PORT=3000` → `ARG PORT=3002` (D5).

Nothing else changes — `PARENT_VERSION` stays as each repo has it (D7).

### 2.4 `.github/workflows/check-pull-request.yml`

Target shape for all three is plants' current file **minus** the two
`Align npm with the version pinned in package.json` steps and their comments,
with three per-repo substitutions.

**ins** — rewrite to plants' shape:

- `actions/checkout@v6` → `@v7` and `actions/setup-node@v6` → `@v7`
  (three occurrences each).
- Delete the align steps at lines 29–37 and 83–84, comment included.
- Delete the `Security audit` step from `pr-validator` (lines 48–49) and add
  the journeys' standalone `security-audit` job between `pr-validator` and
  `playwright`, verbatim, comment included:

  ```yaml
    # Deliberately a separate job from pr-validator. `npm audit` scans the whole
    # installed tree against a live advisory feed, so a newly published advisory
    # turns every open PR red regardless of what that PR changed — and advisories
    # on indirect dependencies often have no upgrade path, needing a hand-written
    # `overrides` entry on main to clear. Folded into pr-validator, that failure
    # mode blocks the very PR carrying the fix. Kept separate, the audit stays
    # visible on every PR without being the check that gates the merge.
    security-audit:
      name: Security audit
      runs-on: ubuntu-latest
      steps:
        - name: Checkout code
          uses: actions/checkout@v7

        - name: Set up Node
          uses: actions/setup-node@v7
          with:
            node-version-file: .nvmrc
            cache: npm

        - name: Install dependencies
          run: npm ci

        - name: Security audit
          run: npm run security-audit
  ```

- Keep the `docker build --no-cache --tag trade-imports-ins-frontend .` line.
- Keep ins's own `playwright` job comment — it names ins's projects (`smoke`
  and `features`); the rest of the wording already matches plants'.
- Artifact `name:` `ins-frontend-playwright-report` → `frontend-playwright-report`
  (D6).

**animals**:

- Delete the align steps (lines 29–37, 80–81 and 107–108) and their comments.
- `--tag cdp-node-frontend-template` → `--tag trade-imports-animals-frontend`
  (D8).
- Replace the `playwright` job comment with plants', keeping animals' project
  names:

  ```yaml
    # The frontend owns two Playwright projects — `features` and `journeys` —
    # which boot the app themselves with STUB_MODE=true: stub data and a locally
    # signed session in place of the Defra ID round-trip, auth still enforced (see
    # src/server/auth/stub-sign-in.js), so they need no workspace stack, unlike
    # the separate "E2E Tests" check. Kept out of pr-validator so a browser run
    # does not sit in front of the rest of the PR checks.
  ```

**plants**:

- Delete the align steps (lines 29–37, 80–81 and 109–110) and their comments.
  Nothing else.

After the edits, the three files must differ **only** in the `docker build`
tag and in the two project names inside the `playwright` job comment. Prove it
with the diffs in §6.

### 2.5 `.github/workflows/publish.yml`

Target for all three is plants' current file minus the align step, with
`image-name` per repo.

**ins**: fix the `concurrency` block to plants' exactly — the doubled dollar
is a bug and `queue: max` is not a GitHub Actions key:

```yaml
concurrency:
  group: ${{ github.workflow }}
  cancel-in-progress: false
```

Then `actions/setup-node@v6` → `@v7`, and delete the align step and its
two-line comment (lines 36–39).

**animals**: add that same `concurrency` block after the `on:` block; delete
the commented-out `#      Uncomment this section …` template cruft (lines
26–27); normalise `AWS_ACCOUNT_ID: "094954420758"` to single quotes; delete
the align step and its three-line comment (lines 34–38).

**plants**: delete the align step and its two-line comment (lines 35–39).

### 2.6 `.github/workflows/publish-hotfix.yml`

Target for all three is plants' current file **byte-for-byte** — it carries no
per-repo value at all.

**ins**: add the `concurrency` block, `actions/*@v6` → `@v7`, delete the align
step and comment, normalise `AWS_ACCOUNT_ID` quoting, and **uncomment the
SonarCloud step** so it matches plants':

```yaml
      - name: SonarCloud Scan
        if: github.actor != 'dependabot[bot]'
        uses: SonarSource/sonarqube-scan-action@master
        env:
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}
```

**animals**: add the `concurrency` block, delete the align step and comment,
normalise `AWS_ACCOUNT_ID` quoting.

**plants**: no change.

### 2.7 `.github/workflows/lighthouse.yml` — all three

Delete the align step and its comment (the block around lines 78–83 ending
`run: npm install --global "$(node scripts/npm-version.js)"`). The rest of the
file is already converged and must not be touched. After the edit the three
files differ only in the `repository:` value at line 68 and in plants' longer
comment at lines 162–164, which is as it was before this stage.

### 2.8 `.github/workflows/publish-branch.yml`

No change — already identical in all three bar `image-name`.

### 2.9 `eslint.config.js` — ins

Replace ins's eight-line file with animals'/plants' file **verbatim** (the two
are byte-identical; copy either). Do not re-order the rules, do not drop a
rule, do not adjust a threshold.

### 2.10 `README.md` — all three

Two sections become identical wording in all three, differing only in the repo
name inside the `cd`.

**The Node.js requirement.** ins (lines 44–59) and plants (lines 48–49) both
claim npm 11.6.2 is "pinned by `packageManager`"; that stops being true.
animals has no such paragraph. All three become:

```markdown
### Node.js

Node 24 or later, and npm 11.6.2 or later — the floor in `engines`.

To use the correct version of Node.js for this application, via nvm:

```bash
cd <repo-directory-name>
nvm use
```
```

ins additionally loses the whole "Then install with the pinned npm …" sentence
and its `npm run install:pinned-npm` fenced block (lines 54–59).

**Git hooks.** Directly after the `### Setup` install block
(`npm install`) in all three:

```markdown
### Git hooks

`npm install` installs the pre-commit hook — `postinstall` runs
`npm run setup:husky`. The hook runs `npm run git:pre-commit-hook`: format
check, lint and the unit suite.
```

ins replaces its existing "The pre-commit hook is opt-in …" paragraph (lines
89–93) with that; animals and plants gain the section. No other README prose
changes in this stage — the surrounding headings differ in case and wording
between repos and that is somebody else's question.

---

## 3. New files

| File | Repo | Intent | Imitate |
| --- | --- | --- | --- |
| `.github/workflows/cleanup-e2e-reports.yml` | ins | The nineteen-line `gh-pages` pruner that calls the workspace's reusable workflow, so ins's `gh-pages` stops gaining a `lighthouse/<branch>/` directory per branch. | `repos/trade-imports-animals-frontend/.github/workflows/cleanup-e2e-reports.yml` — copy it **byte-for-byte**. |

The brief says "with the service name changed": there is no service name in
the file. It names no image, no repo and no port — it passes only
`head-ref: ${{ github.head_ref || '' }}` to
`DEFRA/trade-imports-workspace/.github/workflows/cleanup-e2e-reports.yml@main`.
animals' and plants' copies are already identical to each other. Copy, change
nothing.

No other new files. No new test files (see §5).

---

## 4. Imports

This stage disturbs no JavaScript module graph. `scripts/npm-version.js` had
no importers — it was invoked as `node scripts/npm-version.js` from shell
steps only, and every one of those call sites is deleted in §2.3, §2.4, §2.5,
§2.6 and §2.7. After the edits this must return nothing in all three repos:

```bash
grep -rn "npm-version\|install:pinned-npm\|packageManager" <repo> \
  --exclude-dir=node_modules --exclude-dir=.git --exclude=package-lock.json
```

`eslint.config.js` in ins gains one import,
`import sonarjs from 'eslint-plugin-sonarjs'`, copied with the file.

Any import added while fixing a Q23 lint finding follows the repo's existing
convention — relative specifiers within `src/`, as s02 settled. Do not
introduce a cross-repo import or a shared package (programme invariant 4).

---

## 5. Tests

**No test moves. No new test files.** This stage changes build and CI
configuration, and `scripts/npm-version.js` — the one deleted script — has no
test in any of the three repos (`find … /scripts -type f` shows tests only
under `scripts/lighthouse/`).

Tests may **change** in exactly one circumstance: a Q23 lint finding in a file
under `src/server/**` whose fix (an extracted constant, an extracted helper, a
renamed shadowed binding) moves something a test asserts on. Then:

- Change the test to follow the code, never the other way round. Keep the
  assertion's intent — if a test pinned a literal `400`, it pins
  `statusCodes.badRequest` afterwards, not a looser matcher.
- Do not add a test for an extracted constant or helper whose behaviour the
  existing test already covers — that is coverage padding.
- Mock at the network boundary with `nock`, as ins already does; do not
  introduce a module-boundary mock (programme invariant 9, and
  `docs/best-practices/node/testing/frontend.md`).

The unit counts in §6 are the pin: ins must still report **595 tests** unless
a lint fix genuinely changed a behaviour, in which case say which and why in
the commit body and the stage notes.

---

## 6. Invariants to prove

Run these after the edits, before committing. Each is a command whose output
goes to a file under
`~/git/defra/trade-imports-workspace/workareas/shared/frontend-alignment/logs/`
and is read once.

**I1 — the pin is gone, with no stragglers.** In each repo:

```bash
grep -rn "npm-version\|install:pinned-npm\|packageManager" ~/git/defra/trade-imports-workspace/repos/<repo> --exclude-dir=node_modules --exclude-dir=.git --exclude=package-lock.json
```

Must return nothing, in all three. (`package-lock.json` is excluded because it
records its own root `packageManager`-adjacent metadata; the field itself must
be absent from `package.json`, which the grep above covers.)

**I2 — the lockfile is the fix.** In animals and plants:

```bash
grep -n '"node_modules/sass"' ~/git/defra/trade-imports-workspace/repos/<repo>/package-lock.json
```

Must hit. Then `npm ci` must exit 0 in all three under the **ambient** npm,
and additionally in animals and plants under **npm 11.6.2** (the npm their
`.nvmrc` Node bundles, and the one their CI and Docker builds use):
`~/.nvm/versions/node/v24.11.1/bin/npm ci --dry-run`, run with the repo
directory as cwd, logged to
`workareas/shared/frontend-alignment/logs/`. Both directions must pass before
the branch is pushed.

**I3 — the workflows converged.** Four diffs, each with a known, enumerated
residue and nothing else:

```bash
diff ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/.github/workflows/publish-hotfix.yml ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-frontend/.github/workflows/publish-hotfix.yml
# expected: no output at all
diff .../cleanup-e2e-reports.yml (ins vs animals)
# expected: no output at all
diff .../publish.yml (ins vs plants, animals vs plants)
# expected: the image-name line only
diff .../check-pull-request.yml (ins vs plants, animals vs plants)
# expected: the docker build tag, and the two project names in the playwright comment
diff .../lighthouse.yml (ins vs plants, animals vs plants)
# expected: the repository: line (and plants' longer comment at 162-164)
```

**I4 — eslint.config.js is byte-equal in all three.**

```bash
diff ~/…/trade-imports-ins-frontend/eslint.config.js ~/…/trade-imports-plants-frontend/eslint.config.js
```

Must produce no output.

**I5 — `.husky/pre-commit` and `scripts/npm-version.js`.** `pre-commit` is
already byte-equal in all three and must stay so (`diff`, no output).
`scripts/npm-version.js` must not exist in any repo (`find … -name npm-version.js`
returns nothing).

**I6 — the audit passes at `high` everywhere.**

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> run security-audit
```

Exit 0 in all three. If ins cannot reach it, record each remaining high in the
stage notes with the package and why it has no non-breaking fix, and keep the
level at `high` (D4).

**I7 — the ladder is green in every repo.** In this order, per repo, each to
its own log file:

```bash
npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> run build:frontend
npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> run format:check
npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> run lint
npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> test
```

Against the baseline: ins 61 files / 595 tests; animals 183 (+2 skipped) /
2350 (+8 skipped); plants 146 (+2 skipped) / 1921 (+8 skipped). Formatting is
fixed **only** by `npm --prefix <repo> run format` — never by hand, never by a
bare `prettier`.

**I8 — no lint finding silenced.**

```bash
grep -rn "eslint-disable" ~/git/defra/trade-imports-workspace/repos/trade-imports-ins-frontend/src --exclude-dir=node_modules
```

Must return no new hits relative to `git -C … diff`. And `git -C <ins> diff
eslint.config.js` must show only the whole-file replacement from §2.9 — no
rule dropped, no pattern widened.

**I9 — programme invariant 1, the public URL surface of ins is unchanged.**
This stage touches no route. Prove it by confirming
`git -C <ins> diff --name-only` lists no file under `src/server/router.js`,
`src/server/app/routes.js` or any `features/*/index.js`, unless a Q23 lint fix
landed inside one — in which case the diff must be a rename or an extracted
constant and nothing that changes a `path:`.

**I10 — all three pipelines are the proof.** The stage is not done until, on
the ins PR, `check-pull-request` (all three jobs), `Publish Branch Image` and
SonarCloud are green and the CI watcher reports it — and until the same
`check-pull-request` is green on the animals and plants PRs. That second half
is not optional: animals and plants pin `.nvmrc` to `v24.11.1`, whose bundled
npm is **11.6.2** — the exact version the deleted `packageManager` field named
— so their three `npm ci` jobs and their Dockerfile's `npm ci --omit=dev` are
the only place D1's regenerated lockfiles are ever installed by the npm that
actually ships them. ins runs Node 24.14.1 and proves nothing about that
direction. The Docker build inside `check-pull-request` is what proves the
Dockerfile still installs without the pin — treat a red there as a real
finding about D1, report it, and do not paper over it by restoring the pin
without a ruling. A `Missing: … from lock file` red on animals or plants has a
pre-agreed remedy: regenerate that repo's lockfile with npm 11.6.2 (keeping
`sass` a declared devDependency), never restore the pin.

---

## 7. Out of scope

Leave these alone even though the files are open in front of you:

- **`.github/dependabot.yml`.** ins still carries the old CDP template version
  (five name-pattern groups, weekly) where animals and plants are converged on
  one rolling patch-and-minor group excluding `govuk-frontend`, daily, with
  the same policy for github-actions. That is a cadence and auto-merge policy
  choice, not a mechanical convergence. Recorded as an open question on the
  stage; it is not question 17, 18, 21, 23 or 26.
- **`PARENT_VERSION`** in any Dockerfile (D7).
- **`hapi-pulse`, `blankie` and the `@hapi/joi` advisory.** Below `high`,
  present in the animals tree too, no bump needed (D4).
- **`e2e-tests.yml`.** animals and plants have it, ins does not. Q21 asked only
  for the cleanup workflow.
- **Source under `src/`**, except exactly what a Q23 lint finding requires.
- **Auth.** `src/plugins/auth.js`, `src/server/auth/*`, the EUDPA-333
  handshake and ins's `ins-sid` cookie isolation are settled by s17 and by the
  drift note already on this stage.
- **Countries.** Question 29 (whether ins takes the journeys' full countries
  reader) is a separate, unruled question.
- **Feature naming and folder convention.** That is s21.
- **The address-book links and the ins URL in plants' config.** That is s22
  and question 28.
- **`surfaces.json`, the report's drift sections and any "keep them in sync in
  future" tooling.** Ruled out; s23 removes the proposal.
- **The rest of `package.json`'s scripts** — `dev`, `fit:*`, `test:*`,
  `capture:*`, `depcruise:*`, `check:workspace-stack`, `server:watch` — differ
  legitimately per service. Only `postinstall`, `setup:husky`,
  `security-audit`, `git:pre-commit-hook` and the deleted install helper are in
  play.
- **The remaining README prose.** Heading case and wording differ between the
  three; only the two sections in §2.10 change here.
