# Review brief: java-tests

This brief is 5856 lines. Read it with Read from line 1 to line 5856, in
order: one call returns only part of it, so carry on from the line after the
last one each call returned. Your files and the source they cover come before
the guides. Your reply says the last line you read.

## How to review your group

You review every file listed under "Your group", below these
instructions. This brief holds, in order: these instructions, your group,
the ticket, the house rules, each file's diff and content at the reviewed
commit, and your guides last. Read all of it, from line 1 to the last
line the header gives, in order, before you write a finding. The code you
review comes before the guides, so stopping early loses the code, not the
guides. The instructions for your type below say which other files you
read and when. Do not search the repo.

A functional finding needs evidence you can quote from the brief, or from
a file you read under those instructions.

Every file's content is printed with its line numbers. A finding's `line`
is that number, a plain integer. Never use a position in the diff or in
this brief.

### Scope

- **Findings come from the diff, widened for code quality.** Flag what the
  change introduces or touches. A functional problem (a bug, security, an
  error path, performance) in lines the change does not touch is not a
  finding, unless the change substantially rewrites that function.
- **Code quality covers the whole file.** Every comment and every name in
  each file of your group, every test title in a test file, and any
  comment or doc line the diff makes untrue.
- One rule broken in several places is one finding, with every line named
  in its issue.

### Evidence

- **Functional findings** (`correctness`, `security`, `error-handling`,
  `coverage-gap`) need evidence: a failure scenario, the acceptance
  criterion it breaks, or the line it fails on. A hunch is not a finding.
- **Code-quality findings** (`naming`, `comments`, `structure`,
  `duplication`, `logging`, `test-readability`, `history`) are real by
  default. Never drop one because it is taste, was there before, is out of
  the ticket's scope, matches a nearby file, or was planned that way. Drop
  one only when the code shows it is factually wrong, and quote that code.
- **Design findings** (`design`) are for the designer, never a code fix:
  where a guide disagrees with the design source, the design source sets
  two things for one element, or it does not show a case the code handles.
  Quote the design source and the code at file:line, and end with the
  question and its options. Where GOV.UK guidance and the page disagree,
  GOV.UK wins: raise it with the GOV.UK end state as the Must.

### Do not add a finding for

- a functional problem in code the change does not touch
- "could be cleaner" with no concrete Must
- a formatting preference no rule states
- missing tests for code the change does not touch

### Severity

| Severity | When |
|---|---|
| Critical | A bug, a security issue, a broken acceptance criterion, a behaviour-spec change that misstates the AC or claims coverage nobody checked, an absorbed behaviour change |
| Major | Quality or maintainability, or a missing test for new behaviour. Every `naming`, `structure`, `duplication`, `logging` and `test-readability` finding is at least Major |
| Minor | A guide breach with no effect on how a reader understands the code |

### Category

One per finding, from this list only (any other word is refused):
`correctness`, `security`, `error-handling`, `coverage-gap`, `naming`,
`comments`, `structure`, `duplication`, `logging`, `test-readability`,
`history`, `design`.

### The fix

Every finding's `fix` has two parts:

- **Must:** what is true when the item is done, stated as an end state.
  "One function owns the port label format; every page calls it", not
  "add a guard in ports/index.js".
- **One way:** optional, a change that would get there.

Write it as `"Must: … One way: …"`.

### Verdict per file

| Verdict | When |
|---|---|
| `SAFE` | No Critical or Major findings |
| `NEEDS_ATTENTION` | Major findings, no Critical |
| `RISKY` | At least one Critical |

### Writing your findings: one call

Write every file's findings and verdict to one JSON file, then save it with
one command. Send both tool calls in the same response, the Write first.

1. Write `<review workarea>/findings/<group id>.json` (the review id and
   group id are under "Your group"; the workarea is
   `~/git/defra/trade-imports-workspace/workareas/reviews/<review id>`):

   ```json
   [
     {"repo": "<repo>", "file": "<path>", "verdict": "NEEDS_ATTENTION",
      "reason": "One sentence on why.",
      "findings": [
        {"line": 42, "severity": "Major", "category": "naming",
         "issue": "One line naming the problem and every line it is on.",
         "fix": "Must: … One way: …",
         "best_practice": "java/modern-java.md"}
      ]},
     {"repo": "<repo>", "file": "<path>", "verdict": "SAFE",
      "reason": "One sentence on why.", "findings": []}
   ]
   ```

   One entry for every file in your group, findings or not.
   `best_practice` is optional: the guide's path after
   `docs/best-practices/`, only for a guide in this brief.

2. Run:

   ```bash
   ~/git/defra/trade-imports-workspace/tools/review/file-review-write.sh <review id> --from <that file>
   ```

   It writes everything or nothing. If it refuses an entry, fix that entry
   and run it again.

### Reporting back

When the write succeeds, reply with one line and nothing else:

`done: <files> files, <findings> findings, <worst verdict>, read <last line> of <lines> lines`

`<last line>` is the last line of the brief you read, and `<lines>` is the
length the header gives. When the first is smaller, read the rest and
review again before you reply.

Your findings are on disk; the parent reads them there. If you could not
write them, reply `failed: <the error>`.

## Reviewing tests

Review tests the way a tester would: against the ticket, its acceptance
criteria and any behaviour-spec scenarios in this brief. Then use the
source each test covers, under "Source under test" after your files and
before the guides, to find what no test proves. Read nothing outside this brief and do
not search the repo.

Judge the acceptance criteria and every test title from the ticket and
the assertions first, before you read the source, so the code does not
set what you expect it to do.

### Coverage gaps in the source under test

For each source file under "Source under test", list every branch the
change adds or alters: a condition, an early return, an error path, a
fallback, each value in a set or switch that the code treats differently,
and each rule its doc comment states. For each one, find the test in your
group whose assertion fails if that branch is deleted or inverted.

- No such test is a `coverage-gap` finding, at least Major, on the test
  file that should hold it (or on the source file when no test file in
  your group fits). Name the branch at its source file:line and the
  change that would leave every test green.
- A branch the change did not touch is not a gap. A source marked "Not
  changed by this review" has gaps only in what the tests in your group
  newly claim to cover.
- Do not review the source itself: its naming, comments and structure
  belong to the source reviewer.

Source changed by the review with no test file in your group is the
consistency reviewer's check. A brief with no "Source under test"
section, such as an E2E brief, skips this step.

### Acceptance criteria

For each acceptance criterion in the ticket, find the tests in your group
whose **assertions** prove it. A title alone is not evidence. Write what
you found to `<review workarea>/ac/<group id>.json`, in the same response
as your findings:

```json
[
  {"criterion": "AC1: the criterion as the ticket states it",
   "evidence": [{"file": "<path>", "line": 42, "test": "<test title>"}]},
  {"criterion": "AC2: …", "evidence": []}
]
```

List every criterion, including those with no evidence in your group. The
parent puts all groups together to decide which criteria no test proves,
because another group or repo may hold that test.

### Checks on every test

- **Title against assertions:** read the title, then the assertions. The
  title states what the assertions prove, no more. A title that claims
  more is a `test-readability` finding.
- **Cannot fail:** would an implementation that breaks the criterion still
  pass? An assertion on a value the set-up itself wrote, an absence check
  where an exact positive assertion is possible, and mocking the thing
  under test are `test-readability` findings.
- **Absorbed behaviour change:** an expected value changed while its
  set-up did not. That is a behaviour change made silently: a Critical
  `correctness` finding unless the ticket asks for that change.
- **Set-up copied between tests:** set-up used by two tests belongs in the
  shared test helper. A `duplication` finding.
- **Behaviour, not implementation:** assert inputs and outputs. Mock only
  what the code does not own (network, database, filesystem, clock).
- No ticket keys, acceptance-criteria ids or history in test titles.

## Java test specifics

- Unit tests (`*Test`) and integration tests (`*IT`) follow the guides in
  this brief: integration tests extend the shared IT base classes and use
  Testcontainers, not a hand-built context.
- AssertJ assertions on the exact value, not `isNotNull()` where the value
  is known.
- A `@DisplayName` or method name is the title: it states what the
  assertions prove.
- Test support classes (`testsupport/`) are reviewed as shared helpers: a
  copy of their body in a test is a `duplication` finding.

## Your group

- Review id: EUDPA-674
- Group: trade-imports-address-book--java-tests--2
- Repo: trade-imports-address-book
- PR: 22
- Commit reviewed: 491f0276ddc5772d9171a926337fbab7a1f771b3
- Repo checkout: /Users/aminav/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-674/repos/trade-imports-address-book
- Files:
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/ExternalCallRecorderIT.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/IntegrationBase.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/MongoAvailabilityIT.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoderTest.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/CapturingEmfEnvironment.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetricsTest.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistryTest.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorderTest.java`

## Ticket

# EUDPA-674: Add custom metrics, alerts, Grafana dashboards and logging to the remaining INS services

## Metadata
- **Type:** Task
- **Status:** In Dev
- **Priority:** Medium
- **Labels:** 
- **Parent:** EUDPA-144
- **Assignee:** Hamid Jemei

## Description

<p><b>We need to</b> add custom metrics, custom Grafana dashboards, custom alerts and dependency logging to the 9 remaining INS services, using the observability skill from 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
.<br/>
<b>So that</b> we can see how every service behaves in prod and trust our deploys before the final release.</p>

<p><b>Background</b><br/>

    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 was a spike on <tt>trade-imports-reference-data</tt>. It worked out which custom metrics we need, how to log dependency call times, and how to build, promote and test dashboards and alerts on CDP. It also produced a workspace skill that walks through these steps.</p>

<p>This ticket uses that skill on the other services. Most of the metrics should already be agreed from 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
, for example the common metrics for outbound HTTP calls. Each service will only need extra metrics for behaviour reference-data does not have. For example, <tt>trade-imports-dynamics-gateway</tt> reads events from SQS and sends them to the PIMS Azure Service Bus over AMQP over WebSockets. A failed send never reaches a user's HTTP request, so it needs its own metrics:</p>
<ul>
	<li>Service Bus sends that succeed, are retried or fail</li>
	<li>how long each Service Bus send takes</li>
	<li>SQS messages that are retried or sent to the dead-letter queue</li>
</ul>


<p><b>Scope</b></p>
<ul>
	<li><tt>trade-imports-animals-frontend</tt></li>
	<li><tt>trade-imports-animals-backend</tt></li>
	<li><tt>trade-imports-animals-admin</tt></li>
	<li><tt>trade-imports-dynamics-gateway</tt></li>
	<li><tt>trade-imports-address-book</tt></li>
	<li><tt>trade-imports-ins-frontend</tt></li>
	<li><tt>trade-imports-ins-backend</tt></li>
	<li><tt>trade-imports-plants-frontend</tt></li>
	<li><tt>trade-imports-plants-backend</tt></li>
</ul>


<p>Out of scope: <tt>trade-imports-reference-data</tt> (done in 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
), <tt>trade-imports-stub</tt> and <tt>trade-imports-defra-id-stub</tt>.</p>

<p><ins><b>Acceptance Criteria</b></ins></p>

<p><em>For each service in scope:</em></p>

<p><em>Working out what to measure</em></p>
<ul>
	<li>The service uses the common metrics agreed in 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
, for example call counts, errors and times for outbound HTTP calls.</li>
	<li>We have listed the service's dependencies and agreed any extra metrics it needs beyond the common set, and why. For example, the Service Bus and SQS metrics for <tt>trade-imports-dynamics-gateway</tt> listed above. The extra metrics are recorded on this ticket.</li>
	<li>We have checked in Grafana that the service has the CDP default dashboard and default alerts.</li>
</ul>


<p><em>Metrics, logging and dashboard</em></p>
<ul>
	<li>The service publishes the common and extra metrics.</li>
	<li>The service records whether each of its dependencies is available as a metric.</li>
	<li>For each call to an external dependency, the service logs how long the call took, with the dependency name, outcome and trace.id, so we can search call times in OpenSearch.</li>
	<li>The service has a custom Grafana dashboard showing its metrics, dependency status and, where it helps, dependency call times.</li>
	<li>The service's /health endpoint is not changed.</li>
</ul>


<p><em>Alerts</em></p>
<ul>
	<li>The service has custom alerts, including one that fires when a dependency is unavailable. They are built in the dev playground and promoted to test and prod through #cdp-support.</li>
	<li>Default and custom alerts reach the INS dev team in the Slack channels agreed in 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
.</li>
	<li>We have tested in dev and test that each custom alert fires and reaches the team.</li>
</ul>


<p><em>Across all services:</em></p>
<ul>
	<li>We can follow a request across services in OpenSearch using its trace.id, from the frontend through to the backends and the dynamics gateway.</li>
	<li>Anything the skill got wrong or missed is fixed in the skill as we go, so it stays ready for new services.</li>
</ul>


<div class="panel" style="background-color: #eae6ff;border-width: 1px;"><div class="panelContent" style="background-color: #eae6ff;">
<p><b>Tech notes</b></p>
<ul>
	<li>Use the observability skill from 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 for each service.</li>
	<li>Do not start until 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-632" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-632" class="jira-issue-macro-key issue-link"  title="Spike: add custom metrics, alerts, Grafana dashboard and logging for trade-imports-reference-data" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-632
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 is done.</li>
	<li>We can split this into one PR per service repo. Branch names follow the cross-repo rule: the same branch name in every repo.</li>
	<li>Services deployed to prod early (
    <span class="jira-issue-macro" data-jira-key="EUDPA-633" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-633" class="jira-issue-macro-key issue-link"  title="Work out which microservices can safely deploy to prod, then deploy them" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-633
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-complete jira-macro-single-issue-export-pdf">To Do</span>
            </span>
) can check their alerts and dashboard against real traffic.</li>
	<li>Try to play this before 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-673" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-673" class="jira-issue-macro-key issue-link"  title="Deploy microservices to the CDP perf-test environment for the first time" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-673
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 (first deploy to the CDP perf-test environment). It is not blocked by this ticket, but having the dashboards, metrics and dependency call times in place makes the perf-test results much easier to read.</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References



## House rules

---
paths:
  - 'src/**'
  - 'test/**'
  - 'tests/**'
  - '**/*.js'
  - '**/*.mjs'
  - '**/*.cjs'
  - '**/*.ts'
  - '**/*.java'
  - '**/*.njk'
---

# Code quality: the house rules

These rules apply to every source file, test and template in every language, whoever writes it. The language rules (`node.md`, `java.md`, `playwright.md`, `gds.md`, `k6.md`) add to them. Where a guide under `docs/best-practices/` says otherwise, these rules win.

Review treats a breach as a defect to fix in the same change. "Taste", "pre-existing", "out of scope" and "a nearby file does it" are not reasons to keep one.

<!-- house-rules:start -->
**Comments**

- Write code that needs no comment. If a name or an extracted function can say it, rename or extract instead.
- A comment describes only the lines directly below it. Never describe callers, other modules, the backend, a library, the UI or a test. No counts: "the one row", "the only caller".
- Rationale goes in the repo's `docs/` or the behaviour spec, never in code.
- A comment that explains a name means the name is wrong. Rename, then delete the comment in the same change.
- When a comment is stale, delete it. Do not reword it.
- A marker that a test or tool reads is not a comment to delete.
- Doc comments (JSDoc, Javadoc) only state the contract of an exported public API. None on internal helpers.
- Bad: `// Hapi validates the full payload before route handlers run, so the token is guaranteed present.` Good: no comment. The route's `validate.payload` schema already says it.

**Ids and history**

- No ticket keys (`EUDPA-565`), backlog, ruling or acceptance-criteria ids (`c-201`, `inc-010`), release names ("Design Release 2.1") or session words ("the real service") in code, comments or test titles.
- No history. No before/after narration, no "renamed from", no `REMOVED_*` constants, no names like `…WhenTheDocumentWasWrittenBeforeTheChange`. Code states how things are now; git holds how they were.
- Prove a removal with an exact positive assertion. Bad: `expect(page.getByText(REMOVED_INTERNAL_REFERENCE_LIMIT)).toHaveCount(0)`. Good: `expect(field).toHaveAccessibleDescription(copy.internalReference.hint)`.

**Names**

- A name predicts what the code returns and what it changes. Read the body, then check the name told you both.
- A name's value word covers every value the code can return. Bad: `countryNameOf(countries, code)`, which can return a code. Good: `countryLabelOf`, the label shown: the name, else the code.
- Nothing (null or undefined) and an expected error, such as not found, are not part of a name. No suffix names them or a fallback: not `…OrNull`, `…OrUndefined`, `…OrNotFound` or `…OrAddressBook`. Bad: `addressFieldTextOrNull`, `liveAddressOrNotFound`. Good: `addressFieldText`, `loadLiveAddress`.
- Rename only when the name mispredicts. A name whose value word covers what the code returns, and that says what it changes, stays, even when another name would read better.
- Name a parameter or local for what it holds at that point. Bad: `id` and `returnTo` for an address id and a return that has passed its checks. Good: `addressId` and `honouredReturn`.
- Bad: `// c-201: an amendment opens with no errors; Continue refused shows them.` above `const holdsSilently = readOnly || (isAmend && !refused)`. Good: no comment, and a name that says the page hides answer errors for submitted, template and unrefused amend states.
- Bad: `linesDroppedBy(lines, type)` returning `{ kept, removed }`. Good: `keepLinesAllowedBy(lines, type)`.
- Bad: `report()` that also clears expired faults. Good: clear them where a name says so, and let `report()` only read.
- No metaphors. Bad: `lightenRemote()`. Good: `excludeGhPagesFromFetch()`.
- No positional boolean flags. Bad: `saveActions(true, false)`. Good: `saveActions({ readOnly: true })`.
- One concept, one name, from request header to repository and across twin repos. Bad: `User-Id`, `userId`, `ownerId` and "actor id" for one person.
- A rename covers the concept's whole vocabulary: keys, variables, copy keys, test titles. Search for the concept word, not only the old identifier.

**Structure**

- One rule, one owner: each display or business rule lives in one function, mirrored in each twin repo. Bad: three formatters for one port label.
- Extend the mechanism that exists. Do not add a second one beside it. When a new class or path mirrors one you are editing, extract the shared part in the same change.
- A pipeline whose callbacks branch or take several steps gets named helpers, so the top function reads as a few named steps.
- Build only what this change makes reachable.
- A literal value used by one function lives in that function. Module scope is for values the module shares, and for module set-up such as a logger, a template path or a value a test imports.
- A scope you are given limits which files you open, never which lines of an opened file you fix. Every file you touch meets these rules in full.

**Design**

- Build copy, layout and components as the design source sets them: the prototype, a design release or a ticket's acceptance criteria. Code that differs from its design source is a correctness finding.
- A review raises a `design` finding, the question for the designer and never a code fix, when a guide such as the GDS style guide disagrees with what the design source sets, when the design source sets two different things for one element (two labels for one field on two pages), or when the code had to choose copy, layout or a component for a case the design source does not show.
- Read the design source before you raise or judge a `design` finding. A backlog row's `sources` name it and the workarea's `sources.json` gives its location and the commit to read it at. "I could not confirm what the design source sets" never raises one and never refutes one: read it.
- A `design` finding carries everything the designer decides from: the design source quoted at file:line, as a permalink at the commit read when it is a public repo; the code quoted at file:line; the guide's rule with a link, when a guide disagrees; and the question with the options it leaves, such as "keep 'X', or change to 'Y'?".
- Bad: "The edit label may differ from the prototype. I could not confirm which label it sets." Good: "The prototype labels the name field 'Name or organisation' on the add page (`consignment-manual-address-fields.html:9`) and 'Name or organisation name' on the edit page (`address-book-manual-address-fields.html:9`), and the code copies both (`copy.en.js:54`, `:36`). For the designer: should both pages use one label, and which?"

**Tests**

- Set-up used by two tests goes in the shared test helper. Promoting a helper deletes the local copies.
- A test title states what its assertions prove. Bad: titled "flips status to submitted" while asserting `SUBMITTED_ACTION_REQUIRED`.
- A test must fail without the change it covers.
- Test behaviour through inputs and outputs. Mock only at the boundary the code does not own: the network, the database, the filesystem, the clock. Never mock your own modules. No spy assertions (`toHaveBeenCalledWith`) unless the call is itself the external side effect.
- Fix a flaky assertion. Never delete or loosen it, and never add a test only to raise coverage.

**Logging and errors**

- Every branch that changes an outcome (refusal, redirect, retry, fallback, state switch) logs once, with the ids support searches by. A user's own input error shown back on the form is not one: do not log it. Another service refusing what this one accepted is: log it at warn.
- Log the throwable (Java) or `{ err }` (pino), never only its message. Bad: `log.warn("Retryable error, message left for retry: {}", classified.getMessage())`. Good: `log.warn("Retryable error, message {} left for retry", messageId, classified)`.
- No request or response bodies at INFO.
- No empty catch. `.catch(() => undefined)` hides the failure it swallows.
<!-- house-rules:end -->

## Where the detail lives

