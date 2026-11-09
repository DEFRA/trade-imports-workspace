# Review brief: infra

This brief is 843 lines. Read it with Read from line 1 to line 843, in
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

## Reviewing configuration, build and infrastructure files

You may read only this brief. Whether a new dependency is used is the
consistency reviewer's check.

- **Config** (`application*.yml`, `.env`, `config.js`, JSON and YAML):
  new keys are correct and have safe defaults; no secret, token or
  password is committed; a value that differs per environment is not
  hard-coded. Do not flag missing comments.
- **Dependencies** (`package.json`, `pom.xml`): versions pinned the way
  the repo pins them; nothing added that the change does not need.
- **Removed entries:** list every line the diff removes from
  `overrides`, `resolutions`, `dependencyManagement`, an audit allowlist
  or a security setting. For each one, find in the brief why removing it
  is safe: the dependency is gone, or its new version already has the
  fix. When the brief does not show that, it is a finding. Removing an
  override that pinned a patched version is `security`, at least Major.
  The consistency reviewer checks whether a dependency is used, but that
  does not cover these removals: they are yours.
- **Dockerfiles and compose files:** follow the docker-compose guide when
  it is in this brief.
- **GitHub Actions workflows:** follow the github-actions guide when it is
  in this brief: pinned action versions, least-privilege permissions, no
  secrets echoed.
- **Shell scripts:** follow the shell guide when it is in this brief. This
  workspace runs on macOS, so BSD `sed` and `grep` rules apply.

## Your group

- Review id: EUDPA-674
- Group: trade-imports-address-book--infra--1
- Repo: trade-imports-address-book
- PR: 22
- Commit reviewed: 491f0276ddc5772d9171a926337fbab7a1f771b3
- Repo checkout: /Users/aminav/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-674/repos/trade-imports-address-book
- Files:
  - `src/main/resources/application.yml`
  - `src/main/resources/logback-spring.xml`
  - `src/test/resources/application-integration-test.yml`

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

## File: `src/main/resources/application.yml`

### Diff

```diff
diff --git a/src/main/resources/application.yml b/src/main/resources/application.yml
index fe0c538..f6ee259 100644
--- a/src/main/resources/application.yml
+++ b/src/main/resources/application.yml
@@ -23,9 +23,6 @@ spring:
     timeout-per-shutdown-phase: 30s
 
 
-# Automatic expiry of addresses in non-prod environments. Defaults here are the prod-safe values:
-# days unset (no expireAt stamped) and expiry disabled (no TTL index). Non-prod environments opt in
-# via ADDRESS_TTL_DAYS and ADDRESS_TTL_EXPIRY_ENABLED.
 address-book:
   ttl:
     days: ${ADDRESS_TTL_DAYS:}
@@ -50,11 +47,9 @@ aws:
   region: ${AWS_REGION:eu-west-2}
   emf:
     enabled: ${AWS_EMF_ENABLED:true}
-    environment: ${AWS_EMF_ENVIRONMENT:Local}
+    environment: ${AWS_EMF_ENVIRONMENT:}
     namespace: ${AWS_EMF_NAMESPACE:trade-imports-address-book}
-    service:
-      name: ${AWS_EMF_SERVICE_NAME:trade-imports-address-book}
-      type: ${AWS_EMF_SERVICE_TYPE:SpringBootApp}
+    step: ${AWS_EMF_STEP:1m}
 
 # Logging configuration
 logging:
@@ -68,9 +63,6 @@ logging:
     sun.rmi: WARN
     javax.management.remote.rmi: WARN
 
-# Actuator endpoints
-# Production: Only health endpoint exposed (secure by default)
-# Development: Use dev profile (application-local.yml) for debugging endpoints
 management:
   endpoints:
     web:
@@ -91,6 +83,15 @@ management:
     enable:
       all: false
       controller: true
+      service: true
+      external:
+        call:
+          duration: true
+          failure: true
+        dependency:
+          available: true
+      address:
+        change: true
       jvm:
         memory:
           committed: true
@@ -99,10 +100,6 @@ management:
         threads:
           live: true
           peak: true
-      http:
-        server:
-          requests:
-            active: true
 
 # Application info (exposed via /info endpoint)
 info:
```

### File at the reviewed commit, with line numbers

