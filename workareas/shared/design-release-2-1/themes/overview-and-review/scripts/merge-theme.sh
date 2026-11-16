#!/usr/bin/env bash
# Merge the overview-and-review theme: its six draft pull requests, one per repo.
# Run it once you have read them and are happy. It stops at the first problem.
#
#   bash ~/git/defra/trade-imports-workspace/workareas/shared/design-release-2-1/themes/overview-and-review/scripts/merge-theme.sh
#
# For each pull request, in order: check it is open and every check passed,
# take it out of draft, squash-merge it and delete its branch.
# The workspace one goes last because it holds the spec the code proves.
set -euo pipefail

PRS=(
  "DEFRA/trade-imports-animals-backend 130"
  "DEFRA/trade-imports-ins-frontend 85"
  "DEFRA/trade-imports-animals-frontend 484"
  "DEFRA/trade-imports-plants-frontend 145"
  "DEFRA/trade-imports-ins-tests 112"
  "DEFRA/trade-imports-workspace 266"
)

for entry in "${PRS[@]}"; do
  read -r repo number <<<"$entry"
  echo "== $repo #$number"

  state=$(gh pr view "$number" -R "$repo" --json state --jq .state)
  if [[ "$state" == "MERGED" ]]; then
    echo "   already merged"
    continue
  fi
  if [[ "$state" != "OPEN" ]]; then
    echo "   is $state, so stopping" >&2
    exit 1
  fi

  bad=$(gh pr view "$number" -R "$repo" --json statusCheckRollup \
    --jq '[.statusCheckRollup[] | (.conclusion // .state) | select(. != "SUCCESS" and . != "SKIPPED" and . != "NEUTRAL")] | length')
  if [[ "$bad" != "0" ]]; then
    echo "   $bad check(s) not green, so stopping. See: gh pr checks $number -R $repo" >&2
    exit 1
  fi

  gh pr ready "$number" -R "$repo" >/dev/null 2>&1 || true
  gh pr merge "$number" -R "$repo" --squash --delete-branch
  echo "   merged"
done

echo "All six merged."