- Names, nesting and comments in Node: `~/git/defra/trade-imports-workspace/docs/best-practices/node/code-style.md` §6, §10 and §15.
- Names and comments in Java: `~/git/defra/trade-imports-workspace/docs/best-practices/java/modern-java.md` §18.
- Doc comments: `~/git/defra/trade-imports-workspace/docs/best-practices/doc-comments/BEST_PRACTICES.md`, then `~/git/defra/trade-imports-workspace/docs/best-practices/doc-comments/jsdoc.md` or `~/git/defra/trade-imports-workspace/docs/best-practices/doc-comments/javadoc.md`.
- Logging: `~/git/defra/trade-imports-workspace/docs/best-practices/node/pino-logging.md` §4a and `~/git/defra/trade-imports-workspace/docs/best-practices/java/spring-boot.md` §15.
- Node tests and test support: `~/git/defra/trade-imports-workspace/docs/best-practices/node/testing/frontend.md`.
- Java tests: `~/git/defra/trade-imports-workspace/docs/best-practices/java/testing/unit.md`.
- Playwright specs, seeding and test data: `~/git/defra/trade-imports-workspace/docs/best-practices/playwright/BEST_PRACTICES.md`.
- Templates and front-end behaviour: `~/git/defra/trade-imports-workspace/docs/best-practices/gds/components.md` "Stay in the GOV.UK toolbox", including its one exception for a plants-prototype design release.

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/ExternalCallRecorderIT.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/ExternalCallRecorderIT.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/ExternalCallRecorderIT.java
new file mode 100644
index 0000000..5e2e475
--- /dev/null
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/ExternalCallRecorderIT.java
@@ -0,0 +1,112 @@
+package uk.gov.defra.trade.imports.addressbook.integration;
+
+import static org.assertj.core.api.Assertions.assertThat;
+import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedConsole.captureSystemOut;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.ExternalCallMeters.durationCount;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.ExternalCallMeters.failureTotal;
+
+import com.fasterxml.jackson.databind.JsonNode;
+import com.fasterxml.jackson.databind.ObjectMapper;
+import io.micrometer.core.instrument.MeterRegistry;
+import org.bson.Document;
+import org.bson.types.ObjectId;
+import org.junit.jupiter.api.Test;
+import org.springframework.beans.factory.annotation.Autowired;
+import org.springframework.dao.DataAccessException;
+import org.springframework.dao.DuplicateKeyException;
+import org.springframework.data.mongodb.core.MongoTemplate;
+import uk.gov.defra.trade.imports.addressbook.testsupport.CapturedConsole;
+
+class ExternalCallRecorderIT extends IntegrationBase {
+
+  private static final ObjectMapper JSON = new ObjectMapper();
+
+  @Autowired private MeterRegistry meterRegistry;
+  @Autowired private MongoTemplate mongoTemplate;
+
+  @Test
+  void aCreateRecordsAMongodbInsert() throws Exception {
+    long before = durationCount(meterRegistry, "mongodb", "insert");
+
+    createdAddressId(postAddress(addressBody()));
+
+    assertThat(durationCount(meterRegistry, "mongodb", "insert")).isEqualTo(before + 1);
+  }
+
+  @Test
+  void aFailedCommandIsRecordedAsAFailureOfItsOperation() {
+    double before = failureTotal(meterRegistry, "mongodb", "find");
+
+    assertThatExceptionOfType(DataAccessException.class)
+        .isThrownBy(
+            () ->
+                mongoTemplate.executeCommand(
+                    "{find: 'address', filter: {$notAnOperator: 1}}"));
+
+    assertThat(failureTotal(meterRegistry, "mongodb", "find")).isEqualTo(before + 1);
+  }
+
+  @Test
+  void aDuplicateKeyInsertIsRecordedAsAFailureOfInsert() {
+    Document address = new Document("_id", new ObjectId());
+    mongoTemplate.insert(address, "address");
+    double before = failureTotal(meterRegistry, "mongodb", "insert");
+
+    assertThatExceptionOfType(DuplicateKeyException.class)
+        .isThrownBy(() -> mongoTemplate.insert(address, "address"));
+
+    assertThat(failureTotal(meterRegistry, "mongodb", "insert")).isEqualTo(before + 1);
+  }
+
+  @Test
+  void theConsoleWritesTheCallLineWithTheTraceIdAndANestedEventObject() throws Exception {
+    CapturedConsole console = captureSystemOut();
+    try (console) {
+      mockMvc.perform(
+          postAddressRequest(addressBody().json())
+              .header("x-cdp-request-id", "trace-from-the-caller"));
+    }
+
+    JsonNode insert = consoleLineWithAction("mongodb/insert", console);
+
+    assertThat(insert.path("trace.id").asText()).isEqualTo("trace-from-the-caller");
+    assertThat(insert.path("event").path("category").asText()).isEqualTo("external-call");
+    assertThat(insert.path("event").path("outcome").asText()).isEqualTo("success");
+    assertThat(insert.path("event").path("duration").isIntegralNumber()).isTrue();
+  }
+
+  @Test
+  void theConsoleWritesAFailedCallLineWithTheErrorTypeAndMessageButNoStackTrace()
+      throws Exception {
+    CapturedConsole console = captureSystemOut();
+    try (console) {
+      assertThatExceptionOfType(DataAccessException.class)
+          .isThrownBy(
+              () ->
+                  mongoTemplate.executeCommand(
+                      "{find: 'address', filter: {$notAnOperator: 1}}"));
+    }
+
+    JsonNode failedFind = consoleLineWithAction("mongodb/find", console);
+
+    assertThat(failedFind.path("event").path("outcome").asText()).isEqualTo("failure");
+    assertThat(failedFind.path("error.type").asText())
+        .isEqualTo("com.mongodb.MongoCommandException");
+    assertThat(failedFind.path("error.message").asText()).contains("$notAnOperator");
+    assertThat(failedFind.has("error.stack_trace")).isFalse();
+  }
+
+  private static JsonNode consoleLineWithAction(String action, CapturedConsole console)
+      throws Exception {
+    for (String line : console.text().split("\n")) {
+      if (line.trim().startsWith("{")) {
+        JsonNode json = JSON.readTree(line);
+        if (action.equals(json.path("event").path("action").asText())) {
+          return json;
+        }
+      }
+    }
+    throw new AssertionError("No console line has event.action " + action);
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.integration;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
    5  import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedConsole.captureSystemOut;
    6  import static uk.gov.defra.trade.imports.addressbook.testsupport.ExternalCallMeters.durationCount;
    7  import static uk.gov.defra.trade.imports.addressbook.testsupport.ExternalCallMeters.failureTotal;
    8  
    9  import com.fasterxml.jackson.databind.JsonNode;
   10  import com.fasterxml.jackson.databind.ObjectMapper;
   11  import io.micrometer.core.instrument.MeterRegistry;
   12  import org.bson.Document;
   13  import org.bson.types.ObjectId;
   14  import org.junit.jupiter.api.Test;
   15  import org.springframework.beans.factory.annotation.Autowired;
   16  import org.springframework.dao.DataAccessException;
   17  import org.springframework.dao.DuplicateKeyException;
   18  import org.springframework.data.mongodb.core.MongoTemplate;
   19  import uk.gov.defra.trade.imports.addressbook.testsupport.CapturedConsole;
   20  
   21  class ExternalCallRecorderIT extends IntegrationBase {
   22  
   23    private static final ObjectMapper JSON = new ObjectMapper();
   24  
   25    @Autowired private MeterRegistry meterRegistry;
   26    @Autowired private MongoTemplate mongoTemplate;
   27  
   28    @Test
   29    void aCreateRecordsAMongodbInsert() throws Exception {
   30      long before = durationCount(meterRegistry, "mongodb", "insert");
   31  
   32      createdAddressId(postAddress(addressBody()));
   33  
   34      assertThat(durationCount(meterRegistry, "mongodb", "insert")).isEqualTo(before + 1);
   35    }
   36  
   37    @Test
   38    void aFailedCommandIsRecordedAsAFailureOfItsOperation() {
   39      double before = failureTotal(meterRegistry, "mongodb", "find");
   40  
   41      assertThatExceptionOfType(DataAccessException.class)
   42          .isThrownBy(
   43              () ->
   44                  mongoTemplate.executeCommand(
   45                      "{find: 'address', filter: {$notAnOperator: 1}}"));
   46  
   47      assertThat(failureTotal(meterRegistry, "mongodb", "find")).isEqualTo(before + 1);
   48    }
   49  
   50    @Test
   51    void aDuplicateKeyInsertIsRecordedAsAFailureOfInsert() {
   52      Document address = new Document("_id", new ObjectId());
   53      mongoTemplate.insert(address, "address");
   54      double before = failureTotal(meterRegistry, "mongodb", "insert");
   55  
   56      assertThatExceptionOfType(DuplicateKeyException.class)
   57          .isThrownBy(() -> mongoTemplate.insert(address, "address"));
   58  
   59      assertThat(failureTotal(meterRegistry, "mongodb", "insert")).isEqualTo(before + 1);
   60    }
   61  
   62    @Test
   63    void theConsoleWritesTheCallLineWithTheTraceIdAndANestedEventObject() throws Exception {
   64      CapturedConsole console = captureSystemOut();
   65      try (console) {
   66        mockMvc.perform(
   67            postAddressRequest(addressBody().json())
   68                .header("x-cdp-request-id", "trace-from-the-caller"));
   69      }
   70  
   71      JsonNode insert = consoleLineWithAction("mongodb/insert", console);
   72  
   73      assertThat(insert.path("trace.id").asText()).isEqualTo("trace-from-the-caller");
   74      assertThat(insert.path("event").path("category").asText()).isEqualTo("external-call");
   75      assertThat(insert.path("event").path("outcome").asText()).isEqualTo("success");
   76      assertThat(insert.path("event").path("duration").isIntegralNumber()).isTrue();
   77    }
   78  
   79    @Test
   80    void theConsoleWritesAFailedCallLineWithTheErrorTypeAndMessageButNoStackTrace()
   81        throws Exception {
   82      CapturedConsole console = captureSystemOut();
   83      try (console) {
   84        assertThatExceptionOfType(DataAccessException.class)
   85            .isThrownBy(
   86                () ->
   87                    mongoTemplate.executeCommand(
   88                        "{find: 'address', filter: {$notAnOperator: 1}}"));
   89      }
   90  
   91      JsonNode failedFind = consoleLineWithAction("mongodb/find", console);
   92  
   93      assertThat(failedFind.path("event").path("outcome").asText()).isEqualTo("failure");
   94      assertThat(failedFind.path("error.type").asText())
   95          .isEqualTo("com.mongodb.MongoCommandException");
   96      assertThat(failedFind.path("error.message").asText()).contains("$notAnOperator");
   97      assertThat(failedFind.has("error.stack_trace")).isFalse();
   98    }
   99  
  100    private static JsonNode consoleLineWithAction(String action, CapturedConsole console)
  101        throws Exception {
  102      for (String line : console.text().split("\n")) {
  103        if (line.trim().startsWith("{")) {
  104          JsonNode json = JSON.readTree(line);
  105          if (action.equals(json.path("event").path("action").asText())) {
  106            return json;
  107          }
  108        }
  109      }
  110      throw new AssertionError("No console line has event.action " + action);
  111    }
  112  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/IntegrationBase.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/IntegrationBase.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/IntegrationBase.java
index ce54035..c834442 100644
--- a/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/IntegrationBase.java
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/IntegrationBase.java
@@ -73,13 +73,18 @@ abstract class IntegrationBase {
   protected static final String PHONE = AddressTestSupport.SAMPLE_PHONE;
   protected static final String EMAIL = AddressTestSupport.SAMPLE_EMAIL;
 
-  static MongoDBContainer MONGO_CONTAINER = new MongoDBContainer(
-      DockerImageName.parse("mongo:7.0")).withExposedPorts(27017).withReplicaSet();
+  static MongoDBContainer MONGO_CONTAINER = newMongoContainer();
 
   static {
     Startables.deepStart(MONGO_CONTAINER).join();
   }
 
+  protected static MongoDBContainer newMongoContainer() {
+    return new MongoDBContainer(DockerImageName.parse("mongo:7.0"))
+        .withExposedPorts(27017)
+        .withReplicaSet();
+  }
+
   @LocalServerPort
   int port;
 
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.integration;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.request;
    5  import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
    6  import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
    7  import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
    8  import static uk.gov.defra.trade.imports.addressbook.address.AddressTestSupport.NO_LIST_CRITERIA;
    9  
   10  import com.fasterxml.jackson.core.JsonProcessingException;
   11  import com.fasterxml.jackson.databind.JsonNode;
   12  import com.fasterxml.jackson.databind.ObjectMapper;
   13  import java.io.UncheckedIOException;
   14  import java.util.HashSet;
   15  import java.util.LinkedHashMap;
   16  import java.util.List;
   17  import java.util.Map;
   18  import java.util.Set;
   19  import org.bson.Document;
   20  import org.junit.jupiter.api.BeforeEach;
   21  import org.springframework.beans.factory.annotation.Autowired;
   22  import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
   23  import org.springframework.boot.test.context.SpringBootTest;
   24  import org.springframework.boot.test.web.server.LocalServerPort;
   25  import org.springframework.data.domain.PageRequest;
   26  import org.springframework.data.mongodb.core.MongoTemplate;
   27  import org.springframework.data.mongodb.core.query.Query;
   28  import org.springframework.http.HttpMethod;
   29  import org.springframework.http.MediaType;
   30  import org.springframework.lang.Nullable;
   31  import org.springframework.test.context.ActiveProfiles;
   32  import org.springframework.test.context.DynamicPropertyRegistry;
   33  import org.springframework.test.context.DynamicPropertySource;
   34  import org.springframework.test.web.servlet.MockMvc;
   35  import org.springframework.test.web.servlet.ResultActions;
   36  import org.springframework.test.web.servlet.ResultMatcher;
   37  import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
   38  import org.testcontainers.lifecycle.Startables;
   39  import org.testcontainers.mongodb.MongoDBContainer;
   40  import org.testcontainers.utility.DockerImageName;
   41  import uk.gov.defra.trade.imports.addressbook.Application;
   42  import uk.gov.defra.trade.imports.addressbook.address.Address;
   43  import uk.gov.defra.trade.imports.addressbook.address.AddressRole;
   44  import uk.gov.defra.trade.imports.addressbook.address.AddressStatus;
   45  import uk.gov.defra.trade.imports.addressbook.address.AddressRepository;
   46  import uk.gov.defra.trade.imports.addressbook.address.AddressTestSupport;
   47  
   48  @SpringBootTest(
   49      classes = Application.class,
   50      webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
   51  @AutoConfigureMockMvc
   52  @ActiveProfiles("integration-test")
   53  abstract class IntegrationBase {
   54  
   55    protected static final String ORG_HEADER = "Trade-Imports-Organisation-Id";
   56    protected static final String ORGANISATION_ID = "5a8d2b19-6f4e-4d21-9c1b-7e3f0a2d5c88";
   57    protected static final String OTHER_ORG = "9c1b7e3f-0a2d-5c88-5a8d-2b196f4e4d21";
   58    protected static final String UNKNOWN_ID = "665f1c2ab3e4d51a2c9d0e77";
   59  
   60    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
   61  
   62    private static final String ADDRESSES_PATH = "/organisation/{orgId}/addresses";
   63    private static final String ADDRESS_PATH = ADDRESSES_PATH + "/{address-id}";
   64  
   65    protected static final String VALIDATION_ERROR_TYPE =
   66        "https://api.cdp.defra.cloud/problems/validation-error";
   67  
   68    protected static final String NAME = AddressTestSupport.SAMPLE_NAME;
   69    protected static final String ADDRESS_LINE_1 = AddressTestSupport.SAMPLE_ADDRESS_LINE_1;
   70    protected static final String TOWN_OR_CITY = AddressTestSupport.SAMPLE_TOWN_OR_CITY;
   71    protected static final String POSTCODE = AddressTestSupport.SAMPLE_POSTCODE;
   72    protected static final String COUNTRY_CODE = AddressTestSupport.SAMPLE_COUNTRY_CODE;
   73    protected static final String PHONE = AddressTestSupport.SAMPLE_PHONE;
   74    protected static final String EMAIL = AddressTestSupport.SAMPLE_EMAIL;
   75  
   76    static MongoDBContainer MONGO_CONTAINER = newMongoContainer();
   77  
   78    static {
   79      Startables.deepStart(MONGO_CONTAINER).join();
   80    }
   81  
   82    protected static MongoDBContainer newMongoContainer() {
   83      return new MongoDBContainer(DockerImageName.parse("mongo:7.0"))
   84          .withExposedPorts(27017)
   85          .withReplicaSet();
   86    }
   87  
   88    @LocalServerPort
   89    int port;
   90  
   91    @Autowired
   92    protected MockMvc mockMvc;
   93  
   94    @Autowired
   95    private MongoTemplate mongoTemplate;
   96  
   97    @Autowired
   98    protected AddressRepository addressRepository;
   99  
  100    @DynamicPropertySource
  101    static void setProperties(DynamicPropertyRegistry registry) {
  102      registry.add("spring.data.mongodb.uri", MONGO_CONTAINER::getReplicaSetUrl);
  103      registry.add("spring.data.mongodb.ssl.enabled", () -> "false");
  104    }
  105  
  106    @BeforeEach
  107    void cleanDatabase() {
  108      mongoTemplate
  109          .getDb()
  110          .listCollectionNames()
  111          .forEach(name -> mongoTemplate.getCollection(name).deleteMany(new Document()));
  112    }
  113  
  114    protected static Address.AddressBuilder addressBuilder(
  115        String organisationId, AddressStatus status) {
  116      return Address.builder()
  117          .name(NAME)
  118          .addressLine1(ADDRESS_LINE_1)
  119          .townOrCity(TOWN_OR_CITY)
  120          .postcode(POSTCODE)
  121          .countryCode(COUNTRY_CODE)
  122          .phone(PHONE)
  123          .email(EMAIL)
  124          .organisationId(organisationId)
  125          .status(status);
  126    }
  127  
  128    protected static Address.AddressBuilder addressHolding(
  129        String organisationId, AddressRole... roles) {
  130      return addressBuilder(organisationId, AddressStatus.ACTIVE).roles(List.of(roles));
  131    }
  132  
  133    protected static AddressBody addressBody() {
  134      return new AddressBody();
  135    }
  136  
  137    protected Address saveAddress(Address.AddressBuilder address) {
  138      return addressRepository.save(address.build());
  139    }
  140  
  141    protected long storedAddressCount() {
  142      return mongoTemplate.count(new Query(), Address.class);
  143    }
  144  
  145    protected List<Address> activeAddressesFor(String organisationId) {
  146      return addressRepository
  147          .listLiveAddresses(organisationId, NO_LIST_CRITERIA, PageRequest.of(0, 100))
  148          .getContent();
  149    }
  150  
  151    protected static MockHttpServletRequestBuilder postAddressRequest(String json) {
  152      return withJson(
  153          addressesRequest(HttpMethod.POST, ORGANISATION_ID, ADDRESSES_PATH, ORGANISATION_ID), json);
  154    }
  155  
  156    protected ResultActions postAddress(AddressBody body) throws Exception {
  157      return postAddress(body.json());
  158    }
  159  
  160    protected ResultActions postAddress(String json) throws Exception {
  161      return mockMvc.perform(postAddressRequest(json));
  162    }
  163  
  164    protected ResultActions postAddressAs(String orgId, String callerOrganisationId, AddressBody body)
  165        throws Exception {
  166      return mockMvc.perform(
  167          withJson(
  168              addressesRequest(HttpMethod.POST, callerOrganisationId, ADDRESSES_PATH, orgId),
  169              body.json()));
  170    }
  171  
  172    protected ResultActions putAddress(String addressId, AddressBody body) throws Exception {
  173      return putAddress(addressId, body.json());
  174    }
  175  
  176    protected ResultActions putAddress(String addressId, String json) throws Exception {
  177      return putAddressAs(ORGANISATION_ID, ORGANISATION_ID, addressId, json);
  178    }
  179  
  180    protected ResultActions putAddressAs(
  181        String orgId, String callerOrganisationId, String addressId, AddressBody body)
  182        throws Exception {
  183      return putAddressAs(orgId, callerOrganisationId, addressId, body.json());
  184    }
  185  
  186    private ResultActions putAddressAs(
  187        String orgId, String callerOrganisationId, String addressId, String json) throws Exception {
  188      return mockMvc.perform(
  189          withJson(
  190              addressesRequest(HttpMethod.PUT, callerOrganisationId, ADDRESS_PATH, orgId, addressId),
  191              json));
  192    }
  193  
  194    protected ResultActions listAddresses(String... queryParameterNamesAndValues) throws Exception {
  195      MockHttpServletRequestBuilder request =
  196          addressesRequest(HttpMethod.GET, ORGANISATION_ID, ADDRESSES_PATH, ORGANISATION_ID);
  197      for (int i = 0; i < queryParameterNamesAndValues.length; i += 2) {
  198        request = request.param(queryParameterNamesAndValues[i], queryParameterNamesAndValues[i + 1]);
  199      }
  200      return mockMvc.perform(request);
  201    }
  202  
  203    protected ResultActions listAddressesAs(String orgId, String callerOrganisationId)
  204        throws Exception {
  205      return mockMvc.perform(
  206          addressesRequest(HttpMethod.GET, callerOrganisationId, ADDRESSES_PATH, orgId));
  207    }
  208  
  209    protected static Set<String> readIds(String body) throws Exception {
  210      Set<String> ids = new HashSet<>();
  211      JsonNode items = OBJECT_MAPPER.readTree(body).get("items");
  212      items.forEach(item -> ids.add(item.get("id").asText()));
  213      return ids;
  214    }
  215  
  216    protected static MockHttpServletRequestBuilder getAddressRequest(String addressId) {
  217      return addressesRequest(
  218          HttpMethod.GET, ORGANISATION_ID, ADDRESS_PATH, ORGANISATION_ID, addressId);
  219    }
  220  
  221    protected ResultActions getAddress(String addressId) throws Exception {
  222      return mockMvc.perform(getAddressRequest(addressId));
  223    }
  224  
  225    protected ResultActions getAddressAs(String orgId, String callerOrganisationId, String addressId)
  226        throws Exception {
  227      return mockMvc.perform(
  228          addressesRequest(HttpMethod.GET, callerOrganisationId, ADDRESS_PATH, orgId, addressId));
  229    }
  230  
  231    protected ResultActions deleteAddress(String addressId) throws Exception {
  232      return deleteAddressAs(ORGANISATION_ID, ORGANISATION_ID, addressId);
  233    }
  234  
  235    protected ResultActions deleteAddressAs(
  236        String orgId, String callerOrganisationId, String addressId) throws Exception {
  237      return mockMvc.perform(
  238          addressesRequest(
  239              HttpMethod.DELETE, callerOrganisationId, ADDRESS_PATH, orgId, addressId));
  240    }
  241  
  242    private static MockHttpServletRequestBuilder addressesRequest(
  243        HttpMethod method,
  244        @Nullable String callerOrganisationId,
  245        String path,
  246        Object... pathVariables) {
  247      MockHttpServletRequestBuilder request = request(method, path, pathVariables);
  248      return callerOrganisationId == null
  249          ? request
  250          : request.header(ORG_HEADER, callerOrganisationId);
  251    }
  252  
  253    private static MockHttpServletRequestBuilder withJson(
  254        MockHttpServletRequestBuilder request, String json) {
  255      return request.contentType(MediaType.APPLICATION_JSON).content(json);
  256    }
  257  
  258    protected String createdAddressId(ResultActions created) throws Exception {
  259      String location =
  260          created.andExpect(status().isCreated()).andReturn().getResponse().getHeader("Location");
  261      assertThat(location).isNotNull();
  262      return location.substring(location.lastIndexOf('/') + 1);
  263    }
  264  
  265    protected static ResultMatcher badRequestProblemWithNoErrors() {
  266      return ResultMatcher.matchAll(
  267          status().isBadRequest(),
  268          header().string("Content-Type", MediaType.APPLICATION_PROBLEM_JSON_VALUE),
  269          jsonPath("$.type").value("https://api.cdp.defra.cloud/problems/bad-request"),
  270          jsonPath("$.title").value("Bad Request"),
  271          jsonPath("$.status").value(400),
  272          jsonPath("$.errors").doesNotExist());
  273    }
  274  
  275    protected static final class AddressBody {
  276  
  277      private final Map<String, Object> fields = new LinkedHashMap<>();
  278  
  279      private AddressBody() {
  280        fields.put("name", NAME);
  281        fields.put("addressLine1", ADDRESS_LINE_1);
  282        fields.put("townOrCity", TOWN_OR_CITY);
  283        fields.put("postcode", POSTCODE);
  284        fields.put("countryCode", COUNTRY_CODE);
  285        fields.put("phone", PHONE);
  286        fields.put("email", EMAIL);
  287        fields.put("roles", List.of("PLACE_OF_ORIGIN"));
  288      }
  289  
  290      AddressBody without(String field) {
  291        fields.remove(field);
  292        return this;
  293      }
  294  
  295      AddressBody with(String field, Object value) {
  296        fields.put(field, value);
  297        return this;
  298      }
  299  
  300      AddressBody blank(String field) {
  301        return with(field, "");
  302      }
  303  
  304      String json() {
  305        try {
  306          return OBJECT_MAPPER.writeValueAsString(fields);
  307        } catch (JsonProcessingException e) {
  308          throw new UncheckedIOException(e);
  309        }
  310      }
  311    }
  312  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/MongoAvailabilityIT.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/MongoAvailabilityIT.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/MongoAvailabilityIT.java
new file mode 100644
index 0000000..8d8a265
--- /dev/null
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/MongoAvailabilityIT.java
@@ -0,0 +1,55 @@
+package uk.gov.defra.trade.imports.addressbook.integration;
+
+import static org.awaitility.Awaitility.await;
+
+import com.mongodb.ConnectionString;
+import com.mongodb.MongoClientSettings;
+import com.mongodb.client.MongoClient;
+import com.mongodb.client.MongoClients;
+import java.time.Duration;
+import java.util.concurrent.TimeUnit;
+import org.junit.jupiter.api.Test;
+import org.springframework.beans.factory.annotation.Autowired;
+import org.testcontainers.mongodb.MongoDBContainer;
+import uk.gov.defra.trade.imports.addressbook.metrics.MongoAvailability;
+
+class MongoAvailabilityIT extends IntegrationBase {
+
+  @Autowired private MongoAvailability applicationMongoAvailability;
+
+  @Test
+  void theApplicationsOwnClientReportsMongoAvailable() {
+    await()
+        .atMost(Duration.ofSeconds(30))
+        .until(() -> applicationMongoAvailability.state() == MongoAvailability.State.AVAILABLE);
+  }
+
+  @Test
+  void aDatabaseThatStopsIsReportedUnavailable() {
+    MongoAvailability availability = new MongoAvailability();
+    try (MongoDBContainer throwaway = newMongoContainer()) {
+      throwaway.start();
+      try (var _ = clientOf(throwaway, availability)) {
+        await()
+            .atMost(Duration.ofSeconds(30))
+            .until(() -> availability.state() == MongoAvailability.State.AVAILABLE);
+
+        throwaway.stop();
+
+        await()
+            .atMost(Duration.ofSeconds(30))
+            .until(() -> availability.state() == MongoAvailability.State.UNAVAILABLE);
+      }
+    }
+  }
+
+  private static MongoClient clientOf(MongoDBContainer database, MongoAvailability availability) {
+    return MongoClients.create(
+        MongoClientSettings.builder()
+            .applyConnectionString(new ConnectionString(database.getConnectionString()))
+            .applyToClusterSettings(cluster -> cluster.addClusterListener(availability))
+            .applyToServerSettings(
+                server -> server.heartbeatFrequency(500, TimeUnit.MILLISECONDS))
+            .build());
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.integration;
    2  
    3  import static org.awaitility.Awaitility.await;
    4  
    5  import com.mongodb.ConnectionString;
    6  import com.mongodb.MongoClientSettings;
    7  import com.mongodb.client.MongoClient;
    8  import com.mongodb.client.MongoClients;
    9  import java.time.Duration;
   10  import java.util.concurrent.TimeUnit;
   11  import org.junit.jupiter.api.Test;
   12  import org.springframework.beans.factory.annotation.Autowired;
   13  import org.testcontainers.mongodb.MongoDBContainer;
   14  import uk.gov.defra.trade.imports.addressbook.metrics.MongoAvailability;
   15  
   16  class MongoAvailabilityIT extends IntegrationBase {
   17  
   18    @Autowired private MongoAvailability applicationMongoAvailability;
   19  
   20    @Test
   21    void theApplicationsOwnClientReportsMongoAvailable() {
   22      await()
   23          .atMost(Duration.ofSeconds(30))
   24          .until(() -> applicationMongoAvailability.state() == MongoAvailability.State.AVAILABLE);
   25    }
   26  
   27    @Test
   28    void aDatabaseThatStopsIsReportedUnavailable() {
   29      MongoAvailability availability = new MongoAvailability();
   30      try (MongoDBContainer throwaway = newMongoContainer()) {
   31        throwaway.start();
   32        try (var _ = clientOf(throwaway, availability)) {
   33          await()
   34              .atMost(Duration.ofSeconds(30))
   35              .until(() -> availability.state() == MongoAvailability.State.AVAILABLE);
   36  
   37          throwaway.stop();
   38  
   39          await()
   40              .atMost(Duration.ofSeconds(30))
   41              .until(() -> availability.state() == MongoAvailability.State.UNAVAILABLE);
   42        }
   43      }
   44    }
   45  
   46    private static MongoClient clientOf(MongoDBContainer database, MongoAvailability availability) {
   47      return MongoClients.create(
   48          MongoClientSettings.builder()
   49              .applyConnectionString(new ConnectionString(database.getConnectionString()))
   50              .applyToClusterSettings(cluster -> cluster.addClusterListener(availability))
   51              .applyToServerSettings(
   52                  server -> server.heartbeatFrequency(500, TimeUnit.MILLISECONDS))
   53              .build());
   54    }
   55  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoderTest.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoderTest.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoderTest.java
new file mode 100644
index 0000000..0920f1d
--- /dev/null
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoderTest.java
@@ -0,0 +1,176 @@
+package uk.gov.defra.trade.imports.addressbook.logging;
+
+import static org.assertj.core.api.Assertions.assertThat;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedLogs.loggedBy;
+
+import ch.qos.logback.classic.LoggerContext;
+import ch.qos.logback.classic.spi.ILoggingEvent;
+import co.elastic.logging.logback.EcsEncoder;
+import com.fasterxml.jackson.databind.JsonNode;
+import com.fasterxml.jackson.databind.ObjectMapper;
+import java.io.IOException;
+import org.junit.jupiter.api.AfterEach;
+import org.junit.jupiter.api.BeforeEach;
+import org.junit.jupiter.api.Test;
+import org.slf4j.Logger;
+import org.slf4j.LoggerFactory;
+import org.slf4j.MDC;
+
+class EcsEventEncoderTest {
+
+  private static final Logger LOG = LoggerFactory.getLogger(EcsEventEncoderTest.class);
+  private static final ObjectMapper JSON = new ObjectMapper();
+
+  private final EcsEventEncoder encoder = new EcsEventEncoder();
+  private final EcsEncoder ecsEncoder = new EcsEncoder();
+
+  @BeforeEach
+  void startEncoders() {
+    var context = (LoggerContext) LoggerFactory.getILoggerFactory();
+    for (EcsEncoder each : new EcsEncoder[] {encoder, ecsEncoder}) {
+      each.setContext(context);
+      each.setServiceName("trade-imports-address-book");
+      each.start();
+    }
+  }
+
+  @AfterEach
+  void clearMdc() {
+    MDC.clear();
+  }
+
+  @Test
+  void encode_nestsTheEventKeyValuePairs_withAnIntegralDuration() throws IOException {
+    ILoggingEvent event =
+        logged(
+            () ->
+                LOG.atInfo()
+                    .addKeyValue("event.category", "external-call")
+                    .addKeyValue("event.action", "mongodb/find")
+                    .addKeyValue("event.outcome", "success")
+                    .addKeyValue("event.duration", 2_882_625L)
+                    .log("External call mongodb/find success in 2 ms"));
+
+    JsonNode line = encode(event);
+
+    JsonNode eventObject = line.path("event");
+    assertThat(eventObject.isObject()).isTrue();
+    assertThat(eventObject.path("category").asText()).isEqualTo("external-call");
+    assertThat(eventObject.path("action").asText()).isEqualTo("mongodb/find");
+    assertThat(eventObject.path("outcome").asText()).isEqualTo("success");
+    assertThat(eventObject.path("duration").isIntegralNumber()).isTrue();
+    assertThat(eventObject.path("duration").asLong()).isEqualTo(2_882_625L);
+  }
+
+  @Test
+  void encode_keepsTheErrorFieldsAfterTheEventObject() throws IOException {
+    ILoggingEvent event =
+        logged(
+            () ->
+                LOG.atWarn()
+                    .addKeyValue("event.outcome", "failure")
+                    .setCause(new IllegalStateException("mongo unavailable"))
+                    .log("External call failed"));
+
+    JsonNode line = encode(event);
+
+    assertThat(line.path("error.type").asText()).isEqualTo("java.lang.IllegalStateException");
+    assertThat(line.path("error.message").asText()).isEqualTo("mongo unavailable");
+    assertThat(line.has("error.stack_trace")).isTrue();
+    assertThat(line.path("event").path("outcome").asText()).isEqualTo("failure");
+  }
+
+  @Test
+  void encode_writesOnlyTheErrorKeyValuePairsAsTopLevelFieldsWithNoStackTrace()
+      throws IOException {
+    ILoggingEvent event =
+        logged(
+            () ->
+                LOG.atWarn()
+                    .addKeyValue("event.outcome", "failure")
+                    .addKeyValue("error.type", "java.lang.IllegalStateException")
+                    .addKeyValue("error.message", "mongo unavailable")
+                    .log("External call failed"));
+
+    JsonNode line = encode(event);
+
+    assertThat(line.path("error.type").asText()).isEqualTo("java.lang.IllegalStateException");
+    assertThat(line.path("error.message").asText()).isEqualTo("mongo unavailable");
+    assertThat(line.has("error.stack_trace")).isFalse();
+    assertThat(line.has("event.outcome")).isFalse();
+    assertThat(line.path("event").path("outcome").asText()).isEqualTo("failure");
+  }
+
+  @Test
+  void encode_writesTheThrowablesErrorFieldsInsteadOfTheErrorKeyValuePairs() {
+    ILoggingEvent event =
+        logged(
+            () ->
+                LOG.atWarn()
+                    .addKeyValue("error.type", "java.lang.IllegalArgumentException")
+                    .addKeyValue("error.message", "from the key-value pair")
+                    .setCause(new IllegalStateException("from the throwable"))
+                    .log("External call failed"));
+
+    String line = new String(encoder.encode(event));
+
+    assertThat(line)
+        .contains("\"error.type\":\"java.lang.IllegalStateException\"")
+        .contains("\"error.message\":\"from the throwable\"")
+        .doesNotContain("java.lang.IllegalArgumentException")
+        .doesNotContain("from the key-value pair");
+  }
+
+  @Test
+  void encode_writesALineWithNoEventKeyValuePairsExactlyAsTheEcsEncoderDoes() {
+    MDC.put("trace.id", "trace-from-the-caller");
+    ILoggingEvent event =
+        logged(() -> LOG.atInfo().addKeyValue("other.key", "value").log("Started"));
+
+    assertThat(new String(encoder.encode(event))).isEqualTo(new String(ecsEncoder.encode(event)));
+  }
+
+  @Test
+  void encode_escapesStringValues() throws IOException {
+    ILoggingEvent event =
+        logged(() -> LOG.atInfo().addKeyValue("event.action", "say \"hi\" \\ there").log("Hi"));
+
+    JsonNode line = encode(event);
+
+    assertThat(line.path("event").path("action").asText()).isEqualTo("say \"hi\" \\ there");
+  }
+
+  @Test
+  void encode_writesANullValueAsJsonNull() throws IOException {
+    ILoggingEvent event =
+        logged(() -> LOG.atInfo().addKeyValue("event.outcome", (Object) null).log("No outcome"));
+
+    JsonNode outcome = encode(event).path("event").path("outcome");
+
+    assertThat(outcome.isNull()).isTrue();
+  }
+
+  @Test
+  void encode_writesANonFiniteNumberAsAString() throws IOException {
+    ILoggingEvent event =
+        logged(
+            () ->
+                LOG.atInfo()
+                    .addKeyValue("event.duration", Double.NaN)
+                    .addKeyValue("event.risk_score", Float.POSITIVE_INFINITY)
+                    .log("Not a number"));
+
+    JsonNode line = encode(event);
+
+    assertThat(line.path("event").path("duration").asText()).isEqualTo("NaN");
+    assertThat(line.path("event").path("risk_score").asText()).isEqualTo("Infinity");
+  }
+
+  private static ILoggingEvent logged(Runnable logging) {
+    return loggedBy(EcsEventEncoderTest.class, logging).getFirst();
+  }
+
+  private JsonNode encode(ILoggingEvent event) throws IOException {
+    return JSON.readTree(encoder.encode(event));
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.logging;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedLogs.loggedBy;
    5  
    6  import ch.qos.logback.classic.LoggerContext;
    7  import ch.qos.logback.classic.spi.ILoggingEvent;
    8  import co.elastic.logging.logback.EcsEncoder;
    9  import com.fasterxml.jackson.databind.JsonNode;
   10  import com.fasterxml.jackson.databind.ObjectMapper;
   11  import java.io.IOException;
   12  import org.junit.jupiter.api.AfterEach;
   13  import org.junit.jupiter.api.BeforeEach;
   14  import org.junit.jupiter.api.Test;
   15  import org.slf4j.Logger;
   16  import org.slf4j.LoggerFactory;
   17  import org.slf4j.MDC;
   18  
   19  class EcsEventEncoderTest {
   20  
   21    private static final Logger LOG = LoggerFactory.getLogger(EcsEventEncoderTest.class);
   22    private static final ObjectMapper JSON = new ObjectMapper();
   23  
   24    private final EcsEventEncoder encoder = new EcsEventEncoder();
   25    private final EcsEncoder ecsEncoder = new EcsEncoder();
   26  
   27    @BeforeEach
   28    void startEncoders() {
   29      var context = (LoggerContext) LoggerFactory.getILoggerFactory();
   30      for (EcsEncoder each : new EcsEncoder[] {encoder, ecsEncoder}) {
   31        each.setContext(context);
   32        each.setServiceName("trade-imports-address-book");
   33        each.start();
   34      }
   35    }
   36  
   37    @AfterEach
   38    void clearMdc() {
   39      MDC.clear();
   40    }
   41  
   42    @Test
   43    void encode_nestsTheEventKeyValuePairs_withAnIntegralDuration() throws IOException {
   44      ILoggingEvent event =
   45          logged(
   46              () ->
   47                  LOG.atInfo()
   48                      .addKeyValue("event.category", "external-call")
   49                      .addKeyValue("event.action", "mongodb/find")
   50                      .addKeyValue("event.outcome", "success")
   51                      .addKeyValue("event.duration", 2_882_625L)
   52                      .log("External call mongodb/find success in 2 ms"));
   53  
   54      JsonNode line = encode(event);
   55  
   56      JsonNode eventObject = line.path("event");
   57      assertThat(eventObject.isObject()).isTrue();
   58      assertThat(eventObject.path("category").asText()).isEqualTo("external-call");
   59      assertThat(eventObject.path("action").asText()).isEqualTo("mongodb/find");
   60      assertThat(eventObject.path("outcome").asText()).isEqualTo("success");
   61      assertThat(eventObject.path("duration").isIntegralNumber()).isTrue();
   62      assertThat(eventObject.path("duration").asLong()).isEqualTo(2_882_625L);
   63    }
   64  
   65    @Test
   66    void encode_keepsTheErrorFieldsAfterTheEventObject() throws IOException {
   67      ILoggingEvent event =
   68          logged(
   69              () ->
   70                  LOG.atWarn()
   71                      .addKeyValue("event.outcome", "failure")
   72                      .setCause(new IllegalStateException("mongo unavailable"))
   73                      .log("External call failed"));
   74  
   75      JsonNode line = encode(event);
   76  
   77      assertThat(line.path("error.type").asText()).isEqualTo("java.lang.IllegalStateException");
   78      assertThat(line.path("error.message").asText()).isEqualTo("mongo unavailable");
   79      assertThat(line.has("error.stack_trace")).isTrue();
   80      assertThat(line.path("event").path("outcome").asText()).isEqualTo("failure");
   81    }
   82  
   83    @Test
   84    void encode_writesOnlyTheErrorKeyValuePairsAsTopLevelFieldsWithNoStackTrace()
   85        throws IOException {
   86      ILoggingEvent event =
   87          logged(
   88              () ->
   89                  LOG.atWarn()
   90                      .addKeyValue("event.outcome", "failure")
   91                      .addKeyValue("error.type", "java.lang.IllegalStateException")
   92                      .addKeyValue("error.message", "mongo unavailable")
   93                      .log("External call failed"));
   94  
   95      JsonNode line = encode(event);
   96  
   97      assertThat(line.path("error.type").asText()).isEqualTo("java.lang.IllegalStateException");
   98      assertThat(line.path("error.message").asText()).isEqualTo("mongo unavailable");
   99      assertThat(line.has("error.stack_trace")).isFalse();
  100      assertThat(line.has("event.outcome")).isFalse();
  101      assertThat(line.path("event").path("outcome").asText()).isEqualTo("failure");
  102    }
  103  
  104    @Test
  105    void encode_writesTheThrowablesErrorFieldsInsteadOfTheErrorKeyValuePairs() {
  106      ILoggingEvent event =
  107          logged(
  108              () ->
  109                  LOG.atWarn()
  110                      .addKeyValue("error.type", "java.lang.IllegalArgumentException")
  111                      .addKeyValue("error.message", "from the key-value pair")
  112                      .setCause(new IllegalStateException("from the throwable"))
  113                      .log("External call failed"));
  114  
  115      String line = new String(encoder.encode(event));
  116  
  117      assertThat(line)
  118          .contains("\"error.type\":\"java.lang.IllegalStateException\"")
  119          .contains("\"error.message\":\"from the throwable\"")
  120          .doesNotContain("java.lang.IllegalArgumentException")
  121          .doesNotContain("from the key-value pair");
  122    }
  123  
  124    @Test
  125    void encode_writesALineWithNoEventKeyValuePairsExactlyAsTheEcsEncoderDoes() {
  126      MDC.put("trace.id", "trace-from-the-caller");
  127      ILoggingEvent event =
  128          logged(() -> LOG.atInfo().addKeyValue("other.key", "value").log("Started"));
  129  
  130      assertThat(new String(encoder.encode(event))).isEqualTo(new String(ecsEncoder.encode(event)));
  131    }
  132  
  133    @Test
  134    void encode_escapesStringValues() throws IOException {
  135      ILoggingEvent event =
  136          logged(() -> LOG.atInfo().addKeyValue("event.action", "say \"hi\" \\ there").log("Hi"));
  137  
  138      JsonNode line = encode(event);
  139  
  140      assertThat(line.path("event").path("action").asText()).isEqualTo("say \"hi\" \\ there");
  141    }
  142  
  143    @Test
  144    void encode_writesANullValueAsJsonNull() throws IOException {
  145      ILoggingEvent event =
  146          logged(() -> LOG.atInfo().addKeyValue("event.outcome", (Object) null).log("No outcome"));
  147  
  148      JsonNode outcome = encode(event).path("event").path("outcome");
  149  
  150      assertThat(outcome.isNull()).isTrue();
  151    }
  152  
  153    @Test
  154    void encode_writesANonFiniteNumberAsAString() throws IOException {
  155      ILoggingEvent event =
  156          logged(
  157              () ->
  158                  LOG.atInfo()
  159                      .addKeyValue("event.duration", Double.NaN)
  160                      .addKeyValue("event.risk_score", Float.POSITIVE_INFINITY)
  161                      .log("Not a number"));
  162  
  163      JsonNode line = encode(event);
  164  
  165      assertThat(line.path("event").path("duration").asText()).isEqualTo("NaN");
  166      assertThat(line.path("event").path("risk_score").asText()).isEqualTo("Infinity");
  167    }
  168  
  169    private static ILoggingEvent logged(Runnable logging) {
  170      return loggedBy(EcsEventEncoderTest.class, logging).getFirst();
  171    }
  172  
  173    private JsonNode encode(ILoggingEvent event) throws IOException {
  174      return JSON.readTree(encoder.encode(event));
  175    }
  176  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/CapturingEmfEnvironment.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/CapturingEmfEnvironment.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/CapturingEmfEnvironment.java
new file mode 100644
index 0000000..e8ad338
--- /dev/null
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/CapturingEmfEnvironment.java
@@ -0,0 +1,83 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import com.fasterxml.jackson.core.JsonProcessingException;
+import com.fasterxml.jackson.databind.JsonNode;
+import com.fasterxml.jackson.databind.ObjectMapper;
+import java.util.ArrayList;
+import java.util.List;
+import java.util.concurrent.CompletableFuture;
+import software.amazon.cloudwatchlogs.emf.environment.Environment;
+import software.amazon.cloudwatchlogs.emf.logger.MetricsLogger;
+import software.amazon.cloudwatchlogs.emf.model.MetricsContext;
+import software.amazon.cloudwatchlogs.emf.sinks.ISink;
+
+public class CapturingEmfEnvironment implements Environment {
+
+  private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
+
+  private final List<String> serialised = new ArrayList<>();
+
+  public MetricsLogger metricsLogger() {
+    return new MetricsLogger(this);
+  }
+
+  public List<JsonNode> documents() {
+    return serialised.stream().map(CapturingEmfEnvironment::parse).toList();
+  }
+
+  public List<JsonNode> documentsFor(String metricName) {
+    return documents().stream().filter(document -> document.has(metricName)).toList();
+  }
+
+  private static JsonNode parse(String document) {
+    try {
+      return OBJECT_MAPPER.readTree(document);
+    } catch (JsonProcessingException e) {
+      throw new IllegalStateException(e);
+    }
+  }
+
+  @Override
+  public boolean probe() {
+    return true;
+  }
+
+  @Override
+  public String getName() {
+    return "test";
+  }
+
+  @Override
+  public String getType() {
+    return "test";
+  }
+
+  @Override
+  public String getLogGroupName() {
+    return "test";
+  }
+
+  @Override
+  public void configureContext(MetricsContext context) {
+    // Adds no environment properties.
+  }
+
+  @Override
+  public ISink getSink() {
+    return new ISink() {
+      @Override
+      public void accept(MetricsContext context) {
+        try {
+          serialised.addAll(context.serialize());
+        } catch (JsonProcessingException e) {
+          throw new IllegalStateException(e);
+        }
+      }
+
+      @Override
+      public CompletableFuture<Void> shutdown() {
+        return CompletableFuture.completedFuture(null);
+      }
+    };
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import com.fasterxml.jackson.core.JsonProcessingException;
    4  import com.fasterxml.jackson.databind.JsonNode;
    5  import com.fasterxml.jackson.databind.ObjectMapper;
    6  import java.util.ArrayList;
    7  import java.util.List;
    8  import java.util.concurrent.CompletableFuture;
    9  import software.amazon.cloudwatchlogs.emf.environment.Environment;
   10  import software.amazon.cloudwatchlogs.emf.logger.MetricsLogger;
   11  import software.amazon.cloudwatchlogs.emf.model.MetricsContext;
   12  import software.amazon.cloudwatchlogs.emf.sinks.ISink;
   13  
   14  public class CapturingEmfEnvironment implements Environment {
   15  
   16    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
   17  
   18    private final List<String> serialised = new ArrayList<>();
   19  
   20    public MetricsLogger metricsLogger() {
   21      return new MetricsLogger(this);
   22    }
   23  
   24    public List<JsonNode> documents() {
   25      return serialised.stream().map(CapturingEmfEnvironment::parse).toList();
   26    }
   27  
   28    public List<JsonNode> documentsFor(String metricName) {
   29      return documents().stream().filter(document -> document.has(metricName)).toList();
   30    }
   31  
   32    private static JsonNode parse(String document) {
   33      try {
   34        return OBJECT_MAPPER.readTree(document);
   35      } catch (JsonProcessingException e) {
   36        throw new IllegalStateException(e);
   37      }
   38    }
   39  
   40    @Override
   41    public boolean probe() {
   42      return true;
   43    }
   44  
   45    @Override
   46    public String getName() {
   47      return "test";
   48    }
   49  
   50    @Override
   51    public String getType() {
   52      return "test";
   53    }
   54  
   55    @Override
   56    public String getLogGroupName() {
   57      return "test";
   58    }
   59  
   60    @Override
   61    public void configureContext(MetricsContext context) {
   62      // Adds no environment properties.
   63    }
   64  
   65    @Override
   66    public ISink getSink() {
   67      return new ISink() {
   68        @Override
   69        public void accept(MetricsContext context) {
   70          try {
   71            serialised.addAll(context.serialize());
   72          } catch (JsonProcessingException e) {
   73            throw new IllegalStateException(e);
   74          }
   75        }
   76  
   77        @Override
   78        public CompletableFuture<Void> shutdown() {
   79          return CompletableFuture.completedFuture(null);
   80        }
   81      };
   82    }
   83  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetricsTest.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetricsTest.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetricsTest.java
new file mode 100644
index 0000000..a160c62
--- /dev/null
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetricsTest.java
@@ -0,0 +1,48 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import static org.assertj.core.api.Assertions.assertThat;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.MongoClusterEvents.failing;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.MongoClusterEvents.primary;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.MongoClusterEvents.report;
+
+import com.mongodb.ServerAddress;
+import io.micrometer.core.instrument.Gauge;
+import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
+import org.junit.jupiter.api.BeforeEach;
+import org.junit.jupiter.api.Test;
+
+class DependencyAvailabilityMetricsTest {
+
+  private static final ServerAddress ADDRESS = new ServerAddress("mongo-1", 27017);
+
+  private final SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
+  private final MongoAvailability availability = new MongoAvailability();
+
+  @BeforeEach
+  void registerTheGauge() {
+    new DependencyAvailabilityMetrics(meterRegistry, availability);
+  }
+
+  @Test
+  void gauge_isNaNWhileAvailabilityIsUnknown() {
+    assertThat(gauge().value()).isNaN();
+  }
+
+  @Test
+  void gauge_isOneWhileMongoIsAvailable() {
+    report(availability, primary(ADDRESS));
+
+    assertThat(gauge().value()).isEqualTo(1);
+  }
+
+  @Test
+  void gauge_isZeroWhileMongoIsUnavailable() {
+    report(availability, failing(ADDRESS));
+
+    assertThat(gauge().value()).isZero();
+  }
+
+  private Gauge gauge() {
+    return meterRegistry.get("external.dependency.available").tag("dependency", "mongodb").gauge();
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  import static uk.gov.defra.trade.imports.addressbook.testsupport.MongoClusterEvents.failing;
    5  import static uk.gov.defra.trade.imports.addressbook.testsupport.MongoClusterEvents.primary;
    6  import static uk.gov.defra.trade.imports.addressbook.testsupport.MongoClusterEvents.report;
    7  
    8  import com.mongodb.ServerAddress;
    9  import io.micrometer.core.instrument.Gauge;
   10  import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
   11  import org.junit.jupiter.api.BeforeEach;
   12  import org.junit.jupiter.api.Test;
   13  
   14  class DependencyAvailabilityMetricsTest {
   15  
   16    private static final ServerAddress ADDRESS = new ServerAddress("mongo-1", 27017);
   17  
   18    private final SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
   19    private final MongoAvailability availability = new MongoAvailability();
   20  
   21    @BeforeEach
   22    void registerTheGauge() {
   23      new DependencyAvailabilityMetrics(meterRegistry, availability);
   24    }
   25  
   26    @Test
   27    void gauge_isNaNWhileAvailabilityIsUnknown() {
   28      assertThat(gauge().value()).isNaN();
   29    }
   30  
   31    @Test
   32    void gauge_isOneWhileMongoIsAvailable() {
   33      report(availability, primary(ADDRESS));
   34  
   35      assertThat(gauge().value()).isEqualTo(1);
   36    }
   37  
   38    @Test
   39    void gauge_isZeroWhileMongoIsUnavailable() {
   40      report(availability, failing(ADDRESS));
   41  
   42      assertThat(gauge().value()).isZero();
   43    }
   44  
   45    private Gauge gauge() {
   46      return meterRegistry.get("external.dependency.available").tag("dependency", "mongodb").gauge();
   47    }
   48  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistryTest.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistryTest.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistryTest.java
new file mode 100644
index 0000000..776d3d1
--- /dev/null
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistryTest.java
@@ -0,0 +1,182 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import static org.assertj.core.api.Assertions.assertThat;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.EmfDocuments.dimensionSetsOf;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.EmfDocuments.namespaceOf;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.EmfDocuments.unitOf;
+
+import com.fasterxml.jackson.databind.JsonNode;
+import io.micrometer.core.instrument.Counter;
+import io.micrometer.core.instrument.DistributionSummary;
+import io.micrometer.core.instrument.FunctionCounter;
+import io.micrometer.core.instrument.FunctionTimer;
+import io.micrometer.core.instrument.Gauge;
+import io.micrometer.core.instrument.LongTaskTimer;
+import io.micrometer.core.instrument.MockClock;
+import io.micrometer.core.instrument.TimeGauge;
+import io.micrometer.core.instrument.Timer;
+import java.time.Duration;
+import java.util.ArrayList;
+import java.util.List;
+import java.util.concurrent.TimeUnit;
+import java.util.concurrent.atomic.AtomicInteger;
+import java.util.stream.IntStream;
+import org.junit.jupiter.api.Test;
+
+class EmfMeterRegistryTest {
+
+  private static final String NAMESPACE = "trade-imports-address-book";
+  private static final Duration STEP = Duration.ofMinutes(1);
+
+  private final MockClock clock = new MockClock();
+  private final CapturingEmfEnvironment emf = new CapturingEmfEnvironment();
+  private final EmfMeterRegistry registry =
+      new EmfMeterRegistry(NAMESPACE, STEP, clock, emf::metricsLogger);
+
+  @Test
+  void publish_writesEveryTimerValueInMillisecondsWithItsTagsAsTheOnlyDimensions() {
+    Timer timer =
+        Timer.builder("external.call.duration")
+            .tags("dependency", "mongodb", "operation", "find")
+            .register(registry);
+    timer.record(Duration.ofMillis(2));
+    timer.record(Duration.ofMillis(5));
+
+    registry.publish();
+
+    JsonNode document = onlyDocumentFor("external.call.duration");
+    assertThat(namespaceOf(document)).isEqualTo(NAMESPACE);
+    assertThat(unitOf(document)).isEqualTo("Milliseconds");
+    assertThat(dimensionSetsOf(document)).hasSize(1);
+    assertThat(dimensionSetsOf(document).getFirst())
+        .containsExactlyInAnyOrder("dependency", "operation");
+    assertThat(document.path("dependency").asText()).isEqualTo("mongodb");
+    assertThat(document.path("operation").asText()).isEqualTo("find");
+    assertThat(valuesOf(document, "external.call.duration")).containsExactly(2.0, 5.0);
+  }
+
+  @Test
+  void publish_writesATimerOnlyWhenValuesWereRecordedSinceTheLastPublish() {
+    Timer.builder("service.get.time").register(registry).record(Duration.ofMillis(1));
+    registry.publish();
+
+    registry.publish();
+
+    assertThat(emf.documentsFor("service.get.time")).hasSize(1);
+  }
+
+  @Test
+  void publish_writesEveryDistributionSummaryValue() {
+    DistributionSummary summary =
+        DistributionSummary.builder("external.call.failure")
+            .tags("dependency", "mongodb", "operation", "insert")
+            .register(registry);
+    summary.record(0);
+    summary.record(1);
+
+    registry.publish();
+
+    JsonNode document = onlyDocumentFor("external.call.failure");
+    assertThat(valuesOf(document, "external.call.failure")).containsExactly(0.0, 1.0);
+  }
+
+  @Test
+  void publish_writesACountersCountForTheLastMinute() {
+    Counter counter = Counter.builder("address.change").tag("change", "create").register(registry);
+    counter.increment();
+    counter.increment();
+    clock.add(STEP);
+
+    registry.publish();
+
+    JsonNode document = onlyDocumentFor("address.change");
+    assertThat(unitOf(document)).isEqualTo("Count");
+    assertThat(valuesOf(document, "address.change")).containsExactly(2.0);
+  }
+
+  @Test
+  void publish_writesAFiniteGaugeAndSkipsANaNOne() {
+    AtomicInteger available = new AtomicInteger(1);
+    Gauge.builder("external.dependency.available", available, AtomicInteger::get)
+        .tag("dependency", "mongodb")
+        .register(registry);
+    Gauge.builder("unknown.gauge", () -> Double.NaN).register(registry);
+
+    registry.publish();
+
+    assertThat(valuesOf(onlyDocumentFor("external.dependency.available"), "external.dependency.available"))
+        .containsExactly(1.0);
+    assertThat(emf.documentsFor("unknown.gauge")).isEmpty();
+  }
+
+  @Test
+  void publish_writesAMeterWithNoTagsUnderAnEmptyDimensionSet() {
+    Timer.builder("service.list.time").register(registry).record(Duration.ofMillis(3));
+
+    registry.publish();
+
+    assertThat(dimensionSetsOf(onlyDocumentFor("service.list.time"))).containsExactly(List.of());
+  }
+
+  @Test
+  void publish_splitsMoreThan100ValuesAcrossDocuments() {
+    Timer timer = Timer.builder("external.call.duration").register(registry);
+    IntStream.rangeClosed(1, 150).forEach(each -> timer.record(Duration.ofMillis(each)));
+
+    registry.publish();
+
+    List<JsonNode> documents = emf.documentsFor("external.call.duration");
+    assertThat(documents).hasSize(2);
+    List<Double> published = new ArrayList<>();
+    documents.forEach(document -> published.addAll(valuesOf(document, "external.call.duration")));
+    assertThat(published).hasSize(150);
+  }
+
+  @Test
+  void publish_stillWritesTheOtherMeters_whenOneCannotBePublished() {
+    Counter.builder("bad.dimension").tag("action", " ").register(registry).increment();
+    Timer.builder("service.create.time").register(registry).record(Duration.ofMillis(4));
+    clock.add(STEP);
+
+    registry.publish();
+
+    assertThat(emf.documentsFor("bad.dimension")).isEmpty();
+    assertThat(emf.documentsFor("service.create.time")).hasSize(1);
+  }
+
+  @Test
+  void publish_skipsLongTaskTimersFunctionCountersFunctionTimersAndTimeGauges() {
+    LongTaskTimer.builder("long.task.timer").register(registry).start();
+    FunctionCounter.builder("function.counter", new AtomicInteger(5), AtomicInteger::get)
+        .register(registry);
+    FunctionTimer.builder(
+            "function.timer",
+            new AtomicInteger(5),
+            AtomicInteger::get,
+            AtomicInteger::get,
+            TimeUnit.MILLISECONDS)
+        .register(registry);
+    TimeGauge.builder("process.uptime", () -> 5, TimeUnit.SECONDS).register(registry);
+    clock.add(STEP);
+
+    registry.publish();
+
+    assertThat(emf.documents()).isEmpty();
+  }
+
+  private JsonNode onlyDocumentFor(String metricName) {
+    List<JsonNode> documents = emf.documentsFor(metricName);
+    assertThat(documents).hasSize(1);
+    return documents.getFirst();
+  }
+
+  private static List<Double> valuesOf(JsonNode document, String metricName) {
+    JsonNode values = document.path(metricName);
+    if (!values.isArray()) {
+      return List.of(values.asDouble());
+    }
+    List<Double> doubles = new ArrayList<>();
+    values.forEach(value -> doubles.add(value.asDouble()));
+    return doubles;
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  import static uk.gov.defra.trade.imports.addressbook.testsupport.EmfDocuments.dimensionSetsOf;
    5  import static uk.gov.defra.trade.imports.addressbook.testsupport.EmfDocuments.namespaceOf;
    6  import static uk.gov.defra.trade.imports.addressbook.testsupport.EmfDocuments.unitOf;
    7  
    8  import com.fasterxml.jackson.databind.JsonNode;
    9  import io.micrometer.core.instrument.Counter;
   10  import io.micrometer.core.instrument.DistributionSummary;
   11  import io.micrometer.core.instrument.FunctionCounter;
   12  import io.micrometer.core.instrument.FunctionTimer;
   13  import io.micrometer.core.instrument.Gauge;
   14  import io.micrometer.core.instrument.LongTaskTimer;
   15  import io.micrometer.core.instrument.MockClock;
   16  import io.micrometer.core.instrument.TimeGauge;
   17  import io.micrometer.core.instrument.Timer;
   18  import java.time.Duration;
   19  import java.util.ArrayList;
   20  import java.util.List;
   21  import java.util.concurrent.TimeUnit;
   22  import java.util.concurrent.atomic.AtomicInteger;
   23  import java.util.stream.IntStream;
   24  import org.junit.jupiter.api.Test;
   25  
   26  class EmfMeterRegistryTest {
   27  
   28    private static final String NAMESPACE = "trade-imports-address-book";
   29    private static final Duration STEP = Duration.ofMinutes(1);
   30  
   31    private final MockClock clock = new MockClock();
   32    private final CapturingEmfEnvironment emf = new CapturingEmfEnvironment();
   33    private final EmfMeterRegistry registry =
   34        new EmfMeterRegistry(NAMESPACE, STEP, clock, emf::metricsLogger);
   35  
   36    @Test
   37    void publish_writesEveryTimerValueInMillisecondsWithItsTagsAsTheOnlyDimensions() {
   38      Timer timer =
   39          Timer.builder("external.call.duration")
   40              .tags("dependency", "mongodb", "operation", "find")
   41              .register(registry);
   42      timer.record(Duration.ofMillis(2));
   43      timer.record(Duration.ofMillis(5));
   44  
   45      registry.publish();
   46  
   47      JsonNode document = onlyDocumentFor("external.call.duration");
   48      assertThat(namespaceOf(document)).isEqualTo(NAMESPACE);
   49      assertThat(unitOf(document)).isEqualTo("Milliseconds");
   50      assertThat(dimensionSetsOf(document)).hasSize(1);
   51      assertThat(dimensionSetsOf(document).getFirst())
   52          .containsExactlyInAnyOrder("dependency", "operation");
   53      assertThat(document.path("dependency").asText()).isEqualTo("mongodb");
   54      assertThat(document.path("operation").asText()).isEqualTo("find");
   55      assertThat(valuesOf(document, "external.call.duration")).containsExactly(2.0, 5.0);
   56    }
   57  
   58    @Test
   59    void publish_writesATimerOnlyWhenValuesWereRecordedSinceTheLastPublish() {
   60      Timer.builder("service.get.time").register(registry).record(Duration.ofMillis(1));
   61      registry.publish();
   62  
   63      registry.publish();
   64  
   65      assertThat(emf.documentsFor("service.get.time")).hasSize(1);
   66    }
   67  
   68    @Test
   69    void publish_writesEveryDistributionSummaryValue() {
   70      DistributionSummary summary =
   71          DistributionSummary.builder("external.call.failure")
   72              .tags("dependency", "mongodb", "operation", "insert")
   73              .register(registry);
   74      summary.record(0);
   75      summary.record(1);
   76  
   77      registry.publish();
   78  
   79      JsonNode document = onlyDocumentFor("external.call.failure");
   80      assertThat(valuesOf(document, "external.call.failure")).containsExactly(0.0, 1.0);
   81    }
   82  
   83    @Test
   84    void publish_writesACountersCountForTheLastMinute() {
   85      Counter counter = Counter.builder("address.change").tag("change", "create").register(registry);
   86      counter.increment();
   87      counter.increment();
   88      clock.add(STEP);
   89  
   90      registry.publish();
   91  
   92      JsonNode document = onlyDocumentFor("address.change");
   93      assertThat(unitOf(document)).isEqualTo("Count");
   94      assertThat(valuesOf(document, "address.change")).containsExactly(2.0);
   95    }
   96  
   97    @Test
   98    void publish_writesAFiniteGaugeAndSkipsANaNOne() {
   99      AtomicInteger available = new AtomicInteger(1);
  100      Gauge.builder("external.dependency.available", available, AtomicInteger::get)
  101          .tag("dependency", "mongodb")
  102          .register(registry);
  103      Gauge.builder("unknown.gauge", () -> Double.NaN).register(registry);
  104  
  105      registry.publish();
  106  
  107      assertThat(valuesOf(onlyDocumentFor("external.dependency.available"), "external.dependency.available"))
  108          .containsExactly(1.0);
  109      assertThat(emf.documentsFor("unknown.gauge")).isEmpty();
  110    }
  111  
  112    @Test
  113    void publish_writesAMeterWithNoTagsUnderAnEmptyDimensionSet() {
  114      Timer.builder("service.list.time").register(registry).record(Duration.ofMillis(3));
  115  
  116      registry.publish();
  117  
  118      assertThat(dimensionSetsOf(onlyDocumentFor("service.list.time"))).containsExactly(List.of());
  119    }
  120  
  121    @Test
  122    void publish_splitsMoreThan100ValuesAcrossDocuments() {
  123      Timer timer = Timer.builder("external.call.duration").register(registry);
  124      IntStream.rangeClosed(1, 150).forEach(each -> timer.record(Duration.ofMillis(each)));
  125  
  126      registry.publish();
  127  
  128      List<JsonNode> documents = emf.documentsFor("external.call.duration");
  129      assertThat(documents).hasSize(2);
  130      List<Double> published = new ArrayList<>();
  131      documents.forEach(document -> published.addAll(valuesOf(document, "external.call.duration")));
  132      assertThat(published).hasSize(150);
  133    }
  134  
  135    @Test
  136    void publish_stillWritesTheOtherMeters_whenOneCannotBePublished() {
  137      Counter.builder("bad.dimension").tag("action", " ").register(registry).increment();
  138      Timer.builder("service.create.time").register(registry).record(Duration.ofMillis(4));
  139      clock.add(STEP);
  140  
  141      registry.publish();
  142  
  143      assertThat(emf.documentsFor("bad.dimension")).isEmpty();
  144      assertThat(emf.documentsFor("service.create.time")).hasSize(1);
  145    }
  146  
  147    @Test
  148    void publish_skipsLongTaskTimersFunctionCountersFunctionTimersAndTimeGauges() {
  149      LongTaskTimer.builder("long.task.timer").register(registry).start();
  150      FunctionCounter.builder("function.counter", new AtomicInteger(5), AtomicInteger::get)
  151          .register(registry);
  152      FunctionTimer.builder(
  153              "function.timer",
  154              new AtomicInteger(5),
  155              AtomicInteger::get,
  156              AtomicInteger::get,
  157              TimeUnit.MILLISECONDS)
  158          .register(registry);
  159      TimeGauge.builder("process.uptime", () -> 5, TimeUnit.SECONDS).register(registry);
  160      clock.add(STEP);
  161  
  162      registry.publish();
  163  
  164      assertThat(emf.documents()).isEmpty();
  165    }
  166  
  167    private JsonNode onlyDocumentFor(String metricName) {
  168      List<JsonNode> documents = emf.documentsFor(metricName);
  169      assertThat(documents).hasSize(1);
  170      return documents.getFirst();
  171    }
  172  
  173    private static List<Double> valuesOf(JsonNode document, String metricName) {
  174      JsonNode values = document.path(metricName);
  175      if (!values.isArray()) {
  176        return List.of(values.asDouble());
  177      }
  178      List<Double> doubles = new ArrayList<>();
  179      values.forEach(value -> doubles.add(value.asDouble()));
  180      return doubles;
  181    }
  182  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorderTest.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorderTest.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorderTest.java
new file mode 100644
index 0000000..5892dc0
--- /dev/null
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorderTest.java
@@ -0,0 +1,81 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import static org.assertj.core.api.Assertions.assertThat;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedLogs.keyValues;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedLogs.loggedBy;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.ExternalCallMeters.durationCount;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.ExternalCallMeters.durationMillis;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.ExternalCallMeters.failureCount;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.ExternalCallMeters.failureTotal;
+
+import ch.qos.logback.classic.Level;
+import ch.qos.logback.classic.spi.ILoggingEvent;
+import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
+import java.time.Duration;
+import java.util.List;
+import org.junit.jupiter.api.Test;
+
+class ExternalCallRecorderTest {
+
+  private final SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
+  private final ExternalCallRecorder recorder = new ExternalCallRecorder(meterRegistry);
+
+  @Test
+  void recordSuccess_recordsTheDurationAndAZeroFailure() {
+    recorder.recordSuccess("mongodb", "find", Duration.ofMillis(7));
+
+    assertThat(durationCount(meterRegistry, "mongodb", "find")).isEqualTo(1);
+    assertThat(durationMillis(meterRegistry, "mongodb", "find")).isEqualTo(7);
+    assertThat(failureCount(meterRegistry, "mongodb", "find")).isEqualTo(1);
+    assertThat(failureTotal(meterRegistry, "mongodb", "find")).isZero();
+  }
+
+  @Test
+  void recordFailure_recordsTheDurationAndAFailureOfOne() {
+    recorder.recordFailure("mongodb", "insert", Duration.ofMillis(3), new IllegalStateException());
+
+    assertThat(durationCount(meterRegistry, "mongodb", "insert")).isEqualTo(1);
+    assertThat(durationMillis(meterRegistry, "mongodb", "insert")).isEqualTo(3);
+    assertThat(failureCount(meterRegistry, "mongodb", "insert")).isEqualTo(1);
+    assertThat(failureTotal(meterRegistry, "mongodb", "insert")).isEqualTo(1);
+  }
+
+  @Test
+  void recordSuccess_logsOneInfoLineWithTheEventFieldsAndANanosecondDuration() {
+    List<ILoggingEvent> lines =
+        loggedBy(
+            ExternalCallRecorder.class,
+            () -> recorder.recordSuccess("mongodb", "find", Duration.ofMillis(2)));
+
+    assertThat(lines).hasSize(1);
+    ILoggingEvent line = lines.getFirst();
+    assertThat(line.getLevel()).isEqualTo(Level.INFO);
+    assertThat(line.getFormattedMessage()).isEqualTo("External call mongodb/find success in 2 ms");
+    assertThat(keyValues(line))
+        .containsEntry("event.category", "external-call")
+        .containsEntry("event.action", "mongodb/find")
+        .containsEntry("event.outcome", "success")
+        .containsEntry("event.duration", 2_000_000L);
+    assertThat(line.getThrowableProxy()).isNull();
+  }
+
+  @Test
+  void recordFailure_logsOneWarnLineWithTheErrorTypeAndMessageButNoStackTrace() {
+    IllegalStateException cause = new IllegalStateException("not primary");
+
+    List<ILoggingEvent> lines =
+        loggedBy(
+            ExternalCallRecorder.class,
+            () -> recorder.recordFailure("mongodb", "update", Duration.ofMillis(4), cause));
+
+    assertThat(lines).hasSize(1);
+    ILoggingEvent line = lines.getFirst();
+    assertThat(line.getLevel()).isEqualTo(Level.WARN);
+    assertThat(keyValues(line))
+        .containsEntry("event.action", "mongodb/update")
+        .containsEntry("event.outcome", "failure")
+        .containsEntry("error.type", "java.lang.IllegalStateException")
+        .containsEntry("error.message", "not primary");
+    assertThat(line.getThrowableProxy()).isNull();
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedLogs.keyValues;
    5  import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedLogs.loggedBy;
    6  import static uk.gov.defra.trade.imports.addressbook.testsupport.ExternalCallMeters.durationCount;
    7  import static uk.gov.defra.trade.imports.addressbook.testsupport.ExternalCallMeters.durationMillis;
    8  import static uk.gov.defra.trade.imports.addressbook.testsupport.ExternalCallMeters.failureCount;
    9  import static uk.gov.defra.trade.imports.addressbook.testsupport.ExternalCallMeters.failureTotal;
   10  
   11  import ch.qos.logback.classic.Level;
   12  import ch.qos.logback.classic.spi.ILoggingEvent;
   13  import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
   14  import java.time.Duration;
   15  import java.util.List;
   16  import org.junit.jupiter.api.Test;
   17  
   18  class ExternalCallRecorderTest {
   19  
   20    private final SimpleMeterRegistry meterRegistry = new SimpleMeterRegistry();
   21    private final ExternalCallRecorder recorder = new ExternalCallRecorder(meterRegistry);
   22  
   23    @Test
   24    void recordSuccess_recordsTheDurationAndAZeroFailure() {
   25      recorder.recordSuccess("mongodb", "find", Duration.ofMillis(7));
   26  
   27      assertThat(durationCount(meterRegistry, "mongodb", "find")).isEqualTo(1);
   28      assertThat(durationMillis(meterRegistry, "mongodb", "find")).isEqualTo(7);
   29      assertThat(failureCount(meterRegistry, "mongodb", "find")).isEqualTo(1);
   30      assertThat(failureTotal(meterRegistry, "mongodb", "find")).isZero();
   31    }
   32  
   33    @Test
   34    void recordFailure_recordsTheDurationAndAFailureOfOne() {
   35      recorder.recordFailure("mongodb", "insert", Duration.ofMillis(3), new IllegalStateException());
   36  
   37      assertThat(durationCount(meterRegistry, "mongodb", "insert")).isEqualTo(1);
   38      assertThat(durationMillis(meterRegistry, "mongodb", "insert")).isEqualTo(3);
   39      assertThat(failureCount(meterRegistry, "mongodb", "insert")).isEqualTo(1);
   40      assertThat(failureTotal(meterRegistry, "mongodb", "insert")).isEqualTo(1);
   41    }
   42  
   43    @Test
   44    void recordSuccess_logsOneInfoLineWithTheEventFieldsAndANanosecondDuration() {
   45      List<ILoggingEvent> lines =
   46          loggedBy(
   47              ExternalCallRecorder.class,
   48              () -> recorder.recordSuccess("mongodb", "find", Duration.ofMillis(2)));
   49  
   50      assertThat(lines).hasSize(1);
   51      ILoggingEvent line = lines.getFirst();
   52      assertThat(line.getLevel()).isEqualTo(Level.INFO);
   53      assertThat(line.getFormattedMessage()).isEqualTo("External call mongodb/find success in 2 ms");
   54      assertThat(keyValues(line))
   55          .containsEntry("event.category", "external-call")
   56          .containsEntry("event.action", "mongodb/find")
   57          .containsEntry("event.outcome", "success")
   58          .containsEntry("event.duration", 2_000_000L);
   59      assertThat(line.getThrowableProxy()).isNull();
   60    }
   61  
   62    @Test
   63    void recordFailure_logsOneWarnLineWithTheErrorTypeAndMessageButNoStackTrace() {
   64      IllegalStateException cause = new IllegalStateException("not primary");
   65  
   66      List<ILoggingEvent> lines =
   67          loggedBy(
   68              ExternalCallRecorder.class,
   69              () -> recorder.recordFailure("mongodb", "update", Duration.ofMillis(4), cause));
   70  
   71      assertThat(lines).hasSize(1);
   72      ILoggingEvent line = lines.getFirst();
   73      assertThat(line.getLevel()).isEqualTo(Level.WARN);
   74      assertThat(keyValues(line))
   75          .containsEntry("event.action", "mongodb/update")
   76          .containsEntry("event.outcome", "failure")
   77          .containsEntry("error.type", "java.lang.IllegalStateException")
   78          .containsEntry("error.message", "not primary");
   79      assertThat(line.getThrowableProxy()).isNull();
   80    }
   81  }
```

## Source under test

## Source: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorder.java`

Tested by:
- `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/ExternalCallRecorderIT.java`
- `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorderTest.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorder.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorder.java
new file mode 100644
index 0000000..d763efb
--- /dev/null
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorder.java
@@ -0,0 +1,78 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import io.micrometer.core.instrument.DistributionSummary;
+import io.micrometer.core.instrument.MeterRegistry;
+import io.micrometer.core.instrument.Tags;
+import io.micrometer.core.instrument.Timer;
+import java.time.Duration;
+import lombok.RequiredArgsConstructor;
+import lombok.extern.slf4j.Slf4j;
+import org.slf4j.event.Level;
+import org.slf4j.spi.LoggingEventBuilder;
+import org.springframework.stereotype.Component;
+
+/**
+ * Records each call to a dependency as the timer {@code external.call.duration} and the
+ * distribution summary {@code external.call.failure} (1 for a failure, 0 for a success), both
+ * tagged {@code dependency} and {@code operation}, and logs it with the ECS {@code event.*} fields.
+ * A failure's line also carries the ECS {@code error.type} and {@code error.message} fields.
+ */
+@Slf4j
+@Component
+@RequiredArgsConstructor
+public class ExternalCallRecorder {
+
+  static final String DEPENDENCY_TAG = "dependency";
+
+  private final MeterRegistry meterRegistry;
+
+  /**
+   * Records a call that succeeded.
+   *
+   * @param dependency the system called
+   * @param operation what was asked of it, from a fixed set
+   * @param elapsed how long the call took
+   */
+  public void recordSuccess(String dependency, String operation, Duration elapsed) {
+    recordMeters(dependency, operation, elapsed, 0);
+    logCall(Level.INFO, dependency + "/" + operation, "success", elapsed, null);
+  }
+
+  /**
+   * Records a call that failed.
+   *
+   * @param dependency the system called
+   * @param operation what was asked of it, from a fixed set
+   * @param elapsed how long the call took
+   * @param cause why it failed
+   */
+  public void recordFailure(
+      String dependency, String operation, Duration elapsed, Throwable cause) {
+    recordMeters(dependency, operation, elapsed, 1);
+    logCall(Level.WARN, dependency + "/" + operation, "failure", elapsed, cause);
+  }
+
+  private void recordMeters(String dependency, String operation, Duration elapsed, int failure) {
+    Tags tags = Tags.of(DEPENDENCY_TAG, dependency, "operation", operation);
+    Timer.builder("external.call.duration").tags(tags).register(meterRegistry).record(elapsed);
+    DistributionSummary.builder("external.call.failure")
+        .tags(tags)
+        .register(meterRegistry)
+        .record(failure);
+  }
+
+  private static void logCall(
+      Level level, String action, String outcome, Duration elapsed, Throwable cause) {
+    LoggingEventBuilder line =
+        log.atLevel(level)
+            .addKeyValue("event.category", "external-call")
+            .addKeyValue("event.action", action)
+            .addKeyValue("event.outcome", outcome)
+            .addKeyValue("event.duration", elapsed.toNanos());
+    if (cause != null) {
+      line.addKeyValue("error.type", cause.getClass().getName())
+          .addKeyValue("error.message", cause.getMessage());
+    }
+    line.log("External call {} {} in {} ms", action, outcome, elapsed.toMillis());
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import io.micrometer.core.instrument.DistributionSummary;
    4  import io.micrometer.core.instrument.MeterRegistry;
    5  import io.micrometer.core.instrument.Tags;
    6  import io.micrometer.core.instrument.Timer;
    7  import java.time.Duration;
    8  import lombok.RequiredArgsConstructor;
    9  import lombok.extern.slf4j.Slf4j;
   10  import org.slf4j.event.Level;
   11  import org.slf4j.spi.LoggingEventBuilder;
   12  import org.springframework.stereotype.Component;
   13  
   14  /**
   15   * Records each call to a dependency as the timer {@code external.call.duration} and the
   16   * distribution summary {@code external.call.failure} (1 for a failure, 0 for a success), both
   17   * tagged {@code dependency} and {@code operation}, and logs it with the ECS {@code event.*} fields.
   18   * A failure's line also carries the ECS {@code error.type} and {@code error.message} fields.
   19   */
   20  @Slf4j
   21  @Component
   22  @RequiredArgsConstructor
   23  public class ExternalCallRecorder {
   24  
   25    static final String DEPENDENCY_TAG = "dependency";
   26  
   27    private final MeterRegistry meterRegistry;
   28  
   29    /**
   30     * Records a call that succeeded.
   31     *
   32     * @param dependency the system called
   33     * @param operation what was asked of it, from a fixed set
   34     * @param elapsed how long the call took
   35     */
   36    public void recordSuccess(String dependency, String operation, Duration elapsed) {
   37      recordMeters(dependency, operation, elapsed, 0);
   38      logCall(Level.INFO, dependency + "/" + operation, "success", elapsed, null);
   39    }
   40  
   41    /**
   42     * Records a call that failed.
   43     *
   44     * @param dependency the system called
   45     * @param operation what was asked of it, from a fixed set
   46     * @param elapsed how long the call took
   47     * @param cause why it failed
   48     */
   49    public void recordFailure(
   50        String dependency, String operation, Duration elapsed, Throwable cause) {
   51      recordMeters(dependency, operation, elapsed, 1);
   52      logCall(Level.WARN, dependency + "/" + operation, "failure", elapsed, cause);
   53    }
   54  
   55    private void recordMeters(String dependency, String operation, Duration elapsed, int failure) {
   56      Tags tags = Tags.of(DEPENDENCY_TAG, dependency, "operation", operation);
   57      Timer.builder("external.call.duration").tags(tags).register(meterRegistry).record(elapsed);
   58      DistributionSummary.builder("external.call.failure")
   59          .tags(tags)
   60          .register(meterRegistry)
   61          .record(failure);
   62    }
   63  
   64    private static void logCall(
   65        Level level, String action, String outcome, Duration elapsed, Throwable cause) {
   66      LoggingEventBuilder line =
   67          log.atLevel(level)
   68              .addKeyValue("event.category", "external-call")
   69              .addKeyValue("event.action", action)
   70              .addKeyValue("event.outcome", outcome)
   71              .addKeyValue("event.duration", elapsed.toNanos());
   72      if (cause != null) {
   73        line.addKeyValue("error.type", cause.getClass().getName())
   74            .addKeyValue("error.message", cause.getMessage());
   75      }
   76      line.log("External call {} {} in {} ms", action, outcome, elapsed.toMillis());
   77    }
   78  }
```

## Source: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoAvailability.java`

Tested by:
- `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/MongoAvailabilityIT.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoAvailability.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoAvailability.java
new file mode 100644
index 0000000..72fb2c6
--- /dev/null
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoAvailability.java
@@ -0,0 +1,102 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import com.mongodb.ServerAddress;
+import com.mongodb.connection.ServerConnectionState;
+import com.mongodb.connection.ServerDescription;
+import com.mongodb.event.ClusterDescriptionChangedEvent;
+import com.mongodb.event.ClusterListener;
+import java.util.List;
+import java.util.Objects;
+import lombok.extern.slf4j.Slf4j;
+import org.springframework.stereotype.Component;
+
+/**
+ * Whether MongoDB is available, from the servers the driver monitors: available while a connected
+ * server accepts writes (a primary, standalone, mongos or load balancer), unavailable once every
+ * server has been checked and none accepts writes, and unknown while there are none or one has not
+ * been checked yet. Logs each change of state, naming the servers monitored.
+ */
+@Slf4j
+@Component
+public class MongoAvailability implements ClusterListener {
+
+  /** What the driver's checks say of the database. */
+  public enum State {
+    AVAILABLE,
+    UNAVAILABLE,
+    UNKNOWN
+  }
+
+  private volatile State state = State.UNKNOWN;
+
+  @Override
+  public synchronized void clusterDescriptionChanged(ClusterDescriptionChangedEvent event) {
+    List<ServerDescription> servers = event.getNewDescription().getServerDescriptions();
+    State reported = stateOf(servers);
+    if (reported == state) {
+      return;
+    }
+    state = reported;
+    switch (reported) {
+      case AVAILABLE -> log.info("MongoDB is available, servers {}", addressesOf(servers));
+      case UNAVAILABLE -> logUnavailable(servers);
+      case UNKNOWN ->
+          log.warn(
+              "MongoDB availability is unknown until every server is checked, servers {}",
+              addressesOf(servers));
+    }
+  }
+
+  private static State stateOf(List<ServerDescription> servers) {
+    if (servers.stream().anyMatch(MongoAvailability::acceptsWrites)) {
+      return State.AVAILABLE;
+    }
+    if (!servers.isEmpty() && servers.stream().allMatch(MongoAvailability::isChecked)) {
+      return State.UNAVAILABLE;
+    }
+    return State.UNKNOWN;
+  }
+
+  private static void logUnavailable(List<ServerDescription> servers) {
+    if (servers.stream().anyMatch(MongoAvailability::isConnected)) {
+      log.warn(
+          "MongoDB is unavailable: servers {} are connected but none accepts writes",
+          addressesOf(servers));
+    } else {
+      log.warn("MongoDB is unavailable, servers {}", addressesOf(servers), firstFailure(servers));
+    }
+  }
+
+  private static boolean acceptsWrites(ServerDescription server) {
+    return isConnected(server) && server.isPrimary();
+  }
+
+  private static boolean isChecked(ServerDescription server) {
+    return isConnected(server) || server.getException() != null;
+  }
+
+  private static boolean isConnected(ServerDescription server) {
+    return server.getState() == ServerConnectionState.CONNECTED;
+  }
+
+  private static List<ServerAddress> addressesOf(List<ServerDescription> servers) {
+    return servers.stream().map(ServerDescription::getAddress).toList();
+  }
+
+  private static Throwable firstFailure(List<ServerDescription> servers) {
+    return servers.stream()
+        .map(ServerDescription::getException)
+        .filter(Objects::nonNull)
+        .findFirst()
+        .orElse(null);
+  }
+
+  /**
+   * The database's state as of the driver's latest checks.
+   *
+   * @return the state
+   */
+  public State state() {
+    return state;
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import com.mongodb.ServerAddress;
    4  import com.mongodb.connection.ServerConnectionState;
    5  import com.mongodb.connection.ServerDescription;
    6  import com.mongodb.event.ClusterDescriptionChangedEvent;
    7  import com.mongodb.event.ClusterListener;
    8  import java.util.List;
    9  import java.util.Objects;
   10  import lombok.extern.slf4j.Slf4j;
   11  import org.springframework.stereotype.Component;
   12  
   13  /**
   14   * Whether MongoDB is available, from the servers the driver monitors: available while a connected
   15   * server accepts writes (a primary, standalone, mongos or load balancer), unavailable once every
   16   * server has been checked and none accepts writes, and unknown while there are none or one has not
   17   * been checked yet. Logs each change of state, naming the servers monitored.
   18   */
   19  @Slf4j
   20  @Component
   21  public class MongoAvailability implements ClusterListener {
   22  
   23    /** What the driver's checks say of the database. */
   24    public enum State {
   25      AVAILABLE,
   26      UNAVAILABLE,
   27      UNKNOWN
   28    }
   29  
   30    private volatile State state = State.UNKNOWN;
   31  
   32    @Override
   33    public synchronized void clusterDescriptionChanged(ClusterDescriptionChangedEvent event) {
   34      List<ServerDescription> servers = event.getNewDescription().getServerDescriptions();
   35      State reported = stateOf(servers);
   36      if (reported == state) {
   37        return;
   38      }
   39      state = reported;
   40      switch (reported) {
   41        case AVAILABLE -> log.info("MongoDB is available, servers {}", addressesOf(servers));
   42        case UNAVAILABLE -> logUnavailable(servers);
   43        case UNKNOWN ->
   44            log.warn(
   45                "MongoDB availability is unknown until every server is checked, servers {}",
   46                addressesOf(servers));
   47      }
   48    }
   49  
   50    private static State stateOf(List<ServerDescription> servers) {
   51      if (servers.stream().anyMatch(MongoAvailability::acceptsWrites)) {
   52        return State.AVAILABLE;
   53      }
   54      if (!servers.isEmpty() && servers.stream().allMatch(MongoAvailability::isChecked)) {
   55        return State.UNAVAILABLE;
   56      }
   57      return State.UNKNOWN;
   58    }
   59  
   60    private static void logUnavailable(List<ServerDescription> servers) {
   61      if (servers.stream().anyMatch(MongoAvailability::isConnected)) {
   62        log.warn(
   63            "MongoDB is unavailable: servers {} are connected but none accepts writes",
   64            addressesOf(servers));
   65      } else {
   66        log.warn("MongoDB is unavailable, servers {}", addressesOf(servers), firstFailure(servers));
   67      }
   68    }
   69  
   70    private static boolean acceptsWrites(ServerDescription server) {
   71      return isConnected(server) && server.isPrimary();
   72    }
   73  
   74    private static boolean isChecked(ServerDescription server) {
   75      return isConnected(server) || server.getException() != null;
   76    }
   77  
   78    private static boolean isConnected(ServerDescription server) {
   79      return server.getState() == ServerConnectionState.CONNECTED;
   80    }
   81  
   82    private static List<ServerAddress> addressesOf(List<ServerDescription> servers) {
   83      return servers.stream().map(ServerDescription::getAddress).toList();
   84    }
   85  
   86    private static Throwable firstFailure(List<ServerDescription> servers) {
   87      return servers.stream()
   88          .map(ServerDescription::getException)
   89          .filter(Objects::nonNull)
   90          .findFirst()
   91          .orElse(null);
   92    }
   93  
   94    /**
   95     * The database's state as of the driver's latest checks.
   96     *
   97     * @return the state
   98     */
   99    public State state() {
  100      return state;
  101    }
  102  }
```

## Source: `src/main/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoder.java`

Tested by:
- `src/test/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoderTest.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoder.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoder.java
new file mode 100644
index 0000000..d132193
--- /dev/null
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoder.java
@@ -0,0 +1,84 @@
+package uk.gov.defra.trade.imports.addressbook.logging;
+
+import ch.qos.logback.classic.spi.ILoggingEvent;
+import co.elastic.logging.JsonUtils;
+import co.elastic.logging.logback.EcsEncoder;
+import java.util.List;
+import org.slf4j.event.KeyValuePair;
+
+/**
+ * The ECS encoder, plus a nested {@code event} object built from the line's {@code event.*}
+ * key-value pairs. A {@link Number} value is written as a JSON number, and a non-finite one as a
+ * string. The line's {@code error.*} key-value pairs are written as top-level fields, unless the
+ * line carries a throwable, whose own ECS {@code error.*} fields are written instead. A line with
+ * no {@code event.*} or {@code error.*} key-value pairs is written exactly as the ECS encoder
+ * writes it.
+ */
+public class EcsEventEncoder extends EcsEncoder {
+
+  private static final String EVENT_PREFIX = "event.";
+  private static final String ERROR_PREFIX = "error.";
+
+  @Override
+  protected void addCustomFields(ILoggingEvent event, StringBuilder builder) {
+    super.addCustomFields(event, builder);
+    appendEventObject(fieldsStartingWith(EVENT_PREFIX, event), builder);
+    if (event.getThrowableProxy() == null) {
+      appendFlatFields(fieldsStartingWith(ERROR_PREFIX, event), builder);
+    }
+  }
+
+  private static void appendEventObject(List<KeyValuePair> eventFields, StringBuilder builder) {
+    if (eventFields.isEmpty()) {
+      return;
+    }
+    builder.append("\"event\":{");
+    for (KeyValuePair field : eventFields) {
+      appendField(field.key.substring(EVENT_PREFIX.length()), field.value, builder);
+    }
+    builder.setLength(builder.length() - 1);
+    builder.append("},");
+  }
+
+  private static void appendFlatFields(List<KeyValuePair> fields, StringBuilder builder) {
+    for (KeyValuePair field : fields) {
+      appendField(field.key, field.value, builder);
+    }
+  }
+
+  private static void appendField(String key, Object value, StringBuilder builder) {
+    builder.append('"');
+    JsonUtils.quoteAsString(key, builder);
+    builder.append("\":");
+    appendValue(value, builder);
+    builder.append(',');
+  }
+
+  private static List<KeyValuePair> fieldsStartingWith(String prefix, ILoggingEvent event) {
+    List<KeyValuePair> pairs = event.getKeyValuePairs();
+    if (pairs == null) {
+      return List.of();
+    }
+    return pairs.stream().filter(pair -> pair.key.startsWith(prefix)).toList();
+  }
+
+  private static void appendValue(Object value, StringBuilder builder) {
+    if (value == null) {
+      builder.append("null");
+    } else if (value instanceof Number number && isFinite(number)) {
+      builder.append(number);
+    } else {
+      builder.append('"');
+      JsonUtils.quoteAsString(value.toString(), builder);
+      builder.append('"');
+    }
+  }
+
+  private static boolean isFinite(Number number) {
+    return switch (number) {
+      case Double d -> Double.isFinite(d);
+      case Float f -> Float.isFinite(f);
+      default -> true;
+    };
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.logging;
    2  
    3  import ch.qos.logback.classic.spi.ILoggingEvent;
    4  import co.elastic.logging.JsonUtils;
    5  import co.elastic.logging.logback.EcsEncoder;
    6  import java.util.List;
    7  import org.slf4j.event.KeyValuePair;
    8  
    9  /**
   10   * The ECS encoder, plus a nested {@code event} object built from the line's {@code event.*}
   11   * key-value pairs. A {@link Number} value is written as a JSON number, and a non-finite one as a
   12   * string. The line's {@code error.*} key-value pairs are written as top-level fields, unless the
   13   * line carries a throwable, whose own ECS {@code error.*} fields are written instead. A line with
   14   * no {@code event.*} or {@code error.*} key-value pairs is written exactly as the ECS encoder
   15   * writes it.
   16   */
   17  public class EcsEventEncoder extends EcsEncoder {
   18  
   19    private static final String EVENT_PREFIX = "event.";
   20    private static final String ERROR_PREFIX = "error.";
   21  
   22    @Override
   23    protected void addCustomFields(ILoggingEvent event, StringBuilder builder) {
   24      super.addCustomFields(event, builder);
   25      appendEventObject(fieldsStartingWith(EVENT_PREFIX, event), builder);
   26      if (event.getThrowableProxy() == null) {
   27        appendFlatFields(fieldsStartingWith(ERROR_PREFIX, event), builder);
   28      }
   29    }
   30  
   31    private static void appendEventObject(List<KeyValuePair> eventFields, StringBuilder builder) {
   32      if (eventFields.isEmpty()) {
   33        return;
   34      }
   35      builder.append("\"event\":{");
   36      for (KeyValuePair field : eventFields) {
   37        appendField(field.key.substring(EVENT_PREFIX.length()), field.value, builder);
   38      }
   39      builder.setLength(builder.length() - 1);
   40      builder.append("},");
   41    }
   42  
   43    private static void appendFlatFields(List<KeyValuePair> fields, StringBuilder builder) {
   44      for (KeyValuePair field : fields) {
   45        appendField(field.key, field.value, builder);
   46      }
   47    }
   48  
   49    private static void appendField(String key, Object value, StringBuilder builder) {
   50      builder.append('"');
   51      JsonUtils.quoteAsString(key, builder);
   52      builder.append("\":");
   53      appendValue(value, builder);
   54      builder.append(',');
   55    }
   56  
   57    private static List<KeyValuePair> fieldsStartingWith(String prefix, ILoggingEvent event) {
   58      List<KeyValuePair> pairs = event.getKeyValuePairs();
   59      if (pairs == null) {
   60        return List.of();
   61      }
   62      return pairs.stream().filter(pair -> pair.key.startsWith(prefix)).toList();
   63    }
   64  
   65    private static void appendValue(Object value, StringBuilder builder) {
   66      if (value == null) {
   67        builder.append("null");
   68      } else if (value instanceof Number number && isFinite(number)) {
   69        builder.append(number);
   70      } else {
   71        builder.append('"');
   72        JsonUtils.quoteAsString(value.toString(), builder);
   73        builder.append('"');
   74      }
   75    }
   76  
   77    private static boolean isFinite(Number number) {
   78      return switch (number) {
   79        case Double d -> Double.isFinite(d);
   80        case Float f -> Float.isFinite(f);
   81        default -> true;
   82      };
   83    }
   84  }
```

## Source: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetrics.java`

Tested by:
- `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetricsTest.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetrics.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetrics.java
new file mode 100644
index 0000000..82100c1
--- /dev/null
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetrics.java
@@ -0,0 +1,30 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import io.micrometer.core.instrument.Gauge;
+import io.micrometer.core.instrument.MeterRegistry;
+import org.springframework.stereotype.Component;
+
+/**
+ * Registers the gauge {@code external.dependency.available}, tagged {@code dependency}: 1 while the
+ * dependency is available, 0 while it is not, and NaN while unknown.
+ */
+@Component
+public class DependencyAvailabilityMetrics {
+
+  DependencyAvailabilityMetrics(MeterRegistry meterRegistry, MongoAvailability mongoAvailability) {
+    Gauge.builder(
+            "external.dependency.available",
+            mongoAvailability,
+            availability -> gaugeValueOf(availability.state()))
+        .tag(ExternalCallRecorder.DEPENDENCY_TAG, MongoCommandMetrics.DEPENDENCY)
+        .register(meterRegistry);
+  }
+
+  private static double gaugeValueOf(MongoAvailability.State state) {
+    return switch (state) {
+      case AVAILABLE -> 1;
+      case UNAVAILABLE -> 0;
+      case UNKNOWN -> Double.NaN;
+    };
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import io.micrometer.core.instrument.Gauge;
    4  import io.micrometer.core.instrument.MeterRegistry;
    5  import org.springframework.stereotype.Component;
    6  
    7  /**
    8   * Registers the gauge {@code external.dependency.available}, tagged {@code dependency}: 1 while the
    9   * dependency is available, 0 while it is not, and NaN while unknown.
   10   */
   11  @Component
   12  public class DependencyAvailabilityMetrics {
   13  
   14    DependencyAvailabilityMetrics(MeterRegistry meterRegistry, MongoAvailability mongoAvailability) {
   15      Gauge.builder(
   16              "external.dependency.available",
   17              mongoAvailability,
   18              availability -> gaugeValueOf(availability.state()))
   19          .tag(ExternalCallRecorder.DEPENDENCY_TAG, MongoCommandMetrics.DEPENDENCY)
   20          .register(meterRegistry);
   21    }
   22  
   23    private static double gaugeValueOf(MongoAvailability.State state) {
   24      return switch (state) {
   25        case AVAILABLE -> 1;
   26        case UNAVAILABLE -> 0;
   27        case UNKNOWN -> Double.NaN;
   28      };
   29    }
   30  }
```

## Source: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistry.java`

Tested by:
- `src/test/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistryTest.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistry.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistry.java
new file mode 100644
index 0000000..b887145
--- /dev/null
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistry.java
@@ -0,0 +1,164 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import io.micrometer.core.instrument.Clock;
+import io.micrometer.core.instrument.Counter;
+import io.micrometer.core.instrument.DistributionSummary;
+import io.micrometer.core.instrument.Gauge;
+import io.micrometer.core.instrument.Meter;
+import io.micrometer.core.instrument.Tag;
+import io.micrometer.core.instrument.TimeGauge;
+import io.micrometer.core.instrument.Timer;
+import io.micrometer.core.instrument.distribution.DistributionStatisticConfig;
+import io.micrometer.core.instrument.distribution.HistogramGauges;
+import io.micrometer.core.instrument.distribution.pause.PauseDetector;
+import io.micrometer.core.instrument.step.StepMeterRegistry;
+import io.micrometer.core.instrument.step.StepRegistryConfig;
+import java.time.Duration;
+import java.util.List;
+import java.util.concurrent.TimeUnit;
+import java.util.function.Supplier;
+import lombok.extern.slf4j.Slf4j;
+import software.amazon.cloudwatchlogs.emf.logger.MetricsLogger;
+import software.amazon.cloudwatchlogs.emf.model.DimensionSet;
+import software.amazon.cloudwatchlogs.emf.model.Unit;
+
+/**
+ * Publishes every meter to CloudWatch as Embedded Metric Format, once a step, in one namespace. A
+ * meter's tags are its only dimensions.
+ *
+ * <p>Timers and distribution summaries publish every value recorded since the last publish, timers
+ * in milliseconds. Counters publish the last step's count. Gauges publish their value when it is
+ * finite. Long task timers, function counters, function timers and time gauges are not published.
+ * A meter that fails to publish is logged and the rest are still published.
+ */
+@Slf4j
+public class EmfMeterRegistry extends StepMeterRegistry {
+
+  private final Duration step;
+  private final String namespace;
+  private final Supplier<MetricsLogger> metricsLoggers;
+
+  /**
+   * Creates the registry. It publishes nothing until {@link #start} is called.
+   *
+   * @param namespace the CloudWatch namespace
+   * @param step how often the registry publishes
+   * @param clock the clock the meters step by
+   * @param metricsLoggers supplies a fresh logger for each meter published
+   */
+  public EmfMeterRegistry(
+      String namespace, Duration step, Clock clock, Supplier<MetricsLogger> metricsLoggers) {
+    super(stepsOf(step), clock);
+    this.step = step;
+    this.namespace = namespace;
+    this.metricsLoggers = metricsLoggers;
+  }
+
+  private static StepRegistryConfig stepsOf(Duration step) {
+    return new StepRegistryConfig() {
+      @Override
+      public String prefix() {
+        return "emf";
+      }
+
+      @Override
+      public String get(String key) {
+        return null;
+      }
+
+      @Override
+      public Duration step() {
+        return step;
+      }
+    };
+  }
+
+  @Override
+  protected TimeUnit getBaseTimeUnit() {
+    return TimeUnit.MILLISECONDS;
+  }
+
+  @Override
+  protected Timer newTimer(
+      Meter.Id id,
+      DistributionStatisticConfig distributionStatisticConfig,
+      PauseDetector pauseDetector) {
+    Timer timer =
+        new ValueRecordingTimer(
+            id,
+            clock,
+            distributionStatisticConfig,
+            pauseDetector,
+            getBaseTimeUnit(),
+            step.toMillis());
+    HistogramGauges.registerWithCommonFormat(timer, this);
+    return timer;
+  }
+
+  @Override
+  protected DistributionSummary newDistributionSummary(
+      Meter.Id id, DistributionStatisticConfig distributionStatisticConfig, double scale) {
+    DistributionSummary summary =
+        new ValueRecordingDistributionSummary(
+            id, clock, distributionStatisticConfig, scale, step.toMillis());
+    HistogramGauges.registerWithCommonFormat(summary, this);
+    return summary;
+  }
+
+  @Override
+  protected void publish() {
+    for (Meter meter : getMeters()) {
+      try {
+        publishReadings(meter, readingsOf(meter));
+      } catch (RuntimeException e) {
+        log.warn("Could not publish meter {}", meter.getId().getName(), e);
+      }
+    }
+  }
+
+  private record Readings(List<Double> values, Unit unit) {
+    static final Readings NONE = new Readings(List.of(), Unit.NONE);
+  }
+
+  private static Readings readingsOf(Meter meter) {
+    return switch (meter) {
+      case ValueRecordingTimer timer ->
+          new Readings(millisOf(timer.recordedNanos().takeAll()), Unit.MILLISECONDS);
+      case ValueRecordingDistributionSummary summary ->
+          new Readings(summary.recordedAmounts().takeAll(), Unit.NONE);
+      case Counter counter -> new Readings(List.of(counter.count()), Unit.COUNT);
+      case TimeGauge _ -> Readings.NONE;
+      case Gauge gauge -> new Readings(finiteValueOf(gauge), Unit.NONE);
+      default -> Readings.NONE;
+    };
+  }
+
+  private static List<Double> millisOf(List<Double> nanos) {
+    return nanos.stream().map(each -> each / TimeUnit.MILLISECONDS.toNanos(1)).toList();
+  }
+
+  private static List<Double> finiteValueOf(Gauge gauge) {
+    double value = gauge.value();
+    return Double.isFinite(value) ? List.of(value) : List.of();
+  }
+
+  private void publishReadings(Meter meter, Readings readings) {
+    if (readings.values().isEmpty()) {
+      return;
+    }
+    MetricsLogger metricsLogger = metricsLoggers.get();
+    metricsLogger.setNamespace(namespace);
+    metricsLogger.setDimensions(false, dimensionsOf(meter.getId()));
+    String name = meter.getId().getName();
+    readings.values().forEach(value -> metricsLogger.putMetric(name, value, readings.unit()));
+    metricsLogger.flush();
+  }
+
+  private static DimensionSet dimensionsOf(Meter.Id id) {
+    DimensionSet dimensions = new DimensionSet();
+    for (Tag tag : id.getTagsAsIterable()) {
+      dimensions.addDimension(tag.getKey(), tag.getValue());
+    }
+    return dimensions;
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import io.micrometer.core.instrument.Clock;
    4  import io.micrometer.core.instrument.Counter;
    5  import io.micrometer.core.instrument.DistributionSummary;
    6  import io.micrometer.core.instrument.Gauge;
    7  import io.micrometer.core.instrument.Meter;
    8  import io.micrometer.core.instrument.Tag;
    9  import io.micrometer.core.instrument.TimeGauge;
   10  import io.micrometer.core.instrument.Timer;
   11  import io.micrometer.core.instrument.distribution.DistributionStatisticConfig;
   12  import io.micrometer.core.instrument.distribution.HistogramGauges;
   13  import io.micrometer.core.instrument.distribution.pause.PauseDetector;
   14  import io.micrometer.core.instrument.step.StepMeterRegistry;
   15  import io.micrometer.core.instrument.step.StepRegistryConfig;
   16  import java.time.Duration;
   17  import java.util.List;
   18  import java.util.concurrent.TimeUnit;
   19  import java.util.function.Supplier;
   20  import lombok.extern.slf4j.Slf4j;
   21  import software.amazon.cloudwatchlogs.emf.logger.MetricsLogger;
   22  import software.amazon.cloudwatchlogs.emf.model.DimensionSet;
   23  import software.amazon.cloudwatchlogs.emf.model.Unit;
   24  
   25  /**
   26   * Publishes every meter to CloudWatch as Embedded Metric Format, once a step, in one namespace. A
   27   * meter's tags are its only dimensions.
   28   *
   29   * <p>Timers and distribution summaries publish every value recorded since the last publish, timers
   30   * in milliseconds. Counters publish the last step's count. Gauges publish their value when it is
   31   * finite. Long task timers, function counters, function timers and time gauges are not published.
   32   * A meter that fails to publish is logged and the rest are still published.
   33   */
   34  @Slf4j
   35  public class EmfMeterRegistry extends StepMeterRegistry {
   36  
   37    private final Duration step;
   38    private final String namespace;
   39    private final Supplier<MetricsLogger> metricsLoggers;
   40  
   41    /**
   42     * Creates the registry. It publishes nothing until {@link #start} is called.
   43     *
   44     * @param namespace the CloudWatch namespace
   45     * @param step how often the registry publishes
   46     * @param clock the clock the meters step by
   47     * @param metricsLoggers supplies a fresh logger for each meter published
   48     */
   49    public EmfMeterRegistry(
   50        String namespace, Duration step, Clock clock, Supplier<MetricsLogger> metricsLoggers) {
   51      super(stepsOf(step), clock);
   52      this.step = step;
   53      this.namespace = namespace;
   54      this.metricsLoggers = metricsLoggers;
   55    }
   56  
   57    private static StepRegistryConfig stepsOf(Duration step) {
   58      return new StepRegistryConfig() {
   59        @Override
   60        public String prefix() {
   61          return "emf";
   62        }
   63  
   64        @Override
   65        public String get(String key) {
   66          return null;
   67        }
   68  
   69        @Override
   70        public Duration step() {
   71          return step;
   72        }
   73      };
   74    }
   75  
   76    @Override
   77    protected TimeUnit getBaseTimeUnit() {
   78      return TimeUnit.MILLISECONDS;
   79    }
   80  
   81    @Override
   82    protected Timer newTimer(
   83        Meter.Id id,
   84        DistributionStatisticConfig distributionStatisticConfig,
   85        PauseDetector pauseDetector) {
   86      Timer timer =
   87          new ValueRecordingTimer(
   88              id,
   89              clock,
   90              distributionStatisticConfig,
   91              pauseDetector,
   92              getBaseTimeUnit(),
   93              step.toMillis());
   94      HistogramGauges.registerWithCommonFormat(timer, this);
   95      return timer;
   96    }
   97  
   98    @Override
   99    protected DistributionSummary newDistributionSummary(
  100        Meter.Id id, DistributionStatisticConfig distributionStatisticConfig, double scale) {
  101      DistributionSummary summary =
  102          new ValueRecordingDistributionSummary(
  103              id, clock, distributionStatisticConfig, scale, step.toMillis());
  104      HistogramGauges.registerWithCommonFormat(summary, this);
  105      return summary;
  106    }
  107  
  108    @Override
  109    protected void publish() {
  110      for (Meter meter : getMeters()) {
  111        try {
  112          publishReadings(meter, readingsOf(meter));
  113        } catch (RuntimeException e) {
  114          log.warn("Could not publish meter {}", meter.getId().getName(), e);
  115        }
  116      }
  117    }
  118  
  119    private record Readings(List<Double> values, Unit unit) {
  120      static final Readings NONE = new Readings(List.of(), Unit.NONE);
  121    }
  122  
  123    private static Readings readingsOf(Meter meter) {
  124      return switch (meter) {
  125        case ValueRecordingTimer timer ->
  126            new Readings(millisOf(timer.recordedNanos().takeAll()), Unit.MILLISECONDS);
  127        case ValueRecordingDistributionSummary summary ->
  128            new Readings(summary.recordedAmounts().takeAll(), Unit.NONE);
  129        case Counter counter -> new Readings(List.of(counter.count()), Unit.COUNT);
  130        case TimeGauge _ -> Readings.NONE;
  131        case Gauge gauge -> new Readings(finiteValueOf(gauge), Unit.NONE);
  132        default -> Readings.NONE;
  133      };
  134    }
  135  
  136    private static List<Double> millisOf(List<Double> nanos) {
  137      return nanos.stream().map(each -> each / TimeUnit.MILLISECONDS.toNanos(1)).toList();
  138    }
  139  
  140    private static List<Double> finiteValueOf(Gauge gauge) {
  141      double value = gauge.value();
  142      return Double.isFinite(value) ? List.of(value) : List.of();
  143    }
  144  
  145    private void publishReadings(Meter meter, Readings readings) {
  146      if (readings.values().isEmpty()) {
  147        return;
  148      }
  149      MetricsLogger metricsLogger = metricsLoggers.get();
  150      metricsLogger.setNamespace(namespace);
  151      metricsLogger.setDimensions(false, dimensionsOf(meter.getId()));
  152      String name = meter.getId().getName();
  153      readings.values().forEach(value -> metricsLogger.putMetric(name, value, readings.unit()));
  154      metricsLogger.flush();
  155    }
  156  
  157    private static DimensionSet dimensionsOf(Meter.Id id) {
  158      DimensionSet dimensions = new DimensionSet();
  159      for (Tag tag : id.getTagsAsIterable()) {
  160        dimensions.addDimension(tag.getKey(), tag.getValue());
  161      }
  162      return dimensions;
  163    }
  164  }
```

## Guides

### Source: `docs/best-practices/java/testing/unit.md`

# Unit Testing — trade-imports-animals-backend

## Overview

Unit tests run in isolation — no Spring context, no database, no HTTP server. External dependencies are replaced with Mockito mocks. Tests execute in the Maven `test` phase via Surefire.

**Run with:**
```bash
mvn test             # unit tests only
mvn verify           # unit + integration tests
```

`mvn test` runs no `*IT` class. Before calling a backend change done, run `mvn verify`, with Docker running for Testcontainers.

---

## File naming convention

| Pattern | Runner | Phase |
|---------|--------|-------|
| `*Test.java` | Maven Surefire | `test` |
| `*IT.java` | Maven Failsafe | `integration-test` / `verify` |

No `@Tag` or `@Category` annotations are used. The `Test` suffix is the only distinction.

---

## Test types

There are three distinct flavours of unit test in this codebase:

| Approach | When to use |
|----------|-------------|
| Pure unit — direct instantiation | Services, exception handlers, interceptors, config classes with no Spring dependencies |
| `@WebMvcTest` slice | Controllers — exercises the full Spring MVC dispatch chain without a real server |
| Annotation-contract tests | Verifying that production classes carry required annotations (`@ConditionalOnProperty`, `@Scheduled`, etc.) |

---

## Pure unit tests

### Setup pattern

Construct the class under test in `@BeforeEach` using its real constructor. Never use `@InjectMocks` — explicit construction makes dependencies visible and avoids silent injection failures.

```java
@ExtendWith(MockitoExtension.class)
class NotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private AuditRepository auditRepository;

    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationService = new NotificationService(notificationRepository, auditRepository);
    }
}
```

Use `@ExtendWith(MockitoExtension.class)` whenever the class under test has collaborators that need mocking. For classes with no dependencies (e.g. a simple exception handler), omit the extension and instantiate directly:

```java
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler exceptionHandler;

    @BeforeEach
    void setUp() {
        exceptionHandler = new GlobalExceptionHandler();
    }
}
```

### Mocks

Mock only at the edge of the service: a repository (the database), an HTTP or SDK client (the network), the clock. Never mock a class of your own that holds logic, such as a mapper, a validator or a rule class: construct the real one, so the test covers it too. A collaborator service that itself only fronts an edge, such as a document service over S3, may be mocked where its calls are the side effect under test.

Declare mocks as fields with `@Mock`. Use inline `mock()` only for objects that are local to a single test (e.g. a `BindingResult` created by a test helper):

```java
// Field mock — used across multiple tests
@Mock
private NotificationRepository notificationRepository;

// Inline mock — local to one test or helper
BindingResult bindingResult = mock(BindingResult.class);
when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldErrors));
```

Use `lenient()` stubs in `@BeforeEach` for stubs that not every test exercises — this avoids `UnnecessaryStubbingException` without suppressing the extension:

```java
@BeforeEach
void setUp() throws IOException {
    interceptor = new TraceIdPropagationInterceptor("x-cdp-request-id");
    headers = new HttpHeaders();
    lenient().when(request.getHeaders()).thenReturn(headers);
    lenient().when(execution.execute(any(), any())).thenReturn(response);
}
```

### What to assert — behaviour, not mock interactions

Tests must assert **observable behaviour**: the return value of the method under test, or the state it produces. Do not write tests whose primary assertion is that a mock was called.

**Bad — testing that the mock works as configured:**
```java
// This test would pass even if the production code did nothing useful.
// It just proves that when(repo.save(...)).thenReturn(x) works.
when(repository.save(any())).thenReturn(savedDoc);
service.initiate(ref, request);
ArgumentCaptor<MyDocument> captor = ArgumentCaptor.forClass(MyDocument.class);
verify(repository).save(captor.capture());
assertThat(captor.getValue().getStatus()).isEqualTo(Status.PENDING); // ← mock input, not behaviour
```

**Good — asserting on what the caller receives:**
```java
DocumentUploadResponse response = service.initiate(ref, request);
assertThat(response.uploadId()).isEqualTo("expected-id");
assertThat(response.uploadUrl()).isEqualTo("https://expected-url");
```

**The rule:** if deleting the production code (or making it return a hardcoded wrong value) would still let the test pass, the test is not testing behaviour.

**When `verify()` is acceptable:**

- As a *secondary* check after a meaningful result assertion: fine
- To assert something was *never* called (guards against unwanted side effects): fine
- As the *sole* assertion — only if the method is `void` **and** the side-effect genuinely cannot be observed any other way. In practice this is rare: prefer integration tests with a real database over unit tests that capture mock inputs.

```java
// Fine — secondary verify after a meaningful assertion
assertThat(response.uploadId()).isEqualTo("existing-upload-id");
verify(cdpUploaderClient, never()).initiate(any()); // idempotency guard

// Fine — void method, guarding against unwanted save
verify(repository, never()).save(any());
```

**`void` methods that persist to a database**: if the only way to verify correctness is to inspect what was passed to `repository.save()`, that is a signal to write an integration test instead — not to add an ArgumentCaptor. The IT tests in this project use a real MongoDB container precisely for this reason.

### ArgumentCaptor

Use `ArgumentCaptor` when you need to make assertions on a complex object passed to a collaborator, **and** you have already established that the method produces a correct observable result. Never use it as a substitute for a result assertion.

Prefer `ArgumentCaptor.forClass()` declared inline for one-off captures. For tests that capture repeatedly, declare `@Captor` fields:

```java
// Inline — for a single capture assertion
ArgumentCaptor<Audit> auditCaptor = ArgumentCaptor.forClass(Audit.class);
verify(auditRepository).save(auditCaptor.capture());
Audit saved = auditCaptor.getValue();
assertThat(saved.getResult()).isEqualTo(Result.SUCCESS);

// Field — when capture is needed across multiple tests
@Captor private ArgumentCaptor<HttpRequest> requestCaptor;
@Captor private ArgumentCaptor<byte[]> bodyCaptor;
```

### State cleanup

If a test modifies global state (e.g. SLF4J MDC), clean it up in `@AfterEach`:

```java
@AfterEach
void tearDown() {
    MDC.clear();
}
```

---

## Controller tests — `@WebMvcTest`

Use `@WebMvcTest` (not `@SpringBootTest`) for controller unit tests. It starts the Spring MVC layer only — no database, no full context. MockMvc is auto-configured.

Wire the admin secret via `@TestPropertySource` so the security filter has a value to compare:

```java
@WebMvcTest(NotificationController.class)
@TestPropertySource(properties = "admin.secret=test-secret")
class NotificationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private NotificationService notificationService;
}
```

Use `@MockitoBean` (not `@Mock`) for service dependencies — Spring needs to inject these into the controller bean.

### HTTP assertions

```java
// GET list
mockMvc.perform(get("/notifications")
        .contentType(MediaType.APPLICATION_JSON))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$").isArray())
    .andExpect(jsonPath("$.length()").value(2))
    .andExpect(jsonPath("$[0].id").value("507f1f77bcf86cd799439011"));

// POST with body
mockMvc.perform(post("/notifications")
        .contentType(MediaType.APPLICATION_JSON)
        .content(objectMapper.writeValueAsString(dto)))
    .andExpect(status().isOk())
    .andExpect(jsonPath("$.referenceNumber").value(expectedRef));

// DELETE with header
mockMvc.perform(delete("/notifications")
        .contentType(MediaType.APPLICATION_JSON)
        .header("Trade-Imports-Animals-Admin-Secret", "test-secret")
        .content(objectMapper.writeValueAsString(referenceNumbers)))
    .andExpect(status().isNoContent());
```

`@WebMvcTest` also exercises `@ControllerAdvice` handlers. Use it to verify that exceptions thrown by mocked services map to the correct HTTP status codes — this is cheaper than an integration test for basic exception-to-status mapping:

```java
// Validates that NotFoundException → 404 through GlobalExceptionHandler
doThrow(new NotFoundException("not found"))
    .when(notificationService).deleteByReferenceNumbers(any(), any());

mockMvc.perform(delete("/notifications")...)
    .andExpect(status().isNotFound())
    .andExpect(jsonPath("$.detail").value("not found"));
```

---

## Annotation-contract tests

When a production class must carry specific annotations for the application to work correctly (e.g. `@Scheduled`, `@ConditionalOnProperty`), verify this with reflection. Prefer this over integration tests for annotation presence — it runs faster and fails with a clear message.

```java
@Test
void metricsPublisher_shouldHaveScheduledAnnotation() {
    Method publishMethod = EmfMetricsPublisher.class.getMethod("publishMetrics");
    Scheduled scheduled = publishMethod.getAnnotation(Scheduled.class);
    assertThat(scheduled).isNotNull();
    assertThat(scheduled.fixedRate()).isEqualTo(60000L);
}
```

---

## Test method naming

```
{subject}_{shouldDoWhat}
{subject}_{shouldDoWhat}_{whenContext}
```

Use the method name or operation as the subject prefix. Examples:

```
saveOriginOfImport_shouldSaveNewNotificationAndGenerateReferenceNumber
saveOriginOfImport_shouldUpdateExistingNotification
findAll_shouldReturnEmptyList
deleteByReferenceNumbers_shouldThrowNotFoundException_whenOneIsMissing
handleValidationException_shouldReturnBadRequestWithFieldErrors
handleValidationException_shouldHandleNullTraceId
intercept_shouldAddTraceIdHeader_whenMdcContainsTraceId
intercept_shouldNotAddHeader_whenMdcTraceIdIsBlank
post_shouldCreateNotificationAndReturnReferenceNumber
delete_shouldReturn401_whenAdminSecretHeaderIsMissing
```

Do not use `testXxx()` naming — this is an older JUnit 3 convention found in some tests but it is not the standard going forward.

---

## Test titles and layout

### The title states what the assertions prove

Read the assertions, then write the title from them. A title that claims more than the assertions check is a defect in that test, not a naming preference.

Bad: titled `submit_shouldSetStatusToSubmitted`, while the only assertion is `isEqualTo(SUBMITTED_ACTION_REQUIRED)`. A reader trusts the title and believes a plain submit is covered.

Good: `submit_shouldRequireActionWhenAHealthCertificateIsOutstanding`, with a fixture that has an outstanding health certificate.

Do not copy an acceptance criterion into the title when the body tests a stand-in for it (a draft fixture standing in for a submitted one, say). Either test the real case or name the stand-in.

### The test fails without the change it covers

Before you call a test done, undo the production change it covers (or invert the condition it guards), run the test and see it fail. Restore the change and see it pass. A test that stays green against the old code proves nothing about the new code: fix the assertion, or delete the test and the code it was meant to cover.

### No tests that pin diagnostic log lines

Do not write a test that pins a diagnostic, spike or temporary log line, its level or its fields. Coverage work tests the outcome the branch changes, not the line that reports it. A log line is pinned only when support depends on it: an outcome-changing branch that must log its ids.

### Layout: no Given / When / Then comments

Do not write `// Given`, `// When`, `// Then` or `// And` comments. Separate set-up, action and assertions with a blank line. When set-up is long enough to need a label, extract it into a named helper (`givenNotificationWithOutstandingCertificate()`) so the name does the labelling.

One behaviour per test. If you need a second `// Then`, you have a second test.

Bad: one test, two behaviours, and a title that names only the first:

```java
@Test
void deleteByReferenceNumbers_shouldDeleteAll_whenAllFound() {
    // Given
    String ref1 = "DRAFT.IMP.2026.111";
    Notification n1 = Notification.builder().id("111").referenceNumber(ref1).build();
    when(notificationRepository.findAllByReferenceNumberIn(List.of(ref1))).thenReturn(List.of(n1));
    when(auditRepository.save(any(Audit.class))).thenReturn(new Audit());

    // When
    notificationService.deleteByReferenceNumbers(List.of(ref1), headers);

    // Then — deleteAll is called with the found notifications
    verify(notificationRepository).deleteAll(List.of(n1));

    // And an audit record is saved with SUCCESS
    ArgumentCaptor<Audit> auditCaptor = ArgumentCaptor.forClass(Audit.class);
    verify(auditRepository).save(auditCaptor.capture());
    assertThat(auditCaptor.getValue().getResult()).isEqualTo(Result.SUCCESS);
}
```

Good: two tests, a shared helper for the set-up, blank lines for structure:

```java
@Test
void deleteByReferenceNumbers_shouldDeleteTheFoundNotifications() {
    Notification notification = givenStoredNotification("DRAFT.IMP.2026.111");

    notificationService.deleteByReferenceNumbers(List.of("DRAFT.IMP.2026.111"), headers);

    verify(notificationRepository).deleteAll(List.of(notification));
}

@Test
void deleteByReferenceNumbers_shouldAuditSuccess_whenAllFound() {
    givenStoredNotification("DRAFT.IMP.2026.111");

    notificationService.deleteByReferenceNumbers(List.of("DRAFT.IMP.2026.111"), headers);

    ArgumentCaptor<Audit> auditCaptor = ArgumentCaptor.forClass(Audit.class);
    verify(auditRepository).save(auditCaptor.capture());
    assertThat(auditCaptor.getValue().getResult()).isEqualTo(Result.SUCCESS);
}
```

A multi-step flow (create, then update, then delete) is one test per step, each setting up its own state through a helper. One long flow test fails at the first broken step and hides every later one.

### Comments beside assertions

When you change an assertion, re-read every comment near it. A comment that still names the old value is wrong the moment the assertion changes: delete it. Better still, do not write one; the assertion and the title already say it.

---

## Assertions

### AssertJ — primary

AssertJ is the standard assertion library. Do not use JUnit's `assertEquals` / `assertNotNull` — these exist in some older tests but are not the standard going forward.

```java
// Object assertions
assertThat(result).isNotNull();
assertThat(result.getReferenceNumber()).startsWith("DRAFT.IMP." + currentYear + ".");
assertThat(result.getReferenceNumber()).endsWith(generatedId);

// Exception assertions
assertThatThrownBy(() -> service.doSomething(arg))
    .isInstanceOf(NotFoundException.class)
    .hasMessageContaining("DRAFT.IMP.2026.MISSING");

// Collection assertions
assertThat(result).hasSize(3);
assertThat(result).extracting(Notification::getCommodity)
    .containsExactly("Live cattle", "Live sheep", "Live pigs");

// Map assertions
assertThat(errors).hasSize(2);
assertThat(errors.get("origin")).isEqualTo("must not be null");
```

### Mockito verification

```java
// Verify exact call count
verify(notificationRepository, times(2)).save(any(Notification.class));
verify(notificationRepository, times(1)).findAll();

// Verify never called
verify(notificationRepository, never()).deleteAll(anyList());

// Verify call with specific argument
verify(notificationRepository).deleteAll(List.of(n1, n2));
```

### `InOrder` — when call order matters

For cascade operations where the *order* of collaborator calls is part of the contract (delete children before parent, persist before publish, etc.), bare `verify` calls pass even when the order is swapped. Use `InOrder` so a swap fails the test.

```java
// Wrong — both verifies pass even if production swapped the calls
@Test
void deleteByReferenceNumbers_shouldCascade() {
    notificationService.deleteByReferenceNumbers(List.of("REF-1"));

    verify(notificationRepository).deleteAllByReferenceNumberIn(List.of("REF-1"));
    verify(documentService).deleteForNotificationRefs(List.of("REF-1"));
}

// Correct — fails if children are deleted after parent (orphan-window bug)
@Test
void deleteByReferenceNumbers_shouldDeleteDocumentsBeforeNotifications() {
    notificationService.deleteByReferenceNumbers(List.of("REF-1"));

    InOrder inOrder = inOrder(documentService, notificationRepository);
    inOrder.verify(documentService).deleteForNotificationRefs(List.of("REF-1"));
    inOrder.verify(notificationRepository).deleteAllByReferenceNumberIn(List.of("REF-1"));
}
```

Use this whenever a service composes two or more collaborator calls whose ordering is load-bearing. Without `InOrder`, the test green-lights any permutation.

---

## Enum serialisation

Each enum gets two serialisation tests, however many constants it has:

- one round trip for one constant
- one unknown value, which must throw `InvalidFormatException` (a different Jackson code path)

Do not add a test per constant, and do not parameterise over `@EnumSource` to cover them all. Domain enums such as document types and scan statuses grow as values are confirmed; the test suite must not grow with them when the contract is the same. A reviewer must not raise a missing per-constant test as a gap. A missing unknown-value test is a gap.

Bad: one test per constant, as `AccompanyingDocumentTest.ScanStatusJsonSerialisation` does today:

```java
@Test
void scanStatus_pending_serialisesToUppercaseString() throws JsonProcessingException { ... }

@Test
void scanStatus_complete_serialisesToUppercaseString() throws JsonProcessingException { ... }

@Test
void scanStatus_rejected_serialisesToUppercaseString() throws JsonProcessingException { ... }
```

Good:

```java
@Test
void scanStatus_shouldRoundTripThroughJson() throws JsonProcessingException {
    String json = objectMapper.writeValueAsString(ScanStatus.PENDING);

    assertThat(json).isEqualTo("\"PENDING\"");
    assertThat(objectMapper.readValue(json, ScanStatus.class)).isEqualTo(ScanStatus.PENDING);
}

@Test
void scanStatus_unknownValue_throwsInvalidFormatException() {
    assertThatThrownBy(() -> objectMapper.readValue("\"UNKNOWN\"", ScanStatus.class))
        .isInstanceOf(InvalidFormatException.class);
}
```

Use one test per constant only when constants serialise differently, for example each has its own `@JsonProperty` or `@JsonValue`. A small closed enum (HTTP method, day of week) may use a parameterised round trip.

---

## Helper methods

Set-up used by two tests goes in a shared helper. When you promote a local helper to a shared one, delete every local copy in the same change.

Extract repeated setup into private helpers — do not inline complex construction in every test:

```java
// Private helper for audit-relevant headers
private HttpHeaders headersWithAuditFields() {
    HttpHeaders headers = new HttpHeaders();
    headers.add("x-cdp-request-id", "test-trace-id");
    headers.add("User-Id", "test-user-id");
    return headers;
}

// Private helper for constructing hard-to-create exceptions
private MethodArgumentNotValidException createValidationException(FieldError... fieldErrors) {
    // ...
}
```

---

## What the existing unit tests cover

| Class | Tests | What it covers |
|-------|-------|----------------|
| `NotificationControllerTest` | 8 | MVC dispatch, request/response serialisation, admin secret enforcement, NotFoundException → 404, empty-list validation |
| `NotificationServiceTest` | 10 | Save new (two-phase: ID then reference), save existing (upsert), findAll, delete all-found, delete with missing (NotFoundException + FAILURE audit), delete empty list (no-op) |
| `GlobalExceptionHandlerTest` | 9 | Validation → 400, NotFoundException → 404, ConflictException → 409, generic Exception → 500, traceId from MDC, null traceId handling |
| `TraceIdPropagationInterceptorTest` | 6 | Header set when MDC populated, not set when null/blank/empty, overwrites existing header, body passed through unchanged |
| `EmfMetricsPublisherTest` | ~4 | Metrics publish scheduling, meter registry interactions |
| `MetricsConfigTest` | ~3 | MeterRegistry bean creation, publisher registration |
| `MetricsConfigurationPropertiesTest` | ~3 | Annotation contracts: `@ConditionalOnProperty`, `@Service`, `@Scheduled(fixedRate=60000)` |
| `CertificateLoaderTest` | ~5 | null/empty/valid/invalid certificate paths |
| `CacheConfigTest` | ~3 | Caffeine spec construction, CacheManager bean |
| `ApplicationTest` | 0 | Placeholder only — no assertions |

### Source: `docs/best-practices/java/testing/integration.md`

# Integration Testing — trade-imports-animals-backend

## Overview

Integration tests use a real Spring Boot context with Testcontainers for all external dependencies. There are no mocks of infrastructure — MongoDB, OAuth2, and external HTTP services all run as real containers.

**Run with:**
```bash
mvn verify          # unit + integration tests
mvn test            # unit tests only
mvn verify -DskipTests=true  # skip all tests
```

`mvn test` runs no `*IT` class. A green `mvn test` leaves owner scoping, status transitions, Mongo queries and every other IT unverified. Check a backend change with `mvn verify`, with Docker running for Testcontainers.

---

## File naming convention

| Pattern | Runner | Phase |
|---------|--------|-------|
| `*Test.java` | Maven Surefire | `test` |
| `*IT.java` | Maven Failsafe | `integration-test` / `verify` |

No `@Tag` or `@Category` annotations are used. The `IT` suffix is the only distinction.

---

## Architecture

### `IntegrationBase` — the only base class

All IT classes extend `IntegrationBase`. Never instantiate containers or configure Spring properties in an IT class itself.

```
IntegrationBase (abstract)
├── @SpringBootTest(webEnvironment = RANDOM_PORT)
├── @ActiveProfiles("integration-test")
├── 3 static Testcontainers (shared across all subclasses)
├── @DynamicPropertySource (wires container URLs into Spring)
└── Helper methods: webClient(), getToken(), usingStub(), getJsonFromFile()

NotificationIT extends IntegrationBase
MongoConfigIT extends IntegrationBase
HealthCheckConfigIT extends IntegrationBase
EcsLoggingIT extends IntegrationBase
ProxyConfigIT extends IntegrationBase
TrustStoreConfigurationIT extends IntegrationBase
DocumentIT extends IntegrationBase  (also owns its own Floci container)
```

### Containers

Three containers start once in `IntegrationBase`, shared across all IT classes via static fields and `Startables.deepStart()`:

| Container | Image | Purpose |
|-----------|-------|---------|
| `MONGO_CONTAINER` | `mongo:7.0` | Primary data store |
| `OAUTH_CONTAINER` | `ghcr.io/navikt/mock-oauth2-server:2.1.10` | JWT token generation |
| `MOCK_SERVER_CONTAINER` | `mockserver/mockserver` | Stub external HTTP services (cdp-uploader etc.) |

IT classes that need additional infrastructure start their own containers as static fields and register their URLs via a second `@DynamicPropertySource` on the subclass. Example: `DocumentIT` adds a Floci S3 container:

| Container | Image | Purpose | Owner |
|-----------|-------|---------|-------|
| `FLOCI_CONTAINER` | `floci/floci:latest` | Real S3 for file upload/download | `DocumentIT` |

Containers are started in parallel:
```java
static {
    Startables.deepStart(OAUTH_CONTAINER, MONGO_CONTAINER, MOCK_SERVER_CONTAINER).join();
}
```

Their URLs are wired into the Spring context via `@DynamicPropertySource` before the context starts — this is how Testcontainers integrates with Spring Boot's property system.

**Docker API version:** Docker Desktop 4.52+ requires API v1.44. The `maven-failsafe-plugin` is configured with `<api.version>1.44</api.version>` as a system property to match. If you see `IllegalStateException: Could not find a valid Docker environment`, check your `~/.testcontainers.properties` has `docker.host=unix:///var/run/docker.sock`.

### Spring profile

`@ActiveProfiles("integration-test")` activates `application-integration-test.yml` in `src/test/resources/`. Key settings in that file:

- MongoDB SSL disabled
- `admin.secret` set to `test-admin-secret`
- Actuator: only `/health` exposed, no component details
- MongoDB health check disabled
- AWS EMF metrics disabled

---

## Writing an IT class

### Minimal structure

```java
class MyFeatureIT extends IntegrationBase {

    @Autowired
    private MyRepository myRepository;

    @BeforeEach
    void setUp() {
        myRepository.deleteAll();
    }

    @Test
    void post_shouldCreateRecord() {
        MyDto dto = new MyDto("value");

        webClient("NoAuth")
            .post()
            .uri("/my-endpoint")
            .bodyValue(dto)
            .exchange()
            .expectStatus().isOk()
            .expectBody(MyEntity.class)
            .returnResult();
    }
}
```

### Test method naming

```
{subject}_{shouldDoWhat}
{subject}_{shouldDoWhat}_{whenContext}
```

Examples:
```
post_shouldCreateNewNotification
delete_shouldReturn401_whenAdminSecretHeaderIsMissing
findAll_shouldReturnEmptyList_whenNoNotifications
```

Use the HTTP method or operation as the subject prefix (`post_`, `delete_`, `findAll_`).

The rules in [`unit.md` → Test titles and layout](unit.md#test-titles-and-layout) apply to ITs too:

- The title states what the assertions prove, and nothing more.
- The test fails without the change it covers.
- No `// Given`, `// When`, `// Then` comments. Separate set-up, action and assertions with blank lines, and move long set-up into a named helper.
- One behaviour per test. A create-update-delete flow is three tests, each setting up its own state, not one `fullCrudFlow_shouldWorkEndToEnd`.
- Set-up used by two IT classes goes in `IntegrationBase` or a shared helper, and the local copies are deleted.

---

## HTTP testing

### Primary client — `WebTestClient`

Use `webClient(clientType)` from `IntegrationBase` for all HTTP calls. It binds to the Spring Boot server on the random port and injects a Bearer token automatically.

```java
// GET — list
List<Notification> result = webClient("NoAuth")
    .get()
    .uri("/notifications")
    .exchange()
    .expectStatus().isOk()
    .expectBodyList(Notification.class)
    .returnResult().getResponseBody();

// POST — create
EntityExchangeResult<Notification> result = webClient("NoAuth")
    .post()
    .uri("/notifications")
    .bodyValue(dto)
    .exchange()
    .expectStatus().isOk()
    .expectBody(Notification.class)
    .returnResult();

// DELETE — with headers
webClient("NoAuth")
    .method(HttpMethod.DELETE).uri("/notifications")
    .header("Trade-Imports-Animals-Admin-Secret", "test-admin-secret")
    .header("x-cdp-request-id", "trace-001")
    .header("User-Id", "user-001")
    .bodyValue(List.of(ref1, ref2))
    .exchange()
    .expectStatus().isNoContent();
```

### When to use `TestRestTemplate` instead

Use `TestRestTemplate` (not `WebTestClient`) when testing actuator endpoints. MockMvc only exercises the Spring MVC layer and misses actuator's separate servlet context. See `HealthCheckConfigIT` for the pattern.

### When to use `MockMvc` instead

Use `MockMvc` (with `@AutoConfigureMockMvc` on the class) when you need to verify behaviour that requires capturing side effects like log output. See `EcsLoggingIT` for the pattern.

---

## Database

### Clean state per test

`@BeforeEach` must delete all relevant repositories. Never rely on test execution order.

```java
@BeforeEach
void setUp() {
    notificationRepository.deleteAll();
    auditRepository.deleteAll();
}
```

### Direct repository assertions

Inject Spring Data repositories to assert persistence directly — don't infer DB state from HTTP responses alone for critical business logic:

```java
@Autowired
private NotificationRepository notificationRepository;

// After the HTTP call:
Notification persisted = notificationRepository.findById(id).orElse(null);
assertThat(persisted).isNotNull();
assertThat(persisted.getOrigin().getCountryCode()).isEqualTo("BE");
```

---

## Authentication

### JWT tokens

`webClient("NoAuth")` calls `getToken("NoAuth")` internally, which POSTs to the OAuth mock container and returns a JWT. The token is set as `Authorization: Bearer {token}` on every request.

The `clientType` string maps to mock OAuth client configurations. `"NoAuth"` is the standard test client.

### Admin secret

Endpoints protected by the admin secret header require:
```java
.header("Trade-Imports-Animals-Admin-Secret", "test-admin-secret")
```

`test-admin-secret` matches the value configured in `application-integration-test.yml`. Always use the constant rather than hardcoding the string in each test:

```java
private static final String ADMIN_SECRET_HEADER = "Trade-Imports-Animals-Admin-Secret";
private static final String VALID_ADMIN_SECRET = "test-admin-secret";
```

---

## Stubbing external services

Use `usingStub()` to get a `MockServerClient` for any external HTTP dependency declared in `SERVICES_TO_MOCK`:

```java
usingStub()
    .when(request().withMethod("GET").withPath("/some/external/path"))
    .respond(response().withStatusCode(200).withBody(getJsonFromFile("response.json")));
```

Put stub JSON fixtures in `src/test/resources/`. Use `getJsonFromFile("filename.json")` to load them.

The base class `@AfterEach tearDown()` resets all stubs after each test — you do not need to clean up stubs manually.

---

## Assertions

### AssertJ — primary

```java
assertThat(created).isNotNull();
assertThat(created.getReferenceNumber()).startsWith("DRAFT.IMP.");
assertThat(created.getReferenceNumber()).matches("DRAFT\\.IMP\\.\\d{4}\\..+");

// Collections
assertThat(notifications).hasSize(3);
assertThat(notifications)
    .extracting(n -> n.getOrigin().getCountryCode())
    .containsExactlyInAnyOrder("GB", "IE", "FR");

// With context label (use on non-obvious assertions)
assertThat(duration)
    .as("Health check should respond quickly without database connectivity checks")
    .isLessThan(1000L);
```

### WebTestClient — HTTP response assertions

```java
.expectStatus().isOk()
.expectStatus().isNoContent()
.expectStatus().isNotFound()
.expectStatus().isBadRequest()
.expectStatus().isUnauthorized()

// JSON path assertions on error responses
.expectBody()
.jsonPath("$.status").isEqualTo(404)
.jsonPath("$.detail").value(Matchers.containsString("DRAFT.IMP.2026.DOESNOTEXIST"))
```

---

## Coverage

JaCoCo enforces **65% line coverage** at the `verify` phase. Build fails if coverage drops below this threshold. No exclusions are configured — all production code counts.

When the gate or SonarCloud reports a coverage gap, check the build config before writing a test. A JaCoCo `report` goal bound to `test` instead of `verify` leaves the `*IT` coverage out of the XML that SonarCloud reads, and looks like missing tests.

No coverage-padding tests. Every assertion pins the behaviour the test name claims: if someone broke the thing in the name (the truncation, the fallback, the refusal), an assertion must fail. Bad: `shouldTruncateLongErrorBodyInLog` that only checks the exception type. Good: the same test asserts the logged body's length. A defensive line with no realistic route to it can stay uncovered.

---

## What the existing ITs cover

| Class | Tests | What it covers |
|-------|-------|---------------|
| `NotificationIT` | 18 | Full CRUD, upsert semantics, reference number generation, audit trail, admin auth, atomic delete, input validation |
| `DocumentIT` | 15 | Initiate → PENDING record, scan callback (complete/rejected/mixed/null numberOfRejectedFiles), list, get, file download from real S3, 404 paths, S3 error path, rejected file guard, dateOfIssue persistence |
| `MongoConfigIT` | 5 | MongoDB connection, read preference, write concern, basic document operations |
| `HealthCheckConfigIT` | 8 | Actuator endpoint exposure, security (no details, no env/metrics/info), CDP path requirements, response time |
| `EcsLoggingIT` | 3 | ECS JSON log format, required CDP fields, trace ID propagation, health endpoint log filtering |
| `ProxyConfigIT` | 3 | HTTP proxy env var handling, system property propagation, graceful handling when proxy absent |
| `TrustStoreConfigurationIT` | 3 | SSLContext creation, X509 certificate loading, null certificate handling |

### Source: `docs/best-practices/java/modern-java.md`

# Modern Java — Best Practices

Project baseline: Java 25, Amazon Corretto, Spring Boot 3.5. This doc covers language features from Java 17–25 and the idiomatic patterns used in `trade-imports-animals-backend`. The goal is to stop agents defaulting to old Java idioms.

---

## 1. Java version baseline

| Version | Notable features |
|---------|----------------|
| Java 17 (LTS) | Sealed classes (final), records (final), pattern matching instanceof, text blocks |
| Java 21 (LTS) | Pattern matching switch (final), record patterns, virtual threads, sequenced collections |
| Java 25 (LTS) | Primitive types in patterns, module imports, flexible constructor bodies |

This project targets **Java 25**. Use all stable features below freely.

---

## 2. Records

Records are immutable data carriers. Use them for DTOs, value objects, and event types.

```java
// Declare
public record NotificationDto(
    String id,
    String referenceNumber,
    Origin origin,
    NotificationStatus status
) {}

// Use — getters are field-name(), not getX()
var dto = new NotificationDto("1", "DRAFT.IMP.2026.1", origin, DRAFT);
dto.referenceNumber();  // not dto.getReferenceNumber()
```

**Compact constructor** — for validation:

```java
public record NotificationRequest(String referenceNumber, @NotNull Origin origin) {
    public NotificationRequest {
        Objects.requireNonNull(referenceNumber, "referenceNumber must not be null");
        if (referenceNumber.isBlank()) throw new IllegalArgumentException("referenceNumber must not be blank");
    }
}
```

**When a record must guard against nulls.** A public record that crosses a service, persistence or audit boundary gets a compact constructor with `Objects.requireNonNull` on every component. This holds even when today's only caller is a controller that already validates with `@RequestHeader(required = true)` or `@Valid`. The type is public, so someone will construct it directly later, and a null that slips through is silent corruption (an audit row with no user, a null id written to Mongo) rather than a crash.

```java
/**
 * @param traceId the CDP request id; must not be null
 * @param userId  the signed-in user's id; must not be null
 */
public record AuditContext(String traceId, String userId) {
  public AuditContext {
    Objects.requireNonNull(traceId, "traceId");
    Objects.requireNonNull(userId, "userId");
  }
}
```

- A component that may legitimately be absent is annotated `@Nullable` instead of guarded.
- The record's Javadoc says `@param … must not be null` for each guarded component.
- A private or package-private record used in one place needs no guards: trust the framework there.

**Custom constructor** — coercion:

```java
public record Coordinates(double lat, double lon) {
    public Coordinates(String lat, String lon) {
        this(Double.parseDouble(lat), Double.parseDouble(lon));
    }
}
```

**When to use records:**
- DTOs (request/response bodies)
- Configuration value objects
- Return types from repository projections
- Keys in Maps

**When NOT to use records:**
- JPA/MongoDB `@Document` entities (need mutable fields, no-arg constructor)
- Classes that need to extend another class
- Classes requiring custom `equals`/`hashCode` that depend on mutable state

---

## 3. Sealed classes and interfaces

Model a **closed set of variants** — the compiler knows all possible subtypes.

```java
public sealed interface ImportResult<T>
        permits ImportResult.Success, ImportResult.Failure {

    record Success<T>(T value) implements ImportResult<T> {}

    record Failure<T>(String errorCode, String message) implements ImportResult<T> {}
}
```

Use in service methods instead of nullable returns or exception-for-flow-control:

```java
public ImportResult<NotificationDto> save(NotificationRequest request) {
    if (existsByReferenceNumber(request.referenceNumber())) {
        return new ImportResult.Failure<>("DUPLICATE", "Already exists");
    }
    return new ImportResult.Success<>(doSave(request));
}
```

Handle exhaustively with switch (no default needed):

```java
return switch (service.save(request)) {
    case ImportResult.Success<NotificationDto>(var dto) -> ResponseEntity.ok(dto);
    case ImportResult.Failure<NotificationDto> f -> ResponseEntity
            .badRequest().body(ProblemDetail.forStatusAndDetail(400, f.message()));
};
```

---

## 4. Pattern matching — `instanceof`

```java
// Old
if (obj instanceof String) {
    String s = (String) obj;
    process(s);
}

// Modern
if (obj instanceof String s) {
    process(s);
}

// Negation guard
if (!(request instanceof HttpServletRequest req)) {
    chain.doFilter(request, response);
    return;
}
// req is in scope here
```

Used in this project's filter chain:

```java
@Override
protected void doFilterInternal(HttpServletRequest request,
        HttpServletResponse response, FilterChain chain) throws IOException, ServletException {
    if (request instanceof HttpServletRequest req
            && req.getRequestURI().startsWith("/admin")) {
        // req already typed — no cast needed
        var secret = req.getHeader("Admin-Secret");
        // ...
    }
}
```

---

## 5. Pattern matching — switch expressions

**Arrow syntax** (no fall-through, exhaustive):

```java
String label = switch (status) {
    case DRAFT     -> "Draft";
    case SUBMITTED -> "Submitted";
    case APPROVED  -> "Approved";
    case REJECTED  -> "Rejected";
};
```

**With sealed types** (exhaustive — no `default` needed, compiler checks):

```java
ResponseEntity<?> response = switch (result) {
    case ImportResult.Success<NotificationDto>(var dto) -> ResponseEntity.ok(dto);
    case ImportResult.Failure<NotificationDto> f ->
            ResponseEntity.status(400).body(f.message());
};
```

**`yield` for block bodies:**

```java
int score = switch (grade) {
    case "A" -> 4;
    case "B" -> 3;
    case "C" -> {
        log.debug("Marginal pass");
        yield 2;
    }
    default -> 0;
};
```

**Guarded patterns:**

```java
String describe = switch (obj) {
    case Integer i when i < 0 -> "negative";
    case Integer i when i == 0 -> "zero";
    case Integer i -> "positive";
    case String s when s.isBlank() -> "blank string";
    case String s -> "string: " + s;
    default -> "other";
};
```

**Multiple labels:**

```java
boolean isTerminal = switch (status) {
    case APPROVED, REJECTED, CANCELLED -> true;
    case DRAFT, SUBMITTED, UNDER_REVIEW -> false;
};
```

---

## 6. Record patterns (destructuring)

```java
// Destructure a record in switch
return switch (result) {
    case ImportResult.Success<NotificationDto>(var dto) -> dto.referenceNumber();
    case ImportResult.Failure<NotificationDto>(var code, var msg) -> "ERROR: " + code;
};

// Nested destructuring
record Address(String city, String country) {}
record Person(String name, Address address) {}

if (person instanceof Person(var name, Address(var city, _))) {
    log.info("Person {} lives in {}", name, city);
}
```

---

## 7. Text blocks

```java
// Multiline JSON (e.g. in tests)
String json = """
        {
          "referenceNumber": "DRAFT.IMP.2026.1",
          "origin": {
            "countryCode": "DE"
          }
        }
        """;

// Indentation is determined by the closing """
// Use formatted() for substitution
String query = """
        {
          "referenceNumber": "%s"
        }
        """.formatted(referenceNumber);
```

Line continuation (no newline):
```java
String sql = """
        SELECT * FROM notifications \
        WHERE status = 'DRAFT'
        """;
```

Trailing space preservation with `\s`:
```java
String padded = """
        hello   \s
        world
        """;
```

---

## 8. `var` — local variable type inference

**Use when** the type is obvious from the right-hand side:

```java
var notifications = notificationRepository.findAll();  // List<Notification>
var dto = notificationService.save(request, headers);  // NotificationDto
var mapper = new ObjectMapper();
```

**Avoid when** it obscures the type:

```java
// Bad — what does process() return?
var result = process(data);

// Good
NotificationDto result = process(data);
```

`var` is not valid for method parameters, fields, or return types (compile error).

---

## 9. Stream API — modern idioms

```java
// Java 16+: Stream.toList() — immutable, preferred
List<String> refs = notifications.stream()
        .map(Notification::getReferenceNumber)
        .toList();  // not .collect(Collectors.toList())

// Filtering and mapping
List<NotificationDto> drafts = notifications.stream()
        .filter(n -> n.getStatus() == NotificationStatus.DRAFT)
        .map(notificationMapper::toDto)
        .toList();

// Optional.stream() for flat-mapping
List<NotificationDto> results = referenceNumbers.stream()
        .flatMap(ref -> notificationRepository.findByReferenceNumber(ref).stream())
        .map(notificationMapper::toDto)
        .toList();

// Grouping
Map<NotificationStatus, List<Notification>> byStatus = notifications.stream()
        .collect(Collectors.groupingBy(Notification::getStatus));

// Joining
String refs = notifications.stream()
        .map(Notification::getReferenceNumber)
        .collect(Collectors.joining(", "));

// Count
long draftCount = notifications.stream()
        .filter(n -> n.getStatus() == NotificationStatus.DRAFT)
        .count();
```

**When NOT to use streams:** simple iteration with side effects — a for-each loop is clearer:

```java
// Bad — stream for side effects
notifications.stream().forEach(n -> repository.save(n));

// Good
for (var notification : notifications) {
    repository.save(notification);
}
```

---

## 10. Optional — correct usage

`Optional<T>` is only for **return types**. Never use as method parameter or field.

```java
// Repository returns Optional
Optional<Notification> findByReferenceNumber(String ref);

// Service consumes it
public NotificationDto getByReferenceNumber(String ref) {
    return notificationRepository.findByReferenceNumber(ref)
            .map(notificationMapper::toDto)
            .orElseThrow(() -> new NotFoundException("Not found: " + ref));
}
```

Chaining:

```java
Optional<String> city = getUser()
        .map(User::getAddress)
        .filter(a -> !a.getCity().isBlank())
        .map(Address::getCity);

// With default
String city = getAddress().map(Address::getCity).orElse("Unknown");

// Execute only if present
getNotification(ref).ifPresent(n -> auditService.log(n));

// Execute with or-else action (Java 9)
getNotification(ref).ifPresentOrElse(
        n -> auditService.log(n),
        () -> log.warn("Notification not found: {}", ref));
```

**Anti-patterns:**

```java
// Bad — isPresent() + get()
if (optional.isPresent()) {
    var value = optional.get();  // use orElseThrow instead
}

// Bad — Optional.ofNullable just to check null
if (Optional.ofNullable(x).isPresent()) { ... }  // just use: if (x != null)

// Bad — Optional as parameter
public void process(Optional<String> name) { ... }  // use: process(String name) with null check

// Bad — Optional as field
private Optional<String> name;  // use: private String name; (nullable with @Nullable)
```

---

## 11. Collections — factory methods

```java
// Immutable (preferred for constants, test data)
List<String> codes = List.of("DE", "FR", "NL");
Set<String> allowed = Set.of("DRAFT", "SUBMITTED");
Map<String, String> labels = Map.of("DE", "Germany", "FR", "France");

// More than 10 map entries
Map<String, Integer> scores = Map.ofEntries(
        Map.entry("alice", 95),
        Map.entry("bob", 87),
        Map.entry("carol", 92)
);

// Defensive copy
public record Whitelist(List<String> codes) {
    public Whitelist { codes = List.copyOf(codes); }
}

// Mutable when needed
List<String> mutable = new ArrayList<>(List.of("a", "b"));
Map<String, String> mutableMap = new HashMap<>(Map.of("k", "v"));
```

**Useful Map methods:**

```java
map.getOrDefault("key", "fallback");
map.putIfAbsent("key", "value");
map.computeIfAbsent("key", k -> expensiveCompute(k));
map.merge("key", 1, Integer::sum);
```

---

## 12. String methods

```java
"  hello  ".isBlank()       // true (handles whitespace — prefer over isEmpty())
"  hello  ".strip()         // "hello" (Unicode-aware — prefer over trim())
"  hello  ".stripLeading()  // "hello  "
"  hello  ".stripTrailing() // "  hello"
"ha".repeat(3)              // "hahaha"
"Hello, %s!".formatted(name)  // preferred over String.format()
"line1\nline2".lines()      // Stream<String>
"  ".isBlank()              // true
"".isEmpty()                // true, but "  ".isEmpty() is false
```

---

## 13. Virtual threads (Java 21)

Virtual threads are lightweight, JVM-managed threads — not OS threads. Enable in Spring Boot:

```yaml
spring:
  threads:
    virtual:
      enabled: true
```

Relevant for this service's blocking I/O (MongoDB, RestClient). With virtual threads, each request can have its own thread without exhausting OS thread pools.

No code changes needed — Spring Boot handles the rest.

---

## 14. Sequenced collections (Java 21)

All `List`, `LinkedHashSet`, `LinkedHashMap` now implement `SequencedCollection`/`SequencedMap`:

```java
List<String> list = List.of("a", "b", "c");
list.getFirst();   // "a" — prefer over list.get(0)
list.getLast();    // "c" — prefer over list.get(list.size()-1)
list.reversed();   // reversed view

LinkedHashMap<String, Integer> map = new LinkedHashMap<>();
map.firstEntry();  // Map.Entry for first key
map.lastEntry();
```

---

## 15. Immutability patterns

```java
// Records — naturally immutable
public record NotificationDto(String id, String referenceNumber) {}

// Lombok @Value — immutable class
@Value
public class CommodityCode {
    String code;
    String description;
}

// Defensive copy in constructors
public record Notification(List<String> tags) {
    public Notification { tags = List.copyOf(tags); }  // defensive copy
}

// Builder for complex construction
@Builder
@Data
public class Notification {
    private String id;
    private String referenceNumber;
    private NotificationStatus status;
}
Notification n = Notification.builder()
        .referenceNumber("DRAFT.IMP.2026.1")
        .status(NotificationStatus.DRAFT)
        .build();
```

---

## 16. Anti-patterns — old vs modern

| Old (avoid) | Modern |
|------------|--------|
| `for (int i=0; i<list.size(); i++)` | Enhanced for or stream |
| `.collect(Collectors.toList())` | `.toList()` |
| `(String) obj` without instanceof | Pattern matching `instanceof String s` |
| `new ArrayList<String>()` | `new ArrayList<>()` (diamond) |
| Raw type `List list` | `List<Notification>` |
| `"Hello " + name` in log | `log.info("Hello {}", name)` |
| `if (x == null)` everywhere | `Optional<T>` or `@NonNull` |
| `@Autowired` field injection | Constructor injection + `@RequiredArgsConstructor` |
| `RestTemplate` | `RestClient` |
| `Arrays.asList()` (mutable, fixed) | `List.of()` or `new ArrayList<>()` |
| `optional.get()` | `optional.orElseThrow()` |
| `Optional.ofNullable(x).isPresent()` | `x != null` |
| `Collections.emptyList()` | `List.of()` |
| `new HashMap<String, List<Notification>>()` | `new HashMap<>()` |
| `String.format("%s %s", a, b)` | `"%s %s".formatted(a, b)` |
| `list.get(0)` | `list.getFirst()` |
| `list.get(list.size()-1)` | `list.getLast()` |

---

## 17. I/O hygiene

### Always close `InputStream` / `OutputStream` with try-with-resources

Reading from an `InputStream` returned by an HTTP client or file API and not closing it leaks file descriptors and connections. The leak is invisible in development and shows up under load. Use try-with-resources whenever you obtain a stream.

```java
// Wrong — if readAllBytes() throws, the stream stays open
ResponseEntity<InputStream> resp = httpClient.exchange(/* ... */);
String body = new String(resp.getBody().readAllBytes(), StandardCharsets.UTF_8);

// Correct
ResponseEntity<InputStream> resp = httpClient.exchange(/* ... */);
String body;
try (InputStream is = resp.getBody()) {
    body = new String(is.readAllBytes(), StandardCharsets.UTF_8);
}
```

### Always specify a charset

`String.getBytes()`, `new String(byte[])`, `Files.readString(Path)` overloads without a charset use the **platform default** — UTF-8 on Linux/macOS, often Cp1252 on Windows CI. Tests pass locally and fail in CI on the first non-ASCII character.

```java
// Wrong — platform-dependent
byte[] bytes = "test content".getBytes();
String text = new String(downloadedBytes);

// Correct
import java.nio.charset.StandardCharsets;
byte[] bytes = "test content".getBytes(StandardCharsets.UTF_8);
String text = new String(downloadedBytes, StandardCharsets.UTF_8);
```

The same rule applies to `Files.readString(path, StandardCharsets.UTF_8)`, `Files.writeString(...)`, and `Reader`/`Writer` constructors.

---

## 18. Names and comments

The canonical house rules are in `.claude/rules/code-quality.md`. This section applies them to Java.

### A name predicts what the code returns and changes

Verb-noun shape is not enough. `findByReferenceNumber` is a good name because it does exactly that and nothing else, not because it starts with a verb. To check a name: hide the body, read the name, and predict the return value and every side effect. Then read the body. If anything in it surprises you (a write, a log, a reset, a cache eviction), rename the method or split it.

Bad, from `ExternalCallMetrics` in `trade-imports-reference-data`:

```java
public void recordCall(ExternalCall call, Duration elapsed, boolean failed) {
    lastCallSucceededByDependency.put(call.dependency(), !failed);
    logCall(call, elapsed, failed);
    ...
}
```

`recordCall` reads as "emit a metric". It also updates the health state that `lastCallSucceededByDependency()` reports and writes an INFO log line. A caller cannot predict either from the name.

A method named `report()` that also clears the state it reports on has the same fault. Split it, so `report()` only reads and the clearing has its own name (`clearExpiredFaults()`).

### No positional boolean flags

A call site such as `recordCall(call, elapsed, true)` does not say what `true` means. Use two methods (`recordSuccess(call, elapsed)`, `recordFailure(call, elapsed)`) or an enum (`Outcome.FAILURE`). Two booleans side by side are worse: the reader has to know which combinations are allowed.

### Names describe behaviour, not a metaphor or the wrong shape

- A `Supplier<MetricsLogger>` named `metricsLoggers` reads as a collection. It makes a new logger per call: `newMetricsLogger`.
- A name that needs a comment to decode it is wrong. Fix the name; do not keep the comment.

### One concept, one name

One value keeps one name from the HTTP header to the repository, across every layer and every twin repo.

Bad: in `NotificationTemplate`, one person is the `User-Id` header, `userId`, `ownerId` and "actor id", with a second `HEADER_USER_ID` constant beside the controller's. Good: `userId` everywhere, read through the existing `NotificationController.HEADER_USER_ID`.

Do not turn backlog wording ("the owner") into identifiers when the code already has a name for the value.

A rename covers the concept's whole vocabulary: fields, parameters, accessors, Javadoc, log keys, test names, JSON properties you control, and the twin repo. List what stays and why before you start.

### Comments

- A comment describes only the lines below it, and only when a better name or an extracted method cannot.
- Never describe callers, other modules, the frontend, another service, a library or a test. Those claims go stale without anyone touching this file.
- No counts: "the only caller", "the one place".
- No ticket keys, backlog, ruling or acceptance-criteria ids, release names or session vocabulary, in comments, code or test names.
- No history: no "renamed from", "used to", "before the change", no `REMOVED_*` constants. Git holds the history; `docs/` holds the rationale.
- When a comment is stale, delete it before you consider rewording it.
- When you change code, re-read every comment within about ten lines of your change and the Javadoc of every method you changed.

Bad, from `AddressLookupClient` in `trade-imports-ins-backend`: the Javadoc on `retryWithAFreshToken` explains how the API gateway answers a wrong audience and how many requests a minute the whole estate shares. Those are claims about another system. They go stale when the gateway changes and nothing here changes with them. Good: a name that says the whole behaviour (`retryOnceWithAFreshToken`), and the policy written once in the repo's docs.

Javadoc goes only on an API contract (a springdoc-published controller method, or a class another module calls), and states only that contract: what it returns, what it throws, what must not be null. See [`doc-comments/javadoc.md`](../doc-comments/javadoc.md).

---

## 19. Code style quick-reference

| Convention | Rule |
|-----------|------|
| Package structure | Feature-based (`notification/`, `audit/`, `config/`) |
| DI style | Constructor via `@RequiredArgsConstructor` |
| Logging | `@Slf4j` (Lombok), parameterised `{}` syntax; what to log is in [`spring-boot.md` §15](spring-boot.md#what-to-log) |
| DTOs | Records |
| Mutable entities | `@Data` + `@Builder` (Lombok) |
| Immutable value objects | Records or `@Value` (Lombok) |
| Exception messages | Include the offending identifier |
| Method names | camelCase; the name predicts the return value and every side effect (§18) |
| Boolean parameters | None positional; two methods or an enum (§18) |
| Public boundary records | `requireNonNull` compact constructor (§2) |
| Constants | `UPPER_SNAKE_CASE` |
| Test method names | `subject_shouldDoWhat` or `subject_shouldDoWhat_whenContext`; states what the assertions prove ([`testing/unit.md`](testing/unit.md#test-titles-and-layout)) |
### Source: `docs/best-practices/java/spring-data-mongodb.md`

# Spring Data MongoDB — Best Practices

Project baseline: Spring Data MongoDB (Spring Boot 3.5), Java 25, real MongoDB in integration tests via Testcontainers. No mocks of the database layer.

---

## 1. Document mapping

```java
@Document(collection = "notifications")
@Builder
@Data
public class Notification {

    @Id
    private String id;  // MongoDB ObjectId stored as String

    @Indexed(sparse = true, unique = true)
    private String referenceNumber;

    @Field("origin_country")  // override field name in MongoDB
    private String originCountry;

    @Indexed
    private NotificationStatus status;

    @Transient  // not persisted to MongoDB
    private String computedField;

    @Version  // optimistic locking — auto-incremented on each save
    private Long version;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
```

Enable auditing in config:

```java
@Configuration
@EnableMongoAuditing
@EnableMongoRepositories
public class MongoConfig extends AbstractMongoClientConfiguration {

    @Value("${spring.data.mongodb.uri}")
    private String mongoUri;

    @Override
    protected String getDatabaseName() {
        return "trade-imports";
    }

    @Override
    public MongoClient mongoClient() {
        var settings = MongoClientSettings.builder()
                .applyConnectionString(new ConnectionString(mongoUri))
                .applyToSslSettings(ssl -> ssl.enabled(useSsl()))
                .applyToConnectionPoolSettings(pool -> pool
                        .maxSize(50)
                        .minSize(5)
                        .maxWaitTime(5, TimeUnit.SECONDS))
                .build();
        return MongoClients.create(settings);
    }
}
```

Annotation reference:

| Annotation | Purpose |
|-----------|---------|
| `@Document(collection)` | Maps class to a MongoDB collection |
| `@Id` | Marks the document ID field |
| `@Field("name")` | Overrides the field name in MongoDB |
| `@Indexed` | Creates a single-field index |
| `@Indexed(unique = true)` | Unique index |
| `@Indexed(sparse = true)` | Sparse index (excludes null values) |
| `@CompoundIndex` | Multi-field index (at class level) |
| `@TextIndexed` | Full-text search index |
| `@Transient` | Exclude field from persistence |
| `@Version` | Optimistic locking version field |
| `@CreatedDate` | Auto-set on insert (requires `@EnableMongoAuditing`) |
| `@LastModifiedDate` | Auto-set on save |
| `@DBRef` | Reference to another document (avoid — use `@DocumentReference`) |
| `@DocumentReference` | Lazy reference with lookup (prefer over `@DBRef`) |

---

## 2. Repository pattern

```java
// Standard — extend MongoRepository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    // Derived query methods — Spring Data generates the query from the method name
    Optional<Notification> findByReferenceNumber(String referenceNumber);
    List<Notification> findAllByStatus(NotificationStatus status);
    List<Notification> findAllByReferenceNumberIn(List<String> referenceNumbers);
    boolean existsByReferenceNumber(String referenceNumber);
    long countByStatus(NotificationStatus status);
    void deleteByReferenceNumber(String referenceNumber);

    // Sorting and limiting
    List<Notification> findTop10ByStatusOrderByCreatedAtDesc(NotificationStatus status);

    // Custom query with MongoDB JSON
    @Query("{ 'status': ?0, 'origin.countryCode': ?1 }")
    List<Notification> findByStatusAndCountry(NotificationStatus status, String countryCode);

    // Exists check with query
    @Query(value = "{ 'referenceNumber': ?0 }", exists = true)
    boolean existsByRef(String referenceNumber);

    // Count only
    @Query(value = "{ 'status': ?0 }", count = true)
    long countByStatusQuery(String status);

    // Aggregation pipeline
    @Aggregation(pipeline = {
        "{ $match: { 'status': ?0 } }",
        "{ $group: { _id: '$origin.countryCode', count: { $sum: 1 } } }",
        "{ $sort: { count: -1 } }"
    })
    List<CountByCountry> countGroupedByCountry(NotificationStatus status);
}
```

**Derived query keyword table:**

| Keyword | MongoDB operator | Example |
|---------|-----------------|---------|
| `findBy` | `$eq` | `findByReferenceNumber` |
| `findAllBy` | multiple docs | `findAllByStatus` |
| `findByAnd` | `$and` | `findByStatusAndCountryCode` |
| `findByOr` | `$or` | `findByStatusOrCountryCode` |
| `findByIn` | `$in` | `findByStatusIn(List)` |
| `findByNot` | `$ne` | `findByStatusNot` |
| `findByNull` | `$exists: false` | `findByApprovedAtNull` |
| `findByNotNull` | `$exists: true` | `findByApprovedAtNotNull` |
| `findByGreaterThan` | `$gt` | `findByCreatedAtGreaterThan` |
| `findByLessThan` | `$lt` | `findByCreatedAtLessThan` |
| `findByLike` | regex | `findByReferenceNumberLike` |
| `findByContaining` | regex | `findByNotesContaining` |
| `OrderBy...Asc/Desc` | `$sort` | `findAllByStatusOrderByCreatedAtDesc` |
| `findTop/First N` | `$limit` | `findTop5ByStatus` |

---

## 3. MongoTemplate

Use `MongoTemplate` for complex queries that can't be expressed via derived methods:

```java
@Service
@RequiredArgsConstructor
public class NotificationQueryService {

    private final MongoTemplate mongoTemplate;

    // Find with Criteria
    public List<Notification> findByStatusAndDateRange(
            NotificationStatus status, Instant from, Instant to) {
        var criteria = Criteria.where("status").is(status)
                .and("createdAt").gte(from).lte(to);
        return mongoTemplate.find(new Query(criteria), Notification.class);
    }

    // Upsert
    public void upsertByReferenceNumber(Notification notification) {
        var query = Query.query(Criteria.where("referenceNumber")
                .is(notification.getReferenceNumber()));
        var update = new Update()
                .set("status", notification.getStatus())
                .set("updatedAt", Instant.now())
                .setOnInsert("createdAt", Instant.now());
        mongoTemplate.upsert(query, update, Notification.class);
    }

    // Update only specific fields (avoid full document replacement)
    public void updateStatus(String referenceNumber, NotificationStatus newStatus) {
        var query = Query.query(Criteria.where("referenceNumber").is(referenceNumber));
        var update = Update.update("status", newStatus)
                .set("updatedAt", Instant.now());
        mongoTemplate.updateFirst(query, update, Notification.class);
    }

    // Find and modify (atomic)
    public Notification claimForProcessing(String referenceNumber) {
        var query = Query.query(Criteria.where("referenceNumber").is(referenceNumber)
                .and("status").is(NotificationStatus.SUBMITTED));
        var update = Update.update("status", NotificationStatus.PROCESSING)
                .set("processingStartedAt", Instant.now());
        return mongoTemplate.findAndModify(query, update,
                FindAndModifyOptions.options().returnNew(true),
                Notification.class);
    }

    // Bulk delete
    public void deleteByReferenceNumbers(List<String> referenceNumbers) {
        var query = Query.query(Criteria.where("referenceNumber").in(referenceNumbers));
        mongoTemplate.remove(query, Notification.class);
    }
}
```

---

## 4. Aggregation pipeline

```java
@Service
@RequiredArgsConstructor
public class NotificationAggregationService {

    private final MongoTemplate mongoTemplate;

    public List<StatusSummary> getStatusSummary() {
        var aggregation = Aggregation.newAggregation(
                // $match
                Aggregation.match(Criteria.where("status").ne(NotificationStatus.CANCELLED)),
                // $group
                Aggregation.group("status")
                        .count().as("total")
                        .first("createdAt").as("oldestCreatedAt"),
                // $project
                Aggregation.project("total", "oldestCreatedAt")
                        .and("_id").as("status"),
                // $sort
                Aggregation.sort(Sort.Direction.DESC, "total")
        );

        return mongoTemplate.aggregate(aggregation, "notifications", StatusSummary.class)
                .getMappedResults();
    }

    // $lookup (join)
    public List<NotificationWithAudit> getWithAuditHistory(String referenceNumber) {
        var aggregation = Aggregation.newAggregation(
                Aggregation.match(Criteria.where("referenceNumber").is(referenceNumber)),
                Aggregation.lookup("audit_records", "referenceNumber",
                        "referenceNumber", "auditHistory"),
                Aggregation.unwind("auditHistory", true)  // preserveNullAndEmpty=true
        );

        return mongoTemplate.aggregate(aggregation, "notifications",
                NotificationWithAudit.class).getMappedResults();
    }
}
```

---

## 5. Projections

Fetch only the fields you need — reduces network and memory overhead:

```java
// Interface projection
public interface NotificationSummary {
    String getReferenceNumber();
    NotificationStatus getStatus();
    Instant getCreatedAt();
}

// Use in repository
List<NotificationSummary> findSummariesByStatus(NotificationStatus status);

// DTO projection with record
public record NotificationRef(String referenceNumber, NotificationStatus status) {}

// Use with @Query
@Query(value = "{ 'status': ?0 }", fields = "{ 'referenceNumber': 1, 'status': 1 }")
List<NotificationRef> findRefsByStatus(NotificationStatus status);

// Dynamic projection
<T> List<T> findByStatus(NotificationStatus status, Class<T> type);
// Call as: repository.findByStatus(DRAFT, NotificationSummary.class)
```

---

## 6. Indexes

**Match indexes to your query patterns.** A repository method that filters on two fields needs a compound index on those fields, otherwise Mongo loads matching documents into memory and filters there. The cost is invisible until production data volumes catch up — review the actual derived queries when the entity is added, not later.

```java
public interface AccompanyingDocumentRepository extends MongoRepository<AccompanyingDocument, String> {
    // Filters on (notificationReferenceNumber, scanStatus) — needs a compound index
    Optional<AccompanyingDocument> findFirstByNotificationReferenceNumberAndScanStatus(
            String notificationReferenceNumber, ScanStatus scanStatus);
}
```

```java
@Document
@CompoundIndex(name = "ref_status",
               def = "{'notificationReferenceNumber': 1, 'scanStatus': 1}")
public class AccompanyingDocument { /* ... */ }
```

**Partial unique indexes for stateful invariants.** When the unique constraint applies only to a subset of documents (e.g. "at most one PENDING document per notification ref"), use `partialFilter` so completed/rejected documents don't compete for the unique slot.

```java
@Document
@CompoundIndex(
    name = "one_pending_per_ref",
    def = "{'notificationReferenceNumber': 1, 'scanStatus': 1}",
    unique = true,
    partialFilter = "{ 'scanStatus': 'PENDING' }"
)
public class AccompanyingDocument { /* ... */ }
```

**Annotation-based** (auto-created on startup — disable in production):

```java
@Document
@CompoundIndex(name = "status_created", def = "{'status': 1, 'createdAt': -1}")
public class Notification {
    @Id private String id;
    @Indexed(unique = true, sparse = true) private String referenceNumber;
    @Indexed private NotificationStatus status;
    @Indexed(expireAfterSeconds = 86400) private Instant expiresAt;  // TTL index
}
```

**Disable auto-creation in production** (index creation locks collections):

```yaml
spring:
  data:
    mongodb:
      auto-index-creation: false  # manage indexes via migration scripts
```

**Programmatic index creation** (for migration scripts / integration tests):

```java
@Component
@RequiredArgsConstructor
public class MongoIndexCreator {

    private final MongoTemplate mongoTemplate;

    @PostConstruct
    public void createIndexes() {
        var indexOps = mongoTemplate.indexOps(Notification.class);

        indexOps.ensureIndex(new Index()
                .on("referenceNumber", Sort.Direction.ASC)
                .unique()
                .sparse()
                .named("unique_reference_number"));

        indexOps.ensureIndex(new Index()
                .on("status", Sort.Direction.ASC)
                .on("createdAt", Sort.Direction.DESC)
                .named("status_created_at"));
    }
}
```

---

## 7. Pagination and sorting

```java
public interface NotificationRepository extends MongoRepository<Notification, String> {

    // Pageable — returns full count (extra query)
    Page<Notification> findByStatus(NotificationStatus status, Pageable pageable);

    // Slice — no count query, just hasNext()
    Slice<Notification> findByStatusOrderByCreatedAtDesc(NotificationStatus status, Pageable pageable);
}

// Usage
var pageable = PageRequest.of(0, 20, Sort.by(Sort.Direction.DESC, "createdAt"));
var page = repository.findByStatus(NotificationStatus.DRAFT, pageable);

page.getContent();      // List<Notification>
page.getTotalElements(); // long
page.getTotalPages();    // int
page.hasNext();          // boolean
page.getNumber();        // current page (0-based)
```

---

## 8. Custom converters

```java
// Writing converter — Java type → MongoDB type
@WritingConverter
public class NotificationStatusToStringConverter
        implements Converter<NotificationStatus, String> {
    @Override
    public String convert(NotificationStatus source) {
        return source.name().toLowerCase();
    }
}

// Reading converter — MongoDB type → Java type
@ReadingConverter
public class StringToNotificationStatusConverter
        implements Converter<String, NotificationStatus> {
    @Override
    public NotificationStatus convert(String source) {
        return NotificationStatus.valueOf(source.toUpperCase());
    }
}

// Register in MongoConfig
@Override
public MongoCustomConversions customConversions() {
    return new MongoCustomConversions(List.of(
            new NotificationStatusToStringConverter(),
            new StringToNotificationStatusConverter()));
}
```

---

## 9. Transactions

Requires a MongoDB replica set (or `mongo:7` with `--replSet`). Integration tests use `MongoDBContainer` which starts with replica set support.

```java
@Service
@Transactional  // applies to all methods
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final AuditRepository auditRepository;

    @Transactional  // explicit — redundant here but documents intent
    public NotificationDto save(NotificationRequest request, HttpHeaders headers) {
        var notification = notificationMapper.toEntity(request);
        var saved = notificationRepository.save(notification);

        // Both saves are in the same transaction — either both succeed or both roll back
        var audit = Audit.builder()
                .referenceNumber(saved.getReferenceNumber())
                .result(Result.SUCCESS)
                .userId(headers.getFirst("User-Id"))
                .build();
        auditRepository.save(audit);

        return notificationMapper.toDto(saved);
    }
}
```

Transaction manager bean:

```java
@Bean
public MongoTransactionManager transactionManager(MongoDatabaseFactory factory) {
    return new MongoTransactionManager(factory);
}
```

**Cascade deletes across collections must be `@Transactional`.** A common shape is "delete a notification *and* all its child documents". Without a transaction, a failure between the two deletes leaves orphaned children. Wrap the cascade in a single `@Transactional` method.

```java
// Wrong — non-atomic, leaves orphans on partial failure
public void deleteByReferenceNumbers(List<String> refs) {
    notificationRepository.deleteAllByReferenceNumberIn(refs);
    documentService.deleteForNotificationRefs(refs);  // crash here = orphans
}

// Correct
@Transactional
public void deleteByReferenceNumbers(List<String> refs) {
    notificationRepository.deleteAllByReferenceNumberIn(refs);
    documentService.deleteForNotificationRefs(refs);
}
```

---

## 9a. Lombok hygiene on entities

`@Data` and `@Builder` are convenient but combine in ways that bite at runtime. The defaults below prevent the most common gotchas on entities with mutable fields (lists, maps).

**Keep `@AllArgsConstructor` private when using `@Builder`.**

The all-args constructor bypasses `@Builder.Default`, so calling it directly silently produces an entity in an invalid state (e.g. `files` is `null` instead of an empty list). Make it private so the only public construction path is the builder.

```java
// Wrong — public AllArgsConstructor lets callers skip @Builder.Default
@Document @Data @Builder
@AllArgsConstructor
public class AccompanyingDocument {
    @Builder.Default private List<UploadedFile> files = new ArrayList<>();
}
new AccompanyingDocument(/*…*/, null);   // compiles, files is null

// Correct — only builder() constructs valid instances
@Document @Data @Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class AccompanyingDocument {
    @Builder.Default private List<UploadedFile> files = new ArrayList<>();
}
```

**`@Data` + mutable list = unsafe `equals` / `hashCode`.**

`@Data` generates `equals`/`hashCode` over every field, including mutable lists. An entity placed in a `Set` or used as a `Map` key changes its hash code when the list mutates — collection lookups silently break. Restrict equality to the `@Id` field on entities you store in collections.

```java
@Document @Data @Builder
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class AccompanyingDocument {
    @Id
    @EqualsAndHashCode.Include
    private String id;

    private List<UploadedFile> files;  // not part of equality
}
```

This is project policy for any `@Document` class with mutable collection fields. For pure value records with all-immutable fields, the default `@Data` equality is fine.

**Constraints:**
- Transactions require MongoDB 4.0+ replica set
- No collection creation inside a transaction
- `count()` in transactions uses `countDocuments()` (not `count()`)
- Standalone MongoDB (single node, no replica set) does not support transactions

---

## 10. Connection configuration

```yaml
spring:
  data:
    mongodb:
      uri: ${MONGO_URI:mongodb://localhost:27017/trade-imports}
      auto-index-creation: false
```

Connection pool tuning (via programmatic config):

| Setting | Purpose | Recommended |
|---------|---------|------------|
| `maxSize` | Max connections in pool | 50–100 (depends on pod count) |
| `minSize` | Min connections to keep open | 5 |
| `maxWaitTime` | Max time to wait for connection | 5s |
| `maxConnectionLifeTime` | Force reconnect after this time | 30m |
| `maxConnectionIdleTime` | Close idle connections after | 10m |
| `connectTimeout` | Initial connection timeout | 10s |
| `socketTimeout` | Socket read timeout | 30s |

TLS (production):

```java
applyToSslSettings(ssl -> ssl
    .enabled(true)
    .invalidHostNameAllowed(false))
```

Read preference and write concern:

```java
.readPreference(ReadPreference.secondaryPreferred())  // reads from secondaries
.writeConcern(WriteConcern.MAJORITY)  // wait for majority acknowledgment
```

---

## 11. Testing with Testcontainers

This project uses an `IntegrationBase` pattern with `Startables.deepStart()`:

```java
@SpringBootTest
@Testcontainers
public abstract class IntegrationBase {

    @Container
    static MongoDBContainer mongo = new MongoDBContainer("mongo:7");

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry registry) {
        // getReplicaSetUrl() — not getConnectionString() — required for transactions
        registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
    }

    @BeforeEach
    void cleanDatabase(@Autowired MongoTemplate mongoTemplate) {
        mongoTemplate.getDb().listCollectionNames().forEach(name ->
                mongoTemplate.dropCollection(name));
    }
}
```

**`getReplicaSetUrl()` vs `getConnectionString()`**: always use `getReplicaSetUrl()` — it includes the `replicaSet=docker-rs` parameter which enables transactions.

Test lifecycle:

```java
@SpringBootTest
class NotificationServiceIT extends IntegrationBase {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private NotificationRepository notificationRepository;

    @Test
    void save_shouldPersistAndReturnDto() {
        var request = new NotificationRequest("DRAFT.IMP.2026.1", origin);

        var result = notificationService.save(request, new HttpHeaders());

        assertThat(result.referenceNumber()).isEqualTo("DRAFT.IMP.2026.1");
        var saved = notificationRepository.findByReferenceNumber("DRAFT.IMP.2026.1");
        assertThat(saved).isPresent();
        assertThat(saved.get().getStatus()).isEqualTo(NotificationStatus.DRAFT);
    }
}
```

---

## 12. Common mistakes

**1. N+1 via `@DBRef`**
```java
// Wrong — @DBRef triggers a separate DB query per document
@DBRef
private Commodity commodity;

// Correct — embed the data you always need, or use @DocumentReference with lazy loading
@DocumentReference(lazy = true)
private Commodity commodity;

// Best — embed a summary record if you always need basic fields
private CommoditySummary commodity;  // embedded subdocument
```

**2. Missing indexes on query fields**
```java
// Wrong — full collection scan
List<Notification> findByStatus(NotificationStatus status);  // no index on status

// Correct — add @Indexed
@Indexed
private NotificationStatus status;
```

**3. ObjectId vs String type mismatch**
```java
// Wrong — storing ObjectId but querying as String
Criteria.where("_id").is("507f1f77bcf86cd799439011")  // String won't match ObjectId

// Correct — convert to ObjectId
Criteria.where("_id").is(new ObjectId("507f1f77bcf86cd799439011"))

// Easiest — declare @Id as String (Spring Data converts automatically)
@Id
private String id;  // Spring Data handles ObjectId ↔ String conversion
```

**4. `LocalDateTime` / `LocalDate` timezone drift**

MongoDB has one date type: a UTC instant (BSON `Date`). A zone-less Java date stored as one is
therefore resolved against `ZoneId.systemDefault()` on the way in, so the stored value depends on
the host timezone. Under `Europe/London` during BST, `LocalDate 2026-07-21` persists as
`2026-07-20T23:00:00Z` — an hour and a calendar day early.

Use `Instant` for timestamps:

```java
// Wrong — LocalDateTime has no timezone, stored as start-of-day in the JVM's default zone
private LocalDateTime createdAt;

// Correct — always use Instant (UTC)
private Instant createdAt;
```

**A date-only value is a `LocalDate`, stored as a string.** A calendar date — an arrival date, a
date of issue — has no time and no zone, so do not give it either. Type it as `LocalDate` on the
request DTO, on the document and on the response. The JSON contract is the `date` form in
[`rest-api.md`](../rest-api/rest-api.md) → "Dates (RFC 3339 / ISO 8601)" (`"2026-07-21"`), and
Mongo holds the same string. The value never becomes a BSON `Date`, so no zone takes part and
there is nothing to drift. Keep `Instant` for moments — `created`, `updated`, `submittedAt`.

```java
// Wire DTO — the caller sends a calendar date
@Schema(description = "Date of issue on the physical document", example = "2026-01-15")
LocalDate dateOfIssue

// Document field — same type, stored as the string "2026-01-15"
private LocalDate dateOfIssue;
```

**Register a `LocalDate` ↔ `String` converter pair.** Left alone, Spring Data's built-in JSR-310
converter writes a `LocalDate` as a BSON `Date` at start-of-day in `ZoneId.systemDefault()` —
the timezone drift above. A pair registered in `MongoCustomConversions` replaces it for every
`LocalDate` field on every document, so a field added later cannot bring the drift back:

```java
@WritingConverter
public class LocalDateToStringConverter implements Converter<LocalDate, String> {
    @Override
    public String convert(LocalDate source) {
        return source.toString();   // "2026-07-21"
    }
}

@ReadingConverter
public class StringToLocalDateConverter implements Converter<String, LocalDate> {
    @Override
    public LocalDate convert(String source) {
        return LocalDate.parse(source);
    }
}
```

`trade-imports-animals-backend` holds the pair in `LocalDateStringConverters` and registers it in
`MongoConfig`. Two things follow from the string form:

- The reading converter runs only where the target property is a `LocalDate`. A `String` field,
  and an untyped payload such as a `Document` or a `Map<String, Object>`, keeps a date-shaped
  string as a string.
- `YYYY-MM-DD` strings sort in date order, so sorts and range queries on these fields work as
  string comparisons.

**Reject a time or an offset at the API.** Jackson's `LocalDateDeserializer` is lenient by
default: sent `"2026-07-21T00:00:00Z"` it keeps the date part and returns 200. Turn leniency off
for the type, so a caller that sends a moment where a calendar date belongs gets 400. Set it once
for `LocalDate` rather than with `@JsonFormat` on each field:

```java
// StrictLocalDateModule — a Jackson Module bean, so @WebMvcTest slices load it too
context.configOverride(LocalDate.class).setFormat(JsonFormat.Value.forLeniency(false));
```

**Convert to an instant only where a downstream contract needs one, and name the zone.** The
GBN-AG `scheduledOccurrenceDateTime` that PIMS reads is an instant, so `TransportEvent` converts
`Transport.arrivalDate` on the way out:

```java
// Correct — the zone is stated, so the string is the same on any host
date.atStartOfDay(ZoneOffset.UTC).toInstant().toString()   // "2026-07-21T00:00:00Z"

// Wrong — resolves against the JVM default zone
date.atStartOfDay(ZoneId.systemDefault()).toInstant()
```

**Don't reach for `ZonedDateTime` here.** It looks like the zone-safe choice, but Mongo has no
zone-aware date type: a `ZonedDateTime` field still serialises to a plain BSON `Date` with the
zone id discarded, and reads back through `ZoneId.systemDefault()` unless it *also* gets a custom
UTC converter. It relocates this bug rather than fixing it. `Instant` is already unambiguously
UTC and needs no converter, which is why it is this codebase's convention for persisted
timestamps.

**Harden the JVM's default zone as well, not instead.** Set `TZ=UTC` on each runtime Docker stage
and `TimeZone.setDefault(TimeZone.getTimeZone("UTC"))` in a static initializer on the
`@SpringBootApplication` class (a static initializer, so `@SpringBootTest` contexts get it too —
they never call `main()`). That gives every zone-less API in the process a safe default, including
code that has not had this scrutiny. It is a complement to `Instant` fields and string-stored
`LocalDate` fields, never a substitute: neither reads the default zone, so both still hold when
the env var is missing or the service runs outside its container, where a zone-less type stored
as a BSON `Date` would be relying on the default alone.

**Verify with a raw read.** A repository round trip decodes with the same zone it encoded with,
so any drift cancels out and the test passes either way. Assert on the stored value itself — a
`String` for a date-only field, a `Date` for a moment:

```java
Document stored = mongoTemplate.getCollection("notification")
    .find(new Document("referenceNumber", referenceNumber))
    .first();

// Date-only field — get(..., String.class) throws if it was stored as a BSON date
assertThat(stored.get("notification", Document.class)
    .get("transport", Document.class)
    .get("arrivalDate", String.class)).isEqualTo("2026-07-21");

// Moment
assertThat(stored.get("created", Date.class).toInstant())
    .hasToString("2026-07-21T00:30:00Z");
```

**5. Unbounded `findAll()` in production**
```java
// Wrong — could return millions of documents
List<Notification> all = repository.findAll();

// Correct — always paginate or filter
Page<Notification> page = repository.findByStatus(DRAFT, PageRequest.of(0, 100));
```

**6. Double-save anti-pattern**
```java
// Wrong — save() + save() causes two writes and unnecessary version conflicts
var saved = repository.save(notification);
saved.setReferenceNumber(generateRef(saved.getId()));
repository.save(saved);  // second save

// Correct — compute everything before saving
notification.setReferenceNumber(generateRef());
repository.save(notification);
```

**7. `DuplicateKeyException` not caught**
```java
// Always handle duplicate key on unique indexes
try {
    repository.save(notification);
} catch (DuplicateKeyException e) {
    throw new ConflictException("Notification already exists: " + notification.getReferenceNumber());
}
```

**8. Transactions on standalone MongoDB**
`@Transactional` will silently succeed on standalone MongoDB but without atomicity. Integration tests must use `MongoDBContainer` (which has a replica set) to catch transaction-related bugs.

**9. Auto-index creation in production**
`spring.data.mongodb.auto-index-creation=true` causes index creation on every startup, which acquires a lock and can cause timeouts under load. Set to `false` in production; manage indexes via migration scripts.

**10. Using `count()` in a transaction**
`mongoTemplate.count(query, class)` uses the deprecated `count` command which doesn't support transactions. Use `mongoTemplate.exactCount(query, class)` or `repository.countBy...()` instead.
