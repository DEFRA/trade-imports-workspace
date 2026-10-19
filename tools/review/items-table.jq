def escape_cell: tostring | gsub("\\|"; "\\|") | gsub("\n"; " ");

def trim: sub("^\\s+"; "") | sub("\\s+$"; "");

def split_fix:
  (. // "" | tostring | split("One way:")) as $parts
  | {
      must: ($parts[0] // "" | trim | sub("^Must:\\s*"; "") | trim),
      one_way: ($parts[1:] | join("One way:") | trim)
    };

"| # | File | Line | Severity | Category | Issue | Must | One way | Disposition | Status | Notes |",
"|---|------|------|----------|----------|-------|------|---------|-------------|--------|-------|",
(.items[]
  | (.fix | split_fix) as $fix
  | "| \(.id) | \(.file | escape_cell) | \(.line // "" | escape_cell) | \(.severity // "") | \(.category // "" | escape_cell) | \(.issue // "" | escape_cell) | \($fix.must | escape_cell) | \($fix.one_way | escape_cell) | \(.disposition // "") | \(.status // "") | \(.notes // "" | escape_cell) |")
