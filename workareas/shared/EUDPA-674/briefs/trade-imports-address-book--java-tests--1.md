# Review brief: java-tests

This brief is 6041 lines. Read it with Read from line 1 to line 6041, in
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
- Group: trade-imports-address-book--java-tests--1
- Repo: trade-imports-address-book
- PR: 22
- Commit reviewed: 491f0276ddc5772d9171a926337fbab7a1f771b3
- Repo checkout: /Users/aminav/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-674/repos/trade-imports-address-book
- Files:
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/address/AddressServiceTest.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfigTest.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandlerTest.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilterTest.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressScopingIT.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressTimingIT.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EcsLoggingIT.java`
  - `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EmfMeterRegistryIT.java`

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

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/address/AddressServiceTest.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/address/AddressServiceTest.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/address/AddressServiceTest.java
index b7253dc..13475a2 100644
--- a/src/test/java/uk/gov/defra/trade/imports/addressbook/address/AddressServiceTest.java
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/address/AddressServiceTest.java
@@ -2,6 +2,7 @@
 
 import static org.assertj.core.api.Assertions.assertThat;
 import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
+import static org.assertj.core.api.Assertions.catchThrowable;
 import static uk.gov.defra.trade.imports.addressbook.address.AddressService.DEFAULT_PAGE_SIZE;
 import static uk.gov.defra.trade.imports.addressbook.address.AddressTestSupport.NO_TTL;
 import static uk.gov.defra.trade.imports.addressbook.address.AddressTestSupport.STORED_ADDRESS_ID;
@@ -15,7 +16,9 @@
 import static org.mockito.Mockito.never;
 import static org.mockito.Mockito.verify;
 import static org.mockito.Mockito.when;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedLogs.loggedBy;
 
+import ch.qos.logback.classic.spi.ILoggingEvent;
 import io.micrometer.core.instrument.MeterRegistry;
 import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
 import java.time.Instant;
@@ -41,6 +44,7 @@
 import uk.gov.defra.trade.imports.addressbook.configuration.AddressTtlConfig;
 import uk.gov.defra.trade.imports.addressbook.exceptions.BadRequestException;
 import uk.gov.defra.trade.imports.addressbook.exceptions.NotFoundException;
+import uk.gov.defra.trade.imports.addressbook.metrics.AddressMetrics;
 
 @ExtendWith(MockitoExtension.class)
 class AddressServiceTest {
@@ -50,6 +54,7 @@ class AddressServiceTest {
   @Mock private AddressRepository repository;
 
   private final MeterRegistry meterRegistry = new SimpleMeterRegistry();
+  private final AddressMetrics addressMetrics = new AddressMetrics(meterRegistry);
   private final AddressMapper addressMapper = Mappers.getMapper(AddressMapper.class);
 
   private AddressService service;
@@ -57,17 +62,22 @@ class AddressServiceTest {
   @BeforeEach
   void setUp() {
     service =
-        new AddressService(repository, addressMapper, meterRegistry, NO_TTL);
+        new AddressService(repository, addressMapper, addressMetrics, NO_TTL);
   }
 
   private AddressService serviceWithTtl(Integer days, String environment) {
     return new AddressService(
         repository,
         addressMapper,
-        meterRegistry,
+        addressMetrics,
         new AddressTtlConfig(days, environment));
   }
 
+  private double changesCounted(String change) {
+    var counter = meterRegistry.find("address.change").tag("change", change).counter();
+    return counter == null ? 0 : counter.count();
+  }
+
   @Test
   void create_setsTheGivenOrganisationIdAndActiveStatus() {
     when(repository.save(any(Address.class)))
@@ -88,6 +98,34 @@ void create_setsTheGivenOrganisationIdAndActiveStatus() {
     assertThat(created.getCountryCode()).isEqualTo("GB");
   }
 
+  @Test
+  void create_logsTheNewAddressIdAndOrganisationId() {
+    when(repository.save(any(Address.class)))
+        .thenAnswer(
+            invocation -> {
+              Address saved = invocation.getArgument(0);
+              saved.setId(STORED_ADDRESS_ID);
+              return saved;
+            });
+    AddressRequest request = validRequest().build();
+
+    List<ILoggingEvent> events =
+        loggedBy(AddressService.class, () -> service.create(request, ORG));
+
+    assertThat(events)
+        .extracting(ILoggingEvent::getFormattedMessage)
+        .containsExactly("Created address " + STORED_ADDRESS_ID + " in organisation " + ORG);
+  }
+
+  @Test
+  void create_countsOneCreate() {
+    when(repository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));
+
+    service.create(validRequest().build(), ORG);
+
+    assertThat(changesCounted("create")).isEqualTo(1);
+  }
+
   @Test
   void create_neverSetsServerFieldsFromTheRequestAndLeavesIdForMongo() {
     ArgumentCaptor<Address> captor = ArgumentCaptor.forClass(Address.class);
@@ -205,6 +243,28 @@ void update_appliesAllRequestFieldValuesAndPreservesTheServerOwnedFields() {
     assertThat(persisted.getCreatedAt()).isEqualTo(STORED_CREATED_AT);
   }
 
+  @Test
+  void update_countsOneUpdate() {
+    when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
+        .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.ACTIVE).build()));
+    when(repository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));
+
+    service.update(STORED_ADDRESS_ID, replacementRequest().build(), ORG);
+
+    assertThat(changesCounted("update")).isEqualTo(1);
+  }
+
+  @Test
+  void update_ofADeletedAddressCountsNoUpdate() {
+    when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
+        .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.DELETED).build()));
+    AddressRequest request = replacementRequest().build();
+
+    catchThrowable(() -> service.update(STORED_ADDRESS_ID, request, ORG));
+
+    assertThat(changesCounted("update")).isZero();
+  }
+
   @Test
   void update_keepsTheExpireAtSetWhenTheAddressWasCreated() {
     AddressService withTtl = serviceWithTtl(7, "dev");
@@ -242,7 +302,8 @@ void update_ofADeletedAddressThrowsNotFound() {
     AddressRequest request = replacementRequest().build();
 
     assertThatExceptionOfType(NotFoundException.class)
-        .isThrownBy(() -> service.update(STORED_ADDRESS_ID, request, ORG));
+        .isThrownBy(() -> service.update(STORED_ADDRESS_ID, request, ORG))
+        .withMessage("Address " + STORED_ADDRESS_ID + " not found in organisation " + ORG);
   }
 
   @Test
@@ -252,7 +313,55 @@ void update_ofAnotherOrganisationsIdThrowsNotFound() {
     AddressRequest request = replacementRequest().build();
 
     assertThatExceptionOfType(NotFoundException.class)
-        .isThrownBy(() -> service.update(STORED_ADDRESS_ID, request, "org-other"));
+        .isThrownBy(() -> service.update(STORED_ADDRESS_ID, request, "org-other"))
+        .withMessage("Address " + STORED_ADDRESS_ID + " not found in organisation org-other");
+  }
+
+  @Test
+  void update_logsTheAddressIdAndOrganisationId() {
+    when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
+        .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.ACTIVE).build()));
+    when(repository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));
+    AddressRequest request = replacementRequest().build();
+
+    List<ILoggingEvent> events =
+        loggedBy(AddressService.class, () -> service.update(STORED_ADDRESS_ID, request, ORG));
+
+    assertThat(events)
+        .extracting(ILoggingEvent::getFormattedMessage)
+        .containsExactly("Updated address " + STORED_ADDRESS_ID + " in organisation " + ORG);
+  }
+
+  @Test
+  void delete_ofAnActiveAddressLogsTheAddressIdAndOrganisationId() {
+    when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
+        .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.ACTIVE).build()));
+    when(repository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));
+
+    List<ILoggingEvent> events =
+        loggedBy(AddressService.class, () -> service.delete(STORED_ADDRESS_ID, ORG));
+
+    assertThat(events)
+        .extracting(ILoggingEvent::getFormattedMessage)
+        .containsExactly("Soft-deleted address " + STORED_ADDRESS_ID + " in organisation " + ORG);
+  }
+
+  @Test
+  void delete_ofAnAlreadyDeletedAddressLogsThatItWasLeftUnchanged() {
+    when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
+        .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.DELETED).build()));
+
+    List<ILoggingEvent> events =
+        loggedBy(AddressService.class, () -> service.delete(STORED_ADDRESS_ID, ORG));
+
+    assertThat(events)
+        .extracting(ILoggingEvent::getFormattedMessage)
+        .containsExactly(
+            "Address "
+                + STORED_ADDRESS_ID
+                + " in organisation "
+                + ORG
+                + " already deleted, left unchanged");
   }
 
   @Test
@@ -283,13 +392,35 @@ void delete_isIdempotentForAnAlreadyDeletedTombstone() {
     assertThat(tombstone.getModifiedAt()).isEqualTo(STORED_MODIFIED_AT);
   }
 
+  @Test
+  void delete_ofAnActiveAddressCountsOneDelete() {
+    when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
+        .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.ACTIVE).build()));
+    when(repository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));
+
+    service.delete(STORED_ADDRESS_ID, ORG);
+
+    assertThat(changesCounted("delete")).isEqualTo(1);
+  }
+
+  @Test
+  void delete_ofAnAlreadyDeletedAddressCountsNoDelete() {
+    when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
+        .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.DELETED).build()));
+
+    service.delete(STORED_ADDRESS_ID, ORG);
+
+    assertThat(changesCounted("delete")).isZero();
+  }
+
   @Test
   void delete_ofAnUnknownOrAnotherOrganisationsIdThrowsNotFound() {
     when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, "org-other"))
         .thenReturn(Optional.empty());
 
     assertThatExceptionOfType(NotFoundException.class)
-        .isThrownBy(() -> service.delete(STORED_ADDRESS_ID, "org-other"));
+        .isThrownBy(() -> service.delete(STORED_ADDRESS_ID, "org-other"))
+        .withMessage("Address " + STORED_ADDRESS_ID + " not found in organisation org-other");
   }
 
   private List<Address> activeAddresses(int count) {
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.address;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  import static org.assertj.core.api.Assertions.assertThatExceptionOfType;
    5  import static org.assertj.core.api.Assertions.catchThrowable;
    6  import static uk.gov.defra.trade.imports.addressbook.address.AddressService.DEFAULT_PAGE_SIZE;
    7  import static uk.gov.defra.trade.imports.addressbook.address.AddressTestSupport.NO_TTL;
    8  import static uk.gov.defra.trade.imports.addressbook.address.AddressTestSupport.STORED_ADDRESS_ID;
    9  import static uk.gov.defra.trade.imports.addressbook.address.AddressTestSupport.STORED_CREATED_AT;
   10  import static uk.gov.defra.trade.imports.addressbook.address.AddressTestSupport.STORED_MODIFIED_AT;
   11  import static uk.gov.defra.trade.imports.addressbook.address.AddressTestSupport.replacementRequest;
   12  import static uk.gov.defra.trade.imports.addressbook.address.AddressTestSupport.storedAddress;
   13  import static uk.gov.defra.trade.imports.addressbook.address.AddressTestSupport.validRequest;
   14  import static org.mockito.ArgumentMatchers.any;
   15  import static org.mockito.ArgumentMatchers.eq;
   16  import static org.mockito.Mockito.never;
   17  import static org.mockito.Mockito.verify;
   18  import static org.mockito.Mockito.when;
   19  import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedLogs.loggedBy;
   20  
   21  import ch.qos.logback.classic.spi.ILoggingEvent;
   22  import io.micrometer.core.instrument.MeterRegistry;
   23  import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
   24  import java.time.Instant;
   25  import java.time.temporal.ChronoUnit;
   26  import java.util.ArrayList;
   27  import java.util.Arrays;
   28  import java.util.List;
   29  import java.util.Optional;
   30  import org.junit.jupiter.api.BeforeEach;
   31  import org.junit.jupiter.api.Test;
   32  import org.junit.jupiter.api.extension.ExtendWith;
   33  import org.junit.jupiter.params.ParameterizedTest;
   34  import org.junit.jupiter.params.provider.ValueSource;
   35  import org.mockito.ArgumentCaptor;
   36  import org.mockito.Mock;
   37  import org.mockito.junit.jupiter.MockitoExtension;
   38  import org.mapstruct.factory.Mappers;
   39  import org.springframework.data.domain.Page;
   40  import org.springframework.data.domain.PageImpl;
   41  import org.springframework.data.domain.PageRequest;
   42  import org.springframework.data.domain.Pageable;
   43  import org.springframework.data.domain.Sort;
   44  import uk.gov.defra.trade.imports.addressbook.configuration.AddressTtlConfig;
   45  import uk.gov.defra.trade.imports.addressbook.exceptions.BadRequestException;
   46  import uk.gov.defra.trade.imports.addressbook.exceptions.NotFoundException;
   47  import uk.gov.defra.trade.imports.addressbook.metrics.AddressMetrics;
   48  
   49  @ExtendWith(MockitoExtension.class)
   50  class AddressServiceTest {
   51  
   52    private static final String ORG = "org-uuid-1";
   53  
   54    @Mock private AddressRepository repository;
   55  
   56    private final MeterRegistry meterRegistry = new SimpleMeterRegistry();
   57    private final AddressMetrics addressMetrics = new AddressMetrics(meterRegistry);
   58    private final AddressMapper addressMapper = Mappers.getMapper(AddressMapper.class);
   59  
   60    private AddressService service;
   61  
   62    @BeforeEach
   63    void setUp() {
   64      service =
   65          new AddressService(repository, addressMapper, addressMetrics, NO_TTL);
   66    }
   67  
   68    private AddressService serviceWithTtl(Integer days, String environment) {
   69      return new AddressService(
   70          repository,
   71          addressMapper,
   72          addressMetrics,
   73          new AddressTtlConfig(days, environment));
   74    }
   75  
   76    private double changesCounted(String change) {
   77      var counter = meterRegistry.find("address.change").tag("change", change).counter();
   78      return counter == null ? 0 : counter.count();
   79    }
   80  
   81    @Test
   82    void create_setsTheGivenOrganisationIdAndActiveStatus() {
   83      when(repository.save(any(Address.class)))
   84          .thenAnswer(
   85              invocation -> {
   86                Address saved = invocation.getArgument(0);
   87                saved.setId(STORED_ADDRESS_ID);
   88                saved.setCreatedAt(Instant.parse("2026-07-14T09:15:27Z"));
   89                saved.setModifiedAt(Instant.parse("2026-07-14T09:15:27Z"));
   90                return saved;
   91              });
   92  
   93      Address created = service.create(validRequest().build(), ORG);
   94  
   95      assertThat(created.getOrganisationId()).isEqualTo(ORG);
   96      assertThat(created.getStatus()).isEqualTo(AddressStatus.ACTIVE);
   97      assertThat(created.getName()).isEqualTo("Highland Livestock Ltd");
   98      assertThat(created.getCountryCode()).isEqualTo("GB");
   99    }
  100  
  101    @Test
  102    void create_logsTheNewAddressIdAndOrganisationId() {
  103      when(repository.save(any(Address.class)))
  104          .thenAnswer(
  105              invocation -> {
  106                Address saved = invocation.getArgument(0);
  107                saved.setId(STORED_ADDRESS_ID);
  108                return saved;
  109              });
  110      AddressRequest request = validRequest().build();
  111  
  112      List<ILoggingEvent> events =
  113          loggedBy(AddressService.class, () -> service.create(request, ORG));
  114  
  115      assertThat(events)
  116          .extracting(ILoggingEvent::getFormattedMessage)
  117          .containsExactly("Created address " + STORED_ADDRESS_ID + " in organisation " + ORG);
  118    }
  119  
  120    @Test
  121    void create_countsOneCreate() {
  122      when(repository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));
  123  
  124      service.create(validRequest().build(), ORG);
  125  
  126      assertThat(changesCounted("create")).isEqualTo(1);
  127    }
  128  
  129    @Test
  130    void create_neverSetsServerFieldsFromTheRequestAndLeavesIdForMongo() {
  131      ArgumentCaptor<Address> captor = ArgumentCaptor.forClass(Address.class);
  132      when(repository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));
  133  
  134      service.create(validRequest().build(), ORG);
  135  
  136      Address persisted = captor.getValue();
  137      assertThat(persisted.getId()).isNull();
  138      assertThat(persisted.getStatus()).isEqualTo(AddressStatus.ACTIVE);
  139      assertThat(persisted.getOrganisationId()).isEqualTo(ORG);
  140      assertThat(persisted.getCreatedAt()).isNull();
  141      assertThat(persisted.getModifiedAt()).isNull();
  142    }
  143  
  144    @Test
  145    void create_inANonProdEnvironmentWithTtlDaysSetsExpireAtThatManyDaysAhead() {
  146      AddressService withTtl = serviceWithTtl(7, "dev");
  147      ArgumentCaptor<Address> captor = ArgumentCaptor.forClass(Address.class);
  148      when(repository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));
  149      Instant before = Instant.now();
  150  
  151      withTtl.create(validRequest().build(), ORG);
  152  
  153      Instant after = Instant.now();
  154      assertThat(captor.getValue().getExpireAt())
  155          .isBetween(before.plus(7, ChronoUnit.DAYS), after.plus(7, ChronoUnit.DAYS));
  156    }
  157  
  158    @Test
  159    void create_withNoTtlDaysConfiguredLeavesExpireAtUnset() {
  160      ArgumentCaptor<Address> captor = ArgumentCaptor.forClass(Address.class);
  161      when(repository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));
  162  
  163      service.create(validRequest().build(), ORG);
  164  
  165      assertThat(captor.getValue().getExpireAt()).isNull();
  166    }
  167  
  168    @Test
  169    void create_inProdNeverSetsExpireAtEvenWithTtlDaysConfigured() {
  170      AddressService inProd = serviceWithTtl(7, "prod");
  171      ArgumentCaptor<Address> captor = ArgumentCaptor.forClass(Address.class);
  172      when(repository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));
  173  
  174      inProd.create(validRequest().build(), ORG);
  175  
  176      assertThat(captor.getValue().getExpireAt()).isNull();
  177    }
  178  
  179    @Test
  180    void get_returnsTheAddressForTheOwningOrganisation() {
  181      Address stored = storedAddress(ORG, AddressStatus.ACTIVE).build();
  182      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  183          .thenReturn(Optional.of(stored));
  184  
  185      Optional<Address> found = service.get(STORED_ADDRESS_ID, ORG);
  186  
  187      assertThat(found).contains(stored);
  188    }
  189  
  190    @Test
  191    void get_forAnotherOrganisationsIdReturnsEmpty() {
  192      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, "org-other"))
  193          .thenReturn(Optional.empty());
  194  
  195      Optional<Address> found = service.get(STORED_ADDRESS_ID, "org-other");
  196  
  197      assertThat(found).isEmpty();
  198    }
  199  
  200    @Test
  201    void get_ofADeletedAddressReturnsItWithStatusDeleted() {
  202      Address tombstone = storedAddress(ORG, AddressStatus.DELETED).build();
  203      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  204          .thenReturn(Optional.of(tombstone));
  205  
  206      Optional<Address> found = service.get(STORED_ADDRESS_ID, ORG);
  207  
  208      assertThat(found).isPresent();
  209      assertThat(found.get().getStatus()).isEqualTo(AddressStatus.DELETED);
  210    }
  211  
  212    @Test
  213    void update_appliesAllRequestFieldValuesAndPreservesTheServerOwnedFields() {
  214      Address existing = storedAddress(ORG, AddressStatus.ACTIVE).build();
  215      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  216          .thenReturn(Optional.of(existing));
  217      ArgumentCaptor<Address> captor = ArgumentCaptor.forClass(Address.class);
  218      when(repository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));
  219  
  220      Address updated = service.update(STORED_ADDRESS_ID, replacementRequest().build(), ORG);
  221  
  222      assertThat(updated.getName()).isEqualTo("Lowland Cattle Co");
  223      assertThat(updated.getAddressLine1()).isEqualTo("2 Market Street");
  224      assertThat(updated.getAddressLine2()).isEqualTo("Suite 5");
  225      assertThat(updated.getTownOrCity()).isEqualTo("Perth");
  226      assertThat(updated.getCounty()).isEqualTo("Perth and Kinross");
  227      assertThat(updated.getPostcode()).isEqualTo("PH1 5AA");
  228      assertThat(updated.getCountryCode()).isEqualTo("IE");
  229      assertThat(updated.getPhone()).isEqualTo("+44 1738 111222");
  230      assertThat(updated.getEmail()).isEqualTo("ops@lowlandcattle.example.com");
  231      assertThat(updated.getRoles()).containsExactly(AddressRole.BRANCH_ADDRESS);
  232      assertThat(updated.getId()).isEqualTo(STORED_ADDRESS_ID);
  233      assertThat(updated.getOrganisationId()).isEqualTo(ORG);
  234      assertThat(updated.getStatus()).isEqualTo(AddressStatus.ACTIVE);
  235      assertThat(updated.getCreatedAt()).isEqualTo(STORED_CREATED_AT);
  236  
  237      Address persisted = captor.getValue();
  238      assertThat(persisted.getName()).isEqualTo("Lowland Cattle Co");
  239      assertThat(persisted.getPhone()).isEqualTo("+44 1738 111222");
  240      assertThat(persisted.getId()).isEqualTo(STORED_ADDRESS_ID);
  241      assertThat(persisted.getOrganisationId()).isEqualTo(ORG);
  242      assertThat(persisted.getStatus()).isEqualTo(AddressStatus.ACTIVE);
  243      assertThat(persisted.getCreatedAt()).isEqualTo(STORED_CREATED_AT);
  244    }
  245  
  246    @Test
  247    void update_countsOneUpdate() {
  248      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  249          .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.ACTIVE).build()));
  250      when(repository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));
  251  
  252      service.update(STORED_ADDRESS_ID, replacementRequest().build(), ORG);
  253  
  254      assertThat(changesCounted("update")).isEqualTo(1);
  255    }
  256  
  257    @Test
  258    void update_ofADeletedAddressCountsNoUpdate() {
  259      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  260          .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.DELETED).build()));
  261      AddressRequest request = replacementRequest().build();
  262  
  263      catchThrowable(() -> service.update(STORED_ADDRESS_ID, request, ORG));
  264  
  265      assertThat(changesCounted("update")).isZero();
  266    }
  267  
  268    @Test
  269    void update_keepsTheExpireAtSetWhenTheAddressWasCreated() {
  270      AddressService withTtl = serviceWithTtl(7, "dev");
  271      Address existing = storedAddress(ORG, AddressStatus.ACTIVE).build();
  272      existing.setExpireAt(Instant.parse("2026-07-21T09:15:27Z"));
  273      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  274          .thenReturn(Optional.of(existing));
  275      ArgumentCaptor<Address> captor = ArgumentCaptor.forClass(Address.class);
  276      when(repository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));
  277  
  278      withTtl.update(STORED_ADDRESS_ID, replacementRequest().build(), ORG);
  279  
  280      assertThat(captor.getValue().getExpireAt()).isEqualTo(Instant.parse("2026-07-21T09:15:27Z"));
  281    }
  282  
  283    @Test
  284    void update_ofAnAddressWithNoExpireAtLeavesItUnsetEvenWithTtlDaysConfigured() {
  285      AddressService withTtl = serviceWithTtl(7, "dev");
  286      Address existing = storedAddress(ORG, AddressStatus.ACTIVE).build();
  287      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  288          .thenReturn(Optional.of(existing));
  289      ArgumentCaptor<Address> captor = ArgumentCaptor.forClass(Address.class);
  290      when(repository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));
  291  
  292      withTtl.update(STORED_ADDRESS_ID, replacementRequest().build(), ORG);
  293  
  294      assertThat(captor.getValue().getExpireAt()).isNull();
  295    }
  296  
  297    @Test
  298    void update_ofADeletedAddressThrowsNotFound() {
  299      Address tombstone = storedAddress(ORG, AddressStatus.DELETED).build();
  300      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  301          .thenReturn(Optional.of(tombstone));
  302      AddressRequest request = replacementRequest().build();
  303  
  304      assertThatExceptionOfType(NotFoundException.class)
  305          .isThrownBy(() -> service.update(STORED_ADDRESS_ID, request, ORG))
  306          .withMessage("Address " + STORED_ADDRESS_ID + " not found in organisation " + ORG);
  307    }
  308  
  309    @Test
  310    void update_ofAnotherOrganisationsIdThrowsNotFound() {
  311      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, "org-other"))
  312          .thenReturn(Optional.empty());
  313      AddressRequest request = replacementRequest().build();
  314  
  315      assertThatExceptionOfType(NotFoundException.class)
  316          .isThrownBy(() -> service.update(STORED_ADDRESS_ID, request, "org-other"))
  317          .withMessage("Address " + STORED_ADDRESS_ID + " not found in organisation org-other");
  318    }
  319  
  320    @Test
  321    void update_logsTheAddressIdAndOrganisationId() {
  322      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  323          .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.ACTIVE).build()));
  324      when(repository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));
  325      AddressRequest request = replacementRequest().build();
  326  
  327      List<ILoggingEvent> events =
  328          loggedBy(AddressService.class, () -> service.update(STORED_ADDRESS_ID, request, ORG));
  329  
  330      assertThat(events)
  331          .extracting(ILoggingEvent::getFormattedMessage)
  332          .containsExactly("Updated address " + STORED_ADDRESS_ID + " in organisation " + ORG);
  333    }
  334  
  335    @Test
  336    void delete_ofAnActiveAddressLogsTheAddressIdAndOrganisationId() {
  337      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  338          .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.ACTIVE).build()));
  339      when(repository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));
  340  
  341      List<ILoggingEvent> events =
  342          loggedBy(AddressService.class, () -> service.delete(STORED_ADDRESS_ID, ORG));
  343  
  344      assertThat(events)
  345          .extracting(ILoggingEvent::getFormattedMessage)
  346          .containsExactly("Soft-deleted address " + STORED_ADDRESS_ID + " in organisation " + ORG);
  347    }
  348  
  349    @Test
  350    void delete_ofAnAlreadyDeletedAddressLogsThatItWasLeftUnchanged() {
  351      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  352          .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.DELETED).build()));
  353  
  354      List<ILoggingEvent> events =
  355          loggedBy(AddressService.class, () -> service.delete(STORED_ADDRESS_ID, ORG));
  356  
  357      assertThat(events)
  358          .extracting(ILoggingEvent::getFormattedMessage)
  359          .containsExactly(
  360              "Address "
  361                  + STORED_ADDRESS_ID
  362                  + " in organisation "
  363                  + ORG
  364                  + " already deleted, left unchanged");
  365    }
  366  
  367    @Test
  368    void delete_flipsAnActiveAddressToADeletedTombstone() {
  369      Address existing = storedAddress(ORG, AddressStatus.ACTIVE).build();
  370      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  371          .thenReturn(Optional.of(existing));
  372      ArgumentCaptor<Address> captor = ArgumentCaptor.forClass(Address.class);
  373      when(repository.save(captor.capture())).thenAnswer(invocation -> invocation.getArgument(0));
  374  
  375      service.delete(STORED_ADDRESS_ID, ORG);
  376  
  377      Address persisted = captor.getValue();
  378      assertThat(persisted.getStatus()).isEqualTo(AddressStatus.DELETED);
  379      assertThat(persisted.getId()).isEqualTo(STORED_ADDRESS_ID);
  380    }
  381  
  382    @Test
  383    void delete_isIdempotentForAnAlreadyDeletedTombstone() {
  384      Address tombstone = storedAddress(ORG, AddressStatus.DELETED).build();
  385      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  386          .thenReturn(Optional.of(tombstone));
  387  
  388      service.delete(STORED_ADDRESS_ID, ORG);
  389  
  390      verify(repository, never()).save(any());
  391      assertThat(tombstone.getStatus()).isEqualTo(AddressStatus.DELETED);
  392      assertThat(tombstone.getModifiedAt()).isEqualTo(STORED_MODIFIED_AT);
  393    }
  394  
  395    @Test
  396    void delete_ofAnActiveAddressCountsOneDelete() {
  397      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  398          .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.ACTIVE).build()));
  399      when(repository.save(any(Address.class))).thenAnswer(invocation -> invocation.getArgument(0));
  400  
  401      service.delete(STORED_ADDRESS_ID, ORG);
  402  
  403      assertThat(changesCounted("delete")).isEqualTo(1);
  404    }
  405  
  406    @Test
  407    void delete_ofAnAlreadyDeletedAddressCountsNoDelete() {
  408      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, ORG))
  409          .thenReturn(Optional.of(storedAddress(ORG, AddressStatus.DELETED).build()));
  410  
  411      service.delete(STORED_ADDRESS_ID, ORG);
  412  
  413      assertThat(changesCounted("delete")).isZero();
  414    }
  415  
  416    @Test
  417    void delete_ofAnUnknownOrAnotherOrganisationsIdThrowsNotFound() {
  418      when(repository.findByIdAndOrganisationId(STORED_ADDRESS_ID, "org-other"))
  419          .thenReturn(Optional.empty());
  420  
  421      assertThatExceptionOfType(NotFoundException.class)
  422          .isThrownBy(() -> service.delete(STORED_ADDRESS_ID, "org-other"))
  423          .withMessage("Address " + STORED_ADDRESS_ID + " not found in organisation org-other");
  424    }
  425  
  426    private List<Address> activeAddresses(int count) {
  427      List<Address> addresses = new ArrayList<>();
  428      for (int i = 0; i < count; i++) {
  429        addresses.add(
  430            storedAddress(ORG, AddressStatus.ACTIVE).id("665f1c2ab3e4d51a2c9d0e" + i).build());
  431      }
  432      return addresses;
  433    }
  434  
  435    private Page<Address> pageOf(List<Address> addresses, int pageIndex, int pageSize, long total) {
  436      return new PageImpl<>(addresses, PageRequest.of(pageIndex, pageSize), total);
  437    }
  438  
  439    private Page<Address> emptyFirstPage() {
  440      return pageOf(List.of(), 0, DEFAULT_PAGE_SIZE, 0);
  441    }
  442  
  443    private static final RequestedListFilters NO_FILTERS =
  444        new RequestedListFilters(null, null, null, null);
  445  
  446    private static RequestedListFilters filtersWithSearchTerm(String searchTerm) {
  447      return new RequestedListFilters(searchTerm, null, null, null);
  448    }
  449  
  450    private static RequestedListFilters filtersWithCountryCodes(List<String> countryCodes) {
  451      return new RequestedListFilters(null, countryCodes, null, null);
  452    }
  453  
  454    @Test
  455    void list_returnsAFullFirstPageWithTotalPages2For30ActiveAddresses() {
  456      when(repository.listLiveAddresses(eq(ORG), any(ListCriteria.class), any(Pageable.class)))
  457          .thenReturn(pageOf(activeAddresses(DEFAULT_PAGE_SIZE), 0, DEFAULT_PAGE_SIZE, 30));
  458  
  459      AddressPageResponse response = service.list(ORG, 1, null, NO_FILTERS);
  460  
  461      assertThat(response.items()).hasSize(DEFAULT_PAGE_SIZE);
  462      assertThat(response.page()).isEqualTo(1);
  463      assertThat(response.pageSize()).isEqualTo(DEFAULT_PAGE_SIZE);
  464      assertThat(response.totalItems()).isEqualTo(30);
  465      assertThat(response.totalPages()).isEqualTo(2);
  466    }
  467  
  468    @Test
  469    void list_pageTwoReturnsTheRemaining5AddressesWithTotalPagesStill2() {
  470      when(repository.listLiveAddresses(eq(ORG), any(ListCriteria.class), any(Pageable.class)))
  471          .thenReturn(pageOf(activeAddresses(5), 1, DEFAULT_PAGE_SIZE, 30));
  472  
  473      AddressPageResponse response = service.list(ORG, 2, null, NO_FILTERS);
  474  
  475      assertThat(response.items()).hasSize(5);
  476      assertThat(response.page()).isEqualTo(2);
  477      assertThat(response.totalItems()).isEqualTo(30);
  478      assertThat(response.totalPages()).isEqualTo(2);
  479    }
  480  
  481    @Test
  482    void list_asksForNewestFirstAndTranslatesToA0BasedPage() {
  483      ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
  484      when(repository.listLiveAddresses(eq(ORG), any(ListCriteria.class), pageableCaptor.capture()))
  485          .thenReturn(pageOf(List.of(), 1, DEFAULT_PAGE_SIZE, 0));
  486  
  487      service.list(ORG, 2, null, NO_FILTERS);
  488  
  489      Pageable pageable = pageableCaptor.getValue();
  490      assertThat(pageable.getPageNumber()).isEqualTo(1);
  491      assertThat(pageable.getPageSize()).isEqualTo(DEFAULT_PAGE_SIZE);
  492      assertThat(pageable.getSort().getOrderFor("createdAt").getDirection())
  493          .isEqualTo(Sort.Direction.DESC);
  494    }
  495  
  496    @ParameterizedTest
  497    @ValueSource(ints = {1, 8, 100})
  498    void list_withARequestedPageSizeServesThatPageSize(int requestedPageSize) {
  499      ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
  500      when(repository.listLiveAddresses(eq(ORG), any(ListCriteria.class), pageableCaptor.capture()))
  501          .thenReturn(pageOf(List.of(), 0, requestedPageSize, 0));
  502  
  503      AddressPageResponse response = service.list(ORG, 1, requestedPageSize, NO_FILTERS);
  504  
  505      assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(requestedPageSize);
  506      assertThat(response.pageSize()).isEqualTo(requestedPageSize);
  507    }
  508  
  509    @ParameterizedTest
  510    @ValueSource(ints = {0, -1, 101})
  511    void list_withARequestedPageSizeOutside1To100IsABadRequest(int requestedPageSize) {
  512      assertThatExceptionOfType(BadRequestException.class)
  513          .isThrownBy(() -> service.list(ORG, 1, requestedPageSize, NO_FILTERS));
  514    }
  515  
  516    @Test
  517    void list_withAPageBelow1IsABadRequest() {
  518      assertThatExceptionOfType(BadRequestException.class)
  519          .isThrownBy(() -> service.list(ORG, 0, null, NO_FILTERS));
  520    }
  521  
  522  
  523    private ListCriteria criteriaPassedFor(RequestedListFilters filters) {
  524      ArgumentCaptor<ListCriteria> criteriaCaptor = ArgumentCaptor.forClass(ListCriteria.class);
  525      when(repository.listLiveAddresses(eq(ORG), criteriaCaptor.capture(), any(Pageable.class)))
  526          .thenReturn(emptyFirstPage());
  527  
  528      service.list(ORG, 1, null, filters);
  529  
  530      return criteriaCaptor.getValue();
  531    }
  532  
  533    @Test
  534    void list_withSeveralCountryCodesTrimsEachAndDropsBlanksAndNulls() {
  535      ListCriteria passed =
  536          criteriaPassedFor(filtersWithCountryCodes(Arrays.asList(" FR ", " ", null, "GB")));
  537  
  538      assertThat(passed)
  539          .isEqualTo(
  540              new ListCriteria(
  541                  List.of(), List.of(new ListCriteria.InCountries(List.of("FR", "GB")))));
  542    }
  543  
  544    @Test
  545    void list_withOnlyBlankCountryCodesPassesNoCountryCodes() {
  546      ListCriteria passed = criteriaPassedFor(filtersWithCountryCodes(List.of("  ")));
  547  
  548      assertThat(passed).isEqualTo(new ListCriteria(List.of(), List.of()));
  549    }
  550  
  551    @Test
  552    void list_passesTheSearchTermAsAPartialMatchPattern() {
  553      ListCriteria passed = criteriaPassedFor(filtersWithSearchTerm("farm"));
  554  
  555      assertThat(passed)
  556          .isEqualTo(
  557              new ListCriteria(List.of(), List.of(new ListCriteria.TextMatching(".*\\Qfarm\\E.*"))));
  558    }
  559  
  560    @Test
  561    void list_trimsTheSearchTermBeforeBuildingThePattern() {
  562      ListCriteria passed = criteriaPassedFor(filtersWithSearchTerm("  farm  "));
  563  
  564      assertThat(passed)
  565          .isEqualTo(
  566              new ListCriteria(List.of(), List.of(new ListCriteria.TextMatching(".*\\Qfarm\\E.*"))));
  567    }
  568  
  569    @Test
  570    void list_withABlankSearchTermPassesNoPattern() {
  571      ListCriteria passed = criteriaPassedFor(filtersWithSearchTerm("   "));
  572  
  573      assertThat(passed).isEqualTo(new ListCriteria(List.of(), List.of()));
  574    }
  575  
  576    @Test
  577    void list_passesTheSearchPatternAndTrimmedCountryCodesTogether() {
  578      ListCriteria passed =
  579          criteriaPassedFor(new RequestedListFilters("France", List.of(" FR "), null, null));
  580  
  581      assertThat(passed)
  582          .isEqualTo(
  583              new ListCriteria(
  584                  List.of(),
  585                  List.of(
  586                      new ListCriteria.TextMatching(".*\\QFrance\\E.*"),
  587                      new ListCriteria.InCountries(List.of("FR")))));
  588    }
  589  
  590    @Test
  591    void list_passesTheRolesToKeepWithoutNullsOrRepeats() {
  592      ListCriteria passed =
  593          criteriaPassedFor(
  594              new RequestedListFilters(
  595                  null,
  596                  null,
  597                  Arrays.asList(
  598                      AddressRole.CONSIGNEE, null, AddressRole.IMPORTER, AddressRole.CONSIGNEE),
  599                  null));
  600  
  601      assertThat(passed)
  602          .isEqualTo(
  603              new ListCriteria(List.of(AddressRole.CONSIGNEE, AddressRole.IMPORTER), List.of()));
  604    }
  605  
  606    @Test
  607    void list_passesTheSearchRolesAsOneMatch() {
  608      ListCriteria passed =
  609          criteriaPassedFor(
  610              new RequestedListFilters(
  611                  null, null, null, Arrays.asList(AddressRole.CONSIGNOR, null, AddressRole.IMPORTER)));
  612  
  613      assertThat(passed)
  614          .isEqualTo(
  615              new ListCriteria(
  616                  List.of(),
  617                  List.of(
  618                      new ListCriteria.HoldingAnyRole(
  619                          List.of(AddressRole.CONSIGNOR, AddressRole.IMPORTER)))));
  620    }
  621  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfigTest.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfigTest.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfigTest.java
index 030981f..99820a7 100644
--- a/src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfigTest.java
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfigTest.java
@@ -16,10 +16,26 @@
 import org.junit.jupiter.api.Test;
 import org.junit.jupiter.api.extension.ExtendWith;
 import org.mockito.junit.jupiter.MockitoExtension;
+import org.springframework.boot.convert.ApplicationConversionService;
+import org.springframework.boot.test.context.runner.ApplicationContextRunner;
+import org.springframework.context.ConfigurableApplicationContext;
+import org.springframework.core.convert.ConversionService;
+import uk.gov.defra.trade.imports.addressbook.metrics.EmfMeterRegistry;
 
 @ExtendWith(MockitoExtension.class)
 class MetricsConfigTest {
 
+  private final ApplicationContextRunner contextRunner =
+      new ApplicationContextRunner()
+          .withUserConfiguration(MetricsConfig.class)
+          .withBean(
+              ConfigurableApplicationContext.CONVERSION_SERVICE_BEAN_NAME,
+              ConversionService.class,
+              ApplicationConversionService::getSharedInstance)
+          .withBean(
+              SimpleMeterRegistry.class, SimpleMeterRegistry::new, bean -> bean.setPrimary(true))
+          .withPropertyValues("aws.emf.namespace=test-namespace", "aws.emf.step=1m");
+
   private MetricsConfig metricsConfig;
   private MeterRegistry meterRegistry;
 
@@ -29,6 +45,24 @@ void setUp() {
     meterRegistry = new SimpleMeterRegistry();
   }
 
+  @Test
+  void emfMeterRegistry_isCreatedWhenEmfIsEnabled() {
+    contextRunner
+        .withPropertyValues("aws.emf.enabled=true")
+        .run(context -> assertThat(context).hasSingleBean(EmfMeterRegistry.class));
+  }
+
+  @Test
+  void emfMeterRegistry_isLeftOutWhenEmfIsDisabled() {
+    contextRunner
+        .withPropertyValues("aws.emf.enabled=false")
+        .run(
+            context -> {
+              assertThat(context).hasNotFailed();
+              assertThat(context).doesNotHaveBean(EmfMeterRegistry.class);
+            });
+  }
+
   @Test
   void timedAspect_recordsTimedMetricWhenIntercepted() throws Throwable {
     // Given
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.configuration;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  import static org.mockito.Mockito.mock;
    5  import static org.mockito.Mockito.when;
    6  
    7  import io.micrometer.core.annotation.Timed;
    8  import io.micrometer.core.aop.CountedAspect;
    9  import io.micrometer.core.aop.TimedAspect;
   10  import io.micrometer.core.instrument.MeterRegistry;
   11  import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
   12  import java.lang.reflect.Method;
   13  import org.aspectj.lang.ProceedingJoinPoint;
   14  import org.aspectj.lang.reflect.MethodSignature;
   15  import org.junit.jupiter.api.BeforeEach;
   16  import org.junit.jupiter.api.Test;
   17  import org.junit.jupiter.api.extension.ExtendWith;
   18  import org.mockito.junit.jupiter.MockitoExtension;
   19  import org.springframework.boot.convert.ApplicationConversionService;
   20  import org.springframework.boot.test.context.runner.ApplicationContextRunner;
   21  import org.springframework.context.ConfigurableApplicationContext;
   22  import org.springframework.core.convert.ConversionService;
   23  import uk.gov.defra.trade.imports.addressbook.metrics.EmfMeterRegistry;
   24  
   25  @ExtendWith(MockitoExtension.class)
   26  class MetricsConfigTest {
   27  
   28    private final ApplicationContextRunner contextRunner =
   29        new ApplicationContextRunner()
   30            .withUserConfiguration(MetricsConfig.class)
   31            .withBean(
   32                ConfigurableApplicationContext.CONVERSION_SERVICE_BEAN_NAME,
   33                ConversionService.class,
   34                ApplicationConversionService::getSharedInstance)
   35            .withBean(
   36                SimpleMeterRegistry.class, SimpleMeterRegistry::new, bean -> bean.setPrimary(true))
   37            .withPropertyValues("aws.emf.namespace=test-namespace", "aws.emf.step=1m");
   38  
   39    private MetricsConfig metricsConfig;
   40    private MeterRegistry meterRegistry;
   41  
   42    @BeforeEach
   43    void setUp() {
   44      metricsConfig = new MetricsConfig();
   45      meterRegistry = new SimpleMeterRegistry();
   46    }
   47  
   48    @Test
   49    void emfMeterRegistry_isCreatedWhenEmfIsEnabled() {
   50      contextRunner
   51          .withPropertyValues("aws.emf.enabled=true")
   52          .run(context -> assertThat(context).hasSingleBean(EmfMeterRegistry.class));
   53    }
   54  
   55    @Test
   56    void emfMeterRegistry_isLeftOutWhenEmfIsDisabled() {
   57      contextRunner
   58          .withPropertyValues("aws.emf.enabled=false")
   59          .run(
   60              context -> {
   61                assertThat(context).hasNotFailed();
   62                assertThat(context).doesNotHaveBean(EmfMeterRegistry.class);
   63              });
   64    }
   65  
   66    @Test
   67    void timedAspect_recordsTimedMetricWhenIntercepted() throws Throwable {
   68      // Given
   69      TimedAspect timedAspect = metricsConfig.timedAspect(meterRegistry);
   70      ProceedingJoinPoint joinPoint = mock(ProceedingJoinPoint.class);
   71      MethodSignature signature = mock(MethodSignature.class);
   72      Method method = TimedTarget.class.getDeclaredMethod("timedOperation");
   73      when(joinPoint.getSignature()).thenReturn(signature);
   74      when(signature.getMethod()).thenReturn(method);
   75      when(joinPoint.proceed()).thenReturn("done");
   76  
   77      // When
   78      timedAspect.timedMethod(joinPoint);
   79  
   80      // Then
   81      assertThat(meterRegistry.find("test.timed.operation").timer()).isNotNull();
   82    }
   83  
   84    @Test
   85    void countedAspect_isCreatedWithTheSuppliedRegistry() {
   86      // When
   87      CountedAspect result = metricsConfig.countedAspect(meterRegistry);
   88  
   89      // Then
   90      assertThat(result).isNotNull();
   91    }
   92  
   93    private static final class TimedTarget {
   94      @Timed("test.timed.operation")
   95      void timedOperation() {}
   96    }
   97  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandlerTest.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandlerTest.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandlerTest.java
index 2f7a1df..c7bc1ad 100644
--- a/src/test/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandlerTest.java
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandlerTest.java
@@ -126,7 +126,8 @@ void handleNotFoundException_shouldReturn404ProblemJsonWithTraceId() {
     MDC.put("trace.id", "trace-404");
 
     ResponseEntity<Problem> response =
-        exceptionHandler.handleNotFoundException(new NotFoundException("Address not found"));
+        exceptionHandler.handleNotFoundException(
+            NotFoundException.addressNotFound("addr-1", "org-a"));
 
     assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
     assertThat(response.getHeaders().getContentType())
@@ -203,11 +204,64 @@ void handleOptimisticLocking_shouldReturn409ConflictProblem() {
   @Test
   void handleNotFoundException_shouldOmitTraceIdWhenAbsentFromMdc() {
     ResponseEntity<Problem> response =
-        exceptionHandler.handleNotFoundException(new NotFoundException("gone"));
+        exceptionHandler.handleNotFoundException(
+            NotFoundException.addressNotFound("addr-1", "org-a"));
 
     assertThat(response.getBody().traceId()).isNull();
   }
 
+  @Test
+  void handleNotFoundException_logsAnUnknownAddressWithTheAddressIdAndOrganisationId() {
+    List<ILoggingEvent> events =
+        CapturedLogs.loggedBy(
+            GlobalExceptionHandler.class,
+            () ->
+                exceptionHandler.handleNotFoundException(
+                    NotFoundException.addressNotFound("addr-1", "org-a")));
+
+    assertThat(events)
+        .singleElement()
+        .extracting(ILoggingEvent::getFormattedMessage)
+        .asString()
+        .endsWith("Address addr-1 not found in organisation org-a");
+  }
+
+  @Test
+  void handleNotFoundException_logsAnOrganisationMismatchWithBothOrganisationIds() {
+    List<ILoggingEvent> events =
+        CapturedLogs.loggedBy(
+            GlobalExceptionHandler.class,
+            () ->
+                exceptionHandler.handleNotFoundException(
+                    NotFoundException.organisationMismatch("org-path", "org-header")));
+
+    assertThat(events)
+        .singleElement()
+        .extracting(ILoggingEvent::getFormattedMessage)
+        .asString()
+        .endsWith(
+            "Organisation mismatch: path orgId org-path is not the caller's organisation"
+                + " org-header");
+  }
+
+  @Test
+  void handleNotFoundException_answersAnOrganisationMismatchWithTheUnknownAddressBody() {
+    MDC.put("trace.id", "trace-404");
+
+    Problem mismatch =
+        exceptionHandler
+            .handleNotFoundException(
+                NotFoundException.organisationMismatch("org-path", "org-header"))
+            .getBody();
+    Problem unknownAddress =
+        exceptionHandler
+            .handleNotFoundException(NotFoundException.addressNotFound("addr-1", "org-a"))
+            .getBody();
+
+    assertThat(mismatch).isEqualTo(unknownAddress);
+    assertThat(mismatch.detail()).isEqualTo("Address not found");
+  }
+
   @Test
   void handleValidationException_shouldLogTheRejectedFieldNamesButNotTheirValues() {
     BindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "addressRequest");
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.exceptions;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  import static org.mockito.Mockito.mock;
    5  import static org.mockito.Mockito.when;
    6  
    7  import ch.qos.logback.classic.spi.ILoggingEvent;
    8  import java.lang.reflect.Method;
    9  import java.util.List;
   10  import java.util.Map;
   11  import org.junit.jupiter.api.AfterEach;
   12  import org.junit.jupiter.api.BeforeEach;
   13  import org.junit.jupiter.api.Test;
   14  import org.slf4j.MDC;
   15  import org.springframework.core.MethodParameter;
   16  import org.springframework.dao.OptimisticLockingFailureException;
   17  import org.springframework.http.HttpStatus;
   18  import org.springframework.http.MediaType;
   19  import org.springframework.http.ResponseEntity;
   20  import org.springframework.http.converter.HttpMessageNotReadableException;
   21  import org.springframework.validation.BeanPropertyBindingResult;
   22  import org.springframework.validation.BindingResult;
   23  import org.springframework.validation.FieldError;
   24  import org.springframework.web.bind.MethodArgumentNotValidException;
   25  import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
   26  import uk.gov.defra.trade.imports.addressbook.testsupport.CapturedLogs;
   27  
   28  class GlobalExceptionHandlerTest {
   29  
   30    private GlobalExceptionHandler exceptionHandler;
   31  
   32    @BeforeEach
   33    void setUp() {
   34      exceptionHandler = new GlobalExceptionHandler();
   35      MDC.clear();
   36    }
   37  
   38    @AfterEach
   39    void tearDown() {
   40      MDC.clear();
   41    }
   42  
   43    @Test
   44    void handleValidationException_shouldReturn400WithAnErrorsMapKeyedByFieldAndTraceId() {
   45      MDC.put("trace.id", "trace-abc");
   46  
   47      ResponseEntity<ValidationProblem> response =
   48          exceptionHandler.handleValidationException(
   49              validationException(
   50                  new FieldError("addressRequest", "addressLine1", "Enter address line 1"),
   51                  new FieldError("addressRequest", "email", "Enter an email address")));
   52  
   53      assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
   54      assertThat(response.getHeaders().getContentType())
   55          .isEqualTo(MediaType.APPLICATION_PROBLEM_JSON);
   56  
   57      ValidationProblem body = response.getBody();
   58      assertThat(body).isNotNull();
   59      assertThat(body.type())
   60          .isEqualTo("https://api.cdp.defra.cloud/problems/validation-error");
   61      assertThat(body.title()).isEqualTo("Validation Error");
   62      assertThat(body.status()).isEqualTo(HttpStatus.BAD_REQUEST.value());
   63      assertThat(body.traceId()).isEqualTo("trace-abc");
   64  
   65      Map<String, List<String>> errors = body.errors();
   66      assertThat(errors).containsKey("addressLine1");
   67      assertThat(errors.get("addressLine1")).containsExactly("Enter address line 1");
   68      assertThat(errors.get("email")).containsExactly("Enter an email address");
   69    }
   70  
   71    @Test
   72    void handleValidationException_shouldCollapseMultipleMessagesForOneFieldIntoAList() {
   73      ResponseEntity<ValidationProblem> response =
   74          exceptionHandler.handleValidationException(
   75              validationException(
   76                  new FieldError("addressRequest", "name", "must not be blank"),
   77                  new FieldError("addressRequest", "name", "size must be at most 255")));
   78  
   79      assertThat(response.getBody().errors().get("name"))
   80          .containsExactly("must not be blank", "size must be at most 255");
   81    }
   82  
   83    @Test
   84    void handleBadRequestException_shouldReturnDistinct400ShapeWithNoErrorsMap() {
   85      MDC.put("trace.id", "trace-xyz");
   86  
   87      ResponseEntity<Problem> response =
   88          exceptionHandler.handleBadRequestException(
   89              new BadRequestException("Trade-Imports-Crn header is required"));
   90  
   91      assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
   92      assertThat(response.getHeaders().getContentType())
   93          .isEqualTo(MediaType.APPLICATION_PROBLEM_JSON);
   94  
   95      Problem body = response.getBody();
   96      assertThat(body).isNotNull();
   97      assertThat(body.type())
   98          .isEqualTo("https://api.cdp.defra.cloud/problems/bad-request");
   99      assertThat(body.title()).isEqualTo("Bad Request");
  100      assertThat(body.detail()).isEqualTo("Trade-Imports-Crn header is required");
  101      assertThat(body.traceId()).isEqualTo("trace-xyz");
  102    }
  103  
  104    @Test
  105    void handleValidationException_andBadRequestException_shouldProduceDistinct400Shapes() {
  106      MDC.put("trace.id", "trace-shared");
  107  
  108      ValidationProblem validation =
  109          exceptionHandler
  110              .handleValidationException(
  111                  validationException(
  112                      new FieldError("addressRequest", "postcode", "Enter a postcode")))
  113              .getBody();
  114      Problem badRequest =
  115          exceptionHandler
  116              .handleBadRequestException(new BadRequestException("missing header"))
  117              .getBody();
  118  
  119      assertThat(validation.status()).isEqualTo(badRequest.status());
  120      assertThat(validation.errors()).isNotEmpty();
  121      assertThat(badRequest.type()).isNotEqualTo(validation.type());
  122    }
  123  
  124    @Test
  125    void handleNotFoundException_shouldReturn404ProblemJsonWithTraceId() {
  126      MDC.put("trace.id", "trace-404");
  127  
  128      ResponseEntity<Problem> response =
  129          exceptionHandler.handleNotFoundException(
  130              NotFoundException.addressNotFound("addr-1", "org-a"));
  131  
  132      assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
  133      assertThat(response.getHeaders().getContentType())
  134          .isEqualTo(MediaType.APPLICATION_PROBLEM_JSON);
  135      Problem body = response.getBody();
  136      assertThat(body.type())
  137          .isEqualTo("https://api.cdp.defra.cloud/problems/not-found");
  138      assertThat(body.title()).isEqualTo("Resource Not Found");
  139      assertThat(body.detail()).isEqualTo("Address not found");
  140      assertThat(body.traceId()).isEqualTo("trace-404");
  141    }
  142  
  143    @Test
  144    void handleException_shouldReturn500InternalErrorProblem() {
  145      ResponseEntity<Problem> response =
  146          exceptionHandler.handleException(new RuntimeException("boom"));
  147  
  148      assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
  149      Problem body = response.getBody();
  150      assertThat(body.type())
  151          .isEqualTo("https://api.cdp.defra.cloud/problems/internal-error");
  152      assertThat(body.title()).isEqualTo("Internal Server Error");
  153      assertThat(body.detail())
  154          .isEqualTo("An unexpected error occurred. Please try again later.");
  155    }
  156  
  157    @Test
  158    void handleTypeMismatch_shouldReturn400BadRequestProblemNamingTheParameter() {
  159      MethodParameter parameter = validationTargetParameter();
  160      MethodArgumentTypeMismatchException ex =
  161          new MethodArgumentTypeMismatchException("abc", Integer.class, "page", parameter, null);
  162  
  163      ResponseEntity<Problem> response = exceptionHandler.handleTypeMismatch(ex);
  164  
  165      assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
  166      Problem body = response.getBody();
  167      assertThat(body).isNotNull();
  168      assertThat(body.detail()).contains("page");
  169      assertThat(body.traceId()).isNull();
  170    }
  171  
  172    @Test
  173    void handleMessageNotReadable_shouldReturn400BadRequestProblem() {
  174      MDC.put("trace.id", "trace-malformed");
  175  
  176      ResponseEntity<Problem> response =
  177          exceptionHandler.handleMessageNotReadable(
  178              new HttpMessageNotReadableException("JSON parse error", (Throwable) null));
  179  
  180      assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
  181      assertThat(response.getHeaders().getContentType())
  182          .isEqualTo(MediaType.APPLICATION_PROBLEM_JSON);
  183      Problem body = response.getBody();
  184      assertThat(body.type())
  185          .isEqualTo("https://api.cdp.defra.cloud/problems/bad-request");
  186      assertThat(body.traceId()).isEqualTo("trace-malformed");
  187    }
  188  
  189    @Test
  190    void handleOptimisticLocking_shouldReturn409ConflictProblem() {
  191      ResponseEntity<Problem> response =
  192          exceptionHandler.handleOptimisticLocking(new OptimisticLockingFailureException("stale"));
  193  
  194      assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
  195      assertThat(response.getHeaders().getContentType())
  196          .isEqualTo(MediaType.APPLICATION_PROBLEM_JSON);
  197      Problem body = response.getBody();
  198      assertThat(body.type())
  199          .isEqualTo("https://api.cdp.defra.cloud/problems/conflict");
  200      assertThat(body.title()).isEqualTo("Conflict");
  201      assertThat(body.detail()).isEqualTo("The resource was modified by another request");
  202    }
  203  
  204    @Test
  205    void handleNotFoundException_shouldOmitTraceIdWhenAbsentFromMdc() {
  206      ResponseEntity<Problem> response =
  207          exceptionHandler.handleNotFoundException(
  208              NotFoundException.addressNotFound("addr-1", "org-a"));
  209  
  210      assertThat(response.getBody().traceId()).isNull();
  211    }
  212  
  213    @Test
  214    void handleNotFoundException_logsAnUnknownAddressWithTheAddressIdAndOrganisationId() {
  215      List<ILoggingEvent> events =
  216          CapturedLogs.loggedBy(
  217              GlobalExceptionHandler.class,
  218              () ->
  219                  exceptionHandler.handleNotFoundException(
  220                      NotFoundException.addressNotFound("addr-1", "org-a")));
  221  
  222      assertThat(events)
  223          .singleElement()
  224          .extracting(ILoggingEvent::getFormattedMessage)
  225          .asString()
  226          .endsWith("Address addr-1 not found in organisation org-a");
  227    }
  228  
  229    @Test
  230    void handleNotFoundException_logsAnOrganisationMismatchWithBothOrganisationIds() {
  231      List<ILoggingEvent> events =
  232          CapturedLogs.loggedBy(
  233              GlobalExceptionHandler.class,
  234              () ->
  235                  exceptionHandler.handleNotFoundException(
  236                      NotFoundException.organisationMismatch("org-path", "org-header")));
  237  
  238      assertThat(events)
  239          .singleElement()
  240          .extracting(ILoggingEvent::getFormattedMessage)
  241          .asString()
  242          .endsWith(
  243              "Organisation mismatch: path orgId org-path is not the caller's organisation"
  244                  + " org-header");
  245    }
  246  
  247    @Test
  248    void handleNotFoundException_answersAnOrganisationMismatchWithTheUnknownAddressBody() {
  249      MDC.put("trace.id", "trace-404");
  250  
  251      Problem mismatch =
  252          exceptionHandler
  253              .handleNotFoundException(
  254                  NotFoundException.organisationMismatch("org-path", "org-header"))
  255              .getBody();
  256      Problem unknownAddress =
  257          exceptionHandler
  258              .handleNotFoundException(NotFoundException.addressNotFound("addr-1", "org-a"))
  259              .getBody();
  260  
  261      assertThat(mismatch).isEqualTo(unknownAddress);
  262      assertThat(mismatch.detail()).isEqualTo("Address not found");
  263    }
  264  
  265    @Test
  266    void handleValidationException_shouldLogTheRejectedFieldNamesButNotTheirValues() {
  267      BindingResult bindingResult = new BeanPropertyBindingResult(new Object(), "addressRequest");
  268      bindingResult.addError(
  269          new FieldError(
  270              "addressRequest",
  271              "email",
  272              "jo.bloggs@example.com.invalid@",
  273              false,
  274              null,
  275              null,
  276              "Enter an email address in the correct format"));
  277  
  278      List<ILoggingEvent> events =
  279          CapturedLogs.loggedBy(
  280              GlobalExceptionHandler.class,
  281              () ->
  282                  exceptionHandler.handleValidationException(
  283                      new MethodArgumentNotValidException(validationTargetParameter(), bindingResult)));
  284  
  285      assertThat(events)
  286          .singleElement()
  287          .satisfies(
  288              event -> {
  289                assertThat(event.getFormattedMessage()).contains("[email]");
  290                assertThat(event.getFormattedMessage()).doesNotContain("jo.bloggs");
  291                assertThat(event.getThrowableProxy()).isNull();
  292              });
  293    }
  294  
  295    @SuppressWarnings("unused")
  296    private void validationTarget(Object body) {}
  297  
  298    private MethodParameter validationTargetParameter() {
  299      try {
  300        Method method = this.getClass().getDeclaredMethod("validationTarget", Object.class);
  301        return new MethodParameter(method, 0);
  302      } catch (NoSuchMethodException e) {
  303        throw new IllegalStateException("Failed to find the validation target method", e);
  304      }
  305    }
  306  
  307    private MethodArgumentNotValidException validationException(FieldError... fieldErrors) {
  308      BindingResult bindingResult = mock(BindingResult.class);
  309      when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldErrors));
  310      return new MethodArgumentNotValidException(validationTargetParameter(), bindingResult);
  311    }
  312  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilterTest.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilterTest.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilterTest.java
index c6c8a51..51a8780 100644
--- a/src/test/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilterTest.java
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilterTest.java
@@ -2,24 +2,25 @@
 
 import static org.assertj.core.api.Assertions.assertThat;
 
-import ch.qos.logback.classic.Logger;
 import ch.qos.logback.classic.spi.ILoggingEvent;
-import ch.qos.logback.core.read.ListAppender;
 import com.fasterxml.jackson.databind.ObjectMapper;
 import com.fasterxml.jackson.databind.PropertyNamingStrategies;
 import jakarta.servlet.FilterChain;
+import jakarta.servlet.ServletException;
+import java.io.IOException;
 import java.util.HashMap;
+import java.util.List;
 import java.util.Map;
 import java.util.concurrent.atomic.AtomicBoolean;
 import org.junit.jupiter.api.AfterEach;
 import org.junit.jupiter.api.BeforeEach;
 import org.junit.jupiter.api.Test;
-import org.slf4j.LoggerFactory;
 import org.slf4j.MDC;
 import org.springframework.http.HttpStatus;
 import org.springframework.http.MediaType;
 import org.springframework.mock.web.MockHttpServletRequest;
 import org.springframework.mock.web.MockHttpServletResponse;
+import uk.gov.defra.trade.imports.addressbook.testsupport.CapturedLogs;
 
 class IdentityHeaderFilterTest {
 
@@ -192,6 +193,32 @@ void pathOrgMismatchReturns404BeforeTheChainRuns() throws Exception {
         .isEqualTo("https://api.cdp.defra.cloud/problems/not-found");
   }
 
+  @Test
+  void pathOrgMismatchLogsBothOrganisationIdsAndAnswersAddressNotFound() throws Exception {
+    MockHttpServletRequest request = new MockHttpServletRequest("GET", "/organisation/org-a/addresses");
+    request.setServletPath("/organisation/org-a/addresses");
+    request.addHeader(ORGANISATION_ID_HEADER, "org-b");
+    MockHttpServletResponse response = new MockHttpServletResponse();
+
+    List<ILoggingEvent> events =
+        CapturedLogs.loggedBy(
+            IdentityHeaderFilter.class,
+            () -> {
+              try {
+                filter.doFilter(request, response, new RecordingChain());
+              } catch (IOException | ServletException e) {
+                throw new IllegalStateException(e);
+              }
+            });
+
+    assertThat(events)
+        .extracting(ILoggingEvent::getFormattedMessage)
+        .containsExactly(
+            "Rejected /organisation request: Organisation mismatch: path orgId org-a is not the"
+                + " caller's organisation org-b (trace: null)");
+    assertThat(parseBody(response)).containsEntry("detail", "Address not found");
+  }
+
   @Test
   void mdcOrganisationIdIsRemovedAfterSuccessfulRequest() throws Exception {
     // Given
@@ -245,32 +272,31 @@ void invalidOrganisationIdValueIsRejectedWith400() throws Exception {
   }
 
   @Test
-  void addsOnlyOrganisationIdToTheLoggingContext_noPiiFieldValues() throws Exception {
+  void addsOnlyOrganisationIdToTheLoggingContext_noPiiFieldValues() {
     // Given
     MockHttpServletRequest request = new MockHttpServletRequest("GET", "/organisation/org-1/addresses");
     request.setServletPath("/organisation/org-1/addresses");
     MockHttpServletResponse response = new MockHttpServletResponse();
 
-    Logger filterLogger = (Logger) LoggerFactory.getLogger(IdentityHeaderFilter.class);
-    ListAppender<ILoggingEvent> appender = new ListAppender<>();
-    appender.start();
-    filterLogger.addAppender(appender);
-
     // When
-    try {
-      filter.doFilter(request, response, new RecordingChain());
-    } finally {
-      filterLogger.detachAppender(appender);
-    }
+    List<ILoggingEvent> events =
+        CapturedLogs.loggedBy(
+            IdentityHeaderFilter.class,
+            () -> {
+              try {
+                filter.doFilter(request, response, new RecordingChain());
+              } catch (IOException | ServletException e) {
+                throw new IllegalStateException(e);
+              }
+            });
 
     // Then
-    assertThat(appender.list).isNotEmpty();
-    assertThat(appender.list)
+    assertThat(events).isNotEmpty();
+    assertThat(events)
         .allSatisfy(
-            event -> {
-              assertThat(event.getFormattedMessage()).doesNotContain("Highland Livestock Ltd");
-              assertThat(event.getFormattedMessage()).doesNotContain("secret@example.com");
-            });
+            event ->
+                assertThat(event.getFormattedMessage())
+                    .doesNotContain("Highland Livestock Ltd", "secret@example.com"));
   }
 
   private Map<String, Object> parseBody(MockHttpServletResponse response) throws Exception {
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.filter;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  
    5  import ch.qos.logback.classic.spi.ILoggingEvent;
    6  import com.fasterxml.jackson.databind.ObjectMapper;
    7  import com.fasterxml.jackson.databind.PropertyNamingStrategies;
    8  import jakarta.servlet.FilterChain;
    9  import jakarta.servlet.ServletException;
   10  import java.io.IOException;
   11  import java.util.HashMap;
   12  import java.util.List;
   13  import java.util.Map;
   14  import java.util.concurrent.atomic.AtomicBoolean;
   15  import org.junit.jupiter.api.AfterEach;
   16  import org.junit.jupiter.api.BeforeEach;
   17  import org.junit.jupiter.api.Test;
   18  import org.slf4j.MDC;
   19  import org.springframework.http.HttpStatus;
   20  import org.springframework.http.MediaType;
   21  import org.springframework.mock.web.MockHttpServletRequest;
   22  import org.springframework.mock.web.MockHttpServletResponse;
   23  import uk.gov.defra.trade.imports.addressbook.testsupport.CapturedLogs;
   24  
   25  class IdentityHeaderFilterTest {
   26  
   27    private static final String ORGANISATION_ID_HEADER = "Trade-Imports-Organisation-Id";
   28    private static final String MDC_ORGANISATION_ID = "organisationId";
   29    private static final String MDC_TRACE_ID = "trace.id";
   30    private static final String BAD_REQUEST_TYPE =
   31        "https://api.cdp.defra.cloud/problems/bad-request";
   32  
   33    private IdentityHeaderFilter filter;
   34    private ObjectMapper objectMapper;
   35  
   36    @BeforeEach
   37    void setUp() {
   38      objectMapper =
   39          new ObjectMapper().setPropertyNamingStrategy(PropertyNamingStrategies.LOWER_CAMEL_CASE);
   40      filter = new IdentityHeaderFilter(objectMapper);
   41      MDC.clear();
   42    }
   43  
   44    @AfterEach
   45    void tearDown() {
   46      MDC.clear();
   47    }
   48  
   49    @Test
   50    void missingOrganisationId_writesBadRequestProblemAndHaltsTheChain() throws Exception {
   51      // Given
   52      MockHttpServletRequest request = new MockHttpServletRequest("GET", "/organisation/org-1/addresses");
   53      request.setServletPath("/organisation/org-1/addresses");
   54      MockHttpServletResponse response = new MockHttpServletResponse();
   55      RecordingChain chain = new RecordingChain();
   56  
   57      // When
   58      filter.doFilter(request, response, chain);
   59  
   60      // Then
   61      assertThat(chain.wasCalled()).isFalse();
   62      assertThat(response.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
   63      assertThat(response.getContentType()).isEqualTo(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
   64  
   65      Map<String, Object> body = parseBody(response);
   66      assertThat(body).containsEntry("type", BAD_REQUEST_TYPE);
   67      assertThat(body).containsEntry("title", "Bad Request");
   68      assertThat(body).containsEntry("status", HttpStatus.BAD_REQUEST.value());
   69      assertThat(body.get("detail").toString()).contains(ORGANISATION_ID_HEADER);
   70      assertThat(body).doesNotContainKey("errors");
   71      assertThat(response.getStatus()).isNotIn(401, 403);
   72    }
   73  
   74    @Test
   75    void missingOrganisationIdWithRequestUriOnly_writesBadRequestProblem() throws Exception {
   76      // Given
   77      MockHttpServletRequest request = new MockHttpServletRequest("GET", "/organisation/org-1/addresses");
   78      MockHttpServletResponse response = new MockHttpServletResponse();
   79      RecordingChain chain = new RecordingChain();
   80  
   81      // When
   82      filter.doFilter(request, response, chain);
   83  
   84      // Then
   85      assertThat(chain.wasCalled()).isFalse();
   86      assertThat(response.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
   87      assertThat(response.getContentType()).isEqualTo(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
   88    }
   89  
   90    @Test
   91    void blankOrganisationId_writesBadRequestProblem() throws Exception {
   92      // Given
   93      MockHttpServletRequest request = new MockHttpServletRequest("GET", "/organisation/org-1/addresses");
   94      request.setServletPath("/organisation/org-1/addresses");
   95      request.addHeader(ORGANISATION_ID_HEADER, "   ");
   96      MockHttpServletResponse response = new MockHttpServletResponse();
   97      RecordingChain chain = new RecordingChain();
   98  
   99      // When
  100      filter.doFilter(request, response, chain);
  101  
  102      // Then
  103      assertThat(chain.wasCalled()).isFalse();
  104      assertThat(response.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
  105      assertThat(parseBody(response)).containsEntry("type", BAD_REQUEST_TYPE).doesNotContainKey("errors");
  106    }
  107  
  108    @Test
  109    void organisationIdIsRequiredOnEveryOperation() throws Exception {
  110      for (String method : new String[] {"GET", "POST", "PUT", "DELETE"}) {
  111        // Given
  112        MockHttpServletRequest request =
  113            new MockHttpServletRequest(method, "/organisation/org-1/addresses/665f1c2ab3e4d51a2c9d0e77");
  114        request.setServletPath("/organisation/org-1/addresses/665f1c2ab3e4d51a2c9d0e77");
  115        MockHttpServletResponse response = new MockHttpServletResponse();
  116        RecordingChain chain = new RecordingChain();
  117  
  118        // When
  119        filter.doFilter(request, response, chain);
  120  
  121        // Then
  122        assertThat(chain.wasCalled())
  123            .as("chain must halt for %s without the org-id header", method)
  124            .isFalse();
  125        assertThat(response.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
  126        assertThat(parseBody(response).get("detail").toString()).contains(ORGANISATION_ID_HEADER);
  127      }
  128    }
  129  
  130    @Test
  131    void validHeader_proceedsAndOrganisationIdLandsInMdcDuringTheChain() throws Exception {
  132      // Given
  133      MockHttpServletRequest request = new MockHttpServletRequest("POST", "/organisation/org-42/addresses");
  134      request.setServletPath("/organisation/org-42/addresses");
  135      request.addHeader(ORGANISATION_ID_HEADER, "org-42");
  136      MockHttpServletResponse response = new MockHttpServletResponse();
  137      RecordingChain chain = new RecordingChain();
  138  
  139      // When
  140      filter.doFilter(request, response, chain);
  141  
  142      // Then
  143      assertThat(chain.wasCalled()).isTrue();
  144      assertThat(chain.mdcDuringChain()).containsEntry(MDC_ORGANISATION_ID, "org-42");
  145    }
  146  
  147    @Test
  148    void badRequestBodyCarriesTraceIdFromMdc() throws Exception {
  149      // Given
  150      MDC.put(MDC_TRACE_ID, "trace-abc-123");
  151      MockHttpServletRequest request = new MockHttpServletRequest("GET", "/organisation/org-1/addresses");
  152      request.setServletPath("/organisation/org-1/addresses");
  153      MockHttpServletResponse response = new MockHttpServletResponse();
  154  
  155      // When
  156      filter.doFilter(request, response, new RecordingChain());
  157  
  158      // Then
  159      assertThat(parseBody(response)).containsEntry("traceId", "trace-abc-123");
  160    }
  161  
  162    @Test
  163    void nonOrganisationPathsBypassTheFilterEntirely() throws Exception {
  164      // Given
  165      MockHttpServletRequest request = new MockHttpServletRequest("GET", "/health");
  166      MockHttpServletResponse response = new MockHttpServletResponse();
  167      RecordingChain chain = new RecordingChain();
  168  
  169      // When
  170      filter.doFilter(request, response, chain);
  171  
  172      // Then
  173      assertThat(chain.wasCalled()).isTrue();
  174      assertThat(response.getContentAsString()).isEmpty();
  175    }
  176  
  177    @Test
  178    void pathOrgMismatchReturns404BeforeTheChainRuns() throws Exception {
  179      // Given
  180      MockHttpServletRequest request = new MockHttpServletRequest("GET", "/organisation/org-a/addresses");
  181      request.setServletPath("/organisation/org-a/addresses");
  182      request.addHeader(ORGANISATION_ID_HEADER, "org-b");
  183      MockHttpServletResponse response = new MockHttpServletResponse();
  184      RecordingChain chain = new RecordingChain();
  185  
  186      // When
  187      filter.doFilter(request, response, chain);
  188  
  189      // Then
  190      assertThat(chain.wasCalled()).isFalse();
  191      assertThat(response.getStatus()).isEqualTo(HttpStatus.NOT_FOUND.value());
  192      assertThat(parseBody(response).get("type"))
  193          .isEqualTo("https://api.cdp.defra.cloud/problems/not-found");
  194    }
  195  
  196    @Test
  197    void pathOrgMismatchLogsBothOrganisationIdsAndAnswersAddressNotFound() throws Exception {
  198      MockHttpServletRequest request = new MockHttpServletRequest("GET", "/organisation/org-a/addresses");
  199      request.setServletPath("/organisation/org-a/addresses");
  200      request.addHeader(ORGANISATION_ID_HEADER, "org-b");
  201      MockHttpServletResponse response = new MockHttpServletResponse();
  202  
  203      List<ILoggingEvent> events =
  204          CapturedLogs.loggedBy(
  205              IdentityHeaderFilter.class,
  206              () -> {
  207                try {
  208                  filter.doFilter(request, response, new RecordingChain());
  209                } catch (IOException | ServletException e) {
  210                  throw new IllegalStateException(e);
  211                }
  212              });
  213  
  214      assertThat(events)
  215          .extracting(ILoggingEvent::getFormattedMessage)
  216          .containsExactly(
  217              "Rejected /organisation request: Organisation mismatch: path orgId org-a is not the"
  218                  + " caller's organisation org-b (trace: null)");
  219      assertThat(parseBody(response)).containsEntry("detail", "Address not found");
  220    }
  221  
  222    @Test
  223    void mdcOrganisationIdIsRemovedAfterSuccessfulRequest() throws Exception {
  224      // Given
  225      MockHttpServletRequest request = new MockHttpServletRequest("GET", "/organisation/org-42/addresses");
  226      request.setServletPath("/organisation/org-42/addresses");
  227      request.addHeader(ORGANISATION_ID_HEADER, "org-42");
  228      MockHttpServletResponse response = new MockHttpServletResponse();
  229  
  230      // When
  231      filter.doFilter(request, response, new RecordingChain());
  232  
  233      // Then
  234      assertThat(MDC.get(MDC_ORGANISATION_ID)).isNull();
  235    }
  236  
  237    @Test
  238    void mdcOrganisationIdIsRemovedWhenTheChainThrows() throws Exception {
  239      // Given
  240      MockHttpServletRequest request = new MockHttpServletRequest("GET", "/organisation/org-42/addresses");
  241      request.setServletPath("/organisation/org-42/addresses");
  242      request.addHeader(ORGANISATION_ID_HEADER, "org-42");
  243      MockHttpServletResponse response = new MockHttpServletResponse();
  244  
  245      // When & Then
  246      org.assertj.core.api.Assertions.assertThatThrownBy(
  247              () ->
  248                  filter.doFilter(
  249                      request,
  250                      response,
  251                      (req, res) -> {
  252                        throw new jakarta.servlet.ServletException("boom");
  253                      }))
  254          .isInstanceOf(jakarta.servlet.ServletException.class);
  255  
  256      assertThat(MDC.get(MDC_ORGANISATION_ID)).isNull();
  257    }
  258  
  259    @Test
  260    void invalidOrganisationIdValueIsRejectedWith400() throws Exception {
  261      // Given
  262      MockHttpServletRequest request = new MockHttpServletRequest("GET", "/organisation/org-1/addresses");
  263      request.setServletPath("/organisation/org-1/addresses");
  264      request.addHeader(ORGANISATION_ID_HEADER, "not valid because of spaces");
  265      MockHttpServletResponse response = new MockHttpServletResponse();
  266  
  267      // When
  268      filter.doFilter(request, response, new RecordingChain());
  269  
  270      // Then
  271      assertThat(response.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST.value());
  272    }
  273  
  274    @Test
  275    void addsOnlyOrganisationIdToTheLoggingContext_noPiiFieldValues() {
  276      // Given
  277      MockHttpServletRequest request = new MockHttpServletRequest("GET", "/organisation/org-1/addresses");
  278      request.setServletPath("/organisation/org-1/addresses");
  279      MockHttpServletResponse response = new MockHttpServletResponse();
  280  
  281      // When
  282      List<ILoggingEvent> events =
  283          CapturedLogs.loggedBy(
  284              IdentityHeaderFilter.class,
  285              () -> {
  286                try {
  287                  filter.doFilter(request, response, new RecordingChain());
  288                } catch (IOException | ServletException e) {
  289                  throw new IllegalStateException(e);
  290                }
  291              });
  292  
  293      // Then
  294      assertThat(events).isNotEmpty();
  295      assertThat(events)
  296          .allSatisfy(
  297              event ->
  298                  assertThat(event.getFormattedMessage())
  299                      .doesNotContain("Highland Livestock Ltd", "secret@example.com"));
  300    }
  301  
  302    private Map<String, Object> parseBody(MockHttpServletResponse response) throws Exception {
  303      @SuppressWarnings("unchecked")
  304      Map<String, Object> body = objectMapper.readValue(response.getContentAsString(), Map.class);
  305      return body;
  306    }
  307  
  308    /** Records whether the chain was invoked and snapshots the MDC at the moment it was. */
  309    private static final class RecordingChain implements FilterChain {
  310      private final AtomicBoolean called = new AtomicBoolean(false);
  311      private final Map<String, String> mdcSnapshot = new HashMap<>();
  312  
  313      @Override
  314      public void doFilter(jakarta.servlet.ServletRequest request, jakarta.servlet.ServletResponse response) {
  315        called.set(true);
  316        Map<String, String> copy = MDC.getCopyOfContextMap();
  317        if (copy != null) {
  318          mdcSnapshot.putAll(copy);
  319        }
  320        if (response instanceof MockHttpServletResponse mock) {
  321          mock.setStatus(HttpStatus.OK.value());
  322        }
  323      }
  324  
  325      boolean wasCalled() {
  326        return called.get();
  327      }
  328  
  329      Map<String, String> mdcDuringChain() {
  330        return mdcSnapshot;
  331      }
  332    }
  333  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressScopingIT.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressScopingIT.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressScopingIT.java
index d06d70f..41a9f1b 100644
--- a/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressScopingIT.java
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressScopingIT.java
@@ -4,12 +4,19 @@
 import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
 import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
 
+import ch.qos.logback.classic.spi.ILoggingEvent;
 import com.fasterxml.jackson.databind.ObjectMapper;
+import java.util.List;
 import java.util.Map;
+import java.util.concurrent.Callable;
 import org.junit.jupiter.api.Test;
 import org.springframework.beans.factory.annotation.Autowired;
 import org.springframework.test.web.servlet.MvcResult;
+import org.springframework.test.web.servlet.ResultActions;
 import uk.gov.defra.trade.imports.addressbook.address.AddressStatus;
+import uk.gov.defra.trade.imports.addressbook.exceptions.GlobalExceptionHandler;
+import uk.gov.defra.trade.imports.addressbook.filter.IdentityHeaderFilter;
+import uk.gov.defra.trade.imports.addressbook.testsupport.CapturedLogs;
 
 class AddressScopingIT extends IntegrationBase {
 
@@ -54,6 +61,54 @@ void forwardedOrgHeaderDisagreeingWithThePathOrgIdIs404() throws Exception {
     assertThat(activeAddressesFor(ORG_A)).singleElement();
   }
 
+  @Test
+  void forwardedOrgHeaderDisagreeingWithThePathOrgIdLogsAnOrganisationMismatchWithBothIds() {
+    List<ILoggingEvent> events =
+        linesLoggedBy(
+            IdentityHeaderFilter.class,
+            () -> listAddressesAs(ORG_A, ORG_B).andExpect(status().isNotFound()));
+
+    assertThat(events)
+        .singleElement()
+        .extracting(ILoggingEvent::getFormattedMessage)
+        .asString()
+        .contains(
+            "Organisation mismatch: path orgId "
+                + ORG_A
+                + " is not the caller's organisation "
+                + ORG_B);
+  }
+
+  @Test
+  void anotherOrganisationsAddressIdLogsTheAddressIdAndTheCallersOrganisationId()
+      throws Exception {
+    String id = createAsOrgA();
+
+    List<ILoggingEvent> events =
+        linesLoggedBy(
+            GlobalExceptionHandler.class,
+            () -> getAddressAs(ORG_B, ORG_B, id).andExpect(status().isNotFound()));
+
+    assertThat(events)
+        .singleElement()
+        .extracting(ILoggingEvent::getFormattedMessage)
+        .asString()
+        .endsWith("Address " + id + " not found in organisation " + ORG_B);
+  }
+
+  private static List<ILoggingEvent> linesLoggedBy(
+      Class<?> loggerOwner, Callable<ResultActions> request) {
+    return CapturedLogs.loggedBy(
+        loggerOwner,
+        () -> {
+          try {
+            request.call();
+          } catch (Exception e) {
+            throw new AssertionError(e);
+          }
+        });
+  }
+
   @Test
   void missingOrgHeaderIsAPlatformAuthRejection400WithNoErrorsMap() throws Exception {
     listAddressesAs(ORG_A, null).andExpect(badRequestProblemWithNoErrors());
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.integration;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
    5  import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
    6  
    7  import ch.qos.logback.classic.spi.ILoggingEvent;
    8  import com.fasterxml.jackson.databind.ObjectMapper;
    9  import java.util.List;
   10  import java.util.Map;
   11  import java.util.concurrent.Callable;
   12  import org.junit.jupiter.api.Test;
   13  import org.springframework.beans.factory.annotation.Autowired;
   14  import org.springframework.test.web.servlet.MvcResult;
   15  import org.springframework.test.web.servlet.ResultActions;
   16  import uk.gov.defra.trade.imports.addressbook.address.AddressStatus;
   17  import uk.gov.defra.trade.imports.addressbook.exceptions.GlobalExceptionHandler;
   18  import uk.gov.defra.trade.imports.addressbook.filter.IdentityHeaderFilter;
   19  import uk.gov.defra.trade.imports.addressbook.testsupport.CapturedLogs;
   20  
   21  class AddressScopingIT extends IntegrationBase {
   22  
   23    private static final String ORG_A = ORGANISATION_ID;
   24    private static final String ORG_B = OTHER_ORG;
   25  
   26    @Autowired private ObjectMapper objectMapper;
   27  
   28    private String createAsOrgA() throws Exception {
   29      return createdAddressId(postAddressAs(ORG_A, ORG_A, addressBody()));
   30    }
   31  
   32    @Test
   33    void orgBBrowsingItsOwnPathCannotSeeOrReachOrgAsAddress() throws Exception {
   34      String id = createAsOrgA();
   35  
   36      listAddressesAs(ORG_B, ORG_B)
   37          .andExpect(status().isOk())
   38          .andExpect(jsonPath("$.items").isEmpty())
   39          .andExpect(jsonPath("$.totalItems").value(0));
   40      getAddressAs(ORG_B, ORG_B, id).andExpect(status().isNotFound());
   41      putAddressAs(ORG_B, ORG_B, id, addressBody()).andExpect(status().isNotFound());
   42      deleteAddressAs(ORG_B, ORG_B, id).andExpect(status().isNotFound());
   43      getAddressAs(ORG_A, ORG_A, id)
   44          .andExpect(status().isOk())
   45          .andExpect(jsonPath("$.deleted").value(false));
   46    }
   47  
   48    @Test
   49    void forwardedOrgHeaderDisagreeingWithThePathOrgIdIs404() throws Exception {
   50      String id = createAsOrgA();
   51  
   52      getAddressAs(ORG_A, ORG_B, id).andExpect(status().isNotFound());
   53      listAddressesAs(ORG_A, ORG_B).andExpect(status().isNotFound());
   54      putAddressAs(ORG_A, ORG_B, id, addressBody()).andExpect(status().isNotFound());
   55      deleteAddressAs(ORG_A, ORG_B, id).andExpect(status().isNotFound());
   56      assertThat(addressRepository.findByIdAndOrganisationId(id, ORG_A))
   57          .get()
   58          .extracting("status")
   59          .isEqualTo(AddressStatus.ACTIVE);
   60      postAddressAs(ORG_A, ORG_B, addressBody()).andExpect(status().isNotFound());
   61      assertThat(activeAddressesFor(ORG_A)).singleElement();
   62    }
   63  
   64    @Test
   65    void forwardedOrgHeaderDisagreeingWithThePathOrgIdLogsAnOrganisationMismatchWithBothIds() {
   66      List<ILoggingEvent> events =
   67          linesLoggedBy(
   68              IdentityHeaderFilter.class,
   69              () -> listAddressesAs(ORG_A, ORG_B).andExpect(status().isNotFound()));
   70  
   71      assertThat(events)
   72          .singleElement()
   73          .extracting(ILoggingEvent::getFormattedMessage)
   74          .asString()
   75          .contains(
   76              "Organisation mismatch: path orgId "
   77                  + ORG_A
   78                  + " is not the caller's organisation "
   79                  + ORG_B);
   80    }
   81  
   82    @Test
   83    void anotherOrganisationsAddressIdLogsTheAddressIdAndTheCallersOrganisationId()
   84        throws Exception {
   85      String id = createAsOrgA();
   86  
   87      List<ILoggingEvent> events =
   88          linesLoggedBy(
   89              GlobalExceptionHandler.class,
   90              () -> getAddressAs(ORG_B, ORG_B, id).andExpect(status().isNotFound()));
   91  
   92      assertThat(events)
   93          .singleElement()
   94          .extracting(ILoggingEvent::getFormattedMessage)
   95          .asString()
   96          .endsWith("Address " + id + " not found in organisation " + ORG_B);
   97    }
   98  
   99    private static List<ILoggingEvent> linesLoggedBy(
  100        Class<?> loggerOwner, Callable<ResultActions> request) {
  101      return CapturedLogs.loggedBy(
  102          loggerOwner,
  103          () -> {
  104            try {
  105              request.call();
  106            } catch (Exception e) {
  107              throw new AssertionError(e);
  108            }
  109          });
  110    }
  111  
  112    @Test
  113    void missingOrgHeaderIsAPlatformAuthRejection400WithNoErrorsMap() throws Exception {
  114      listAddressesAs(ORG_A, null).andExpect(badRequestProblemWithNoErrors());
  115    }
  116  
  117    @Test
  118    void blankOrgHeaderIsAPlatformAuthRejection400WithNoErrorsMap() throws Exception {
  119      listAddressesAs(ORG_A, "   ").andExpect(badRequestProblemWithNoErrors());
  120    }
  121  
  122    @Test
  123    void missingOrgHeaderOnPostIsAPlatformAuthRejection400AndPersistsNothing() throws Exception {
  124      postAddressAs(ORG_A, null, addressBody()).andExpect(badRequestProblemWithNoErrors());
  125  
  126      assertThat(storedAddressCount()).isZero();
  127    }
  128  
  129    @Test
  130    void organisationIdIsStampedOnCreateAndScopesReads() throws Exception {
  131      String id = createAsOrgA();
  132  
  133      assertThat(addressRepository.findByIdAndOrganisationId(id, ORG_A))
  134          .get()
  135          .satisfies(address -> assertThat(address.getOrganisationId()).isEqualTo(ORG_A));
  136  
  137      getAddressAs(ORG_A, ORG_A, id)
  138          .andExpect(status().isOk())
  139          .andExpect(jsonPath("$.id").value(id))
  140          .andExpect(jsonPath("$.organisationId").value(ORG_A));
  141      listAddressesAs(ORG_A, ORG_A)
  142          .andExpect(status().isOk())
  143          .andExpect(jsonPath("$.totalItems").value(1));
  144    }
  145  
  146    @Test
  147    void a404ForAnotherOrgsLiveAddressHasTheSameProblemBodyAsA404ForAnUnknownId() throws Exception {
  148      String liveId = createAsOrgA();
  149  
  150      MvcResult crossOrg =
  151          getAddressAs(ORG_B, ORG_B, liveId).andExpect(status().isNotFound()).andReturn();
  152      MvcResult unknown =
  153          getAddressAs(ORG_B, ORG_B, UNKNOWN_ID).andExpect(status().isNotFound()).andReturn();
  154      assertThat(problemBody(crossOrg)).isEqualTo(problemBody(unknown));
  155      assertThat(problemBody(crossOrg)).doesNotContainKey("instance");
  156      assertThat(problemBody(unknown)).doesNotContainKey("instance");
  157    }
  158  
  159    private Map<String, Object> problemBody(MvcResult result) throws Exception {
  160      @SuppressWarnings("unchecked")
  161      Map<String, Object> body =
  162          objectMapper.readValue(result.getResponse().getContentAsString(), Map.class);
  163      return body;
  164    }
  165  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressTimingIT.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressTimingIT.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressTimingIT.java
new file mode 100644
index 0000000..b70b54b
--- /dev/null
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/AddressTimingIT.java
@@ -0,0 +1,61 @@
+package uk.gov.defra.trade.imports.addressbook.integration;
+
+import static org.assertj.core.api.Assertions.assertThat;
+import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
+
+import io.micrometer.core.instrument.MeterRegistry;
+import io.micrometer.core.instrument.Timer;
+import java.util.List;
+import java.util.Map;
+import java.util.TreeMap;
+import org.junit.jupiter.api.Test;
+import org.springframework.beans.factory.annotation.Autowired;
+
+class AddressTimingIT extends IntegrationBase {
+
+  @Autowired private MeterRegistry meterRegistry;
+
+  @Test
+  void eachOperationAddsOneCallToOnlyItsOwnControllerAndServiceTimers() throws Exception {
+    Map<String, Long> beforeCreate = timerCounts();
+    String addressId = createdAddressId(postAddress(addressBody()));
+    assertOnlyTimersOfOperationMovedByOne("create", beforeCreate);
+
+    Map<String, Long> beforeList = timerCounts();
+    listAddresses().andExpect(status().isOk());
+    assertOnlyTimersOfOperationMovedByOne("list", beforeList);
+
+    Map<String, Long> beforeGet = timerCounts();
+    getAddress(addressId).andExpect(status().isOk());
+    assertOnlyTimersOfOperationMovedByOne("get", beforeGet);
+
+    Map<String, Long> beforeUpdate = timerCounts();
+    putAddress(addressId, addressBody().with("name", "Renamed Ltd")).andExpect(status().isOk());
+    assertOnlyTimersOfOperationMovedByOne("update", beforeUpdate);
+
+    Map<String, Long> beforeDelete = timerCounts();
+    deleteAddress(addressId).andExpect(status().isNoContent());
+    assertOnlyTimersOfOperationMovedByOne("delete", beforeDelete);
+  }
+
+  private void assertOnlyTimersOfOperationMovedByOne(String operation, Map<String, Long> before) {
+    Map<String, Long> moved = new TreeMap<>();
+    timerCounts().forEach((name, count) -> moved.put(name, count - before.get(name)));
+    Map<String, Long> expected = new TreeMap<>();
+    before.keySet().forEach(name -> expected.put(name, 0L));
+    expected.put("controller." + operation + ".time", 1L);
+    expected.put("service." + operation + ".time", 1L);
+    assertThat(moved).as(operation).isEqualTo(expected);
+  }
+
+  private Map<String, Long> timerCounts() {
+    Map<String, Long> counts = new TreeMap<>();
+    for (String operation : List.of("list", "create", "get", "update", "delete")) {
+      for (String layer : List.of("controller", "service")) {
+        String name = layer + "." + operation + ".time";
+        counts.put(name, meterRegistry.find(name).timers().stream().mapToLong(Timer::count).sum());
+      }
+    }
+    return counts;
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.integration;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
    5  
    6  import io.micrometer.core.instrument.MeterRegistry;
    7  import io.micrometer.core.instrument.Timer;
    8  import java.util.List;
    9  import java.util.Map;
   10  import java.util.TreeMap;
   11  import org.junit.jupiter.api.Test;
   12  import org.springframework.beans.factory.annotation.Autowired;
   13  
   14  class AddressTimingIT extends IntegrationBase {
   15  
   16    @Autowired private MeterRegistry meterRegistry;
   17  
   18    @Test
   19    void eachOperationAddsOneCallToOnlyItsOwnControllerAndServiceTimers() throws Exception {
   20      Map<String, Long> beforeCreate = timerCounts();
   21      String addressId = createdAddressId(postAddress(addressBody()));
   22      assertOnlyTimersOfOperationMovedByOne("create", beforeCreate);
   23  
   24      Map<String, Long> beforeList = timerCounts();
   25      listAddresses().andExpect(status().isOk());
   26      assertOnlyTimersOfOperationMovedByOne("list", beforeList);
   27  
   28      Map<String, Long> beforeGet = timerCounts();
   29      getAddress(addressId).andExpect(status().isOk());
   30      assertOnlyTimersOfOperationMovedByOne("get", beforeGet);
   31  
   32      Map<String, Long> beforeUpdate = timerCounts();
   33      putAddress(addressId, addressBody().with("name", "Renamed Ltd")).andExpect(status().isOk());
   34      assertOnlyTimersOfOperationMovedByOne("update", beforeUpdate);
   35  
   36      Map<String, Long> beforeDelete = timerCounts();
   37      deleteAddress(addressId).andExpect(status().isNoContent());
   38      assertOnlyTimersOfOperationMovedByOne("delete", beforeDelete);
   39    }
   40  
   41    private void assertOnlyTimersOfOperationMovedByOne(String operation, Map<String, Long> before) {
   42      Map<String, Long> moved = new TreeMap<>();
   43      timerCounts().forEach((name, count) -> moved.put(name, count - before.get(name)));
   44      Map<String, Long> expected = new TreeMap<>();
   45      before.keySet().forEach(name -> expected.put(name, 0L));
   46      expected.put("controller." + operation + ".time", 1L);
   47      expected.put("service." + operation + ".time", 1L);
   48      assertThat(moved).as(operation).isEqualTo(expected);
   49    }
   50  
   51    private Map<String, Long> timerCounts() {
   52      Map<String, Long> counts = new TreeMap<>();
   53      for (String operation : List.of("list", "create", "get", "update", "delete")) {
   54        for (String layer : List.of("controller", "service")) {
   55          String name = layer + "." + operation + ".time";
   56          counts.put(name, meterRegistry.find(name).timers().stream().mapToLong(Timer::count).sum());
   57        }
   58      }
   59      return counts;
   60    }
   61  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EcsLoggingIT.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EcsLoggingIT.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EcsLoggingIT.java
index a644faa..511d510 100644
--- a/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EcsLoggingIT.java
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EcsLoggingIT.java
@@ -3,68 +3,32 @@
 import static org.assertj.core.api.Assertions.assertThat;
 import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
 import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedConsole.captureSystemOut;
 
 import com.fasterxml.jackson.databind.JsonNode;
 import com.fasterxml.jackson.databind.ObjectMapper;
-import java.io.ByteArrayOutputStream;
-import java.io.PrintStream;
-import java.nio.charset.StandardCharsets;
-import org.junit.jupiter.api.AfterEach;
-import org.junit.jupiter.api.BeforeEach;
 import org.junit.jupiter.api.Test;
+import uk.gov.defra.trade.imports.addressbook.testsupport.CapturedConsole;
 
-/**
- * Integration test for ECS (Elastic Common Schema) structured logging. Verifies that logs are in
- * JSON format with all required CDP fields.
- */
 class EcsLoggingIT extends IntegrationBase {
 
-  private final ByteArrayOutputStream outputStreamCaptor = new ByteArrayOutputStream();
-  private final PrintStream originalOut = System.out;
   private final ObjectMapper objectMapper = new ObjectMapper();
 
-  @BeforeEach
-  void setUp() {
-    System.setOut(new PrintStream(outputStreamCaptor));
-  }
-
-  @AfterEach
-  void restoreSystemOut() {
-    System.setOut(originalOut);
-  }
-
   @Test
   void requestLogging_shouldProduceEcsJsonFormat() throws Exception {
-    // Make a request with CDP trace ID header
-    mockMvc.perform(get("/actuator/info")
-            .header("x-cdp-request-id", "test-trace-123"))
-        .andExpect(status().isNotFound()); // info endpoint not exposed in prod
-
-    // Capture and parse log output
-    String logOutput = outputStreamCaptor.toString(StandardCharsets.UTF_8);
-
-    // Find the first valid JSON log line (skip Spring Boot banner)
-    String[] lines = logOutput.split("\n");
-    JsonNode logJson = null;
-    for (String line : lines) {
-      if (line.trim().startsWith("{")) {
-        logJson = objectMapper.readTree(line);
-
-        // Find a line that has our MDC fields (request log)
-        if (logJson.has("url.full")) {
-          break;
-        }
-      }
+    CapturedConsole console = captureSystemOut();
+    try (console) {
+      mockMvc.perform(get("/actuator/info")
+              .header("x-cdp-request-id", "test-trace-123"))
+          .andExpect(status().isNotFound());
     }
 
-    assertThat(logJson).isNotNull();
+    JsonNode logJson = requestLogLine(console);
 
-    // Verify ECS required fields
     assertThat(logJson.has("@timestamp")).isTrue();
     assertThat(logJson.has("log.level")).isTrue();
     assertThat(logJson.has("message")).isTrue();
 
-    // Verify CDP required fields from MDC
     assertThat(logJson.has("trace.id")).isTrue();
     assertThat(logJson.get("trace.id").asText()).isEqualTo("test-trace-123");
 
@@ -74,49 +38,44 @@ void requestLogging_shouldProduceEcsJsonFormat() throws Exception {
     assertThat(logJson.has("url.full")).isTrue();
     assertThat(logJson.get("url.full").asText()).contains("/actuator/info");
 
-    // Verify service metadata
     assertThat(logJson.has("service.name")).isTrue();
     assertThat(logJson.has("service.version")).isTrue();
   }
 
   @Test
   void healthEndpoint_shouldBeFilteredFromLogs() throws Exception {
-    // Clear previous output
-    outputStreamCaptor.reset();
-
-    // Make request to /health endpoint
-    mockMvc.perform(get("/health"))
-        .andExpect(status().isOk());
-
-    String logOutput = outputStreamCaptor.toString(StandardCharsets.UTF_8);
+    CapturedConsole console = captureSystemOut();
+    try (console) {
+      mockMvc.perform(get("/health"))
+          .andExpect(status().isOk());
+    }
 
-    // Verify /health is NOT in any log output
-    assertThat(logOutput).doesNotContain("/health");
+    assertThat(console.text()).doesNotContain("/health");
   }
 
   @Test
-  void missingTraceIdHeader_shouldLeaveTraceIdEmpty() throws Exception {
-    // Clear previous output
-    outputStreamCaptor.reset();
+  void missingTraceIdHeader_shouldLogTheRequestWithoutTraceId() throws Exception {
+    CapturedConsole console = captureSystemOut();
+    try (console) {
+      mockMvc.perform(get("/actuator/info"))
+          .andExpect(status().isNotFound());
+    }
 
-    // Make request WITHOUT x-cdp-request-id header
-    mockMvc.perform(get("/actuator/info"))
-        .andExpect(status().isNotFound());
+    JsonNode logJson = requestLogLine(console);
 
-    String logOutput = outputStreamCaptor.toString(StandardCharsets.UTF_8);
+    assertThat(logJson.get("url.full").asText()).contains("/actuator/info");
+    assertThat(logJson.has("trace.id")).isFalse();
+  }
 
-    // Parse log output
-    String[] lines = logOutput.split("\n");
-    for (String line : lines) {
+  private JsonNode requestLogLine(CapturedConsole console) throws Exception {
+    for (String line : console.text().split("\n")) {
       if (line.trim().startsWith("{")) {
         JsonNode logJson = objectMapper.readTree(line);
-
         if (logJson.has("url.full")) {
-          // trace.id should not be present when header is missing
-          assertThat(logJson.has("trace.id")).isFalse();
-          break;
+          return logJson;
         }
       }
     }
+    throw new AssertionError("No log line has url.full in:\n" + console.text());
   }
 }
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.integration;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
    5  import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
    6  import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedConsole.captureSystemOut;
    7  
    8  import com.fasterxml.jackson.databind.JsonNode;
    9  import com.fasterxml.jackson.databind.ObjectMapper;
   10  import org.junit.jupiter.api.Test;
   11  import uk.gov.defra.trade.imports.addressbook.testsupport.CapturedConsole;
   12  
   13  class EcsLoggingIT extends IntegrationBase {
   14  
   15    private final ObjectMapper objectMapper = new ObjectMapper();
   16  
   17    @Test
   18    void requestLogging_shouldProduceEcsJsonFormat() throws Exception {
   19      CapturedConsole console = captureSystemOut();
   20      try (console) {
   21        mockMvc.perform(get("/actuator/info")
   22                .header("x-cdp-request-id", "test-trace-123"))
   23            .andExpect(status().isNotFound());
   24      }
   25  
   26      JsonNode logJson = requestLogLine(console);
   27  
   28      assertThat(logJson.has("@timestamp")).isTrue();
   29      assertThat(logJson.has("log.level")).isTrue();
   30      assertThat(logJson.has("message")).isTrue();
   31  
   32      assertThat(logJson.has("trace.id")).isTrue();
   33      assertThat(logJson.get("trace.id").asText()).isEqualTo("test-trace-123");
   34  
   35      assertThat(logJson.has("http.request.method")).isTrue();
   36      assertThat(logJson.get("http.request.method").asText()).isEqualTo("GET");
   37  
   38      assertThat(logJson.has("url.full")).isTrue();
   39      assertThat(logJson.get("url.full").asText()).contains("/actuator/info");
   40  
   41      assertThat(logJson.has("service.name")).isTrue();
   42      assertThat(logJson.has("service.version")).isTrue();
   43    }
   44  
   45    @Test
   46    void healthEndpoint_shouldBeFilteredFromLogs() throws Exception {
   47      CapturedConsole console = captureSystemOut();
   48      try (console) {
   49        mockMvc.perform(get("/health"))
   50            .andExpect(status().isOk());
   51      }
   52  
   53      assertThat(console.text()).doesNotContain("/health");
   54    }
   55  
   56    @Test
   57    void missingTraceIdHeader_shouldLogTheRequestWithoutTraceId() throws Exception {
   58      CapturedConsole console = captureSystemOut();
   59      try (console) {
   60        mockMvc.perform(get("/actuator/info"))
   61            .andExpect(status().isNotFound());
   62      }
   63  
   64      JsonNode logJson = requestLogLine(console);
   65  
   66      assertThat(logJson.get("url.full").asText()).contains("/actuator/info");
   67      assertThat(logJson.has("trace.id")).isFalse();
   68    }
   69  
   70    private JsonNode requestLogLine(CapturedConsole console) throws Exception {
   71      for (String line : console.text().split("\n")) {
   72        if (line.trim().startsWith("{")) {
   73          JsonNode logJson = objectMapper.readTree(line);
   74          if (logJson.has("url.full")) {
   75            return logJson;
   76          }
   77        }
   78      }
   79      throw new AssertionError("No log line has url.full in:\n" + console.text());
   80    }
   81  }
```

