SHELL         := /bin/bash
MANIFEST      := repos.json
REPOS         := $(shell jq -r '.repos[].name' $(MANIFEST) 2>/dev/null)
REPOS_DIR     := $(shell jq -r '.reposDir' $(MANIFEST) 2>/dev/null)
NODE_REPOS    := $(shell jq -r '.repos[] | select(.stack == "node") | .name' $(MANIFEST) 2>/dev/null)
JAVA_REPOS    := $(shell jq -r '.repos[] | select(.stack == "java") | .name' $(MANIFEST) 2>/dev/null)
CANONICAL_PATH := $(HOME)/git/defra/trade-imports-workspace
WORKSPACE_ROOT := $(abspath .)

ifeq ($(strip $(REPOS)),)
$(error Cannot read the repo roster from $(MANIFEST). Check the file is there and jq is installed, and run make from the workspace root)
endif

.PHONY: setup link update reset status install lint test \
        start-frontend start-backend start-admin start-gateway start-address-book \
        start-ins-backend start-plants-frontend start-plants-backend \
        docker-local-branches docker-compose-up docker-compose-dev docker-compose-down docker-compose-bounce docker-logs docker-restart-backend clean help

# --- Help ---

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-20s\033[0m %s\n", $$1, $$2}'

# --- Setup ---

setup: ## Clone all repos into repos/
	@bash scripts/setup.sh

link: ## Escape hatch: symlink ~/git/defra/trade-imports-workspace -> this checkout (normally just clone there)
	@if [ "$(WORKSPACE_ROOT)" = "$(CANONICAL_PATH)" ]; then \
		echo "Already at canonical path — no symlink needed."; \
		exit 0; \
	fi; \
	if [ -L "$(CANONICAL_PATH)" ]; then \
		current=$$(readlink "$(CANONICAL_PATH)"); \
		if [ "$$current" = "$(WORKSPACE_ROOT)" ]; then \
			echo "Already linked: $(CANONICAL_PATH) -> $$current"; \
			exit 0; \
		fi; \
		echo "ERROR: $(CANONICAL_PATH) is a symlink to $$current, not this checkout."; \
		echo "  Remove it manually if you want to repoint: rm $(CANONICAL_PATH)"; \
		exit 1; \
	fi; \
	if [ -e "$(CANONICAL_PATH)" ]; then \
		echo "ERROR: $(CANONICAL_PATH) exists and is not a symlink — refusing to clobber."; \
		exit 1; \
	fi; \
	mkdir -p "$$(dirname "$(CANONICAL_PATH)")"; \
	ln -s "$(WORKSPACE_ROOT)" "$(CANONICAL_PATH)"; \
	echo "Linked $(CANONICAL_PATH) -> $(WORKSPACE_ROOT)"

update: ## Pull --rebase all repos
	@bash scripts/update.sh $(REPOS)

reset: ## Hard-reset all repos to origin/main (DISCARDS local changes — prompts first)
	@echo "WARNING: This will discard all local changes and uncommitted work in every repo."; \
	read -r -p "Are you sure? [y/N] " confirm; \
	[ "$$confirm" = "y" ] || [ "$$confirm" = "Y" ] || { echo "Aborted."; exit 1; }; \
	for repo in $(REPOS); do \
		dir=$(REPOS_DIR)/$$repo; \
		if [ -d "$$dir/.git" ]; then \
			echo "\n=== $$repo ==="; \
			git -C "$$dir" fetch origin; \
			git -C "$$dir" checkout main; \
			git -C "$$dir" reset --hard origin/main; \
		else \
			echo "\n=== $$repo === (not cloned, skipping)"; \
		fi; \
	done

status: ## Show git status for all repos
	@for repo in $(REPOS); do \
		dir=$(REPOS_DIR)/$$repo; \
		if [ -d "$$dir/.git" ]; then \
			echo "\n=== $$repo ==="; \
			git -C "$$dir" status -sb; \
		else \
			echo "\n=== $$repo === (not cloned)"; \
		fi; \
	done

install: ## Install dependencies in all repos (npm ci; mvn install -DskipTests)
	@pids=(); outs=(); names=(); \
	for repo in $(NODE_REPOS); do \
		dir=$(REPOS_DIR)/$$repo; \
		[ -d "$$dir" ] || continue; \
		out=$$(mktemp); \
		npm --prefix "$$dir" ci >"$$out" 2>&1 & \
		pids+=($$!); outs+=("$$out"); names+=("$$repo"); \
		echo "  $$repo — npm ci"; \
	done; \
	for repo in $(JAVA_REPOS); do \
		dir=$(REPOS_DIR)/$$repo; \
		[ -d "$$dir" ] || continue; \
		out=$$(mktemp); \
		mvn -f "$$dir/pom.xml" install -DskipTests >"$$out" 2>&1 & \
		pids+=($$!); outs+=("$$out"); names+=("$$repo"); \
		echo "  $$repo — mvn install"; \
	done; \
	status=0; \
	for i in "$${!pids[@]}"; do \
		if wait "$${pids[$$i]}"; then \
			echo "  $${names[$$i]} — done"; \
		else \
			echo "  $${names[$$i]} — FAILED:"; \
			cat "$${outs[$$i]}"; \
			status=1; \
		fi; \
		rm -f "$${outs[$$i]}"; \
	done; \
	exit $$status

clean: ## Remove node_modules in all Node repos
	@for repo in $(NODE_REPOS); do \
		dir=$(REPOS_DIR)/$$repo; \
		if [ -d "$$dir/node_modules" ]; then \
			echo "  $$repo — removing node_modules"; \
			rm -rf "$$dir/node_modules"; \
		fi; \
	done

# --- Lint & Test ---

lint: ## Run linting in all Node repos
	@pids=(); outs=(); names=(); \
	for repo in $(NODE_REPOS); do \
		dir=$(REPOS_DIR)/$$repo; \
		[ -d "$$dir" ] || continue; \
		out=$$(mktemp); \
		npm --prefix "$$dir" run lint --if-present >"$$out" 2>&1 & \
		pids+=($$!); outs+=("$$out"); names+=("$$repo"); \
		echo "  $$repo — lint"; \
	done; \
	status=0; \
	for i in "$${!pids[@]}"; do \
		if wait "$${pids[$$i]}"; then \
			echo "  $${names[$$i]} — done"; \
		else \
			echo "  $${names[$$i]} — FAILED:"; \
			cat "$${outs[$$i]}"; \
			status=1; \
		fi; \
		rm -f "$${outs[$$i]}"; \
	done; \
	exit $$status

test: ## Run unit tests in all repos
	@for repo in $(NODE_REPOS); do \
		dir=$(REPOS_DIR)/$$repo; \
		if [ -d "$$dir" ]; then \
			echo "\n=== $$repo — test ==="; \
			npm --prefix "$$dir" test --if-present; \
		fi; \
	done
	@for repo in $(JAVA_REPOS); do \
		dir=$(REPOS_DIR)/$$repo; \
		if [ -d "$$dir" ]; then \
			echo "\n=== $$repo — mvn verify ==="; \
			mvn -f "$$dir/pom.xml" verify; \
		fi; \
	done

# --- Build ---

docker-compose-up: ## Start full stack from published images (scripts/stack/run-stack.sh)
	./scripts/stack/run-stack.sh

docker-compose-dev: ## Start stack built from local source (hot-reload; scripts/stack/run-stack.sh -d)
	./scripts/stack/run-stack.sh -d

docker-compose-down: ## Stop stack and wipe volumes (mongo data, floci state) for a clean slate
	./scripts/stack/stop-stack.sh

docker-compose-bounce: docker-compose-down docker-compose-dev ## Wipe and restart the dev stack (down + dev up)

docker-logs: ## Follow logs for frontend, admin, and backend (Ctrl-C to stop)
	docker compose -p trade-imports logs -f trade-imports-animals-frontend trade-imports-animals-admin trade-imports-animals-backend

docker-restart-backend: ## Fallback recreate of the backend container (Java source hot-reloads via DevTools in dev mode; use this for pom.xml/dependency changes — scripts/stack/bounce-backend.sh)
	./scripts/stack/bounce-backend.sh

docker-local-branches: ## Build local/* Docker images for repos not on the default branch
	@built=0; \
	for repo in $(REPOS); do \
		dir=$(REPOS_DIR)/$$repo; \
		[ -d "$$dir/.git" ] || continue; \
		branch=$$(git -C "$$dir" symbolic-ref --short HEAD 2>/dev/null); \
		default=$$(git -C "$$dir" symbolic-ref --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|origin/||'); \
		[ -z "$$default" ] && default=main; \
		if [ "$$branch" != "$$default" ]; then \
			echo "  $$repo — building local/$$repo ($$branch)"; \
			docker build --platform linux/amd64 -t local/$$repo "$$dir"; \
			built=$$((built + 1)); \
		else \
			echo "  $$repo — on default branch ($$default), skipping"; \
		fi; \
	done; \
	[ "$$built" -eq 0 ] && echo "  nothing to build — all repos on default branch" || true

# --- Individual services ---

start-frontend: ## Start frontend dev server from source
	npm --prefix $(REPOS_DIR)/trade-imports-animals-frontend run dev

start-backend: ## Start backend from source
	SPRING_PROFILES_ACTIVE=local mvn -f $(REPOS_DIR)/trade-imports-animals-backend/pom.xml spring-boot:run

start-admin: ## Start admin dev server from source
	PORT=3001 npm --prefix $(REPOS_DIR)/trade-imports-animals-admin run dev

start-gateway: ## Start dynamics gateway from source
	SPRING_PROFILES_ACTIVE=local mvn -f $(REPOS_DIR)/trade-imports-dynamics-gateway/pom.xml spring-boot:run

start-address-book: ## Start address book API from source (requires Java 25 + MongoDB on :27017)
	SPRING_PROFILES_ACTIVE=local PORT=8089 mvn -f $(REPOS_DIR)/trade-imports-address-book/pom.xml spring-boot:run

start-ins-backend: ## Start ins-backend API from source (requires Java 25 + MongoDB on :27017)
	SPRING_PROFILES_ACTIVE=local PORT=8090 mvn -f $(REPOS_DIR)/trade-imports-ins-backend/pom.xml spring-boot:run

start-plants-frontend: ## Start plants frontend dev server from source
	PORT=3003 npm --prefix $(REPOS_DIR)/trade-imports-plants-frontend run dev

start-plants-backend: ## Start plants-backend API from source (requires Java 25 + MongoDB on :27017)
	SPRING_PROFILES_ACTIVE=local PORT=8091 mvn -f $(REPOS_DIR)/trade-imports-plants-backend/pom.xml spring-boot:run

