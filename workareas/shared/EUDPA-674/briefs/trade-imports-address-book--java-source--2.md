# Review brief: java-source

This brief is 4602 lines. Read it with Read from line 1 to line 4602, in
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

## Reviewing source files

Judge each file from its diff, its content and the ticket. Whether the
change is tested belongs to the test reviewers and the consistency
reviewer, not you.

### Read what the changed lines depend on, then judge

Before you judge a file, read the files its changed lines depend on. This
is a step, not an option: a line that looks right on its own can be wrong
against the file it relies on. For each source file in your group, read:

- **The functions it calls from another file** whose result decides what
  the changed line does (a lookup, a parser, a mapper), to see when each
  returns nothing, a default or an error.
- **The configuration that drives it:** the `application.yml` or
  `config.js` keys a changed bean, registry, allowlist or flag reads, to
  see every value that reaches the line.
- **The types, records and constants it uses**, when you need their
  fields or values.
- **The existing callers** of a function whose contract the change alters,
  when the brief or a file you read names them.

Read at most 3 files for each source file in your group, and do not read
on from a file you read. Take each path from the brief: an import, a
package name, a config key. Open it with Read at
`<repo checkout>/<path>`. Do not search the repo: no `grep`, `find` or
`git grep`. A path you have to search for is one you do not need.

In each file's `reason`, name the files you read for it, or write "none:
no changed line depends on another file". A finding that rests on a file
you read quotes that file at file:line.

For every file, check correctness first (below), then null safety, error
paths, security and performance, then the code-quality checks. Work
through each check for every file. A file with no finding in a check is
fine; a check you skipped is not. Behaviour findings (`correctness`,
`error-handling`, `logging`) matter more than comment and naming findings:
do not let the second crowd out the first.

### Correctness: find the input that makes it wrong

For every branch, condition, return value and default the diff adds or
changes:

1. Say what the ticket needs the line to do.
2. Name an input or state that is easy to meet in production and walk it
   through the line. Try a list where only some items pass, an empty list,
   a missing or unrecognised value, a failure part-way through, and a
   value with a unit or type.
3. A result that breaks the ticket, or that the caller cannot tell from
   success, is a `correctness` finding. The failure scenario is that
   input and the result it gives.

The bugs to look for:

- **Any or all:** `anyMatch` where the rule needs every item, or the one
  item that matters (the primary, the latest), and the reverse.
- **Silent fallback:** a lookup that misses and goes on as `undefined`,
  `null`, `0` or an empty value, with no log and no error, so bad data
  travels on.
- **Units and types dropped:** one fixed unit, type or format written for
  values that each carry their own (bytes written as a count, seconds as
  milliseconds).
- **Flag in disguise:** an `int`, string or magic value used as a
  true-or-false flag.
- **Library meaning:** a library call whose result means less than the
  name suggests (a server is up, but not the one writes go to).

Check the change against the patterns the code already sets: the guides in
this brief, and what the other files in your group do. This is not a
design review.

### Naming: predict, then compare

For every function, method, parameter, variable, constant, flag and helper
the diff adds or renames, and every name a changed line calls:

1. Read the name alone. Write down what you predict it returns and what it
   changes (state, session, database, redirect, log).
2. Read the body. Compare.
3. A value the name does not cover, or a change it hides, is a finding. So
   is a name that needs its comment to be understood. Nothing (null or
   undefined) and an expected error such as not found are not mismatches,
   and a suffix naming them (`…OrNull`, `…OrNotFound`) is itself a finding.
   A name that predicts both is not a finding, even if another would read
   better.

