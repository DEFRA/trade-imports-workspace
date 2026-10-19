def escape_cell: tostring | gsub("\\|"; "\\|") | gsub("\n"; " ");

"| # | File | Line | Rule | Category | Severity | Issue | Fix | Disposition | Status | Notes |",
"|---|------|------|------|----------|----------|-------|-----|-------------|--------|-------|",
(.items[]
  | "| \(.id) | \(.file | escape_cell) | \(.line // "" | escape_cell) | \(.rule // "" | escape_cell) | \(.category // "" | escape_cell) | \(.severity // "") | \(.issue // "" | escape_cell) | \(.fix // "" | escape_cell) | \(.disposition // "") | \(.status // "") | \(.notes // "" | escape_cell) |")
