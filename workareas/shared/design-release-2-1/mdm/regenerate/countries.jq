def unmask:
  gsub("\"[^\"]*\\*{6}[^\"]*\"(:(\"[^\"]*\"|null|true|false|-?[0-9.]+))?"; "")
  | gsub(",,+"; ",")
  | gsub("\\{,"; "{")
  | gsub(",\\}"; "}")
  | gsub("\\[,"; "[")
  | gsub(",\\]"; "]");

def coded($text; $key):
  ($text | capture("\"" + $key + "\":(?<v>null|\\{\"value\":\"[^\"]*\",\"listId\":\"[^\"]*\"[^}]*\\})").v | unmask | fromjson);

def scalar($text; $key):
  ($text | [capture("\"" + $key + "\":(?<v>null|true|false|\"[^\"]*\")")] | if length == 0 then null else (.[0].v | fromjson) end);

def present($text; $key): ($text | test("\"" + $key + "\":"));

($names[0].body | map({key: .code, value: .}) | from_entries) as $byCode
| [splits("\\{\"id\":\\{\"content\":\"gbnag-")] | .[1:]
| map(
    . as $s
    | ($s | capture("^(?<u>[0-9a-f-]+)").u) as $uuid
    | ($s | sub("\\}[,\\]]$"; "")) as $body
    | ($body | index(",\"blocks\":[")) as $blocksAt
    | ($body[$blocksAt + 10:] | gsub("\\{\"\\*{6}_EX\","; "{\"name\":\"GBNAG_SPS_EX\",") | unmask | fromjson) as $rawBlocks
    | ($body[0:$blocksAt]) as $head
    | ($head | index("\"effectiveLong")) as $longAt
    | (($head[$longAt:] | index("\":[")) + 2) as $subsOffset
    | ($head[$longAt + $subsOffset:] | unmask | fromjson) as $rawSubs
    | coded($head; "alpha2") as $alpha2
    | $byCode[$alpha2.value] as $ref
    | {
        id: {content: ("gbnag-" + $uuid), schemeId: "MDM-COUNTRY", schemeAgencyId: "DEFRA"},
        countryUUID: {content: $uuid, schemeId: "MDM-COUNTRY", schemeAgencyId: "DEFRA"},
        ISONumeric: coded($head; "ISONumeric"),
        alpha2: $alpha2,
        alpha3: coded($head; "alpha3")
      }
      + (if present($head; "independent") then {independent: scalar($head; "independent")} else {} end)
      + (if present($head; "system") then {system: scalar($head; "system")} else {} end)
      + (if present($head; "systemAlias") then {systemAlias: scalar($head; "systemAlias")} else {} end)
      + (if present($head; "systemAlpha2") then {systemAlpha2: scalar($head; "systemAlpha2")} else {} end)
      + (if present($head; "systemAlpha3") then {systemAlpha3: scalar($head; "systemAlpha3")} else {} end)
      + (if $ref then {effectiveAlias: $ref.name} else {} end)
      + (if present($head; "effectiveAlpha2") then {effectiveAlpha2: scalar($head; "effectiveAlpha2")}
         elif $ref then {effectiveAlpha2: $ref.code} else {} end)
      + (if present($head; "effectiveAlpha3") then {effectiveAlpha3: scalar($head; "effectiveAlpha3")} else {} end)
      + {
          subDivisions: ($rawSubs | map(
            . as $sub
            | (($ref.subDivisions // []) | map(select(.code == $sub.code.value)) | first) as $refSub
            | {id: $sub.id, code: $sub.code}
              + (if $refSub then {name: $refSub.name} else {} end)
              + {countryCategory: $sub.countryCategory, blocs: $sub.blocs}
          )),
          blocks: $rawBlocks
        }
  )