## File: `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EmfMeterRegistryIT.java`

### Diff

```diff
diff --git a/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EmfMeterRegistryIT.java b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EmfMeterRegistryIT.java
new file mode 100644
index 0000000..0e475c3
--- /dev/null
+++ b/src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EmfMeterRegistryIT.java
@@ -0,0 +1,92 @@
+package uk.gov.defra.trade.imports.addressbook.integration;
+
+import static org.assertj.core.api.Assertions.assertThat;
+import static org.awaitility.Awaitility.await;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedConsole.captureSystemOut;
+import static uk.gov.defra.trade.imports.addressbook.testsupport.EmfDocuments.namespaceOf;
+
+import com.fasterxml.jackson.databind.JsonNode;
+import com.fasterxml.jackson.databind.ObjectMapper;
+import io.micrometer.core.instrument.MeterRegistry;
+import java.io.IOException;
+import java.time.Duration;
+import java.util.List;
+import java.util.Optional;
+import org.junit.jupiter.api.Test;
+import org.junit.jupiter.params.ParameterizedTest;
+import org.junit.jupiter.params.provider.ValueSource;
+import org.springframework.beans.factory.annotation.Autowired;
+import org.springframework.test.context.TestPropertySource;
+import uk.gov.defra.trade.imports.addressbook.metrics.EmfMeterRegistry;
+import uk.gov.defra.trade.imports.addressbook.testsupport.CapturedConsole;
+
+@TestPropertySource(
+    properties = {
+      "aws.emf.enabled=true",
+      "aws.emf.environment=Local",
+      "aws.emf.namespace=trade-imports-address-book",
+      "aws.emf.step=1s"
+    })
+class EmfMeterRegistryIT extends IntegrationBase {
+
+  private static final ObjectMapper JSON = new ObjectMapper();
+
+  @Autowired private MeterRegistry meterRegistry;
+
+  @Test
+  void theMeterRegistryInUseIsTheEmfMeterRegistry() {
+    assertThat(meterRegistry).isInstanceOf(EmfMeterRegistry.class);
+  }
+
+  @Test
+  void theMetersAnAddressCreateRecordsAndTheDependencyGaugeAreLetThroughTheAllowlist()
+      throws Exception {
+    createdAddressId(postAddress(addressBody()));
+
+    for (String name :
+        List.of(
+            "external.call.duration",
+            "external.call.failure",
+            "external.dependency.available",
+            "address.change",
+            "controller.create.time",
+            "service.create.time")) {
+      assertThat(meterRegistry.find(name).meter()).as(name).isNotNull();
+    }
+  }
+
+  @Test
+  void theRegistryPublishesARecordedCallOnItsOwnSchedule() throws Exception {
+    CapturedConsole console = captureSystemOut();
+    try (console) {
+      createdAddressId(postAddress(addressBody()));
+
+      await()
+          .atMost(Duration.ofSeconds(10))
+          .pollInterval(Duration.ofSeconds(1))
+          .until(() -> emfDocumentFor("external.call.duration", console).isPresent());
+    }
+
+    JsonNode document = emfDocumentFor("external.call.duration", console).orElseThrow();
+    assertThat(namespaceOf(document)).isEqualTo("trade-imports-address-book");
+    assertThat(document.path("dependency").asText()).isEqualTo("mongodb");
+  }
+
+  private static Optional<JsonNode> emfDocumentFor(String metricName, CapturedConsole console)
+      throws IOException {
+    for (String line : console.text().split("\n")) {
+      if (line.contains("\"_aws\"") && line.contains("\"" + metricName + "\"")) {
+        return Optional.of(JSON.readTree(line));
+      }
+    }
+    return Optional.empty();
+  }
+
+  @ParameterizedTest
+  @ValueSource(strings = {"cache.gets", "mongodb.driver.commands", "spring.data.repository.invocations"})
+  void aMeterOffTheAllowlistIsNeverRegistered(String name) {
+    meterRegistry.counter(name).increment();
+
+    assertThat(meterRegistry.find(name).meter()).isNull();
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.integration;
    2  
    3  import static org.assertj.core.api.Assertions.assertThat;
    4  import static org.awaitility.Awaitility.await;
    5  import static uk.gov.defra.trade.imports.addressbook.testsupport.CapturedConsole.captureSystemOut;
    6  import static uk.gov.defra.trade.imports.addressbook.testsupport.EmfDocuments.namespaceOf;
    7  
    8  import com.fasterxml.jackson.databind.JsonNode;
    9  import com.fasterxml.jackson.databind.ObjectMapper;
   10  import io.micrometer.core.instrument.MeterRegistry;
   11  import java.io.IOException;
   12  import java.time.Duration;
   13  import java.util.List;
   14  import java.util.Optional;
   15  import org.junit.jupiter.api.Test;
   16  import org.junit.jupiter.params.ParameterizedTest;
   17  import org.junit.jupiter.params.provider.ValueSource;
   18  import org.springframework.beans.factory.annotation.Autowired;
   19  import org.springframework.test.context.TestPropertySource;
   20  import uk.gov.defra.trade.imports.addressbook.metrics.EmfMeterRegistry;
   21  import uk.gov.defra.trade.imports.addressbook.testsupport.CapturedConsole;
   22  
   23  @TestPropertySource(
   24      properties = {
   25        "aws.emf.enabled=true",
   26        "aws.emf.environment=Local",
   27        "aws.emf.namespace=trade-imports-address-book",
   28        "aws.emf.step=1s"
   29      })
   30  class EmfMeterRegistryIT extends IntegrationBase {
   31  
   32    private static final ObjectMapper JSON = new ObjectMapper();
   33  
   34    @Autowired private MeterRegistry meterRegistry;
   35  
   36    @Test
   37    void theMeterRegistryInUseIsTheEmfMeterRegistry() {
   38      assertThat(meterRegistry).isInstanceOf(EmfMeterRegistry.class);
   39    }
   40  
   41    @Test
   42    void theMetersAnAddressCreateRecordsAndTheDependencyGaugeAreLetThroughTheAllowlist()
   43        throws Exception {
   44      createdAddressId(postAddress(addressBody()));
   45  
   46      for (String name :
   47          List.of(
   48              "external.call.duration",
   49              "external.call.failure",
   50              "external.dependency.available",
   51              "address.change",
   52              "controller.create.time",
   53              "service.create.time")) {
   54        assertThat(meterRegistry.find(name).meter()).as(name).isNotNull();
   55      }
   56    }
   57  
   58    @Test
   59    void theRegistryPublishesARecordedCallOnItsOwnSchedule() throws Exception {
   60      CapturedConsole console = captureSystemOut();
   61      try (console) {
   62        createdAddressId(postAddress(addressBody()));
   63  
   64        await()
   65            .atMost(Duration.ofSeconds(10))
   66            .pollInterval(Duration.ofSeconds(1))
   67            .until(() -> emfDocumentFor("external.call.duration", console).isPresent());
   68      }
   69  
   70      JsonNode document = emfDocumentFor("external.call.duration", console).orElseThrow();
   71      assertThat(namespaceOf(document)).isEqualTo("trade-imports-address-book");
   72      assertThat(document.path("dependency").asText()).isEqualTo("mongodb");
   73    }
   74  
   75    private static Optional<JsonNode> emfDocumentFor(String metricName, CapturedConsole console)
   76        throws IOException {
   77      for (String line : console.text().split("\n")) {
   78        if (line.contains("\"_aws\"") && line.contains("\"" + metricName + "\"")) {
   79          return Optional.of(JSON.readTree(line));
   80        }
   81      }
   82      return Optional.empty();
   83    }
   84  
   85    @ParameterizedTest
   86    @ValueSource(strings = {"cache.gets", "mongodb.driver.commands", "spring.data.repository.invocations"})
   87    void aMeterOffTheAllowlistIsNeverRegistered(String name) {
   88      meterRegistry.counter(name).increment();
   89  
   90      assertThat(meterRegistry.find(name).meter()).isNull();
   91    }
   92  }
```