Also a finding: a metaphor (`lightenRemote` for "exclude gh-pages from the
fetch"), a positional boolean flag, a rename that stops part-way through a
concept's words (`telephone*` left beside `phone`), and one concept with
several names within your group.

### Structure: one home for each rule

- **Two homes for one rule:** the same rule, format or guard written twice
  within your group. Must: one owner; the others call it.
- **Wrong layer:** logic where a reader would not look for it, such as
  retry and proxy code inside a folder for counting calls.
- **A second mechanism beside an existing one:** raise it only when both
  are in this brief or in a file you read, and quote the existing one's
  line.
- **Literals:** a value one function uses lives in that function.

### Logging: every decision leaves a trace

- **Silent decision:** a branch that changes the outcome (refusal,
  redirect, retry, fallback, state switch) and logs nothing.
- **Missing ids:** a log line support cannot search by, with no
  notification reference, user, port code, dataset or status.
- **Lost cause:** the message logged in place of the throwable or `{ err }`.
- **Body at INFO:** a request or response body logged at INFO.
- **Failure at the success level:** a failed call or caught error logged
  at the same level as a success, so an alert or a search on level misses
  it.

"Support cannot tell X during an incident" is an accepted failure
scenario for a logging finding.

### Comments

Every comment in each file: it describes only the lines below it, says
nothing about callers, other modules or tests, and holds no ticket keys,
history or rationale. A comment that decodes a name means the name is the
finding.

## Java source specifics

- Null safety: an `Optional` returned and then `.get()` without a check, a
  nullable parameter used without a guard, a record field that can be null
  with no annotation or check.
- Logging: SLF4J with the throwable as the last argument, never
  `e.getMessage()` alone. Placeholders, not string concatenation.
- Layering: controllers map requests, services hold the rules,
  repositories hold persistence. A rule in a controller, or a query built
  in a service, is a `structure` finding.
- Javadoc only on an exported public API, and only its contract.

## Your group

- Review id: EUDPA-674
- Group: trade-imports-address-book--java-source--2
- Repo: trade-imports-address-book
- PR: 22
- Commit reviewed: 491f0276ddc5772d9171a926337fbab7a1f771b3
- Repo checkout: /Users/aminav/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-674/repos/trade-imports-address-book
- Files:
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistry.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorder.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoAvailability.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoCommandMetrics.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoReplyWriteException.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/RecordedValues.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ValueRecordingDistributionSummary.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ValueRecordingTimer.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/service/EmfMetricsPublisher.java`

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

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/EmfMeterRegistry.java`

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

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ExternalCallRecorder.java`

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

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoAvailability.java`

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

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoCommandMetrics.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoCommandMetrics.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoCommandMetrics.java
new file mode 100644
index 0000000..939afbc
--- /dev/null
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoCommandMetrics.java
@@ -0,0 +1,63 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import com.mongodb.event.CommandFailedEvent;
+import com.mongodb.event.CommandListener;
+import com.mongodb.event.CommandSucceededEvent;
+import java.time.Duration;
+import java.util.concurrent.TimeUnit;
+import lombok.RequiredArgsConstructor;
+import org.springframework.stereotype.Component;
+
+/**
+ * Records every MongoDB command as an external call to {@code mongodb}, its operation the command
+ * name, or {@code other} for a command outside the fixed set. A command fails when it errors or
+ * when its reply reports {@code writeErrors} or a {@code writeConcernError}.
+ */
+@Component
+@RequiredArgsConstructor
+public class MongoCommandMetrics implements CommandListener {
+
+  static final String DEPENDENCY = "mongodb";
+
+  private final ExternalCallRecorder externalCallRecorder;
+
+  @Override
+  public void commandSucceeded(CommandSucceededEvent event) {
+    String operation = operationOf(event.getCommandName());
+    Duration elapsed = Duration.ofNanos(event.getElapsedTime(TimeUnit.NANOSECONDS));
+    MongoReplyWriteException.reportedBy(event.getResponse())
+        .ifPresentOrElse(
+            writeFailure ->
+                externalCallRecorder.recordFailure(DEPENDENCY, operation, elapsed, writeFailure),
+            () -> externalCallRecorder.recordSuccess(DEPENDENCY, operation, elapsed));
+  }
+
+  @Override
+  public void commandFailed(CommandFailedEvent event) {
+    externalCallRecorder.recordFailure(
+        DEPENDENCY,
+        operationOf(event.getCommandName()),
+        Duration.ofNanos(event.getElapsedTime(TimeUnit.NANOSECONDS)),
+        event.getThrowable());
+  }
+
+  private static String operationOf(String commandName) {
+    return switch (commandName) {
+      case "find",
+          "getMore",
+          "insert",
+          "update",
+          "delete",
+          "findAndModify",
+          "aggregate",
+          "count",
+          "distinct",
+          "createIndexes",
+          "listIndexes",
+          "dropIndexes",
+          "listCollections" ->
+          commandName;
+      default -> "other";
+    };
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import com.mongodb.event.CommandFailedEvent;
    4  import com.mongodb.event.CommandListener;
    5  import com.mongodb.event.CommandSucceededEvent;
    6  import java.time.Duration;
    7  import java.util.concurrent.TimeUnit;
    8  import lombok.RequiredArgsConstructor;
    9  import org.springframework.stereotype.Component;
   10  
   11  /**
   12   * Records every MongoDB command as an external call to {@code mongodb}, its operation the command
   13   * name, or {@code other} for a command outside the fixed set. A command fails when it errors or
   14   * when its reply reports {@code writeErrors} or a {@code writeConcernError}.
   15   */
   16  @Component
   17  @RequiredArgsConstructor
   18  public class MongoCommandMetrics implements CommandListener {
   19  
   20    static final String DEPENDENCY = "mongodb";
   21  
   22    private final ExternalCallRecorder externalCallRecorder;
   23  
   24    @Override
   25    public void commandSucceeded(CommandSucceededEvent event) {
   26      String operation = operationOf(event.getCommandName());
   27      Duration elapsed = Duration.ofNanos(event.getElapsedTime(TimeUnit.NANOSECONDS));
   28      MongoReplyWriteException.reportedBy(event.getResponse())
   29          .ifPresentOrElse(
   30              writeFailure ->
   31                  externalCallRecorder.recordFailure(DEPENDENCY, operation, elapsed, writeFailure),
   32              () -> externalCallRecorder.recordSuccess(DEPENDENCY, operation, elapsed));
   33    }
   34  
   35    @Override
   36    public void commandFailed(CommandFailedEvent event) {
   37      externalCallRecorder.recordFailure(
   38          DEPENDENCY,
   39          operationOf(event.getCommandName()),
   40          Duration.ofNanos(event.getElapsedTime(TimeUnit.NANOSECONDS)),
   41          event.getThrowable());
   42    }
   43  
   44    private static String operationOf(String commandName) {
   45      return switch (commandName) {
   46        case "find",
   47            "getMore",
   48            "insert",
   49            "update",
   50            "delete",
   51            "findAndModify",
   52            "aggregate",
   53            "count",
   54            "distinct",
   55            "createIndexes",
   56            "listIndexes",
   57            "dropIndexes",
   58            "listCollections" ->
   59            commandName;
   60        default -> "other";
   61      };
   62    }
   63  }
```

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoReplyWriteException.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoReplyWriteException.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoReplyWriteException.java
new file mode 100644
index 0000000..d9cf9a3
--- /dev/null
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/MongoReplyWriteException.java
@@ -0,0 +1,39 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import java.util.ArrayList;
+import java.util.List;
+import java.util.Optional;
+import org.bson.BsonDocument;
+import org.bson.BsonValue;
+
+final class MongoReplyWriteException extends RuntimeException {
+
+  private MongoReplyWriteException(String errorCodes) {
+    super(errorCodes, null, false, false);
+  }
+
+  static Optional<MongoReplyWriteException> reportedBy(BsonDocument reply) {
+    List<String> writeFailures = new ArrayList<>();
+    BsonValue writeErrors = reply.get("writeErrors");
+    if (writeErrors != null && writeErrors.isArray() && !writeErrors.asArray().isEmpty()) {
+      List<String> codes =
+          writeErrors.asArray().stream()
+              .map(BsonValue::asDocument)
+              .map(MongoReplyWriteException::errorCodeOf)
+              .toList();
+      writeFailures.add("writeErrors codes " + codes);
+    }
+    if (reply.isDocument("writeConcernError")) {
+      writeFailures.add(
+          "writeConcernError code " + errorCodeOf(reply.getDocument("writeConcernError")));
+    }
+    return writeFailures.isEmpty()
+        ? Optional.empty()
+        : Optional.of(new MongoReplyWriteException(String.join("; ", writeFailures)));
+  }
+
+  private static String errorCodeOf(BsonDocument error) {
+    String code = String.valueOf(error.getNumber("code").intValue());
+    return error.isString("codeName") ? code + " " + error.getString("codeName").getValue() : code;
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import java.util.ArrayList;
    4  import java.util.List;
    5  import java.util.Optional;
    6  import org.bson.BsonDocument;
    7  import org.bson.BsonValue;
    8  
    9  final class MongoReplyWriteException extends RuntimeException {
   10  
   11    private MongoReplyWriteException(String errorCodes) {
   12      super(errorCodes, null, false, false);
   13    }
   14  
   15    static Optional<MongoReplyWriteException> reportedBy(BsonDocument reply) {
   16      List<String> writeFailures = new ArrayList<>();
   17      BsonValue writeErrors = reply.get("writeErrors");
   18      if (writeErrors != null && writeErrors.isArray() && !writeErrors.asArray().isEmpty()) {
   19        List<String> codes =
   20            writeErrors.asArray().stream()
   21                .map(BsonValue::asDocument)
   22                .map(MongoReplyWriteException::errorCodeOf)
   23                .toList();
   24        writeFailures.add("writeErrors codes " + codes);
   25      }
   26      if (reply.isDocument("writeConcernError")) {
   27        writeFailures.add(
   28            "writeConcernError code " + errorCodeOf(reply.getDocument("writeConcernError")));
   29      }
   30      return writeFailures.isEmpty()
   31          ? Optional.empty()
   32          : Optional.of(new MongoReplyWriteException(String.join("; ", writeFailures)));
   33    }
   34  
   35    private static String errorCodeOf(BsonDocument error) {
   36      String code = String.valueOf(error.getNumber("code").intValue());
   37      return error.isString("codeName") ? code + " " + error.getString("codeName").getValue() : code;
   38    }
   39  }
```

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/RecordedValues.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/RecordedValues.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/RecordedValues.java
new file mode 100644
index 0000000..4bd2380
--- /dev/null
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/RecordedValues.java
@@ -0,0 +1,19 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import java.util.ArrayList;
+import java.util.List;
+
+final class RecordedValues {
+
+  private List<Double> values = new ArrayList<>();
+
+  synchronized void add(double value) {
+    values.add(value);
+  }
+
+  synchronized List<Double> takeAll() {
+    List<Double> taken = values;
+    values = new ArrayList<>();
+    return taken;
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import java.util.ArrayList;
    4  import java.util.List;
    5  
    6  final class RecordedValues {
    7  
    8    private List<Double> values = new ArrayList<>();
    9  
   10    synchronized void add(double value) {
   11      values.add(value);
   12    }
   13  
   14    synchronized List<Double> takeAll() {
   15      List<Double> taken = values;
   16      values = new ArrayList<>();
   17      return taken;
   18    }
   19  }
```

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ValueRecordingDistributionSummary.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ValueRecordingDistributionSummary.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ValueRecordingDistributionSummary.java
new file mode 100644
index 0000000..5de7539
--- /dev/null
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ValueRecordingDistributionSummary.java
@@ -0,0 +1,30 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import io.micrometer.core.instrument.Clock;
+import io.micrometer.core.instrument.distribution.DistributionStatisticConfig;
+import io.micrometer.core.instrument.step.StepDistributionSummary;
+
+@SuppressWarnings("java:S2160")
+class ValueRecordingDistributionSummary extends StepDistributionSummary {
+
+  private final RecordedValues recordedAmounts = new RecordedValues();
+
+  ValueRecordingDistributionSummary(
+      Id id,
+      Clock clock,
+      DistributionStatisticConfig distributionStatisticConfig,
+      double scale,
+      long stepMillis) {
+    super(id, clock, distributionStatisticConfig, scale, stepMillis, false);
+  }
+
+  @Override
+  protected void recordNonNegative(double amount) {
+    super.recordNonNegative(amount);
+    recordedAmounts.add(amount);
+  }
+
+  RecordedValues recordedAmounts() {
+    return recordedAmounts;
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import io.micrometer.core.instrument.Clock;
    4  import io.micrometer.core.instrument.distribution.DistributionStatisticConfig;
    5  import io.micrometer.core.instrument.step.StepDistributionSummary;
    6  
    7  @SuppressWarnings("java:S2160")
    8  class ValueRecordingDistributionSummary extends StepDistributionSummary {
    9  
   10    private final RecordedValues recordedAmounts = new RecordedValues();
   11  
   12    ValueRecordingDistributionSummary(
   13        Id id,
   14        Clock clock,
   15        DistributionStatisticConfig distributionStatisticConfig,
   16        double scale,
   17        long stepMillis) {
   18      super(id, clock, distributionStatisticConfig, scale, stepMillis, false);
   19    }
   20  
   21    @Override
   22    protected void recordNonNegative(double amount) {
   23      super.recordNonNegative(amount);
   24      recordedAmounts.add(amount);
   25    }
   26  
   27    RecordedValues recordedAmounts() {
   28      return recordedAmounts;
   29    }
   30  }
```

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ValueRecordingTimer.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ValueRecordingTimer.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ValueRecordingTimer.java
new file mode 100644
index 0000000..fbecdcd
--- /dev/null
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/ValueRecordingTimer.java
@@ -0,0 +1,33 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import io.micrometer.core.instrument.Clock;
+import io.micrometer.core.instrument.distribution.DistributionStatisticConfig;
+import io.micrometer.core.instrument.distribution.pause.PauseDetector;
+import io.micrometer.core.instrument.step.StepTimer;
+import java.util.concurrent.TimeUnit;
+
+@SuppressWarnings("java:S2160")
+class ValueRecordingTimer extends StepTimer {
+
+  private final RecordedValues recordedNanos = new RecordedValues();
+
+  ValueRecordingTimer(
+      Id id,
+      Clock clock,
+      DistributionStatisticConfig distributionStatisticConfig,
+      PauseDetector pauseDetector,
+      TimeUnit baseTimeUnit,
+      long stepMillis) {
+    super(id, clock, distributionStatisticConfig, pauseDetector, baseTimeUnit, stepMillis, false);
+  }
+
+  @Override
+  protected void recordNonNegative(long amount, TimeUnit unit) {
+    super.recordNonNegative(amount, unit);
+    recordedNanos.add((double) unit.toNanos(amount));
+  }
+
+  RecordedValues recordedNanos() {
+    return recordedNanos;
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import io.micrometer.core.instrument.Clock;
    4  import io.micrometer.core.instrument.distribution.DistributionStatisticConfig;
    5  import io.micrometer.core.instrument.distribution.pause.PauseDetector;
    6  import io.micrometer.core.instrument.step.StepTimer;
    7  import java.util.concurrent.TimeUnit;
    8  
    9  @SuppressWarnings("java:S2160")
   10  class ValueRecordingTimer extends StepTimer {
   11  
   12    private final RecordedValues recordedNanos = new RecordedValues();
   13  
   14    ValueRecordingTimer(
   15        Id id,
   16        Clock clock,
   17        DistributionStatisticConfig distributionStatisticConfig,
   18        PauseDetector pauseDetector,
   19        TimeUnit baseTimeUnit,
   20        long stepMillis) {
   21      super(id, clock, distributionStatisticConfig, pauseDetector, baseTimeUnit, stepMillis, false);
   22    }
   23  
   24    @Override
   25    protected void recordNonNegative(long amount, TimeUnit unit) {
   26      super.recordNonNegative(amount, unit);
   27      recordedNanos.add((double) unit.toNanos(amount));
   28    }
   29  
   30    RecordedValues recordedNanos() {
   31      return recordedNanos;
   32    }
   33  }
```

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/service/EmfMetricsPublisher.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/service/EmfMetricsPublisher.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/service/EmfMetricsPublisher.java
deleted file mode 100644
index f32d9bc..0000000
--- a/src/main/java/uk/gov/defra/trade/imports/addressbook/service/EmfMetricsPublisher.java
+++ /dev/null
@@ -1,61 +0,0 @@
-package uk.gov.defra.trade.imports.addressbook.service;
-
-import io.micrometer.core.instrument.Meter;
-import io.micrometer.core.instrument.MeterRegistry;
-import io.micrometer.core.instrument.Measurement;
-import java.util.function.Supplier;
-import lombok.extern.slf4j.Slf4j;
-import org.springframework.beans.factory.annotation.Autowired;
-import org.springframework.beans.factory.annotation.Value;
-import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
-import org.springframework.scheduling.annotation.Scheduled;
-import org.springframework.stereotype.Service;
-import software.amazon.cloudwatchlogs.emf.logger.MetricsLogger;
-
-@Service
-@Slf4j
-@ConditionalOnProperty(name = "aws.emf.enabled", havingValue = "true", matchIfMissing = false)
-public class EmfMetricsPublisher {
-
-  private final String namespace;
-  private final MeterRegistry meterRegistry;
-  private final Supplier<MetricsLogger> metricsLoggerSupplier;
-
-  @Autowired
-  EmfMetricsPublisher(
-      @Value("${aws.emf.namespace}") String namespace, MeterRegistry meterRegistry) {
-    this(namespace, meterRegistry, MetricsLogger::new);
-  }
-
-  EmfMetricsPublisher(
-      String namespace,
-      MeterRegistry meterRegistry,
-      Supplier<MetricsLogger> metricsLoggerSupplier) {
-    this.namespace = namespace;
-    this.meterRegistry = meterRegistry;
-    this.metricsLoggerSupplier = metricsLoggerSupplier;
-  }
-
-  @Scheduled(fixedRate = 60000)
-  public void publishMetrics() {
-    try {
-      MetricsLogger metricsLogger = metricsLoggerSupplier.get();
-      metricsLogger.setNamespace(namespace);
-      for (Meter meter : meterRegistry.getMeters()) {
-        for (Measurement measurement : meter.measure()) {
-          double value = measurement.getValue();
-          if (!Double.isFinite(value)) {
-            continue;
-          }
-          String metricKey =
-              meter.getId().getName() + "." + measurement.getStatistic().getTagValueRepresentation();
-          log.trace("Publishing metric {} with value {}", metricKey, value);
-          metricsLogger.putMetric(metricKey, value);
-        }
-      }
-      metricsLogger.flush();
-    } catch (RuntimeException ex) {
-      log.warn("Failed to publish EMF metrics", ex);
-    }
-  }
-}
```

Deleted by this change.

## Guides

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
### Source: `docs/best-practices/java/spring-boot.md`

# Spring Boot — Best Practices

Project baseline: Spring Boot 3.5, Java 25, Maven, Lombok. This doc covers the patterns used in `trade-imports-animals-backend`.

---

## 1. Application structure

Use **feature-based packages**, not layer-based. Each feature owns its controller, service, repository, model, and DTO.

```
src/main/java/uk/gov/defra/tradeimportsanimals/
├── TradeImportsAnimalsApplication.java
├── notification/
│   ├── NotificationController.java
│   ├── NotificationService.java
│   ├── NotificationRepository.java
│   ├── Notification.java           ← MongoDB document
│   └── dto/
│       ├── NotificationDto.java
│       └── NotificationRequest.java
├── audit/
│   ├── AuditRepository.java
│   └── Audit.java
├── config/
│   ├── SecurityConfig.java
│   ├── CacheConfig.java
│   ├── MongoConfig.java
│   └── MetricsConfig.java
├── common/
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java
│   │   ├── NotFoundException.java
│   │   └── ConflictException.java
│   └── filter/
│       ├── RequestTracingFilter.java
│       └── AdminSecretFilter.java
└── metrics/
    └── EmfMetricsPublisher.java
```

---

## 2. Entry point

```java
@SpringBootApplication
@EnableScheduling
@EnableConfigurationProperties({ AppConfig.class, MetricsConfigurationProperties.class })
public class TradeImportsAnimalsApplication {
    public static void main(String[] args) {
        SpringApplication.run(TradeImportsAnimalsApplication.class, args);
    }
}
```

---

## 3. REST controllers

```java
@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/notifications")
@Tag(name = "Notifications")
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    @Timed("notification.find_all")
    public List<NotificationDto> findAll() {
        log.info("Finding all notifications");
        return notificationService.findAll();
    }

    @GetMapping("/{referenceNumber}")
    @Timed("notification.find_by_reference")
    public NotificationDto findByReferenceNumber(@PathVariable String referenceNumber) {
        return notificationService.findByReferenceNumber(referenceNumber);
    }

    @PostMapping
    @Timed("notification.save")
    public NotificationDto save(
            @Valid @RequestBody NotificationRequest request,
            @RequestHeader HttpHeaders headers) {
        return notificationService.save(request, headers);
    }

    @DeleteMapping
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteByReferenceNumbers(
            @Valid @RequestBody List<String> referenceNumbers,
            @RequestHeader HttpHeaders headers) {
        notificationService.deleteByReferenceNumbers(referenceNumbers, headers);
    }
}
```

Key points:
- `@RequiredArgsConstructor` (Lombok) — constructor injection, never `@Autowired` on fields
- `@Slf4j` (Lombok) — provides `log` field
- `@Timed` — Micrometer metric per endpoint
- `@RequestHeader HttpHeaders` — captures all headers for audit trail

### Security defaults for controllers

Controllers that accept user-controlled URLs, file streams, or take `{id}`-style path variables must apply these defaults. They are not optional — each one prevents a class of vulnerability.

**Validate `redirectUrl` against an allowlist (open-redirect)**

A controller that takes a `redirectUrl` from a request body or query parameter and returns it (directly or via `Location` header) is an open redirect unless the URL is checked against a known origin.

```java
// Wrong — caller controls where the user lands after the upload completes
@PostMapping("/document-uploads")
public ResponseEntity<DocumentUploadResponse> initiate(@RequestBody DocumentUploadRequest req) {
    return documentService.initiate(req.redirectUrl());  // attacker-controlled URL
}

// Correct — reject any URL that doesn't start with the known frontend origin
@PostMapping("/document-uploads")
public ResponseEntity<DocumentUploadResponse> initiate(@RequestBody DocumentUploadRequest req) {
    String allowed = cdpConfig.frontend().baseUrl();
    String redirectUrl = req.redirectUrl() != null ? req.redirectUrl() : allowed;
    if (!redirectUrl.startsWith(allowed)) {
        throw new IllegalArgumentException("redirectUrl must match " + allowed);
    }
    return documentService.initiate(redirectUrl);
}
```

**`Location` header on `201 Created` must be an absolute URI (RFC 9110)**

A relative URI in the `Location` header is non-conformant for `201 Created`. Build it from the current request so it survives reverse proxies and mounted context paths.

```java
// Wrong — relative URI
return ResponseEntity.created(URI.create("/document-uploads/" + uploadId)).body(response);

// Correct — absolute URI built from current request
URI location = ServletUriComponentsBuilder.fromCurrentRequest()
        .path("/{uploadId}")
        .buildAndExpand(uploadId)
        .toUri();
return ResponseEntity.created(location).body(response);
```

**Forwarded `Content-Type` is never trusted**

When streaming a file retrieved from a third-party (CDP Uploader, S3, any external store), allow-list the MIME types you'll forward and always set `X-Content-Type-Options: nosniff`. Default to `application/octet-stream` for unknown types.

```java
private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
        "application/pdf", "image/jpeg", "image/png",
        "application/vnd.ms-excel", "application/msword",
        "application/octet-stream"
);

@GetMapping("/document-uploads/{uploadId}/file")
public ResponseEntity<StreamingResponseBody> downloadFile(@PathVariable String uploadId) {
    var fileData = documentService.findFile(uploadId);

    String contentType;
    try {
        var parsed = MediaType.parseMediaType(fileData.contentType());
        contentType = ALLOWED_CONTENT_TYPES.contains(parsed.toString())
                ? parsed.toString()
                : MediaType.APPLICATION_OCTET_STREAM_VALUE;
    } catch (InvalidMediaTypeException e) {
        log.warn("Bad content-type from upstream for uploadId={}: {}", uploadId, fileData.contentType());
        contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
    }

    return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_TYPE, contentType)
            .header("X-Content-Type-Options", "nosniff")           // always
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment") // never inline
            .body(fileData.streamingBody());
}
```

**IDOR — verify ownership before returning a resource by ID**

If an endpoint accepts a resource ID from the request and the caller could plausibly have access to *some* resources but not others, the service must check ownership. "Authentication = authorisation" is only acceptable in skeleton/all-or-nothing phases and should be a recorded decision, not an implicit assumption. When in doubt, pass the parent reference (e.g. notification ref) into the lookup so the data layer enforces the join.

---

## 4. Request / response

```java
// Path variable — always constrain format on @PathVariable.
// Without @Pattern / @Size, any malformed value reaches the service layer
// (and database queries) before being rejected. Class needs @Validated.
@GetMapping("/{referenceNumber}")
public ResponseEntity<NotificationDto> getByReference(
        @PathVariable @Pattern(regexp = "^[A-Z0-9.\\-]{1,50}$") String referenceNumber) {
    return ResponseEntity.ok(service.findByReferenceNumber(referenceNumber));
}

// Query params
@GetMapping
public ResponseEntity<List<NotificationDto>> list(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size) {
    return ResponseEntity.ok(service.findAll(page, size));
}

// Request headers
@PostMapping
public ResponseEntity<NotificationDto> create(
        @Valid @RequestBody NotificationRequest body,
        @RequestHeader HttpHeaders headers) {
    var result = service.create(body, headers);
    return ResponseEntity.status(HttpStatus.CREATED).body(result);
}

// No content response
@DeleteMapping("/{id}")
@ResponseStatus(HttpStatus.NO_CONTENT)
public void delete(@PathVariable String id) {
    service.delete(id);
}
```

---

## 5. Bean validation

```java
public record NotificationRequest(
    @NotBlank(message = "Reference number is required")
    String referenceNumber,

    @NotNull(message = "Origin is required")
    @Valid
    Origin origin,

    @Size(max = 500)
    String notes
) {}
```

Constraint annotations:

| Annotation | Description |
|-----------|-------------|
| `@NotNull` | Value must not be null |
| `@NotBlank` | String must not be null, empty, or whitespace |
| `@NotEmpty` | Collection/String must not be null or empty |
| `@Size(min, max)` | Collection/String size bounds |
| `@Min` / `@Max` | Numeric bounds |
| `@Pattern(regexp)` | Regex match |
| `@Email` | Valid email format |
| `@Valid` | Cascade validation to nested objects |
| `@Positive` | Number > 0 |

Use `@Valid` on `@RequestBody` parameters to trigger validation. Failures throw `MethodArgumentNotValidException` — handled by `@ControllerAdvice`.

---

## 6. Exception handling

```java
@ControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidationException(
            MethodArgumentNotValidException ex) {
        var traceId = MDC.get("traceId");
        var errors = ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        FieldError::getField,
                        fe -> Objects.requireNonNullElse(fe.getDefaultMessage(), "Invalid"),
                        (a, b) -> a));

        var problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.BAD_REQUEST, "Validation failed");
        problem.setType(URI.create("/problems/validation-error"));
        problem.setProperty("errors", errors);
        problem.setProperty("traceId", traceId);
        return ResponseEntity.badRequest().body(problem);
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ProblemDetail> handleNotFoundException(NotFoundException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
        problem.setType(URI.create("/problems/not-found"));
        problem.setProperty("traceId", MDC.get("traceId"));
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ProblemDetail> handleConflictException(ConflictException ex) {
        var problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
        problem.setType(URI.create("/problems/conflict"));
        problem.setProperty("traceId", MDC.get("traceId"));
        return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleException(Exception ex) {
        log.error("Unexpected error", ex);
        var problem = ProblemDetail.forStatusAndDetail(
                HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        problem.setType(URI.create("/problems/internal-error"));
        problem.setProperty("traceId", MDC.get("traceId"));
        return ResponseEntity.internalServerError().body(problem);
    }
}
```

Custom exceptions:

```java
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) { super(message); }
}

public class ConflictException extends RuntimeException {
    public ConflictException(String message) { super(message); }
}
```

`ProblemDetail` produces RFC 7807 JSON:
```json
{
  "type": "/problems/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "Notification DRAFT.IMP.2026.123 not found",
  "traceId": "abc-123"
}
```

---

## 7. Dependency injection

Always use **constructor injection** via `@RequiredArgsConstructor`. Never use `@Autowired` on fields.

```java
// Correct — constructor injection via Lombok
@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final AuditRepository auditRepository;
}

// Wrong — field injection
@Service
public class NotificationService {
    @Autowired  // ← Never do this
    private NotificationRepository notificationRepository;
}
```

Stereotype annotations:

| Annotation | Use |
|-----------|-----|
| `@Component` | Generic Spring-managed bean |
| `@Service` | Business logic layer |
| `@Repository` | Data access layer (enables exception translation) |
| `@Controller` / `@RestController` | Web layer |
| `@Configuration` | Config class with `@Bean` methods |

```java
@Configuration
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        var caffeine = Caffeine.newBuilder()
                .maximumSize(500)
                .expireAfterWrite(10, TimeUnit.MINUTES);
        var manager = new CaffeineCacheManager();
        manager.setCaffeine(caffeine);
        return manager;
    }
}
```

---

## 8. Configuration

```yaml
# application.yml
app:
  backend-url: ${BACKEND_URL:http://localhost:8085}
  admin-secret: ${ADMIN_SECRET:dev-secret}
  aws:
    region: ${AWS_REGION:eu-west-2}
    endpoint-override: ${AWS_ENDPOINT_OVERRIDE:}

spring:
  data:
    mongodb:
      uri: ${MONGO_URI:mongodb://localhost:27017/trade-imports}
  cache:
    type: caffeine

server:
  port: ${PORT:8085}
  forward-headers-strategy: framework
  shutdown: graceful
```

```yaml
# application-local.yml — overrides for local dev
app:
  aws:
    endpoint-override: http://localhost:4566
logging:
  level:
    root: DEBUG
```

`@ConfigurationProperties`:

```java
@ConfigurationProperties(prefix = "app")
@Validated   // ← required: without this, the @NotBlank etc. are silent decoration
public record AppConfig(
    @NotBlank String backendUrl,
    @NotBlank String adminSecret,
    AwsConfig aws
) {
    public record AwsConfig(
        @NotBlank String region,
        @Pattern(regexp = "^(https?://.*)?$")  // optional but format-checked
        String endpointOverride
    ) {}
}
```

Register: `@EnableConfigurationProperties(AppConfig.class)` on the application class.

**Why `@Validated` matters.** Without it, missing or malformed YAML produces NPEs at the first bean that calls `cdpConfig.uploader().maxFileSize()` — typically deep in a service method, with a stack trace that doesn't name the missing key. With `@Validated`, the application fails to start with a clear `ConfigurationPropertiesBindException` naming the offending field. Apply this to **every** `@ConfigurationProperties` record.

Constraint annotations to use on config records:

| Annotation | Use |
|-----------|-----|
| `@NotNull` | Required key — null is a configuration error, not a default |
| `@NotBlank` | Required string that must be non-empty |
| `@Pattern(regexp)` | URL formats, reference number formats, anything with structure |
| `@Positive` / `@PositiveOrZero` | Sizes, timeouts, counts |
| `@Min` / `@Max` | Bounded numeric ranges |
| `@Nullable` | Document optional fields explicitly (Jakarta annotation, not Spring) |

Match constraint annotation packages to your overall stack — this project uses Jakarta (`jakarta.validation.constraints.*`, `jakarta.annotation.Nullable`); don't mix in `org.springframework.lang.Nullable`.

---

## 9. Conditional beans

```java
@Service
@ConditionalOnProperty(name = "metrics.emf.enabled", havingValue = "true")
@RequiredArgsConstructor
@Slf4j
public class EmfMetricsPublisher {

    private final MeterRegistry meterRegistry;

    @Scheduled(fixedRateString = "${metrics.publish-interval-ms:60000}")
    public void publishMetrics() {
        log.info("Publishing EMF metrics");
        // ...
    }
}
```

`@ConditionalOnProperty` disables the bean entirely — no stub, no `if` check needed. In `application-test.yml`, set `metrics.emf.enabled=false`.

---

## 10. Caching

```java
@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager() {
        var caffeine = Caffeine.newBuilder()
                .maximumSize(1000)
                .expireAfterWrite(Duration.ofMinutes(10))
                .recordStats();
        var manager = new CaffeineCacheManager("notifications", "commodities");
        manager.setCaffeine(caffeine);
        return manager;
    }
}
```

```java
@Service
@RequiredArgsConstructor
public class CommodityService {

    @Cacheable(value = "commodities", key = "#code")
    public Commodity findByCode(String code) {
        // Only called on cache miss
        return commodityRepository.findByCode(code)
                .orElseThrow(() -> new NotFoundException("Commodity not found: " + code));
    }

    @CacheEvict(value = "commodities", key = "#commodity.code")
    public void update(Commodity commodity) {
        commodityRepository.save(commodity);
    }

    @CachePut(value = "commodities", key = "#result.code")
    public Commodity save(Commodity commodity) {
        return commodityRepository.save(commodity);
    }
}
```

**Self-invocation caveat**: `@Cacheable` is AOP-based — calling a cached method from within the same bean bypasses the cache. Extract to a separate bean if needed.

---

## 11. Scheduling

```java
@Configuration
@EnableScheduling
public class SchedulingConfig {}
```

```java
@Service
@ConditionalOnProperty(name = "scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class MetricsPublisher {

    // Fixed rate in milliseconds
    @Scheduled(fixedRate = 60_000)
    public void publishEveryMinute() { ... }

    // Cron expression
    @Scheduled(cron = "0 0 * * * *")  // top of every hour
    public void publishHourly() { ... }

    // From property — allows env-specific intervals
    @Scheduled(fixedRateString = "${metrics.publish-interval-ms:60000}")
    public void publishConfigurable() { ... }
}
```

Disable in tests via `application-integration-test.yml`:
```yaml
scheduling:
  enabled: false
```

---

## 12. Security — JWT resource server

```java
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http,
            JwtDecoder jwtDecoder,
            JwtAuthenticationConverter jwtAuthenticationConverter) throws Exception {
        return http
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/actuator/health/**").permitAll()
                        .anyRequest().authenticated())
                .oauth2ResourceServer(oauth2 -> oauth2
                        .jwt(jwt -> jwt
                                .decoder(jwtDecoder)
                                .jwtAuthenticationConverter(jwtAuthenticationConverter)))
                .sessionManagement(sm -> sm
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .csrf(AbstractHttpConfigurer::disable)
                .build();
    }

    @Bean
    public JwtDecoder jwtDecoder(
            @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuerUri,
            @Value("${jwt.audience}") String audience) {
        var decoder = JwtDecoders.fromIssuerLocation(issuerUri);
        var audienceValidator = new JwtClaimValidator<List<String>>(
                JwtClaimNames.AUD, aud -> aud != null && aud.contains(audience));
        var validator = new DelegatingOAuth2TokenValidator<>(
                JwtValidators.createDefaultWithIssuer(issuerUri), audienceValidator);
        ((NimbusJwtDecoder) decoder).setJwtValidator(validator);
        return decoder;
    }

    @Bean
    public JwtAuthenticationConverter jwtAuthenticationConverter() {
        var converter = new JwtGrantedAuthoritiesConverter();
        converter.setAuthoritiesClaimName("roles");
        converter.setAuthorityPrefix("ROLE_");
        var authConverter = new JwtAuthenticationConverter();
        authConverter.setJwtGrantedAuthoritiesConverter(converter);
        return authConverter;
    }
}
```

Admin secret filter (shared-secret auth for internal endpoints):

```java
@Component
@RequiredArgsConstructor
public class AdminSecretFilter extends OncePerRequestFilter {

    private final AppConfig appConfig;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (request instanceof HttpServletRequest req
                && req.getRequestURI().startsWith("/admin")) {
            var secret = req.getHeader("Trade-Imports-Animals-Admin-Secret");
            if (!appConfig.adminSecret().equals(secret)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
```

---

## 13. Servlet filters

```java
@Component
@Order(1)
public class RequestTracingFilter extends OncePerRequestFilter {

    private static final String TRACE_HEADER = "x-cdp-request-id";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        var traceId = request.getHeader(TRACE_HEADER);
        if (traceId != null && !traceId.isBlank()) {
            MDC.put("traceId", traceId);
        }
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.clear();  // always clear — prevents bleed between requests in thread pools
        }
    }
}
```

Outbound trace propagation via `RestClient` interceptor:

```java
@Component
public class TraceIdPropagationInterceptor implements ClientHttpRequestInterceptor {

    private static final String TRACE_HEADER = "x-cdp-request-id";

    @Override
    public ClientHttpResponse intercept(HttpRequest request, byte[] body,
            ClientHttpRequestExecution execution) throws IOException {
        var traceId = MDC.get("traceId");
        if (traceId != null && !traceId.isBlank()) {
            request.getHeaders().add(TRACE_HEADER, traceId);
        }
        return execution.execute(request, body);
    }
}
```

---

## 14. Actuator

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
      show-components: when-authorized
  health:
    defaults:
      enabled: true
```

```yaml
# application-local.yml — expose everything locally
management:
  endpoints:
    web:
      exposure:
        include: "*"
```

Custom health indicator:

```java
@Component
public class BackendHealthIndicator implements HealthIndicator {

    private final NotificationRepository notificationRepository;

    @Override
    public Health health() {
        try {
            notificationRepository.count();
            return Health.up().build();
        } catch (Exception ex) {
            return Health.down(ex).build();
        }
    }
}
```

---

## 15. Logging

```java
@Slf4j  // Lombok — provides log field
@Service
public class NotificationService {

    public NotificationDto save(NotificationRequest request, HttpHeaders headers) {
        // Parameterised — correct
        log.info("Saving notification for reference: {}", request.referenceNumber());

        // Structured with context
        log.debug("Save request received: referenceNumber={}, userId={}",
                request.referenceNumber(), headers.getFirst("User-Id"));

        try {
            var result = doSave(request);
            log.info("Notification saved: referenceNumber={}", result.referenceNumber());
            return result;
        } catch (Exception ex) {
            // Always log with exception object — not ex.getMessage()
            log.error("Failed to save notification: referenceNumber={}",
                    request.referenceNumber(), ex);
            throw ex;
        }
    }
}
```

Log levels:
- `TRACE` — very fine-grained, never in production
- `DEBUG` — diagnostic detail for troubleshooting
- `INFO` — normal operations (default production level)
- `WARN` — unexpected but handled
- `ERROR` — operation failed, needs attention

### What to log

Support reads these logs to answer "what happened to this notification, this user, this call?". Write every log line for that reader.

**Every branch that changes an outcome logs once, with the ids support searches by.** An outcome-changing branch is a refusal, a redirect, a retry, a fallback, a state switch, or a caught exception that the code carries on past. Log it once, where the decision is made, with the reference number, notification id, user id, port code, dependency and operation, or whichever of these are in scope. For each new `catch`, retry or fallback, ask: which log line tells support this happened, and which ids does it carry? If the answer is "none", add one. A silent retry or fallback is a defect.

**Log where the ids are.** If the place that spots the problem does not hold the id, return the result and log in the caller that does.

Bad, from `PortType` in `trade-imports-reference-data`. The enum warns, but it only holds the traffic value, so support cannot tell which port is affected:

```java
if (type.isEmpty() && REPORTED_UNKNOWN_TRAFFIC.add(stripped)) {
  log.warn("MDM port traffic '{}' is not a known port type; its ports are listed last with no type", stripped);
}
```

Good: `PortType.fromTraffic` returns `Optional.empty()` and does not log. `PortOfEntry(MdmPortOfEntry)`, which holds the port code, logs:

```java
this.type = PortType.fromTraffic(mdm.getTraffic()).orElse(null);
if (type == null) {
  log.warn("Port {} has MDM traffic '{}', which is not a known port type", code, mdm.getTraffic());
}
```

**Pass the throwable, never only its message.** Give the exception as the last argument, with no `{}` for it. SLF4J then prints the type, the message, the stack trace and the cause chain. `e.getMessage()` alone drops the type and the cause, and is often null.

Bad, from `ExternalCallMetrics` in `trade-imports-reference-data` and `trade-imports-dynamics-gateway`:

```java
} catch (RuntimeException e) {
  log.warn("Could not record external call {}/{}: {}", call.dependency(), call.operation(), e.getMessage());
}
```

Good:

```java
} catch (RuntimeException e) {
  log.warn("Could not record external call {}/{}", call.dependency(), call.operation(), e);
}
```

**A failure line says why it failed.** `ExternalCallMetrics.measure` catches the exception, records the call as failed and rethrows. The log line it writes reads `External call <dependency>/<operation> failure in 5 ms`, with no cause and no status. Support sees a failure and cannot tell a timeout from a refusal. Carry the HTTP status, or the exception type when there is no status, into the failure line. If the exception is rethrown and logged in full where it is handled, do not log its stack trace here as well.

**No request or response bodies at INFO.** Bodies hold personal data (names, addresses) and can be large. Log the status and what the code did with the answer, such as a result count. If a body is the only way to tell two failures apart, log a bounded excerpt at WARN on the failure path only.

Bad, from `AddressLookupClient` in `trade-imports-ins-backend`. Every successful lookup writes the full address list to the log:

```java
log.info("Address lookup answered: status={} body={}", response.getStatusCode().value(), responseBody);
```

Good:

```java
log.info("Address lookup answered: status={}", response.getStatusCode().value());
```

`logRefusal` in the same class is the acceptable case: a refusal, at WARN, with the body cut to `MAX_LOGGED_BODY_LENGTH`.

**Do not test diagnostic log lines.** A test that pins a spike or debugging log line keeps it alive after the spike ends. Test the outcome; if a log line is part of the contract (an audit event, an ECS field), test that in an IT such as `EcsLoggingIT`.

`logback-spring.xml` — switch format by Spring profile:

```xml
<configuration>
  <springProfile name="!local">
    <!-- ECS format for deployed environments -->
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
      <encoder class="co.elastic.logging.logback.EcsEncoder">
        <serviceName>trade-imports-animals-backend</serviceName>
      </encoder>
    </appender>
  </springProfile>

  <springProfile name="local">
    <!-- Human-readable for local dev -->
    <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
      <encoder>
        <pattern>%d{HH:mm:ss} %-5level [%X{traceId}] %logger{36} - %msg%n</pattern>
      </encoder>
    </appender>
  </springProfile>

  <!-- Suppress health check noise -->
  <logger name="org.springframework.web.servlet.DispatcherServlet" level="WARN"/>

  <root level="${LOG_LEVEL:-INFO}">
    <appender-ref ref="STDOUT"/>
  </root>
</configuration>
```

---

## 16. Spring Data MongoDB (brief)

Full reference: `docs/java/spring-data-mongodb.md`.

```java
@Document(collection = "notifications")
@Builder
@Data
public class Notification {

    @Id
    private String id;

    @Indexed(sparse = true, unique = true)
    private String referenceNumber;

    @CreatedDate
    private Instant createdAt;

    @LastModifiedDate
    private Instant updatedAt;
}
```

```java
public interface NotificationRepository extends MongoRepository<Notification, String> {

    Optional<Notification> findByReferenceNumber(String referenceNumber);

    List<Notification> findAllByReferenceNumberIn(List<String> referenceNumbers);

    boolean existsByReferenceNumber(String referenceNumber);
}
```

---

## 17. HTTP clients (RestClient)

```java
@Configuration
@RequiredArgsConstructor
public class HttpClientConfig {

    private final TraceIdPropagationInterceptor traceInterceptor;

    @Bean
    public RestClient backendRestClient(
            @Value("${app.backend-url}") String baseUrl) {
        return RestClient.builder()
                .baseUrl(baseUrl)
                .requestInterceptor(traceInterceptor)
                .defaultHeader("Content-Type", "application/json")
                .build();
    }
}
```

```java
@Service
@RequiredArgsConstructor
public class BackendClient {

    private final RestClient backendRestClient;

    public NotificationDto getNotification(String referenceNumber) {
        return backendRestClient.get()
                .uri("/notifications/{ref}", referenceNumber)
                .retrieve()
                .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
                    throw new NotFoundException("Notification not found: " + referenceNumber);
                })
                .body(NotificationDto.class);
    }

    public NotificationDto saveNotification(NotificationRequest request) {
        return backendRestClient.post()
                .uri("/notifications")
                .body(request)
                .retrieve()
                .body(NotificationDto.class);
    }
}
```

Prefer `RestClient` (Spring 6.1+). Do not use `RestTemplate` for new code.

---

## 18. OpenAPI (brief)

Full reference: `docs/java/openapi-springdoc.md`.

```java
@Tag(name = "Notifications", description = "Manage import notifications")
@RestController
public class NotificationController {

    @Operation(summary = "Get all notifications")
    @ApiResponse(responseCode = "200", description = "Notifications retrieved")
    @GetMapping("/notifications")
    public List<NotificationDto> findAll() { ... }
}
```

---

## 19. Micrometer metrics

```java
@Configuration
public class MetricsConfig {

    @Bean
    public TimedAspect timedAspect(MeterRegistry registry) {
        return new TimedAspect(registry);
    }

    @Bean
    public CountedAspect countedAspect(MeterRegistry registry) {
        return new CountedAspect(registry);
    }
}
```

`@Timed` on controller/service methods:
```java
@Timed(value = "notification.save", percentiles = { 0.5, 0.95, 0.99 })
public NotificationDto save(NotificationRequest request, HttpHeaders headers) { ... }
```

Programmatic metrics:
```java
@Service
@RequiredArgsConstructor
public class EmfMetricsPublisher {

    private final MeterRegistry meterRegistry;

    @Scheduled(fixedRateString = "${metrics.publish-interval-ms:60000}")
    public void publishMetrics() {
        var notificationCount = meterRegistry.find("notification.save").timer();
        if (notificationCount != null) {
            // Emit CloudWatch EMF JSON
            log.info("{\"_aws\":{\"Timestamp\":{},\"CloudWatchMetrics\":[...]},\"Count\":{}}",
                    System.currentTimeMillis(), notificationCount.count());
        }
    }
}
```

---

## 20. Testing

Full reference: `docs/java/testing/unit.md` and `docs/java/testing/integration.md`.

Key pattern — Testcontainers `@DynamicPropertySource`:

```java
@SpringBootTest
@Testcontainers
class NotificationServiceIT {

    @Container
    static MongoDBContainer mongo = new MongoDBContainer("mongo:7");

    @DynamicPropertySource
    static void mongoProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
    }
}
```

---

## 21. Project conventions

| Convention | Value |
|-----------|-------|
| Base package | `uk.gov.defra.tradeimportsanimals` |
| Java version | Java 25 (Amazon Corretto) |
| Spring Boot | 3.5.x |
| Build tool | Maven |
| Coverage minimum | 65% (JaCoCo enforced in `verify`) |
| HTTP port | 8085 |
| Shutdown | Graceful (`server.shutdown=graceful`) |
| Proxy headers | `server.forward-headers-strategy=framework` |

**Lombok annotations to use:**

| Annotation | Purpose |
|-----------|---------|
| `@RequiredArgsConstructor` | Constructor injection |
| `@Slf4j` | Provides `log` field |
| `@Builder` | Builder pattern |
| `@Data` | Getters + setters + equals + hashCode (use on mutable entities) |
| `@Value` | Immutable value class (all fields final) |
| `@With` | Generates `withX()` copy methods |

**Error type URI convention:** `/problems/{problem-type}` (e.g. `/problems/not-found`, `/problems/validation-error`)

---

## 22. Maven — coordinated dependency versions via BOMs

Spring Boot's `spring-boot-starter-parent` already imports a curated BOM for Spring/Jackson/etc. For dependency families *outside* Spring (AWS SDK, Spring Cloud, Testcontainers), import their BOM in `dependencyManagement` rather than pinning each artifact's `<version>` separately. A BOM keeps every artifact in the family at a compatible version.

```xml
<dependencyManagement>
    <dependencies>
        <!-- AWS SDK v2 — one BOM, every aws-sdk dep stays consistent -->
        <dependency>
            <groupId>software.amazon.awssdk</groupId>
            <artifactId>bom</artifactId>
            <version>${aws.sdk.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>

        <!-- Spring Cloud — manages spring-cloud-starter-* artifacts -->
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-dependencies</artifactId>
            <version>${spring.cloud.version}</version>
            <type>pom</type>
            <scope>import</scope>
        </dependency>
    </dependencies>
</dependencyManagement>

<dependencies>
    <!-- No <version> — comes from the BOM -->
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>s3</artifactId>
    </dependency>
    <dependency>
        <groupId>software.amazon.awssdk</groupId>
        <artifactId>sts</artifactId>
    </dependency>
    <dependency>
        <groupId>org.springframework.cloud</groupId>
        <artifactId>spring-cloud-starter-openfeign</artifactId>
    </dependency>
</dependencies>
```

**Why it matters.** Manual per-artifact versions drift — one upgrade leaves siblings on incompatible versions, surfacing as `NoSuchMethodError`/`LinkageError` at runtime. A single BOM property bumps all family members atomically.
### Source: `docs/best-practices/doc-comments/javadoc.md`

# Javadoc Format

Covers `.java` files. Read [`BEST_PRACTICES.md`](BEST_PRACTICES.md) first for the universal rules — this addendum covers when to write a block and its format.

---

## When to write a Javadoc comment

Default to **no comment**. Write Javadoc only to state an API contract:

- public methods on REST controllers whose descriptions springdoc publishes in the OpenAPI document
- public interfaces and classes that another module, library or service calls as a contract, where a caller needs a parameter constraint, return meaning or thrown exception that the signature and names cannot show

Do not write Javadoc for:

- `private` and package-private methods
- internal service, mapper and configuration classes
- simple getters, setters and record components
- a class whose responsibility is unclear from its name — rename the class instead
- a parameter that is unclear from its name — rename the parameter instead
- rationale, history or design notes — these go in the repo's `docs/`
- callers, other services, a library or a test (see "Claims about other code" in `BEST_PRACTICES.md`)
- `@Override` methods where the parent Javadoc still holds (use `{@inheritDoc}` if a block is needed at all)

---

## Block format

```java
/**
 * One-sentence summary ending with a full stop.
 *
 * @param paramName the constraint a caller must meet
 * @return what is returned, including when it is empty
 * @throws ExceptionType condition under which this is thrown
 */
public ReturnType methodName(ParamType paramName) { ... }
```

Place the comment immediately before the declaration with no blank line between them. Keep it to the contract: no longer description of how the method works.

---

## Tags

### `@param`

```
@param name description
```

- Name must match the actual parameter name exactly.
- If a parameter is renamed, reordered, added, or removed, update all `@param` tags.
- Do not include the type — it is in the signature.

### `@return`

```
@return description of what is returned
```

- Omit for `void` methods.
- Description must match what the method actually returns — check `return` statements.
- If the return type changed (e.g. now returns `Optional<T>` instead of `T`), update the description.

### `@throws`

```
@throws ExceptionType condition
```

- Only include for **checked exceptions** (required by the compiler) and **unchecked exceptions that are part of the method's documented contract**.
- Remove tags for exceptions that are no longer thrown.
- `ExceptionType` must be the simple class name of the actual exception thrown.

### `{@inheritDoc}`

Use on `@Override` methods to inherit the parent's Javadoc rather than duplicating or drifting from it.

```java
/**
 * {@inheritDoc}
 */
@Override
public User findById(String id) { ... }
```

---

## Accuracy checklist

When reviewing a `/** */` block on a Java method, first check it belongs at all: if the method is not an API contract as defined above, the fix is to delete the block. Otherwise verify each claim against the current code:

| Check | What to look for |
|-------|-----------------|
| Belongs | The method is an API contract and the block states only that contract |
| Param names | Every `@param name` matches a parameter in the method signature |
| No phantom params | No `@param` for parameters that no longer exist |
| Param count | Count of `@param` tags matches number of parameters |
| Return description | `@return` accurately describes what return statements produce |
| Void check | No `@return` on `void` methods |
| Throws types | `@throws ExceptionType` matches the exception actually thrown |
| Throws presence | No `@throws` for exceptions the method no longer throws |
| Summary | First sentence describes current responsibility, with no rationale, history or claims about other code |
| Inherited methods | `@Override` methods use `{@inheritDoc}` rather than a potentially-stale copy |

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
