# Common workflows

**First-time setup:**
```bash
make setup    # clone all repos
make install  # npm install in Node repos
```

Scripts under `tools/` reach the workspace at
`~/git/defra/trade-imports-workspace/` — the path is hardcoded. Either clone
there, or symlink an existing checkout of any name to that path; both work.
See [`docs/agent-onboarding.md`](../agent-onboarding.md#1-canonical-clone-location)
for the setup and for the JIRA / GitHub / Confluence credentials the tools
still need.

**Daily update:**
```bash
make update   # pull latest on all repos
make status   # check for anything uncommitted
```

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
cd repos/trade-imports-animals-tests
npm run test:docker-compose
```

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
