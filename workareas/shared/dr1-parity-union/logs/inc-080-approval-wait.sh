#!/bin/bash
# Poll the inc-080 frontend PR for an approval decision, up to 10 checks, 120s apart.
URL="https://github.com/DEFRA/trade-imports-animals-frontend/pull/222"
REPO="DEFRA/trade-imports-animals-frontend"
OUT="$HOME/git/defra/trade-imports-workspace/workareas/shared/dr1-parity-union/logs/inc-080-approval-wait.log"
: > "$OUT"
for i in $(seq 1 10); do
  sleep 120
  D=$(gh pr view "$URL" --repo "$REPO" --json reviewDecision --jq '.reviewDecision' 2>>"$OUT" || true)
  echo "check $i: reviewDecision='${D}'" >> "$OUT"
  if [ "$D" = "APPROVED" ]; then
    echo "RESULT=APPROVED" >> "$OUT"
    exit 0
  fi
  if [ "$D" = "CHANGES_REQUESTED" ]; then
    echo "RESULT=CHANGES_REQUESTED" >> "$OUT"
    exit 0
  fi
done
echo "RESULT=STILL_UNAPPROVED" >> "$OUT"
exit 0
