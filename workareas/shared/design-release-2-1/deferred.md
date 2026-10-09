# Deferred work: tickets and actions outside the backlog

Everything the DR2.1 programme pushed out of `backlog.json` lives here, so none of it is lost after the split. Update
this file whenever something is deferred, raised or closed.

| What | Why it's deferred | Where it lives | State |
|---|---|---|---|
| Publish germinal product details (temperature, donor, collection and production dates, identification mark, and the decimal kg quantity and per-line gross weight, which gbn-ag-pims v0.2.0 can't carry) in GBN-AG. **Ticket text needs correcting:** it says GBN-AG gains the kg quantity and gross weight now; the ruling (claim 8) says they are stored, not published | GBN-AG has no fields for them, and the shape needs agreeing with the schemas, PIMS and Dynamics owners. Until then the animals backend stores them unpublished (Sam, 9 Oct) | [EUDPA-686](https://eaflood.atlassian.net/browse/EUDPA-686), under EUDPA-382 Germinals | Raised 9 Oct. Start after the programme lands |
| ~~Port of entry order: airports first, then seaports (req-304)~~ | Not deferred. MDM's raw port record has `traffic` (`Airport`, `Port`, `Rail`), seen in `mdm/captures/raw/getPorts.json` on 9 Oct. reference-data maps it and the order is built in the backlog | Backlog (reference-lists theme) | Closed 9 Oct: no ticket needed |
| Port of exit limited to ports approved for animals (req-149) | No approved-for-animals flag in MDM's raw port record: every port's status is `Approved-Live`. Show the whole ports-of-entry list for now and refine later if MDM adds the flag (Sam, 9 Oct) | Ticket under EUDPA-190 if MDM ever adds the flag | Not raised: no flag to build on |
| MDM port data quality: duplicate Pembroke and Sheerness ports, `Teestort`, `TILBURY`, `Portsmouth  Port`, non-breaking spaces in `GB MID` | It's MDM's data, seen in CDP test on 9 Oct | Slack message to the MDM team (Sam to send) | Drafted 9 Oct |
| Address search (search pages, type-ahead, Northern Ireland BT-postcode search): inc-042, inc-072, and the search parts of inc-071 and inc-081 | Only the EUDPA-390 spike exists, gated to dev and local on a standalone page. Rows stay in the backlog, blocked until the lookup becomes a real feature, then that area is re-distilled (Sam, 9 Oct) | Backlog (blocked rows). Unblocks on the spike landing as a feature | Blocked |
| Remove the `SPRING_APPLICATION_JSON` secret (MdmClient debug logging) from reference-data in CDP test and redeploy | It logs the bearer token and subscription key on every MDM call | CDP Portal secrets | Done 9 Oct: removed and redeployed |
| Plants frontend: stale countries stub data (no subdivisions) and the unused `tradeImportsReferenceDataApi.baseUrl` key | Outside the programme's repos | NO_JIRA chore | Not raised |
| Workspace: stale "primed at boot … exit(1)" comments in `docker/stack/frontend.compose.yml`, and the consumer list in `docs/repos/trade-imports-reference-data.md` | Outside the programme's repos | NO_JIRA chore, with the row above | Not raised |
| `MDM_SERVICE_URL` unset in perf-test, ext-test and prod for reference-data | cdp-app-config is Sam's to change | cdp-app-config | Sam's action |