## Source under test

## Source: `src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressService.java`

Tested by:
- `src/test/java/uk/gov/defra/trade/imports/addressbook/address/AddressServiceTest.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressService.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressService.java
index 62709ec..00d37a4 100644
--- a/src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressService.java
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressService.java
@@ -1,7 +1,6 @@
 package uk.gov.defra.trade.imports.addressbook.address;
 
-import io.micrometer.core.instrument.MeterRegistry;
-import io.micrometer.core.instrument.Timer;
+import io.micrometer.core.annotation.Timed;
 import java.time.Instant;
 import java.time.temporal.ChronoUnit;
 import java.util.ArrayList;
@@ -17,6 +16,7 @@
 import uk.gov.defra.trade.imports.addressbook.configuration.AddressTtlConfig;
 import uk.gov.defra.trade.imports.addressbook.exceptions.BadRequestException;
 import uk.gov.defra.trade.imports.addressbook.exceptions.NotFoundException;
+import uk.gov.defra.trade.imports.addressbook.metrics.AddressMetrics;
 
 /** Lists, creates, reads, updates and soft-deletes an organisation's addresses. */
 @Service
@@ -29,17 +29,17 @@ public class AddressService {
 
   private final AddressRepository repository;
   private final AddressMapper addressMapper;
-  private final MeterRegistry meterRegistry;
+  private final AddressMetrics addressMetrics;
   private final AddressTtlConfig ttlConfig;
 
   public AddressService(
       AddressRepository repository,
       AddressMapper addressMapper,
-      MeterRegistry meterRegistry,
+      AddressMetrics addressMetrics,
       AddressTtlConfig ttlConfig) {
     this.repository = repository;
     this.addressMapper = addressMapper;
-    this.meterRegistry = meterRegistry;
+    this.addressMetrics = addressMetrics;
     this.ttlConfig = ttlConfig;
   }
 
@@ -55,6 +55,7 @@ public AddressService(
    * @throws BadRequestException if {@code page} is less than 1 or {@code requestedPageSize} is
    *     outside {@link #MIN_PAGE_SIZE} to {@link #MAX_PAGE_SIZE}
    */
+  @Timed("service.list.time")
   public AddressPageResponse list(
       String organisationId, int page, Integer requestedPageSize, RequestedListFilters filters) {
     if (page < 1) {
@@ -68,17 +69,12 @@ public AddressPageResponse list(
             pageSize,
             Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
 
-    Timer.Sample sample = Timer.start(meterRegistry);
-    try {
-      Page<Address> result =
-          repository.listLiveAddresses(organisationId, criteriaOf(filters), pageable);
-      List<AddressResponse> items =
-          result.getContent().stream().map(addressMapper::toResponse).toList();
-      return new AddressPageResponse(
-          items, page, pageSize, (int) result.getTotalElements(), result.getTotalPages());
-    } finally {
-      sample.stop(meterRegistry.timer("controller.listOperators.query.time"));
-    }
+    Page<Address> result =
+        repository.listLiveAddresses(organisationId, criteriaOf(filters), pageable);
+    List<AddressResponse> items =
+        result.getContent().stream().map(addressMapper::toResponse).toList();
+    return new AddressPageResponse(
+        items, page, pageSize, (int) result.getTotalElements(), result.getTotalPages());
   }
 
   private int servedPageSize(Integer requestedPageSize) {
@@ -123,6 +119,7 @@ private static String toPartialMatchRegex(String searchTerm) {
    * @param organisationId the owning organisation id
    * @return the saved address, with its assigned id and timestamps
    */
+  @Timed("service.create.time")
   public Address create(AddressRequest request, String organisationId) {
     Address address = addressMapper.toEntity(request);
     address.setOrganisationId(organisationId);
@@ -130,7 +127,8 @@ public Address create(AddressRequest request, String organisationId) {
     stampExpiry(address);
 
     Address saved = repository.save(address);
-    log.info("Created address {}", saved.getId());
+    addressMetrics.countChange(AddressMetrics.Change.CREATE);
+    log.info("Created address {} in organisation {}", saved.getId(), organisationId);
     return saved;
   }
 
@@ -150,6 +148,7 @@ private void stampExpiry(Address address) {
    * @return the address, with {@code status DELETED} if it was soft-deleted; empty if the id is
    *     unknown or belongs to another organisation
    */
+  @Timed("service.get.time")
   public Optional<Address> get(String id, String organisationId) {
     return repository.findByIdAndOrganisationId(id, organisationId);
   }
@@ -166,17 +165,19 @@ public Optional<Address> get(String id, String organisationId) {
    * @throws NotFoundException if the id is unknown, belongs to another organisation, or is
    *     soft-deleted
    */
+  @Timed("service.update.time")
   public Address update(String id, AddressRequest request, String organisationId) {
     Address existing =
         repository
             .findByIdAndOrganisationId(id, organisationId)
             .filter(address -> address.getStatus() != AddressStatus.DELETED)
-            .orElseThrow(() -> new NotFoundException("Address not found"));
+            .orElseThrow(() -> NotFoundException.addressNotFound(id, organisationId));
 
     addressMapper.updateEntity(request, existing);
 
     Address saved = repository.save(existing);
-    log.info("Updated address {}", saved.getId());
+    addressMetrics.countChange(AddressMetrics.Change.UPDATE);
+    log.info("Updated address {} in organisation {}", saved.getId(), organisationId);
     return saved;
   }
 
@@ -188,18 +189,21 @@ public Address update(String id, AddressRequest request, String organisationId)
    * @param organisationId the caller's organisation id
    * @throws NotFoundException if the id is unknown or belongs to another organisation
    */
+  @Timed("service.delete.time")
   public void delete(String id, String organisationId) {
     Address existing =
         repository
             .findByIdAndOrganisationId(id, organisationId)
-            .orElseThrow(() -> new NotFoundException("Address not found"));
+            .orElseThrow(() -> NotFoundException.addressNotFound(id, organisationId));
 
     if (existing.getStatus() == AddressStatus.DELETED) {
+      log.info("Address {} in organisation {} already deleted, left unchanged", id, organisationId);
       return;
     }
 
     existing.setStatus(AddressStatus.DELETED);
     repository.save(existing);
-    log.info("Soft-deleted address {}", existing.getId());
+    addressMetrics.countChange(AddressMetrics.Change.DELETE);
+    log.info("Soft-deleted address {} in organisation {}", existing.getId(), organisationId);
   }
 }
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.address;
    2  
    3  import io.micrometer.core.annotation.Timed;
    4  import java.time.Instant;
    5  import java.time.temporal.ChronoUnit;
    6  import java.util.ArrayList;
    7  import java.util.List;
    8  import java.util.Optional;
    9  import java.util.regex.Pattern;
   10  import lombok.extern.slf4j.Slf4j;
   11  import org.springframework.data.domain.Page;
   12  import org.springframework.data.domain.PageRequest;
   13  import org.springframework.data.domain.Pageable;
   14  import org.springframework.data.domain.Sort;
   15  import org.springframework.stereotype.Service;
   16  import uk.gov.defra.trade.imports.addressbook.configuration.AddressTtlConfig;
   17  import uk.gov.defra.trade.imports.addressbook.exceptions.BadRequestException;
   18  import uk.gov.defra.trade.imports.addressbook.exceptions.NotFoundException;
   19  import uk.gov.defra.trade.imports.addressbook.metrics.AddressMetrics;
   20  
   21  /** Lists, creates, reads, updates and soft-deletes an organisation's addresses. */
   22  @Service
   23  @Slf4j
   24  public class AddressService {
   25  
   26    static final int MIN_PAGE_SIZE = 1;
   27    static final int MAX_PAGE_SIZE = 100;
   28    public static final int DEFAULT_PAGE_SIZE = 25;
   29  
   30    private final AddressRepository repository;
   31    private final AddressMapper addressMapper;
   32    private final AddressMetrics addressMetrics;
   33    private final AddressTtlConfig ttlConfig;
   34  
   35    public AddressService(
   36        AddressRepository repository,
   37        AddressMapper addressMapper,
   38        AddressMetrics addressMetrics,
   39        AddressTtlConfig ttlConfig) {
   40      this.repository = repository;
   41      this.addressMapper = addressMapper;
   42      this.addressMetrics = addressMetrics;
   43      this.ttlConfig = ttlConfig;
   44    }
   45  
   46    /**
   47     * One page of the organisation's live addresses, newest first.
   48     *
   49     * @param organisationId the owning organisation id, from the identity header
   50     * @param page the 1-based page number
   51     * @param requestedPageSize the page size from {@link #MIN_PAGE_SIZE} to {@link #MAX_PAGE_SIZE},
   52     *     or null for {@link #DEFAULT_PAGE_SIZE}
   53     * @param filters the request's filters, each optional
   54     * @return one page of live addresses with pagination metadata
   55     * @throws BadRequestException if {@code page} is less than 1 or {@code requestedPageSize} is
   56     *     outside {@link #MIN_PAGE_SIZE} to {@link #MAX_PAGE_SIZE}
   57     */
   58    @Timed("service.list.time")
   59    public AddressPageResponse list(
   60        String organisationId, int page, Integer requestedPageSize, RequestedListFilters filters) {
   61      if (page < 1) {
   62        throw new BadRequestException("page must be 1 or greater");
   63      }
   64      int pageSize = servedPageSize(requestedPageSize);
   65  
   66      Pageable pageable =
   67          PageRequest.of(
   68              page - 1,
   69              pageSize,
   70              Sort.by(Sort.Direction.DESC, "createdAt").and(Sort.by(Sort.Direction.DESC, "id")));
   71  
   72      Page<Address> result =
   73          repository.listLiveAddresses(organisationId, criteriaOf(filters), pageable);
   74      List<AddressResponse> items =
   75          result.getContent().stream().map(addressMapper::toResponse).toList();
   76      return new AddressPageResponse(
   77          items, page, pageSize, (int) result.getTotalElements(), result.getTotalPages());
   78    }
   79  
   80    private int servedPageSize(Integer requestedPageSize) {
   81      if (requestedPageSize == null) {
   82        return DEFAULT_PAGE_SIZE;
   83      }
   84      if (requestedPageSize < MIN_PAGE_SIZE || requestedPageSize > MAX_PAGE_SIZE) {
   85        throw new BadRequestException(
   86            "pageSize must be between " + MIN_PAGE_SIZE + " and " + MAX_PAGE_SIZE);
   87      }
   88      return requestedPageSize;
   89    }
   90  
   91    private static ListCriteria criteriaOf(RequestedListFilters requested) {
   92      return new ListCriteria(requested.roles(), matchesOf(requested));
   93    }
   94  
   95    private static List<ListCriteria.Match> matchesOf(RequestedListFilters requested) {
   96      List<ListCriteria.Match> matches = new ArrayList<>();
   97      if (!requested.searchTerm().isEmpty()) {
   98        matches.add(new ListCriteria.TextMatching(toPartialMatchRegex(requested.searchTerm())));
   99      }
  100      if (!requested.countryCodes().isEmpty()) {
  101        matches.add(new ListCriteria.InCountries(requested.countryCodes()));
  102      }
  103      if (!requested.searchRoles().isEmpty()) {
  104        matches.add(new ListCriteria.HoldingAnyRole(requested.searchRoles()));
  105      }
  106      return matches;
  107    }
  108  
  109    private static String toPartialMatchRegex(String searchTerm) {
  110      return ".*" + Pattern.quote(searchTerm) + ".*";
  111    }
  112  
  113    /**
  114     * Saves a new {@code ACTIVE} address owned by {@code organisationId}. Outside prod, when a TTL is
  115     * configured, it is given an {@code expireAt} counted from now, which a later update or soft
  116     * delete leaves as is.
  117     *
  118     * @param request the validated create body (client-supplied fields only)
  119     * @param organisationId the owning organisation id
  120     * @return the saved address, with its assigned id and timestamps
  121     */
  122    @Timed("service.create.time")
  123    public Address create(AddressRequest request, String organisationId) {
  124      Address address = addressMapper.toEntity(request);
  125      address.setOrganisationId(organisationId);
  126      address.setStatus(AddressStatus.ACTIVE);
  127      stampExpiry(address);
  128  
  129      Address saved = repository.save(address);
  130      addressMetrics.countChange(AddressMetrics.Change.CREATE);
  131      log.info("Created address {} in organisation {}", saved.getId(), organisationId);
  132      return saved;
  133    }
  134  
  135    private void stampExpiry(Address address) {
  136      Integer days = ttlConfig.days();
  137      if (days == null || ttlConfig.isProd()) {
  138        return;
  139      }
  140      address.setExpireAt(Instant.now().plus(days, ChronoUnit.DAYS));
  141    }
  142  
  143    /**
  144     * Fetches one address by id within the caller's organisation, soft-deleted addresses included.
  145     *
  146     * @param id the address id
  147     * @param organisationId the caller's organisation id
  148     * @return the address, with {@code status DELETED} if it was soft-deleted; empty if the id is
  149     *     unknown or belongs to another organisation
  150     */
  151    @Timed("service.get.time")
  152    public Optional<Address> get(String id, String organisationId) {
  153      return repository.findByIdAndOrganisationId(id, organisationId);
  154    }
  155  
  156    /**
  157     * Replaces every client-supplied field of a live address in the caller's organisation. Its {@code
  158     * id}, {@code organisationId}, {@code status} and {@code createdAt} are kept, and {@code
  159     * modifiedAt} is bumped.
  160     *
  161     * @param id the address id
  162     * @param request the validated update body (client-supplied fields only)
  163     * @param organisationId the caller's organisation id
  164     * @return the updated address
  165     * @throws NotFoundException if the id is unknown, belongs to another organisation, or is
  166     *     soft-deleted
  167     */
  168    @Timed("service.update.time")
  169    public Address update(String id, AddressRequest request, String organisationId) {
  170      Address existing =
  171          repository
  172              .findByIdAndOrganisationId(id, organisationId)
  173              .filter(address -> address.getStatus() != AddressStatus.DELETED)
  174              .orElseThrow(() -> NotFoundException.addressNotFound(id, organisationId));
  175  
  176      addressMapper.updateEntity(request, existing);
  177  
  178      Address saved = repository.save(existing);
  179      addressMetrics.countChange(AddressMetrics.Change.UPDATE);
  180      log.info("Updated address {} in organisation {}", saved.getId(), organisationId);
  181      return saved;
  182    }
  183  
  184    /**
  185     * Sets an address in the caller's organisation to {@code status DELETED} and bumps its {@code
  186     * modifiedAt}; the address is kept. An address that is already {@code DELETED} is left unchanged.
  187     *
  188     * @param id the address id
  189     * @param organisationId the caller's organisation id
  190     * @throws NotFoundException if the id is unknown or belongs to another organisation
  191     */
  192    @Timed("service.delete.time")
  193    public void delete(String id, String organisationId) {
  194      Address existing =
  195          repository
  196              .findByIdAndOrganisationId(id, organisationId)
  197              .orElseThrow(() -> NotFoundException.addressNotFound(id, organisationId));
  198  
  199      if (existing.getStatus() == AddressStatus.DELETED) {
  200        log.info("Address {} in organisation {} already deleted, left unchanged", id, organisationId);
  201        return;
  202      }
  203  
  204      existing.setStatus(AddressStatus.DELETED);
  205      repository.save(existing);
  206      addressMetrics.countChange(AddressMetrics.Change.DELETE);
  207      log.info("Soft-deleted address {} in organisation {}", existing.getId(), organisationId);
  208    }
  209  }
```

