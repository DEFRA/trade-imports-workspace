#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
STACK_DIR="$WORKSPACE_ROOT/docker/stack"
LIB_DIR="$SCRIPT_DIR/lib"

services=(
  "frontend|trade-imports-animals-frontend|TRADE_IMPORTS_ANIMALS_FRONTEND"
  "backend|trade-imports-animals-backend|TRADE_IMPORTS_ANIMALS_BACKEND"
  "admin|trade-imports-animals-admin|TRADE_IMPORTS_ANIMALS_ADMIN"
  "ins-frontend|trade-imports-ins-frontend|TRADE_IMPORTS_INS_FRONTEND"
  "stub|trade-imports-stub|TRADE_IMPORTS_STUB"
  "defra-id-stub|trade-imports-defra-id-stub|TRADE_IMPORTS_DEFRA_ID_STUB"
  "reference-data|trade-imports-reference-data|TRADE_IMPORTS_REFERENCE_DATA"
  "address-book|trade-imports-address-book|TRADE_IMPORTS_ADDRESS_BOOK"
  "gateway|trade-imports-dynamics-gateway|TRADE_IMPORTS_DYNAMICS_GATEWAY"
  "ins-backend|trade-imports-ins-backend|TRADE_IMPORTS_INS_BACKEND"
)

valid_labels=()
for entry in "${services[@]}"; do
  valid_labels+=("${entry%%|*}")
done

# shellcheck source=lib/colour.sh
source "$LIB_DIR/colour.sh"
# shellcheck source=lib/compose.sh
source "$LIB_DIR/compose.sh"

valid_profiles=("${ALL_PROFILES[@]}" "${OPT_IN_PROFILES[@]}")

# shellcheck source=lib/flags.sh
source "$LIB_DIR/flags.sh"
parse_run_stack_flags "$@"

stage_zap=0
for profile in ${selected_profiles[@]+"${selected_profiles[@]}"}; do
  [ "$profile" = security ] && { stage_zap=1; break; }
done

# shellcheck source=lib/init-scripts.sh
source "$LIB_DIR/init-scripts.sh"
stage_init_scripts "$branch" "$stage_zap"

