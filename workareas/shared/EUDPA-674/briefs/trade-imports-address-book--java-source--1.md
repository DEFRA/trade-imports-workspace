# Review brief: java-source

This brief is 6071 lines. Read it with Read from line 1 to line 6071, in
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
- Group: trade-imports-address-book--java-source--1
- Repo: trade-imports-address-book
- PR: 22
- Commit reviewed: 491f0276ddc5772d9171a926337fbab7a1f771b3
- Repo checkout: /Users/aminav/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-674/repos/trade-imports-address-book
- Files:
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressController.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressService.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfig.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MongoConfig.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandler.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/NotFoundException.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilter.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoder.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/AddressMetrics.java`
  - `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetrics.java`

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

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressController.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressController.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressController.java
index 8430a0a..4ef5934 100644
--- a/src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressController.java
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressController.java
@@ -52,7 +52,7 @@ public class AddressController {
 
   private static void authoriseOrg(String orgId, String organisationId) {
     if (!organisationId.equals(orgId)) {
-      throw new NotFoundException("Address not found");
+      throw NotFoundException.organisationMismatch(orgId, organisationId);
     }
   }
 
@@ -107,7 +107,7 @@ private static void authoriseOrg(String orgId, String organisationId) {
           @Content(
               mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
               schema = @Schema(implementation = Problem.class)))
-  @Timed("controller.listOperators.time")
+  @Timed("controller.list.time")
   public AddressPageResponse list(
       @PathVariable String orgId,
       @RequestHeader(IdentityHeaderFilter.ORGANISATION_ID_HEADER) String organisationId,
@@ -230,7 +230,7 @@ public AddressPageResponse list(
           @Content(
               mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
               schema = @Schema(implementation = Problem.class)))
-  @Timed("controller.createOperator.time")
+  @Timed("controller.create.time")
   public ResponseEntity<AddressResponse> create(
       @PathVariable String orgId,
       @RequestHeader(IdentityHeaderFilter.ORGANISATION_ID_HEADER) String organisationId,
@@ -281,7 +281,7 @@ public ResponseEntity<AddressResponse> create(
           @Content(
               mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
               schema = @Schema(implementation = Problem.class)))
-  @Timed("controller.getOperator.time")
+  @Timed("controller.get.time")
   public AddressResponse get(
       @PathVariable String orgId,
       @RequestHeader(IdentityHeaderFilter.ORGANISATION_ID_HEADER) String organisationId,
@@ -291,7 +291,7 @@ public AddressResponse get(
     Address address =
         addressService
             .get(addressId, organisationId)
-            .orElseThrow(() -> new NotFoundException("Address not found"));
+            .orElseThrow(() -> NotFoundException.addressNotFound(addressId, organisationId));
     return addressMapper.toResponse(address);
   }
 
@@ -347,7 +347,7 @@ public AddressResponse get(
           @Content(
               mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
               schema = @Schema(implementation = Problem.class)))
-  @Timed("controller.updateOperator.time")
+  @Timed("controller.update.time")
   public AddressResponse update(
       @PathVariable String orgId,
       @RequestHeader(IdentityHeaderFilter.ORGANISATION_ID_HEADER) String organisationId,
@@ -394,7 +394,7 @@ public AddressResponse update(
           @Content(
               mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
               schema = @Schema(implementation = Problem.class)))
-  @Timed("controller.deleteOperator.time")
+  @Timed("controller.delete.time")
   public ResponseEntity<Void> delete(
       @PathVariable String orgId,
       @RequestHeader(IdentityHeaderFilter.ORGANISATION_ID_HEADER) String organisationId,
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.address;
    2  
    3  import io.micrometer.core.annotation.Timed;
    4  import io.swagger.v3.oas.annotations.Operation;
    5  import io.swagger.v3.oas.annotations.Parameter;
    6  import io.swagger.v3.oas.annotations.headers.Header;
    7  import io.swagger.v3.oas.annotations.media.ArraySchema;
    8  import io.swagger.v3.oas.annotations.media.Content;
    9  import io.swagger.v3.oas.annotations.media.Schema;
   10  import io.swagger.v3.oas.annotations.responses.ApiResponse;
   11  import io.swagger.v3.oas.annotations.security.SecurityRequirement;
   12  import io.swagger.v3.oas.annotations.tags.Tag;
   13  import jakarta.validation.Valid;
   14  import java.net.URI;
   15  import java.util.List;
   16  import lombok.RequiredArgsConstructor;
   17  import lombok.extern.slf4j.Slf4j;
   18  import org.springframework.http.MediaType;
   19  import org.springframework.http.ResponseEntity;
   20  import org.springframework.web.bind.annotation.DeleteMapping;
   21  import org.springframework.web.bind.annotation.GetMapping;
   22  import org.springframework.web.bind.annotation.PathVariable;
   23  import org.springframework.web.bind.annotation.PostMapping;
   24  import org.springframework.web.bind.annotation.PutMapping;
   25  import org.springframework.web.bind.annotation.RequestBody;
   26  import org.springframework.web.bind.annotation.RequestHeader;
   27  import org.springframework.web.bind.annotation.RequestMapping;
   28  import org.springframework.web.bind.annotation.RequestParam;
   29  import org.springframework.web.bind.annotation.RestController;
   30  import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
   31  import uk.gov.defra.trade.imports.addressbook.exceptions.NotFoundException;
   32  import uk.gov.defra.trade.imports.addressbook.exceptions.Problem;
   33  import uk.gov.defra.trade.imports.addressbook.exceptions.ValidationProblem;
   34  import uk.gov.defra.trade.imports.addressbook.filter.IdentityHeaderFilter;
   35  
   36  /**
   37   * REST API for an organisation's address book. Every operation is path-scoped to an
   38   * {@code orgId} and authorised against the caller's trusted {@code Trade-Imports-Organisation-Id}
   39   * forwarded header: the path is never trusted alone. A caller whose organisation disagrees with
   40   * the path {@code orgId} gets a 404, so another organisation's addresses are never disclosed.
   41   */
   42  @RestController
   43  @RequestMapping("/organisation/{orgId}/addresses")
   44  @Tag(name = "addresses", description = "Address book, scoped to the caller's organisation")
   45  @SecurityRequirement(name = "Trade-Imports-Organisation-Id")
   46  @Slf4j
   47  @RequiredArgsConstructor
   48  public class AddressController {
   49  
   50    private final AddressService addressService;
   51    private final AddressMapper addressMapper;
   52  
   53    private static void authoriseOrg(String orgId, String organisationId) {
   54      if (!organisationId.equals(orgId)) {
   55        throw NotFoundException.organisationMismatch(orgId, organisationId);
   56      }
   57    }
   58  
   59    /**
   60     * Lists the caller's live addresses, newest first, one page at a time. {@code page} is 1-based
   61     * (default 1) and {@code pageSize} runs from {@link AddressService#MIN_PAGE_SIZE} to {@link
   62     * AddressService#MAX_PAGE_SIZE} (default {@link AddressService#DEFAULT_PAGE_SIZE}); an
   63     * out-of-range or non-numeric value for either is a 400 bad-request problem with no {@code errors} map. The
   64     * response is a top-level object ({@code items} + pagination metadata), never a bare array.
   65     *
   66     * @param orgId the organisation scope from the path, authorised against the identity header
   67     * @param organisationId the caller's organisation id, from {@code Trade-Imports-Organisation-Id}
   68     * @param page the 1-based page number (default 1)
   69     * @param pageSize the number of addresses a page, or null for the default
   70     * @param q the optional search term, as its {@code @Parameter} describes
   71     * @param countryCodes the optional country codes, as their {@code @Parameter} describes
   72     * @param roles the optional roles to keep, as their {@code @Parameter} describes
   73     * @param searchRoles the optional search roles, as their {@code @Parameter} describes
   74     * @return 200 with one page of live addresses
   75     */
   76    @GetMapping
   77    @Operation(
   78        operationId = "list-addresses",
   79        summary = "List the caller's live addresses (paginated, searchable)")
   80    @ApiResponse(
   81        responseCode = "200",
   82        description = "One page of the caller's live addresses",
   83        content =
   84            @Content(
   85                mediaType = MediaType.APPLICATION_JSON_VALUE,
   86                schema = @Schema(implementation = AddressPageResponse.class)))
   87    @ApiResponse(
   88        responseCode = "400",
   89        description =
   90            "An out-of-range or non-numeric page or page size, an unknown role or search role,"
   91                + " or a missing org header",
   92        content =
   93            @Content(
   94                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
   95                schema = @Schema(implementation = Problem.class)))
   96    @ApiResponse(
   97        responseCode = "404",
   98        description = "Path orgId does not match the caller's organisation header",
   99        content =
  100            @Content(
  101                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  102                schema = @Schema(implementation = Problem.class)))
  103    @ApiResponse(
  104        responseCode = "500",
  105        description = "Unexpected server error",
  106        content =
  107            @Content(
  108                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  109                schema = @Schema(implementation = Problem.class)))
  110    @Timed("controller.list.time")
  111    public AddressPageResponse list(
  112        @PathVariable String orgId,
  113        @RequestHeader(IdentityHeaderFilter.ORGANISATION_ID_HEADER) String organisationId,
  114        @Parameter(
  115                description = "1-based page number",
  116                schema = @Schema(type = "integer", format = "int32", minimum = "1", defaultValue = "1"))
  117            @RequestParam(defaultValue = "1")
  118            int page,
  119        @Parameter(
  120                description =
  121                    "Addresses a page, from "
  122                        + AddressService.MIN_PAGE_SIZE
  123                        + " to "
  124                        + AddressService.MAX_PAGE_SIZE
  125                        + " (default "
  126                        + AddressService.DEFAULT_PAGE_SIZE
  127                        + ")",
  128                schema =
  129                    @Schema(
  130                        type = "integer",
  131                        format = "int32",
  132                        minimum = "" + AddressService.MIN_PAGE_SIZE,
  133                        maximum = "" + AddressService.MAX_PAGE_SIZE,
  134                        defaultValue = "" + AddressService.DEFAULT_PAGE_SIZE))
  135            @RequestParam(required = false)
  136            Integer pageSize,
  137        @Parameter(
  138                description =
  139                    "Case-insensitive partial-word search over name, address line 1, address line"
  140                        + " 2, town or city, county and postcode. An address matching q, a"
  141                        + " countryCode or a searchRole is returned.")
  142            @RequestParam(required = false)
  143            String q,
  144        @Parameter(
  145                description =
  146                    "ISO alpha-2 country codes. Repeatable. An address in any of them matches the"
  147                        + " search, as one matching q or a searchRole does.")
  148            @RequestParam(name = "countryCode", required = false)
  149            List<String> countryCodes,
  150        @Parameter(
  151                description =
  152                    "Keeps only addresses holding any of these roles. Repeatable. Narrows the"
  153                        + " search (q, countryCode and searchRole); an address with no roles never"
  154                        + " matches. An unknown value is refused with 400.",
  155                array = @ArraySchema(schema = @Schema(implementation = AddressRole.class)))
  156            @RequestParam(name = "role", required = false)
  157            List<AddressRole> roles,
  158        @Parameter(
  159                description =
  160                    "Roles that make an address match the search: an address holding any of them"
  161                        + " matches, as one matching q or countryCode does. Repeatable. An unknown"
  162                        + " value is refused with 400.",
  163                array = @ArraySchema(schema = @Schema(implementation = AddressRole.class)))
  164            @RequestParam(name = "searchRole", required = false)
  165            List<AddressRole> searchRoles) {
  166      authoriseOrg(orgId, organisationId);
  167      log.info(
  168          "GET addresses - page {}, pageSize {}, q present {}, countryCodes {}, roles {},"
  169              + " searchRoles {}",
  170          page,
  171          pageSize,
  172          q != null,
  173          countryCodes,
  174          roles,
  175          searchRoles);
  176      return addressService.list(
  177          organisationId,
  178          page,
  179          pageSize,
  180          new RequestedListFilters(q, countryCodes, roles, searchRoles));
  181    }
  182  
  183    /**
  184     * Creates an address in the caller's address book. {@code organisationId} is stamped from the
  185     * identity header, never from the body; server-assigned fields carried in the body are ignored,
  186     * not rejected.
  187     *
  188     * @param orgId the organisation scope from the path, authorised against the identity header
  189     * @param organisationId the caller's organisation id, from {@code Trade-Imports-Organisation-Id}
  190     * @param request the validated create body
  191     * @return 201 with the created address and a {@code Location} header
  192     */
  193    @PostMapping
  194    @Operation(
  195        operationId = "create-address",
  196        summary = "Create an address in the caller's address book")
  197    @ApiResponse(
  198        responseCode = "201",
  199        description = "Created",
  200        headers =
  201            @Header(
  202                name = "Location",
  203                description = "Absolute URI of the created address",
  204                schema = @Schema(type = "string")),
  205        content =
  206            @Content(
  207                mediaType = MediaType.APPLICATION_JSON_VALUE,
  208                schema = @Schema(implementation = AddressResponse.class)))
  209    @ApiResponse(
  210        responseCode = "400",
  211        description = "Validation error, or a missing identity header",
  212        content =
  213            @Content(
  214                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  215                schema =
  216                    @Schema(
  217                        type = "object",
  218                        anyOf = {ValidationProblem.class, Problem.class})))
  219    @ApiResponse(
  220        responseCode = "404",
  221        description = "Path orgId does not match the caller's organisation header",
  222        content =
  223            @Content(
  224                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  225                schema = @Schema(implementation = Problem.class)))
  226    @ApiResponse(
  227        responseCode = "500",
  228        description = "Unexpected server error",
  229        content =
  230            @Content(
  231                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  232                schema = @Schema(implementation = Problem.class)))
  233    @Timed("controller.create.time")
  234    public ResponseEntity<AddressResponse> create(
  235        @PathVariable String orgId,
  236        @RequestHeader(IdentityHeaderFilter.ORGANISATION_ID_HEADER) String organisationId,
  237        @Valid @RequestBody AddressRequest request) {
  238      authoriseOrg(orgId, organisationId);
  239      log.info("POST addresses - creating address");
  240      Address created = addressService.create(request, organisationId);
  241      URI location =
  242          ServletUriComponentsBuilder.fromCurrentRequest()
  243              .path("/{address-id}")
  244              .buildAndExpand(created.getId())
  245              .encode()
  246              .toUri();
  247      return ResponseEntity.created(location).body(addressMapper.toResponse(created));
  248    }
  249  
  250    /**
  251     * Fetches one address by id within the caller's organisation scope, tombstones included. A DELETED
  252     * address is returned with 200 and {@code deleted: true} so the caller can detect a deletion; an
  253     * unknown id, or one belonging to another organisation, is a 404 (existence is never leaked). A
  254     * 404 is therefore NOT a deletion signal: only the tombstone is.
  255     *
  256     * @param orgId the organisation scope from the path, authorised against the identity header
  257     * @param organisationId the caller's organisation id, from {@code Trade-Imports-Organisation-Id}
  258     * @param addressId the opaque address id from the path
  259     * @return 200 with the address (deleted false or true)
  260     */
  261    @GetMapping("/{address-id}")
  262    @Operation(operationId = "get-address", summary = "Fetch one address, including tombstones")
  263    @ApiResponse(
  264        responseCode = "200",
  265        description = "The address (deleted false or true)",
  266        content =
  267            @Content(
  268                mediaType = MediaType.APPLICATION_JSON_VALUE,
  269                schema = @Schema(implementation = AddressResponse.class)))
  270    @ApiResponse(
  271        responseCode = "404",
  272        description = "Unknown id, or an id outside the caller's organisation scope",
  273        content =
  274            @Content(
  275                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  276                schema = @Schema(implementation = Problem.class)))
  277    @ApiResponse(
  278        responseCode = "500",
  279        description = "Unexpected server error",
  280        content =
  281            @Content(
  282                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  283                schema = @Schema(implementation = Problem.class)))
  284    @Timed("controller.get.time")
  285    public AddressResponse get(
  286        @PathVariable String orgId,
  287        @RequestHeader(IdentityHeaderFilter.ORGANISATION_ID_HEADER) String organisationId,
  288        @PathVariable("address-id") String addressId) {
  289      authoriseOrg(orgId, organisationId);
  290      log.info("GET addresses/{}", addressId);
  291      Address address =
  292          addressService
  293              .get(addressId, organisationId)
  294              .orElseThrow(() -> NotFoundException.addressNotFound(addressId, organisationId));
  295      return addressMapper.toResponse(address);
  296    }
  297  
  298    /**
  299     * Replaces an address's mutable fields (full representation replace). {@code modifiedAt} is bumped
  300     * on success (audit only). An unknown id, an id outside the caller's organisation, or a
  301     * soft-deleted tombstone all yield a 404 — tombstones are outside the caller's live set and
  302     * existence is never leaked.
  303     *
  304     * @param orgId the organisation scope from the path, authorised against the identity header
  305     * @param organisationId the caller's organisation id, from {@code Trade-Imports-Organisation-Id}
  306     * @param addressId the opaque address id from the path
  307     * @param request the validated update body
  308     * @return 200 with the updated address and its bumped {@code modifiedAt}
  309     */
  310    @PutMapping("/{address-id}")
  311    @Operation(operationId = "update-address", summary = "Replace an address's mutable fields")
  312    @ApiResponse(
  313        responseCode = "200",
  314        description = "Updated address with bumped modifiedAt",
  315        content =
  316            @Content(
  317                mediaType = MediaType.APPLICATION_JSON_VALUE,
  318                schema = @Schema(implementation = AddressResponse.class)))
  319    @ApiResponse(
  320        responseCode = "400",
  321        description = "Validation error, or a missing org header",
  322        content =
  323            @Content(
  324                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  325                schema =
  326                    @Schema(
  327                        type = "object",
  328                        anyOf = {ValidationProblem.class, Problem.class})))
  329    @ApiResponse(
  330        responseCode = "404",
  331        description = "Unknown id, an id outside the caller's organisation scope, or a tombstone",
  332        content =
  333            @Content(
  334                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  335                schema = @Schema(implementation = Problem.class)))
  336    @ApiResponse(
  337        responseCode = "409",
  338        description = "Concurrent update conflict",
  339        content =
  340            @Content(
  341                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  342                schema = @Schema(implementation = Problem.class)))
  343    @ApiResponse(
  344        responseCode = "500",
  345        description = "Unexpected server error",
  346        content =
  347            @Content(
  348                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  349                schema = @Schema(implementation = Problem.class)))
  350    @Timed("controller.update.time")
  351    public AddressResponse update(
  352        @PathVariable String orgId,
  353        @RequestHeader(IdentityHeaderFilter.ORGANISATION_ID_HEADER) String organisationId,
  354        @PathVariable("address-id") String addressId,
  355        @Valid @RequestBody AddressRequest request) {
  356      authoriseOrg(orgId, organisationId);
  357      log.info("PUT addresses/{}", addressId);
  358      Address updated = addressService.update(addressId, request, organisationId);
  359      return addressMapper.toResponse(updated);
  360    }
  361  
  362    /**
  363     * Soft-deletes an address. The document is not removed: {@code status} flips to {@code DELETED}
  364     * and {@code modifiedAt} is bumped, and the tombstone stays fetchable by id so a deletion is
  365     * detectable. Idempotent — deleting an already-DELETED address is a 204 with no state change. An
  366     * unknown id, or one outside the caller's organisation, is a 404 (existence is never leaked).
  367     *
  368     * @param orgId the organisation scope from the path, authorised against the identity header
  369     * @param organisationId the caller's organisation id, from {@code Trade-Imports-Organisation-Id}
  370     * @param addressId the opaque address id from the path
  371     * @return 204 No Content (soft-deleted, or already deleted)
  372     */
  373    @DeleteMapping("/{address-id}")
  374    @Operation(operationId = "delete-address", summary = "Soft-delete an address (tombstone)")
  375    @ApiResponse(responseCode = "204", description = "Soft-deleted (or already deleted — idempotent)")
  376    @ApiResponse(
  377        responseCode = "400",
  378        description = "Missing org header",
  379        content =
  380            @Content(
  381                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  382                schema = @Schema(implementation = Problem.class)))
  383    @ApiResponse(
  384        responseCode = "404",
  385        description = "Unknown id, or an id outside the caller's organisation scope",
  386        content =
  387            @Content(
  388                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  389                schema = @Schema(implementation = Problem.class)))
  390    @ApiResponse(
  391        responseCode = "500",
  392        description = "Unexpected server error",
  393        content =
  394            @Content(
  395                mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
  396                schema = @Schema(implementation = Problem.class)))
  397    @Timed("controller.delete.time")
  398    public ResponseEntity<Void> delete(
  399        @PathVariable String orgId,
  400        @RequestHeader(IdentityHeaderFilter.ORGANISATION_ID_HEADER) String organisationId,
  401        @PathVariable("address-id") String addressId) {
  402      authoriseOrg(orgId, organisationId);
  403      log.info("DELETE addresses/{}", addressId);
  404      addressService.delete(addressId, organisationId);
  405      return ResponseEntity.noContent().build();
  406    }
  407  }
```

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/address/AddressService.java`

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

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MetricsConfig.java`

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

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MongoConfig.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MongoConfig.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MongoConfig.java
index d715549..97d0b83 100644
--- a/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MongoConfig.java
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/configuration/MongoConfig.java
@@ -15,18 +15,9 @@
 import javax.net.ssl.SSLContext;
 import java.util.concurrent.TimeUnit;
 import uk.gov.defra.trade.imports.addressbook.configuration.tls.TrustStoreConfiguration;