## Source: `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfig.java`

Tested by:
- `src/test/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfigTest.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfig.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfig.java
index 7db9832..a17caf9 100644
--- a/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfig.java
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfig.java
@@ -2,21 +2,45 @@
 
 import io.micrometer.core.aop.CountedAspect;
 import io.micrometer.core.aop.TimedAspect;
+import io.micrometer.core.instrument.Clock;
 import io.micrometer.core.instrument.MeterRegistry;
+import io.micrometer.core.instrument.util.NamedThreadFactory;
+import java.time.Duration;
 import lombok.extern.slf4j.Slf4j;
+import org.springframework.beans.factory.annotation.Value;
+import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
 import org.springframework.context.annotation.Bean;
 import org.springframework.context.annotation.Configuration;
-import org.springframework.scheduling.annotation.EnableScheduling;
+import software.amazon.cloudwatchlogs.emf.config.EnvironmentConfigurationProvider;
+import software.amazon.cloudwatchlogs.emf.environment.Environments;
+import software.amazon.cloudwatchlogs.emf.logger.MetricsLogger;
+import uk.gov.defra.trade.imports.addressbook.metrics.EmfMeterRegistry;
 
 /**
- * Micrometer AOP aspects for {@code @Timed} and {@code @Counted} controller metrics, plus scheduling
- * support for {@link uk.gov.defra.trade.imports.addressbook.service.EmfMetricsPublisher}.
+ * The meter registry that publishes to CloudWatch when {@code aws.emf.enabled} is true, and the
+ * aspects that record {@code @Timed} and {@code @Counted} methods.
  */
 @Slf4j
 @Configuration
-@EnableScheduling
 public class MetricsConfig {
 
+  @Bean
+  @ConditionalOnProperty(name = "aws.emf.enabled", havingValue = "true")
+  EmfMeterRegistry emfMeterRegistry(
+      @Value("${aws.emf.namespace}") String namespace,
+      @Value("${aws.emf.step}") Duration step,
+      @Value("${aws.emf.environment:}") String environment) {
+    if (!environment.isBlank()) {
+      EnvironmentConfigurationProvider.getConfig()
+          .setEnvironmentOverride(Environments.valueOf(environment));
+      log.info("Writing metrics to the {} EMF environment", environment);
+    }
+    EmfMeterRegistry registry = new EmfMeterRegistry(namespace, step, Clock.SYSTEM, MetricsLogger::new);
+    registry.start(new NamedThreadFactory("emf-meter-registry"));
+    log.info("Publishing metrics to CloudWatch namespace {} every {}", namespace, step);
+    return registry;
+  }
+
   @Bean
   TimedAspect timedAspect(MeterRegistry meterRegistry) {
     log.debug("Creating TimedAspect for {}", meterRegistry.getClass().getSimpleName());
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.configuration;
    2  
    3  import io.micrometer.core.aop.CountedAspect;
    4  import io.micrometer.core.aop.TimedAspect;
    5  import io.micrometer.core.instrument.Clock;
    6  import io.micrometer.core.instrument.MeterRegistry;
    7  import io.micrometer.core.instrument.util.NamedThreadFactory;
    8  import java.time.Duration;
    9  import lombok.extern.slf4j.Slf4j;
   10  import org.springframework.beans.factory.annotation.Value;
   11  import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
   12  import org.springframework.context.annotation.Bean;
   13  import org.springframework.context.annotation.Configuration;
   14  import software.amazon.cloudwatchlogs.emf.config.EnvironmentConfigurationProvider;
   15  import software.amazon.cloudwatchlogs.emf.environment.Environments;
   16  import software.amazon.cloudwatchlogs.emf.logger.MetricsLogger;
   17  import uk.gov.defra.trade.imports.addressbook.metrics.EmfMeterRegistry;
   18  
   19  /**
   20   * The meter registry that publishes to CloudWatch when {@code aws.emf.enabled} is true, and the
   21   * aspects that record {@code @Timed} and {@code @Counted} methods.
   22   */
   23  @Slf4j
   24  @Configuration
   25  public class MetricsConfig {
   26  
   27    @Bean
   28    @ConditionalOnProperty(name = "aws.emf.enabled", havingValue = "true")
   29    EmfMeterRegistry emfMeterRegistry(
   30        @Value("${aws.emf.namespace}") String namespace,
   31        @Value("${aws.emf.step}") Duration step,
   32        @Value("${aws.emf.environment:}") String environment) {
   33      if (!environment.isBlank()) {
   34        EnvironmentConfigurationProvider.getConfig()
   35            .setEnvironmentOverride(Environments.valueOf(environment));
   36        log.info("Writing metrics to the {} EMF environment", environment);
   37      }
   38      EmfMeterRegistry registry = new EmfMeterRegistry(namespace, step, Clock.SYSTEM, MetricsLogger::new);
   39      registry.start(new NamedThreadFactory("emf-meter-registry"));
   40      log.info("Publishing metrics to CloudWatch namespace {} every {}", namespace, step);
   41      return registry;
   42    }
   43  
   44    @Bean
   45    TimedAspect timedAspect(MeterRegistry meterRegistry) {
   46      log.debug("Creating TimedAspect for {}", meterRegistry.getClass().getSimpleName());
   47      return new TimedAspect(meterRegistry);
   48    }
   49  
   50    @Bean
   51    CountedAspect countedAspect(MeterRegistry registry) {
   52      return new CountedAspect(registry);
   53    }
   54  }
```

