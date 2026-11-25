#!/usr/bin/env bash
# Intersect refresh lists with each PR's changed files.
set -euo pipefail
S=/private/tmp/claude-502/-Users-paulhodgson-git-defra-trade-imports-workspace/8c6666e1-723a-4ff3-8269-198bd180d6d2/scratchpad
R=workareas/reviews/EUDPA-776
jq -c '.result.repos[]' "$S/scope.json" | while read -r row; do
  repo=$(jq -r .repo <<<"$row")
  pr=$(jq -r .pr <<<"$row")
  jq -r '[.[][] | select(.status != "removed") | .filename] | .[]' "$R/.prs/$repo-$pr.json" | sort -u > "$S/pr-$repo.txt"
  jq -r '.lists.A[].file' <<<"$row" | sort -u > "$S/A-all-$repo.txt"
  comm -12 "$S/A-all-$repo.txt" "$S/pr-$repo.txt" > "$S/A-$repo.txt"
  jq -r '.lists.C[].file' <<<"$row" | sort -u > "$S/C-all-$repo.txt"
  comm -12 "$S/C-all-$repo.txt" "$S/pr-$repo.txt" > "$S/C-$repo.txt"
  jq -r '.lists.D[].file' <<<"$row" | sort -u > "$S/D-$repo.txt"
  echo "$repo prfiles=$(wc -l <"$S/pr-$repo.txt") A=$(wc -l <"$S/A-$repo.txt")/$(wc -l <"$S/A-all-$repo.txt") C=$(wc -l <"$S/C-$repo.txt")/$(wc -l <"$S/C-all-$repo.txt") D=$(wc -l <"$S/D-$repo.txt")"
done