+import uk.gov.defra.trade.imports.addressbook.metrics.MongoAvailability;
+import uk.gov.defra.trade.imports.addressbook.metrics.MongoCommandMetrics;
 
-/**
- * MongoDB configuration for Trade Imports Address Book.
- *
- * <p>Configures MongoDB connection with: - AWS IAM authentication (via connection string
- * authMechanism=MONGODB-AWS) - Custom SSL/TLS certificates from TRUSTSTORE_* environment variables
- * - Read preference: secondary (configurable) - Write concern: majority (configurable) - Connection
- * pooling - Graceful shutdown
- *
- * <p>Connection string format for AWS IAM auth:
- * mongodb://host:port/database?authMechanism=MONGODB-AWS&authSource=$external
- */
 @Configuration
 @EnableMongoAuditing
 @Slf4j
@@ -55,27 +46,29 @@ MongoClientSettings mongoClientSettings(
       @Value("${spring.data.mongodb.read-preference}") ReadPreference readPreference,
       @Value("${spring.data.mongodb.write-concern}") WriteConcern writeConcern,
       TrustStoreConfiguration trustStoreConfiguration,
-      ConnectionPoolSettings connectionPoolSettings) {
+      ConnectionPoolSettings connectionPoolSettings,
+      MongoCommandMetrics mongoCommandMetrics,
+      MongoAvailability mongoAvailability) {
+
+    MongoClientSettings.Builder builder = MongoClientSettings.builder()
+        .applyConnectionString(new ConnectionString(mongoUri))
+        .applyToConnectionPoolSettings(bdr -> bdr.applySettings(connectionPoolSettings))
+        .applyToClusterSettings(bdr -> bdr.addClusterListener(mongoAvailability))
+        .addCommandListener(mongoCommandMetrics)
+        .readPreference(readPreference)
+        .writeConcern(writeConcern);
+
+    if (sslEnabled) {
+      SSLContext sslContext = trustStoreConfiguration.customSslContext();
+      builder.applyToSslSettings(bdr -> bdr.context(sslContext));
+      log.info("MongoDB TLS configured from the TRUSTSTORE_* certificates");
+    }
 
-      MongoClientSettings.Builder builder = MongoClientSettings.builder()
-          .applyConnectionString(new ConnectionString(mongoUri))
-          .applyToConnectionPoolSettings(bdr -> bdr.applySettings(connectionPoolSettings))
-          .readPreference(readPreference)
-          .writeConcern(writeConcern);
-      
-      if (sslEnabled) {
-          SSLContext sslContext = trustStoreConfiguration.customSslContext();
-          builder.applyToSslSettings(bdr -> bdr.context(sslContext));
-          log.info("MongoDB SSL configured with SSL Bundle");
-      }
-      log.info("MongoDB client configuration complete");
-      
     return builder.build();
   }
 
   @Bean
   MongoClient mongoClient(MongoClientSettings mongoClientSettings) {
-      log.info("Creating MongoDB client");
     return MongoClients.create(mongoClientSettings);
   }
 }
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.configuration;
    2  
    3  import com.mongodb.ConnectionString;
    4  import com.mongodb.MongoClientSettings;
    5  import com.mongodb.ReadPreference;
    6  import com.mongodb.WriteConcern;
    7  import com.mongodb.client.MongoClient;
    8  import com.mongodb.client.MongoClients;
    9  import com.mongodb.connection.ConnectionPoolSettings;
   10  import lombok.extern.slf4j.Slf4j;
   11  import org.springframework.beans.factory.annotation.Value;
   12  import org.springframework.context.annotation.Bean;
   13  import org.springframework.context.annotation.Configuration;
   14  import org.springframework.data.mongodb.config.EnableMongoAuditing;
   15  import javax.net.ssl.SSLContext;
   16  import java.util.concurrent.TimeUnit;
   17  import uk.gov.defra.trade.imports.addressbook.configuration.tls.TrustStoreConfiguration;
   18  import uk.gov.defra.trade.imports.addressbook.metrics.MongoAvailability;
   19  import uk.gov.defra.trade.imports.addressbook.metrics.MongoCommandMetrics;
   20  
   21  @Configuration
   22  @EnableMongoAuditing
   23  @Slf4j
   24  public class MongoConfig {
   25  
   26    @Bean
   27    ConnectionPoolSettings connectionPoolSettings(
   28        @Value("${spring.data.mongodb.connection-pool.min-size}") int minPoolSize,
   29        @Value("${spring.data.mongodb.connection-pool.max-size}") int maxPoolSize,
   30        @Value("${spring.data.mongodb.connection-pool.max-wait-time-ms}") int maxWaitTimeMs,
   31        @Value("${spring.data.mongodb.connection-pool.max-connection-idle-time-ms}")
   32            int maxIdleTimeMs) {
   33  
   34      return ConnectionPoolSettings.builder()
   35          .minSize(minPoolSize)
   36          .maxSize(maxPoolSize)
   37          .maxWaitTime(maxWaitTimeMs, TimeUnit.MILLISECONDS)
   38          .maxConnectionIdleTime(maxIdleTimeMs, TimeUnit.MILLISECONDS)
   39          .build();
   40    }
   41  
   42    @Bean
   43    MongoClientSettings mongoClientSettings(
   44        @Value("${spring.data.mongodb.ssl.enabled}") boolean sslEnabled,
   45        @Value("${spring.data.mongodb.uri}") String mongoUri,
   46        @Value("${spring.data.mongodb.read-preference}") ReadPreference readPreference,
   47        @Value("${spring.data.mongodb.write-concern}") WriteConcern writeConcern,
   48        TrustStoreConfiguration trustStoreConfiguration,
   49        ConnectionPoolSettings connectionPoolSettings,
   50        MongoCommandMetrics mongoCommandMetrics,
   51        MongoAvailability mongoAvailability) {
   52  
   53      MongoClientSettings.Builder builder = MongoClientSettings.builder()
   54          .applyConnectionString(new ConnectionString(mongoUri))
   55          .applyToConnectionPoolSettings(bdr -> bdr.applySettings(connectionPoolSettings))
   56          .applyToClusterSettings(bdr -> bdr.addClusterListener(mongoAvailability))
   57          .addCommandListener(mongoCommandMetrics)
   58          .readPreference(readPreference)
   59          .writeConcern(writeConcern);
   60  
   61      if (sslEnabled) {
   62        SSLContext sslContext = trustStoreConfiguration.customSslContext();
   63        builder.applyToSslSettings(bdr -> bdr.context(sslContext));
   64        log.info("MongoDB TLS configured from the TRUSTSTORE_* certificates");
   65      }
   66  
   67      return builder.build();
   68    }
   69  
   70    @Bean
   71    MongoClient mongoClient(MongoClientSettings mongoClientSettings) {
   72      return MongoClients.create(mongoClientSettings);
   73    }
   74  }