## Source: `src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandler.java`

Tested by:
- `src/test/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandlerTest.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandler.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandler.java
index 559d4c9..41c34f6 100644
--- a/src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandler.java
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandler.java
@@ -130,7 +130,7 @@ public ResponseEntity<Problem> handleNotFoundException(NotFoundException ex) {
     return problemResponse(
         HttpStatus.NOT_FOUND,
         problem(
-            HttpStatus.NOT_FOUND, "not-found", "Resource Not Found", ex.getMessage(), traceId));
+            HttpStatus.NOT_FOUND, "not-found", "Resource Not Found", ex.detail(), traceId));
   }
 
   /** Unexpected error — 500 internal-error. */
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.exceptions;
    2  
    3  import java.util.ArrayList;
    4  import java.util.LinkedHashMap;
    5  import java.util.List;
    6  import java.util.Map;
    7  import lombok.extern.slf4j.Slf4j;
    8  import org.slf4j.MDC;
    9  import org.springframework.dao.OptimisticLockingFailureException;
   10  import org.springframework.http.HttpStatus;
   11  import org.springframework.http.MediaType;
   12  import org.springframework.http.ResponseEntity;
   13  import org.springframework.http.converter.HttpMessageNotReadableException;
   14  import org.springframework.validation.FieldError;
   15  import org.springframework.web.bind.MethodArgumentNotValidException;
   16  import org.springframework.web.bind.annotation.ExceptionHandler;
   17  import org.springframework.web.bind.annotation.RestControllerAdvice;
   18  import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
   19  
   20  /**
   21   * Global exception handler producing RFC 9457 {@code application/problem+json} responses, CDP
   22   * problem-family type URIs and a camelCase {@code traceId} extension.
   23   *
   24   * <p>A field-validation failure ({@link MethodArgumentNotValidException}) carries an {@code errors}
   25   * map keyed by the rejected field's Java name, such as {@code addressLine1}. Every other 400 carries
   26   * no {@code errors} key.
   27   *
   28   * <p>No problem body carries {@code instance}, so a cross-organisation 404 is identical to an
   29   * unknown-id 404.
   30   */
   31  @RestControllerAdvice
   32  @Slf4j
   33  public class GlobalExceptionHandler {
   34  
   35    private static final String MDC_TRACE_ID = "trace.id";
   36    private static final String PROBLEM_BASE = "https://api.cdp.defra.cloud/problems/";
   37  
   38    /** Field validation failure — 400 validation-error, WITH a per-field camelCase errors map. */
   39    @ExceptionHandler(MethodArgumentNotValidException.class)
   40    public ResponseEntity<ValidationProblem> handleValidationException(
   41        MethodArgumentNotValidException ex) {
   42      String traceId = MDC.get(MDC_TRACE_ID);
   43      Map<String, List<String>> errors = new LinkedHashMap<>();
   44      for (FieldError error : ex.getBindingResult().getFieldErrors()) {
   45        errors
   46            .computeIfAbsent(error.getField(), key -> new ArrayList<>())
   47            .add(error.getDefaultMessage());
   48      }
   49      log.warn("Validation error (trace: {}) on fields {}", traceId, errors.keySet());
   50  
   51      return problemResponse(
   52          HttpStatus.BAD_REQUEST,
   53          new ValidationProblem(
   54              PROBLEM_BASE + "validation-error",
   55              "Validation Error",
   56              HttpStatus.BAD_REQUEST.value(),
   57              "Validation failed for one or more fields",
   58              traceId,
   59              errors));
   60    }
   61  
   62    /**
   63     * A query or path parameter that could not be bound to its type, such as a non-numeric
   64     * {@code page} — 400 bad-request, NO errors map.
   65     */
   66    @ExceptionHandler(MethodArgumentTypeMismatchException.class)
   67    public ResponseEntity<Problem> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
   68      String traceId = MDC.get(MDC_TRACE_ID);
   69      log.warn("Malformed parameter (trace: {}): {}", traceId, ex.getMessage(), ex);
   70  
   71      return problemResponse(
   72          HttpStatus.BAD_REQUEST,
   73          problem(
   74              HttpStatus.BAD_REQUEST,
   75              "bad-request",
   76              "Bad Request",
   77              "Invalid value for parameter '" + ex.getName() + "'",
   78              traceId));
   79    }
   80  
   81    /** Malformed JSON request body — 400 bad-request, NO errors map. */
   82    @ExceptionHandler(HttpMessageNotReadableException.class)
   83    public ResponseEntity<Problem> handleMessageNotReadable(HttpMessageNotReadableException ex) {
   84      String traceId = MDC.get(MDC_TRACE_ID);
   85      log.warn("Malformed request body (trace: {}): {}", traceId, ex.getMessage(), ex);
   86  
   87      return problemResponse(
   88          HttpStatus.BAD_REQUEST,
   89          problem(
   90              HttpStatus.BAD_REQUEST,
   91              "bad-request",
   92              "Bad Request",
   93              "Malformed JSON request body",
   94              traceId));
   95    }
   96  
   97    /** Concurrent update conflict — 409 conflict. */
   98    @ExceptionHandler(OptimisticLockingFailureException.class)
   99    public ResponseEntity<Problem> handleOptimisticLocking(OptimisticLockingFailureException ex) {
  100      String traceId = MDC.get(MDC_TRACE_ID);
  101      log.warn("Optimistic locking failure (trace: {}): {}", traceId, ex.getMessage(), ex);
  102  
  103      return problemResponse(
  104          HttpStatus.CONFLICT,
  105          problem(
  106              HttpStatus.CONFLICT,
  107              "conflict",
  108              "Conflict",
  109              "The resource was modified by another request",
  110              traceId));
  111    }
  112  
  113    /** Malformed request that never reached body validation — 400 bad-request, NO errors map. */
  114    @ExceptionHandler(BadRequestException.class)
  115    public ResponseEntity<Problem> handleBadRequestException(BadRequestException ex) {
  116      String traceId = MDC.get(MDC_TRACE_ID);
  117      log.warn("Bad request (trace: {}): {}", traceId, ex.getMessage(), ex);
  118  
  119      return problemResponse(
  120          HttpStatus.BAD_REQUEST,
  121          problem(HttpStatus.BAD_REQUEST, "bad-request", "Bad Request", ex.getMessage(), traceId));
  122    }
  123  
  124    /** Unknown / cross-org id, or a PUT on a tombstone — 404 not-found. */
  125    @ExceptionHandler(NotFoundException.class)
  126    public ResponseEntity<Problem> handleNotFoundException(NotFoundException ex) {
  127      String traceId = MDC.get(MDC_TRACE_ID);
  128      log.warn("Resource not found (trace: {}): {}", traceId, ex.getMessage(), ex);
  129  
  130      return problemResponse(
  131          HttpStatus.NOT_FOUND,
  132          problem(
  133              HttpStatus.NOT_FOUND, "not-found", "Resource Not Found", ex.detail(), traceId));
  134    }
  135  
  136    /** Unexpected error — 500 internal-error. */
  137    @ExceptionHandler(RuntimeException.class)
  138    public ResponseEntity<Problem> handleException(RuntimeException ex) {
  139      String traceId = MDC.get(MDC_TRACE_ID);
  140      log.error("Unexpected error (trace: {}): {}", traceId, ex.getMessage(), ex);
  141  
  142      return problemResponse(
  143          HttpStatus.INTERNAL_SERVER_ERROR,
  144          problem(
  145              HttpStatus.INTERNAL_SERVER_ERROR,
  146              "internal-error",
  147              "Internal Server Error",
  148              "An unexpected error occurred. Please try again later.",
  149              traceId));
  150    }
  151  
  152    private Problem problem(
  153        HttpStatus status, String typeSlug, String title, String detail, String traceId) {
  154      return new Problem(PROBLEM_BASE + typeSlug, title, status.value(), detail, traceId);
  155    }
  156  
  157    private <T> ResponseEntity<T> problemResponse(HttpStatus status, T body) {
  158      return ResponseEntity.status(status)
  159          .contentType(MediaType.APPLICATION_PROBLEM_JSON)
  160          .body(body);
  161    }
  162  }
```

