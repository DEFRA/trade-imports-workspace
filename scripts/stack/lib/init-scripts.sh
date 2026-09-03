# Stages repo-owned init scripts into docker/stack/.staged/ so the compose
# files can mount one stable path whether or not repos/ is cloned.
#
# Ownership (EUDPA-178/EUDPA-165): the backend repo owns the Floci provisioning
# script, the tests repo owns the ZAP automation
# plans (EUDPA-340), the dynamics-gateway repo owns the Azure Service Bus
# emulator config, and the workspace owns the mongo replica-set init. Locally
# the scripts come from repos/<repo>/; in CI (where only the workspace repo is
# checked out) they are sparse-fetched from GitHub — the requested branch
# first, the default branch as fallback.
#
# Requires: STACK_DIR, WORKSPACE_ROOT, print_error (lib/colour.sh)
[ -n "${STACK_DIR:-}" ] || {
  print_error "internal error: lib/init-scripts.sh requires STACK_DIR to be set"
  exit 70
}
[ -n "${WORKSPACE_ROOT:-}" ] || {
  print_error "internal error: lib/init-scripts.sh requires WORKSPACE_ROOT to be set"
  exit 70
}

REPOS_DIR="$WORKSPACE_ROOT/repos"
STAGED_DIR="$STACK_DIR/.staged"

# copy_path <source-path> <dest-dir>
copy_path() {
  local src="$1" dest="$2"
  if [ -d "$src" ]; then
    cp -R "$src/." "$dest/"
  else
    cp "$src" "$dest/"
  fi
}

# fetch_repo_paths <repo> <ref> <repo-path>:<dest-dir>...
# Sparse-fetches every <repo-path> from github.com/DEFRA/<repo> into its
# <dest-dir> in a single clone, trying <ref> first and falling back to the
# default branch.
fetch_repo_paths() {
  local repo="$1" ref="$2"
  shift 2
  local url="https://github.com/DEFRA/${repo}.git"
  local resolved_ref pair path dest
  local sparse_paths=()
  local tmp
  tmp="$(mktemp -d)"
  # shellcheck disable=SC2064
  trap "rm -rf '$tmp'" RETURN

  if [ -n "$ref" ] && git clone --quiet --depth 1 --filter=blob:none --sparse \
        --branch "$ref" "$url" "$tmp/clone" 2>/dev/null; then
    resolved_ref="$ref"
  else
    git clone --quiet --depth 1 --filter=blob:none --sparse "$url" "$tmp/clone" || {
      print_error "error: cannot clone $url — offline? Run 'make setup' to clone repos/ instead."
      return 1
    }
    resolved_ref="the default branch"
  fi

  for pair in "$@"; do
    sparse_paths+=("/${pair%%:*}")
  done
  git -C "$tmp/clone" sparse-checkout set --no-cone "${sparse_paths[@]}" >/dev/null

  for pair in "$@"; do
    path="${pair%%:*}"
    dest="${pair#*:}"
    if [ ! -e "$tmp/clone/$path" ]; then
      print_error "error: $repo: path '$path' not found in ${repo}@${resolved_ref}"
      return 1
    fi
    copy_path "$tmp/clone/$path" "$dest"
  done
}

# stage_repo <repo> <ref> <repo-path>:<dest-dir>...
# Copies each repos/<repo>/<repo-path> when present; whatever is missing is
# sparse-fetched from the one repo in a single clone.
# A clone that exists but lacks <repo-path> (stale checkout) also falls
# through to the fetch — the path test is on the file, not the clone.
stage_repo() {
  local repo="$1" ref="$2"
  shift 2
  local pair path dest
  local missing=()
  for pair in "$@"; do
    path="${pair%%:*}"
    dest="${pair#*:}"
    if [ -e "$REPOS_DIR/$repo/$path" ]; then
      copy_path "$REPOS_DIR/$repo/$path" "$dest"
    else
      printf 'Fetching %s/%s from GitHub (not present under repos/)\n' "$repo" "$path"
      missing+=("$pair")
    fi
  done

  if [ ${#missing[@]} -gt 0 ]; then
    fetch_repo_paths "$repo" "$ref" "${missing[@]}"
  fi
}

# stage_init_scripts [<branch-ref>] [<stage-zap>]
# Rebuilds docker/stack/.staged/ from the owning repos, one concurrent job per
# repo. <stage-zap> is 1 when the security profile was requested; the ZAP plans
# are staged only then, since nothing else mounts them. The mongodb dir is
# flat because the mongo image only executes top-level files in
# /docker-entrypoint-initdb.d; numeric prefixes set execution order.
stage_init_scripts() {
  local ref="${1:-}" stage_zap="${2:-0}"
  local pids=() pid rc=0
  mkdir -p "$STAGED_DIR/mongodb" "$STAGED_DIR/floci" "$STAGED_DIR/servicebus" "$STAGED_DIR/zap"
  # Clear each subdirectory's *contents*, never the directories themselves —
  # the zap subdirectory is bind-mounted whole into a long-running container
  # designed to be left up across multiple run-stack.sh
  # invocations (each of which calls this function again). Deleting and
  # recreating the directory node, not just replacing what's inside it,
  # orphans that mount (ENOENT inside the container) the same way deleting
  # zap-report/ itself — rather than just its contents — would.
  rm -rf "$STAGED_DIR"/mongodb/* "$STAGED_DIR"/floci/* "$STAGED_DIR"/servicebus/*
  [ "$stage_zap" -eq 1 ] && rm -rf "$STAGED_DIR"/zap/*

  # Workspace-owned: mongo replica-set init
  cp "$STACK_DIR/scripts/mongodb/10-database-setup.js" "$STAGED_DIR/mongodb/"

  # Backend-owned: Floci resource provisioning
  stage_repo trade-imports-animals-backend "$ref" \
    "compose/start-floci.sh:$STAGED_DIR/floci" &
  pids+=("$!")

  # Dynamics-gateway-owned: floci notification pipeline (SNS FIFO → SQS FIFO
  # with DLQ), and the Azure Service Bus emulator entity config.
  stage_repo trade-imports-dynamics-gateway "$ref" \
    "servicebus/setup-notification-pipeline.sh:$STAGED_DIR/floci" \
    "servicebus/servicebus-config.json:$STAGED_DIR/servicebus" &
  pids+=("$!")

  # Ins-backend-owned: floci notification pipeline (SNS FIFO → SQS FIFO, no DLQ yet).
  stage_repo trade-imports-ins-backend "$ref" \
    "floci/setup-ins-backend-pipeline.sh:$STAGED_DIR/floci" &
  pids+=("$!")

  # Tests-repo-owned: ZAP Automation Framework plans (security profile)
  if [ "$stage_zap" -eq 1 ]; then
    stage_repo trade-imports-animals-tests "$ref" \
      "zap/automation-context.yaml:$STAGED_DIR/zap" \
      "zap/automation-passive.yaml:$STAGED_DIR/zap" \
      "zap/automation-active.yaml:$STAGED_DIR/zap" &
    pids+=("$!")
  fi

  for pid in "${pids[@]}"; do
    wait "$pid" || rc=1
  done
  return "$rc"
}