```

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/GlobalExceptionHandler.java`

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

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/NotFoundException.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/NotFoundException.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/NotFoundException.java
index c8d564a..dc811fe 100644
--- a/src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/NotFoundException.java
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/exceptions/NotFoundException.java
@@ -1,12 +1,49 @@
 package uk.gov.defra.trade.imports.addressbook.exceptions;
 
 /**
- * Exception thrown when a requested resource is not found.
- * Will be mapped to 404 Not Found by GlobalExceptionHandler.
+ * An address the caller may not see: an unknown id, another organisation's id, or a path {@code
+ * orgId} that disagrees with the caller's organisation. Every case shows the caller the same
+ * {@link #detail()}; the message names the case and its ids.
  */
 public class NotFoundException extends RuntimeException {
 
-    public NotFoundException(String message) {
-        super(message);
-    }
+  private NotFoundException(String message) {
+    super(message);
+  }
+
+  /**
+   * An address id with no address the caller's organisation may use.
+   *
+   * @param addressId the requested address id
+   * @param organisationId the caller's organisation id
+   * @return the exception, its message naming both ids
+   */
+  public static NotFoundException addressNotFound(String addressId, String organisationId) {
+    return new NotFoundException(
+        "Address " + addressId + " not found in organisation " + organisationId);
+  }
+
+  /**
+   * A path {@code orgId} that disagrees with the caller's organisation id.
+   *
+   * @param orgId the organisation id from the path
+   * @param organisationId the caller's organisation id, from the identity header
+   * @return the exception, its message naming both organisation ids
+   */
+  public static NotFoundException organisationMismatch(String orgId, String organisationId) {
+    return new NotFoundException(
+        "Organisation mismatch: path orgId "
+            + orgId
+            + " is not the caller's organisation "
+            + organisationId);
+  }
+
+  /**
+   * The text shown to the caller, the same for every case.
+   *
+   * @return the caller-facing detail
+   */
+  public String detail() {
+    return "Address not found";
+  }
 }
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.exceptions;
    2  
    3  /**
    4   * An address the caller may not see: an unknown id, another organisation's id, or a path {@code
    5   * orgId} that disagrees with the caller's organisation. Every case shows the caller the same
    6   * {@link #detail()}; the message names the case and its ids.
    7   */
    8  public class NotFoundException extends RuntimeException {
    9  
   10    private NotFoundException(String message) {
   11      super(message);
   12    }
   13  
   14    /**
   15     * An address id with no address the caller's organisation may use.
   16     *
   17     * @param addressId the requested address id
   18     * @param organisationId the caller's organisation id
   19     * @return the exception, its message naming both ids
   20     */
   21    public static NotFoundException addressNotFound(String addressId, String organisationId) {
   22      return new NotFoundException(
   23          "Address " + addressId + " not found in organisation " + organisationId);
   24    }
   25  
   26    /**
   27     * A path {@code orgId} that disagrees with the caller's organisation id.
   28     *
   29     * @param orgId the organisation id from the path
   30     * @param organisationId the caller's organisation id, from the identity header
   31     * @return the exception, its message naming both organisation ids
   32     */
   33    public static NotFoundException organisationMismatch(String orgId, String organisationId) {
   34      return new NotFoundException(
   35          "Organisation mismatch: path orgId "
   36              + orgId
   37              + " is not the caller's organisation "
   38              + organisationId);
   39    }
   40  
   41    /**
   42     * The text shown to the caller, the same for every case.
   43     *
   44     * @return the caller-facing detail
   45     */
   46    public String detail() {
   47      return "Address not found";
   48    }
   49  }