[ ${#selected_profiles[@]} -eq 0 ] && selected_profiles=("${ALL_PROFILES[@]}")
[ "$dev" -eq 1 ] && compose_files_add_dev

# Sanitisation must match the per-repo publish-branch.yml workflows.
sanitise_branch() {
  local raw="$1"
  local t="${raw//\//-}"
  t="$(printf '%s' "$t" | tr -cd 'a-zA-Z0-9_.-')"
  t="$(printf '%s' "$t" | tr '[:upper:]' '[:lower:]')"
  while [[ "$t" == [.-]* ]]; do t="${t:1}"; done
  t="${t:0:128}"
  printf '%s' "$t"
}

# Probe Dockerhub for a branch tag and print a stable fingerprint of its
# manifest on stdout, returning 0 if the tag exists. Returns 1 (empty stdout)
# when the tag is absent. The fingerprint is a content hash of the full
# `docker manifest inspect` output (cksum — POSIX, present on macOS and Linux
# CI, no jq needed): any re-push to the same branch changes the manifest and so
# flips the fingerprint. This lets the post-healthy re-check tell a brand-new
# branch tag apart from a re-pushed one. bash-3.2 safe.
probe() {
  local image="$1" tag="$2" manifest
  manifest="$(docker manifest inspect "defradigital/${image}:${tag}" 2>/dev/null)" || return 1
  printf '%s' "$manifest" | cksum | awk '{ print $1 "-" $2 }'
}

is_excluded() {
  local label="$1" e
  [ ${#excluded_labels[@]} -eq 0 ] && return 1
  for e in "${excluded_labels[@]}"; do
    [ "$e" = "$label" ] && return 0
  done
  return 1
}

profile_args=()
for profile in "${selected_profiles[@]}"; do
  profile_args+=(--profile "$profile")
done

active_services=()
compose_config_err="$(mktemp)"
while IFS= read -r svc; do
  [ -n "$svc" ] && active_services+=("$svc")
done < <(docker compose "${COMPOSE_FILES[@]}" "${profile_args[@]}" config --services 2>"$compose_config_err" | sort)
if [ ${#active_services[@]} -eq 0 ]; then
  print_error "error: no services resolved from compose config — the compose files may be invalid"
  [ -s "$compose_config_err" ] && print_error "$(cat "$compose_config_err")"
  rm -f "$compose_config_err"
  exit 1
fi
rm -f "$compose_config_err"

excluded_compose_names=()
for label in ${excluded_labels[@]+"${excluded_labels[@]}"}; do
  for entry in "${services[@]}"; do
    IFS='|' read -r l image _ <<< "$entry"
    if [ "$l" = "$label" ]; then
      # A frontend's paired load balancer owns its host port, so excluding the
      # frontend has to drop the -lb with it or the port stays taken.
      excluded_compose_names+=("$image" "$image-lb")
      break
    fi
  done
done

up_services=()
for svc in ${active_services[@]+"${active_services[@]}"}; do
  skip=0
  for excl in ${excluded_compose_names[@]+"${excluded_compose_names[@]}"}; do
    if [ "$svc" = "$excl" ]; then
      skip=1
      break
    fi
  done
  [ "$skip" -eq 1 ] && continue
  up_services+=("$svc")
done

printf '%sProfiles:%s %s\n' "$COLOUR_BOLD" "$COLOUR_RESET" "${selected_profiles[*]}"
sanitised=""
if [ -n "$branch" ]; then
  sanitised="$(sanitise_branch "$branch")"
  if [ -z "$sanitised" ]; then
    print_error "error: branch '$branch' is empty after sanitisation"
    exit 1
  fi
  printf '%sProbing Dockerhub for branch tag: %s%s\n' "$COLOUR_CYAN" "$sanitised" "$COLOUR_RESET"
fi

# Fan out the branch-tag probes concurrently. docker manifest inspect is a
# network round-trip per service; running them in parallel turns 9 sequential
# round-trips into one wall-clock round-trip. Each job touches a marker file on
# success; the print loop below reads the markers so all env-var exports still
# happen in this (parent) shell. bash-3.2 safe (macOS default) and Linux-CI safe:
# only mktemp -d, background jobs, and a bare wait barrier are used.
probe_tmpdir=""
recheck_tmpdir=""
# The marker directory holds one file per service that resolved to the branch
# tag; its contents are the first-probe manifest fingerprint. It must survive
# until the post-healthy re-check below, so clean it up on any exit rather than
# inline before the compose up.
cleanup_probe_tmpdir() {
  [ -n "$probe_tmpdir" ] && rm -rf "$probe_tmpdir"
  [ -n "$recheck_tmpdir" ] && rm -rf "$recheck_tmpdir"
  return 0
}
trap cleanup_probe_tmpdir EXIT
if [ -n "$sanitised" ] && [ "$dev" -ne 1 ]; then
  probe_tmpdir="$(mktemp -d)"
  probe_pids=()
  for entry in "${services[@]}"; do
    IFS='|' read -r label image _ <<< "$entry"
    is_excluded "$label" && continue
    in_active=0
    for s in ${active_services[@]+"${active_services[@]}"}; do
      [ "$s" = "$image" ] && { in_active=1; break; }
    done
    [ "$in_active" -eq 0 ] && continue
    # Record the branch resolution (file exists) and its manifest fingerprint
    # (file contents) so the re-check can spot a flip or a re-push.
    ( fp="$(probe "$image" "$sanitised")" && printf '%s' "$fp" > "$probe_tmpdir/$label" ) &
    probe_pids+=("$!")
  done
  [ ${#probe_pids[@]} -gt 0 ] && wait ${probe_pids[@]+"${probe_pids[@]}"} 2>/dev/null || true
fi

for entry in "${services[@]}"; do
  IFS='|' read -r label image env_var <<< "$entry"
  if is_excluded "$label"; then
    unset "$env_var" 2>/dev/null
    printf '  %-16s %sexcluded%s\n' "$label:" "$COLOUR_GREY" "$COLOUR_RESET"
    continue
  fi
  in_active=0
  for s in ${active_services[@]+"${active_services[@]}"}; do
    [ "$s" = "$image" ] && { in_active=1; break; }
  done
  [ "$in_active" -eq 0 ] && continue
  if [ "$dev" -eq 1 ]; then
    unset "$env_var" 2>/dev/null
    printf '  %-16s %sbuilt (source)%s\n' "$label:" "$COLOUR_GREEN" "$COLOUR_RESET"
  elif [ -n "$sanitised" ] && [ -f "$probe_tmpdir/$label" ]; then
    export "$env_var=$sanitised"
    printf '  %-16s %sbranch  (%s)%s\n' "$label:" "$COLOUR_GREEN" "$sanitised" "$COLOUR_RESET"
  else
    unset "$env_var" 2>/dev/null
    printf '  %-16s latest\n' "$label:"
  fi
done

[ ${#up_services[@]} -gt 0 ] || { print_error "error: would start no services"; exit 1; }

# Mongo's entrypoint races itself on a fresh volume and exits 48, taking every
# depends_on service with it (EUDPA-358). Retrying is the only fix. Mongo comes
# up alone first so the stack up below finds it already healthy.
MONGO_UP_ATTEMPTS="${MONGO_UP_ATTEMPTS:-6}"
MONGO_RETRY_BACKOFF_SECONDS="${MONGO_RETRY_BACKOFF_SECONDS:-2}"

start_mongodb_first() {
  local attempt=1
  while true; do
    if docker compose "${COMPOSE_FILES[@]}" "${profile_args[@]}" \
      up --wait --detach --pull always mongodb; then
      return 0
    fi
    if [ "$attempt" -ge "$MONGO_UP_ATTEMPTS" ]; then
      print_error "mongo failed to start after $MONGO_UP_ATTEMPTS attempts"
      return 1
    fi
    print_error "mongo failed to start (attempt $attempt/$MONGO_UP_ATTEMPTS), retrying"
    docker compose "${COMPOSE_FILES[@]}" "${profile_args[@]}" \
      rm --stop --force --volumes mongodb >/dev/null 2>&1 || true
    attempt=$((attempt + 1))
    sleep "$MONGO_RETRY_BACKOFF_SECONDS"
  done
}

for svc in "${up_services[@]}"; do
  if [ "$svc" = "mongodb" ]; then
    start_mongodb_first
    break
  fi
done

up_args=(up --wait --detach --pull always)
[ "$dev" -eq 1 ] && up_args+=(--build)

# Bring the stack up and block until healthy. This used to `exec`; it no longer
# does so the script can run one post-healthy re-check below. A failure here
# still aborts under `set -e` with the compose exit code, preserving the old
# signal/exit-code propagation.
docker compose "${COMPOSE_FILES[@]}" "${profile_args[@]}" "${up_args[@]}" ${extra[@]+"${extra[@]}"} "${up_services[@]}"

# Post-healthy re-check (branch mode only; --dev never probes Dockerhub).
# Stack startup takes 1-2 minutes to reach healthy — long enough for a slower
# repo pipeline to publish or re-push its branch image after the initial probe.
# Run the probe once more and, for any non-excluded service whose resolution
# flipped latest->branch or whose branch-tag manifest fingerprint changed,
# re-export its tag and recreate just that service with `--pull always`. One
# re-check, not a poll loop: it covers the race window without complicating the
# script, and mitigates rather than eliminates the race — an image that lands
# well after healthy still needs a manual restart.
if [ -n "$sanitised" ] && [ "$dev" -ne 1 ]; then
  printf '%sRe-checking Dockerhub for branch images now the stack is healthy: %s%s\n' "$COLOUR_CYAN" "$sanitised" "$COLOUR_RESET"

  # Fan the re-probes out the same way the first probe above does: one marker
  # file per service that resolved to the branch tag, holding its fingerprint.
  recheck_tmpdir="$(mktemp -d)"
  recheck_pids=()
  for entry in "${services[@]}"; do
    IFS='|' read -r label image _ <<< "$entry"
    is_excluded "$label" && continue
    in_active=0
    for s in ${active_services[@]+"${active_services[@]}"}; do
      [ "$s" = "$image" ] && { in_active=1; break; }
    done
    [ "$in_active" -eq 0 ] && continue
    ( fp="$(probe "$image" "$sanitised")" && printf '%s' "$fp" > "$recheck_tmpdir/$label" ) &
    recheck_pids+=("$!")
  done
  [ ${#recheck_pids[@]} -gt 0 ] && wait ${recheck_pids[@]+"${recheck_pids[@]}"} 2>/dev/null || true

  recheck_services=()
  for entry in "${services[@]}"; do
    IFS='|' read -r label image env_var <<< "$entry"
    is_excluded "$label" && continue
    in_active=0
    for s in ${active_services[@]+"${active_services[@]}"}; do
      [ "$s" = "$image" ] && { in_active=1; break; }
    done
    [ "$in_active" -eq 0 ] && continue

    # First-probe state: marker present => resolved to branch, contents => its
    # fingerprint; marker absent => resolved to latest.
    first_branch=0
    first_fp=""
    if [ -f "$probe_tmpdir/$label" ]; then
      first_branch=1
      first_fp="$(cat "$probe_tmpdir/$label")"
    fi

    now_branch=0
    now_fp=""
    if [ -f "$recheck_tmpdir/$label" ]; then
      now_branch=1
      now_fp="$(cat "$recheck_tmpdir/$label")"
    fi

    if [ "$now_branch" -eq 0 ]; then
      # Still no branch tag — nothing published, nothing to do.
      printf '  %-16s no change\n' "$label:"
    elif [ "$first_branch" -eq 0 ]; then
      # Flipped latest -> branch: the image landed during startup.
      export "$env_var=$sanitised"
      recheck_services+=("$image")
      printf '  %-16s %sswitched to branch (%s)%s\n' "$label:" "$COLOUR_GREEN" "$sanitised" "$COLOUR_RESET"
    elif [ "$now_fp" != "$first_fp" ]; then
      # Same branch tag, new digest: a re-push during startup.
      export "$env_var=$sanitised"
      recheck_services+=("$image")
      printf '  %-16s %sdigest updated%s\n' "$label:" "$COLOUR_GREEN" "$COLOUR_RESET"
    else
      printf '  %-16s no change\n' "$label:"
    fi
  done

  if [ ${#recheck_services[@]} -gt 0 ]; then
    docker compose "${COMPOSE_FILES[@]}" "${profile_args[@]}" "${up_args[@]}" ${extra[@]+"${extra[@]}"} "${recheck_services[@]}"
  fi
fi
