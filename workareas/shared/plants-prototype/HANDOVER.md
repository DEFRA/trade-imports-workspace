# Handover — plants prototype

Paste the prompt below into a fresh agent. It assumes no other context.

---

You are picking up the designer prototype `repos/trade-imports-plants-prototype` in the workspace at `~/git/defra/trade-imports-workspace`. Read `workareas/shared/plants-prototype/PLAN.md` first — it is the plan of record, updated 2026-09-24.

**What this repo is.** A copy of `trade-imports-plants-frontend` for designers, deployed to CDP, that must run on stubs alone with no backend, Defra ID, Redis or reference data. Its `origin` is `DEFRA/trade-imports-plants-prototype`; its `upstream` remote is `DEFRA/trade-imports-plants-frontend` (fetches `main` only, no tags, pushing disabled). It keeps taking changes from plants-frontend by `git fetch upstream` then `git merge upstream/main`.

**State as of 2026-09-24.** Every workspace repo is on `main` and up to date. EUDPA-619 has merged in animals-frontend, plants-frontend and the prototype: one process now serves several sets, each under its own prefix. In the prototype that means `/high-risk-plants` and `/sample-journey`, with a chooser at `/` that lists whatever sets are mounted, so a new prototype appears on it just by being mounted. Verified locally: `STUB_MODE=true PORT=3103 npm run dev` starts with nothing else running, unit tests pass (1,970 of 1,978, 8 skipped) and all 231 FIT specs pass.

**Installing.** Ambient npm is 11.17.0 and the repo pins 11.6.2, so plain `npm ci` fails with a false "lockfile out of sync". Use `npx --yes npm@11.6.2 ci`. Run npm from inside the repo directory, not with `npm --prefix`, which a workspace hook blocks.

**Your job: the "Still to do" sections of the plan, in order.** Increment 1 first, because everything else builds on it.

1. **Stub-only runtime.** A designer should clone, install and run `npm start` with no environment variables, and land on the chooser at `:3103`. Today `npm start` forces production, stub mode is refused in production (`src/server/common/services/mode.js`), and the port still defaults to 3003. The plan's approach: a prototype-owned defaults module loaded from one added line at the top of `src/index.js` (every entry point goes through it, so `package.json` and the `Dockerfile` stay untouched), plus allowing stub mode in production. Prove it from a fresh clone and with `docker run`.
2. **CI and tooling trim** — the table in the plan says what goes and what stays.
3. **Sync automation** — `overrides.json`, a sync script, and a weekly workflow that also boots every mounted set.
4. **Workspace** — an `upstream` field in `repos.json` that `tim workspace setup` acts on, plus the port in `docs/local-setup.md` and CLAUDE.md.
5. **Designer experience** — `PROTOTYPE.md`, a scaffold command for a new prototype set, chooser extras, seeded data.

**How to work.** One branch, `feat/NO_JIRA-plants-prototype-setup`, one commit per increment, one PR at the end. Subagents implement; you verify in the parent. Run the verification ladder every increment: lint, unit tests, FIT, and a real boot. Don't merge without Sam.

**Rules that matter here.**
- One command per Bash call: no `&&`, `;`, `|` or `cd`. Use `~/` paths, never `/Users/...`.
- Never edit `docker/stack/.staged/`, and never commit `workareas/` except `workareas/shared/`.
- Make the design calls yourself and flag them afterwards. Don't stop to ask on a fork Sam has no stake in, and don't write "open questions" into plans or tickets that you could decide.
- Test failures are yours to fix, whoever caused them.

**Two things only Sam can answer, already flagged, not blocking:** who may reach the deployed prototype (stub sign-in lets anyone in who can reach the URL), and which CDP environment it deploys to.

**Watch out for.**
- Other sessions use these checkouts. Re-check the branch and HEAD before acting on a repo.
- The prototype has no SonarCloud project or `SONAR_TOKEN`, so its workflows skip the Sonar scan when the token is missing. That's deliberate.
- `workareas/shared/plants-prototype/` holds the plan and this handover. Keep the plan current as you land each increment.