```

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/filter/IdentityHeaderFilter.java`

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

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/logging/EcsEventEncoder.java`

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

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/AddressMetrics.java`

### Diff

```diff
diff --git a/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/AddressMetrics.java b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/AddressMetrics.java
new file mode 100644
index 0000000..c8ce183
--- /dev/null
+++ b/src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/AddressMetrics.java
@@ -0,0 +1,34 @@
+package uk.gov.defra.trade.imports.addressbook.metrics;
+
+import io.micrometer.core.instrument.Counter;
+import io.micrometer.core.instrument.MeterRegistry;
+import java.util.Locale;
+import lombok.RequiredArgsConstructor;
+import org.springframework.stereotype.Component;
+
+/** Counts changes to addresses as {@code address.change}, tagged {@code change}. */
+@Component
+@RequiredArgsConstructor
+public class AddressMetrics {
+
+  /** A change made to an address. */
+  public enum Change {
+    CREATE,
+    UPDATE,
+    DELETE
+  }
+
+  private final MeterRegistry meterRegistry;
+
+  /**
+   * Counts one change.
+   *
+   * @param change the change made
+   */
+  public void countChange(Change change) {
+    Counter.builder("address.change")
+        .tag("change", change.name().toLowerCase(Locale.ROOT))
+        .register(meterRegistry)
+        .increment();
+  }
+}
```

