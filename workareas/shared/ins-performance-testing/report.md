# INS performance testing: distil report

## 0. What the skill decided

It will build in 8 repos: tests (trade-imports-animals-tests), stub (trade-imports-stub), idstub (trade-imports-defra-id-stub), insfrontend, animalsfrontend, plantsfrontend, referencedata and gateway (trade-imports-dynamics-gateway). The k6 suites sit beside the E2E suites in the tests repo. The two stub repos are the systems outside the INS boundary, and they must answer with latency and faults derived from service levels. The service repos are touched only where a tier needs something from them. Only one row does that: per-dependency call metrics. sources.json also lists insbackend, addressbook, animalsbackend and plantsbackend, but no increment changes them, so they are not in the backlog's repos table.

Precedence, highest first: Sam's three rulings (29 September "c" on the tool, then "b" correcting the first, then the first), then the team meeting of 29 September, then the tests, stub and service repos, then the INS volumetrics page (Confluence 6604328622), DR-EUDP-005 (Confluence 6608160092), Grafana's load-testing types page and the k6 docs.

## 0b. How to build it

**Step 0 is to enhance the builder.** The build loop's full lifecycle takes only the repo keys `frontend`, `backend` and `tests`, because its script fixes them. This backlog names 8 repo keys: tests, stub, idstub, insfrontend, animalsfrontend, plantsfrontend, referencedata and gateway. Today only the loop's branch lifecycle takes any repo keys, and it gives up Jira, pull requests per increment and the Codex executor. That is a workaround, not a sensible way to build this.

So before inc-001, the full lifecycle is extended to take its repos from the backlog envelope, whatever their keys. That means ticket, branch, plan, build, pull request per repo touched, CI and merge, for any number of repos. The Codex briefs follow suit. The backlog itself does not change. Its rows already name the repos each increment touches, and the envelope already maps every key to a path and a GitHub slug.

inc-014 is the row that tests this hardest. It touches six repos in one increment.

## 1. Questions for Sam

13 questions are open. Each has a default, and building starts on the defaults. Three requirements are in "question" status and ride on these conflicts rather than adding questions of their own:

- req-018, the session API and related components, rides on the shared-path question.
- req-039, the Defra ID stub's capacity, rides on the Defra ID stub question.
- req-079, stub profiles per integration, rides on the one-stub-or-shared question.

None of these questions clashes with a ruling already in a target repo. The one repo ruling, that notifications are created only through the frontends' save routes, was settled by precedence (see section 2). The first question below is the nearest thing to a clash, because one of Sam's own rulings cannot apply literally there.

1. **In local Docker, what counts as the "real" SNS, SQS and cdp-uploader?** (c-018)
   - Default: the stack's stand-ins take their place locally. These are floci for SNS and SQS, and the local cdp-uploader container for the document store and scanning. Results that depend on them carry a caveat. In CDP they are the real services.
   - Touches: inc-001.
   - One side: Sam's second ruling says they are real, and names no environment. On the other side: the first ruling says the suites run locally, and the stub repo shows that only emulators exist locally.

2. **Should the k6 suites live in the tests repo, or in a separate CDP performance-test-suite repo?** (c-005)
   - Default: the tests repo, as a third profile beside Playwright and ZAP in the same image and entrypoint. Revisit only if CDP's perf-test runner cannot run it from there.
   - Touches: inc-001, and so everything after it.
   - One side: the programme brief and the tests repo, which already hosts a non-Playwright profile. Other side: CDP's usual convention of a separate repo. No source states that convention.

3. **Should the build go ahead on DR-EUDP-005 v0.1 while it is still Proposed?** (c-006)
   - Default: yes, as amended by the meeting and the rulings. Tier cadences and scenario parameters are held in configuration, so an agreed revision changes values, not scripts.
   - Touches: inc-004, inc-009.
   - Sources: DR-EUDP-005 is Proposed, with no approver recorded. The meeting has the DR author agreeing to rework it.

4. **Which response-time and failure-rate thresholds should each scenario pass or fail on until INS sets its own?** (c-004)
   - Default for backend APIs: P95 under 200ms and P99 under 1,200ms. P50 under 25ms is reported but does not fail the run.
   - Default for frontend pages: P95 under 2s and P99 under 5s.
   - Default for upload pages: P99 under 60s.
   - Failure rate stays under 1%.
   - P99 burst: 5xx under 1%, and P95 no worse than twice the sustained P95.
   - Spike: P95 back within 10% of baseline within 60 seconds.
   - Endurance: final-hour P95 no more than 1.2 times the first hour.
   - Touches: inc-001, inc-009, inc-010.
   - Sources: the volumetrics page (section 4.7 and the IPAFFS service levels) and the k6 docs examples, against the DR and the meeting ("no NFRs agreed yet").

