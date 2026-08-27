[ -n "${STACK_DIR:-}" ] || {
  print_error "internal error: lib/compose.sh requires STACK_DIR to be set"
  exit 70
}

COMPOSE_FILES=(
  -f "$STACK_DIR/compose.yml"
  -f "$STACK_DIR/database.compose.yml"
  -f "$STACK_DIR/infrastructure.compose.yml"
  -f "$STACK_DIR/stubs.compose.yml"
  -f "$STACK_DIR/backend.compose.yml"
  -f "$STACK_DIR/frontend.compose.yml"
  -f "$STACK_DIR/security.compose.yml"
)

ALL_PROFILES=(database infrastructure servicebus stubs backend frontend)

# Opt-in only — deliberately excluded from ALL_PROFILES (and so from
# run-stack.sh's no-flags default). Nothing in the default stack depends on
# ZAP; it's a heavy scanner requested deliberately via `--profile security`,
# never brought up by a plain `run-stack.sh`.
OPT_IN_PROFILES=(security)

# frontend.compose.yml pins `platform: linux/amd64` for the published
# frontend/admin images. In --dev that pin is inherited by the local build, so
# the webpack production stage runs under emulation — on arm64 it effectively
# never finishes. Build for the daemon's own architecture instead. Export
# DEV_BUILD_PLATFORM beforehand to force a specific platform.
compose_files_add_dev() {
  COMPOSE_FILES+=(-f "$STACK_DIR/dev.compose.yml")

  if [ -z "${DEV_BUILD_PLATFORM:-}" ]; then
    local arch
    arch="$(docker version --format '{{.Server.Arch}}' 2>/dev/null || true)"
    [ -n "$arch" ] || arch="$(uname -m)"
    case "$arch" in
      x86_64 | amd64) arch=amd64 ;;
      aarch64 | arm64) arch=arm64 ;;
    esac
    DEV_BUILD_PLATFORM="linux/$arch"
  fi
  export DEV_BUILD_PLATFORM
}
