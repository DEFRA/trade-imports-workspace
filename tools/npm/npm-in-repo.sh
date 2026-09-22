#!/bin/bash
# Run an npm command inside a workspace repo, resolving the repo path
# to its canonical (de-symlinked) form first.
#
# Why: if `~/git/defra/trade-imports-workspace/` is a symlink
# (e.g. the checkout lives elsewhere and the canonical path is
# symlinked to it), `npm --prefix <symlinked-path> install` makes npm
# rewrite every `node_modules/X` entry in `package-lock.json` to a
# relative path through the canonical target, silently corrupting the
# lockfile. Canonicalising once up-front avoids the rewrite. Pure
# directories (no symlink) pass through unchanged.
#
# Usage:
#   npm-in-repo.sh --repo <repo-name> <npm-subcommand> [args...]
#   npm-in-repo.sh --clone <repo-name> <npm-subcommand> [args...]
#
# --repo  runs against the checkout under repos/<repo-name>.
# --clone runs against the clone under workareas/clones/<repo-name>:
#         the checkouts the agent workflows build on, so the repos/
#         checkouts are never touched.
#
# Examples:
#   npm-in-repo.sh --repo trade-imports-animals-frontend install date-fns@4.3.0
#   npm-in-repo.sh --repo trade-imports-animals-frontend test
#   npm-in-repo.sh --repo trade-imports-animals-frontend run lint
#   npm-in-repo.sh --clone trade-imports-ins-frontend ci

set -e

REPO=""
BASE="repos"

usage() {
    echo "Usage: $0 (--repo|--clone) <repo-name> <npm-subcommand> [args...]" >&2
    exit 1
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --repo) REPO="$2"; BASE="repos"; shift 2 ;;
        --clone) REPO="$2"; BASE="workareas/clones"; shift 2 ;;
        -h|--help) usage ;;
        *) break ;;
    esac
done

[[ -z "$REPO" ]] && usage
[[ $# -gt 0 ]] || { echo "Missing npm subcommand" >&2; usage; }

REPO_PATH="$HOME/git/defra/trade-imports-workspace/$BASE/$REPO"
[[ -d "$REPO_PATH" ]] || { echo "Repo not found: $REPO_PATH" >&2; exit 1; }

# `cd && pwd -P` is POSIX — works on macOS and Linux without realpath
# or `readlink -f`.
REPO_PATH=$(cd "$REPO_PATH" && pwd -P)

exec npm --prefix "$REPO_PATH" "$@"
