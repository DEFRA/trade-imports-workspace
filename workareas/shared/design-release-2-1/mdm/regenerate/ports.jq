def unmask:
  gsub("\"[^\"]*\\*{6}[^\"]*\"(:(\"[^\"]*\"|null|true|false|-?[0-9.]+))?"; "")
  | gsub(",,+"; ",")
  | gsub("\\{,"; "{")
  | gsub(",\\}"; "}")
  | gsub("\\[,"; "[")
  | gsub(",\\]"; "]");

($names[0].body | map({key: .code, value: .name}) | from_entries) as $nameByCode
| gsub("\"building\\*{6}\":\"[^\"]*\\*{6}\":"; "\"townCity\":")
| unmask
| fromjson
| .result |= map(
    . as $port
    | {id, activeFrom, activeTo, code}
      + (if $nameByCode[$port.code] then {name: $nameByCode[$port.code]} else {} end)
      + ($port | del(.id, .activeFrom, .activeTo, .code))
  )
