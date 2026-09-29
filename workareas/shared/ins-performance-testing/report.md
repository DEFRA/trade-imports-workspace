# INS performance testing: backlog report

## Summary

- The backlog has 19 increments: 17 ready to build, 2 blocked.
- The tests use k6. They cover the live animals and high-risk plants journeys, the INS front door and the shared components, with all 6 k6 test types.
- 13 questions are open. Each has a default, so building can start without an answer.
- Before building, the build loop must be extended to handle more than 3 repos (step 0).
- 3 increments need INS deployed to CDP perf-test, which is Sam's CDP work.

## Before you build: step 0

The build loop's normal run only supports repos named `frontend`, `backend` and `tests`. This backlog uses 8.

Extend the loop so it takes its repos from the backlog, whatever they are called. Each increment then gets a ticket, a pull request per repo, CI and merge, as usual. The Codex instructions must change to match.

The backlog itself does not change. inc-014 is the hardest test: it touches 6 repos in one increment.

## Decisions the pipeline made

**Repos (8).** The pipeline chose these from the goal:

| Key | Repo | Why |
|---|---|---|
| tests | trade-imports-animals-tests | The k6 suites live here, beside the end-to-end tests |
| stub | trade-imports-stub | Stands in for systems outside INS |
| idstub | trade-imports-defra-id-stub | Stands in for Defra ID sign-in |
| insfrontend | trade-imports-ins-frontend | Needs per-dependency call metrics |
| animalsfrontend | trade-imports-animals-frontend | Needs per-dependency call metrics |
| plantsfrontend | trade-imports-plants-frontend | Needs per-dependency call metrics |
| referencedata | trade-imports-reference-data | Needs per-dependency call metrics |
| gateway | trade-imports-dynamics-gateway | Needs per-dependency call metrics |

The INS backend, address book and both journey backends are tested but not changed, so they are not listed.

**Which source wins a disagreement**, highest first:

1. Sam's 3 rulings of 29 September 2026
2. The team meeting of 29 September 2026
3. The repos as they are today
4. The INS volumetrics page (Confluence 6604328622)
5. DR-EUDP-005, the decision record on how to performance test (Confluence 6608160092)
6. Grafana's guide to load test types, and the k6 documentation

## Questions for Sam

Each question lists the default that will be built if nobody answers.

### 1. In local Docker, what stands in for SNS, SQS and cdp-uploader?

- **Default:** floci for SNS and SQS, and the local cdp-uploader container. Results that depend on them carry a caveat. In CDP, the real services are used.
- **Affects:** inc-001.
- **Why it is open:** Sam ruled these services are real, but real ones do not exist locally.

### 2. Do the k6 suites live in the tests repo or a separate CDP performance-test repo?

- **Default:** the tests repo, as a third profile beside Playwright and ZAP. Revisit only if CDP's perf-test runner cannot run it from there.
- **Affects:** inc-001, and so everything after it.
- **Why it is open:** CDP usually uses a separate repo, but no source says so.

### 3. Do we build to DR-EUDP-005 while it is still Proposed?

- **Default:** yes, as amended by the meeting and Sam's rulings. Tier cadences and scenario settings are held in configuration. An agreed revision then changes values, not scripts.
- **Affects:** inc-004, inc-009.
- **Why it is open:** nobody has approved the decision record. Its author agreed in the meeting to rework it.

### 4. What pass and fail limits do we use until INS agrees its own?

"P95" means 95% of responses are faster than this.

| Measure | Default limit |
|---|---|
| Backend APIs | P95 under 200ms, P99 under 1,200ms. P50 under 25ms is reported but does not fail a run |
| Frontend pages | P95 under 2 seconds, P99 under 5 seconds |
| Upload pages | P99 under 60 seconds |
| Failed requests | Under 1% |
| Burst | Server errors under 1%. P95 no worse than twice the sustained P95 |
| Spike | P95 back within 10% of normal within 60 seconds |
| Endurance | P95 in the last hour no more than 1.2 times the first hour |

- **Affects:** inc-001, inc-009, inc-019, inc-010.
- **Why it is open:** the meeting confirmed no NFRs (non-functional requirements) are agreed for INS. The defaults come from volumetrics §4.7 and the IPAFFS service levels.