```yaml
    1  server:
    2    port: ${PORT:8089}
    3    shutdown: graceful
    4  
    5  spring:
    6    application:
    7      name: trade-imports-address-book
    8    data:
    9      mongodb:
   10        uri: ${MONGO_URI:mongodb://localhost:27017/}
   11        database: ${MONGO_DATABASE:trade-imports-address-book}
   12        auto-index-creation: true
   13        read-preference: ${MONGO_READ_PREFERENCE:primaryPreferred}
   14        write-concern: ${MONGO_WRITE_CONCERN:majority}
   15        connection-pool:
   16          min-size: ${MONGO_POOL_MIN_SIZE:10}
   17          max-size: ${MONGO_POOL_MAX_SIZE:100}
   18          max-wait-time-ms: ${MONGO_POOL_MAX_WAIT_TIME_MS:2000}
   19          max-connection-idle-time-ms: ${MONGO_POOL_MAX_IDLE_TIME_MS:60000}
   20        ssl:
   21          enabled: true
   22    lifecycle:
   23      timeout-per-shutdown-phase: 30s
   24  
   25  
   26  address-book:
   27    ttl:
   28      days: ${ADDRESS_TTL_DAYS:}
   29      environment: ${ENVIRONMENT:local}
   30      expiry:
   31        enabled: ${ADDRESS_TTL_EXPIRY_ENABLED:false}
   32  
   33  # CDP platform configuration
   34  cdp:
   35    certificate: ${TRUSTSTORE_CDP_ROOT_CA:}
   36    metrics:
   37      enabled: true
   38    service-version: ${SERVICE_VERSION:0.0.0-local}
   39    tracing:
   40      header-name: ${TRACING_HEADER:x-cdp-request-id}
   41    cloudwatch:
   42      endpoint: ${AWS_EMF_AGENT_ENDPOINT:http://localhost:4566}
   43    proxyUrl: ${HTTP_PROXY:}
   44  
   45  # AWS configuration
   46  aws:
   47    region: ${AWS_REGION:eu-west-2}
   48    emf:
   49      enabled: ${AWS_EMF_ENABLED:true}
   50      environment: ${AWS_EMF_ENVIRONMENT:}
   51      namespace: ${AWS_EMF_NAMESPACE:trade-imports-address-book}
   52      step: ${AWS_EMF_STEP:1m}
   53  
   54  # Logging configuration
   55  logging:
   56    level:
   57      root: ${LOG_LEVEL:INFO}
   58      uk.gov.defra.trade.imports.addressbook: ${LOG_LEVEL:INFO}
   59      org.springframework: ${LOGGING_LEVEL_ORG_SPRINGFRAMEWORK:INFO}
   60      org.springframework.web: ${LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_WEB:INFO}
   61      org.mongodb: ${LOGGING_LEVEL_ORG_MONGODB_DRIVER:WARN}
   62      io.netty.handler.logging.LoggingHandler: WARN
   63      sun.rmi: WARN
   64      javax.management.remote.rmi: WARN
   65  
   66  management:
   67    endpoints:
   68      web:
   69        base-path: /
   70        exposure:
   71          include: health,metrics,info,cache
   72    endpoint:
   73      health:
   74        show-details: never
   75    info:
   76      env:
   77        enabled: true
   78    health:
   79      mongo:
   80        enabled: false
   81    metrics:
   82      enabled: ${METRICS_ENABLED:true}
   83      enable:
   84        all: false
   85        controller: true
   86        service: true
   87        external:
   88          call:
   89            duration: true
   90            failure: true
   91          dependency:
   92            available: true
   93        address:
   94          change: true
   95        jvm:
   96          memory:
   97            committed: true
   98            used: true
   99            max: true
  100          threads:
  101            live: true
  102            peak: true
  103  
  104  # Application info (exposed via /info endpoint)
  105  info:
  106    app:
  107      name: ${spring.application.name}
  108      version: ${cdp.service-version}
  109      environment: ${ENVIRONMENT:local}
  110  
  111  springdoc:
  112    api-docs:
  113      enabled: false
  114    swagger-ui:
  115      enabled: false
```

## File: `src/main/resources/logback-spring.xml`

### Diff

```diff
diff --git a/src/main/resources/logback-spring.xml b/src/main/resources/logback-spring.xml
index 5d62b58..4efb3ef 100644
--- a/src/main/resources/logback-spring.xml
+++ b/src/main/resources/logback-spring.xml
@@ -1,34 +1,26 @@
 <?xml version="1.0" encoding="UTF-8"?>
 <configuration>
-    <!-- Import Spring Boot defaults -->
     <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
 
-    <!-- Service version from system property (set by LoggingConfiguration) -->
     <springProperty name="service.version" source="cdp.service-version"/>
     <springProperty name="service.name" source="spring.application.name"/>
 
-    <!-- Console appender with standard ECS JSON format (flat error.* fields) -->
     <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
-        <!-- Filter out /health endpoint to reduce noise -->
         <filter class="uk.gov.defra.trade.imports.addressbook.filter.HealthCheckFilter"/>
 
-        <encoder class="co.elastic.logging.logback.EcsEncoder">
+        <encoder class="uk.gov.defra.trade.imports.addressbook.logging.EcsEventEncoder">
             <serviceVersion>${service.version}</serviceVersion>
             <serviceName>${service.name}</serviceName>
-            <!-- ECS encoder automatically includes all MDC fields -->
         </encoder>
     </appender>
 
-    <!-- Root logger - all logs to console in ECS JSON format -->
     <root level="INFO">
         <appender-ref ref="CONSOLE"/>
     </root>
 
-    <!-- Spring Framework logging -->
     <logger name="org.springframework" level="INFO"/>
     <logger name="org.springframework.web" level="INFO"/>
 
-    <!-- MongoDB driver logging -->
     <logger name="org.mongodb.driver" level="WARN"/>
     <logger name="org.apache.coyote" level="ERROR"/>
 </configuration>
```

