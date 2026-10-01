# Common workflows

**First-time setup:**
```bash
make setup    # clone all repos
make install  # npm install in Node repos
```

Scripts under `tools/` reach the workspace at
`~/git/defra/trade-imports-workspace/` — the path is hardcoded, so clone
it there. A checkout under another name will not work.
See [`docs/agent-onboarding.md`](../agent-onboarding.md#1-canonical-clone-location)
for the setup and for the JIRA / GitHub / Confluence credentials the tools
still need.

**Daily update:**
```bash
make update   # pull latest on all repos
make status   # check for anything uncommitted
```

`trade-imports-plants-prototype` has `workspaceBranchSync: false` in
`repos.json`, so `tim workspace reset|branch|update` skip it by default
(printing one plain skip line each) unless named explicitly with
`--include trade-imports-plants-prototype`. It has no branch-tagged image
in the Docker stack to keep in step with, and it never merges from
`upstream/main` directly — see its own sync command below.

**Designer prototyping (workspace-first):**
```bash
tim prototype setup   # once per machine: CLAUDE.local.md designer note, upstream remote, install, auth readiness
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run dev            # run standalone on :3103, no stack
npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run sync:upstream  # weekly-style sync from trade-imports-plants-frontend, overrides.json-aware
```
Then open Claude Code at the workspace root and say what you want — the
`prototype` skill routes the request to the right reference and, for
multi-step requests, to a workflow under
`.claude/skills/prototype/workflow/`. See
[`docs/agent-onboarding.md`](../agent-onboarding.md#designers) and
[`docs/repos/trade-imports-plants-prototype.md`](../repos/trade-imports-plants-prototype.md).

**Run the full stack from source (cross-service development):**
```bash
make docker-compose-dev   # build + start all services from local source
make docker-logs          # tail logs (Ctrl-C to stop)
# Java source edits hot-reload via DevTools; only a pom.xml/dependency
# change needs a rebuild:
make docker-compose-dev
```

**Run the E2E tests:**
```bash
cd repos/trade-imports-ins-tests
npm run test:docker-compose             # every domain
npm run test:docker-compose:animals     # one domain: animals, animals-admin, ins or plants
```
Which domain(s) a service's own PR runs in CI: [`docs/reference/e2e-domain-coverage.md`](e2e-domain-coverage.md).

**Run unit tests:**
```bash
make test
```

**Work on a single repo:**
```bash
cd repos/trade-imports-animals-frontend
git checkout -b my-feature
# make changes, commit, push as normal
git push origin my-feature
```