### 5. Which tests run where, and how often?

| Environment | Default |
|---|---|
| Local Docker | Smoke test on every pull request. Anything else on demand, at shorter durations |
| CDP dev | Smoke test after each deploy |
| CDP test | Journey tests (tier 2) nightly at the design targets |
| CDP perf-test | Per release: tiers 2, 3 and 5, the 8-hour endurance run, breakpoint and the tier 4 check against real systems |

- **Affects:** inc-001, inc-002, inc-009, inc-019, inc-010, inc-016, inc-017. The average-load run (inc-019) has no place in the table yet, so it runs on demand.
- **Why it is open:** Sam's rulings name the environments but not which tests run in each.

### 6. Do the shared components pass or fail on the figures with IUU or without?

- **Default:** pass or fail on the live animals and plants figures. Run the figures with IUU as a second profile that is reported only: 770 sign-ins an hour, 241 concurrent users and a 55 requests-a-second session spike, using made-up IUU-style traffic. Switch when IUU is confirmed for day one.
- **Affects:** inc-005, inc-009, inc-012.
- **Why it is open:** IUU (illegal, unreported and unregulated fishing) is a journey built by another supplier. Its tests are out of scope, but it adds load to the shared components.

### 7. What do we test while the session API, permissions service and routing proxy do not exist?

- **Default:** the shared path that exists today: the INS frontend with its own session store, the INS backend, the address book and reference data. Add the three when they are built.
- **Affects:** inc-012, and inc-013 (blocked until they exist).
- **Why it is open:** DR-EUDP-005 says to test them for real, but none is built.

### 8. How slow should the stubs be until service levels are agreed?

- **Default:** 100ms for half of responses, 400ms for 95%, and 1 second for 99%. This applies to Defra ID, the Trade token endpoint and MDM (master data). Every report marks these figures "unagreed". They are replaced first by measured latency, then by the agreed service level. Virus scanning has no stub figure because cdp-uploader is real.
- **Affects:** inc-007, inc-014, inc-018.
- **Why it is open:** every service level in the volumetrics page is still TBC, and the stubs have no delay today.

### 9. Does CDP perf-test need its own stub settings?

- **Default:** no. One stub build and one set of profiles everywhere, chosen when a run starts. A zero-delay profile is kept for writing scripts and for the pull request smoke test. Only instance sizing differs between environments, and that is CDP configuration.
- **Affects:** inc-001, inc-007.
- **Why it is open:** the meeting noted a fast dev stub may not suit tests that need realistic delays.

### 10. Does each stubbed system get its own stub service?

- **Default:** keep today's stubs, with a separate delay and fault profile for each system inside them. Split one out only if a measured test shows the shared stub skews results.
- **Affects:** inc-007, inc-008, inc-016, inc-017.
- **Why it is open:** one person raised it in the meeting. Sam confirmed it was not decided.

### 11. What test data do we use until the IPAFFS analysis is done?

| Data | Default |
|---|---|
| Commodity lines per plants notification | 50% have 1 to 3, 30% have 4 to 10, 15% have 11 to 25, 5% have 26 to 50. Maximum 50 |
| Documents per live animals notification | 0 to 3, PDF or JPEG, 100KB to 5MB |
| Amendments | 20% of notifications amended once. 5% of those cancelled |
| Existing data before a run | 1 year at the 2025 volume: 42,000 live animals and 34,000 plants notifications |

- **Affects:** inc-005, inc-006.
- **Why it is open:** the volumetrics page leaves these as TBC (open items 4, 5 and 22). The plants journey has no limit on commodity lines.

### 12. Do we redesign the Defra ID stub before load testing?

- **Default:** no. Measure what it can take first. Change it only if it cannot carry twice the sign-in target plus the spike. The target is 400 sign-ins an hour, or 1,540 with IUU, and the spike is 5 requests a second.
- **Affects:** inc-008.
- **Why it is open:** the stub runs as a single process and rewrites one file on every sign-in, which may not scale.

### 13. Do we build stubs now for systems INS does not call yet?

These are Address Lookup, TIG, TRACES, Dynamics, PIMS and Entra ID.

