#!/bin/bash
#
# sonar-remove-stale-mcp-containers.sh — SessionStart hook.
#
# The sonar CLI runs its MCP server in an mcp/sonarqube docker container that
# does not exit when its parent `sonar run mcp` process dies, so every dead
# session leaves four containers running (700MiB-1GiB each; --rm never fires
# because the container never stops). For each SonarCloud project key, keep as
# many newest containers as there are live `sonar run mcp --project <key>`
# processes on the host and remove the older surplus. Safe with concurrent
# sessions: their processes are alive, so their containers are kept.
#
# Fast + fail-open. Targets bash 3.2 (macOS stock).

LABEL="io.modelcontextprotocol.server.name=io.github.SonarSource/sonarqube-mcp-server"

ids=$(docker ps --filter "label=${LABEL}" --format '{{.ID}}' 2>/dev/null) || exit 0
[ -n "$ids" ] || exit 0

# Container id -> project key, preserving docker ps order (newest first).
pairs=""
for id in $ids; do
  key=$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$id" 2>/dev/null |
    sed -n 's/^SONARQUBE_PROJECT_KEY=//p')
  [ -n "$key" ] || continue
  pairs="${pairs}${id} ${key}
"
done
[ -n "$pairs" ] || exit 0

removed=0
for key in $(printf '%s' "$pairs" | awk '{print $2}' | sort -u); do
  live=$(pgrep -f "sonar run mcp --project ${key}$" 2>/dev/null | wc -l | tr -d ' ')
  kept=0
  for id in $(printf '%s' "$pairs" | awk -v k="$key" '$2 == k {print $1}'); do
    if [ "$kept" -lt "$live" ]; then
      kept=$((kept + 1))
    else
      docker rm -f "$id" >/dev/null 2>&1 && removed=$((removed + 1))
    fi
  done
done

[ "$removed" -gt 0 ] && echo "Removed ${removed} stale sonar MCP container(s)."
exit 0
