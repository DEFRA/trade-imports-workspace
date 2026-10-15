#!/bin/bash
# List the specs in trade-imports-ins-tests with the tags each one carries,
# as a JSON array of {file, line, title, tags}. `file` is relative to tests/,
# so it starts with the domain. Tags are normalised to carry a leading @.
# Asks Playwright to list the tests (the way `npm run lint` does), so title,
# describe and test tags are already merged. Needs no stack or browser.
#
# Usage:
#   list-specs.sh [--domain <domain>] [--type <e2e|a11y|security>] [--tag <@tag>]
#
# --domain  only specs under tests/<domain>/
# --type    only specs under a test type directory
# --tag     only specs that carry this tag, in any domain
# With no flags it lists every spec.

set -e

DOMAIN=""
TYPE=""
TAG=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --domain) DOMAIN="$2"; shift 2 ;;
        --type) TYPE="$2"; shift 2 ;;
        --tag) TAG="$2"; shift 2 ;;
        -h|--help)
            sed -n '2,15p' "$0" >&2
            exit 0 ;;
        *) echo "Unknown arg: $1" >&2; exit 1 ;;
    esac
done

tests="$HOME/git/defra/trade-imports-workspace/repos/trade-imports-ins-tests"
[[ -d "$tests" ]] || { echo "No ins-tests clone at $tests" >&2; exit 1; }

npm --prefix "$tests" exec --no -- playwright test --list --reporter=json --config="$tests/playwright.docker-compose.config.ts" \
    | jq --arg domain "$DOMAIN" --arg type "$TYPE" --arg tag "$TAG" '
        [ .. | objects | select(has("specs")) | .specs[]
          | {file, line, title, tags: [ .tags[]? | ltrimstr("@") | "@" + . ]}
          | select($domain == "" or (.file | startswith($domain + "/")))
          | select($type == "" or (.file | split("/")[1] == $type))
          | select($tag == "" or (.tags | index($tag)))
        ]'