5. **Which tiers and scenarios run in each environment, and how often?** (c-003)
   - Default:
     - Local: smoke on every pull request, and everything runnable on demand at short durations.
     - CDP dev: smoke after each deploy.
     - CDP test: tier 2 nightly at design targets.
     - CDP perf-test, per release: tiers 2, 3 and 5, the 8-hour endurance run, breakpoint and tier-4 conformance.
   - Touches: inc-001, inc-002, inc-009, inc-010, inc-016, inc-017.
   - Sources: the DR's tier cadences, the k6 docs (only smoke belongs in CI) and Grafana. Sam's rulings name the environments but not the tiers.

6. **Should the shared-component thresholds gate on the two-journey figures or the with-IUU figures?** (c-007)
   - Default: gate on the two-journey figures (live animals and plants). Run the with-IUU figures as a second profile that is reported but does not fail the run. That profile is 770 sign-ins an hour, 241 concurrent users and a 55 RPS session spike, driven by synthetic IUU-shaped front-door traffic. Switch the gate when IUU is confirmed for Day One.
   - Touches: inc-005, inc-009, inc-012.
   - Sources: the volumetrics page (with-IUU figures apply from IUU go-live) and the DR (the combined tier includes IUU), against the meeting (IUU journey tests out of scope) and the tests repo (no IUU journey exists).

7. **What should the shared path be while the session API, permissions service and routing proxy are not built?** (c-008, which also carries req-018)
   - Default: test the shared path that exists today. That is ins-frontend with its own Redis session, ins-backend, address-book and reference-data. Apply the section 9.4 session load to each frontend's own session store. Add the three components when they exist.
   - Touches: inc-012, and inc-013 (blocked until they are built).
   - Sources: the DR (they sit on the real side), against the ins-frontend and ins-backend repos and the meeting (not built).

8. **What latency should each stub use until its section 9.5 service level is agreed?** (c-011)
   - Default: an interim p50 100ms, p95 400ms and p99 1,000ms for Defra ID, the Trade token endpoint and MDM, marked "unagreed" in every report. Replace it with the latency the services measure on real calls, or with the first conformance measurement, then with the agreed service level. The scan has no profile because cdp-uploader is real.
   - Touches: inc-007, inc-014, inc-018.
   - Sources: the DR (lognormal from the agreed service level) and the volumetrics page (every service level TBC), against the stub repo (no latency today) and the meeting (feed back measured medians).

9. **Does CDP perf-test need its own stub configuration?** (c-022)
   - Default: one stub build and one set of profiles for every environment, chosen at runtime. A zero-delay profile is kept for script development and the pull-request smoke run. Only instance sizing differs, and that is CDP configuration.
   - Touches: inc-001, inc-007.
   - Sources: Sam's first ruling (one suite, run configuration) and the DR, against the meeting (a fast dev stub may not serve when variable latency is needed). The second ruling is silent.

10. **Should each stubbed integration get its own stub service?** (c-020, which also carries req-079)
    - Default: keep the existing stub services, with a separate latency and fault profile per integration inside them. Split one out only if a measured headroom run shows the shared stub distorts results.
    - Touches: inc-007, inc-008, inc-016, inc-017.
    - Sources: the meeting (a shared stub carries combined load in perf-test) and the DR (measure stub ceilings), against the stub repo (one service fakes both the token endpoint and MDM). Sam's second ruling leaves it open.

11. **What test-data distributions should be used until the IPAFFS analyses land?** (c-012)
    - Default commodity lines per plants notification: 50% have 1–3, 30% have 4–10, 15% have 11–25 and 5% have 26–50. The interim maximum is 50.
    - Default documents: 0–3 per live-animals notification, PDF or JPEG, 100KB to 5MB.
    - Default amendments: 20% of notifications amended once, and 5% of those cancelled.
    - Default background volume: one year at the 2025 baseline (42,000 live animals and 34,000 plants).
    - Touches: inc-005, inc-006.
    - Sources: the DR (realistic distributions) and the meeting (vary inputs), against the volumetrics page (TBC, open items 4, 5 and 22) and the plants frontend (no line ceiling).

