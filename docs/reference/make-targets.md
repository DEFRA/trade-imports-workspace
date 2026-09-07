# Make targets

| Target | What it does |
|--------|-------------|
| `make setup` | Clone all repos (idempotent — safe to re-run; clones exclude `gh-pages`) |
| `make update` | `git pull --rebase` all repos (one-off heal pins the `gh-pages` exclusion + gc on old clones) |
| `make status` | `git status -sb` across all repos |
| `make install` | `npm install` in all Node repos |
| `make lint` | Lint all Node repos |
| `make test` | Run tests across all repos |
| `make docker-compose-up` | Start full stack from published Docker Hub images |
| `make docker-compose-dev` | Start full stack built from local source (hot-reload for Node and Java backend/stub/reference-data) |
| `make docker-compose-down` | Stop the stack and wipe all volumes (mongo data, floci state) for a clean slate |
| `make docker-compose-bounce` | Wipe and restart the dev stack (`docker-compose-down` then `docker-compose-dev`) |
| `make docker-logs` | Tail frontend + admin + backend logs (`Ctrl-C` to stop) |
| `make docker-restart-backend` | Fallback container recreate — Java source hot-reloads via DevTools in `--dev` mode; only needed for `pom.xml`/dependency changes |
| `make start-frontend` | Start frontend dev server from source (outside Docker) |
| `make start-backend` | Start backend from source (outside Docker) |
| `make start-admin` | Start admin dev server from source (outside Docker) |
| `make start-gateway` | Start dynamics gateway from source (outside Docker) |
| `make start-address-book` | Start the address book API from source (outside Docker) |
| `make start-ins-backend` | Start the INS backend API from source (outside Docker) |
| `make start-plants-frontend` | Start the plants frontend dev server from source (outside Docker) |
| `make start-plants-backend` | Start the plants backend API from source (outside Docker) |
