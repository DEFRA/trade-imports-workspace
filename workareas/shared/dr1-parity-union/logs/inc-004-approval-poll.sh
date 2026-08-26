#!/usr/bin/env bash
# Poll the inc-004 frontend PR for an approving review.
# Up to 10 checks, 120s apart. Emits one line per check on stdout.
PR="https://github.com/DEFRA/trade-imports-animals-frontend/pull/209"
REPO="DEFRA/trade-imports-animals-frontend"
for i in $(seq 1 10); do
  D=$(gh pr view "$PR" --repo "$REPO" --json reviewDecision --jq '.reviewDecision' 2>/dev/null || echo "ERROR")
  if [ -z "$D" ]; then
    D="NONE"
  fi
  echo "check ${i}/10 reviewDecision=${D}"
  if [ "$D" = "APPROVED" ]; then
    exit 0
  fi
  if [ "$D" = "CHANGES_REQUESTED" ]; then
    exit 0
  fi
  if [ "$i" -lt 10 ]; then
    sleep 120
  fi
done
echo "exhausted 10 checks without APPROVED or CHANGES_REQUESTED"
exit 0