12. **Should the Defra ID stub's session store be redesigned before load runs?** (c-010, which also carries req-039)
    - Default: no. Measure its headroom first. Change it only if it cannot carry twice the sign-in target (400 an hour, or 1,540 with IUU) plus the 5 RPS spike.
    - Touches: inc-008.
    - Sources: the idstub repo (it rewrites one JSON file synchronously and is a single process), against the DR (770 sign-ins an hour against an IDM stub, and measure stub ceilings first).

13. **Should stubs be built now for Address Lookup, TIG, TRACES, Dynamics, PIMS and Entra ID?** (c-009)
    - Default: no. Stub only what deployed INS services call today: Defra ID, the Trade token endpoint, MDM and Azure Service Bus. Address Lookup comes first when a service calls it, and its service level is raised as a risk now.
    - Touches: inc-007, inc-015.
    - Sources: the DR (all on the stubbed side), against the stub, idstub and ins-backend repos (none is called in deployed environments). The meeting names Address Lookup as the biggest worry.

## 2. What precedence settled

Sam's rulings came first:

- **k6, not JMeter** (c-021). The third ruling won over CDP's one-paragraph JMeter guidance in the meeting. JMeter is not kept as a fallback either.
- **Every environment is stubbed, perf-test included** (c-001). The second ruling withdrew the first ruling's real integrations in perf-test and sided with the meeting and the DR.
- **Real external systems only through tier-4 conformance** (c-002). The second ruling and the DR won over the first ruling's unbounded real traffic. No design-target load ever reaches a real external system.
- **SNS, SQS and cdp-uploader with its document store and antivirus are real** (c-017). The second ruling and the meeting won over the DR's stubbed box. Only the gateway's Service Bus leg to PIMS stays a stand-in.
- **Go wide across both journeys** (c-019). The second ruling won over the meeting's live-animals-first next step. The early thin run in perf-test still stands.

Then the lower-ranked sources:

- **Notifications are created only through the frontends' save routes** (c-013). The tests repo's ruling won over the DR's backend-only tier 1. A backend-only run uses request bodies captured from those saves.
- **Session load is set at 1.35 RPS, not 0.67** (c-014). Volumetrics section 9.4 won over NFR-VOL-CORE-06, which it supersedes. The repos show backends resolve no session today.
- **A breakpoint run is added** (c-015). The meeting won over the DR's four shapes. Average-load and stress map onto sustained peak, and soak is the 8-hour endurance run.
- **Uploads are at most 10MB** (c-016). The animals frontend's cap won over the backend's 50MB limit.

## 3. Already met

- **req-030, correlation and attribution.** Every service already carries x-cdp-request-id and times each endpoint (ins-frontend, animals and plants backends, address-book, ins-backend, reference-data, gateway). The suite only sets the header and records the run window.
- **req-036, the messaging-stand-in caveat.** floci and the Service Bus emulator behind toxiproxy already run in the stack (stub repo). Only the report's caveat line is added, and it is written in inc-001.
- **req-078, SNS, SQS and cdp-uploader are real in CDP.** The services already use the CDP-provisioned ones (meeting), and the local stand-ins already run (stub repo). Nothing is built. It is reported only.

## 4. The increments

18 rows. 16 are `todo` and 2 are `blocked`.

| id | title | ACs | repos | depends on | status | gate |
|---|---|---|---|---|---|---|
| inc-001 | k6 smoke of both journeys and the front door on local Docker, failing the PR on a breach | 9 | tests | – | todo | yes: the walking skeleton |
| inc-002 | Same smoke on CDP dev and test through real OIDC against the Defra ID stub | 4 | tests | inc-001 | todo | – |
| inc-003 | Thin run of both journeys and the front door on CDP perf-test once INS is deployed | 3 | tests | inc-002 | **blocked** | yes: what the first perf-test run surfaced |
| inc-004 | Both journeys and the front door follow the real journey shape under open-model load | 6 | tests | inc-001 | todo | – |
| inc-005 | Distinct identities, varied notifications, documents and address-book use | 7 | tests, idstub | inc-004 | todo | – |
| inc-006 | A year of background notifications before any load run | 4 | tests | inc-005 | todo | – |
| inc-007 | SLA-derived latency profile per stubbed integration, switched at runtime and named in every report | 7 | tests, stub, idstub | inc-001 | todo | – |
| inc-008 | Each stub's throughput ceiling measured before results through it are trusted | 4 | tests, stub, idstub | inc-007 | todo | – |
| inc-009 | Sustained peak and P99 burst at design targets | 8 | tests | inc-004, 005, 006, 007, 008 | todo | yes: the first design-target run |
| inc-010 | Spike and recovery, and 8-hour endurance | 6 | tests | inc-009 | todo | – |
| inc-011 | Events reach the read model and the Service Bus stand-in, smoothed and counted at peak-day volume | 5 | tests | inc-010 | todo | – |
| inc-012 | Shared components carry combined load in proportion, including IUU's share, without cross-journey harm | 6 | tests | inc-009 | todo | – |
| inc-013 | Session API, permissions service and routing proxy loaded once built | 3 | tests | inc-012 | **blocked** | – |
| inc-014 | Every INS service measures each call outside the boundary, per dependency and operation | 4 | tests, insfrontend, animalsfrontend, plantsfrontend, referencedata, gateway | inc-007 | todo | – |
| inc-015 | Call ratios and the required SLA per external system | 4 | tests | inc-012, inc-014 | todo | – |
| inc-016 | Breakpoint run, and the scale the services needed in perf-test | 6 | tests | inc-003, inc-008, inc-012 | todo | – |
| inc-017 | Resilience runs inject faults at each stub under load | 6 | tests, stub, idstub | inc-009 | todo | – |
| inc-018 | Tier-4 conformance of each real external system at an owner-agreed rate | 5 | tests, stub, idstub | inc-003, inc-007 | todo | – |