- **Default:** no. Stub only what INS calls today: Defra ID, the Trade token endpoint, MDM and Azure Service Bus. Address Lookup comes first once a service calls it. Its service level is raised as a risk now, because the meeting named it as the biggest worry.
- **Affects:** inc-007, inc-015.
- **Why it is open:** DR-EUDP-005 lists all of them as stubbed, but no deployed service calls them.

## Settled without a question

| Decision | Settled by | Conflict |
|---|---|---|
| k6 only. JMeter is not used, even as a fallback | Sam's ruling | c-021 |
| Every environment is stubbed outside INS, including perf-test | Sam's ruling, siding with the meeting | c-001 |
| Real external systems only get the tier 4 check, at rates their owners agree. No design-target load reaches them | Sam's ruling and DR-EUDP-005 | c-002 |
| SNS, SQS and cdp-uploader, with its document store and virus scanning, are real. Only the gateway's link to PIMS is stubbed | Sam's ruling and the meeting | c-017 |
| Both journeys from the first increment, not live animals first. The early perf-test run still stands | Sam's ruling | c-019 |
| Test notifications are created only through the frontends' save routes. Backend-only runs replay request bodies captured from those saves | The tests repo's existing rule | c-013 |
| Session load is 1.35 requests a second, not 0.67 | Volumetrics §9.4, which replaces NFR-VOL-CORE-06 | c-014 |
| A breakpoint run is added to DR-EUDP-005's 4 scenario shapes | The meeting | c-015 |
| An average-load run of a normal weekday is added. Sustained peak is a stress test, because it runs a seasonal peak day with 2x headroom | Sam, after a check against the 6 k6 test types | c-015 |
| Uploads are at most 10MB | The animals frontend's limit, over the backend's 50MB | c-016 |

## Already in place

| Requirement | What already exists |
|---|---|
| req-030: trace a request across services | Every service passes the `x-cdp-request-id` header and times each endpoint. The suite only sets the header and records when each run happened |
| req-036: caveat on local messaging | floci and the Service Bus emulator already run in the local stack. inc-001 adds the caveat to reports |
| req-078: real SNS, SQS and cdp-uploader in CDP | The services already use the ones CDP provides |

## The increments

| Id | What it delivers | Criteria | Repos | Depends on | Status |
|---|---|---|---|---|---|
| inc-001 | Smoke test of both journeys and the front door on local Docker, failing the pull request when a limit is broken | 9 | tests | – | Ready. **Review point** |
| inc-002 | The same smoke test in CDP dev and test, signing in through the Defra ID stub | 4 | tests | 001 | Ready |
| inc-003 | First small run in CDP perf-test, once INS is deployed there | 3 | tests | 002 | **Blocked**. **Review point** |
| inc-004 | Traffic follows the real journey: draft, many edits, submit, read back, update | 6 | tests | 001 | Ready |
| inc-005 | Different users and organisations, varied notifications, documents and address book use | 7 | tests, idstub | 004 | Ready |
| inc-006 | 1 year of existing notifications loaded before any load run | 4 | tests | 005 | Ready |
| inc-007 | A delay profile for each stubbed system, switchable per run and named in every report | 7 | tests, stub, idstub | 001 | Ready |
| inc-008 | Each stub's capacity measured before its results are trusted | 4 | tests, stub, idstub | 007 | Ready |
| inc-009 | Sustained peak and burst at the design targets | 8 | tests | 004 to 008 | Ready. **Review point** |
| inc-019 | An average-load run follows a normal weekday, at a quarter of the sustained peak rate in its busiest hour | 5 | tests | 004 to 008 | Ready |
| inc-010 | Spike and recovery, and the 8-hour endurance run | 6 | tests | 009 | Ready |
| inc-011 | Events reach the dashboard's data and the Service Bus stub, counted at peak-day volume | 5 | tests | 010 | Ready |
| inc-012 | Shared components under combined load, including IUU's share, without one journey slowing another | 6 | tests | 009 | Ready |
| inc-013 | Session API, permissions service and routing proxy, once built | 3 | tests | 012 | **Blocked** |
| inc-014 | Every INS service measures each call it makes outside INS | 4 | tests + 5 service repos | 007 | Ready |
| inc-015 | How often INS calls each outside system, and the service level it needs from each | 4 | tests | 012, 014 | Ready |
| inc-016 | Breakpoint run, and the scale each service needed in perf-test | 6 | tests | 003, 008, 012 | Waits on inc-003 |
| inc-017 | Faults injected at each stub under load | 6 | tests, stub, idstub | 009 | Ready |
| inc-018 | Low-volume check of each real outside system, at a rate its owner agrees | 5 | tests, stub, idstub | 003, 007 | Waits on inc-003 |