### File at the reviewed commit, with line numbers

```java
    1  package uk.gov.defra.trade.imports.addressbook.metrics;
    2  
    3  import io.micrometer.core.instrument.Counter;
    4  import io.micrometer.core.instrument.MeterRegistry;
    5  import java.util.Locale;
    6  import lombok.RequiredArgsConstructor;
    7  import org.springframework.stereotype.Component;
    8  
    9  /** Counts changes to addresses as {@code address.change}, tagged {@code change}. */
   10  @Component
   11  @RequiredArgsConstructor
   12  public class AddressMetrics {
   13  
   14    /** A change made to an address. */
   15    public enum Change {
   16      CREATE,
   17      UPDATE,
   18      DELETE
   19    }
   20  
   21    private final MeterRegistry meterRegistry;
   22  
   23    /**
   24     * Counts one change.
   25     *
   26     * @param change the change made
   27     */
   28    public void countChange(Change change) {
   29      Counter.builder("address.change")
   30          .tag("change", change.name().toLowerCase(Locale.ROOT))
   31          .register(meterRegistry)
   32          .increment();
   33    }
   34  }
```

## File: `src/main/java/uk/gov/defra/trade/imports/addressbook/metrics/DependencyAvailabilityMetrics.java`

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

### Source: `docs/best-practices/rest-api/rest-api.md`