Build-order decisions to check:

- **Stub latency comes before the first design-target run.** inc-009 depends on inc-007 (profiles) and inc-008 (stub ceilings). No design-target result is taken through a zero-delay or unmeasured stub. The smoke run keeps a zero-delay profile.
- **inc-003 is blocked because INS is not deployed to perf-test.** Deploying INS and the stubs there is Sam's CDP work and is out of scope here. inc-016 (breakpoint and sizing) and inc-018 (conformance) are marked `todo` but depend on inc-003, so in practice they wait on that deployment too. Set inc-003 to `todo` once the deployment exists.
- **Plants publishes no events and has no upload feature today.**
  - inc-011 measures eventing for both journeys and reports that plants is missing. It does not build a plants outbox.
  - inc-005 applies documents to live animals only.
  - inc-006 reports the real read-model size, not 76,000.
  - This keeps the go-wide rule without inventing product.
- **Resilience runs are expected to report failures.** inc-017 is done when the runs detect and report each unbounded wait or retry. It is not waiting for the services to pass. The known missing timeouts, retry bounds and circuit breakers are findings for the owning teams (section 6).
- **Per-dependency latency metrics span five service repos in one row.** inc-014 stays as one row because only a run across all five shows every dependency measured. If it is too big to review, split it by language: the three Node frontends, then reference-data and the gateway. Do not split it by layer.
- inc-013 is blocked with no safe default because none of its three components exists yet. It stays visible rather than being dropped.

## 5. Coverage

In total, 1,042 claims were extracted and 1,023 held under verification (19 did not). Verifiers added 56 missed claims. These produced 79 requirements: 53 adopted (3 of them already met), 3 questions and 23 out of scope.

| source | claims | held | missed added | requirements backed (of which in scope) |
|---|---|---|---|---|
| Sam's ruling, 29 Sep (c, tool) | 1 | 1 | 0 | 1 (1) |
| Sam's ruling, 29 Sep (b, correction) | 12 | 11 | 2 | 17 (14) |
| Sam's ruling, 29 Sep (first) | 7 | 7 | 3 | 6 (5) |
| Meeting, 29 Sep | 70 | 67 | 3 | 40 (30) |
| tests repo | 17 | 15 | 2 | 13 (12) |
| trade-imports-stub | 14 | 14 | 1 | 12 (9) |
| Defra ID stub | 16 | 16 | 2 | 10 (6) |
| ins-frontend | 44 | 44 | 2 | 21 (10) |
| ins-backend | 42 | 40 | 2 | 15 (7) |
| address-book | 35 | 35 | 2 | 12 (6) |
| reference-data | 32 | 32 | 2 | 12 (6) |
| dynamics gateway | 37 | 36 | 2 | 9 (5) |
| animals frontend | 52 | 49 | 5 | 24 (16) |
| animals backend | 57 | 55 | 1 | 13 (10) |
| plants frontend | 44 | 43 | 3 | 19 (14) |
| plants backend | 38 | 38 | 1 | 9 (6) |
| Volumetrics page (6604328622) | 330 | 329 | 9 | 42 (32) |
| DR-EUDP-005 (6608160092) | 104 | 103 | 4 | 40 (29) |
| Grafana load-testing types | 16 | 16 | 4 | 7 (7) |
| k6 docs | 74 | 73 | 6 | 12 (11) |