### File at the reviewed commit, with line numbers

```xml
    1  <?xml version="1.0" encoding="UTF-8"?>
    2  <configuration>
    3      <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
    4  
    5      <springProperty name="service.version" source="cdp.service-version"/>
    6      <springProperty name="service.name" source="spring.application.name"/>
    7  
    8      <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
    9          <filter class="uk.gov.defra.trade.imports.addressbook.filter.HealthCheckFilter"/>
   10  
   11          <encoder class="uk.gov.defra.trade.imports.addressbook.logging.EcsEventEncoder">
   12              <serviceVersion>${service.version}</serviceVersion>
   13              <serviceName>${service.name}</serviceName>
   14          </encoder>
   15      </appender>
   16  
   17      <root level="INFO">
   18          <appender-ref ref="CONSOLE"/>
   19      </root>
   20  
   21      <logger name="org.springframework" level="INFO"/>
   22      <logger name="org.springframework.web" level="INFO"/>
   23  
   24      <logger name="org.mongodb.driver" level="WARN"/>
   25      <logger name="org.apache.coyote" level="ERROR"/>
   26  </configuration>
```

## File: `src/test/resources/application-integration-test.yml`

### Diff

```diff
diff --git a/src/test/resources/application-integration-test.yml b/src/test/resources/application-integration-test.yml
index ed2217e..f4d4b86 100644
--- a/src/test/resources/application-integration-test.yml
+++ b/src/test/resources/application-integration-test.yml
@@ -35,11 +35,7 @@ aws:
   region: ${AWS_REGION:eu-west-2}
   emf:
     enabled: ${AWS_EMF_ENABLED:false}
-    environment: ${AWS_EMF_ENVIRONMENT:Local}
     namespace: ${AWS_EMF_NAMESPACE:}
-    service:
-      name: ${AWS_EMF_SERVICE_NAME:trade-imports-address-book}
-      type: ${AWS_EMF_SERVICE_TYPE:SpringBootApp}
 
 # Logging configuration
 logging:
```

### File at the reviewed commit, with line numbers

```yaml
    1  server:
    2    port: ${PORT:8089}
    3    shutdown: graceful
    4  
    5  spring:
    6    application:
    7      name: trade-imports-address-book
    8    data:
    9      mongodb:
   10        uri: ${MONGO_URI:mongodb://localhost:27017}
   11        database: ${MONGO_DATABASE:trade-imports-address-book}
   12        auto-index-creation: true
   13        write-concern: ${MONGO_WRITE_CONCERN:majority}
   14        connection-pool:
   15          min-size: ${MONGO_POOL_MIN_SIZE:10}
   16          max-size: ${MONGO_POOL_MAX_SIZE:100}
   17          max-wait-time-ms: ${MONGO_POOL_MAX_WAIT_TIME_MS:2000}
   18          max-connection-idle-time-ms: ${MONGO_POOL_MAX_IDLE_TIME_MS:60000}
   19        ssl:
   20          enabled: false
   21    lifecycle:
   22      timeout-per-shutdown-phase: 30s
   23  
   24  # CDP platform configuration
   25  cdp:
   26    environment: ${ENVIRONMENT:local}
   27    service-version: ${SERVICE_VERSION:0.0.0-local}
   28    tracing:
   29      header-name: ${TRACING_HEADER:x-cdp-request-id}
   30    proxy:
   31      url: ${HTTP_PROXY:}
   32  
   33  # AWS configuration
   34  aws:
   35    region: ${AWS_REGION:eu-west-2}
   36    emf:
   37      enabled: ${AWS_EMF_ENABLED:false}
   38      namespace: ${AWS_EMF_NAMESPACE:}
   39  
   40  # Logging configuration
   41  logging:
   42    level:
   43      root: INFO
   44      uk.gov.defra.trade.imports.addressbook: ${LOG_LEVEL:INFO}
   45      org.springframework: ${LOGGING_LEVEL_ORG_SPRINGFRAMEWORK:INFO}
   46      org.springframework.web: ${LOGGING_LEVEL_ORG_SPRINGFRAMEWORK_WEB:DEBUG}
   47      org.mongodb.driver: ${LOGGING_LEVEL_ORG_MONGODB_DRIVER:WARN}
   48  
   49  # Actuator endpoints
   50  # Production: Only health endpoint exposed (secure by default)
   51  # Development: Use dev profile (application-local.yml) for debugging endpoints
   52  management:
   53    endpoints:
   54      web:
   55        base-path: /
   56        exposure:
   57          include: health
   58    endpoint:
   59      health:
   60        show-details: never
   61    info:
   62      env:
   63        enabled: true
   64    health:
   65      mongo:
   66        enabled: false
   67  
   68  # Application info (exposed via /info endpoint)
   69  info:
   70    app:
   71      name: ${spring.application.name}
   72      version: ${cdp.service-version}
   73      environment: ${cdp.environment}
   74  
   75  springdoc:
   76    api-docs:
   77      enabled: true
```

## Guides