A **review point** means the loop stops after that increment so Sam can look before anything that depends on it is built.

**Check these ordering decisions:**

- **Stub delays come before the first design-target run.** No design-target result is taken through a stub that answers instantly. The smoke test keeps a zero-delay profile.
- **inc-019 was added by hand.** Its id is out of sequence but it builds straight after inc-009. The 6 k6 test types map as follows:

  | k6 type | Increments |
  |---|---|
  | Smoke | inc-001 to inc-003 |
  | Average-load | inc-019 |
  | Stress | inc-009 |
  | Spike | inc-010 |
  | Soak | inc-010 (8 hours at peak, stricter than k6's soak at average load) |
  | Breakpoint | inc-016, and inc-008 for the stubs |
- **inc-003 is blocked until INS is deployed to CDP perf-test.** That is Sam's CDP work. inc-016 and inc-018 wait on it too. Set inc-003 to ready once the deployment exists.
- **Plants has no events and no uploads today.** inc-011 reports that plants sends no events. It does not build them. inc-005 adds documents to live animals only. inc-006 reports the real size of the dashboard's data, not 76,000.
- **Fault injection (inc-017) is expected to find failures.** It is done when the runs detect and report each missing timeout or retry limit, not when the services pass.
- **inc-014 spans 5 service repos.** If it is too big to review, split it by language: the 3 Node frontends, then reference data and the gateway. Do not split it by layer.

## Where the requirements came from

1,042 claims were taken from 20 sources. A second agent checked each one:

- 1,023 held
- 19 were dropped
- 56 missed claims were added

These became 80 requirements: 54 to build (3 of them already in place), 3 open questions and 23 out of scope. One of them, req-080 (average-load), was added by hand after the run.

| Source | Claims | Held | Added | Requirements it backs (in scope) |
|---|---|---|---|---|
| Sam's ruling: k6 | 1 | 1 | 0 | 1 (1) |
| Sam's ruling: correction after the meeting | 12 | 11 | 2 | 17 (14) |
| Sam's first ruling | 7 | 7 | 3 | 6 (5) |
| Meeting, 29 September 2026 | 70 | 67 | 3 | 40 (30) |
| Tests repo | 17 | 15 | 2 | 13 (12) |
| trade-imports-stub | 14 | 14 | 1 | 12 (9) |
| Defra ID stub | 16 | 16 | 2 | 10 (6) |
| INS frontend | 44 | 44 | 2 | 21 (10) |
| INS backend | 42 | 40 | 2 | 15 (7) |
| Address book | 35 | 35 | 2 | 12 (6) |
| Reference data | 32 | 32 | 2 | 12 (6) |
| Dynamics gateway | 37 | 36 | 2 | 9 (5) |
| Animals frontend | 52 | 49 | 5 | 24 (16) |
| Animals backend | 57 | 55 | 1 | 13 (10) |
| Plants frontend | 44 | 43 | 3 | 19 (14) |
| Plants backend | 38 | 38 | 1 | 9 (6) |
| Volumetrics page | 330 | 329 | 9 | 42 (32) |
| DR-EUDP-005 | 104 | 103 | 4 | 40 (29) |
| Grafana load test types | 16 | 16 | 4 | 7 (7) |
| k6 documentation | 74 | 73 | 6 | 12 (11) |

**Strongest requirements.** 72 of the 79 are backed by 2 or more sources:

- req-030 (trace a request): 11 sources
- req-044 (check the journeys work before measuring): 8 sources
- req-001, req-003, req-004, req-026 and req-032: 7 sources each

**Weakest requirements.** These rest on one source:

- req-002: suites live in the tests repo (the tests repo only). Question 2 covers it.
- req-051: sizing the machine that generates load (the k6 documentation only).
- req-072: perf-test runs report the scale needed (the meeting only).

Four out-of-scope requirements also rest on one source: req-056, req-059, req-061 and req-064.

**Confirm before passing on:** req-061, the gateway sending every event twice. It rests on one repo, and 2 of its 5 claims were read between the lines rather than seen in the code.

No requirement rests only on claims read between the lines. The stub capacity requirements, req-038 and req-079, lean on some: 4 and 2 of their claims respectively.

## Out of scope

### Problems in the services, for the owning teams

The tests will show these up. This programme does not fix them.

| Req | Problem |
|---|---|
| req-058 | Frontends' calls to other services have no timeout, retry limit or circuit breaker (a guard that stops calling a failing service) |
| req-059 | Reference data ignores its configured timeouts for MDM and token calls. It has no retry, circuit breaker or protection against many requests refreshing an empty cache at once. Instances refresh tokens without coordinating. It logs full response bodies and drops the trace header |
| req-060 | The busiest list queries have no database index: animals and plants lists, the INS backend's status filter, the address book's text search |
| req-061 | The gateway sends every event to Service Bus twice, one after the other, with no retry or timeout |
| req-062 | Pages call services one after another. Dashboards make up to 2 address book calls per row. A failed reference data load is retried on every request |
| req-063 | No service limits incoming requests, and nothing stops one journey slowing another on the shared path |
| req-064 | One bad event stops the animals outbox sending the rest. Submit makes up to 6 address book lookups at once, each with a 2-second timeout |
| req-065 | The INS frontend re-fetches its sign-in configuration on every sign-in and refresh |
| req-066 | The session store client has no timeouts or fallback. The Java services' database clients have no connection timeouts |
| req-067 | The plants backend and address book use a less scalable threading model. Plants' busiest save is not transactional, amend copies the whole notification, and its database read setting contradicts its own documentation |
| req-068 | Saves are capped at 1MB and plants has no limit on commodity lines, so a large consignment can be refused |
| req-069 | The frontends' calls to reference data do not pass the trace header |
| req-070 | An access-control finding on the notification list. It is not described here because this repo is public. The detail is in the programme's local files |

### Sam's CDP platform work

These are changes to CDP configuration, which Sam makes by hand.

- **req-006:** deploy both stubs to CDP dev, test and perf-test, deploy INS to perf-test, and point the services at the stubs, including the gateway's link to PIMS. This blocks inc-003, inc-016 and inc-018.
- **req-007:** size perf-test like production: instance counts, CPU, memory and autoscaling. inc-016 reports this sizing but does not set it.
- **req-031:** detailed service metrics every 10 seconds (volumetrics open item 20). Per-call latency is split out and built in inc-014.

### Excluded by the decision record or the meeting

- **req-052:** IUU journey tests. Another supplier builds IUU. It appears here only as load on the shared components.
- **req-053:** load testing the outside systems themselves. Their owners do that. INS gives them expected call rates.
- **req-035:** stubs for systems INS does not call yet. See question 13.
- **req-054:** measuring production and replaying its traffic. INS is not live yet.
- **req-055:** functional, contract, security and in-browser performance testing. ZAP and Lighthouse already cover security and browser performance.
- **req-056:** load the volumetrics page does not model: inspectors, system-to-system submissions, TIG inbound, onward event delivery, static files and IPAFFS cutover.
- **req-057:** setting the volumetric targets. The tests use them and report back against them.

## Terms used

| Term | Meaning |
|---|---|
| CDP | Core Delivery Platform, where the services run |
| DR-EUDP-005 | The decision record on how INS is performance tested |
| INS | Import Notification Service |
| IPAFFS | Import of products, animals, food and feed system: the service INS replaces |
| MDM | Master data management: reference data such as countries |
| NFR | Non-functional requirement, such as speed or capacity |
| P50, P95, P99 | The response time that 50%, 95% or 99% of responses beat |
| SLA | Service level agreement between INS and a system it depends on |
| Stub | A stand-in for a real system, which answers with set delays and faults |
| Tier 2, 3, 4, 5 | DR-EUDP-005's test levels: 2 is one journey, 3 is all journeys together, 4 is a low-volume check of real systems, 5 is fault injection |