"In scope" counts adopted requirements.

Cross-referenced requirements: 72 of the 79 are backed by two or more sources. The strongest are:

- req-030 (correlation), backed by 11 sources
- req-044 (functional readiness before measuring), backed by 8
- req-001 (one k6 suite set, chosen by configuration), req-003 (local stack), req-004 (CDP dev and test), req-026 (endurance) and req-032 (stub latency profiles), backed by 7 each

Single-source requirements:

- In scope:
  - req-002, suites in the tests repo, rests on the tests repo alone. It carries question c-005.
  - req-051, generator sizing, rests on the k6 docs alone.
  - req-072, perf-test runs report the scale needed, rests on the meeting alone.
- Out of scope: req-056 (volumetrics page), and the findings req-059 (reference-data), req-061 (gateway) and req-064 (animals backend).

Inferred claims: no requirement rests only on inferred claims. The single-source finding req-061 (the gateway double-sends events) leans most on inference. Two of its five claims are inferred, and both were added by the verifier, so confirm it before handing it on. req-038 and req-079, on stub capacity, cite four and two inferred stub claims beside verbatim ones.

## 6. Out of scope

**Service defects, handed to the owning teams as findings.** The tests will surface these. They are not fixed here.

- req-058: the frontends' outbound calls have no timeout, retry bound or circuit breaker, and no tuned connection pool.
- req-059: reference-data's MDM and token calls ignore their timeouts. They have no retry, circuit breaker or stampede protection, refresh tokens without coordination, log full bodies and drop the trace header.
- req-060: the busiest list queries are not index-backed (animals and plants lists, ins-backend's status filter, address-book's regex search).
- req-061: the gateway sends every event to Service Bus twice, one after the other, with no Service Bus retry or timeout.
- req-062: page handlers call services one after another, and dashboards make up to two address-book calls per row. A failed reference-data load is retried on every request.
- req-063: no service limits inbound concurrency or rate, and nothing isolates one journey from another on the shared path.
- req-064: the animals outbox halts a whole poll on one bad event, and submit makes up to six address-book lookups at once, each with a 2-second timeout.
- req-065: ins-frontend re-fetches OIDC discovery and JWKS on every sign-in and refresh.
- req-066: the Redis session client has no timeouts or fallback, and the Java services' Mongo clients have no socket or server-selection timeout.
- req-067: the plants backend and address-book run on platform threads. Plants' busiest write is not transactional, amend deep-copies the payload, and its read-preference default contradicts its docs.
- req-068: saves are capped at Hapi's default 1MiB, and plants lines have no maximum, so a large consignment can be refused.
- req-069: the frontends' reference-data clients send no trace header.
- req-070: an access-control finding on the notification list. It is not described here because this repo is public. The detail is in the programme's local distil files.

**Sam's CDP platform work.** This is cdp-app-config and platform configuration, which Sam commits by hand.

- req-006: deploy trade-imports-stub and the Defra ID stub to CDP dev, test and perf-test, deploy INS to perf-test, and point the services at the stubs. This includes the gateway's Service Bus leg, which goes to a stand-in. It blocks inc-003, and so inc-016 and inc-018.
- req-007: production-like sizing in perf-test (instance counts, CPU and memory, autoscaling, JVM sizing). inc-016 reads and reports this sizing but does not set it.
- req-031: production-grade service telemetry at 10-second resolution. This is service and platform work (open item 20). Per-dependency call latency was split out and is built in inc-014.

**Exclusions from the DR and the meeting:**

- req-052: IUU journey-level targets and tests. Another supplier builds IUU. IUU appears here only as load on the shared components.
- req-053: performance-testing the dependencies themselves (Defra ID, MDM, the risk engine, TIG, Dynamics, PIMS). Their owners test them. INS supplies call rates and takes part in conformance.
- req-035: stubs for Address Lookup, TIG, TRACES, direct Dynamics and PIMS, and Entra ID. They wait until a deployed service calls them (see question 13).
- req-054: tier-6 production measurement and traffic shadowing. INS is not live yet.
- req-055: functional, contract, security and browser-rendering performance. ZAP and Lighthouse already cover the last two.
- req-056: load the volumetrics page does not model. This covers inspectors and case-working, machine-to-machine submission, TIG inbound, downstream event delivery, CDN assets and IPAFFS cutover.
- req-057: setting or validating the volumetric targets themselves. The suite uses them as parameters and feeds its measurements back.