## Source: `src/main/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilter.java`

Tested by:
- `src/test/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilterTest.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilter.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilter.java
index c58d00e..66fafb7 100644
--- a/src/main/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilter.java
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilter.java
@@ -17,6 +17,7 @@
 import org.springframework.http.MediaType;
 import org.springframework.stereotype.Component;
 import org.springframework.web.filter.OncePerRequestFilter;
+import uk.gov.defra.trade.imports.addressbook.exceptions.NotFoundException;
 import uk.gov.defra.trade.imports.addressbook.exceptions.Problem;
 
 /**
@@ -64,27 +65,26 @@ protected void doFilterInternal(
 
     String organisationId = request.getHeader(ORGANISATION_ID_HEADER);
     if (isBlank(organisationId)) {
-      reject(response, HttpStatus.BAD_REQUEST, BAD_REQUEST_TYPE, "Bad Request", "Missing required header " + ORGANISATION_ID_HEADER);
+      String detail = "Missing required header " + ORGANISATION_ID_HEADER;
+      reject(response, HttpStatus.BAD_REQUEST, BAD_REQUEST_TYPE, "Bad Request", detail, detail);
       return;
     }
     if (!ORGANISATION_ID_VALUE.matcher(organisationId).matches()) {
-      reject(
-          response,
-          HttpStatus.BAD_REQUEST,
-          BAD_REQUEST_TYPE,
-          "Bad Request",
-          "Invalid " + ORGANISATION_ID_HEADER);
+      String detail = "Invalid " + ORGANISATION_ID_HEADER;
+      reject(response, HttpStatus.BAD_REQUEST, BAD_REQUEST_TYPE, "Bad Request", detail, detail);
       return;
     }
 
     String pathOrgId = extractPathOrganisationId(organisationRequestPath(request));
     if (pathOrgId != null && !organisationId.equals(pathOrgId)) {
+      NotFoundException refusal = NotFoundException.organisationMismatch(pathOrgId, organisationId);
       reject(
           response,
           HttpStatus.NOT_FOUND,
           NOT_FOUND_TYPE,
           "Resource Not Found",
-          "Address not found");
+          refusal.detail(),
+          refusal.getMessage());
       return;
     }
 
@@ -130,10 +130,11 @@ private void reject(
       HttpStatus status,
       String type,
       String title,
-      String detail)
+      String detail,
+      String reason)
       throws IOException {
     String traceId = MDC.get(MDC_TRACE_ID);
-    log.warn("Rejected /organisation request: {} (trace: {})", detail, traceId);
+    log.warn("Rejected /organisation request: {} (trace: {})", reason, traceId);
 
     Problem problem = new Problem(type, title, status.value(), detail, traceId);
 
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.filter;
    2  
    3  import com.fasterxml.jackson.annotation.JsonInclude;
    4  import com.fasterxml.jackson.databind.ObjectMapper;
    5  import com.fasterxml.jackson.databind.ObjectWriter;
    6  import jakarta.servlet.FilterChain;
    7  import jakarta.servlet.ServletException;
    8  import jakarta.servlet.http.HttpServletRequest;
    9  import jakarta.servlet.http.HttpServletResponse;
   10  import java.io.IOException;
   11  import java.util.regex.Pattern;
   12  import lombok.extern.slf4j.Slf4j;
   13  import org.slf4j.MDC;
   14  import org.springframework.core.Ordered;
   15  import org.springframework.core.annotation.Order;
   16  import org.springframework.http.HttpStatus;
   17  import org.springframework.http.MediaType;
   18  import org.springframework.stereotype.Component;
   19  import org.springframework.web.filter.OncePerRequestFilter;
   20  import uk.gov.defra.trade.imports.addressbook.exceptions.NotFoundException;
   21  import uk.gov.defra.trade.imports.addressbook.exceptions.Problem;
   22  
   23  /**
   24   * Enforces the trusted-forwarded-header identity contract on every {@code /organisation/**} request.
   25   *
   26   * <p>{@code Trade-Imports-Organisation-Id} is the sole tenant key for org-scoped reads and writes.
   27   * Missing, blank or malformed values fail fast with a 400 bad-request problem. When the path carries
   28   * an {@code orgId} segment it must equal the header value; mismatch returns 404 (no existence
   29   * disclosure). Rejections are written here as {@code application/problem+json}.
   30   *
   31   * <p>The header is trusted as the authenticated organisation id. README "Security and trust
   32   * boundary" states what must hold upstream for that to be safe.
   33   */
   34  @Component
   35  @Order(Ordered.HIGHEST_PRECEDENCE + 1)
   36  @Slf4j
   37  public class IdentityHeaderFilter extends OncePerRequestFilter {
   38  
   39    public static final String ORGANISATION_ID_HEADER = "Trade-Imports-Organisation-Id";
   40    static final String MDC_ORGANISATION_ID = "organisationId";
   41  
   42    private static final String MDC_TRACE_ID = "trace.id";
   43    private static final String BAD_REQUEST_TYPE =
   44        "https://api.cdp.defra.cloud/problems/bad-request";
   45    private static final String NOT_FOUND_TYPE = "https://api.cdp.defra.cloud/problems/not-found";
   46    private static final Pattern ORGANISATION_ID_VALUE =
   47        Pattern.compile("^[A-Za-z0-9_-]{1,64}$");
   48  
   49    private final ObjectWriter problemWriter;
   50  
   51    public IdentityHeaderFilter(ObjectMapper objectMapper) {
   52      this.problemWriter =
   53          objectMapper.copy().setSerializationInclusion(JsonInclude.Include.NON_NULL).writer();
   54    }
   55  
   56    @Override
   57    protected boolean shouldNotFilter(HttpServletRequest request) {
   58      return !isOrganisationPath(organisationRequestPath(request));
   59    }
   60  
   61    @Override
   62    protected void doFilterInternal(
   63        HttpServletRequest request, HttpServletResponse response, FilterChain chain)
   64        throws ServletException, IOException {
   65  
   66      String organisationId = request.getHeader(ORGANISATION_ID_HEADER);
   67      if (isBlank(organisationId)) {
   68        String detail = "Missing required header " + ORGANISATION_ID_HEADER;
   69        reject(response, HttpStatus.BAD_REQUEST, BAD_REQUEST_TYPE, "Bad Request", detail, detail);
   70        return;
   71      }
   72      if (!ORGANISATION_ID_VALUE.matcher(organisationId).matches()) {
   73        String detail = "Invalid " + ORGANISATION_ID_HEADER;
   74        reject(response, HttpStatus.BAD_REQUEST, BAD_REQUEST_TYPE, "Bad Request", detail, detail);
   75        return;
   76      }
   77  
   78      String pathOrgId = extractPathOrganisationId(organisationRequestPath(request));
   79      if (pathOrgId != null && !organisationId.equals(pathOrgId)) {
   80        NotFoundException refusal = NotFoundException.organisationMismatch(pathOrgId, organisationId);
   81        reject(
   82            response,
   83            HttpStatus.NOT_FOUND,
   84            NOT_FOUND_TYPE,
   85            "Resource Not Found",
   86            refusal.detail(),
   87            refusal.getMessage());
   88        return;
   89      }
   90  
   91      try {
   92        MDC.put(MDC_ORGANISATION_ID, organisationId);
   93        chain.doFilter(request, response);
   94      } finally {
   95        MDC.remove(MDC_ORGANISATION_ID);
   96      }
   97    }
   98  
   99    static String extractPathOrganisationId(String path) {
  100      if (path == null || !path.startsWith("/organisation/")) {
  101        return null;
  102      }
  103      int start = "/organisation/".length();
  104      int slash = path.indexOf('/', start);
  105      return slash < 0 ? path.substring(start) : path.substring(start, slash);
  106    }
  107  
  108    static String organisationRequestPath(HttpServletRequest request) {
  109      String servletPath = request.getServletPath();
  110      if (servletPath != null && !servletPath.isEmpty()) {
  111        return servletPath;
  112      }
  113      String uri = request.getRequestURI();
  114      if (uri == null) {
  115        return "";
  116      }
  117      String contextPath = request.getContextPath();
  118      if (contextPath != null && !contextPath.isEmpty() && uri.startsWith(contextPath)) {
  119        return uri.substring(contextPath.length());
  120      }
  121      return uri;
  122    }
  123  
  124    private static boolean isOrganisationPath(String path) {
  125      return path != null && path.startsWith("/organisation/");
  126    }
  127  
  128    private void reject(
  129        HttpServletResponse response,
  130        HttpStatus status,
  131        String type,
  132        String title,
  133        String detail,
  134        String reason)
  135        throws IOException {
  136      String traceId = MDC.get(MDC_TRACE_ID);
  137      log.warn("Rejected /organisation request: {} (trace: {})", reason, traceId);
  138  
  139      Problem problem = new Problem(type, title, status.value(), detail, traceId);
  140  
  141      response.setStatus(status.value());
  142      response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
  143      response.getOutputStream().write(problemWriter.writeValueAsBytes(problem));
  144    }
  145  
  146    private static boolean isBlank(String value) {
  147      return value == null || value.isBlank();
  148    }
  149  }
```

## Source: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistry.java`

Tested by:
- `src/test/java/uk/gov/defra/trade/imports/addressbook/integration/EmfMeterRegistryIT.java`

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