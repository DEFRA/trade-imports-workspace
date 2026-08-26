#!/usr/bin/env bash
# Poll the inc-005 frontend PR for an approving review.
# $1 = number of checks in this chunk. 120s between checks, no trailing sleep.
PR="https://github.com/DEFRA/trade-imports-animals-frontend/pull/210"
REPO="DEFRA/trade-imports-animals-frontend"
N="${1:-5}"
for i in $(seq 1 "$N"); do
  D=$(gh pr view "$PR" --repo "$REPO" --json reviewDecision --jq '.reviewDecision' 2>/dev/null || echo "ERROR")
  if [ -z "$D" ]; then
    D="NONE"
  fi
  echo "check ${i}/${N} reviewDecision=${D}"
  if [ "$D" = "APPROVED" ]; then
    exit 0
  fi
  if [ "$D" = "CHANGES_REQUESTED" ]; then
    exit 0
  fi
  if [ "$i" -lt "$N" ]; then
    sleep 120
  fi
done
echo "chunk exhausted without APPROVED or CHANGES_REQUESTED"
exit 0
