# Confluence helper scripts

Scripts mirror the `jira/` helpers and use the same `JIRA_USER`/`JIRA_TOKEN` credentials (API token for Atlassian Cloud).

## Auth variables
- `JIRA_USER` (email) – required
- `JIRA_TOKEN` – required

## Scripts
- `page.sh` – fetch page details/content by page ID

## Examples
```bash
# Full page output (HTML body included)
./confluence/page.sh 12345678

# Summary only
./confluence/page.sh 12345678 summary

# Raw JSON
./confluence/page.sh 12345678 json
```