# REST API Design

Based on [Zalando RESTful API Guidelines](https://opensource.zalando.com/restful-api-guidelines/).

## Core Principles

**API First:** Define APIs before implementation using OpenAPI
**API as Product:** Treat APIs as products with ownership
**Robustness (Postel's Law):** Liberal in acceptance, conservative in sending

## URL Design

### Path Structure
Use kebab-case: `^[a-z][a-z\-0-9]*$`

```
GET /sales-orders
GET /sales-orders/{order-id}
GET /sales-orders/{order-id}/items
```

### Resource Naming
| Do | Don't |
|----|-------|
| /customers | /customer |
| /sales-orders | /salesOrders |
| /order-items | /order_items |

- Plural nouns for collections
- Meaningful business names
- Verb-free URLs (use HTTP methods)
- Max 3 sub-resource levels

### Query Parameters
Use snake_case: `?sort=-created_at&limit=20&fields=id,name`

| Parameter | Purpose |
|-----------|---------|
| q | Default search |
| sort | Sort with +/- prefix |
| fields | Partial response |
| embed | Sub-entity expansion |
| offset/limit | Pagination |
| cursor | Cursor pagination |

## HTTP Methods

| Method | Purpose | Safe | Idempotent | Body |
|--------|---------|------|------------|------|
| GET | Read | Yes | Yes | Forbidden |
| POST | Create | No | Consider | Required |
| PUT | Replace | No | Yes | Required |
| PATCH | Partial update | No | Consider | Required |
| DELETE | Remove | No | Yes | Rare |

### Idempotency Patterns
1. **ETag + If-Match:** Prevents concurrent updates
2. **Secondary Key:** Resource-specific unique key
3. **Idempotency-Key Header:** Client-provided retry key

## Status Codes

### Success (2xx)
| Code | Usage |
|------|-------|
| 200 OK | General success |
| 201 Created | Resource created (+ Location) |
| 202 Accepted | Async started |
| 204 No Content | Success, no body |

### Client Errors (4xx)
| Code | Usage |
|------|-------|
| 400 Bad Request | Invalid input |
| 401 Unauthorized | Missing/invalid credentials |
| 403 Forbidden | Insufficient permissions |
| 404 Not Found | Resource missing |
| 409 Conflict | State conflict |
| 429 Too Many Requests | Rate limited |

### Server Errors (5xx)
| Code | Usage |
|------|-------|
| 500 Internal Error | Unexpected error |
| 503 Unavailable | Temporary down |

### Error Response (RFC 9457)
```json
{
  "type": "/problems/out-of-stock",
  "title": "Product out of stock",
  "detail": "Product 123 unavailable",
  "instance": "/orders/456"
}
```
Never expose stack traces.

## JSON Payload

### Property Naming
Use snake_case:
```json
{
  "order_id": "abc123",
  "created_at": "2024-01-15T10:30:00Z",
  "line_items": []
}
```

### Null Handling
- Treat null and absent identically
- Never null for booleans (use enums)
- Empty array `[]` instead of null

### Common Fields
| Field | Purpose |
|-------|---------|
| id | Opaque string identifier |
| xyz_id | Reference to another resource |
| etag | Version for optimistic locking |
| created_at | Creation timestamp |
| modified_at | Last modification |

### Response Structure
Always use objects as top-level, never bare arrays:
```json
{ "items": [...], "cursor": "abc" }
```

### Enumerations
Use UPPER_SNAKE_CASE: `"status": "IN_PROGRESS"`

## Data Formats

### Numbers
| Type | Format | Usage |
|------|--------|-------|
| integer | int32/int64 | Standard integers |
| number | decimal | Money (never float/double) |

### Dates (RFC 3339 / ISO 8601)
| Format | Example |
|--------|---------|
| date | 2024-01-15 |
| date-time | 2024-01-15T10:30:00Z |

Use uppercase T and Z. Prefer UTC.

### Standard Codes
| Data | Format | Example |
|------|--------|---------|
| Country | ISO 3166-1 alpha-2 | GB |
| Language | ISO 639-1 | en |
| Currency | ISO 4217 | GBP |

### Money
```json
{ "amount": "99.99", "currency": "GBP" }
```

## Pagination

### Cursor-Based (Recommended)
```json
{
  "items": [...],
  "self": "...?cursor=abc",
  "next": "...?cursor=def"
}
```
Efficient, stable with concurrent modifications.

### Offset-Based
`GET /orders?offset=20&limit=10`
Simpler but less robust for large datasets.

## Backward Compatibility

### Non-Breaking (Allowed)
- Adding optional properties
- Making mandatory fields optional
- Extending extensible enums

### Breaking (Avoid)
- Removing required fields
- Changing field types
- Adding required fields
- Changing defaults

### Versioning
**Preferred:** Evolve without versioning
**If required:** Media type: `Accept: application/vnd.example+json;version=2`
**Forbidden:** URL versioning `/v1/resources`

## Quick Reference

### Do
- Define APIs before implementation
- kebab-case for paths
- snake_case for properties/params
- UPPER_SNAKE_CASE for enums
- Problem JSON for errors
- Make POST/PATCH idempotent
- Cursor pagination for large datasets

### Don't
- Request body in GET
- camelCase in JSON
- Bare arrays as top-level
- null for empty collections
- float/double for money
- Version numbers in URLs
- Break existing consumers
- Expose stack traces

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

### Source: `docs/best-practices/java/openapi-springdoc.md`

# OpenAPI / SpringDoc — Best Practices

Project baseline: `springdoc-openapi-starter-webmvc-ui` v2.6.0, Spring Boot 3.5, Spring MVC.

---

## 1. Maven dependency

```xml
<dependency>
    <groupId>org.springdoc</groupId>
    <artifactId>springdoc-openapi-starter-webmvc-ui</artifactId>
    <version>2.6.0</version>
</dependency>
```

Use `springdoc-openapi-starter-webmvc-ui` for Spring MVC (not WebFlux). The `starter` variant includes the Swagger UI.

**Critical: `-parameters` compiler flag**

Add to Maven compiler plugin so parameter names are available for SpringDoc to pick up:

```xml
<plugin>
    <groupId>org.apache.maven.plugins</groupId>
    <artifactId>maven-compiler-plugin</artifactId>
    <configuration>
        <parameters>true</parameters>
    </configuration>
</plugin>
```

Without this, `@RequestParam` names won't be inferred automatically.

---

## 2. What SpringDoc generates automatically

SpringDoc scans your `@RestController` classes and generates OpenAPI 3.0 spec automatically for:

| Auto-generated | From |
|---------------|------|
| Path and method | `@GetMapping`, `@PostMapping`, etc. |
| Path parameters | `@PathVariable` |
| Query parameters | `@RequestParam` |
| Request body schema | `@RequestBody` + DTO fields |
| Response body schema | Method return type |
| HTTP 200 response | Default when no `@ApiResponse` present |
| Bean validation constraints | `@NotNull`, `@Size`, `@Pattern` etc. on DTO fields |

You must **add annotations** for:
- Meaningful summaries and descriptions
- Non-200 response codes and their schemas
- Security requirements
- Hiding internal fields
- Enum documentation
- Example values

---

## 3. Swagger UI and API docs URLs

| URL | Content |
|-----|---------|
| `/swagger-ui.html` | Swagger UI (HTML) |
| `/swagger-ui/index.html` | Alternate Swagger UI path |
| `/v3/api-docs` | OpenAPI JSON |
| `/v3/api-docs.yaml` | OpenAPI YAML |

Configure in `application.yml`:

```yaml
springdoc:
  api-docs:
    path: /v3/api-docs
    enabled: true
  swagger-ui:
    path: /swagger-ui.html
    enabled: true
    operations-sorter: method
    tags-sorter: alpha
  packages-to-scan: uk.gov.defra.tradeimportsanimals
  paths-to-match: /notifications/**, /admin/**
```

Disable in production if internal API:
```yaml
springdoc:
  api-docs:
    enabled: false
  swagger-ui:
    enabled: false
```

---

## 4. OpenAPI global info and security scheme

Define globally using `@OpenAPIDefinition` on a `@Configuration` class:

```java
@Configuration
@OpenAPIDefinition(
    info = @Info(
        title = "Trade Imports API",
        version = "1.0.0",
        description = "REST API for managing import notifications",
        contact = @Contact(
            name = "DEFRA Trade Imports Team",
            email = "trade-imports@defra.gov.uk"
        )
    ),
    security = @SecurityRequirement(name = "bearerAuth")
)
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .components(new Components()
                        .addSecuritySchemes("bearerAuth",
                                new SecurityScheme()
                                        .name("bearerAuth")
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("JWT token from Defra ID")));
    }
}
```

This makes every endpoint require bearer auth by default. Override per-endpoint with `@SecurityRequirement` (see section 8).

---

## 5. Controller annotations

### `@Tag`

Groups endpoints in Swagger UI:

```java
@Tag(name = "Notifications", description = "Create, retrieve and delete import notifications")
@RestController
@RequestMapping("/notifications")
public class NotificationController { ... }
```

### `@Operation`

Documents a single endpoint:

```java
@Operation(
    summary = "Get notification by reference number",
    description = "Returns the full notification for the given reference number. "
            + "Returns 404 if not found.",
    operationId = "getNotificationByReferenceNumber"
)
@GetMapping("/{referenceNumber}")
public NotificationDto getByReferenceNumber(@PathVariable String referenceNumber) { ... }
```

| Property | Purpose |
|---------|---------|
| `summary` | Short description (shown in collapsed view) |
| `description` | Full description (shown when expanded) |
| `operationId` | Unique ID used in generated clients |
| `deprecated` | Mark as deprecated |
| `hidden` | Exclude from spec entirely |

### `@ApiResponse` / `@ApiResponses`

```java
@ApiResponses({
    @ApiResponse(responseCode = "200", description = "Notification found",
            content = @Content(schema = @Schema(implementation = NotificationDto.class))),
    @ApiResponse(responseCode = "404", description = "Notification not found",
            content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
    @ApiResponse(responseCode = "401", description = "Unauthorised",
            content = @Content)
})
@GetMapping("/{referenceNumber}")
public NotificationDto getByReferenceNumber(@PathVariable String referenceNumber) { ... }
```

Use `content = @Content` (no schema) for responses with no body (e.g. 204, 401).

### `@Parameter`

```java
@GetMapping("/{referenceNumber}")
public NotificationDto getByReferenceNumber(
        @Parameter(description = "The notification reference number, e.g. DRAFT.IMP.2026.123",
                   required = true,
                   example = "DRAFT.IMP.2026.123")
        @PathVariable String referenceNumber) { ... }
```

| Property | Purpose |
|---------|---------|
| `description` | Human-readable description |
| `required` | Defaults to false for query params |
| `example` | Example value shown in Swagger UI |
| `schema` | Override inferred schema |
| `hidden` | Exclude from spec |
| `in` | Override param location (PATH, QUERY, HEADER, COOKIE) |

### `@RequestBody` (OpenAPI annotation)

Note: there are two `@RequestBody` annotations — `org.springframework.web.bind.annotation.RequestBody` (Spring, required for binding) and `io.swagger.v3.oas.annotations.parameters.RequestBody` (OpenAPI, optional documentation). Both can be used together:

```java
@PostMapping
public NotificationDto save(
        @io.swagger.v3.oas.annotations.parameters.RequestBody(
                description = "Notification data to save",
                required = true,
                content = @Content(schema = @Schema(implementation = NotificationRequest.class)))
        @org.springframework.web.bind.annotation.RequestBody
        @Valid NotificationRequest request,
        @RequestHeader HttpHeaders headers) { ... }
```

Usually SpringDoc infers the request body schema from the Spring `@RequestBody` type — the OpenAPI annotation is only needed for extra description.

---

## 6. DTO / schema annotations

### Project rules — non-negotiable defaults

The OpenAPI document is part of the API contract. Apply these on every public DTO without exception.

1. **Every public class, record, and enum constant carries a `@Schema(description = "...")`.** Undocumented fields are a defect, not stylistic noise — generated client SDKs and consumer-facing docs both surface the description.
2. **`requiredMode = Schema.RequiredMode.REQUIRED` on every non-nullable field.** The default is auto-detected and varies across SpringDoc versions: a field that's "required" in one version becomes "optional" in another, breaking generated clients silently. Be explicit.
3. **`@Schema` on a field with a Bean Validation annotation (`@NotNull`, `@Pattern`, etc.) must agree with it.** If `@NotNull` says required, `@Schema` must say `requiredMode = REQUIRED`. Mismatch == lying contract.

```java
@Schema(description = "Response from initiating a document upload")
public record DocumentUploadResponse(

    @Schema(description = "Upload session identifier",
            requiredMode = Schema.RequiredMode.REQUIRED,
            example = "upload-abc-123")
    String uploadId,

    @Schema(description = "URL the client should POST the file to",
            requiredMode = Schema.RequiredMode.REQUIRED,
            example = "https://cdp-uploader.example/upload-and-scan/upload-abc-123")
    String uploadUrl
) {}
```

### Standard `@Schema` shape

`@Schema` on classes and fields:

```java
@Schema(description = "An import notification")
public record NotificationDto(

    @Schema(description = "Unique MongoDB document ID", example = "507f1f77bcf86cd799439011",
            accessMode = Schema.AccessMode.READ_ONLY)
    String id,

    @Schema(description = "System-assigned reference number", example = "DRAFT.IMP.2026.123",
            requiredMode = Schema.RequiredMode.REQUIRED,
            accessMode = Schema.AccessMode.READ_ONLY)
    String referenceNumber,

    @Schema(description = "Origin country details",
            requiredMode = Schema.RequiredMode.REQUIRED)
    @NotNull
    Origin origin,

    @Schema(description = "Current status of the notification",
            requiredMode = Schema.RequiredMode.REQUIRED)
    NotificationStatus status,

    @Schema(hidden = true)  // Exclude from API docs
    String internalField
) {}
```

`@Schema` on fields:

| Property | Purpose |
|---------|---------|
| `description` | Human-readable description |
| `example` | Example value |
| `required` | Mark as required (use with `@NotNull`) |
| `hidden` | Exclude field from schema |
| `accessMode` | `READ_ONLY`, `WRITE_ONLY`, `READ_WRITE` |
| `format` | Override format (e.g. `date`, `uuid`) |
| `minimum` / `maximum` | Numeric bounds |
| `pattern` | Regex pattern |
| `deprecated` | Mark as deprecated |

Enum documentation — SpringDoc uses the enum's `toString()` by default. To add descriptions:

```java
@Schema(description = "Notification status")
public enum NotificationStatus {
    @Schema(description = "Draft — not yet submitted")
    DRAFT,
    @Schema(description = "Submitted — awaiting processing")
    SUBMITTED,
    @Schema(description = "Approved")
    APPROVED
}
```

---

## 7. Documenting ProblemDetail / RFC 7807 error responses

Use `application/problem+json` media type for error responses:

```java
@ApiResponse(
    responseCode = "400",
    description = "Validation failed",
    content = @Content(
        mediaType = "application/problem+json",
        schema = @Schema(implementation = ProblemDetail.class),
        examples = @ExampleObject(value = """
            {
              "type": "/problems/validation-error",
              "title": "Bad Request",
              "status": 400,
              "detail": "Validation failed",
              "errors": {
                "referenceNumber": "must not be blank"
              },
              "traceId": "abc-123"
            }
            """)
    )
)
```

---

## 8. Security — per-endpoint overrides

All endpoints inherit the global `@SecurityRequirement(name = "bearerAuth")`. Override for specific endpoints:

```java
// Remove security from public health endpoint
@Operation(security = {})
@GetMapping("/health")
public String health() { return "OK"; }

// Add additional security scheme
@Operation(security = {
    @SecurityRequirement(name = "bearerAuth"),
    @SecurityRequirement(name = "adminSecret")
})
@DeleteMapping
public void deleteAll(...) { ... }
```

---

## 9. Grouping with `GroupedOpenApi`

Split the API into multiple Swagger UI groups:

```java
@Configuration
public class OpenApiGroupConfig {

    @Bean
    public GroupedOpenApi notificationsApi() {
        return GroupedOpenApi.builder()
                .group("notifications")
                .displayName("Notifications API")
                .pathsToMatch("/notifications/**")
                .build();
    }

    @Bean
    public GroupedOpenApi adminApi() {
        return GroupedOpenApi.builder()
                .group("admin")
                .displayName("Admin API")
                .pathsToMatch("/admin/**")
                .build();
    }
}
```

Groups appear in the Swagger UI "definition" dropdown.

---

## 10. Customisation

Add custom behaviour to every operation:

```java
@Component
public class TraceIdOperationCustomizer implements OperationCustomizer {

    @Override
    public Operation customize(Operation operation, HandlerMethod handlerMethod) {
        // Add x-cdp-request-id header to all operations
        operation.addParametersItem(new Parameter()
                .name("x-cdp-request-id")
                .in("header")
                .description("Request trace ID for CDP observability")
                .required(false)
                .schema(new StringSchema()));
        return operation;
    }
}
```

Modify the global OpenAPI object:

```java
@Component
public class ServerOpenApiCustomizer implements OpenApiCustomizer {

    @Override
    public void customise(OpenAPI openApi) {
        openApi.addServersItem(new Server()
                .url("https://api.trade-imports.defra.gov.uk")
                .description("Production"));
        openApi.addServersItem(new Server()
                .url("http://localhost:8085")
                .description("Local development"));
    }
}
```

---

## 11. Common mistakes

**1. Spring vs OpenAPI `@RequestBody` confusion**

```java
// Wrong — using OpenAPI annotation instead of Spring for binding
@PostMapping
public Dto save(@io.swagger.v3.oas.annotations.parameters.RequestBody NotificationRequest req) {
    // req is null — Spring never bound it
}

// Correct — always use Spring annotation for binding, OpenAPI annotation is optional
@PostMapping
public Dto save(@org.springframework.web.bind.annotation.RequestBody @Valid NotificationRequest req) { }
```

**2. `@ApiResponse` content type mismatch for errors**

```java
// Wrong — uses application/json for error responses (should be problem+json)
@ApiResponse(responseCode = "404", content = @Content(
    schema = @Schema(implementation = ErrorDto.class)))

// Correct
@ApiResponse(responseCode = "404", content = @Content(
    mediaType = "application/problem+json",
    schema = @Schema(implementation = ProblemDetail.class)))
```

**3. Over-annotating what SpringDoc already infers**

```java
// Wrong — redundant, SpringDoc infers this
@Parameter(name = "referenceNumber", in = ParameterIn.PATH, required = true)
@PathVariable String referenceNumber

// Correct — only add what adds value (description, example)
@Parameter(description = "Notification reference number", example = "DRAFT.IMP.2026.123")
@PathVariable String referenceNumber
```

**4. Forgetting `content = @Content` on no-body responses**

```java
// Wrong — generates a spurious empty schema
@ApiResponse(responseCode = "204", description = "Deleted")

// Correct
@ApiResponse(responseCode = "204", description = "Deleted", content = @Content)
```

**5. Not disabling Swagger UI in production**

Set `springdoc.swagger-ui.enabled=false` and `springdoc.api-docs.enabled=false` in `application-prod.yml` if the API is internal.

**6. Describing behaviour that doesn't match the code**

`@ApiResponse(responseCode = "200")` when the method returns `ResponseEntity.status(201)`. Keep annotations in sync with actual responses.

---

## 12. How this project uses SpringDoc

Current state in `trade-imports-animals-backend`:
- `springdoc-openapi-starter-webmvc-ui` v2.6.0 in `pom.xml`
- `@Tag` on `NotificationController`
- `@Operation` on individual endpoints
- `@Schema` on `NotificationDto`, `Notification`, `Origin`
- No `@ApiResponse` annotations — SpringDoc generates only the 200 response
- No global `@OpenAPIDefinition` — info block is default

Gaps to address:
- Add `@ApiResponse` for 404, 400, 401 on all endpoints
- Add `@OpenAPIDefinition` with project info and JWT `SecurityScheme`
- Add `@SecurityRequirement` globally
- Document `ProblemDetail` error schema
- Add `example` values to `@Schema` on key DTO fields
- Disable Swagger UI in deployed environments via profile