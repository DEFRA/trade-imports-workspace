# Review brief: skills-docs

This brief is 6750 lines. Read it with Read from line 1 to line 6750, in
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

## Reviewing skills and documentation

You may read only this brief. Whether the change makes a statement in
another file untrue is the consistency reviewer's check.

- **Skills** (`.claude/skills/**`): check each changed skill file against
  the skill patterns and anti-patterns in your guides. Triggers and NOT-for
  lines are specific; steps name the scripts they run; paths use the
  canonical `~/git/defra/trade-imports-workspace/` form; nothing is
  promised that no script or step does. A step marked unproven stays
  marked until a run confirms it.
- **Templates and assets** in a skill (JSON, markdown templates): every
  placeholder is filled by a named step, and the shape matches what the
  scripts read.
- **Documentation:** plain English, active voice, short sentences.
  Commands and paths are correct for this workspace. A doc states how
  things are now, with no history.
- **Accuracy:** a statement about a script, flag or file in the diff that
  the diff contradicts is a `comments` finding.

## Your group

- Review id: EUDPA-674
- Group: trade-imports-workspace--skills-docs--1
- Repo: trade-imports-workspace
- PR: 217
- Commit reviewed: a937d6cc727855548f8d365f6e39c5a9e6c6ea0d
- Repo checkout: /Users/aminav/git/defra/trade-imports-workspace/workareas/reviews/EUDPA-674/repos/trade-imports-workspace
- Files:
  - `.claude/skills/service-observability/SKILL.md`
  - `.claude/skills/service-observability/assets/alerts.template.md`
  - `.claude/skills/service-observability/assets/dashboard.template.json`
  - `.claude/skills/service-observability/references/ALERTS.md`
  - `.claude/skills/service-observability/references/DASHBOARD.md`
  - `.claude/skills/service-observability/references/LOGGING.md`
  - `.claude/skills/service-observability/references/METRICS.md`
  - `CLAUDE.md`
  - `docs/best-practices/java/spring-boot.md`
  - `docs/best-practices/java/testing/unit.md`

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

## File: `.claude/skills/service-observability/SKILL.md`

### Diff

```diff
diff --git a/.claude/skills/service-observability/SKILL.md b/.claude/skills/service-observability/SKILL.md
index 485d03ff..e99a9b06 100644
--- a/.claude/skills/service-observability/SKILL.md
+++ b/.claude/skills/service-observability/SKILL.md
@@ -12,8 +12,14 @@ templates in `assets/`; the developer imports and builds them in the
 CDP dev Grafana, because nothing else can write to it.
 
 It was written from EUDPA-632, the spike on
-`trade-imports-reference-data`. Read "What is proven" below before
-trusting any step.
+`trade-imports-reference-data`, and its code recipe from EUDPA-674 on
+`trade-imports-address-book`. For a Java service, every metric is a
+Micrometer meter published by `EmfMeterRegistry` (`references/METRICS.md`
+→ "Publish"). That is the one way this skill builds metrics for Java.
+A Node service has no recipe yet: "What is proven" below says what the
+first Node run does. Every metric and dimension is named in dot case
+(`external.call.duration`). Read "What is proven" before trusting any
+step.
 
 ## Path conventions
 
@@ -43,11 +49,12 @@ skill and point its plan at these steps.
 
 | Part | State |
 |---|---|
-| Metrics, Java service | Proven by tests on `trade-imports-reference-data` |
-| Log line, Java service | Proven by tests on `trade-imports-reference-data`: the encoded JSON holds a nested `event` object with a numeric duration (`references/LOGGING.md` → "How to write the fields"). `[UNPROVEN]` in dev OpenSearch until a release with `EcsEventEncoder` is checked there; the earlier MDC version was dropped by CDP |
-| Metrics and log line, Node service | Not written. `trade-imports-animals-frontend`, `-ins-frontend` and `-plants-frontend` already have `src/server/common/helpers/external-call-metrics.js`; the first Node ticket adds a Node reference here |
-| Dashboard and alert templates | Written from the reference-data code and the CDP docs; not yet imported into Grafana |
-| Dashboard, alerts, Slack routing, promotion, alert testing | **Taken from the CDP docs, not yet done on a real service.** Every fact that comes only from the docs is marked `[UNPROVEN]` where it is stated |
+| Metrics, Java service | Proven by tests on `trade-imports-address-book` (`EmfMeterRegistry`, the EMF documents it writes, the allowlist, `@Timed` through the Spring proxy). `[UNPROVEN]` in dev CloudWatch until that release is checked there. reference-data's older direct-EMF metrics reached dev CloudWatch under the PascalCase names; moving it to this way renames every metric and dimension to dot case, so its dashboard and alerts are rebuilt (`references/METRICS.md` → "A service built the old way") |
+| Log line, Java service | Proven by tests on `trade-imports-address-book`: `EcsEventEncoderTest` and `ExternalCallRecorderIT` check that the encoded JSON holds a nested `event` object with a numeric duration, and a failure's flat `error.type` and `error.message` with no stack trace (`references/LOGGING.md` → "How to write the fields"). The same encoder's line reached dev OpenSearch from reference-data 0.27.0 on 2026-10-21; CDP dropped the earlier MDC version (`references/LOGGING.md` → "What was learned on reference-data"). `[UNPROVEN]` in dev OpenSearch for address-book until its release is checked there |
+| Metrics and log line, Node service | Not written. `trade-imports-animals-frontend`, `-ins-frontend` and `-plants-frontend` already have `src/server/common/helpers/external-call-metrics.js`, which publishes the old PascalCase names (`references/METRICS.md` → "A service built the old way"); the first Node ticket adds a Node reference here |
+| Dashboard and alerts, PascalCase names | Done on reference-data in dev (EUDPA-632): the dashboard imported and showing CloudWatch and OpenSearch data on 2026-10-21, and the alerts built and fired on 2026-10-22 (`references/ALERTS.md` → "Prove they fire"). Not routed to Slack or promoted |
+| Dashboard and alert templates, dot-case names | Written for the names address-book publishes, from the CDP docs and the PascalCase versions above. `[UNPROVEN]`: not yet imported into Grafana or fired anywhere. Nor are the database rule 1a and the `<timed-name>` panel, which had no PascalCase version |
+| Slack routing, promotion, alert tests in test and prod | **Taken from the CDP docs, not yet done on a real service.** Every fact that comes only from the docs is marked `[UNPROVEN]` where it is stated |
 
 When a run settles an `[UNPROVEN]` fact, edit the file that states it
 (this SKILL.md or the reference): replace the marker with what happened. Do the same when a step turns out wrong.
@@ -121,7 +128,17 @@ is a #cdp-support request, made in Step 5.
 
 ## Step 3: Publish the metrics and log each dependency call
 
-Follow `references/METRICS.md` → "Publish" and `references/LOGGING.md`.
+Java service: follow `references/METRICS.md` → "Publish" and
+`references/LOGGING.md`. Copy the registry classes from
+`trade-imports-address-book`. If the service already writes EMF
+directly or has an `EmfMetricsPublisher`, move it to the registry first
+(`references/METRICS.md` → "A service built the old way").
+
+Node service: there is no recipe yet, and the Java classes do not
+apply. Read the Node row of "What is proven": the first Node ticket
+writes the Node reference and adds it to this skill as part of its
+work.
+
 Raise the PR from a `feat/EUDPA-X-<slug>` branch and deploy to dev.
 Steps 4 to 6 need the metrics to be arriving in dev.
 
```

### File at the reviewed commit, with line numbers

```markdown
    1  ---
    2  name: service-observability
    3  description: 'Add custom metrics, dependency call logging, a Grafana dashboard and alerts to one CDP service, then promote them and prove the alerts fire. Use when a ticket asks for observability on a single trade-imports service (triggers: "add observability to", "add metrics and alerts to", "add a dashboard and alerts to", "service-observability", "observability for EUDPA-"). NOT for planning or implementing a ticket in general — use the ticket skill and point its plan at these steps. NOT for reviewing code already written — use review or code-style.'
    4  ---
    5  
    6  The recipe for giving one CDP service the observability the platform
    7  defaults do not: custom metrics, a searchable log line per dependency
    8  call, a custom Grafana dashboard, and alerts that reach the team in
    9  Slack. One service per run. The code lands in the service's repo.
   10  Claude generates the dashboard JSON and an alert build sheet from the
   11  templates in `assets/`; the developer imports and builds them in the
   12  CDP dev Grafana, because nothing else can write to it.
   13  
   14  It was written from EUDPA-632, the spike on
   15  `trade-imports-reference-data`, and its code recipe from EUDPA-674 on
   16  `trade-imports-address-book`. For a Java service, every metric is a
   17  Micrometer meter published by `EmfMeterRegistry` (`references/METRICS.md`
   18  → "Publish"). That is the one way this skill builds metrics for Java.
   19  A Node service has no recipe yet: "What is proven" below says what the
   20  first Node run does. Every metric and dimension is named in dot case
   21  (`external.call.duration`). Read "What is proven" before trusting any
   22  step.
   23  
   24  ## Path conventions
   25  
   26  Cross-workspace paths use the literal home-relative form —
   27  `~/git/defra/trade-imports-workspace/tools/<domain>/`,
   28  `~/git/defra/trade-imports-workspace/docs/best-practices/`,
   29  `~/git/defra/trade-imports-workspace/workareas/`. Bash
   30  expands `~` automatically. Skill-internal references stay
   31  relative (`references/<NAME>.md`, `assets/<name>`).
   32  
   33  **Bash call hygiene** — one command per Bash call. Full rule
   34  table: [`docs/agent-skills.md`](../../../docs/agent-skills.md)
   35  → "Bash call hygiene".
   36  
   37  ## When to use
   38  
   39  | Trigger | What to follow |
   40  |---------|----------------|
   41  | "add observability to `<service>`", "observability for EUDPA-X" | Steps 1 to 6 in order |
   42  | "add metrics and alerts to `<service>`" | Steps 1 to 6 in order |
   43  | "add a dashboard and alerts to `<service>`" | Step 1's Grafana checks and Step 2's email question, then Steps 4 to 6, if the metrics are already deployed to dev |
   44  
   45  When the work is one ticket among others, plan it with the `ticket`
   46  skill and point its plan at these steps.
   47  
   48  ## What is proven
   49  
   50  | Part | State |
   51  |---|---|
   52  | Metrics, Java service | Proven by tests on `trade-imports-address-book` (`EmfMeterRegistry`, the EMF documents it writes, the allowlist, `@Timed` through the Spring proxy). `[UNPROVEN]` in dev CloudWatch until that release is checked there. reference-data's older direct-EMF metrics reached dev CloudWatch under the PascalCase names; moving it to this way renames every metric and dimension to dot case, so its dashboard and alerts are rebuilt (`references/METRICS.md` → "A service built the old way") |
   53  | Log line, Java service | Proven by tests on `trade-imports-address-book`: `EcsEventEncoderTest` and `ExternalCallRecorderIT` check that the encoded JSON holds a nested `event` object with a numeric duration, and a failure's flat `error.type` and `error.message` with no stack trace (`references/LOGGING.md` → "How to write the fields"). The same encoder's line reached dev OpenSearch from reference-data 0.27.0 on 2026-10-21; CDP dropped the earlier MDC version (`references/LOGGING.md` → "What was learned on reference-data"). `[UNPROVEN]` in dev OpenSearch for address-book until its release is checked there |
   54  | Metrics and log line, Node service | Not written. `trade-imports-animals-frontend`, `-ins-frontend` and `-plants-frontend` already have `src/server/common/helpers/external-call-metrics.js`, which publishes the old PascalCase names (`references/METRICS.md` → "A service built the old way"); the first Node ticket adds a Node reference here |
   55  | Dashboard and alerts, PascalCase names | Done on reference-data in dev (EUDPA-632): the dashboard imported and showing CloudWatch and OpenSearch data on 2026-10-21, and the alerts built and fired on 2026-10-22 (`references/ALERTS.md` → "Prove they fire"). Not routed to Slack or promoted |
   56  | Dashboard and alert templates, dot-case names | Written for the names address-book publishes, from the CDP docs and the PascalCase versions above. `[UNPROVEN]`: not yet imported into Grafana or fired anywhere. Nor are the database rule 1a and the `<timed-name>` panel, which had no PascalCase version |
   57  | Slack routing, promotion, alert tests in test and prod | **Taken from the CDP docs, not yet done on a real service.** Every fact that comes only from the docs is marked `[UNPROVEN]` where it is stated |
   58  
   59  When a run settles an `[UNPROVEN]` fact, edit the file that states it
   60  (this SKILL.md or the reference): replace the marker with what happened. Do the same when a step turns out wrong.
   61  Commit the edit in this workspace repo, on a branch with the same name
   62  as the service's branch (CLAUDE.md rule 2).
   63  
   64  ## Who does what
   65  
   66  Claude can read and change the service's code and run its tests. Claude
   67  cannot write to Grafana, OpenSearch, the CDP Portal or Slack: the dev
   68  Grafana needs a signed-in Editor to write, and CDP issues no
   69  service-account tokens. For Steps 4 and 5 Claude writes the dashboard
   70  JSON and the alert build sheet to
   71  `~/git/defra/trade-imports-workspace/workareas/ticket-planning/<ticket>/grafana/`;
   72  for Step 6 it gives the exact messages. The developer does the Grafana,
   73  Portal and Slack parts, and Claude records what they report back.
   74  
   75  A run takes days and several sessions. Its progress lives in the
   76  ticket's plan,
   77  `~/git/defra/trade-imports-workspace/workareas/ticket-planning/<ticket>/plan.md`:
   78  add the completion block below to it at the end of each session, and
   79  read it first in the next one. If the run did not start from the
   80  `ticket` skill there is no plan yet, so create the file (and its
   81  directory) with the first completion block. `workareas/` is local and
   82  not committed, so also record each completion block on the ticket: that
   83  is the copy another developer, or another machine, picks up from.
   84  
   85  Where a step says "record it on the ticket", Claude drafts the text and
   86  the developer posts it.
   87  
   88  ## Step 1: Check what CDP already gives the service
   89  
   90  No code. The developer checks in the dev Grafana
   91  (`https://metrics.dev.cdp-int.defra.cloud/`):
   92  
   93  - the service has its default dashboard;
   94  - the service has default alerts. They are deployed per service on
   95    request, so they may be missing: on 2026-10-15 animals-backend had
   96    them and reference-data had none. They live in the `CDP_Tenants`
   97    folder in two groups, `<service>` (desired running tasks, CPU, memory,
   98    storage, average response time, HTTP status code, log ingestion
   99    errors) and `<service> advanced http alerts` (4xx and 5xx percentage
  100    and spike detection, p95 response time, slow requests percentage).
  101    Check with the rules listing below, filtered on the service name. If
  102    either group is missing, ask #cdp-support to deploy it in every
  103    environment, naming a service that has it;
  104  - the folder `Playground/<service>-monitoring` exists, with an alert
  105    evaluation group `<service>-advanced-alerts` holding one alert named
  106    `platform_managed_do_not_delete`. (Seen 2026-10-15 for reference-data
  107    and animals-backend.) Anyone can list the dev alert rules without
  108    signing in:
  109    `curl -s 'https://metrics.dev.cdp-int.defra.cloud/api/prometheus/grafana/api/v1/rules' | jq -r '.data.groups[] | "\(.file) | \(.name) | \([.rules[].name] | join(", "))"'`.
  110  
  111  Then list the service's real dependencies from its code, not from the
  112  ticket: every system it calls, and any database it has configured. A
  113  configured database is a dependency like any other: give it the
  114  metrics, dashboard panels and alerts in `references/METRICS.md` → "A
  115  database". The one exception is a database that is configured but that
  116  nothing reads or writes through: leave it out, say why on the ticket,
  117  and raise a ticket to remove the configuration. (On reference-data,
  118  MongoDB is configured but unused, so it is left out.) Do not measure,
  119  show or alert on a dependency that is not on that list.
  120  
  121  ## Step 2: Agree the metric list
  122  
  123  Follow `references/METRICS.md` → "Work out the list". Agree the list
  124  with the team before writing code, and record it on the ticket.
  125  
  126  Ask at the same time: Slack only, or email as well? `[UNPROVEN]` Email
  127  is a #cdp-support request, made in Step 5.
  128  
  129  ## Step 3: Publish the metrics and log each dependency call
  130  
  131  Java service: follow `references/METRICS.md` → "Publish" and
  132  `references/LOGGING.md`. Copy the registry classes from
  133  `trade-imports-address-book`. If the service already writes EMF
  134  directly or has an `EmfMetricsPublisher`, move it to the registry first
  135  (`references/METRICS.md` → "A service built the old way").
  136  
  137  Node service: there is no recipe yet, and the Java classes do not
  138  apply. Read the Node row of "What is proven": the first Node ticket
  139  writes the Node reference and adds it to this skill as part of its
  140  work.
  141  
  142  Raise the PR from a `feat/EUDPA-X-<slug>` branch and deploy to dev.
  143  Steps 4 to 6 need the metrics to be arriving in dev.
  144  
  145  `/health` must not change. CDP uses it to decide whether a task is
  146  alive, so a dependency check there restarts every task when a
  147  dependency goes down. Availability is a metric, never a health check.
  148  
  149  ## Step 4: Build the dashboard
  150  
  151  Follow `references/DASHBOARD.md` → "Generate" (Claude, from
  152  `assets/dashboard.template.json`), then "Import" (the developer).
  153  
  154  ## Step 5: Build the alerts and route them to Slack
  155  
  156  Follow `references/ALERTS.md` → "Build" (Claude writes the build sheet
  157  from `assets/alerts.template.md`; the developer builds each rule) and
  158  "Route to Slack".
  159  
  160  ## Step 6: Promote, then prove each alert fires
  161  
  162  Follow `references/ALERTS.md` → "Promote" and "Prove they fire", and
  163  `references/LOGGING.md` → "Follow a request by trace.id".
  164  
  165  ## Completion output
  166  
  167  ```
  168  service-observability: <service> (<ticket>)
  169  
  170  Done:
  171  - <steps finished, with PR links>
  172  
  173  Waiting on a person:
  174  - <Grafana, Portal, Slack or #cdp-support steps still open>
  175  
  176  Settled this run:
  177  - <each [UNPROVEN] fact confirmed or corrected, and the file that states it (this SKILL.md or the reference) edited>
  178  
  179  Next: <the single next action and who takes it>
  180  ```
```

## File: `.claude/skills/service-observability/assets/alerts.template.md`

### Diff

```diff
diff --git a/.claude/skills/service-observability/assets/alerts.template.md b/.claude/skills/service-observability/assets/alerts.template.md
index 54ca76ec..d16c2100 100644
--- a/.claude/skills/service-observability/assets/alerts.template.md
+++ b/.claude/skills/service-observability/assets/alerts.template.md
@@ -3,8 +3,8 @@
 Build each rule by hand in the dev Grafana
 (`https://metrics.dev.cdp-int.defra.cloud/`): Alerting → Alert rules →
 New alert rule. The values below are in the order the form asks for them.
-Build rule 1 in full, then make rules 2 and 3 from it with More →
-Duplicate, changing only the fields their tables list.
+Build the first rule in full, then make the others from it with More →
+Duplicate, setting every field their tables list.
 
 Grafana cannot import these: CDP issues no service-account tokens and
 `[UNPROVEN]` the UI has no import for Grafana-managed alert rules.
@@ -17,7 +17,7 @@ Every rule shares these settings:
 | Evaluation group | `<service>-advanced-alerts`, the existing one. `[UNPROVEN]` it evaluates every 5 minutes; the form shows its interval |
 | Data source | CloudWatch, Metric Search, Builder |
 | Namespace | `<service>` |
-| Dimensions | `Dependency` = `*`, `Operation` = `*`, with Match exact off |
+| Dimensions | `dependency` = `*`, `operation` = `*`, with Match exact off. Rule 1a is the one exception: `dependency` only |
 | Time range | the same length as the rule's period |
 | Alert condition | the "WHEN QUERY `Last` IS ABOVE …" row under the query. The Advanced options toggle shows the same thing as Reduce and Threshold expressions; either works |
 | Pending period | None. Grafana refuses any pending period shorter than the group's evaluation interval ("Pending period must be greater than or equal to the evaluation interval") |
@@ -37,41 +37,66 @@ values.
 | Field | Value |
 |---|---|
 | Rule name | `<service> dependency unavailable` |
-| Metric | `ExternalCallFailure` |
+| Metric | `external.call.failure` |
 | Statistic | `Minimum` |
 | Period | `300` (5 minutes) |
 | Alert condition | `Last` `IS EQUAL TO` `1` (every call in the window failed). If the operator list has no "equal to", `IS ABOVE` `0.99` means the same here |
-| Summary | `{{ $labels.Dependency }} {{ $labels.Operation }}: every call failed in the last 5 minutes` |
+| Summary | `{{ $labels.dependency }} {{ $labels.operation }}: every call failed in the last 5 minutes` |
 
 Before saving, Preview should show one row per dependency and operation.
 If it shows none, check Match exact is off and both dimensions are set.
 
+## 1a. <service> <database> unavailable
+
+For a database, its availability comes from the driver's heartbeats
+(`references/METRICS.md` → "A database"). Keep this section only if the
+service has a database. The table under "Check" says which of rules 1, 2
+and 3 are built beside it.
+
+| Field | Value |
+|---|---|
+| Rule name | `<service> <database> unavailable` |
+| Metric | `external.dependency.available` |
+| Dimensions | `dependency` = `<database>`, the only dimension, with Match exact off |
+| Statistic | `Maximum` |
+| Period | `300` (5 minutes) |
+| Alert condition | `Last` `IS BELOW` `1` (every reading from every task in the window said down) |
+| Summary | `<database> has been unavailable to every task for 5 minutes` |
+
 ## 2. <service> dependency calls failing
 
-Duplicate rule 1, then change:
+Duplicate rule 1 (or rule 1a, where rule 1 is not built), then set:
 
 | Field | Value |
 |---|---|
 | Rule name | `<service> dependency calls failing` |
+| Metric | `external.call.failure` |
+| Dimensions | `dependency` = `*`, `operation` = `*`, with Match exact off |
 | Statistic | `Sum` |
 | Period | `900` (15 minutes) |
 | Alert condition | `Last` `IS ABOVE` `2` (3 or more failed calls) |
-| Summary | `{{ $labels.Dependency }} {{ $labels.Operation }}: 3 or more failed calls in 15 minutes` |
+| Summary | `{{ $labels.dependency }} {{ $labels.operation }}: 3 or more failed calls in 15 minutes` |
+
+Where a database is the only dependency, Preview must show a
+`<database>` row before saving. If it shows none, the database's
+command metrics are not published: build neither this rule nor rule 3
+(see "Check"), as they would find no data and never fire.
 
 ## 3. <service> dependency slow
 
-Duplicate rule 1, then change the fields below. One rule covers all
+Duplicate rule 2, then set the fields below. One rule covers all
 dependencies when they share a read timeout; otherwise make one rule per
-dependency, setting `Dependency` to its name instead of `*`.
+dependency, setting `dependency` to its name instead of `*`.
 
 | Field | Value |
 |---|---|
 | Rule name | `<service> dependency slow` |
-| Metric | `ExternalCallDuration` |
+| Metric | `external.call.duration` |
+| Dimensions | `dependency` = `*`, `operation` = `*`, with Match exact off |
 | Statistic | `p95` (type it in if the list does not offer it) |
 | Period | `900` (15 minutes) |
 | Alert condition | `Last` `IS ABOVE` `<slow-threshold-ms>` (two thirds of `<read-timeout-ms>`, the read timeout the client actually uses) |
-| Summary | `{{ $labels.Dependency }} {{ $labels.Operation }}: p95 call time above <slow-threshold-ms> ms over 15 minutes` |
+| Summary | `{{ $labels.dependency }} {{ $labels.operation }}: p95 call time above <slow-threshold-ms> ms over 15 minutes` |
 
 Take `<read-timeout-ms>` from the client that makes the call, not from a
 config value: check the value is actually applied (a Feign client with
@@ -80,12 +105,28 @@ says).
 
 ## Check
 
-The group holds `platform_managed_do_not_delete` and these three rules,
-each Normal, none in Error. Then prove each one fires
+The group holds `platform_managed_do_not_delete` and the rules built
+here, each Normal, none in Error:
+
+| The service has | Rules |
+|---|---|
+| No database | 1, 2 and 3 (three rules) |
+| A database and other dependencies | 1, 1a, 2 and 3 (four rules) |
+| A database as its only dependency, publishing its command metrics | 1a, 2 and 3 (three rules) |
+| A database as its only dependency, without its command metrics | 1a (one rule) |
+
+A database's command metrics are the `external.call.*` meters
+`MongoCommandMetrics` records (`references/METRICS.md` → "A database").
+A heartbeat records none.
+
+Rule 3 counts once more for each extra per-dependency slow rule. Then prove each one fires
 (`references/ALERTS.md` → "Prove they fire"), and export one rule
 (More → Export → JSON) for Claude to check this sheet against.
 
 ## Not alerted on
 
-- `DependencyAvailable`: it reports the last call's outcome however old,
-  so it lags. It is for the dashboard only.
+- `external.dependency.available` for an HTTP dependency. It is for the
+  dashboard only; rule 1 alerts on `external.call.failure` instead
+  (`references/METRICS.md` → "Availability: passive or active" says
+  why). A database's comes from the driver's heartbeats, and rule 1a
+  alerts on it.
```

### File at the reviewed commit, with line numbers

```markdown
    1  # Alerts for <service>
    2  
    3  Build each rule by hand in the dev Grafana
    4  (`https://metrics.dev.cdp-int.defra.cloud/`): Alerting → Alert rules →
    5  New alert rule. The values below are in the order the form asks for them.
    6  Build the first rule in full, then make the others from it with More →
    7  Duplicate, setting every field their tables list.
    8  
    9  Grafana cannot import these: CDP issues no service-account tokens and
   10  `[UNPROVEN]` the UI has no import for Grafana-managed alert rules.
   11  
   12  Every rule shares these settings:
   13  
   14  | Field | Value |
   15  |---|---|
   16  | Folder | `Playground/<service>-monitoring` |
   17  | Evaluation group | `<service>-advanced-alerts`, the existing one. `[UNPROVEN]` it evaluates every 5 minutes; the form shows its interval |
   18  | Data source | CloudWatch, Metric Search, Builder |
   19  | Namespace | `<service>` |
   20  | Dimensions | `dependency` = `*`, `operation` = `*`, with Match exact off. Rule 1a is the one exception: `dependency` only |
   21  | Time range | the same length as the rule's period |
   22  | Alert condition | the "WHEN QUERY `Last` IS ABOVE …" row under the query. The Advanced options toggle shows the same thing as Reduce and Threshold expressions; either works |
   23  | Pending period | None. Grafana refuses any pending period shorter than the group's evaluation interval ("Pending period must be greater than or equal to the evaluation interval") |
   24  | No data | Normal, under "Configure no data and error handling". Leave error handling at its default |
   25  | Notifications | Use notification policy, not a contact point |
   26  | Labels | none (promotion adds them) |
   27  
   28  Leave the rule named `platform_managed_do_not_delete` alone. Routing to
   29  Slack is a #cdp-support request (`references/ALERTS.md` → "Route to
   30  Slack"), not a field here.
   31  
   32  The thresholds are a first guess for the team to agree, not tested
   33  values.
   34  
   35  ## 1. <service> dependency unavailable
   36  
   37  | Field | Value |
   38  |---|---|
   39  | Rule name | `<service> dependency unavailable` |
   40  | Metric | `external.call.failure` |
   41  | Statistic | `Minimum` |
   42  | Period | `300` (5 minutes) |
   43  | Alert condition | `Last` `IS EQUAL TO` `1` (every call in the window failed). If the operator list has no "equal to", `IS ABOVE` `0.99` means the same here |
   44  | Summary | `{{ $labels.dependency }} {{ $labels.operation }}: every call failed in the last 5 minutes` |
   45  
   46  Before saving, Preview should show one row per dependency and operation.
   47  If it shows none, check Match exact is off and both dimensions are set.
   48  
   49  ## 1a. <service> <database> unavailable
   50  
   51  For a database, its availability comes from the driver's heartbeats
   52  (`references/METRICS.md` → "A database"). Keep this section only if the
   53  service has a database. The table under "Check" says which of rules 1, 2
   54  and 3 are built beside it.
   55  
   56  | Field | Value |
   57  |---|---|
   58  | Rule name | `<service> <database> unavailable` |
   59  | Metric | `external.dependency.available` |
   60  | Dimensions | `dependency` = `<database>`, the only dimension, with Match exact off |
   61  | Statistic | `Maximum` |
   62  | Period | `300` (5 minutes) |
   63  | Alert condition | `Last` `IS BELOW` `1` (every reading from every task in the window said down) |
   64  | Summary | `<database> has been unavailable to every task for 5 minutes` |
   65  
   66  ## 2. <service> dependency calls failing
   67  
   68  Duplicate rule 1 (or rule 1a, where rule 1 is not built), then set:
   69  
   70  | Field | Value |
   71  |---|---|
   72  | Rule name | `<service> dependency calls failing` |
   73  | Metric | `external.call.failure` |
   74  | Dimensions | `dependency` = `*`, `operation` = `*`, with Match exact off |
   75  | Statistic | `Sum` |
   76  | Period | `900` (15 minutes) |
   77  | Alert condition | `Last` `IS ABOVE` `2` (3 or more failed calls) |
   78  | Summary | `{{ $labels.dependency }} {{ $labels.operation }}: 3 or more failed calls in 15 minutes` |
   79  
   80  Where a database is the only dependency, Preview must show a
   81  `<database>` row before saving. If it shows none, the database's
   82  command metrics are not published: build neither this rule nor rule 3
   83  (see "Check"), as they would find no data and never fire.
   84  
   85  ## 3. <service> dependency slow
   86  
   87  Duplicate rule 2, then set the fields below. One rule covers all
   88  dependencies when they share a read timeout; otherwise make one rule per
   89  dependency, setting `dependency` to its name instead of `*`.
   90  
   91  | Field | Value |
   92  |---|---|
   93  | Rule name | `<service> dependency slow` |
   94  | Metric | `external.call.duration` |
   95  | Dimensions | `dependency` = `*`, `operation` = `*`, with Match exact off |
   96  | Statistic | `p95` (type it in if the list does not offer it) |
   97  | Period | `900` (15 minutes) |
   98  | Alert condition | `Last` `IS ABOVE` `<slow-threshold-ms>` (two thirds of `<read-timeout-ms>`, the read timeout the client actually uses) |
   99  | Summary | `{{ $labels.dependency }} {{ $labels.operation }}: p95 call time above <slow-threshold-ms> ms over 15 minutes` |
  100  
  101  Take `<read-timeout-ms>` from the client that makes the call, not from a
  102  config value: check the value is actually applied (a Feign client with
  103  no `Request.Options` uses Feign's 60 second default whatever the YAML
  104  says).
  105  
  106  ## Check
  107  
  108  The group holds `platform_managed_do_not_delete` and the rules built
  109  here, each Normal, none in Error:
  110  
  111  | The service has | Rules |
  112  |---|---|
  113  | No database | 1, 2 and 3 (three rules) |
  114  | A database and other dependencies | 1, 1a, 2 and 3 (four rules) |
  115  | A database as its only dependency, publishing its command metrics | 1a, 2 and 3 (three rules) |
  116  | A database as its only dependency, without its command metrics | 1a (one rule) |
  117  
  118  A database's command metrics are the `external.call.*` meters
  119  `MongoCommandMetrics` records (`references/METRICS.md` → "A database").
  120  A heartbeat records none.
  121  
  122  Rule 3 counts once more for each extra per-dependency slow rule. Then prove each one fires
  123  (`references/ALERTS.md` → "Prove they fire"), and export one rule
  124  (More → Export → JSON) for Claude to check this sheet against.
  125  
  126  ## Not alerted on
  127  
  128  - `external.dependency.available` for an HTTP dependency. It is for the
  129    dashboard only; rule 1 alerts on `external.call.failure` instead
  130    (`references/METRICS.md` → "Availability: passive or active" says
  131    why). A database's comes from the driver's heartbeats, and rule 1a
  132    alerts on it.
```

## File: `.claude/skills/service-observability/assets/dashboard.template.json`

### Diff

```diff
diff --git a/.claude/skills/service-observability/assets/dashboard.template.json b/.claude/skills/service-observability/assets/dashboard.template.json
index 1cfa877a..c43989a4 100644
--- a/.claude/skills/service-observability/assets/dashboard.template.json
+++ b/.claude/skills/service-observability/assets/dashboard.template.json
@@ -1,9 +1,15 @@
 {
   "title": "<service> (custom)",
-  "tags": ["<service>", "observability"],
+  "tags": [
+    "<service>",
+    "observability"
+  ],
   "timezone": "browser",
   "schemaVersion": 41,
-  "time": { "from": "now-24h", "to": "now" },
+  "time": {
+    "from": "now-24h",
+    "to": "now"
+  },
   "refresh": "1m",
   "templating": {
     "list": [
@@ -27,33 +33,77 @@
     {
       "type": "stat",
       "title": "Dependency status",
-      "description": "DependencyAvailable, Minimum: 1 available, 0 not. Shows the last call's outcome, however old, so it lags. Alerts use ExternalCallFailure instead.",
-      "gridPos": { "x": 0, "y": 0, "w": 24, "h": 4 },
-      "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+      "description": "external.dependency.available, Minimum: 1 available, 0 not. Fresh for a database (driver heartbeats) or an active probe; for a passive HTTP reading it is the last call's outcome, however old.",
+      "gridPos": {
+        "x": 0,
+        "y": 0,
+        "w": 24,
+        "h": 4
+      },
+      "datasource": {
+        "type": "cloudwatch",
+        "uid": "${cloudwatch}"
+      },
       "targets": [
         {
           "refId": "A",
-          "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
           "queryMode": "Metrics",
           "metricQueryType": 0,
           "metricEditorMode": 0,
           "region": "default",
           "namespace": "<service>",
-          "metricName": "DependencyAvailable",
+          "metricName": "external.dependency.available",
           "statistic": "Minimum",
-          "dimensions": { "Dependency": "*" },
+          "dimensions": {
+            "dependency": "*"
+          },
           "matchExact": false,
           "period": "",
-          "label": "${PROP('Dim.Dependency')}"
+          "label": "${PROP('Dim.dependency')}"
         }
       ],
-      "options": { "reduceOptions": { "calcs": ["lastNotNull"] }, "colorMode": "background" },
+      "options": {
+        "reduceOptions": {
+          "calcs": [
+            "lastNotNull"
+          ]
+        },
+        "colorMode": "background"
+      },
       "fieldConfig": {
         "defaults": {
           "mappings": [
-            { "type": "value", "options": { "0": { "text": "Unavailable", "color": "red" }, "1": { "text": "Available", "color": "green" } } }
+            {
+              "type": "value",
+              "options": {
+                "0": {
+                  "text": "Unavailable",
+                  "color": "red"
+                },
+                "1": {
+                  "text": "Available",
+                  "color": "green"
+                }
+              }
+            }
           ],
-          "thresholds": { "mode": "absolute", "steps": [{ "color": "red", "value": null }, { "color": "green", "value": 1 }] }
+          "thresholds": {
+            "mode": "absolute",
+            "steps": [
+              {
+                "color": "red",
+                "value": null
+              },
+              {
+                "color": "green",
+                "value": 1
+              }
+            ]
+          }
         },
         "overrides": []
       }
@@ -61,183 +111,307 @@
     {
       "type": "timeseries",
       "title": "Calls per dependency",
-      "description": "ExternalCallDuration, SampleCount, per Dependency and Operation.",
-      "gridPos": { "x": 0, "y": 4, "w": 12, "h": 8 },
-      "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+      "description": "external.call.duration, SampleCount, per dependency and operation.",
+      "gridPos": {
+        "x": 0,
+        "y": 4,
+        "w": 12,
+        "h": 8
+      },
+      "datasource": {
+        "type": "cloudwatch",
+        "uid": "${cloudwatch}"
+      },
       "targets": [
         {
           "refId": "A",
-          "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
           "queryMode": "Metrics",
           "metricQueryType": 0,
           "metricEditorMode": 0,
           "region": "default",
           "namespace": "<service>",
-          "metricName": "ExternalCallDuration",
+          "metricName": "external.call.duration",
           "statistic": "SampleCount",
-          "dimensions": { "Dependency": "*", "Operation": "*" },
+          "dimensions": {
+            "dependency": "*",
+            "operation": "*"
+          },
           "matchExact": false,
           "period": "",
-          "label": "${PROP('Dim.Dependency')} ${PROP('Dim.Operation')}"
+          "label": "${PROP('Dim.dependency')} ${PROP('Dim.operation')}"
         }
       ],
-      "fieldConfig": { "defaults": { "unit": "short" }, "overrides": [] }
+      "fieldConfig": {
+        "defaults": {
+          "unit": "short"
+        },
+        "overrides": []
+      }
     },
     {
       "type": "timeseries",
       "title": "Failed calls",
-      "description": "ExternalCallFailure, Sum, per Dependency and Operation.",
-      "gridPos": { "x": 12, "y": 4, "w": 12, "h": 8 },
-      "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+      "description": "external.call.failure, Sum, per dependency and operation.",
+      "gridPos": {
+        "x": 12,
+        "y": 4,
+        "w": 12,
+        "h": 8
+      },
+      "datasource": {
+        "type": "cloudwatch",
+        "uid": "${cloudwatch}"
+      },
       "targets": [
         {
           "refId": "A",
-          "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
           "queryMode": "Metrics",
           "metricQueryType": 0,
           "metricEditorMode": 0,
           "region": "default",
           "namespace": "<service>",
-          "metricName": "ExternalCallFailure",
+          "metricName": "external.call.failure",
           "statistic": "Sum",
-          "dimensions": { "Dependency": "*", "Operation": "*" },
+          "dimensions": {
+            "dependency": "*",
+            "operation": "*"
+          },
           "matchExact": false,
           "period": "",
-          "label": "${PROP('Dim.Dependency')} ${PROP('Dim.Operation')}"
+          "label": "${PROP('Dim.dependency')} ${PROP('Dim.operation')}"
         }
       ],
-      "fieldConfig": { "defaults": { "unit": "short" }, "overrides": [] }
+      "fieldConfig": {
+        "defaults": {
+          "unit": "short"
+        },
+        "overrides": []
+      }
     },
     {
       "type": "timeseries",
       "title": "Failure rate",
-      "description": "ExternalCallFailure, Average (each call publishes 0 or 1), shown as a percentage, per Dependency and Operation.",
-      "gridPos": { "x": 0, "y": 12, "w": 12, "h": 8 },
-      "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+      "description": "external.call.failure, Average (each call publishes 0 or 1), shown as a percentage, per dependency and operation.",
+      "gridPos": {
+        "x": 0,
+        "y": 12,
+        "w": 12,
+        "h": 8
+      },
+      "datasource": {
+        "type": "cloudwatch",
+        "uid": "${cloudwatch}"
+      },
       "targets": [
         {
           "refId": "A",
-          "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
           "queryMode": "Metrics",
           "metricQueryType": 0,
           "metricEditorMode": 0,
           "region": "default",
           "namespace": "<service>",
-          "metricName": "ExternalCallFailure",
+          "metricName": "external.call.failure",
           "statistic": "Average",
-          "dimensions": { "Dependency": "*", "Operation": "*" },
+          "dimensions": {
+            "dependency": "*",
+            "operation": "*"
+          },
           "matchExact": false,
           "period": "",
-          "label": "${PROP('Dim.Dependency')} ${PROP('Dim.Operation')}"
+          "label": "${PROP('Dim.dependency')} ${PROP('Dim.operation')}"
         }
       ],
-      "fieldConfig": { "defaults": { "unit": "percentunit", "min": 0, "max": 1 }, "overrides": [] }
+      "fieldConfig": {
+        "defaults": {
+          "unit": "percentunit",
+          "min": 0,
+          "max": 1
+        },
+        "overrides": []
+      }
     },
     {
       "type": "timeseries",
       "title": "Call time",
-      "description": "ExternalCallDuration: Average, p95 and Maximum, per Dependency and Operation.",
-      "gridPos": { "x": 12, "y": 12, "w": 12, "h": 8 },
-      "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+      "description": "external.call.duration: Average, p95 and Maximum, per dependency and operation.",
+      "gridPos": {
+        "x": 12,
+        "y": 12,
+        "w": 12,
+        "h": 8
+      },
+      "datasource": {
+        "type": "cloudwatch",
+        "uid": "${cloudwatch}"
+      },
       "targets": [
         {
           "refId": "A",
-          "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
           "queryMode": "Metrics",
           "metricQueryType": 0,
           "metricEditorMode": 0,
           "region": "default",
           "namespace": "<service>",
-          "metricName": "ExternalCallDuration",
+          "metricName": "external.call.duration",
           "statistic": "Average",
-          "dimensions": { "Dependency": "*", "Operation": "*" },
+          "dimensions": {
+            "dependency": "*",
+            "operation": "*"
+          },
           "matchExact": false,
           "period": "",
-          "label": "${PROP('Dim.Dependency')} ${PROP('Dim.Operation')} average"
+          "label": "${PROP('Dim.dependency')} ${PROP('Dim.operation')} average"
         },
         {
           "refId": "B",
-          "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
           "queryMode": "Metrics",
           "metricQueryType": 0,
           "metricEditorMode": 0,
           "region": "default",
           "namespace": "<service>",
-          "metricName": "ExternalCallDuration",
+          "metricName": "external.call.duration",
           "statistic": "p95",
-          "dimensions": { "Dependency": "*", "Operation": "*" },
+          "dimensions": {
+            "dependency": "*",
+            "operation": "*"
+          },
           "matchExact": false,
           "period": "",
-          "label": "${PROP('Dim.Dependency')} ${PROP('Dim.Operation')} p95"
+          "label": "${PROP('Dim.dependency')} ${PROP('Dim.operation')} p95"
         },
         {
           "refId": "C",
-          "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
           "queryMode": "Metrics",
           "metricQueryType": 0,
           "metricEditorMode": 0,
           "region": "default",
           "namespace": "<service>",
-          "metricName": "ExternalCallDuration",
+          "metricName": "external.call.duration",
           "statistic": "Maximum",
-          "dimensions": { "Dependency": "*", "Operation": "*" },
+          "dimensions": {
+            "dependency": "*",
+            "operation": "*"
+          },
           "matchExact": false,
           "period": "",
-          "label": "${PROP('Dim.Dependency')} ${PROP('Dim.Operation')} slowest"
+          "label": "${PROP('Dim.dependency')} ${PROP('Dim.operation')} slowest"
         }
       ],
-      "fieldConfig": { "defaults": { "unit": "ms" }, "overrides": [] }
+      "fieldConfig": {
+        "defaults": {
+          "unit": "ms"
+        },
+        "overrides": []
+      }
     },
     {
       "type": "timeseries",
       "title": "Cache hits and misses",
-      "description": "CacheHit and CacheMiss, Sum, per Cache. Delete this panel if the service has no cache.",
-      "gridPos": { "x": 0, "y": 20, "w": 12, "h": 8 },
-      "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+      "description": "cache.hit and cache.miss, Sum, per cache.",
+      "gridPos": {
+        "x": 0,
+        "y": 20,
+        "w": 12,
+        "h": 8
+      },
+      "datasource": {
+        "type": "cloudwatch",
+        "uid": "${cloudwatch}"
+      },
       "targets": [
         {
           "refId": "A",
-          "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
           "queryMode": "Metrics",
           "metricQueryType": 0,
           "metricEditorMode": 0,
           "region": "default",
           "namespace": "<service>",
-          "metricName": "CacheHit",
+          "metricName": "cache.hit",
           "statistic": "Sum",
-          "dimensions": { "Cache": "*" },
+          "dimensions": {
+            "cache": "*"
+          },
           "matchExact": false,
           "period": "",
-          "label": "${PROP('Dim.Cache')} hits"
+          "label": "${PROP('Dim.cache')} hits"
         },
         {
           "refId": "B",
-          "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
           "queryMode": "Metrics",
           "metricQueryType": 0,
           "metricEditorMode": 0,
           "region": "default",
           "namespace": "<service>",
-          "metricName": "CacheMiss",
+          "metricName": "cache.miss",
           "statistic": "Sum",
-          "dimensions": { "Cache": "*" },
+          "dimensions": {
+            "cache": "*"
+          },
           "matchExact": false,
           "period": "",
-          "label": "${PROP('Dim.Cache')} misses"
+          "label": "${PROP('Dim.cache')} misses"
         }
       ],
-      "fieldConfig": { "defaults": { "unit": "short" }, "overrides": [] }
+      "fieldConfig": {
+        "defaults": {
+          "unit": "short"
+        },
+        "overrides": []
+      }
     },
     {
       "type": "timeseries",
       "title": "<business-metric> by <business-dimension>",
-      "description": "One copy of this panel per business metric on the agreed list. Delete it if there are none.",
-      "gridPos": { "x": 12, "y": 20, "w": 12, "h": 8 },
-      "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+      "description": "<business-metric>, Sum, per <business-dimension>.",
+      "gridPos": {
+        "x": 12,
+        "y": 20,
+        "w": 12,
+        "h": 8
+      },
+      "datasource": {
+        "type": "cloudwatch",
+        "uid": "${cloudwatch}"
+      },
       "targets": [
         {
           "refId": "A",
-          "datasource": { "type": "cloudwatch", "uid": "${cloudwatch}" },
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
           "queryMode": "Metrics",
           "metricQueryType": 0,
           "metricEditorMode": 0,
@@ -245,27 +419,53 @@
           "namespace": "<service>",
           "metricName": "<business-metric>",
           "statistic": "Sum",
-          "dimensions": { "<business-dimension>": "*" },
+          "dimensions": {
+            "<business-dimension>": "*"
+          },
           "matchExact": false,
           "period": "",
           "label": "${PROP('Dim.<business-dimension>')}"
         }
       ],
-      "fieldConfig": { "defaults": { "unit": "short" }, "overrides": [] }
+      "fieldConfig": {
+        "defaults": {
+          "unit": "short"
+        },
+        "overrides": []
+      }
     },
     {
       "type": "table",
       "title": "Slowest dependency calls",
       "description": "From the logs, not metrics: one row per external call, slowest first. event.action is <dependency>/<operation>; event.duration is a number in nanoseconds. Lucene query, not DQL.",
-      "gridPos": { "x": 0, "y": 28, "w": 24, "h": 10 },
-      "datasource": { "type": "grafana-opensearch-datasource", "uid": "${opensearch}" },
+      "gridPos": {
+        "x": 0,
+        "y": 28,
+        "w": 24,
+        "h": 10
+      },
+      "datasource": {
+        "type": "grafana-opensearch-datasource",
+        "uid": "${opensearch}"
+      },
       "targets": [
         {
           "refId": "A",
-          "datasource": { "type": "grafana-opensearch-datasource", "uid": "${opensearch}" },
+          "datasource": {
+            "type": "grafana-opensearch-datasource",
+            "uid": "${opensearch}"
+          },
           "queryType": "lucene",
           "query": "event.category:\"external-call\" AND service.name:\"<service>\"",
-          "metrics": [{ "id": "1", "type": "raw_data", "settings": { "size": "500" } }],
+          "metrics": [
+            {
+              "id": "1",
+              "type": "raw_data",
+              "settings": {
+                "size": "500"
+              }
+            }
+          ],
           "bucketAggs": [],
           "timeField": "@timestamp"
         }
@@ -283,11 +483,163 @@
             }
           }
         },
-        { "id": "sortBy", "options": { "sort": [{ "field": "event.duration", "desc": true }] } }
+        {
+          "id": "sortBy",
+          "options": {
+            "sort": [
+              {
+                "field": "event.duration",
+                "desc": true
+              }
+            ]
+          }
+        }
       ],
       "fieldConfig": {
         "defaults": {},
-        "overrides": [{ "matcher": { "id": "byName", "options": "event.duration" }, "properties": [{ "id": "unit", "value": "ns" }] }]
+        "overrides": [
+          {
+            "matcher": {
+              "id": "byName",
+              "options": "event.duration"
+            },
+            "properties": [
+              {
+                "id": "unit",
+                "value": "ns"
+              }
+            ]
+          }
+        ]
+      }
+    },
+    {
+      "type": "timeseries",
+      "title": "<timed-name>",
+      "description": "@Timed(\"<timed-name>\"), published by EmfMeterRegistry: one value per call, in milliseconds, with the timer's tags (class, method, exception) as dimensions. Calls is SampleCount; Average, p95 and Slowest are over the calls in each period.",
+      "gridPos": {
+        "x": 0,
+        "y": 38,
+        "w": 12,
+        "h": 8
+      },
+      "datasource": {
+        "type": "cloudwatch",
+        "uid": "${cloudwatch}"
+      },
+      "targets": [
+        {
+          "refId": "A",
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
+          "queryMode": "Metrics",
+          "metricQueryType": 0,
+          "metricEditorMode": 0,
+          "region": "default",
+          "namespace": "<service>",
+          "metricName": "<timed-name>",
+          "statistic": "Average",
+          "dimensions": {
+            "class": "*",
+            "method": "*",
+            "exception": "*"
+          },
+          "matchExact": false,
+          "period": "",
+          "label": "Average ${PROP('Dim.exception')}"
+        },
+        {
+          "refId": "B",
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
+          "queryMode": "Metrics",
+          "metricQueryType": 0,
+          "metricEditorMode": 0,
+          "region": "default",
+          "namespace": "<service>",
+          "metricName": "<timed-name>",
+          "statistic": "p95",
+          "dimensions": {
+            "class": "*",
+            "method": "*",
+            "exception": "*"
+          },
+          "matchExact": false,
+          "period": "",
+          "label": "p95 ${PROP('Dim.exception')}"
+        },
+        {
+          "refId": "C",
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
+          "queryMode": "Metrics",
+          "metricQueryType": 0,
+          "metricEditorMode": 0,
+          "region": "default",
+          "namespace": "<service>",
+          "metricName": "<timed-name>",
+          "statistic": "Maximum",
+          "dimensions": {
+            "class": "*",
+            "method": "*",
+            "exception": "*"
+          },
+          "matchExact": false,
+          "period": "",
+          "label": "Slowest ${PROP('Dim.exception')}"
+        },
+        {
+          "refId": "D",
+          "datasource": {
+            "type": "cloudwatch",
+            "uid": "${cloudwatch}"
+          },
+          "queryMode": "Metrics",
+          "metricQueryType": 0,
+          "metricEditorMode": 0,
+          "region": "default",
+          "namespace": "<service>",
+          "metricName": "<timed-name>",
+          "statistic": "SampleCount",
+          "dimensions": {
+            "class": "*",
+            "method": "*",
+            "exception": "*"
+          },
+          "matchExact": false,
+          "period": "",
+          "label": "Calls ${PROP('Dim.exception')}"
+        }
+      ],
+      "fieldConfig": {
+        "defaults": {
+          "unit": "ms",
+          "min": 0
+        },
+        "overrides": [
+          {
+            "matcher": {
+              "id": "byFrameRefID",
+              "options": "D"
+            },
+            "properties": [
+              {
+                "id": "unit",
+                "value": "short"
+              },
+              {
+                "id": "custom.axisPlacement",
+                "value": "right"
+              }
+            ]
+          }
+        ]
       }
     }
   ]
```

### File at the reviewed commit, with line numbers

```json
    1  {
    2    "title": "<service> (custom)",
    3    "tags": [
    4      "<service>",
    5      "observability"
    6    ],
    7    "timezone": "browser",
    8    "schemaVersion": 41,
    9    "time": {
   10      "from": "now-24h",
   11      "to": "now"
   12    },
   13    "refresh": "1m",
   14    "templating": {
   15      "list": [
   16        {
   17          "type": "datasource",
   18          "name": "cloudwatch",
   19          "label": "CloudWatch",
   20          "query": "cloudwatch",
   21          "hide": 0
   22        },
   23        {
   24          "type": "datasource",
   25          "name": "opensearch",
   26          "label": "OpenSearch",
   27          "query": "grafana-opensearch-datasource",
   28          "hide": 0
   29        }
   30      ]
   31    },
   32    "panels": [
   33      {
   34        "type": "stat",
   35        "title": "Dependency status",
   36        "description": "external.dependency.available, Minimum: 1 available, 0 not. Fresh for a database (driver heartbeats) or an active probe; for a passive HTTP reading it is the last call's outcome, however old.",
   37        "gridPos": {
   38          "x": 0,
   39          "y": 0,
   40          "w": 24,
   41          "h": 4
   42        },
   43        "datasource": {
   44          "type": "cloudwatch",
   45          "uid": "${cloudwatch}"
   46        },
   47        "targets": [
   48          {
   49            "refId": "A",
   50            "datasource": {
   51              "type": "cloudwatch",
   52              "uid": "${cloudwatch}"
   53            },
   54            "queryMode": "Metrics",
   55            "metricQueryType": 0,
   56            "metricEditorMode": 0,
   57            "region": "default",
   58            "namespace": "<service>",
   59            "metricName": "external.dependency.available",
   60            "statistic": "Minimum",
   61            "dimensions": {
   62              "dependency": "*"
   63            },
   64            "matchExact": false,
   65            "period": "",
   66            "label": "${PROP('Dim.dependency')}"
   67          }
   68        ],
   69        "options": {
   70          "reduceOptions": {
   71            "calcs": [
   72              "lastNotNull"
   73            ]
   74          },
   75          "colorMode": "background"
   76        },
   77        "fieldConfig": {
   78          "defaults": {
   79            "mappings": [
   80              {
   81                "type": "value",
   82                "options": {
   83                  "0": {
   84                    "text": "Unavailable",
   85                    "color": "red"
   86                  },
   87                  "1": {
   88                    "text": "Available",
   89                    "color": "green"
   90                  }
   91                }
   92              }
   93            ],
   94            "thresholds": {
   95              "mode": "absolute",
   96              "steps": [
   97                {
   98                  "color": "red",
   99                  "value": null
  100                },
  101                {
  102                  "color": "green",
  103                  "value": 1
  104                }
  105              ]
  106            }
  107          },
  108          "overrides": []
  109        }
  110      },
  111      {
  112        "type": "timeseries",
  113        "title": "Calls per dependency",
  114        "description": "external.call.duration, SampleCount, per dependency and operation.",
  115        "gridPos": {
  116          "x": 0,
  117          "y": 4,
  118          "w": 12,
  119          "h": 8
  120        },
  121        "datasource": {
  122          "type": "cloudwatch",
  123          "uid": "${cloudwatch}"
  124        },
  125        "targets": [
  126          {
  127            "refId": "A",
  128            "datasource": {
  129              "type": "cloudwatch",
  130              "uid": "${cloudwatch}"
  131            },
  132            "queryMode": "Metrics",
  133            "metricQueryType": 0,
  134            "metricEditorMode": 0,
  135            "region": "default",
  136            "namespace": "<service>",
  137            "metricName": "external.call.duration",
  138            "statistic": "SampleCount",
  139            "dimensions": {
  140              "dependency": "*",
  141              "operation": "*"
  142            },
  143            "matchExact": false,
  144            "period": "",
  145            "label": "${PROP('Dim.dependency')} ${PROP('Dim.operation')}"
  146          }
  147        ],
  148        "fieldConfig": {
  149          "defaults": {
  150            "unit": "short"
  151          },
  152          "overrides": []
  153        }
  154      },
  155      {
  156        "type": "timeseries",
  157        "title": "Failed calls",
  158        "description": "external.call.failure, Sum, per dependency and operation.",
  159        "gridPos": {
  160          "x": 12,
  161          "y": 4,
  162          "w": 12,
  163          "h": 8
  164        },
  165        "datasource": {
  166          "type": "cloudwatch",
  167          "uid": "${cloudwatch}"
  168        },
  169        "targets": [
  170          {
  171            "refId": "A",
  172            "datasource": {
  173              "type": "cloudwatch",
  174              "uid": "${cloudwatch}"
  175            },
  176            "queryMode": "Metrics",
  177            "metricQueryType": 0,
  178            "metricEditorMode": 0,
  179            "region": "default",
  180            "namespace": "<service>",
  181            "metricName": "external.call.failure",
  182            "statistic": "Sum",
  183            "dimensions": {
  184              "dependency": "*",
  185              "operation": "*"
  186            },
  187            "matchExact": false,
  188            "period": "",
  189            "label": "${PROP('Dim.dependency')} ${PROP('Dim.operation')}"
  190          }
  191        ],
  192        "fieldConfig": {
  193          "defaults": {
  194            "unit": "short"
  195          },
  196          "overrides": []
  197        }
  198      },
  199      {
  200        "type": "timeseries",
  201        "title": "Failure rate",
  202        "description": "external.call.failure, Average (each call publishes 0 or 1), shown as a percentage, per dependency and operation.",
  203        "gridPos": {
  204          "x": 0,
  205          "y": 12,
  206          "w": 12,
  207          "h": 8
  208        },
  209        "datasource": {
  210          "type": "cloudwatch",
  211          "uid": "${cloudwatch}"
  212        },
  213        "targets": [
  214          {
  215            "refId": "A",
  216            "datasource": {
  217              "type": "cloudwatch",
  218              "uid": "${cloudwatch}"
  219            },
  220            "queryMode": "Metrics",
  221            "metricQueryType": 0,
  222            "metricEditorMode": 0,
  223            "region": "default",
  224            "namespace": "<service>",
  225            "metricName": "external.call.failure",
  226            "statistic": "Average",
  227            "dimensions": {
  228              "dependency": "*",
  229              "operation": "*"
  230            },
  231            "matchExact": false,
  232            "period": "",
  233            "label": "${PROP('Dim.dependency')} ${PROP('Dim.operation')}"
  234          }
  235        ],
  236        "fieldConfig": {
  237          "defaults": {
  238            "unit": "percentunit",
  239            "min": 0,
  240            "max": 1
  241          },
  242          "overrides": []
  243        }
  244      },
  245      {
  246        "type": "timeseries",
  247        "title": "Call time",
  248        "description": "external.call.duration: Average, p95 and Maximum, per dependency and operation.",
  249        "gridPos": {
  250          "x": 12,
  251          "y": 12,
  252          "w": 12,
  253          "h": 8
  254        },
  255        "datasource": {
  256          "type": "cloudwatch",
  257          "uid": "${cloudwatch}"
  258        },
  259        "targets": [
  260          {
  261            "refId": "A",
  262            "datasource": {
  263              "type": "cloudwatch",
  264              "uid": "${cloudwatch}"
  265            },
  266            "queryMode": "Metrics",
  267            "metricQueryType": 0,
  268            "metricEditorMode": 0,
  269            "region": "default",
  270            "namespace": "<service>",
  271            "metricName": "external.call.duration",
  272            "statistic": "Average",
  273            "dimensions": {
  274              "dependency": "*",
  275              "operation": "*"
  276            },
  277            "matchExact": false,
  278            "period": "",
  279            "label": "${PROP('Dim.dependency')} ${PROP('Dim.operation')} average"
  280          },
  281          {
  282            "refId": "B",
  283            "datasource": {
  284              "type": "cloudwatch",
  285              "uid": "${cloudwatch}"
  286            },
  287            "queryMode": "Metrics",
  288            "metricQueryType": 0,
  289            "metricEditorMode": 0,
  290            "region": "default",
  291            "namespace": "<service>",
  292            "metricName": "external.call.duration",
  293            "statistic": "p95",
  294            "dimensions": {
  295              "dependency": "*",
  296              "operation": "*"
  297            },
  298            "matchExact": false,
  299            "period": "",
  300            "label": "${PROP('Dim.dependency')} ${PROP('Dim.operation')} p95"
  301          },
  302          {
  303            "refId": "C",
  304            "datasource": {
  305              "type": "cloudwatch",
  306              "uid": "${cloudwatch}"
  307            },
  308            "queryMode": "Metrics",
  309            "metricQueryType": 0,
  310            "metricEditorMode": 0,
  311            "region": "default",
  312            "namespace": "<service>",
  313            "metricName": "external.call.duration",
  314            "statistic": "Maximum",
  315            "dimensions": {
  316              "dependency": "*",
  317              "operation": "*"
  318            },
  319            "matchExact": false,
  320            "period": "",
  321            "label": "${PROP('Dim.dependency')} ${PROP('Dim.operation')} slowest"
  322          }
  323        ],
  324        "fieldConfig": {
  325          "defaults": {
  326            "unit": "ms"
  327          },
  328          "overrides": []
  329        }
  330      },
  331      {
  332        "type": "timeseries",
  333        "title": "Cache hits and misses",
  334        "description": "cache.hit and cache.miss, Sum, per cache.",
  335        "gridPos": {
  336          "x": 0,
  337          "y": 20,
  338          "w": 12,
  339          "h": 8
  340        },
  341        "datasource": {
  342          "type": "cloudwatch",
  343          "uid": "${cloudwatch}"
  344        },
  345        "targets": [
  346          {
  347            "refId": "A",
  348            "datasource": {
  349              "type": "cloudwatch",
  350              "uid": "${cloudwatch}"
  351            },
  352            "queryMode": "Metrics",
  353            "metricQueryType": 0,
  354            "metricEditorMode": 0,
  355            "region": "default",
  356            "namespace": "<service>",
  357            "metricName": "cache.hit",
  358            "statistic": "Sum",
  359            "dimensions": {
  360              "cache": "*"
  361            },
  362            "matchExact": false,
  363            "period": "",
  364            "label": "${PROP('Dim.cache')} hits"
  365          },
  366          {
  367            "refId": "B",
  368            "datasource": {
  369              "type": "cloudwatch",
  370              "uid": "${cloudwatch}"
  371            },
  372            "queryMode": "Metrics",
  373            "metricQueryType": 0,
  374            "metricEditorMode": 0,
  375            "region": "default",
  376            "namespace": "<service>",
  377            "metricName": "cache.miss",
  378            "statistic": "Sum",
  379            "dimensions": {
  380              "cache": "*"
  381            },
  382            "matchExact": false,
  383            "period": "",
  384            "label": "${PROP('Dim.cache')} misses"
  385          }
  386        ],
  387        "fieldConfig": {
  388          "defaults": {
  389            "unit": "short"
  390          },
  391          "overrides": []
  392        }
  393      },
  394      {
  395        "type": "timeseries",
  396        "title": "<business-metric> by <business-dimension>",
  397        "description": "<business-metric>, Sum, per <business-dimension>.",
  398        "gridPos": {
  399          "x": 12,
  400          "y": 20,
  401          "w": 12,
  402          "h": 8
  403        },
  404        "datasource": {
  405          "type": "cloudwatch",
  406          "uid": "${cloudwatch}"
  407        },
  408        "targets": [
  409          {
  410            "refId": "A",
  411            "datasource": {
  412              "type": "cloudwatch",
  413              "uid": "${cloudwatch}"
  414            },
  415            "queryMode": "Metrics",
  416            "metricQueryType": 0,
  417            "metricEditorMode": 0,
  418            "region": "default",
  419            "namespace": "<service>",
  420            "metricName": "<business-metric>",
  421            "statistic": "Sum",
  422            "dimensions": {
  423              "<business-dimension>": "*"
  424            },
  425            "matchExact": false,
  426            "period": "",
  427            "label": "${PROP('Dim.<business-dimension>')}"
  428          }
  429        ],
  430        "fieldConfig": {
  431          "defaults": {
  432            "unit": "short"
  433          },
  434          "overrides": []
  435        }
  436      },
  437      {
  438        "type": "table",
  439        "title": "Slowest dependency calls",
  440        "description": "From the logs, not metrics: one row per external call, slowest first. event.action is <dependency>/<operation>; event.duration is a number in nanoseconds. Lucene query, not DQL.",
  441        "gridPos": {
  442          "x": 0,
  443          "y": 28,
  444          "w": 24,
  445          "h": 10
  446        },
  447        "datasource": {
  448          "type": "grafana-opensearch-datasource",
  449          "uid": "${opensearch}"
  450        },
  451        "targets": [
  452          {
  453            "refId": "A",
  454            "datasource": {
  455              "type": "grafana-opensearch-datasource",
  456              "uid": "${opensearch}"
  457            },
  458            "queryType": "lucene",
  459            "query": "event.category:\"external-call\" AND service.name:\"<service>\"",
  460            "metrics": [
  461              {
  462                "id": "1",
  463                "type": "raw_data",
  464                "settings": {
  465                  "size": "500"
  466                }
  467              }
  468            ],
  469            "bucketAggs": [],
  470            "timeField": "@timestamp"
  471          }
  472        ],
  473        "transformations": [
  474          {
  475            "id": "organize",
  476            "options": {
  477              "includeByName": {
  478                "@timestamp": true,
  479                "event.action": true,
  480                "event.outcome": true,
  481                "event.duration": true,
  482                "trace.id": true
  483              }
  484            }
  485          },
  486          {
  487            "id": "sortBy",
  488            "options": {
  489              "sort": [
  490                {
  491                  "field": "event.duration",
  492                  "desc": true
  493                }
  494              ]
  495            }
  496          }
  497        ],
  498        "fieldConfig": {
  499          "defaults": {},
  500          "overrides": [
  501            {
  502              "matcher": {
  503                "id": "byName",
  504                "options": "event.duration"
  505              },
  506              "properties": [
  507                {
  508                  "id": "unit",
  509                  "value": "ns"
  510                }
  511              ]
  512            }
  513          ]
  514        }
  515      },
  516      {
  517        "type": "timeseries",
  518        "title": "<timed-name>",
  519        "description": "@Timed(\"<timed-name>\"), published by EmfMeterRegistry: one value per call, in milliseconds, with the timer's tags (class, method, exception) as dimensions. Calls is SampleCount; Average, p95 and Slowest are over the calls in each period.",
  520        "gridPos": {
  521          "x": 0,
  522          "y": 38,
  523          "w": 12,
  524          "h": 8
  525        },
  526        "datasource": {
  527          "type": "cloudwatch",
  528          "uid": "${cloudwatch}"
  529        },
  530        "targets": [
  531          {
  532            "refId": "A",
  533            "datasource": {
  534              "type": "cloudwatch",
  535              "uid": "${cloudwatch}"
  536            },
  537            "queryMode": "Metrics",
  538            "metricQueryType": 0,
  539            "metricEditorMode": 0,
  540            "region": "default",
  541            "namespace": "<service>",
  542            "metricName": "<timed-name>",
  543            "statistic": "Average",
  544            "dimensions": {
  545              "class": "*",
  546              "method": "*",
  547              "exception": "*"
  548            },
  549            "matchExact": false,
  550            "period": "",
  551            "label": "Average ${PROP('Dim.exception')}"
  552          },
  553          {
  554            "refId": "B",
  555            "datasource": {
  556              "type": "cloudwatch",
  557              "uid": "${cloudwatch}"
  558            },
  559            "queryMode": "Metrics",
  560            "metricQueryType": 0,
  561            "metricEditorMode": 0,
  562            "region": "default",
  563            "namespace": "<service>",
  564            "metricName": "<timed-name>",
  565            "statistic": "p95",
  566            "dimensions": {
  567              "class": "*",
  568              "method": "*",
  569              "exception": "*"
  570            },
  571            "matchExact": false,
  572            "period": "",
  573            "label": "p95 ${PROP('Dim.exception')}"
  574          },
  575          {
  576            "refId": "C",
  577            "datasource": {
  578              "type": "cloudwatch",
  579              "uid": "${cloudwatch}"
  580            },
  581            "queryMode": "Metrics",
  582            "metricQueryType": 0,
  583            "metricEditorMode": 0,
  584            "region": "default",
  585            "namespace": "<service>",
  586            "metricName": "<timed-name>",
  587            "statistic": "Maximum",
  588            "dimensions": {
  589              "class": "*",
  590              "method": "*",
  591              "exception": "*"
  592            },
  593            "matchExact": false,
  594            "period": "",
  595            "label": "Slowest ${PROP('Dim.exception')}"
  596          },
  597          {
  598            "refId": "D",
  599            "datasource": {
  600              "type": "cloudwatch",
  601              "uid": "${cloudwatch}"
  602            },
  603            "queryMode": "Metrics",
  604            "metricQueryType": 0,
  605            "metricEditorMode": 0,
  606            "region": "default",
  607            "namespace": "<service>",
  608            "metricName": "<timed-name>",
  609            "statistic": "SampleCount",
  610            "dimensions": {
  611              "class": "*",
  612              "method": "*",
  613              "exception": "*"
  614            },
  615            "matchExact": false,
  616            "period": "",
  617            "label": "Calls ${PROP('Dim.exception')}"
  618          }
  619        ],
  620        "fieldConfig": {
  621          "defaults": {
  622            "unit": "ms",
  623            "min": 0
  624          },
  625          "overrides": [
  626            {
  627              "matcher": {
  628                "id": "byFrameRefID",
  629                "options": "D"
  630              },
  631              "properties": [
  632                {
  633                  "id": "unit",
  634                  "value": "short"
  635                },
  636                {
  637                  "id": "custom.axisPlacement",
  638                  "value": "right"
  639                }
  640              ]
  641            }
  642          ]
  643        }
  644      }
  645    ]
  646  }
```

## File: `.claude/skills/service-observability/references/ALERTS.md`

### Diff

```diff
diff --git a/.claude/skills/service-observability/references/ALERTS.md b/.claude/skills/service-observability/references/ALERTS.md
index 397e88ca..656297cc 100644
--- a/.claude/skills/service-observability/references/ALERTS.md
+++ b/.claude/skills/service-observability/references/ALERTS.md
@@ -2,10 +2,10 @@ Build the service's custom alerts, route them to Slack, promote them and
 prove they fire. Parent-loaded: path and Bash rules come from
 `SKILL.md`.
 
-The alerts were first built and fired in dev for reference-data
-(EUDPA-632, 2026-10-22). None has been routed to Slack or promoted yet.
-Each fact that comes only from the CDP monitoring docs is marked
-`[UNPROVEN]`.
+`SKILL.md` → "What is proven" says which parts have been done on a real
+service. `[UNPROVEN]` These dot-case rules, rule 1a among them, have not
+been built or fired anywhere. Each fact that comes only from the CDP
+monitoring docs is marked `[UNPROVEN]`.
 
 The developer builds the alerts by hand in Grafana, from a build sheet
 Claude writes. Nothing can push them for us: writing to the dev Grafana
@@ -61,24 +61,39 @@ agree, not tested values.
 
 | Alert | Fires when | If there is no data |
 |---|---|---|
-| Dependency unavailable | `ExternalCallFailure`, `Minimum`, equal to 1 over 5 minutes (every call in the window failed), per `Dependency` and `Operation` | Normal |
-| Dependency calls failing | `ExternalCallFailure`, `Sum`, 3 or more over 15 minutes, per `Dependency` and `Operation` | Normal |
-| Dependency slow | `ExternalCallDuration`, `p95`, above two thirds of the call's read timeout, over 15 minutes, per `Dependency` and `Operation` | Normal |
-
-**Query every alert by `Dependency` and `Operation`.** Both external
-call metrics are published with that one dimension set (`METRICS.md` →
-"One dimension set per metric"), and CloudWatch does not add up across
-a dimension a metric was published with, so a query on `Dependency`
-alone finds no data. With "no data" set to Normal, that alert would
-never fire and nobody would know. Each alert has one series per
-dependency and operation, and the thresholds above apply to each series.
-
-**Do not alert on `DependencyAvailable`.** It reports the outcome of
-the last call, however old. Behind a cache it can read 1 for up to the
-cache lifetime after the dependency goes down, and one failed call holds
-it at 0 until the next call succeeds. It is for the dashboard. The
-"Dependency unavailable" alert uses `ExternalCallFailure` instead, which
-only reports calls that happened in the window.
+| Dependency unavailable | `external.call.failure`, `Minimum`, equal to 1 over 5 minutes (every call in the window failed), per `dependency` and `operation` | Normal |
+| Database unavailable (which rules a service with a database gets: `assets/alerts.template.md` → "Check") | `external.dependency.available`, `Maximum`, below 1 over 5 minutes (every reading from every task said down), `dependency` = the database | Normal |
+| Dependency calls failing | `external.call.failure`, `Sum`, 3 or more over 15 minutes, per `dependency` and `operation` | Normal |
+| Dependency slow | `external.call.duration`, `p95`, above two thirds of the call's read timeout, over 15 minutes, per `dependency` and `operation` | Normal |
+
+**Query every call alert by `dependency` and `operation`.** Both
+external call metrics are published with that one dimension set
+(`METRICS.md` → "One dimension set per metric"), and CloudWatch does not
+add up across a dimension a metric was published with, so a query on
+`dependency` alone finds no data. With "no data" set to Normal, that
+alert would never fire and nobody would know. Each call alert has one
+series per dependency and operation, and the thresholds above apply to
+each series.
+
+**The database alert is the one exception: query it by `dependency`
+alone.** `external.dependency.available` is published with `dependency` as its only
+dimension, so adding `operation` to its query finds no data in the same
+way.
+
+**Do not alert on `external.dependency.available` for an HTTP dependency.** It is
+for the dashboard. The "Dependency unavailable" alert uses
+`external.call.failure` instead, which only reports calls that happened in
+the window. `METRICS.md` → "Availability: passive or active" says why,
+for a passive reading and an active probe both.
+
+**Do alert on it for a database.** A database's `external.dependency.available`
+comes from the driver's heartbeats every 10 seconds (`METRICS.md` → "A
+database"), so it is fresh. And a database's outage barely shows in
+`external.call.failure`: only a command already sent when the
+connection drops is recorded as a failure. A command that cannot reach
+a server fails before it is sent and is not recorded. Use `Maximum`, so
+the alert fires only when every task saw the database down for the
+whole window, not on one task's passing failure.
 
 **Never set "no data" to Alerting on these.** Calls only happen when a
 request needs the dependency, so nothing is published until the first
@@ -89,9 +104,10 @@ Normal, or Keep Last State.
 Only alert on a dependency the service really uses. A configured
 database counts (`METRICS.md` → "A database").
 
-**The alerts cannot see an outage nobody calls through.** If the
+**The call alerts cannot see an outage nobody calls through.** If the
 service and its callers are serving from caches, no call reaches the
-dependency, so no alert fires. On reference-data, a frontend instance
+dependency, so no call alert fires. The database alert is different: it
+reads the driver's own monitoring, which runs with no calls at all. On reference-data, a frontend instance
 that has loaded its countries and ports never asks again, so an MDM
 outage only shows once a frontend restarts or a request misses
 reference-data's 60-minute cache. Users are not affected until then
@@ -145,8 +161,10 @@ An alert that has never fired is not known to work. For each alert, in
 dev and then in test, watch it fire, reach the Slack channel, and
 resolve.
 
-**Make the calls yourself.** The alerts only see dependency calls that
-happened, and few happen on their own:
+**Make the calls yourself.** The call alerts only see dependency calls
+that happened, and few happen on their own (the database alert needs no
+calls: its gauge is published every minute once the driver has checked
+the database):
 
 - The service calls a dependency only on a cache miss: after a deploy,
   or once per cache lifetime (60 minutes for reference-data's MDM
@@ -182,25 +200,42 @@ service.name:"<service>"` in OpenSearch shows one line per failed call.
 - **Dev, every rule: lower the threshold.** Change the condition so
   ordinary traffic breaks it, wait for Firing, check the summary shows
   the dependency and operation (not blanks), then put the threshold
-  back and watch it return to Normal. With no failures the failure
-  metrics read 0, so use `IS ABOVE -1` for "unavailable" and "calls
-  failing", and `IS ABOVE 0` for "slow". Once Slack routing is in
+  back and watch it return to Normal. The database alert's summary has
+  no labels: it shows the database name as written in the rule. With
+  no failures the failure metrics read 0, so use `IS ABOVE -1` for "unavailable" and "calls
+  failing", and `IS ABOVE 0` for "slow". A healthy database reads 1, so
+  use `IS BELOW 2` for the database alert. Once Slack routing is in
   place, also check the alert arrives in
   `trade-imports-team-alerts-non-prod`.
-- **Dev, the failure rules: a real failure.** Set the dependency's URL
+- **Dev, the database alert: no real failure.** Pointing the service at
+  a database that does not exist stops it starting (address-book needs
+  its database to build indexes), so no task publishes the gauge and the
+  rule stays Normal on no data. The lowered threshold is enough.
+- **Dev, the call failure rules: a real failure.** Set the dependency's URL
   in the Portal (for reference-data's MDM, `MDM_SERVICE_URL`) to an
   address that does not exist, such as `https://mdm.invalid`, redeploy,
   and run the loop above. "Unavailable" and "calls failing" fire for
   that dependency only. Done on reference-data on 2026-10-22: both
   fired for `mdm` after a dead-end `MDM_SERVICE_URL` and the loop run
-  from the Portal terminal. Restore the URL and redeploy. This breaks the service in dev
-  for everyone while it runs, so agree a time with the team. "Slow"
-  has no practical real test; the lowered threshold is enough.
-- **Test.** `[UNPROVEN]` The alert is read-only there, so the failure
-  has to be real. One way: deploy briefly with a wrong URL or key for
+  from the Portal terminal. Restore the URL and redeploy. This breaks
+  the service in dev for everyone while it runs, so agree a time with
+  the team. "Slow" has no practical real test; the lowered threshold is
+  enough.
+- **Test, the call failure rules.** `[UNPROVEN]` The alert is
+  read-only there, so the failure has to be real. One way: deploy briefly with a wrong URL or key for
   the dependency, then call the service. This breaks the service for
   everyone using test while it runs. Agree the method and a time with
   the team and the testers first.
+- **Test, the database alert.** `[UNPROVEN]` A wrong database address
+  does not work here either: the service does not start, so no task
+  publishes the gauge and the rule stays Normal. The database has to go
+  away from a task that is already running, and this skill knows no way
+  to do that on CDP. Ask #cdp-support: "Can a running task in test lose
+  its database for 10 minutes, for example by revoking its access, so
+  we can watch an alert fire?" Until they answer, the evidence is the
+  dev Firing from the lowered threshold, plus the same rule shown in
+  test after promotion. Record it on the ticket as not fired in test,
+  and why.
 - **Prod.** Proven by the first prod deploy that follows, not by
   breaking prod.
 
```

### File at the reviewed commit, with line numbers

```markdown
    1  Build the service's custom alerts, route them to Slack, promote them and
    2  prove they fire. Parent-loaded: path and Bash rules come from
    3  `SKILL.md`.
    4  
    5  `SKILL.md` → "What is proven" says which parts have been done on a real
    6  service. `[UNPROVEN]` These dot-case rules, rule 1a among them, have not
    7  been built or fired anywhere. Each fact that comes only from the CDP
    8  monitoring docs is marked `[UNPROVEN]`.
    9  
   10  The developer builds the alerts by hand in Grafana, from a build sheet
   11  Claude writes. Nothing can push them for us: writing to the dev Grafana
   12  needs a signed-in Editor and CDP issues no service-account tokens (see
   13  `DASHBOARD.md`). `[UNPROVEN]` Grafana's UI has no import for
   14  Grafana-managed alert rules; if a run finds one, add an importable
   15  template beside the build sheet and record it here.
   16  
   17  Claude writes the sheet to
   18  `~/git/defra/trade-imports-workspace/workareas/ticket-planning/<ticket>/grafana/alerts.md`
   19  by copying `assets/alerts.template.md` and filling in:
   20  
   21  - `<service>`;
   22  - `<read-timeout-ms>` and `<slow-threshold-ms>` (two thirds of it) for
   23    each dependency, from the read timeout its client actually applies.
   24    Read the client code, not just the config: on reference-data the YAML
   25    sets `readTimeout: 3000`, but the Feign clients have no
   26    `Request.Options`, so Feign's 60 second default applies. If
   27    dependencies differ, split "dependency slow" into one rule per
   28    dependency, as the sheet says.
   29  
   30  The build sheet and the table below must agree; a change to one is a
   31  change to both.
   32  
   33  ## Build
   34  
   35  | Thing | Value |
   36  |---|---|
   37  | Folder | `Playground/<service>-monitoring` (seen on reference-data; see `DASHBOARD.md`) |
   38  | Evaluation group | `<service>-advanced-alerts` |
   39  
   40  The folder and evaluation group already exist, holding one alert named
   41  `platform_managed_do_not_delete` (seen 2026-10-15 for reference-data and
   42  animals-backend). Leave that alert alone. `[UNPROVEN]` The alerts must
   43  be in that evaluation group; it evaluates every 5 minutes. No labels are
   44  needed: promotion adds them.
   45  
   46  What the form does, seen building reference-data's alerts on
   47  2026-10-19:
   48  
   49  - It opens in a simplified mode: the condition is one row under the
   50    query, "WHEN QUERY `Last` IS ABOVE …". The Advanced options toggle
   51    shows the same thing as Reduce and Threshold expressions.
   52  - The pending period must be None or at least the group's evaluation
   53    interval. `1m` was refused with "Pending period must be greater than
   54    or equal to the evaluation interval". Use None: each rule already
   55    looks at a whole window.
   56  - Each alert is its own rule with one condition. Build the first, then
   57    make the others with More → Duplicate.
   58  
   59  Starting alerts. The thresholds are a first guess for the team to
   60  agree, not tested values.
   61  
   62  | Alert | Fires when | If there is no data |
   63  |---|---|---|
   64  | Dependency unavailable | `external.call.failure`, `Minimum`, equal to 1 over 5 minutes (every call in the window failed), per `dependency` and `operation` | Normal |
   65  | Database unavailable (which rules a service with a database gets: `assets/alerts.template.md` → "Check") | `external.dependency.available`, `Maximum`, below 1 over 5 minutes (every reading from every task said down), `dependency` = the database | Normal |
   66  | Dependency calls failing | `external.call.failure`, `Sum`, 3 or more over 15 minutes, per `dependency` and `operation` | Normal |
   67  | Dependency slow | `external.call.duration`, `p95`, above two thirds of the call's read timeout, over 15 minutes, per `dependency` and `operation` | Normal |
   68  
   69  **Query every call alert by `dependency` and `operation`.** Both
   70  external call metrics are published with that one dimension set
   71  (`METRICS.md` → "One dimension set per metric"), and CloudWatch does not
   72  add up across a dimension a metric was published with, so a query on
   73  `dependency` alone finds no data. With "no data" set to Normal, that
   74  alert would never fire and nobody would know. Each call alert has one
   75  series per dependency and operation, and the thresholds above apply to
   76  each series.
   77  
   78  **The database alert is the one exception: query it by `dependency`
   79  alone.** `external.dependency.available` is published with `dependency` as its only
   80  dimension, so adding `operation` to its query finds no data in the same
   81  way.
   82  
   83  **Do not alert on `external.dependency.available` for an HTTP dependency.** It is
   84  for the dashboard. The "Dependency unavailable" alert uses
   85  `external.call.failure` instead, which only reports calls that happened in
   86  the window. `METRICS.md` → "Availability: passive or active" says why,
   87  for a passive reading and an active probe both.
   88  
   89  **Do alert on it for a database.** A database's `external.dependency.available`
   90  comes from the driver's heartbeats every 10 seconds (`METRICS.md` → "A
   91  database"), so it is fresh. And a database's outage barely shows in
   92  `external.call.failure`: only a command already sent when the
   93  connection drops is recorded as a failure. A command that cannot reach
   94  a server fails before it is sent and is not recorded. Use `Maximum`, so
   95  the alert fires only when every task saw the database down for the
   96  whole window, not on one task's passing failure.
   97  
   98  **Never set "no data" to Alerting on these.** Calls only happen when a
   99  request needs the dependency, so nothing is published until the first
  100  call after start-up, and the metrics go quiet while a cache is warm.
  101  "No data → Alerting" would alert the team after every deploy. Use
  102  Normal, or Keep Last State.
  103  
  104  Only alert on a dependency the service really uses. A configured
  105  database counts (`METRICS.md` → "A database").
  106  
  107  **The call alerts cannot see an outage nobody calls through.** If the
  108  service and its callers are serving from caches, no call reaches the
  109  dependency, so no call alert fires. The database alert is different: it
  110  reads the driver's own monitoring, which runs with no calls at all. On reference-data, a frontend instance
  111  that has loaded its countries and ports never asks again, so an MDM
  112  outage only shows once a frontend restarts or a request misses
  113  reference-data's 60-minute cache. Users are not affected until then
  114  either, but say so on the ticket so nobody reads a quiet alert as
  115  proof the dependency is up.
  116  
  117  ## Route to Slack
  118  
  119  The team's channels are shared across services:
  120  
  121  | Environment | Channel |
  122  |---|---|
  123  | dev, test | `trade-imports-team-alerts-non-prod` |
  124  | prod | `trade-imports-team-alerts-prod` |
  125  
  126  1. Check both channels exist and are public.
  127  2. Ask #cdp-support to route the service's alerts, default and custom,
  128     to these two channels.
  129  
  130  `[UNPROVEN]` CDP's docs expect one pair of channels per service, named
  131  `<service>-team-alerts-non-prod` and `<service>-team-alerts-prod`. These
  132  are shared team channels with a different name. Ask #cdp-support to
  133  confirm that works, and record the answer here: it decides the routing
  134  for every service that follows.
  135  
  136  `[UNPROVEN]` Where alerts from perf-test and ext-test go. Assumed
  137  non-prod.
  138  
  139  `[UNPROVEN]` If the team asked for email as well (Step 2), make that
  140  request to #cdp-support at the same time.
  141  
  142  ## Promote
  143  
  144  Alerts are promoted to test and prod by asking #cdp-support. Use the
  145  request template in the CDP monitoring how-to, naming the owning
  146  service.
  147  
  148  `[UNPROVEN]` Three things the docs say, to know before asking. Confirm
  149  each with #cdp-support on the first promotion:
  150  
  151  - **Promotion copies every alert in the evaluation group.** Remove
  152    experiments first.
  153  - **Deleting a promoted alert in dev deletes it everywhere** on the next
  154    promotion. Do not delete promoted alerts to tidy up.
  155  - **Promoted alerts are read-only in test and prod.** Every later change
  156    is: edit in dev, then ask #cdp-support to promote again.
  157  
  158  ## Prove they fire
  159  
  160  An alert that has never fired is not known to work. For each alert, in
  161  dev and then in test, watch it fire, reach the Slack channel, and
  162  resolve.
  163  
  164  **Make the calls yourself.** The call alerts only see dependency calls
  165  that happened, and few happen on their own (the database alert needs no
  166  calls: its gauge is published every minute once the driver has checked
  167  the database):
  168  
  169  - The service calls a dependency only on a cache miss: after a deploy,
  170    or once per cache lifetime (60 minutes for reference-data's MDM
  171    cache).
  172  - Its callers may cache too. The animals frontend loads countries and
  173    ports of entry from reference-data once per instance and never
  174    refreshes them, so reference-data gets requests only after a frontend
  175    instance starts.
  176  - E2E tests are not a source of traffic. The GitHub Actions runs use the
  177    local Docker stack, whose metrics go to the local AWS stand-in, not
  178    CloudWatch. The CDP Portal runs call the real services, but through
  179    the caches above, so they make a handful of calls at most.
  180  
  181  So before each test, redeploy the service in dev, then call its
  182  endpoints directly (for reference-data, `GET /countries` and
  183  `GET /ports-of-entry`). Allow about 10 minutes for the metrics to reach
  184  CloudWatch and the group to evaluate.
  185  
  186  **Call from the CDP Portal terminal, not a laptop.** From a laptop,
  187  `https://<service>.dev.cdp-int.defra.cloud/...` returns `403` in about
  188  60 ms from CDP's edge, and the request never reaches the service (seen
  189  2026-10-22). The Portal terminal for the service in dev can reach it.
  190  Six rounds, 30 seconds apart:
  191  
  192  ```bash
  193  for i in 1 2 3 4 5 6; do printf '%s  ' "$(date +%T)"; curl -s -o /dev/null -w 'countries %{http_code}  ' https://trade-imports-reference-data.dev.cdp-int.defra.cloud/countries; curl -s -o /dev/null -w 'ports %{http_code}\n' https://trade-imports-reference-data.dev.cdp-int.defra.cloud/ports-of-entry; sleep 30; done
  194  ```
  195  
  196  Check the calls happened before waiting on an alert:
  197  `event.category:"external-call" AND event.outcome:"failure" AND
  198  service.name:"<service>"` in OpenSearch shows one line per failed call.
  199  
  200  - **Dev, every rule: lower the threshold.** Change the condition so
  201    ordinary traffic breaks it, wait for Firing, check the summary shows
  202    the dependency and operation (not blanks), then put the threshold
  203    back and watch it return to Normal. The database alert's summary has
  204    no labels: it shows the database name as written in the rule. With
  205    no failures the failure metrics read 0, so use `IS ABOVE -1` for "unavailable" and "calls
  206    failing", and `IS ABOVE 0` for "slow". A healthy database reads 1, so
  207    use `IS BELOW 2` for the database alert. Once Slack routing is in
  208    place, also check the alert arrives in
  209    `trade-imports-team-alerts-non-prod`.
  210  - **Dev, the database alert: no real failure.** Pointing the service at
  211    a database that does not exist stops it starting (address-book needs
  212    its database to build indexes), so no task publishes the gauge and the
  213    rule stays Normal on no data. The lowered threshold is enough.
  214  - **Dev, the call failure rules: a real failure.** Set the dependency's URL
  215    in the Portal (for reference-data's MDM, `MDM_SERVICE_URL`) to an
  216    address that does not exist, such as `https://mdm.invalid`, redeploy,
  217    and run the loop above. "Unavailable" and "calls failing" fire for
  218    that dependency only. Done on reference-data on 2026-10-22: both
  219    fired for `mdm` after a dead-end `MDM_SERVICE_URL` and the loop run
  220    from the Portal terminal. Restore the URL and redeploy. This breaks
  221    the service in dev for everyone while it runs, so agree a time with
  222    the team. "Slow" has no practical real test; the lowered threshold is
  223    enough.
  224  - **Test, the call failure rules.** `[UNPROVEN]` The alert is
  225    read-only there, so the failure has to be real. One way: deploy briefly with a wrong URL or key for
  226    the dependency, then call the service. This breaks the service for
  227    everyone using test while it runs. Agree the method and a time with
  228    the team and the testers first.
  229  - **Test, the database alert.** `[UNPROVEN]` A wrong database address
  230    does not work here either: the service does not start, so no task
  231    publishes the gauge and the rule stays Normal. The database has to go
  232    away from a task that is already running, and this skill knows no way
  233    to do that on CDP. Ask #cdp-support: "Can a running task in test lose
  234    its database for 10 minutes, for example by revoking its access, so
  235    we can watch an alert fire?" Until they answer, the evidence is the
  236    dev Firing from the lowered threshold, plus the same rule shown in
  237    test after promotion. Record it on the ticket as not fired in test,
  238    and why.
  239  - **Prod.** Proven by the first prod deploy that follows, not by
  240    breaking prod.
  241  
  242  Record on the ticket which alerts fired, where, and when.
```

## File: `.claude/skills/service-observability/references/DASHBOARD.md`

### Diff

```diff
diff --git a/.claude/skills/service-observability/references/DASHBOARD.md b/.claude/skills/service-observability/references/DASHBOARD.md
index 6577b475..7872440f 100644
--- a/.claude/skills/service-observability/references/DASHBOARD.md
+++ b/.claude/skills/service-observability/references/DASHBOARD.md
@@ -1,9 +1,10 @@
 Build the service's custom Grafana dashboard in the CDP dev playground.
 Parent-loaded: path and Bash rules come from `SKILL.md`.
 
-The template was first imported for reference-data (EUDPA-632). Each
-fact that comes only from the CDP monitoring docs is marked
-`[UNPROVEN]`.
+`SKILL.md` → "What is proven" says which parts have been done on a real
+service. `[UNPROVEN]` This dot-case template has not been imported
+anywhere. Each fact that comes only from the CDP monitoring docs is
+marked `[UNPROVEN]`.
 
 Claude generates the dashboard JSON from
 `assets/dashboard.template.json`; the developer imports it in Grafana.
@@ -59,20 +60,39 @@ listing the values.
 
 | Panel | Metric | Statistic | Split by |
 |---|---|---|---|
-| Dependency status, one value per dependency | `DependencyAvailable` | `Minimum` | `Dependency` |
-| Calls per dependency | `ExternalCallDuration` | `SampleCount` | `Dependency`, `Operation` |
-| Failed calls | `ExternalCallFailure` | `Sum` | `Dependency`, `Operation` |
-| Failure rate | `ExternalCallFailure` | `Average`, times 100 | `Dependency`, `Operation` |
-| Call time: average, 95th percentile, slowest | `ExternalCallDuration` | `Average`, `p95`, `Maximum` | `Dependency`, `Operation` |
-| Cache hits and misses | `CacheHit`, `CacheMiss` | `Sum` | `Cache` |
+| Dependency status, one value per dependency | `external.dependency.available` | `Minimum` | `dependency` |
+| Calls per dependency | `external.call.duration` | `SampleCount` | `dependency`, `operation` |
+| Failed calls | `external.call.failure` | `Sum` | `dependency`, `operation` |
+| Failure rate | `external.call.failure` | `Average`, with the percent (0-1) unit | `dependency`, `operation` |
+| Call time: average, 95th percentile, slowest | `external.call.duration` | `Average`, `p95`, `Maximum` | `dependency`, `operation` |
+| Cache hits and misses | `cache.hit`, `cache.miss` | `Sum` | `cache` |
 | Business events | the service's own metric | `Sum` | its dimension |
 
-Use `Minimum` for `DependencyAvailable`. With more than one task, each
+Use `Minimum` for `external.dependency.available`. With more than one task, each
 publishes its own value, and `Minimum` shows a single unhealthy task.
 
 Split each panel by every dimension its metric is published with, as in
 the table. CloudWatch does not add up across a published dimension, so
-a panel on `ExternalCallFailure` split by `Dependency` alone is empty.
+a panel on `external.call.failure` split by `dependency` alone is empty.
+
+One more panel per `@Timed("<name>")` annotation in the service's
+`src/main` (`METRICS.md` → "Publish" puts one on every controller
+endpoint and public service method). `EmfMeterRegistry` publishes each
+timer as the metric `<name>`, one value per call in milliseconds, with
+the `@Timed` tags `class`, `method` and `exception` as dimensions.
+
+| Panel title | Series | Query |
+|---|---|---|
+| `<timed-name>` | Average, p95, Slowest | `<timed-name>`, `Average`, `p95`, `Maximum` (ms) |
+| | Calls | `<timed-name>`, `SampleCount`, on the right axis |
+
+Every query sets all three dimensions, `class`, `method` and
+`exception`, each to `*`, as the template does: a query missing one finds
+no data. Each series is labelled by `exception`, so failed calls show
+apart from `none`. A timer registered in code (`meterRegistry.timer("…")`)
+publishes with its own tags as dimensions, not `class`, `method` and
+`exception`. Give it a panel only if the team asks: copy `<timed-name>`
+and set the dimensions to that timer's tags, each to `*`.
 
 One panel reads logs, not metrics:
 
@@ -88,11 +108,14 @@ nested object with a numeric `event.duration` (`LOGGING.md` → "How to
 write the fields"). CDP drops the flat MDC form.
 
 The dimension values for the service come from its code. For
-reference-data: `Dependency` is `mdm` or `trade-token`; `Cache` is
-`MDM_COUNTRIES_CACHE` or `MDM_POE_CACHE`; `LookupType` is `countries` or
-`ports-of-entry`. A service with a database also has its ping
-(`METRICS.md` → "A database"), for example `Dependency` `mongodb` with
-`Operation` `ping`.
+reference-data, once moved to the dot-case names (it publishes the old
+ones until then: `METRICS.md` → "A service built the old way"):
+`dependency` is `mdm` or `trade-token`; `cache` is
+`MDM_COUNTRIES_CACHE` or `MDM_POE_CACHE`; `lookup.type` is `countries` or
+`ports-of-entry`. A service with a database has `dependency` `mongodb`,
+its status from the driver's heartbeats and, if its commands are
+measured, an `operation` from a fixed set of command names, with every
+other command as `other` (`METRICS.md` → "A database").
 
 ## Generate
 
@@ -105,12 +128,29 @@ Claude writes the service's dashboard to
    `namespace` fields and the name everywhere else.
 3. Make one copy of the `<business-metric> by <business-dimension>`
    panel per business metric on the agreed list (Step 2), filling in the
-   metric and its dimension, and laying each copy out on the grid. Delete
-   the panel if there are none.
+   metric and its dimension everywhere they appear in the panel (the
+   title, description, `metricName`, `dimensions` and the legend
+   `label`), and laying
+   each copy out on the grid. Delete the panel if there are none.
 4. Delete "Cache hits and misses" if the service has no cache.
-5. Check the result is valid JSON (`jq empty <file>`) and that no
-   placeholder is left (`grep -nE '<service>|<business-' <file>` finds
-   nothing).
+5. List the service's `@Timed` names, in one command:
+   `grep -rhoE --include='*.java' --exclude-dir=target --exclude-dir=node_modules --exclude-dir=test '@Timed\((value *= *)?"[^"]+"' <repo>`.
+   Each line is `@Timed("<name>"`; the name is between the quotes. No
+   output means the service has no timers, a Node service included:
+   delete the panel.
+   Otherwise make one copy of the `<timed-name>` panel per name, replacing
+   `<timed-name>` everywhere in the copy (title, description and each
+   `metricName`), and lay the copies out two to a row from the template
+   panel's position down. Where a controller and a service time the same
+   operation (`controller.list.time`,
+   `service.list.time`), put the pair on one row, controller on
+   the left, so the time spent outside the service reads across. Check
+   each name is let through the
+   service's `management.metrics.enable` allowlist (`METRICS.md` →
+   "Rules"); a denied timer publishes nothing.
+6. Check the result is valid JSON (`jq empty <file>`) and that no
+   placeholder is left (`grep -nE '<service>|<business-|<timed-' <file>`
+   finds nothing).
 
 ## Import
 
```

### File at the reviewed commit, with line numbers

```markdown
    1  Build the service's custom Grafana dashboard in the CDP dev playground.
    2  Parent-loaded: path and Bash rules come from `SKILL.md`.
    3  
    4  `SKILL.md` → "What is proven" says which parts have been done on a real
    5  service. `[UNPROVEN]` This dot-case template has not been imported
    6  anywhere. Each fact that comes only from the CDP monitoring docs is
    7  marked `[UNPROVEN]`.
    8  
    9  Claude generates the dashboard JSON from
   10  `assets/dashboard.template.json`; the developer imports it in Grafana.
   11  Nothing can push to Grafana for us: anyone on the network can read the
   12  dev Grafana API without signing in, but writing needs Editor rights, and
   13  CDP does not issue service-account tokens. So the import is always done
   14  by a signed-in person. (Checked 2026-10-15: an anonymous search returned
   15  200, an anonymous create returned 403 `dashboards:create`.)
   16  
   17  ## Before starting
   18  
   19  The metrics must be deployed to dev and arriving. A dev service that
   20  nobody calls shows nothing, so drive some requests first. Where a cache
   21  sits in front of a dependency, calls to it only happen on a cache miss:
   22  after a deploy, or once per cache lifetime.
   23  
   24  Expect the dashboard to be mostly empty in dev. Callers may cache as
   25  well: the animals frontend loads reference-data's countries and ports
   26  once per instance and never refreshes them. E2E tests add little: the
   27  GitHub Actions runs use the local Docker stack, whose metrics never
   28  reach CloudWatch, and the CDP Portal runs go through the same caches. To
   29  see data, redeploy the service and call its endpoints directly
   30  (`ALERTS.md` → "Prove they fire").
   31  
   32  ## Where and what to call it
   33  
   34  | Thing | Value |
   35  |---|---|
   36  | Grafana | `https://metrics.dev.cdp-int.defra.cloud/` |
   37  | Folder | `Playground/<service>-monitoring`. Seen on reference-data: `trade-imports-reference-data-monitoring` (uid `afkd0b2ef9m9se`) in `Playground` (uid `afgzyqk5orl6oc`) |
   38  | Name | `<service> (custom)` |
   39  
   40  `[UNPROVEN]` The name may only use letters, numbers, spaces, hyphens and
   41  brackets. CDP will not promote a dashboard whose name has other characters, such
   42  as `! @ # $ % & _`. The text in brackets is free.
   43  
   44  ## Panels
   45  
   46  `assets/dashboard.template.json` holds these panels. A change to this
   47  table is a change to the template, and the reverse.
   48  
   49  CloudWatch, namespace `<service>` (the service's `aws.emf.namespace`,
   50  which defaults to the service name). The template picks its data
   51  sources through two dashboard variables, `cloudwatch` and `opensearch`,
   52  so it carries no data source ids. The OpenSearch variable's plugin type,
   53  `grafana-opensearch-datasource`, works (the log panel showed data on
   54  reference-data, 2026-10-21). `[UNPROVEN]` that the CloudWatch region
   55  `default` is right for CDP.
   56  
   57  Every CloudWatch query uses `*` for each dimension with "match exact"
   58  off, so a panel shows one series per published combination without
   59  listing the values.
   60  
   61  | Panel | Metric | Statistic | Split by |
   62  |---|---|---|---|
   63  | Dependency status, one value per dependency | `external.dependency.available` | `Minimum` | `dependency` |
   64  | Calls per dependency | `external.call.duration` | `SampleCount` | `dependency`, `operation` |
   65  | Failed calls | `external.call.failure` | `Sum` | `dependency`, `operation` |
   66  | Failure rate | `external.call.failure` | `Average`, with the percent (0-1) unit | `dependency`, `operation` |
   67  | Call time: average, 95th percentile, slowest | `external.call.duration` | `Average`, `p95`, `Maximum` | `dependency`, `operation` |
   68  | Cache hits and misses | `cache.hit`, `cache.miss` | `Sum` | `cache` |
   69  | Business events | the service's own metric | `Sum` | its dimension |
   70  
   71  Use `Minimum` for `external.dependency.available`. With more than one task, each
   72  publishes its own value, and `Minimum` shows a single unhealthy task.
   73  
   74  Split each panel by every dimension its metric is published with, as in
   75  the table. CloudWatch does not add up across a published dimension, so
   76  a panel on `external.call.failure` split by `dependency` alone is empty.
   77  
   78  One more panel per `@Timed("<name>")` annotation in the service's
   79  `src/main` (`METRICS.md` → "Publish" puts one on every controller
   80  endpoint and public service method). `EmfMeterRegistry` publishes each
   81  timer as the metric `<name>`, one value per call in milliseconds, with
   82  the `@Timed` tags `class`, `method` and `exception` as dimensions.
   83  
   84  | Panel title | Series | Query |
   85  |---|---|---|
   86  | `<timed-name>` | Average, p95, Slowest | `<timed-name>`, `Average`, `p95`, `Maximum` (ms) |
   87  | | Calls | `<timed-name>`, `SampleCount`, on the right axis |
   88  
   89  Every query sets all three dimensions, `class`, `method` and
   90  `exception`, each to `*`, as the template does: a query missing one finds
   91  no data. Each series is labelled by `exception`, so failed calls show
   92  apart from `none`. A timer registered in code (`meterRegistry.timer("…")`)
   93  publishes with its own tags as dimensions, not `class`, `method` and
   94  `exception`. Give it a panel only if the team asks: copy `<timed-name>`
   95  and set the dimensions to that timer's tags, each to `*`.
   96  
   97  One panel reads logs, not metrics:
   98  
   99  | Panel | Data source | Query |
  100  |---|---|---|
  101  | Slowest dependency calls | OpenSearch | `event.category:"external-call" AND service.name:"<service>"`, columns `@timestamp`, `event.action`, `event.outcome`, `event.duration`, `trace.id`, sorted by `event.duration` (nanoseconds) |
  102  
  103  Grafana queries OpenSearch with Lucene, not DQL: build the query in
  104  OpenSearch Dashboards with DQL switched off, then copy it across. The
  105  template's query works as written (reference-data, 2026-10-21). This
  106  panel finds nothing unless the service writes the `event.*` fields as a
  107  nested object with a numeric `event.duration` (`LOGGING.md` → "How to
  108  write the fields"). CDP drops the flat MDC form.
  109  
  110  The dimension values for the service come from its code. For
  111  reference-data, once moved to the dot-case names (it publishes the old
  112  ones until then: `METRICS.md` → "A service built the old way"):
  113  `dependency` is `mdm` or `trade-token`; `cache` is
  114  `MDM_COUNTRIES_CACHE` or `MDM_POE_CACHE`; `lookup.type` is `countries` or
  115  `ports-of-entry`. A service with a database has `dependency` `mongodb`,
  116  its status from the driver's heartbeats and, if its commands are
  117  measured, an `operation` from a fixed set of command names, with every
  118  other command as `other` (`METRICS.md` → "A database").
  119  
  120  ## Generate
  121  
  122  Claude writes the service's dashboard to
  123  `~/git/defra/trade-imports-workspace/workareas/ticket-planning/<ticket>/grafana/dashboard.json`:
  124  
  125  1. Copy `assets/dashboard.template.json`.
  126  2. Replace every `<service>` with the service name. If the service's
  127     `aws.emf.namespace` is not its name, use the namespace in the
  128     `namespace` fields and the name everywhere else.
  129  3. Make one copy of the `<business-metric> by <business-dimension>`
  130     panel per business metric on the agreed list (Step 2), filling in the
  131     metric and its dimension everywhere they appear in the panel (the
  132     title, description, `metricName`, `dimensions` and the legend
  133     `label`), and laying
  134     each copy out on the grid. Delete the panel if there are none.
  135  4. Delete "Cache hits and misses" if the service has no cache.
  136  5. List the service's `@Timed` names, in one command:
  137     `grep -rhoE --include='*.java' --exclude-dir=target --exclude-dir=node_modules --exclude-dir=test '@Timed\((value *= *)?"[^"]+"' <repo>`.
  138     Each line is `@Timed("<name>"`; the name is between the quotes. No
  139     output means the service has no timers, a Node service included:
  140     delete the panel.
  141     Otherwise make one copy of the `<timed-name>` panel per name, replacing
  142     `<timed-name>` everywhere in the copy (title, description and each
  143     `metricName`), and lay the copies out two to a row from the template
  144     panel's position down. Where a controller and a service time the same
  145     operation (`controller.list.time`,
  146     `service.list.time`), put the pair on one row, controller on
  147     the left, so the time spent outside the service reads across. Check
  148     each name is let through the
  149     service's `management.metrics.enable` allowlist (`METRICS.md` →
  150     "Rules"); a denied timer publishes nothing.
  151  6. Check the result is valid JSON (`jq empty <file>`) and that no
  152     placeholder is left (`grep -nE '<service>|<business-|<timed-' <file>`
  153     finds nothing).
  154  
  155  ## Import
  156  
  157  Signed in to the dev Grafana with Editor rights on the folder:
  158  
  159  - **A new dashboard:** Dashboards → New → Import → paste the file →
  160    folder `Playground/<service>-monitoring` → choose the CloudWatch and
  161    OpenSearch data sources when asked → Import.
  162  - **Over an existing one** (for example one built by hand): add its uid
  163    to the file as `"uid": "<uid>"` (the uid is in the dashboard's URL,
  164    `/d/<uid>/…`), then import; Grafana offers to overwrite it. Or open the
  165    dashboard → Settings → JSON Model, replace `panels` and `templating`
  166    with the file's, and save.
  167  
  168  Then check each panel shows data. Drive some requests first: where a
  169  cache sits in front of a dependency, calls only happen on a miss.
  170  
  171  ## Promote
  172  
  173  `[UNPROVEN]` The CDP monitoring how-to says dashboards are promoted from
  174  the Portal: service → Diagnostics → Dev → `Promote`. The FAQ says to
  175  ask #cdp-support. Try the Portal button first and record here which one
  176  worked.
```

## File: `.claude/skills/service-observability/references/LOGGING.md`

### Diff

```diff
diff --git a/.claude/skills/service-observability/references/LOGGING.md b/.claude/skills/service-observability/references/LOGGING.md
index 84984680..b3d4fd3a 100644
--- a/.claude/skills/service-observability/references/LOGGING.md
+++ b/.claude/skills/service-observability/references/LOGGING.md
@@ -10,8 +10,8 @@ request can be traced to the dependency call that made it slow.
 
 ## The line
 
-Write it where the call is already timed, and before any "metrics
-disabled" check, so logging does not depend on `aws.emf.enabled`.
+Write it where the call is recorded, in `ExternalCallRecorder`, so every
+measured call has one. It does not depend on `aws.emf.enabled`.
 
 ```
 External call mdm/get-countries success in 2 ms
@@ -23,6 +23,8 @@ External call mdm/get-countries success in 2 ms
 | `event.action` | `<dependency>/<operation>` | `mdm/get-countries` |
 | `event.outcome` | `success` or `failure` | `success` |
 | `event.duration` | Nanoseconds | `2882625` |
+| `error.type` | A failure only: the cause's class name | `com.mongodb.MongoCommandException` |
+| `error.message` | A failure only: the cause's message | — |
 | `trace.id` | Set by the request filter, not by this code | — |
 
 Only use fields on CDP's allowed ECS list (the CDP logging how-to). A
@@ -31,8 +33,9 @@ field that is not on the list is dropped.
 Never put a token, a subscription key, a request body or a full URL
 with query parameters in the line.
 
-The reference implementation is `ExternalCallMetrics.logCall` in
-`trade-imports-reference-data`.
+The reference implementation is `ExternalCallRecorder.logCall` in
+`trade-imports-address-book` (the line and fields are the ones first
+proven on reference-data, below).
 
 ### How to write the fields (Java)
 
@@ -48,29 +51,41 @@ It drops the flat form without any error. Do not set these fields
 through the MDC. `logback-ecs-encoder` (1.6.0) writes every MDC entry
 as a flat key with a string value, so CDP drops them all.
 
-Two pieces, both copied from reference-data:
+Two pieces, both in address-book:
 
 1. **Set the fields as SLF4J key-value pairs**, with the duration as a
-   `long`:
+   `long`. A successful call logs at INFO. A failed call logs at WARN,
+   with the cause's class name and message as `error.type` and
+   `error.message`, and no stack trace. The cause is not attached: the
+   exception is rethrown, and the handler that receives it logs its
+   stack trace once.
 
    ```java
-   log.atInfo()
-       .addKeyValue("event.category", "external-call")
-       .addKeyValue("event.action", action)
-       .addKeyValue("event.outcome", outcome)
-       .addKeyValue("event.duration", elapsed.toNanos())
-       .setCause(cause)
-       .log("External call {} {} in {} ms", action, outcome, elapsed.toMillis());
+   LoggingEventBuilder line =
+       log.atLevel(level)
+           .addKeyValue("event.category", "external-call")
+           .addKeyValue("event.action", action)
+           .addKeyValue("event.outcome", outcome)
+           .addKeyValue("event.duration", elapsed.toNanos());
+   if (cause != null) {
+     line.addKeyValue("error.type", cause.getClass().getName())
+         .addKeyValue("error.message", cause.getMessage());
+   }
+   line.log("External call {} {} in {} ms", action, outcome, elapsed.toMillis());
    ```
 
-2. **Copy `EcsEventEncoder`** (package `...imports.logging`) and name it
+2. **Copy `EcsEventEncoder`** into the service's `logging` package and name it
    as the CONSOLE appender's encoder in `logback-spring.xml`, in place of
    `co.elastic.logging.logback.EcsEncoder`. It extends the ECS encoder
    and overrides its `addCustomFields` hook to write the line's `event.*`
    key-value pairs as one nested `event` object, with a `Number` written
-   as a JSON number. The ECS encoder ignores key-value pairs, so they
-   are not also written flat. A line with no `event.*` key-value pairs
-   comes out exactly as the ECS encoder writes it.
+   as a JSON number and a non-finite one as a string. It writes the
+   line's `error.*` key-value pairs as flat top-level fields, with no
+   stack trace. When the line carries a throwable, the throwable's own
+   ECS `error.*` fields are written instead of those key-value pairs.
+   The ECS encoder ignores key-value pairs, so none is written twice. A
+   line with no `event.*` or `error.*` key-value pairs comes out exactly
+   as the ECS encoder writes it.
 
 `trace.id` stays in the MDC, where the request filter puts it. It
 reaches OpenSearch flat.
@@ -95,29 +110,34 @@ reaches OpenSearch flat.
 - **The first tests passed while the fields were being dropped.** They
   read the MDC on the captured log event, not the JSON the encoder
   writes. Test the encoded JSON (see Tests).
-- **`error.*` may be dropped as well.** The ECS encoder writes
-  `error.type`, `error.message` and `error.stack_trace` flat, and CDP
-  keeps `error.*` only nested. `[UNPROVEN]` Check an error line in dev
-  OpenSearch before relying on those fields.
-- **The exception is logged, but not the HTTP status.** When a call
-  throws, the line carries the exception. A call that returns a failure
-  status has only `event.outcome:failure`. Add `event.reason` if the
+- **`error.*` may be dropped as well.** The failure line's reason
+  travels only in its flat `error.type` and `error.message` fields, as
+  does the ECS encoder's own `error.*` on any line with a throwable. If
+  CDP keeps `error.*` only nested, as it does `event.*`, the failure
+  line reaches OpenSearch with `event.outcome:failure` and no reason.
+  `[UNPROVEN]` Check a failure line in dev OpenSearch before relying on
+  the reason.
+- **The exception's type and message are logged, but not the HTTP
+  status.** When a call throws, the line carries `error.type` and
+  `error.message`. A call that returns a failure status with no
+  exception has only `event.outcome:failure`. Add `event.reason` if the
   team wants more.
 
 ### Tests
 
 | Test | Proves |
 |---|---|
-| Encoder unit test: log through a real logger, then `encoder.encode(event)` and parse the JSON | A nested `event` object; `duration` is an integral number; no flat `event.category`, `event.action`, `event.outcome` or `event.duration` keys (the ECS encoder's own flat `event.dataset` stays); `trace.id` and `error.*` kept; a null value written as JSON `null` and a non-finite number as a string; a line with no `event.*` pairs is byte-for-byte the ECS encoder's |
-| Unit test with a capturing log appender | One line per call, with the four `event.*` key-value pairs, and the duration a `Long` |
-| Same, with metrics disabled | The line is still written |
-| Integration test sending `x-cdp-request-id`, encoding the line with the root logger's `CONSOLE` encoder | `logback-spring.xml` names the new encoder, and the line carries `trace.id` and the nested `event` object |
+| Encoder unit test (address-book's `EcsEventEncoderTest`): log through a real logger, then `encoder.encode(event)` and parse the JSON | The `event.*` key-value pairs nested in an `event` object with the prefix stripped, and an integral duration a JSON integer; a throwable's ECS `error.type`, `error.message` and `error.stack_trace` still written after the `event` object; `error.*` key-value pairs written as top-level fields with no stack trace, and `event.*` pairs not flattened beside them; with a throwable, its `error.*` fields written instead of the `error.*` key-value pairs; a line with no `event.*` or `error.*` key-value pairs byte-for-byte the ECS encoder's; strings escaped; a null value as JSON `null`; a non-finite `Double` or `Float` as a string |
+| Unit test with a capturing log appender, a successful call (address-book's `ExternalCallRecorderTest`) | One INFO line per call, with the four `event.*` key-value pairs, the duration a `Long`, and no throwable |
+| Unit test with a capturing log appender, a failed call (address-book's `ExternalCallRecorderTest`) | One WARN line per call, with `event.outcome` `failure`, `error.type` and `error.message` from the cause, and no throwable |
+| Integration test (address-book's `ExternalCallRecorderIT`) capturing stdout with `testsupport/CapturedConsole` around a real request or command, then parsing the console line with the given `event.action` | A successful insert, sent with `x-cdp-request-id`, writes a line with `trace.id` and the nested `event` object with an integral duration. A failed find writes a line with `event.outcome` `failure`, `error.type` and `error.message`, and no `error.stack_trace` |
 
 The integration test is the one that fails if `logback-spring.xml` is
 left on the plain ECS encoder. The unit tests alone would still pass.
 
-`CapturingLogAppender` in the reference-data tests is the helper to
-copy. It must call `event.prepareForDeferredProcessing()` or the MDC
+`CapturedLogs` in address-book's `testsupport` is the helper to copy,
+or extend the service's own log-capturing helper the same way. Its
+appender must call `event.prepareForDeferredProcessing()` or the MDC
 values are gone by the time the test reads them. Its `keyValues(event)`
 reads an event's key-value pairs.
 
```

### File at the reviewed commit, with line numbers

```markdown
    1  Log one searchable line per call to an external dependency, and follow
    2  a request across services. Parent-loaded: path and Bash rules come from
    3  `SKILL.md`.
    4  
    5  ## Why a log line as well as a metric
    6  
    7  Metrics go to CloudWatch. They cannot be searched by request. The log
    8  line goes to OpenSearch with the caller's `trace.id`, so one slow
    9  request can be traced to the dependency call that made it slow.
   10  
   11  ## The line
   12  
   13  Write it where the call is recorded, in `ExternalCallRecorder`, so every
   14  measured call has one. It does not depend on `aws.emf.enabled`.
   15  
   16  ```
   17  External call mdm/get-countries success in 2 ms
   18  ```
   19  
   20  | Field | Value | Example |
   21  |---|---|---|
   22  | `event.category` | Always `external-call` | `external-call` |
   23  | `event.action` | `<dependency>/<operation>` | `mdm/get-countries` |
   24  | `event.outcome` | `success` or `failure` | `success` |
   25  | `event.duration` | Nanoseconds | `2882625` |
   26  | `error.type` | A failure only: the cause's class name | `com.mongodb.MongoCommandException` |
   27  | `error.message` | A failure only: the cause's message | — |
   28  | `trace.id` | Set by the request filter, not by this code | — |
   29  
   30  Only use fields on CDP's allowed ECS list (the CDP logging how-to). A
   31  field that is not on the list is dropped.
   32  
   33  Never put a token, a subscription key, a request body or a full URL
   34  with query parameters in the line.
   35  
   36  The reference implementation is `ExternalCallRecorder.logCall` in
   37  `trade-imports-address-book` (the line and fields are the ones first
   38  proven on reference-data, below).
   39  
   40  ### How to write the fields (Java)
   41  
   42  CDP keeps `event.*` fields only when they are **nested** in the JSON,
   43  and needs `event.duration` to be a **number**:
   44  
   45  ```
   46  dropped:  "event.category":"external-call", "event.duration":"2882625"
   47  kept:     "event":{"category":"external-call","duration":2882625}
   48  ```
   49  
   50  It drops the flat form without any error. Do not set these fields
   51  through the MDC. `logback-ecs-encoder` (1.6.0) writes every MDC entry
   52  as a flat key with a string value, so CDP drops them all.
   53  
   54  Two pieces, both in address-book:
   55  
   56  1. **Set the fields as SLF4J key-value pairs**, with the duration as a
   57     `long`. A successful call logs at INFO. A failed call logs at WARN,
   58     with the cause's class name and message as `error.type` and
   59     `error.message`, and no stack trace. The cause is not attached: the
   60     exception is rethrown, and the handler that receives it logs its
   61     stack trace once.
   62  
   63     ```java
   64     LoggingEventBuilder line =
   65         log.atLevel(level)
   66             .addKeyValue("event.category", "external-call")
   67             .addKeyValue("event.action", action)
   68             .addKeyValue("event.outcome", outcome)
   69             .addKeyValue("event.duration", elapsed.toNanos());
   70     if (cause != null) {
   71       line.addKeyValue("error.type", cause.getClass().getName())
   72           .addKeyValue("error.message", cause.getMessage());
   73     }
   74     line.log("External call {} {} in {} ms", action, outcome, elapsed.toMillis());
   75     ```
   76  
   77  2. **Copy `EcsEventEncoder`** into the service's `logging` package and name it
   78     as the CONSOLE appender's encoder in `logback-spring.xml`, in place of
   79     `co.elastic.logging.logback.EcsEncoder`. It extends the ECS encoder
   80     and overrides its `addCustomFields` hook to write the line's `event.*`
   81     key-value pairs as one nested `event` object, with a `Number` written
   82     as a JSON number and a non-finite one as a string. It writes the
   83     line's `error.*` key-value pairs as flat top-level fields, with no
   84     stack trace. When the line carries a throwable, the throwable's own
   85     ECS `error.*` fields are written instead of those key-value pairs.
   86     The ECS encoder ignores key-value pairs, so none is written twice. A
   87     line with no `event.*` or `error.*` key-value pairs comes out exactly
   88     as the ECS encoder writes it.
   89  
   90  `trace.id` stays in the MDC, where the request filter puts it. It
   91  reaches OpenSearch flat.
   92  
   93  ### What was learned on reference-data
   94  
   95  - **CDP dropped the MDC version without any error.** Seen in dev on
   96    2026-10-19 (reference-data 0.24.0): the line arrived with its
   97    `message`, `service.name` and `trace.id`, but none of the four
   98    `event.*` fields. The nested key-value-pair version above replaced it.
   99  - **The nested version reaches OpenSearch.** Seen in dev on 2026-10-21
  100    (reference-data 0.27.0): `event.category:"external-call" AND
  101    service.name:"<service>"` finds the lines, and Grafana's "Slowest
  102    dependency calls" panel shows them sorted by `event.duration` as a
  103    number. `[UNPROVEN]` that CDP's "Log Ingestion Errors" alert stays
  104    quiet for the service.
  105  - **One flat `event.*` key is left on every line.** The ECS encoder
  106    (1.6.0) always writes `"event.dataset":"<service>"` flat, so the call
  107    line holds that flat key and the nested `event` object side by side.
  108    CDP indexes the line with the mix (the nested fields arrive), but if
  109    "Log Ingestion Errors" fires, this is the first suspect.
  110  - **The first tests passed while the fields were being dropped.** They
  111    read the MDC on the captured log event, not the JSON the encoder
  112    writes. Test the encoded JSON (see Tests).
  113  - **`error.*` may be dropped as well.** The failure line's reason
  114    travels only in its flat `error.type` and `error.message` fields, as
  115    does the ECS encoder's own `error.*` on any line with a throwable. If
  116    CDP keeps `error.*` only nested, as it does `event.*`, the failure
  117    line reaches OpenSearch with `event.outcome:failure` and no reason.
  118    `[UNPROVEN]` Check a failure line in dev OpenSearch before relying on
  119    the reason.
  120  - **The exception's type and message are logged, but not the HTTP
  121    status.** When a call throws, the line carries `error.type` and
  122    `error.message`. A call that returns a failure status with no
  123    exception has only `event.outcome:failure`. Add `event.reason` if the
  124    team wants more.
  125  
  126  ### Tests
  127  
  128  | Test | Proves |
  129  |---|---|
  130  | Encoder unit test (address-book's `EcsEventEncoderTest`): log through a real logger, then `encoder.encode(event)` and parse the JSON | The `event.*` key-value pairs nested in an `event` object with the prefix stripped, and an integral duration a JSON integer; a throwable's ECS `error.type`, `error.message` and `error.stack_trace` still written after the `event` object; `error.*` key-value pairs written as top-level fields with no stack trace, and `event.*` pairs not flattened beside them; with a throwable, its `error.*` fields written instead of the `error.*` key-value pairs; a line with no `event.*` or `error.*` key-value pairs byte-for-byte the ECS encoder's; strings escaped; a null value as JSON `null`; a non-finite `Double` or `Float` as a string |
  131  | Unit test with a capturing log appender, a successful call (address-book's `ExternalCallRecorderTest`) | One INFO line per call, with the four `event.*` key-value pairs, the duration a `Long`, and no throwable |
  132  | Unit test with a capturing log appender, a failed call (address-book's `ExternalCallRecorderTest`) | One WARN line per call, with `event.outcome` `failure`, `error.type` and `error.message` from the cause, and no throwable |
  133  | Integration test (address-book's `ExternalCallRecorderIT`) capturing stdout with `testsupport/CapturedConsole` around a real request or command, then parsing the console line with the given `event.action` | A successful insert, sent with `x-cdp-request-id`, writes a line with `trace.id` and the nested `event` object with an integral duration. A failed find writes a line with `event.outcome` `failure`, `error.type` and `error.message`, and no `error.stack_trace` |
  134  
  135  The integration test is the one that fails if `logback-spring.xml` is
  136  left on the plain ECS encoder. The unit tests alone would still pass.
  137  
  138  `CapturedLogs` in address-book's `testsupport` is the helper to copy,
  139  or extend the service's own log-capturing helper the same way. Its
  140  appender must call `event.prepareForDeferredProcessing()` or the MDC
  141  values are gone by the time the test reads them. Its `keyValues(event)`
  142  reads an event's key-value pairs.
  143  
  144  ## Follow a request by trace.id
  145  
  146  CDP sends `x-cdp-request-id` on each request. A service copies it into
  147  `trace.id` on every log line, and must send it on to the services it
  148  calls.
  149  
  150  `[UNPROVEN]` The check, in dev OpenSearch: find a request in a calling
  151  service, filter on its `trace.id` alone, and confirm lines from both
  152  services appear, including the dependency call line.
  153  
  154  If the trail breaks, the usual cause is a caller that does not forward
  155  the header. That is a fix in the caller, on the caller's own ticket.
  156  Record it; do not fix it here.
  157  
  158  Note for Java services: on reference-data the header is forwarded on
  159  `RestClient` calls only. Calls made through Feign do not carry it. That
  160  does not stop a request being followed *through* the service.
```

## File: `.claude/skills/service-observability/references/METRICS.md`

### Diff

```diff
diff --git a/.claude/skills/service-observability/references/METRICS.md b/.claude/skills/service-observability/references/METRICS.md
index 9d1e2e04..033c4d7a 100644
--- a/.claude/skills/service-observability/references/METRICS.md
+++ b/.claude/skills/service-observability/references/METRICS.md
@@ -12,28 +12,37 @@ Ask of each candidate metric: what would someone do differently on
 seeing it change? Drop it if the answer is nothing.
 
 The list agreed for `trade-imports-reference-data` is the worked
-example:
+example, with the names it takes once moved to the one way. It
+publishes the old names until then ("A service built the old way"):
 
 | Metric | Unit | Dimension | Answers |
 |---|---|---|---|
-| `ExternalCallDuration` | ms | `Dependency`, `Operation` | How many calls, and how slow? |
-| `ExternalCallFailure` | 0 or 1 | `Dependency`, `Operation` | How many calls failed? |
-| `DependencyAvailable` | 1 or 0 | `Dependency` | Is each dependency up? |
-| `CacheHit`, `CacheMiss` | count | `Cache` | Is the cache doing its job? |
-| `Lookup` | count | `LookupType` | Demand on the service, by type |
+| `external.call.duration` | ms | `dependency`, `operation` | How many calls, and how slow? |
+| `external.call.failure` | 0 or 1 | `dependency`, `operation` | How many calls failed? |
+| `external.dependency.available` | 1 or 0 | `dependency` | Is each dependency up? |
+| `cache.hit`, `cache.miss` | count | `cache` | Is the cache doing its job? |
+| `lookup` | count | `lookup.type` | Demand on the service, by type |
 
 Rules that held:
 
-- **Reuse the shared names.** `ExternalCallDuration`,
-  `ExternalCallFailure` and `DependencyAvailable`, with those dimension
+- **Name every metric and dimension in dot case:** lowercase words
+  separated by dots, most general first (`external.call.duration`,
+  `cache.hit`, `address.change`; `dependency`, `lookup.type`), the same
+  form as the `@Timed` names (`controller.<operation>.time`) and their
+  tags (`class`, `method`, `exception`). `EmfMeterRegistry` publishes
+  names and tag keys as written, so they are also the CloudWatch metric
+  and dimension names.
+- **Reuse the shared names.** `external.call.duration`,
+  `external.call.failure` and `external.dependency.available`, with those dimension
   names, are the contract across services. A dashboard or alert built
   for one service then works for the next. Only the business metrics
-  (`Lookup` here) are service-specific.
+  (`lookup` here) are service-specific. Several services still publish
+  older names; "A service built the old way" lists them.
 - **Do not add a count metric.** A call count is the `SampleCount` of
-  `ExternalCallDuration`. An error count is the `Sum` of
-  `ExternalCallFailure`. A token refresh is one call to the token
-  endpoint, so it is the same two metrics filtered by `Dependency` and
-  `Operation` (the token endpoint's one operation).
+  `external.call.duration`. An error count is the `Sum` of
+  `external.call.failure`. A token refresh is one call to the token
+  endpoint, so it is the same two metrics filtered by `dependency` and
+  `operation` (the token endpoint's one operation).
 - **Keep dimension values few and fixed.** Never a URL, a trace id, an
   organisation or a user as a dimension: each distinct value is a
   separate CloudWatch metric.
@@ -41,58 +50,165 @@ Rules that held:
   dimensions in the table, so the dashboard query does not have to guess
   which combination holds the data. Every query, panel and alert then
   uses that full set: CloudWatch does not add up across a published
-  dimension, so `ExternalCallFailure` queried by `Dependency` alone
+  dimension, so `external.call.failure` queried by `dependency` alone
   finds nothing.
 
 Record the agreed table on the ticket.
 
 ## Publish (Java, Spring Boot)
 
-The reference implementation is in `trade-imports-reference-data`,
-package `uk.gov.defra.trade.imports.metrics`, with its tests alongside.
-Until EUDPA-632 merges, most of it is only on that repo's
-`feat/EUDPA-632-observability` branch, not `main`. Read these before
-writing anything; copy the shape, not the names of the business metrics.
+One way: every metric is an ordinary Micrometer meter, and
+`EmfMeterRegistry` publishes them all to CloudWatch as Embedded Metric
+Format. No EMF code at a call site. `@Timed`, `@Counted`,
+`Timer.builder`, `Counter` and `Gauge` all publish properly, with their
+tags as dimensions.
+
+The reference implementation is `trade-imports-address-book`
+(EUDPA-674), package `uk.gov.defra.trade.imports.addressbook.metrics`,
+with its tests alongside. `[UNPROVEN]` in dev CloudWatch until that
+release is checked there. Read it before writing anything.
+
+### Copy as it is
+
+These classes have nothing service-specific. Copy them into the
+service's `metrics` package and change only the package:
 
 | Class | What it does |
 |---|---|
-| `ExternalCallMetrics` | Times each outbound call and publishes `ExternalCallDuration` and `ExternalCallFailure`. Also remembers the last outcome per dependency |
-| `ExternalCallFeignCapability` | Why calls are measured at the Feign transport rather than in the calling service class |
-| `EmfMetricWriter` | Writes one metric with one dimension. Never throws. Does nothing when `aws.emf.enabled` is false |
-| `DependencyAvailabilityMetrics` | Every minute, publishes `DependencyAvailable` for each dependency that has been called |
-| `CacheMetrics` | Every minute, publishes cache hits and misses since the last publish |
-| `LookupMetrics` | Counts one business event, called from the controller |
-
-Metrics are written directly as AWS Embedded Metric Format (the
-`aws-embedded-metrics` library), with the CloudWatch namespace from
-`aws.emf.namespace` — on CDP this is the service name.
-
-What to carry over:
-
-- **A metric must never break a request.** Catch everything in the
-  writer and log at warn.
-- **Honour `aws.emf.enabled`.** It is off in integration tests. Skip the
-  work, not only the write.
-- **Do not publish through the existing `EmfMetricsPublisher`.** It
-  writes every measurement of a Micrometer meter (count, total, max)
-  under one metric name with no dimensions, so values collide. Leave it
-  alone; fixing it changes every metric a service already publishes.
-- **Caches need `.recordStats()`** on the Caffeine builder, or hits and
-  misses read as zero.
-- **The application class needs `@EnableScheduling`** for the
-  `@Scheduled` publishers (`DependencyAvailabilityMetrics`,
-  `CacheMetrics`). reference-data already had it. Without it the tests
-  still pass, because they call `publish()` directly, but nothing is
-  published in dev. Pin each publisher's schedule with an annotation
-  test, as reference-data does.
+| `EmfMeterRegistry` | A `StepMeterRegistry` that publishes its gauges, counters, timers and distribution summaries once a step (`aws.emf.step`, one minute by default) in the `aws.emf.namespace` namespace, tags as the only dimensions. Timers and distribution summaries publish every value recorded since the last publish (timers in ms), so CloudWatch computes `SampleCount`, `Sum`, `Average`, `p95` and `Maximum` itself; the EMF library splits more than 100 values across documents. Counters publish the last step's count; gauges their value when finite. Long task timers, function counters, function timers and time gauges are not published. One meter failing to publish is logged at warn and the rest still go |
+| `ValueRecordingTimer`, `ValueRecordingDistributionSummary`, `RecordedValues` | Package-private: Micrometer's step timer and summary, also keeping each recorded value until the registry takes it |
+| `ExternalCallRecorder` | Logs each call to a dependency (`LOGGING.md`) and records it as the timer `external.call.duration` and the distribution summary `external.call.failure` (0 or 1 per call), both tagged `dependency` and `operation`. `recordSuccess` and `recordFailure` (with the cause), not a boolean flag. It records a call it is given; it does not time one or keep its outcome. Each metric name is written once, at its one registration call, and the `dependency` tag key is `ExternalCallRecorder.DEPENDENCY_TAG`, which `DependencyAvailabilityMetrics` uses too. A service with its own `ExternalCallMetrics` replaces it ("A service built the old way") |
+
+Copy the bean method `MetricsConfig.emfMeterRegistry` too, but not its
+class. It creates and starts the registry only when `aws.emf.enabled`
+is true. When it is false, as in integration tests, Spring Boot's
+in-memory registry is used and nothing is published. It reads two more
+properties, both in address-book's `application.yml` under `aws.emf`:
+
+- `aws.emf.environment` (`${AWS_EMF_ENVIRONMENT:}`). Blank, the default,
+  leaves the EMF library to detect the environment; on CDP that is ECS,
+  sending to the platform's `AWS_EMF_AGENT_ENDPOINT`. Set it to `Local`
+  to write the EMF documents to stdout.
+- `aws.emf.step` (`${AWS_EMF_STEP:1m}`), bound to a `Duration` and passed
+  to `new EmfMeterRegistry(namespace, step, Clock.SYSTEM,
+  MetricsLogger::new)`: how often the registry publishes.
+
+Add the method to
+the service's existing `MetricsConfig` in its `configuration` package,
+not to a new class in `metrics`. Keep that class's `TimedAspect` bean:
+`@Timed` records nothing without it. `@Counted` needs its
+`CountedAspect` bean, which dynamics-gateway's does not have yet. A
+service with no `MetricsConfig` gets one in its `configuration`
+package, with the `TimedAspect` and `CountedAspect` beans as in
+address-book.
+
+### Write for the service
+
+| Class | What it does |
+|---|---|
+| Where calls are measured | One place per kind of dependency, timing each call and passing it to `ExternalCallRecorder`: a driver `CommandListener` for a database (`MongoCommandMetrics`), a Feign `Capability` or a `RestClient` interceptor for HTTP. Measure at the transport, not in the calling service class, so every call is caught |
+| `DependencyAvailabilityMetrics` | Registers the gauge `external.dependency.available`, tagged `dependency`, from wherever availability comes from ("Availability" below) |
+| A business-metrics class (`AddressMetrics`) | One counter per agreed business metric, tagged by its dimension |
+| `@Timed("controller.<operation>.time")`, `@Timed("service.<operation>.time")` | On every controller endpoint and every public method of the service classes, so each invocation's duration is published |
+
+### Rules
+
+- **Add every metric name to the service's Micrometer allowlist.**
+  address-book's `application.yml` has `management.metrics.enable.all:
+  false` with the names allowed. A name not on it gets a no-op meter:
+  no error, no metric. Add each custom name in full
+  (`external.call.duration: true`, `cache.hit: true`) and each `@Timed`
+  prefix (`controller: true`, `service: true`). An entry enables every
+  meter whose name starts with it, so never shorten a custom name to its
+  first word: `cache: true` would also publish Spring Boot's own
+  `cache.*` meters. That allowlist is the one
+  control of what is published. It also decides what Spring Boot's own
+  meters publish: on address-book it had silenced its repository and
+  Mongo timers. Allowing a meter type `EmfMeterRegistry` does not
+  publish still publishes nothing: `http.server.requests.active` is a
+  long task timer, so address-book leaves it off.
+- **`@Timed` works only through a Spring proxy.** The method must be
+  public and called from another bean. A private method, or one called
+  from inside its own class, is never timed, with no error. An
+  annotation on a Spring Data repository interface method recorded
+  nothing when tried on address-book; measure database calls with the
+  driver's listener instead.
+- **Delete the service's `EmfMetricsPublisher`** (and its test). It
+  publishes the same meters again, with no dimensions and running
+  totals.
+- **Delete any direct EMF writer** (`EmfMetricWriter` and the like).
+  Every metric goes through Micrometer.
+- **No `@EnableScheduling` for metrics.** The registry publishes on its
+  own thread. Remove the annotation if nothing else uses it.
+- **A metric never breaks a request.** Recording a Micrometer meter does
+  not throw, and publishing happens on the registry's thread.
+- **A step meter's `count()` is the last completed step's,** not the
+  running one. In a test with the registry switched on, assert on
+  registration; with it off (Spring Boot's in-memory registry), counts
+  are running totals and can be asserted.
+- **Values are timestamped when published,** up to a step after they
+  were recorded.
+- **Caches** `[UNPROVEN]`, not yet done this way on a service: the
+  counters `cache.hit` and `cache.miss`, tagged `cache` with the cache's
+  name, as in the agreed table and the dashboard's "Cache hits and
+  misses" panel. Increment one on each lookup, from the code that reads
+  the cache, and add both names to the allowlist. Not Micrometer's cache
+  binder: it publishes `cache.gets` under other names and tags, and as
+  function counters, which `EmfMeterRegistry` does not publish.
+
+### A service built the old way
+
+These services write EMF directly and publish the older PascalCase
+names, not the dot-case names above (their `main`, checked 2026-11-06):
+
+| Service | Where | Publishes |
+|---|---|---|
+| `trade-imports-reference-data` (EUDPA-632) | `metrics` package: `EmfMetricWriter`, `ExternalCallMetrics`, scheduled `DependencyAvailabilityMetrics` and `CacheMetrics`, `LookupMetrics` | Every old name in the table below |
+| `trade-imports-dynamics-gateway` | `metrics/ExternalCallMetrics.java` and `metrics/ExternalCall.java`, measuring the Service Bus send in `QueueMessageSender` | `ExternalCallDuration`, `ExternalCallFailure`, dimensions `Dependency`, `Operation` |
+| `trade-imports-animals-frontend`, `-ins-frontend`, `-plants-frontend` | `src/server/common/helpers/external-call-metrics.js` | `ExternalCallDuration`, `ExternalCallFailure`, dimensions `Dependency`, `Operation` |
+
+`trade-imports-animals-admin` publishes none of these metrics.
+
+When this skill runs on one of them, move it to the new names first. A
+Java service moves to the one way above as well; a Node service renames
+the names in its helper (there is no Node recipe yet: `SKILL.md` →
+"What is proven"). The CloudWatch metrics then change name, so
+regenerate its dashboard (`DASHBOARD.md` → "Generate") and rebuild its
+alerts from a new build sheet (`ALERTS.md` → "Build") in the same run;
+the old ones go quiet.
+
+| Old | New |
+|---|---|
+| `ExternalCallDuration`, `ExternalCallFailure` | `external.call.duration`, `external.call.failure` |
+| `DependencyAvailable` | `external.dependency.available` |
+| `CacheHit`, `CacheMiss` | `cache.hit`, `cache.miss` |
+| `Lookup` | `lookup` |
+| Dimensions `Dependency`, `Operation`, `Cache`, `LookupType` | `dependency`, `operation`, `cache`, `lookup.type` |
+
+The Java classes move as follows. Rows that name a class only one
+service has apply to that service.
+
+| Old | New |
+|---|---|
+| The service's own `ExternalCallMetrics` writing EMF (`recordCall(…, boolean)`) | Replaced by address-book's `ExternalCallRecorder` ("Copy as it is"). `ExternalCall` stays as the list of calls; pass its `dependency()` and `operation()` |
+| `ExternalCallMetrics.measure(…)` around the Service Bus send (dynamics-gateway) | `QueueMessageSender` times the send itself, then calls `recordSuccess`, or `recordFailure` with the exception thrown |
+| `ExternalCallMetrics.measure(…)` around each Feign call (reference-data) | Moves into `ExternalCallFeignCapability`, which stays as the place calls are measured. It times `client.execute` itself, then calls `recordSuccess`, or `recordFailure` with the exception thrown, or with no cause for a response of 400 or over |
+| `ExternalCallMetrics.lastCallSucceededByDependency()` | A small `LastCallOutcomes` component holding the last outcome per dependency. `ExternalCallFeignCapability` updates it on each success and failure, beside its `recordSuccess` or `recordFailure` call, so `ExternalCallRecorder` stays a copy |
+| The `Interface` property (the volumetrics `SYN-19` id) on each EMF document | No meter carries it: as a tag it would be a new dimension. Agree with the team before the move, and record the choice on the ticket: keep it as an `interface.id` key-value on the call's log line, in this service's copy of `ExternalCallRecorder`, or drop it |
+| `EmfMetricWriter` | Deleted; each metric becomes a meter |
+| `@Scheduled` `DependencyAvailabilityMetrics` | One `external.dependency.available` gauge per dependency in `ExternalCall`, tagged `dependency`, reading `LastCallOutcomes`: 1 after a success, 0 after a failure, NaN (not published) before the first call |
+| `@Scheduled` `CacheMetrics` | `cache.hit` and `cache.miss` counters tagged `cache` (Rules → "Caches") |
+| `LookupMetrics` | The counter `lookup` tagged `lookup.type` |
+| `EmfMetricsPublisher` | Deleted |
 
 ### Availability: passive or active
 
-`DependencyAvailable` can come from a probe the service sends, or from
+`external.dependency.available` can come from a probe the service sends, or from
 the outcome of the calls it already makes.
 
 - **Passive (used on reference-data).** Report the outcome of the most
-  recent real call. No extra traffic. The cost: the value is as old as
+  recent real call, kept in `LastCallOutcomes` ("A service built the
+  old way"). No extra traffic. The cost: the value is as old as
   the last call, and nothing is published until the first call after
   start-up. Where a cache sits in front of the dependency, that can be
   as long as the cache lifetime.
@@ -100,44 +216,96 @@ the outcome of the calls it already makes.
   where a probe is free and harmless. Do not probe a dependency whose
   calls are rate-limited or cost a real token request.
 
-Whichever is used, alert on `ExternalCallFailure` over a time window,
-per `Dependency` and `Operation` (`ALERTS.md`), not on
-`DependencyAvailable`. A passive reading lags by up to the cache
+For an HTTP dependency, alert on `external.call.failure` over a time
+window, per `dependency` and `operation` (`ALERTS.md`), not on
+`external.dependency.available`. A passive reading lags by up to the cache
 lifetime and holds a single failure until the next success; an active
-probe is itself a call, so it records `ExternalCallFailure` too.
+probe is itself a call, so it records `external.call.failure` too. A
+database is the exception: its availability comes from the driver's
+heartbeats, which are fresh, so alert on it (below).
 
 ### A database
 
 A database the service has configured is a dependency (`SKILL.md` Step
-1), and gets the same metrics as any other. Not yet done on a real
-service: settle the details on the first run and edit this section.
-
-- **Measure it actively.** A database ping is cheap and harmless, so
-  send one every minute (for MongoDB, the `ping` command on the existing
-  client), with a short timeout, on a scheduled thread off the request
-  path. Never in `/health`.
-- **Record the ping as an external call**, through `ExternalCallMetrics`
-  with `Dependency` set to the database (`mongodb`) and `Operation` set
-  to `ping`. It then publishes `ExternalCallDuration` and
-  `ExternalCallFailure` like any other call, and
-  `DependencyAvailable{Dependency=mongodb}` follows from it with no new
-  code.
-- **The dashboard and alerts need no new rows.** The panels and alerts
-  in `DASHBOARD.md` and `ALERTS.md` are per `Dependency` and
-  `Operation`, so they pick up `mongodb`/`ping`. Add it to the
-  dimension values listed for the service, and check each alert has a
-  query for it.
-- **Test it like the other publishers**: a unit test that a failed ping
-  is recorded as a failure, and an integration test with the database
-  stopped or unreachable.
+1). Written and tested on `trade-imports-address-book` (EUDPA-674,
+package `uk.gov.defra.trade.imports.addressbook.metrics`), where MongoDB
+is the only dependency. `[UNPROVEN]` in dev CloudWatch until that release
+is checked there.
+
+- **Take availability from the driver's cluster description, by
+  default.** The MongoDB driver already checks each server every 10
+  seconds on its own monitoring connections and keeps the result in its
+  cluster description. A `ClusterListener` (`MongoAvailability`, added
+  with `MongoClientSettings.applyToClusterSettings(b ->
+  b.addClusterListener(...))`) reads the servers the driver monitors now
+  on each change. The database is available while a connected server
+  accepts writes (`ServerDescription.isPrimary()`: a primary, standalone,
+  mongos or load balancer). It is unavailable once every server has been
+  checked and none accepts writes: every check failed, or the only
+  connected servers are secondaries. It is unknown while the driver
+  monitors no servers, or one has not been checked yet. A server the
+  driver has removed drops out. `DependencyAvailabilityMetrics` registers it
+  as the gauge `external.dependency.available{dependency=mongodb}` (NaN, so not
+  published, while unknown). No extra traffic, no scheduled probe, never
+  in `/health`. Not a `ServerMonitorListener`: it is not told which
+  servers the driver still monitors, so a removed server's last success
+  would hold the database up.
+- **Log only the change.** A heartbeat is not a call the service makes,
+  so it gets no external-call log line and no `external.call.duration`:
+  that would be several lines a minute per task. Log once on every
+  change of state, naming the servers:
+
+  | Change to | Level | Message |
+  |---|---|---|
+  | Available | INFO | `MongoDB is available, servers {}` |
+  | Unavailable, a server connected but none accepts writes | WARN | `MongoDB is unavailable: servers {} are connected but none accepts writes` |
+  | Unavailable, every check failed | WARN, with the first failed check's exception | `MongoDB is unavailable, servers {}` |
+  | Unknown | WARN | `MongoDB availability is unknown until every server is checked, servers {}` |
+- **Know what a check proves.** Monitoring connections may not sign in,
+  so a successful check proves the server is up, not that the service's
+  credentials work. Where that gap matters, add a scheduled `ping`
+  command bounded by `MongoTemplate.getDb().withTimeout(...)`, and record
+  the choice here.
+- **Measure the real commands too, if the team wants query latency.** A
+  driver `CommandListener` (`MongoCommandMetrics`, added with
+  `addCommandListener`) records every command as `mongodb/<command
+  name>` through `ExternalCallRecorder`. Keep the operation to a fixed set
+  of command names, with anything else as `other`. A command counts as
+  a failure when the driver reports it failed (`CommandFailedEvent`: a
+  network error or an `ok: 0` reply), or when an `ok: 1` reply carries
+  `writeErrors` (a duplicate key, say) or a `writeConcernError` (a
+  majority write-concern timeout, say). For those two it records a
+  `MongoReplyWriteException` whose message holds only the error codes
+  and code names, never the server's `errmsg`: a duplicate key's
+  `errmsg` holds the key's value. A command that never
+  reaches the server (no server to select) fires no listener event, so
+  these metrics do not show an outage; the heartbeat does.
+- **Alerts.** Which rules a service with a database gets:
+  `assets/alerts.template.md` → "Check".
+- **Test it** with unit tests that feed the listener cluster
+  descriptions (several servers, one failing, all failing, connected
+  secondaries only, the primary removed, one not yet checked, no
+  servers, recovery, and one log line per change at the level and with
+  the message above, none while another server still accepts writes),
+  unit tests that feed the command listener a reply with `writeErrors`
+  and one with a `writeConcernError`, an integration test that the application's own client
+  reports available (it goes red if the listener is not registered), and
+  an integration test with a throwaway Testcontainers database that is
+  started, seen available, stopped, and seen unavailable. Do not stop the
+  shared Testcontainers database: the other integration tests need it.
 
 ### Tests
 
+address-book's tests are the ones to copy.
+
 | Test | Proves |
 |---|---|
-| Unit test per publisher, using `CapturingEmfEnvironment` | Metric name, value, and that the dimension set is exactly as agreed |
-| Unit test with the writer disabled | Nothing is written and no work is done |
-| Integration test with the dependency stubbed to fail | The failure is recorded against the right dependency, and the others are not marked failed |
+| `EmfMeterRegistryTest` (copied as it is), with `CapturingEmfEnvironment` and a `MockClock` | The EMF documents: namespace, tags as the only dimensions, every recorded value, units, counters per step, gauges skipped while NaN, more than 100 values split, one bad meter not stopping the rest |
+| A unit test per metrics class, with a `SimpleMeterRegistry` | Each meter's name, tags and recorded values |
+| An integration test with `aws.emf.enabled=true`, `aws.emf.environment=Local` and `aws.emf.step=1s` in its `@TestPropertySource` (`EmfMeterRegistryIT`), so EMF writes to the console every second | The registry is the one in use, and every custom metric name is let through the allowlist: each is recorded, then `meterRegistry.find(name)` is not null. A denied meter is never registered, so a missing or misspelled allowlist entry turns it red |
+| The same integration test records a call and waits up to 10 seconds for an EMF document on the console, captured with `testsupport/CapturedConsole` | The registry publishes on its own thread once started. Turns red if `MetricsConfig` does not call `start` |
+| An integration test per annotated class (`AddressTimingIT`) | Each `@Timed` method, called through the Spring proxy, adds one call to its own timer. Turns red if the allowlist lacks the prefix |
+| An integration test with the dependency failing (`ExternalCallRecorderIT`: a command the server rejects, and a duplicate-key insert) | The failure is recorded against the right dependency and operation |
 | The existing health check test | `/health` is still `UP` with no components |
 
 Run the repo's full build before pushing:
```

### File at the reviewed commit, with line numbers

```markdown
    1  Work out which custom metrics a service needs, then publish them.
    2  Parent-loaded: path and Bash rules come from `SKILL.md`.
    3  
    4  ## Work out the list
    5  
    6  Start from what the service does that the CDP default dashboard cannot
    7  show. The defaults cover tasks, CPU, memory, response time and HTTP
    8  errors. They do not cover the service's dependencies or its own
    9  business events.
   10  
   11  Ask of each candidate metric: what would someone do differently on
   12  seeing it change? Drop it if the answer is nothing.
   13  
   14  The list agreed for `trade-imports-reference-data` is the worked
   15  example, with the names it takes once moved to the one way. It
   16  publishes the old names until then ("A service built the old way"):
   17  
   18  | Metric | Unit | Dimension | Answers |
   19  |---|---|---|---|
   20  | `external.call.duration` | ms | `dependency`, `operation` | How many calls, and how slow? |
   21  | `external.call.failure` | 0 or 1 | `dependency`, `operation` | How many calls failed? |
   22  | `external.dependency.available` | 1 or 0 | `dependency` | Is each dependency up? |
   23  | `cache.hit`, `cache.miss` | count | `cache` | Is the cache doing its job? |
   24  | `lookup` | count | `lookup.type` | Demand on the service, by type |
   25  
   26  Rules that held:
   27  
   28  - **Name every metric and dimension in dot case:** lowercase words
   29    separated by dots, most general first (`external.call.duration`,
   30    `cache.hit`, `address.change`; `dependency`, `lookup.type`), the same
   31    form as the `@Timed` names (`controller.<operation>.time`) and their
   32    tags (`class`, `method`, `exception`). `EmfMeterRegistry` publishes
   33    names and tag keys as written, so they are also the CloudWatch metric
   34    and dimension names.
   35  - **Reuse the shared names.** `external.call.duration`,
   36    `external.call.failure` and `external.dependency.available`, with those dimension
   37    names, are the contract across services. A dashboard or alert built
   38    for one service then works for the next. Only the business metrics
   39    (`lookup` here) are service-specific. Several services still publish
   40    older names; "A service built the old way" lists them.
   41  - **Do not add a count metric.** A call count is the `SampleCount` of
   42    `external.call.duration`. An error count is the `Sum` of
   43    `external.call.failure`. A token refresh is one call to the token
   44    endpoint, so it is the same two metrics filtered by `dependency` and
   45    `operation` (the token endpoint's one operation).
   46  - **Keep dimension values few and fixed.** Never a URL, a trace id, an
   47    organisation or a user as a dimension: each distinct value is a
   48    separate CloudWatch metric.
   49  - **One dimension set per metric.** Publish each metric with exactly the
   50    dimensions in the table, so the dashboard query does not have to guess
   51    which combination holds the data. Every query, panel and alert then
   52    uses that full set: CloudWatch does not add up across a published
   53    dimension, so `external.call.failure` queried by `dependency` alone
   54    finds nothing.
   55  
   56  Record the agreed table on the ticket.
   57  
   58  ## Publish (Java, Spring Boot)
   59  
   60  One way: every metric is an ordinary Micrometer meter, and
   61  `EmfMeterRegistry` publishes them all to CloudWatch as Embedded Metric
   62  Format. No EMF code at a call site. `@Timed`, `@Counted`,
   63  `Timer.builder`, `Counter` and `Gauge` all publish properly, with their
   64  tags as dimensions.
   65  
   66  The reference implementation is `trade-imports-address-book`
   67  (EUDPA-674), package `uk.gov.defra.trade.imports.addressbook.metrics`,
   68  with its tests alongside. `[UNPROVEN]` in dev CloudWatch until that
   69  release is checked there. Read it before writing anything.
   70  
   71  ### Copy as it is
   72  
   73  These classes have nothing service-specific. Copy them into the
   74  service's `metrics` package and change only the package:
   75  
   76  | Class | What it does |
   77  |---|---|
   78  | `EmfMeterRegistry` | A `StepMeterRegistry` that publishes its gauges, counters, timers and distribution summaries once a step (`aws.emf.step`, one minute by default) in the `aws.emf.namespace` namespace, tags as the only dimensions. Timers and distribution summaries publish every value recorded since the last publish (timers in ms), so CloudWatch computes `SampleCount`, `Sum`, `Average`, `p95` and `Maximum` itself; the EMF library splits more than 100 values across documents. Counters publish the last step's count; gauges their value when finite. Long task timers, function counters, function timers and time gauges are not published. One meter failing to publish is logged at warn and the rest still go |
   79  | `ValueRecordingTimer`, `ValueRecordingDistributionSummary`, `RecordedValues` | Package-private: Micrometer's step timer and summary, also keeping each recorded value until the registry takes it |
   80  | `ExternalCallRecorder` | Logs each call to a dependency (`LOGGING.md`) and records it as the timer `external.call.duration` and the distribution summary `external.call.failure` (0 or 1 per call), both tagged `dependency` and `operation`. `recordSuccess` and `recordFailure` (with the cause), not a boolean flag. It records a call it is given; it does not time one or keep its outcome. Each metric name is written once, at its one registration call, and the `dependency` tag key is `ExternalCallRecorder.DEPENDENCY_TAG`, which `DependencyAvailabilityMetrics` uses too. A service with its own `ExternalCallMetrics` replaces it ("A service built the old way") |
   81  
   82  Copy the bean method `MetricsConfig.emfMeterRegistry` too, but not its
   83  class. It creates and starts the registry only when `aws.emf.enabled`
   84  is true. When it is false, as in integration tests, Spring Boot's
   85  in-memory registry is used and nothing is published. It reads two more
   86  properties, both in address-book's `application.yml` under `aws.emf`:
   87  
   88  - `aws.emf.environment` (`${AWS_EMF_ENVIRONMENT:}`). Blank, the default,
   89    leaves the EMF library to detect the environment; on CDP that is ECS,
   90    sending to the platform's `AWS_EMF_AGENT_ENDPOINT`. Set it to `Local`
   91    to write the EMF documents to stdout.
   92  - `aws.emf.step` (`${AWS_EMF_STEP:1m}`), bound to a `Duration` and passed
   93    to `new EmfMeterRegistry(namespace, step, Clock.SYSTEM,
   94    MetricsLogger::new)`: how often the registry publishes.
   95  
   96  Add the method to
   97  the service's existing `MetricsConfig` in its `configuration` package,
   98  not to a new class in `metrics`. Keep that class's `TimedAspect` bean:
   99  `@Timed` records nothing without it. `@Counted` needs its
  100  `CountedAspect` bean, which dynamics-gateway's does not have yet. A
  101  service with no `MetricsConfig` gets one in its `configuration`
  102  package, with the `TimedAspect` and `CountedAspect` beans as in
  103  address-book.
  104  
  105  ### Write for the service
  106  
  107  | Class | What it does |
  108  |---|---|
  109  | Where calls are measured | One place per kind of dependency, timing each call and passing it to `ExternalCallRecorder`: a driver `CommandListener` for a database (`MongoCommandMetrics`), a Feign `Capability` or a `RestClient` interceptor for HTTP. Measure at the transport, not in the calling service class, so every call is caught |
  110  | `DependencyAvailabilityMetrics` | Registers the gauge `external.dependency.available`, tagged `dependency`, from wherever availability comes from ("Availability" below) |
  111  | A business-metrics class (`AddressMetrics`) | One counter per agreed business metric, tagged by its dimension |
  112  | `@Timed("controller.<operation>.time")`, `@Timed("service.<operation>.time")` | On every controller endpoint and every public method of the service classes, so each invocation's duration is published |
  113  
  114  ### Rules
  115  
  116  - **Add every metric name to the service's Micrometer allowlist.**
  117    address-book's `application.yml` has `management.metrics.enable.all:
  118    false` with the names allowed. A name not on it gets a no-op meter:
  119    no error, no metric. Add each custom name in full
  120    (`external.call.duration: true`, `cache.hit: true`) and each `@Timed`
  121    prefix (`controller: true`, `service: true`). An entry enables every
  122    meter whose name starts with it, so never shorten a custom name to its
  123    first word: `cache: true` would also publish Spring Boot's own
  124    `cache.*` meters. That allowlist is the one
  125    control of what is published. It also decides what Spring Boot's own
  126    meters publish: on address-book it had silenced its repository and
  127    Mongo timers. Allowing a meter type `EmfMeterRegistry` does not
  128    publish still publishes nothing: `http.server.requests.active` is a
  129    long task timer, so address-book leaves it off.
  130  - **`@Timed` works only through a Spring proxy.** The method must be
  131    public and called from another bean. A private method, or one called
  132    from inside its own class, is never timed, with no error. An
  133    annotation on a Spring Data repository interface method recorded
  134    nothing when tried on address-book; measure database calls with the
  135    driver's listener instead.
  136  - **Delete the service's `EmfMetricsPublisher`** (and its test). It
  137    publishes the same meters again, with no dimensions and running
  138    totals.
  139  - **Delete any direct EMF writer** (`EmfMetricWriter` and the like).
  140    Every metric goes through Micrometer.
  141  - **No `@EnableScheduling` for metrics.** The registry publishes on its
  142    own thread. Remove the annotation if nothing else uses it.
  143  - **A metric never breaks a request.** Recording a Micrometer meter does
  144    not throw, and publishing happens on the registry's thread.
  145  - **A step meter's `count()` is the last completed step's,** not the
  146    running one. In a test with the registry switched on, assert on
  147    registration; with it off (Spring Boot's in-memory registry), counts
  148    are running totals and can be asserted.
  149  - **Values are timestamped when published,** up to a step after they
  150    were recorded.
  151  - **Caches** `[UNPROVEN]`, not yet done this way on a service: the
  152    counters `cache.hit` and `cache.miss`, tagged `cache` with the cache's
  153    name, as in the agreed table and the dashboard's "Cache hits and
  154    misses" panel. Increment one on each lookup, from the code that reads
  155    the cache, and add both names to the allowlist. Not Micrometer's cache
  156    binder: it publishes `cache.gets` under other names and tags, and as
  157    function counters, which `EmfMeterRegistry` does not publish.
  158  
  159  ### A service built the old way
  160  
  161  These services write EMF directly and publish the older PascalCase
  162  names, not the dot-case names above (their `main`, checked 2026-11-06):
  163  
  164  | Service | Where | Publishes |
  165  |---|---|---|
  166  | `trade-imports-reference-data` (EUDPA-632) | `metrics` package: `EmfMetricWriter`, `ExternalCallMetrics`, scheduled `DependencyAvailabilityMetrics` and `CacheMetrics`, `LookupMetrics` | Every old name in the table below |
  167  | `trade-imports-dynamics-gateway` | `metrics/ExternalCallMetrics.java` and `metrics/ExternalCall.java`, measuring the Service Bus send in `QueueMessageSender` | `ExternalCallDuration`, `ExternalCallFailure`, dimensions `Dependency`, `Operation` |
  168  | `trade-imports-animals-frontend`, `-ins-frontend`, `-plants-frontend` | `src/server/common/helpers/external-call-metrics.js` | `ExternalCallDuration`, `ExternalCallFailure`, dimensions `Dependency`, `Operation` |
  169  
  170  `trade-imports-animals-admin` publishes none of these metrics.
  171  
  172  When this skill runs on one of them, move it to the new names first. A
  173  Java service moves to the one way above as well; a Node service renames
  174  the names in its helper (there is no Node recipe yet: `SKILL.md` →
  175  "What is proven"). The CloudWatch metrics then change name, so
  176  regenerate its dashboard (`DASHBOARD.md` → "Generate") and rebuild its
  177  alerts from a new build sheet (`ALERTS.md` → "Build") in the same run;
  178  the old ones go quiet.
  179  
  180  | Old | New |
  181  |---|---|
  182  | `ExternalCallDuration`, `ExternalCallFailure` | `external.call.duration`, `external.call.failure` |
  183  | `DependencyAvailable` | `external.dependency.available` |
  184  | `CacheHit`, `CacheMiss` | `cache.hit`, `cache.miss` |
  185  | `Lookup` | `lookup` |
  186  | Dimensions `Dependency`, `Operation`, `Cache`, `LookupType` | `dependency`, `operation`, `cache`, `lookup.type` |
  187  
  188  The Java classes move as follows. Rows that name a class only one
  189  service has apply to that service.
  190  
  191  | Old | New |
  192  |---|---|
  193  | The service's own `ExternalCallMetrics` writing EMF (`recordCall(…, boolean)`) | Replaced by address-book's `ExternalCallRecorder` ("Copy as it is"). `ExternalCall` stays as the list of calls; pass its `dependency()` and `operation()` |
  194  | `ExternalCallMetrics.measure(…)` around the Service Bus send (dynamics-gateway) | `QueueMessageSender` times the send itself, then calls `recordSuccess`, or `recordFailure` with the exception thrown |
  195  | `ExternalCallMetrics.measure(…)` around each Feign call (reference-data) | Moves into `ExternalCallFeignCapability`, which stays as the place calls are measured. It times `client.execute` itself, then calls `recordSuccess`, or `recordFailure` with the exception thrown, or with no cause for a response of 400 or over |
  196  | `ExternalCallMetrics.lastCallSucceededByDependency()` | A small `LastCallOutcomes` component holding the last outcome per dependency. `ExternalCallFeignCapability` updates it on each success and failure, beside its `recordSuccess` or `recordFailure` call, so `ExternalCallRecorder` stays a copy |
  197  | The `Interface` property (the volumetrics `SYN-19` id) on each EMF document | No meter carries it: as a tag it would be a new dimension. Agree with the team before the move, and record the choice on the ticket: keep it as an `interface.id` key-value on the call's log line, in this service's copy of `ExternalCallRecorder`, or drop it |
  198  | `EmfMetricWriter` | Deleted; each metric becomes a meter |
  199  | `@Scheduled` `DependencyAvailabilityMetrics` | One `external.dependency.available` gauge per dependency in `ExternalCall`, tagged `dependency`, reading `LastCallOutcomes`: 1 after a success, 0 after a failure, NaN (not published) before the first call |
  200  | `@Scheduled` `CacheMetrics` | `cache.hit` and `cache.miss` counters tagged `cache` (Rules → "Caches") |
  201  | `LookupMetrics` | The counter `lookup` tagged `lookup.type` |
  202  | `EmfMetricsPublisher` | Deleted |
  203  
  204  ### Availability: passive or active
  205  
  206  `external.dependency.available` can come from a probe the service sends, or from
  207  the outcome of the calls it already makes.
  208  
  209  - **Passive (used on reference-data).** Report the outcome of the most
  210    recent real call, kept in `LastCallOutcomes` ("A service built the
  211    old way"). No extra traffic. The cost: the value is as old as
  212    the last call, and nothing is published until the first call after
  213    start-up. Where a cache sits in front of the dependency, that can be
  214    as long as the cache lifetime.
  215  - **Active.** Send a cheap probe every minute. Always fresh. Only use it
  216    where a probe is free and harmless. Do not probe a dependency whose
  217    calls are rate-limited or cost a real token request.
  218  
  219  For an HTTP dependency, alert on `external.call.failure` over a time
  220  window, per `dependency` and `operation` (`ALERTS.md`), not on
  221  `external.dependency.available`. A passive reading lags by up to the cache
  222  lifetime and holds a single failure until the next success; an active
  223  probe is itself a call, so it records `external.call.failure` too. A
  224  database is the exception: its availability comes from the driver's
  225  heartbeats, which are fresh, so alert on it (below).
  226  
  227  ### A database
  228  
  229  A database the service has configured is a dependency (`SKILL.md` Step
  230  1). Written and tested on `trade-imports-address-book` (EUDPA-674,
  231  package `uk.gov.defra.trade.imports.addressbook.metrics`), where MongoDB
  232  is the only dependency. `[UNPROVEN]` in dev CloudWatch until that release
  233  is checked there.
  234  
  235  - **Take availability from the driver's cluster description, by
  236    default.** The MongoDB driver already checks each server every 10
  237    seconds on its own monitoring connections and keeps the result in its
  238    cluster description. A `ClusterListener` (`MongoAvailability`, added
  239    with `MongoClientSettings.applyToClusterSettings(b ->
  240    b.addClusterListener(...))`) reads the servers the driver monitors now
  241    on each change. The database is available while a connected server
  242    accepts writes (`ServerDescription.isPrimary()`: a primary, standalone,
  243    mongos or load balancer). It is unavailable once every server has been
  244    checked and none accepts writes: every check failed, or the only
  245    connected servers are secondaries. It is unknown while the driver
  246    monitors no servers, or one has not been checked yet. A server the
  247    driver has removed drops out. `DependencyAvailabilityMetrics` registers it
  248    as the gauge `external.dependency.available{dependency=mongodb}` (NaN, so not
  249    published, while unknown). No extra traffic, no scheduled probe, never
  250    in `/health`. Not a `ServerMonitorListener`: it is not told which
  251    servers the driver still monitors, so a removed server's last success
  252    would hold the database up.
  253  - **Log only the change.** A heartbeat is not a call the service makes,
  254    so it gets no external-call log line and no `external.call.duration`:
  255    that would be several lines a minute per task. Log once on every
  256    change of state, naming the servers:
  257  
  258    | Change to | Level | Message |
  259    |---|---|---|
  260    | Available | INFO | `MongoDB is available, servers {}` |
  261    | Unavailable, a server connected but none accepts writes | WARN | `MongoDB is unavailable: servers {} are connected but none accepts writes` |
  262    | Unavailable, every check failed | WARN, with the first failed check's exception | `MongoDB is unavailable, servers {}` |
  263    | Unknown | WARN | `MongoDB availability is unknown until every server is checked, servers {}` |
  264  - **Know what a check proves.** Monitoring connections may not sign in,
  265    so a successful check proves the server is up, not that the service's
  266    credentials work. Where that gap matters, add a scheduled `ping`
  267    command bounded by `MongoTemplate.getDb().withTimeout(...)`, and record
  268    the choice here.
  269  - **Measure the real commands too, if the team wants query latency.** A
  270    driver `CommandListener` (`MongoCommandMetrics`, added with
  271    `addCommandListener`) records every command as `mongodb/<command
  272    name>` through `ExternalCallRecorder`. Keep the operation to a fixed set
  273    of command names, with anything else as `other`. A command counts as
  274    a failure when the driver reports it failed (`CommandFailedEvent`: a
  275    network error or an `ok: 0` reply), or when an `ok: 1` reply carries
  276    `writeErrors` (a duplicate key, say) or a `writeConcernError` (a
  277    majority write-concern timeout, say). For those two it records a
  278    `MongoReplyWriteException` whose message holds only the error codes
  279    and code names, never the server's `errmsg`: a duplicate key's
  280    `errmsg` holds the key's value. A command that never
  281    reaches the server (no server to select) fires no listener event, so
  282    these metrics do not show an outage; the heartbeat does.
  283  - **Alerts.** Which rules a service with a database gets:
  284    `assets/alerts.template.md` → "Check".
  285  - **Test it** with unit tests that feed the listener cluster
  286    descriptions (several servers, one failing, all failing, connected
  287    secondaries only, the primary removed, one not yet checked, no
  288    servers, recovery, and one log line per change at the level and with
  289    the message above, none while another server still accepts writes),
  290    unit tests that feed the command listener a reply with `writeErrors`
  291    and one with a `writeConcernError`, an integration test that the application's own client
  292    reports available (it goes red if the listener is not registered), and
  293    an integration test with a throwaway Testcontainers database that is
  294    started, seen available, stopped, and seen unavailable. Do not stop the
  295    shared Testcontainers database: the other integration tests need it.
  296  
  297  ### Tests
  298  
  299  address-book's tests are the ones to copy.
  300  
  301  | Test | Proves |
  302  |---|---|
  303  | `EmfMeterRegistryTest` (copied as it is), with `CapturingEmfEnvironment` and a `MockClock` | The EMF documents: namespace, tags as the only dimensions, every recorded value, units, counters per step, gauges skipped while NaN, more than 100 values split, one bad meter not stopping the rest |
  304  | A unit test per metrics class, with a `SimpleMeterRegistry` | Each meter's name, tags and recorded values |
  305  | An integration test with `aws.emf.enabled=true`, `aws.emf.environment=Local` and `aws.emf.step=1s` in its `@TestPropertySource` (`EmfMeterRegistryIT`), so EMF writes to the console every second | The registry is the one in use, and every custom metric name is let through the allowlist: each is recorded, then `meterRegistry.find(name)` is not null. A denied meter is never registered, so a missing or misspelled allowlist entry turns it red |
  306  | The same integration test records a call and waits up to 10 seconds for an EMF document on the console, captured with `testsupport/CapturedConsole` | The registry publishes on its own thread once started. Turns red if `MetricsConfig` does not call `start` |
  307  | An integration test per annotated class (`AddressTimingIT`) | Each `@Timed` method, called through the Spring proxy, adds one call to its own timer. Turns red if the allowlist lacks the prefix |
  308  | An integration test with the dependency failing (`ExternalCallRecorderIT`: a command the server rejects, and a duplicate-key insert) | The failure is recorded against the right dependency and operation |
  309  | The existing health check test | `/health` is still `UP` with no components |
  310  
  311  Run the repo's full build before pushing:
  312  
  313  ```bash
  314  mvn -f ~/git/defra/trade-imports-workspace/repos/<service>/pom.xml verify
  315  ```
```

## File: `CLAUDE.md`

### Diff

```diff
diff --git a/CLAUDE.md b/CLAUDE.md
index 8c0aa0f9..491987f3 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -47,7 +47,7 @@ Skills live at `.claude/skills/<name>/SKILL.md` and are auto-discovered. Route b
 | `govuk-upgrade` | "upgrade govuk-frontend", "govuk upgrade", "walk govuk EUDPA-X", "implement govuk EUDPA-X" | Per-version govuk-frontend upgrade with CHANGELOG-driven plans (JSON-state, dispatcher, walker). |
 | `skill-creator` | "scaffold skill `<name>`", "skill-create `<name>`", "new workspace skill `<name>`", "audit skill `<name>`", "audit skills" | Meta-skill — CREATE scaffolds a new workspace skill; AUDIT walks an existing skill against the 8-pattern checklist. |
 | `understanding-check` | "interview EUDPA-X", "check understanding EUDPA-X", "understanding-check EUDPA-X" | Pre-merge author-understanding check on an AI-assisted PR. |
-| `service-observability` | "add observability to", "add metrics and alerts to", "add a dashboard and alerts to", "observability for EUDPA-" | Add custom metrics, dependency call logging, a Grafana dashboard and alerts to one CDP service, then promote them and prove the alerts fire. Written from the EUDPA-632 spike on `trade-imports-reference-data`; the Grafana, Slack and promotion steps are from the CDP docs and marked `[UNPROVEN]` until a run confirms them. |
+| `service-observability` | "add observability to", "add metrics and alerts to", "add a dashboard and alerts to", "observability for EUDPA-" | Add custom metrics, dependency call logging, a Grafana dashboard and alerts to one CDP service, then promote them and prove the alerts fire. Written from the EUDPA-632 spike on `trade-imports-reference-data`; its code recipe (Micrometer meters published by `EmfMeterRegistry`, dot-case names) is from EUDPA-674 on `trade-imports-address-book`, proven by tests there. Its "What is proven" table says which steps have been done on a real service. |
 | `frontend-change` | "add a field to the frontend", "add a page to the frontend", "add a section to the frontend", "add a collection to the frontend", "change an obligation", "change the journey flow", "change the frontend" | One recipe-verbatim increment on a frontend repo (today `trade-imports-animals-frontend`, src/server/app): recipes for additive elements, guard-railed maintenance for obligations and journey flow, verification ladder throughout, then a post-verification sync of the `openspec/` behaviour spec and coverage entries the increment touched. |
 | `requirements-pipeline` | "distil requirements", "distil these sources", "turn these requirements into a backlog", "build a backlog from", "consolidate requirements", "re-distil", "orchestrate the build", "run the increment build loop", "build increments from", "build N increments", "resume the build run", "hand over the build" | Sources in, one backlog.json of full-stack requirement increments out (DISTIL), then built one increment at a time through the increment build loop (BUILD). The backlog shape, the loop and its Codex briefs live beside it. |
 | `service-tag` | "tag specs for `<service>`", "service-tag", "tag service specs", "add service tags" | Tags the ins-tests specs in other domains that a service's PR should also run, tags only specs that exercise the service, and keeps `config/e2e-tests-pr-scope.json`'s `tags` in step. Asks at the start whether to leave changes unstaged (default), commit on current branches, or branch first. |
```

### File at the reviewed commit, with line numbers

```markdown
    1  # trade-imports workspace
    2  
    3  This is a local workspace aggregating the independent GitHub repos of the DEFRA trade imports services. It is **not** a monorepo — each repo has its own git history, remotes, and CI. This folder provides shared tooling and cross-repo context.
    4  
    5  The load-bearing rules that agents must always honour are kept **inline** below. The volatile reference catalogues (make targets, common workflows, the `tools/` index, worker references, the workareas map) live as topic files under [`docs/reference/`](docs/reference/) — see the [Reference catalogues](#reference-catalogues) pointer near the foot of this file.
    6  
    7  ## Load-bearing rules
    8  
    9  ### 1. Canonical clone location
   10  
   11  Clone the workspace to `~/git/defra/trade-imports-workspace` — see [`docs/agent-onboarding.md`](docs/agent-onboarding.md#1-canonical-clone-location). Scripts under `tools/` hardcode that path, so a checkout under any other name will not work. No env var to set, and no symlink to maintain: the canonical path is the checkout.
   12  
   13  ### 2. Branches: naming, cross-repo parity and where to work
   14  
   15  - Branch naming: `feat/EUDPA-XXXX[-slug]` or `chore/EUDPA-XXXX[-slug]` (also `fix/EUDPA-XXXX[-slug]`).
   16  - Cross-repo branches must share the **same name** across every affected repo — the workspace stack's `--branch` flag probes each repo for a matching branch-tagged image and falls back to `:latest` per service, so mismatched names break the linked-branch pickup.
   17  - PRs: raise against `main` in the relevant repo.
   18  - Cross-repo changes: coordinate via the tests repo. A fix that needs two repos changes both, the tests repo included.
   19  - Splitting a branch: every part keeps the ticket key. `chore/EUDPA-35-frontend-test-rewrites`, not `chore/admin-notifications-tidy`.
   20  - A programme of several tasks in one repo: one branch, one PR, a commit per task, merged once at the end.
   21  - **Where to work:** on branches in this checkout and in `repos/`, switched in place (`git checkout` or `tim workspace branch <name>`). No git worktrees: the stack builds and mounts `repos/<repo>`, so work in a worktree is invisible to E2E and to `git status`. No side clones to keep out of another session's way. The one exception is the worktrees `journey-builder` creates for its own runs.
   22  - **Reading `main`:** a `repos/` checkout is often on a spike branch, so check `git -C <repo> branch --show-current` first. Read `main` with `git -C <repo> show origin/main:<path>`, or from a shallow clone in the scratchpad that you read and never write to.
   23  - **Stashing:** only when a branch switch forces it, with `git stash push -u`. Leave untracked `workareas/` files alone.
   24  - **Exempt: the plants prototype's own `design/<set>-<slug>` branches.** `trade-imports-plants-prototype` has no Docker stack service (`dockerStack: null`) and no branch-tagged image to probe for, so a design branch never needs a matching name anywhere else. A hand-off out of the prototype is different work, not a prototype branch: it lands as one real `feat/EUDPA-N-<slug>` (or `feat/NO_JIRA-<slug>` without a ticket yet) across every real repo it touches — `trade-imports-plants-frontend`, `trade-imports-plants-backend`, the tests repo, this workspace's `openspec/` — following the same-name rule above like any other cross-repo change.
   25  
   26  ### 3. Banned actions
   27  
   28  - **Never edit `docker/stack/.staged/`** — it is generated on every stack start; edits are silently overwritten.
   29  - **Never commit `workareas/`** — it is gitignored runtime cache. The sole exception is `workareas/shared/` (tracked via a `.gitignore` negation for review handoff).
   30  - **Never let cross-repo branches drift** — same branch name across every affected repo (see rule 2).
   31  - **Never merge a PR you raised by hand without the user's go in that conversation.** When it is green, post the PR link and the evidence, then stop. Delete the branch only after the merge. This holds even when a brief says "merge on green". A build loop merges its own green increments as its skill says (`requirements-pipeline` BUILD).
   32  - **Never write to CDP platform repos** (`DEFRA/cdp-app-config`, `cdp-tf-svc-infra`, `cdp-app-deployments`, `cdp-documentation`): no branch, commit, push, PR or `git add`. Edit the files in a local clone, show the user the diff and leave the rest to them. Reading is fine.
   33  - **Before pushing code changes:** a `PreToolUse` hook runs the real SonarCloud quality gate automatically on `git push` and blocks the push if it fails (see SonarCloud integration below). If `SONAR_TOKEN` isn't set locally, the hook skips gracefully — run the same check manually in that case.
   34  
   35  ### 4. Skill routing index
   36  
   37  Skills live at `.claude/skills/<name>/SKILL.md` and are auto-discovered. Route by trigger phrase:
   38  
   39  | Skill | Triggers | Purpose |
   40  |---|---|---|
   41  | `ticket-creator` | "create ticket", "raise ticket", "new ticket", "file a bug", "flesh out ticket" | Create a new Jira ticket end-to-end (Bug/Story/Task). |
   42  | `ticket-refiner` | "is ticket ready", "pre-refinement", "refinement check" | Assess whether a ticket is READY / NEEDS WORK / SPIKE REQUIRED. |
   43  | `ticket` | "plan EUDPA-", "implement EUDPA-", "refactor", "tidy up" | Plan / implement / refactor an existing ticket. |
   44  | `review` | "review EUDPA-", "re-review", "walk review", "implement review" | Code review across all languages and repos (correctness, security, tests). |
   45  | `code-style` | "style review EUDPA-", "walk style EUDPA-", "triage style", "fix style EUDPA-", "lint review" | JS code-style review + remediation against the 16-rule guide. |
   46  | `npm-upgrade` | "upgrade npm deps", "upgrade dependencies", "walk upgrade EUDPA-X", "implement upgrade EUDPA-X" | Three-phase non-govuk-frontend npm upgrade workflow + interactive manual-side walker. |
   47  | `govuk-upgrade` | "upgrade govuk-frontend", "govuk upgrade", "walk govuk EUDPA-X", "implement govuk EUDPA-X" | Per-version govuk-frontend upgrade with CHANGELOG-driven plans (JSON-state, dispatcher, walker). |
   48  | `skill-creator` | "scaffold skill `<name>`", "skill-create `<name>`", "new workspace skill `<name>`", "audit skill `<name>`", "audit skills" | Meta-skill — CREATE scaffolds a new workspace skill; AUDIT walks an existing skill against the 8-pattern checklist. |
   49  | `understanding-check` | "interview EUDPA-X", "check understanding EUDPA-X", "understanding-check EUDPA-X" | Pre-merge author-understanding check on an AI-assisted PR. |
   50  | `service-observability` | "add observability to", "add metrics and alerts to", "add a dashboard and alerts to", "observability for EUDPA-" | Add custom metrics, dependency call logging, a Grafana dashboard and alerts to one CDP service, then promote them and prove the alerts fire. Written from the EUDPA-632 spike on `trade-imports-reference-data`; its code recipe (Micrometer meters published by `EmfMeterRegistry`, dot-case names) is from EUDPA-674 on `trade-imports-address-book`, proven by tests there. Its "What is proven" table says which steps have been done on a real service. |
   51  | `frontend-change` | "add a field to the frontend", "add a page to the frontend", "add a section to the frontend", "add a collection to the frontend", "change an obligation", "change the journey flow", "change the frontend" | One recipe-verbatim increment on a frontend repo (today `trade-imports-animals-frontend`, src/server/app): recipes for additive elements, guard-railed maintenance for obligations and journey flow, verification ladder throughout, then a post-verification sync of the `openspec/` behaviour spec and coverage entries the increment touched. |
   52  | `requirements-pipeline` | "distil requirements", "distil these sources", "turn these requirements into a backlog", "build a backlog from", "consolidate requirements", "re-distil", "orchestrate the build", "run the increment build loop", "build increments from", "build N increments", "resume the build run", "hand over the build" | Sources in, one backlog.json of full-stack requirement increments out (DISTIL), then built one increment at a time through the increment build loop (BUILD). The backlog shape, the loop and its Codex briefs live beside it. |
   53  | `service-tag` | "tag specs for `<service>`", "service-tag", "tag service specs", "add service tags" | Tags the ins-tests specs in other domains that a service's PR should also run, tags only specs that exercise the service, and keeps `config/e2e-tests-pr-scope.json`'s `tags` in step. Asks at the start whether to leave changes unstaged (default), commit on current branches, or branch first. |
   54  | `spec-catchup` | "catch-up", "catch-up animals/plants/ins/animals-admin", "catch-up and cover" | **The code does something the spec does not say** — runs one domain's full test suite, walks every `spec.md` in the prefix (not `tim spec gaps`) against the report and source, edits/adds/updates a coverage link/deletes as the evidence dictates. Drives "catch-up and cover" (this skill then `spec-cover`, per domain). |
   55  | `spec-cover` | "cover", "cover animals/plants/ins/animals-admin" | **The spec says something no test proves** — works `tim spec gaps --none` for that prefix, maps every Then to an assert, writes the test, proves it with an invert-red/restore-green probe, commits in the service repo on the same branch name. |
   56  | `theme-ticket` | "write the business tickets for `<theme>`", "write the theme ticket", "the build loop is starting on `<theme>`", "`<theme>` has merged", "which theme tickets are stale" | Fills in a built theme's Jira tickets automatically from `openspec/` — one Story per service domain, run at four points in the theme's life (split, loop start, loop drained, merge). No approval gate: the ticket is what the business reviews. |
   57  | `prototype` | "the prototype", "my design release", "crit notes", "research session", "demo the prototype", "hand this to the real team", "make this real" — or any request from a designer (`CLAUDE.local.md` marker) | Front door for a designer working on the high-risk plants prototype (`trade-imports-plants-prototype`) from a Claude Code session opened at this workspace root. Holds no steps of its own beyond routing — every change is made by a `references/<name>.md` file it opens for you, read against the real `trade-imports-plants-frontend`, its recipes and `docs/best-practices/` so the result matches house conventions without the designer having to ask. |
   58  
   59  A request about pages, words, examples or journeys goes to `prototype` when
   60  the person is a designer (see `CLAUDE.local.md`, set by `tim prototype
   61  setup`) or names the prototype, a design release or a `design/*` branch;
   62  otherwise the developer skills above apply. `frontend-change` and
   63  `ticket-creator` already say so in their own descriptions. With no
   64  `CLAUDE.local.md` marker, a request that names only a page several services
   65  have ("the dashboard", "the address page") and no service or repo gets one
   66  plain question before any work: the prototype, or which service?
   67  
   68  Per-skill fan-out worker personas are catalogued in [`docs/reference/worker-references.md`](docs/reference/worker-references.md).
   69  
   70  ### 5. Code quality
   71  
   72  The house rules on comments, names, structure, logging and tests live in [`.claude/rules/code-quality.md`](.claude/rules/code-quality.md). They apply to every session, skill, workflow and agent, and win over any guide under `docs/best-practices/`. An agent that does not load `.claude/rules/` (Codex, a workflow agent) gets that file's path in its brief.
   73  
   74  ### 6. A red test on your branch is yours to fix
   75  
   76  Fix it, whoever caused it. "Pre-existing", "flaky", "unrelated", "environmental" and "track it separately" never close a failure. A different test failing on each run points to a race: read `test-results/*/error-context.md` and find it. If you cannot fix it (it needs product input or credentials you lack), say so and ask.
   77  
   78  ### 7. Canary first
   79  
   80  To make one change across several repos, services or environments, apply it to one target that needs the whole change, check it, then do the rest. Check every target afterwards, not a sample.
   81  
   82  ### 8. Extend the tools, don't work round them
   83  
   84  When `tim` or a `tools/` script lacks an option you need, add it (with its `--help` and tests) and commit it. Do not reach for a one-off `curl`, `jq` or raw API call.
   85  
   86  GitHub is the exception. Use the GitHub CLI (`gh`) directly for pull requests, checks, Actions runs and the GitHub API (`gh api`). Never wrap `gh` or the GitHub API in `tim` or a new `tools/` script.
   87  
   88  ### 9. Workspace config is committed and portable
   89  
   90  Config at the workspace root (MCP servers, hooks, settings) goes in a committed file with no machine-specific paths, so every clone gets it. Not in local scope (`~/.claude.json`).
   91  
   92  ### 10. Rules go in the repo, not memory
   93  
   94  A correction about code, tests, tooling or process is an edit to its committed home: `.claude/rules/`, `docs/best-practices/`, a skill, a repo's `docs/`, or lint. Make the edit and commit it. A programme's state goes in its workarea handover (`workareas/shared/<programme>/`).
   95  
   96  ## Repo map
   97  
   98  | Folder | GitHub repo | Role | Stack |
   99  |--------|------------|------|-------|
  100  | `repos/trade-imports-animals-frontend` | DEFRA/trade-imports-animals-frontend | User-facing web application | Node.js |
  101  | `repos/trade-imports-animals-backend` | DEFRA/trade-imports-animals-backend | API / business logic service | Java / Spring Boot |
  102  | `repos/trade-imports-ins-tests` | DEFRA/trade-imports-ins-tests | End-to-end, accessibility and security test suite — one directory per domain (`animals`, `animals-admin`, `ins`, `plants`), each with `e2e`, `a11y` and `security` test types, run by a single `chromium` Playwright project | Node.js |
  103  | `repos/trade-imports-performance-tests` | DEFRA/trade-imports-performance-tests | k6 performance-test suite for INS (a CDP performance-test suite) — runs against the stack rather than in it (`dockerStack: null` in `repos.json`) | k6 / Node.js tooling |
  104  | `repos/trade-imports-animals-admin` | DEFRA/trade-imports-animals-admin | Internal admin interface | Node.js |
  105  | `repos/trade-imports-stub` | DEFRA/trade-imports-stub | Stub of upstream trade-imports services | Java / Spring Boot |
  106  | `repos/trade-imports-reference-data` | DEFRA/trade-imports-reference-data | Reference data service | Java / Spring Boot |
  107  | `repos/trade-imports-defra-id-stub` | DEFRA/trade-imports-defra-id-stub | Stub of the Defra ID (OIDC) sign-in service | Node.js |
  108  | `repos/trade-imports-dynamics-gateway` | DEFRA/trade-imports-dynamics-gateway | Centralised gateway forwarding events to Azure Service Bus (ADR-EUDP-001 Option B) | Java / Spring Boot |
  109  | `repos/trade-imports-address-book` | DEFRA/trade-imports-address-book | Org-scoped address book API (system of record for Standard Address Block records) | Java / Spring Boot |
  110  | `repos/trade-imports-ins-frontend` | DEFRA/trade-imports-ins-frontend | Import Notification Service front-door (address-book UI, sign-in, dashboard shell) | Node.js |
  111  | `repos/trade-imports-ins-backend` | DEFRA/trade-imports-ins-backend | Aggregates notification events into a cross-journey read model | Java / Spring Boot |
  112  | `repos/trade-imports-plants-frontend` | DEFRA/trade-imports-plants-frontend | High-risk plants journey (implemented on the shared journey platform; requirements still being reconciled) | Node.js |
  113  | `repos/trade-imports-plants-prototype` | DEFRA/trade-imports-plants-prototype | Prototype copy of the plants frontend, for designers — its `upstream` remote is `trade-imports-plants-frontend`; sync with `npm --prefix ~/git/defra/trade-imports-workspace/repos/trade-imports-plants-prototype run sync:upstream` (overrides-aware, applies `overrides.json`'s `ours`/`deleted` rules — a plain upstream merge would not). Runs standalone on port 3103 (its real twin's plus 100), by design not part of the Docker stack (`dockerStack: null` in `repos.json`) and not covered by `workspaceBranchSync` — see [`docs/repos/trade-imports-plants-prototype.md`](docs/repos/trade-imports-plants-prototype.md). | Node.js |
  114  | `repos/trade-imports-plants-backend` | DEFRA/trade-imports-plants-backend | High-risk plants notification persistence | Java / Spring Boot |
  115  | `repos/trade-imports-schemas` | DEFRA/trade-imports-schemas | Shared schema definitions | Node.js |
  116  
  117  Work on a specific repo by entering its directory:
  118  
  119  ```bash
  120  cd repos/trade-imports-animals-frontend   # then use claude, git, npm etc. as normal
  121  ```
  122  
  123  Run `make help` from this directory to see all cross-repo commands.
  124  
  125  ## `tim` CLI (alternative to Make + tools/)
  126  
  127  [`tim/`](tim/) is a Node.js CLI that mirrors the Makefile + read-only
  128  parts of `tools/`. Library-first integrations (REST clients —
  129  no shell-out to `gh`/`jq`), behaviourally tested, deterministic
  130  `--json` output for skill use. Dual-runs with the bash; pick whichever.
  131  
  132  tim has no GitHub commands. For pull requests, checks, Actions runs and
  133  GitHub auth, use the GitHub CLI directly: `gh search prs EUDPA-X --owner
  134  DEFRA`, `gh pr create|view|diff|checks|merge`, `gh run view|rerun|watch`,
  135  `gh auth status` (see rule 8).
  136  
  137  ```bash
  138  npm --prefix ~/git/defra/trade-imports-workspace/tim link   # tim on PATH
  139  tim --help                # full surface
  140  tim workspace status      # equivalent of `make status` + jq-friendly --json
  141  tim docker dev            # equivalent of `scripts/stack/run-stack.sh -d`
  142  tim jira ticket EUDPA-X   # equivalent of tools/jira/ticket.sh
  143  tim auth                  # check Jira and Confluence sign-in (GitHub: gh auth status)
  144  tim capture <workarea> --app <name>  # photograph a running app from its own Playwright traces
  145  tim backlog registry list # every registered programme, its profile and workarea
  146  tim jira create --from ticket.json --dry-run   # plan a Jira create from a tim-ticket/1 manifest; --confirm <planId> to create for real
  147  tim jira attach|link                           # the rest of the Jira write surface — also dry run by default; --confirm to write
  148  tim jira epics                                 # list open epics (read-only)
  149  tim jira transition EUDPA-X "Done"             # move a ticket's status straight away (no dry run); --list shows what it offers
  150  tim prototype setup               # onboard a designer session: CLAUDE.local.md note, upstream remote, install, auth readiness
  151  ```
  152  
  153  `tim/` is a sub-project of this repo rather than one of the cloned
  154  repos, so the workspace-wide install, lint and test skip it. Run its own
  155  scripts against it directly — no `cd` needed, and nothing in the
  156  Makefile, which is deprecated:
  157  
  158  ```bash
  159  npm --prefix ~/git/defra/trade-imports-workspace/tim test
  160  npm --prefix ~/git/defra/trade-imports-workspace/tim run lint
  161  npm --prefix ~/git/defra/trade-imports-workspace/tim run format
  162  ```
  163  
  164  `npm ci` is the one exception: it needs the shell to be inside `tim`.
  165  Under `--prefix` it refuses with `Missing: tim@0.0.0 from lock file`
  166  against a lockfile that is in step with `package.json`, so the error
  167  points at the wrong thing. A stale `tim/node_modules` shows up as a red
  168  `src/distil/trace.test.js`, which compares the Playwright tim installs
  169  with the one each repo records traces with, so reach for this when that
  170  test fails:
  171  
  172  ```bash
  173  cd ~/git/defra/trade-imports-workspace/tim
  174  npm ci
  175  ```
  176  
  177  `tim` finds the workspace by walking up from the current directory, then
  178  falls back to the canonical path. Standing in another checkout — the old
  179  `trade-imports-animals` clone, say — that walk-up wins and reads the
  180  wrong data, so pass `--workspace ~/git/defra/trade-imports-workspace`
  181  when you are not inside this one.
  182  
  183  If `tim` behaves as though it is looking at a different workspace, check
  184  `readlink -f "$(which tim)"` — a `tim` linked from an older clone resolves
  185  that clone's `tools/` and `workareas/`.
  186  
  187  See [`tim/CLAUDE.md`](tim/CLAUDE.md) for rails (test-on-input/output,
  188  library-first, GDS plain English, `__mocks__`-style network-boundary
  189  mocking via nock) and [`tim/README.md`](tim/README.md) for usage and
  190  the env-var contract (the same `JIRA_USER`/`JIRA_TOKEN`/`JIRA_BASE_URL`
  191  the bash uses — seamless pickup).
  192  
  193  Skills should prefer `tim <cmd> --json` over bare bash once a surface
  194  is covered by tim — the JSON envelope is schema-versioned and stable.
  195  
  196  ## Workspace stack (what `make docker-compose-*` delegates to)
  197  
  198  `scripts/stack/run-stack.sh` brings up the full stack from Dockerhub — the
  199  only compose stack in the workspace and its repos. Supports `-b <branch>`
  200  (probe for branch-tagged images), `-d/--dev` (build the repo-backed
  201  services from local source under `repos/`), `-e <service>` (exclude one so
  202  you can run it natively), and `--profile <name>` (run only a subset of
  203  tiers), and `--perf` (both stubs answer at their SLA latency, on published
  204  images; `tim docker perf` takes the lease in perf mode). In `--dev` mode the Java backend, stub and reference-data hot-reload
  205  edited source via Spring Boot DevTools; `bounce-backend.sh` is a fallback that
  206  recreates the backend container (e.g. after a `pom.xml`/dependency change).
  207  
  208  Init scripts are staged from their owning repos on every stack start
  209  (backend: Floci init; tests repo: mongo seed fixtures; dynamics-gateway:
  210  ASB emulator config) — locally from `repos/`, in CI via sparse fetch.
  211  `docker/stack/.staged/` is generated; never edit it.
  212  
  213  See `docker/stack/AGENTS.md` for the full index — flag reference, file
  214  layout (role overlays + dev overlay), init-script ownership/staging, env
  215  knobs that must use `host.docker.internal`, and the running-E2E recipe.
  216  
  217  ## Docs
  218  
  219  - `docs/` — project documentation. Architecture notes, ADRs, runbooks.
  220  - [`docs/repos/architecture-overview.md`](docs/repos/architecture-overview.md) —
  221    how the services connect and what each is responsible for (read this first
  222    when a task crosses repos). Per-repo pages sit alongside it in
  223    [`docs/repos/`](docs/repos/).
  224  - [`docs/adr/`](docs/adr/) — architecture decision records. See
  225    [`docs/adr/0001-consolidate-workspace-docs-under-docs.md`](docs/adr/0001-consolidate-workspace-docs-under-docs.md)
  226    for why `docs/` is the single canonical documentation root.
  227  - [`docs/agent-skills.md`](docs/agent-skills.md) — agentskills.io
  228    conventions used in this workspace (path conventions,
  229    `find_workspace_root` helper, subagent format, cross-host notes).
  230  - [`docs/agent-onboarding.md`](docs/agent-onboarding.md) — auth /
  231    credential setup for the agent skills.
  232  - `docs/best-practices/` — tech-specific practice guides
  233    (gds/, java/, node/, playwright/, k6/, rest-api/, doc-comments/,
  234    docker-compose.md, github-actions.md, shell.md). Cited by SKILL.md files via
  235    `~/git/defra/trade-imports-workspace/docs/best-practices/<topic>/<file>`.
  236    Read [`shell.md`](docs/best-practices/shell.md) before any bulk rename: this
  237    workspace is macOS, so `sed`'s `\b` matches nothing and still exits 0, and BSD
  238    `grep` rejects the word-boundary syntax BSD `sed` accepts — a rename verified
  239    by exit code can silently do nothing.
  240  - `docs/testing/` — how this project tests, and the general theory behind it:
  241    - [`docs/testing/test-and-spec-vocabulary.md`](docs/testing/test-and-spec-vocabulary.md) — what domain, test type, suite, profile, capability and service tag mean across the test repo and the Behaviour Spec, and how a test domain maps to a spec prefix.
  242    - [`config/e2e-tests-pr-scope.json`](config/e2e-tests-pr-scope.json) — the suites and service tags each repo's PR-triggered GitHub Actions e2e run covers.
  243    - [`docs/testing/e2e-tests-gh-actions.md`](docs/testing/e2e-tests-gh-actions.md) — how a PR run applies that scope file, what it leaves out, the scheduled runs, and why.
  244    - [`docs/testing/e2e-tests-cdp.md`](docs/testing/e2e-tests-cdp.md) — which `PROFILE` suites (and domains) each service's CDP Portal deployment runs, per environment.
  245    - [`docs/testing/theory/`](docs/testing/theory/) — general testing theory (pyramid, classification, doubles, flaky tests and so on), not specific to this project.
  246  - `docs/analysis/` — point-in-time, cross-repo investigation write-ups (not
  247    volatile catalogues — snapshot findings, re-run the investigation if the
  248    codebases have moved on). See
  249    [`docs/analysis/gbn-ag-field-lineage.md`](docs/analysis/gbn-ag-field-lineage.md)
  250    for the frontend → NotificationAggregate → GBN-AG → PIMS GBN-AG field-mapping
  251    audit, and
  252    [`docs/analysis/sonarcloud-branch-gate-status.md`](docs/analysis/sonarcloud-branch-gate-status.md)
  253    for the branch-level (not PR-scoped) quality gate status of all eight
  254    sonar-integrated repos — read it before trusting a green PR check as
  255    evidence that a repo's `main` is clean.
  256  
  257  ## SonarCloud integration
  258  
  259  `trade-imports-animals-frontend`, `-admin`, `-backend`, `-dynamics-gateway`, `-address-book`, `-reference-data`, `-ins-backend`, and `-ins-frontend` each have a SonarCloud Claude Code integration committed to `.claude/` and `.mcp.json`. This provides:
  260  
  261  - **Secrets scanning** — `UserPromptSubmit` and `PreToolUse(Read)` hooks block prompts/reads containing API keys or tokens.
  262  - **MCP server** — query SonarCloud issues, quality gate status and rules via the repo's `sonar-*` MCP server (e.g. `mcp__sonar-gateway__search_sonar_issues_in_projects` for `trade-imports-dynamics-gateway`). Only loaded in a session opened **inside that repo**: the workspace root registers none, because each one is a ~0.5–0.8 GiB docker container started at session start whether used or not. From the workspace root, use the `sonar` CLI instead (`sonar list issues --project DEFRA_<repo>`). Nothing automated depends on these servers — the push gate below uses the CLI and scanners.
  263  - **Pre-push quality gate** — a `PreToolUse(Bash)` hook fires only when the command is an actual `git push`, running one shared check, [`tools/sonar/sonar-push-check.sh`](tools/sonar/sonar-push-check.sh), by one of two routes. A session opened at the workspace root runs [`scripts/sonar/sonar-push-gate.sh`](scripts/sonar/sonar-push-gate.sh) from this repo's `.claude/settings.json`; it works out which repo the push targets and runs the check there. A session opened inside a repo runs the check directly from that repo's `.claude/settings.json`. The check runs the *real* build/test/analysis pipeline CI uses (`mvn clean verify sonar:sonar` for Java repos, `npm ci && npm test` then `sonar-scanner` for Node repos) against the current branch's open PR when one exists, and **blocks the push** if the quality gate fails. Every other Bash command passes through untouched.
  264  
  265    For Node repos the check runs the cheap gates before the expensive ones — `npm ci`, then `format:check`, then `lint` (both via `npm run --if-present`, so repos lacking those scripts are unaffected), and only then `npm test` and the scanner. A formatting slip therefore fails in seconds rather than after a production build and the full suite, and a lint-dirty branch never reaches SonarCloud as an uploaded analysis. `npm ci` has to stay first because format and lint need the devDependencies it installs.
  266  
  267    Once all three pass it writes `.cache/prepush-verified` (gitignored) containing the verified SHA, but only when the tree is clean — a dirty tree means what ran is not what HEAD will push. A repo whose own git `pre-push` hook reads that marker skips outright rather than repeating any of it. `trade-imports-animals-frontend` is the first repo wired up this way (see rule 7, canary first): its slow gate moved off `pre-commit` and onto `pre-push`, because a commit is private and cheap to amend while a push is the first point the work reaches anyone else, and a per-commit suite is what drives people to `--no-verify`. Its `pre-commit` is now cheap instead of absent — `lint-staged` formatting and auto-fixing the staged files only, so fixes land in the commit that caused them. Auto-fix cannot live on `pre-push`: by then the code is committed, so a fixer writes changes the commit does not contain and leaves a dirty tree. The other Node repos still run the whole gate on `pre-commit`; move them once this one has been lived with.
  268  
  269  **Why not the server-side "Agentic Analysis" (Vortex) feature** the `sonar` CLI also offers (`sonar analyze agentic`, or `sonar analyze --staged`'s quality-check half): this DEFRA SonarCloud organization does not have that feature licensed (`403 Vortex Analysis is not available for this organization`) — confirmed by direct testing, not a config problem. The secrets-scanning half of the `sonar` CLI integration above is unaffected and still works. Don't reach for `sonar analyze agentic`/`--staged` expecting a working quality check; use the pre-push hook or run its script manually instead.
  270  
  271  **Requires `SONAR_TOKEN`** in the environment (a personal SonarCloud token, works across all these repos) — set alongside the other credentials in `~/.zshrc`. If it isn't set, the hook skips gracefully rather than blocking pushes over a missing local prerequisite; CI's own SonarCloud Scan check is still the authoritative backstop either way. To run the same check manually (e.g. mid-investigation, or on a repo without an open PR yet):
  272  
  273  ```bash
  274  bash ~/git/defra/trade-imports-workspace/tools/sonar/sonar-push-check.sh <<< '{"tool_input":{"command":"git push"}}'
  275  ```
  276  
  277  (the script reads its trigger command from that JSON on stdin, matching the real hook's contract) — or just invoke the underlying `mvn .../sonar:sonar` or `sonar-scanner` command the script runs, directly.
  278  
  279  ## Reference catalogues
  280  
  281  The volatile catalogues live as topic files under [`docs/reference/`](docs/reference/) — read the relevant one on demand; edit the topic file, not this list:
  282  
  283  - [`docs/reference/make-targets.md`](docs/reference/make-targets.md) — every `make` target and what it does.
  284  - [`docs/reference/workflows.md`](docs/reference/workflows.md) — common workflows (setup, daily update, running the stack, tests).
  285  - [`docs/reference/tools-index.md`](docs/reference/tools-index.md) — the full `tools/` script index (args + purpose).
  286  - [`docs/reference/worker-references.md`](docs/reference/worker-references.md) — per-skill fan-out worker personas.
  287  - [`docs/reference/workareas.md`](docs/reference/workareas.md) — the `workareas/` runtime-cache map.
  288  - [`docs/reference/openspec.md`](docs/reference/openspec.md) — OpenSpec CLI, coverage gap queries, and how to read coverage rows for the Behaviour Spec under `openspec/` (authoring conventions: [`openspec/config.yaml`](openspec/config.yaml)).
```

## File: `docs/best-practices/java/spring-boot.md`

### Diff

```diff
diff --git a/docs/best-practices/java/spring-boot.md b/docs/best-practices/java/spring-boot.md
index 2981a5cc..da85bdcd 100644
--- a/docs/best-practices/java/spring-boot.md
+++ b/docs/best-practices/java/spring-boot.md
@@ -36,7 +36,8 @@ src/main/java/uk/gov/defra/tradeimportsanimals/
 │       ├── RequestTracingFilter.java
 │       └── AdminSecretFilter.java
 └── metrics/
-    └── EmfMetricsPublisher.java
+    ├── EmfMeterRegistry.java
+    └── NotificationMetrics.java
 ```
 
 ---
@@ -46,7 +47,7 @@ src/main/java/uk/gov/defra/tradeimportsanimals/
 ```java
 @SpringBootApplication
 @EnableScheduling
-@EnableConfigurationProperties({ AppConfig.class, MetricsConfigurationProperties.class })
+@EnableConfigurationProperties(AppConfig.class)
 public class TradeImportsAnimalsApplication {
     public static void main(String[] args) {
         SpringApplication.run(TradeImportsAnimalsApplication.class, args);
@@ -462,23 +463,25 @@ Match constraint annotation packages to your overall stack — this project uses
 ## 9. Conditional beans
 
 ```java
-@Service
-@ConditionalOnProperty(name = "metrics.emf.enabled", havingValue = "true")
-@RequiredArgsConstructor
-@Slf4j
-public class EmfMetricsPublisher {
-
-    private final MeterRegistry meterRegistry;
-
-    @Scheduled(fixedRateString = "${metrics.publish-interval-ms:60000}")
-    public void publishMetrics() {
-        log.info("Publishing EMF metrics");
-        // ...
+@Bean
+@ConditionalOnProperty(name = "aws.emf.enabled", havingValue = "true")
+EmfMeterRegistry emfMeterRegistry(
+        @Value("${aws.emf.namespace}") String namespace,
+        @Value("${aws.emf.step}") Duration step,
+        @Value("${aws.emf.environment:}") String environment) {
+    if (!environment.isBlank()) {
+        EnvironmentConfigurationProvider.getConfig()
+            .setEnvironmentOverride(Environments.valueOf(environment));
+        log.info("Writing metrics to the {} EMF environment", environment);
     }
+    EmfMeterRegistry registry = new EmfMeterRegistry(namespace, step, Clock.SYSTEM, MetricsLogger::new);
+    registry.start(new NamedThreadFactory("emf-meter-registry"));
+    log.info("Publishing metrics to CloudWatch namespace {} every {}", namespace, step);
+    return registry;
 }
 ```
 
-`@ConditionalOnProperty` disables the bean entirely — no stub, no `if` check needed. In `application-test.yml`, set `metrics.emf.enabled=false`.
+`@ConditionalOnProperty` leaves the bean out entirely — no stub, no `if` check needed. Integration tests leave `aws.emf.enabled` false, so Spring Boot's in-memory registry is used and nothing is published.
 
 ---
 
@@ -541,22 +544,24 @@ public class SchedulingConfig {}
 ```java
 @Service
 @ConditionalOnProperty(name = "scheduling.enabled", havingValue = "true", matchIfMissing = true)
-public class MetricsPublisher {
+public class DraftCleanup {
 
     // Fixed rate in milliseconds
     @Scheduled(fixedRate = 60_000)
-    public void publishEveryMinute() { ... }
+    public void removeExpiredDraftsEveryMinute() { ... }
 
     // Cron expression
     @Scheduled(cron = "0 0 * * * *")  // top of every hour
-    public void publishHourly() { ... }
+    public void removeExpiredDraftsHourly() { ... }
 
     // From property — allows env-specific intervals
-    @Scheduled(fixedRateString = "${metrics.publish-interval-ms:60000}")
-    public void publishConfigurable() { ... }
+    @Scheduled(fixedRateString = "${drafts.cleanup-interval-ms:60000}")
+    public void removeExpiredDraftsAtTheConfiguredRate() { ... }
 }
 ```
 
+Metrics are not published by a scheduled job: the meter registry publishes on its own thread (section 19).
+
 Disable in tests via `application-integration-test.yml`:
 ```yaml
 scheduling:
@@ -819,7 +824,7 @@ Good:
 }
 ```
 
-**A failure line says why it failed.** `ExternalCallMetrics.measure` catches the exception, records the call as failed and rethrows. The log line it writes reads `External call <dependency>/<operation> failure in 5 ms`, with no cause and no status. Support sees a failure and cannot tell a timeout from a refusal. Carry the HTTP status, or the exception type when there is no status, into the failure line. If the exception is rethrown and logged in full where it is handled, do not log its stack trace here as well.
+**A failure line says why it failed.** `ExternalCallMetrics.measure` catches the exception, records the call as failed and rethrows. The log line it writes reads `External call <dependency>/<operation> failure in 5 ms`, with no cause and no status. Support sees a failure and cannot tell a timeout from a refusal. Carry the HTTP status, or the exception type when there is no status, into the failure line. If the exception is rethrown and logged in full where it is handled, do not log its stack trace here as well. `ExternalCallRecorder` in `trade-imports-address-book` does this: its failure line carries the cause's class name and message as the key-value pairs `error.type` and `error.message`, with no throwable attached (service-observability's `references/LOGGING.md`).
 
 **No request or response bodies at INFO.** Bodies hold personal data (names, addresses) and can be large. Log the status and what the code did with the answer, such as a result count. If a body is the only way to tell two failures apart, log a bounded excerpt at WARN on the failure path only.
 
@@ -981,17 +986,28 @@ public class NotificationController {
 
 ## 19. Micrometer metrics
 
+Every metric is a Micrometer meter, and `EmfMeterRegistry` publishes them all to CloudWatch with each meter's tags as its dimensions. The rule, the classes to copy, the allowlist and the tests are in `~/git/defra/trade-imports-workspace/.claude/skills/service-observability/references/METRICS.md` → "Publish (Java, Spring Boot)". Follow it; this section only shows the shape.
+
+`MetricsConfig` creates the registry when `aws.emf.enabled` is true (section 9), and holds the aspects `@Timed` and `@Counted` need:
+
 ```java
 @Configuration
 public class MetricsConfig {
 
     @Bean
-    public TimedAspect timedAspect(MeterRegistry registry) {
-        return new TimedAspect(registry);
+    @ConditionalOnProperty(name = "aws.emf.enabled", havingValue = "true")
+    EmfMeterRegistry emfMeterRegistry(
+            @Value("${aws.emf.namespace}") String namespace,
+            @Value("${aws.emf.step}") Duration step,
+            @Value("${aws.emf.environment:}") String environment) { ... }
+
+    @Bean
+    TimedAspect timedAspect(MeterRegistry meterRegistry) {
+        return new TimedAspect(meterRegistry);
     }
 
     @Bean
-    public CountedAspect countedAspect(MeterRegistry registry) {
+    CountedAspect countedAspect(MeterRegistry registry) {
         return new CountedAspect(registry);
     }
 }
@@ -999,30 +1015,22 @@ public class MetricsConfig {
 
 `@Timed` on controller/service methods:
 ```java
-@Timed(value = "notification.save", percentiles = { 0.5, 0.95, 0.99 })
+@Timed("controller.notification.save.time")
 public NotificationDto save(NotificationRequest request, HttpHeaders headers) { ... }
 ```
 
-Programmatic metrics:
+A business metric is a meter, tagged by its dimension:
 ```java
-@Service
-@RequiredArgsConstructor
-public class EmfMetricsPublisher {
-
-    private final MeterRegistry meterRegistry;
-
-    @Scheduled(fixedRateString = "${metrics.publish-interval-ms:60000}")
-    public void publishMetrics() {
-        var notificationCount = meterRegistry.find("notification.save").timer();
-        if (notificationCount != null) {
-            // Emit CloudWatch EMF JSON
-            log.info("{\"_aws\":{\"Timestamp\":{},\"CloudWatchMetrics\":[...]},\"Count\":{}}",
-                    System.currentTimeMillis(), notificationCount.count());
-        }
-    }
+public void countChange(Change change) {
+    Counter.builder("address.change")
+        .tag("change", change.name().toLowerCase(Locale.ROOT))
+        .register(meterRegistry)
+        .increment();
 }
 ```
 
+Each metric name goes on the allowlist (`management.metrics.enable` in `application.yml`), or its meter publishes nothing.
+
 ---
 
 ## 20. Testing
```

### File at the reviewed commit, with line numbers

```markdown
    1  # Spring Boot — Best Practices
    2  
    3  Project baseline: Spring Boot 3.5, Java 25, Maven, Lombok. This doc covers the patterns used in `trade-imports-animals-backend`.
    4  
    5  ---
    6  
    7  ## 1. Application structure
    8  
    9  Use **feature-based packages**, not layer-based. Each feature owns its controller, service, repository, model, and DTO.
   10  
   11  ```
   12  src/main/java/uk/gov/defra/tradeimportsanimals/
   13  ├── TradeImportsAnimalsApplication.java
   14  ├── notification/
   15  │   ├── NotificationController.java
   16  │   ├── NotificationService.java
   17  │   ├── NotificationRepository.java
   18  │   ├── Notification.java           ← MongoDB document
   19  │   └── dto/
   20  │       ├── NotificationDto.java
   21  │       └── NotificationRequest.java
   22  ├── audit/
   23  │   ├── AuditRepository.java
   24  │   └── Audit.java
   25  ├── config/
   26  │   ├── SecurityConfig.java
   27  │   ├── CacheConfig.java
   28  │   ├── MongoConfig.java
   29  │   └── MetricsConfig.java
   30  ├── common/
   31  │   ├── exception/
   32  │   │   ├── GlobalExceptionHandler.java
   33  │   │   ├── NotFoundException.java
   34  │   │   └── ConflictException.java
   35  │   └── filter/
   36  │       ├── RequestTracingFilter.java
   37  │       └── AdminSecretFilter.java
   38  └── metrics/
   39      ├── EmfMeterRegistry.java
   40      └── NotificationMetrics.java
   41  ```
   42  
   43  ---
   44  
   45  ## 2. Entry point
   46  
   47  ```java
   48  @SpringBootApplication
   49  @EnableScheduling
   50  @EnableConfigurationProperties(AppConfig.class)
   51  public class TradeImportsAnimalsApplication {
   52      public static void main(String[] args) {
   53          SpringApplication.run(TradeImportsAnimalsApplication.class, args);
   54      }
   55  }
   56  ```
   57  
   58  ---
   59  
   60  ## 3. REST controllers
   61  
   62  ```java
   63  @Slf4j
   64  @RestController
   65  @RequiredArgsConstructor
   66  @RequestMapping("/notifications")
   67  @Tag(name = "Notifications")
   68  public class NotificationController {
   69  
   70      private final NotificationService notificationService;
   71  
   72      @GetMapping
   73      @Timed("notification.find_all")
   74      public List<NotificationDto> findAll() {
   75          log.info("Finding all notifications");
   76          return notificationService.findAll();
   77      }
   78  
   79      @GetMapping("/{referenceNumber}")
   80      @Timed("notification.find_by_reference")
   81      public NotificationDto findByReferenceNumber(@PathVariable String referenceNumber) {
   82          return notificationService.findByReferenceNumber(referenceNumber);
   83      }
   84  
   85      @PostMapping
   86      @Timed("notification.save")
   87      public NotificationDto save(
   88              @Valid @RequestBody NotificationRequest request,
   89              @RequestHeader HttpHeaders headers) {
   90          return notificationService.save(request, headers);
   91      }
   92  
   93      @DeleteMapping
   94      @ResponseStatus(HttpStatus.NO_CONTENT)
   95      public void deleteByReferenceNumbers(
   96              @Valid @RequestBody List<String> referenceNumbers,
   97              @RequestHeader HttpHeaders headers) {
   98          notificationService.deleteByReferenceNumbers(referenceNumbers, headers);
   99      }
  100  }
  101  ```
  102  
  103  Key points:
  104  - `@RequiredArgsConstructor` (Lombok) — constructor injection, never `@Autowired` on fields
  105  - `@Slf4j` (Lombok) — provides `log` field
  106  - `@Timed` — Micrometer metric per endpoint
  107  - `@RequestHeader HttpHeaders` — captures all headers for audit trail
  108  
  109  ### Security defaults for controllers
  110  
  111  Controllers that accept user-controlled URLs, file streams, or take `{id}`-style path variables must apply these defaults. They are not optional — each one prevents a class of vulnerability.
  112  
  113  **Validate `redirectUrl` against an allowlist (open-redirect)**
  114  
  115  A controller that takes a `redirectUrl` from a request body or query parameter and returns it (directly or via `Location` header) is an open redirect unless the URL is checked against a known origin.
  116  
  117  ```java
  118  // Wrong — caller controls where the user lands after the upload completes
  119  @PostMapping("/document-uploads")
  120  public ResponseEntity<DocumentUploadResponse> initiate(@RequestBody DocumentUploadRequest req) {
  121      return documentService.initiate(req.redirectUrl());  // attacker-controlled URL
  122  }
  123  
  124  // Correct — reject any URL that doesn't start with the known frontend origin
  125  @PostMapping("/document-uploads")
  126  public ResponseEntity<DocumentUploadResponse> initiate(@RequestBody DocumentUploadRequest req) {
  127      String allowed = cdpConfig.frontend().baseUrl();
  128      String redirectUrl = req.redirectUrl() != null ? req.redirectUrl() : allowed;
  129      if (!redirectUrl.startsWith(allowed)) {
  130          throw new IllegalArgumentException("redirectUrl must match " + allowed);
  131      }
  132      return documentService.initiate(redirectUrl);
  133  }
  134  ```
  135  
  136  **`Location` header on `201 Created` must be an absolute URI (RFC 9110)**
  137  
  138  A relative URI in the `Location` header is non-conformant for `201 Created`. Build it from the current request so it survives reverse proxies and mounted context paths.
  139  
  140  ```java
  141  // Wrong — relative URI
  142  return ResponseEntity.created(URI.create("/document-uploads/" + uploadId)).body(response);
  143  
  144  // Correct — absolute URI built from current request
  145  URI location = ServletUriComponentsBuilder.fromCurrentRequest()
  146          .path("/{uploadId}")
  147          .buildAndExpand(uploadId)
  148          .toUri();
  149  return ResponseEntity.created(location).body(response);
  150  ```
  151  
  152  **Forwarded `Content-Type` is never trusted**
  153  
  154  When streaming a file retrieved from a third-party (CDP Uploader, S3, any external store), allow-list the MIME types you'll forward and always set `X-Content-Type-Options: nosniff`. Default to `application/octet-stream` for unknown types.
  155  
  156  ```java
  157  private static final Set<String> ALLOWED_CONTENT_TYPES = Set.of(
  158          "application/pdf", "image/jpeg", "image/png",
  159          "application/vnd.ms-excel", "application/msword",
  160          "application/octet-stream"
  161  );
  162  
  163  @GetMapping("/document-uploads/{uploadId}/file")
  164  public ResponseEntity<StreamingResponseBody> downloadFile(@PathVariable String uploadId) {
  165      var fileData = documentService.findFile(uploadId);
  166  
  167      String contentType;
  168      try {
  169          var parsed = MediaType.parseMediaType(fileData.contentType());
  170          contentType = ALLOWED_CONTENT_TYPES.contains(parsed.toString())
  171                  ? parsed.toString()
  172                  : MediaType.APPLICATION_OCTET_STREAM_VALUE;
  173      } catch (InvalidMediaTypeException e) {
  174          log.warn("Bad content-type from upstream for uploadId={}: {}", uploadId, fileData.contentType());
  175          contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
  176      }
  177  
  178      return ResponseEntity.ok()
  179              .header(HttpHeaders.CONTENT_TYPE, contentType)
  180              .header("X-Content-Type-Options", "nosniff")           // always
  181              .header(HttpHeaders.CONTENT_DISPOSITION, "attachment") // never inline
  182              .body(fileData.streamingBody());
  183  }
  184  ```
  185  
  186  **IDOR — verify ownership before returning a resource by ID**
  187  
  188  If an endpoint accepts a resource ID from the request and the caller could plausibly have access to *some* resources but not others, the service must check ownership. "Authentication = authorisation" is only acceptable in skeleton/all-or-nothing phases and should be a recorded decision, not an implicit assumption. When in doubt, pass the parent reference (e.g. notification ref) into the lookup so the data layer enforces the join.
  189  
  190  ---
  191  
  192  ## 4. Request / response
  193  
  194  ```java
  195  // Path variable — always constrain format on @PathVariable.
  196  // Without @Pattern / @Size, any malformed value reaches the service layer
  197  // (and database queries) before being rejected. Class needs @Validated.
  198  @GetMapping("/{referenceNumber}")
  199  public ResponseEntity<NotificationDto> getByReference(
  200          @PathVariable @Pattern(regexp = "^[A-Z0-9.\\-]{1,50}$") String referenceNumber) {
  201      return ResponseEntity.ok(service.findByReferenceNumber(referenceNumber));
  202  }
  203  
  204  // Query params
  205  @GetMapping
  206  public ResponseEntity<List<NotificationDto>> list(
  207          @RequestParam(defaultValue = "0") int page,
  208          @RequestParam(defaultValue = "20") int size) {
  209      return ResponseEntity.ok(service.findAll(page, size));
  210  }
  211  
  212  // Request headers
  213  @PostMapping
  214  public ResponseEntity<NotificationDto> create(
  215          @Valid @RequestBody NotificationRequest body,
  216          @RequestHeader HttpHeaders headers) {
  217      var result = service.create(body, headers);
  218      return ResponseEntity.status(HttpStatus.CREATED).body(result);
  219  }
  220  
  221  // No content response
  222  @DeleteMapping("/{id}")
  223  @ResponseStatus(HttpStatus.NO_CONTENT)
  224  public void delete(@PathVariable String id) {
  225      service.delete(id);
  226  }
  227  ```
  228  
  229  ---
  230  
  231  ## 5. Bean validation
  232  
  233  ```java
  234  public record NotificationRequest(
  235      @NotBlank(message = "Reference number is required")
  236      String referenceNumber,
  237  
  238      @NotNull(message = "Origin is required")
  239      @Valid
  240      Origin origin,
  241  
  242      @Size(max = 500)
  243      String notes
  244  ) {}
  245  ```
  246  
  247  Constraint annotations:
  248  
  249  | Annotation | Description |
  250  |-----------|-------------|
  251  | `@NotNull` | Value must not be null |
  252  | `@NotBlank` | String must not be null, empty, or whitespace |
  253  | `@NotEmpty` | Collection/String must not be null or empty |
  254  | `@Size(min, max)` | Collection/String size bounds |
  255  | `@Min` / `@Max` | Numeric bounds |
  256  | `@Pattern(regexp)` | Regex match |
  257  | `@Email` | Valid email format |
  258  | `@Valid` | Cascade validation to nested objects |
  259  | `@Positive` | Number > 0 |
  260  
  261  Use `@Valid` on `@RequestBody` parameters to trigger validation. Failures throw `MethodArgumentNotValidException` — handled by `@ControllerAdvice`.
  262  
  263  ---
  264  
  265  ## 6. Exception handling
  266  
  267  ```java
  268  @ControllerAdvice
  269  @Slf4j
  270  public class GlobalExceptionHandler {
  271  
  272      @ExceptionHandler(MethodArgumentNotValidException.class)
  273      public ResponseEntity<ProblemDetail> handleValidationException(
  274              MethodArgumentNotValidException ex) {
  275          var traceId = MDC.get("traceId");
  276          var errors = ex.getBindingResult().getFieldErrors().stream()
  277                  .collect(Collectors.toMap(
  278                          FieldError::getField,
  279                          fe -> Objects.requireNonNullElse(fe.getDefaultMessage(), "Invalid"),
  280                          (a, b) -> a));
  281  
  282          var problem = ProblemDetail.forStatusAndDetail(
  283                  HttpStatus.BAD_REQUEST, "Validation failed");
  284          problem.setType(URI.create("/problems/validation-error"));
  285          problem.setProperty("errors", errors);
  286          problem.setProperty("traceId", traceId);
  287          return ResponseEntity.badRequest().body(problem);
  288      }
  289  
  290      @ExceptionHandler(NotFoundException.class)
  291      public ResponseEntity<ProblemDetail> handleNotFoundException(NotFoundException ex) {
  292          var problem = ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
  293          problem.setType(URI.create("/problems/not-found"));
  294          problem.setProperty("traceId", MDC.get("traceId"));
  295          return ResponseEntity.status(HttpStatus.NOT_FOUND).body(problem);
  296      }
  297  
  298      @ExceptionHandler(ConflictException.class)
  299      public ResponseEntity<ProblemDetail> handleConflictException(ConflictException ex) {
  300          var problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, ex.getMessage());
  301          problem.setType(URI.create("/problems/conflict"));
  302          problem.setProperty("traceId", MDC.get("traceId"));
  303          return ResponseEntity.status(HttpStatus.CONFLICT).body(problem);
  304      }
  305  
  306      @ExceptionHandler(Exception.class)
  307      public ResponseEntity<ProblemDetail> handleException(Exception ex) {
  308          log.error("Unexpected error", ex);
  309          var problem = ProblemDetail.forStatusAndDetail(
  310                  HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
  311          problem.setType(URI.create("/problems/internal-error"));
  312          problem.setProperty("traceId", MDC.get("traceId"));
  313          return ResponseEntity.internalServerError().body(problem);
  314      }
  315  }
  316  ```
  317  
  318  Custom exceptions:
  319  
  320  ```java
  321  public class NotFoundException extends RuntimeException {
  322      public NotFoundException(String message) { super(message); }
  323  }
  324  
  325  public class ConflictException extends RuntimeException {
  326      public ConflictException(String message) { super(message); }
  327  }
  328  ```
  329  
  330  `ProblemDetail` produces RFC 7807 JSON:
  331  ```json
  332  {
  333    "type": "/problems/not-found",
  334    "title": "Not Found",
  335    "status": 404,
  336    "detail": "Notification DRAFT.IMP.2026.123 not found",
  337    "traceId": "abc-123"
  338  }
  339  ```
  340  
  341  ---
  342  
  343  ## 7. Dependency injection
  344  
  345  Always use **constructor injection** via `@RequiredArgsConstructor`. Never use `@Autowired` on fields.
  346  
  347  ```java
  348  // Correct — constructor injection via Lombok
  349  @Service
  350  @RequiredArgsConstructor
  351  public class NotificationService {
  352      private final NotificationRepository notificationRepository;
  353      private final AuditRepository auditRepository;
  354  }
  355  
  356  // Wrong — field injection
  357  @Service
  358  public class NotificationService {
  359      @Autowired  // ← Never do this
  360      private NotificationRepository notificationRepository;
  361  }
  362  ```
  363  
  364  Stereotype annotations:
  365  
  366  | Annotation | Use |
  367  |-----------|-----|
  368  | `@Component` | Generic Spring-managed bean |
  369  | `@Service` | Business logic layer |
  370  | `@Repository` | Data access layer (enables exception translation) |
  371  | `@Controller` / `@RestController` | Web layer |
  372  | `@Configuration` | Config class with `@Bean` methods |
  373  
  374  ```java
  375  @Configuration
  376  public class CacheConfig {
  377  
  378      @Bean
  379      public CacheManager cacheManager() {
  380          var caffeine = Caffeine.newBuilder()
  381                  .maximumSize(500)
  382                  .expireAfterWrite(10, TimeUnit.MINUTES);
  383          var manager = new CaffeineCacheManager();
  384          manager.setCaffeine(caffeine);
  385          return manager;
  386      }
  387  }
  388  ```
  389  
  390  ---
  391  
  392  ## 8. Configuration
  393  
  394  ```yaml
  395  # application.yml
  396  app:
  397    backend-url: ${BACKEND_URL:http://localhost:8085}
  398    admin-secret: ${ADMIN_SECRET:dev-secret}
  399    aws:
  400      region: ${AWS_REGION:eu-west-2}
  401      endpoint-override: ${AWS_ENDPOINT_OVERRIDE:}
  402  
  403  spring:
  404    data:
  405      mongodb:
  406        uri: ${MONGO_URI:mongodb://localhost:27017/trade-imports}
  407    cache:
  408      type: caffeine
  409  
  410  server:
  411    port: ${PORT:8085}
  412    forward-headers-strategy: framework
  413    shutdown: graceful
  414  ```
  415  
  416  ```yaml
  417  # application-local.yml — overrides for local dev
  418  app:
  419    aws:
  420      endpoint-override: http://localhost:4566
  421  logging:
  422    level:
  423      root: DEBUG
  424  ```
  425  
  426  `@ConfigurationProperties`:
  427  
  428  ```java
  429  @ConfigurationProperties(prefix = "app")
  430  @Validated   // ← required: without this, the @NotBlank etc. are silent decoration
  431  public record AppConfig(
  432      @NotBlank String backendUrl,
  433      @NotBlank String adminSecret,
  434      AwsConfig aws
  435  ) {
  436      public record AwsConfig(
  437          @NotBlank String region,
  438          @Pattern(regexp = "^(https?://.*)?$")  // optional but format-checked
  439          String endpointOverride
  440      ) {}
  441  }
  442  ```
  443  
  444  Register: `@EnableConfigurationProperties(AppConfig.class)` on the application class.
  445  
  446  **Why `@Validated` matters.** Without it, missing or malformed YAML produces NPEs at the first bean that calls `cdpConfig.uploader().maxFileSize()` — typically deep in a service method, with a stack trace that doesn't name the missing key. With `@Validated`, the application fails to start with a clear `ConfigurationPropertiesBindException` naming the offending field. Apply this to **every** `@ConfigurationProperties` record.
  447  
  448  Constraint annotations to use on config records:
  449  
  450  | Annotation | Use |
  451  |-----------|-----|
  452  | `@NotNull` | Required key — null is a configuration error, not a default |
  453  | `@NotBlank` | Required string that must be non-empty |
  454  | `@Pattern(regexp)` | URL formats, reference number formats, anything with structure |
  455  | `@Positive` / `@PositiveOrZero` | Sizes, timeouts, counts |
  456  | `@Min` / `@Max` | Bounded numeric ranges |
  457  | `@Nullable` | Document optional fields explicitly (Jakarta annotation, not Spring) |
  458  
  459  Match constraint annotation packages to your overall stack — this project uses Jakarta (`jakarta.validation.constraints.*`, `jakarta.annotation.Nullable`); don't mix in `org.springframework.lang.Nullable`.
  460  
  461  ---
  462  
  463  ## 9. Conditional beans
  464  
  465  ```java
  466  @Bean
  467  @ConditionalOnProperty(name = "aws.emf.enabled", havingValue = "true")
  468  EmfMeterRegistry emfMeterRegistry(
  469          @Value("${aws.emf.namespace}") String namespace,
  470          @Value("${aws.emf.step}") Duration step,
  471          @Value("${aws.emf.environment:}") String environment) {
  472      if (!environment.isBlank()) {
  473          EnvironmentConfigurationProvider.getConfig()
  474              .setEnvironmentOverride(Environments.valueOf(environment));
  475          log.info("Writing metrics to the {} EMF environment", environment);
  476      }
  477      EmfMeterRegistry registry = new EmfMeterRegistry(namespace, step, Clock.SYSTEM, MetricsLogger::new);
  478      registry.start(new NamedThreadFactory("emf-meter-registry"));
  479      log.info("Publishing metrics to CloudWatch namespace {} every {}", namespace, step);
  480      return registry;
  481  }
  482  ```
  483  
  484  `@ConditionalOnProperty` leaves the bean out entirely — no stub, no `if` check needed. Integration tests leave `aws.emf.enabled` false, so Spring Boot's in-memory registry is used and nothing is published.
  485  
  486  ---
  487  
  488  ## 10. Caching
  489  
  490  ```java
  491  @Configuration
  492  @EnableCaching
  493  public class CacheConfig {
  494  
  495      @Bean
  496      public CacheManager cacheManager() {
  497          var caffeine = Caffeine.newBuilder()
  498                  .maximumSize(1000)
  499                  .expireAfterWrite(Duration.ofMinutes(10))
  500                  .recordStats();
  501          var manager = new CaffeineCacheManager("notifications", "commodities");
  502          manager.setCaffeine(caffeine);
  503          return manager;
  504      }
  505  }
  506  ```
  507  
  508  ```java
  509  @Service
  510  @RequiredArgsConstructor
  511  public class CommodityService {
  512  
  513      @Cacheable(value = "commodities", key = "#code")
  514      public Commodity findByCode(String code) {
  515          // Only called on cache miss
  516          return commodityRepository.findByCode(code)
  517                  .orElseThrow(() -> new NotFoundException("Commodity not found: " + code));
  518      }
  519  
  520      @CacheEvict(value = "commodities", key = "#commodity.code")
  521      public void update(Commodity commodity) {
  522          commodityRepository.save(commodity);
  523      }
  524  
  525      @CachePut(value = "commodities", key = "#result.code")
  526      public Commodity save(Commodity commodity) {
  527          return commodityRepository.save(commodity);
  528      }
  529  }
  530  ```
  531  
  532  **Self-invocation caveat**: `@Cacheable` is AOP-based — calling a cached method from within the same bean bypasses the cache. Extract to a separate bean if needed.
  533  
  534  ---
  535  
  536  ## 11. Scheduling
  537  
  538  ```java
  539  @Configuration
  540  @EnableScheduling
  541  public class SchedulingConfig {}
  542  ```
  543  
  544  ```java
  545  @Service
  546  @ConditionalOnProperty(name = "scheduling.enabled", havingValue = "true", matchIfMissing = true)
  547  public class DraftCleanup {
  548  
  549      // Fixed rate in milliseconds
  550      @Scheduled(fixedRate = 60_000)
  551      public void removeExpiredDraftsEveryMinute() { ... }
  552  
  553      // Cron expression
  554      @Scheduled(cron = "0 0 * * * *")  // top of every hour
  555      public void removeExpiredDraftsHourly() { ... }
  556  
  557      // From property — allows env-specific intervals
  558      @Scheduled(fixedRateString = "${drafts.cleanup-interval-ms:60000}")
  559      public void removeExpiredDraftsAtTheConfiguredRate() { ... }
  560  }
  561  ```
  562  
  563  Metrics are not published by a scheduled job: the meter registry publishes on its own thread (section 19).
  564  
  565  Disable in tests via `application-integration-test.yml`:
  566  ```yaml
  567  scheduling:
  568    enabled: false
  569  ```
  570  
  571  ---
  572  
  573  ## 12. Security — JWT resource server
  574  
  575  ```java
  576  @Configuration
  577  @EnableMethodSecurity
  578  public class SecurityConfig {
  579  
  580      @Bean
  581      public SecurityFilterChain filterChain(HttpSecurity http,
  582              JwtDecoder jwtDecoder,
  583              JwtAuthenticationConverter jwtAuthenticationConverter) throws Exception {
  584          return http
  585                  .authorizeHttpRequests(auth -> auth
  586                          .requestMatchers("/actuator/health/**").permitAll()
  587                          .anyRequest().authenticated())
  588                  .oauth2ResourceServer(oauth2 -> oauth2
  589                          .jwt(jwt -> jwt
  590                                  .decoder(jwtDecoder)
  591                                  .jwtAuthenticationConverter(jwtAuthenticationConverter)))
  592                  .sessionManagement(sm -> sm
  593                          .sessionCreationPolicy(SessionCreationPolicy.STATELESS))
  594                  .csrf(AbstractHttpConfigurer::disable)
  595                  .build();
  596      }
  597  
  598      @Bean
  599      public JwtDecoder jwtDecoder(
  600              @Value("${spring.security.oauth2.resourceserver.jwt.issuer-uri}") String issuerUri,
  601              @Value("${jwt.audience}") String audience) {
  602          var decoder = JwtDecoders.fromIssuerLocation(issuerUri);
  603          var audienceValidator = new JwtClaimValidator<List<String>>(
  604                  JwtClaimNames.AUD, aud -> aud != null && aud.contains(audience));
  605          var validator = new DelegatingOAuth2TokenValidator<>(
  606                  JwtValidators.createDefaultWithIssuer(issuerUri), audienceValidator);
  607          ((NimbusJwtDecoder) decoder).setJwtValidator(validator);
  608          return decoder;
  609      }
  610  
  611      @Bean
  612      public JwtAuthenticationConverter jwtAuthenticationConverter() {
  613          var converter = new JwtGrantedAuthoritiesConverter();
  614          converter.setAuthoritiesClaimName("roles");
  615          converter.setAuthorityPrefix("ROLE_");
  616          var authConverter = new JwtAuthenticationConverter();
  617          authConverter.setJwtGrantedAuthoritiesConverter(converter);
  618          return authConverter;
  619      }
  620  }
  621  ```
  622  
  623  Admin secret filter (shared-secret auth for internal endpoints):
  624  
  625  ```java
  626  @Component
  627  @RequiredArgsConstructor
  628  public class AdminSecretFilter extends OncePerRequestFilter {
  629  
  630      private final AppConfig appConfig;
  631  
  632      @Override
  633      protected void doFilterInternal(HttpServletRequest request,
  634              HttpServletResponse response, FilterChain chain)
  635              throws ServletException, IOException {
  636          if (request instanceof HttpServletRequest req
  637                  && req.getRequestURI().startsWith("/admin")) {
  638              var secret = req.getHeader("Trade-Imports-Animals-Admin-Secret");
  639              if (!appConfig.adminSecret().equals(secret)) {
  640                  response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
  641                  return;
  642              }
  643          }
  644          chain.doFilter(request, response);
  645      }
  646  }
  647  ```
  648  
  649  ---
  650  
  651  ## 13. Servlet filters
  652  
  653  ```java
  654  @Component
  655  @Order(1)
  656  public class RequestTracingFilter extends OncePerRequestFilter {
  657  
  658      private static final String TRACE_HEADER = "x-cdp-request-id";
  659  
  660      @Override
  661      protected void doFilterInternal(HttpServletRequest request,
  662              HttpServletResponse response, FilterChain chain)
  663              throws ServletException, IOException {
  664          var traceId = request.getHeader(TRACE_HEADER);
  665          if (traceId != null && !traceId.isBlank()) {
  666              MDC.put("traceId", traceId);
  667          }
  668          try {
  669              chain.doFilter(request, response);
  670          } finally {
  671              MDC.clear();  // always clear — prevents bleed between requests in thread pools
  672          }
  673      }
  674  }
  675  ```
  676  
  677  Outbound trace propagation via `RestClient` interceptor:
  678  
  679  ```java
  680  @Component
  681  public class TraceIdPropagationInterceptor implements ClientHttpRequestInterceptor {
  682  
  683      private static final String TRACE_HEADER = "x-cdp-request-id";
  684  
  685      @Override
  686      public ClientHttpResponse intercept(HttpRequest request, byte[] body,
  687              ClientHttpRequestExecution execution) throws IOException {
  688          var traceId = MDC.get("traceId");
  689          if (traceId != null && !traceId.isBlank()) {
  690              request.getHeaders().add(TRACE_HEADER, traceId);
  691          }
  692          return execution.execute(request, body);
  693      }
  694  }
  695  ```
  696  
  697  ---
  698  
  699  ## 14. Actuator
  700  
  701  ```yaml
  702  # application.yml
  703  management:
  704    endpoints:
  705      web:
  706        exposure:
  707          include: health,info,metrics,prometheus
  708    endpoint:
  709      health:
  710        show-details: when-authorized
  711        show-components: when-authorized
  712    health:
  713      defaults:
  714        enabled: true
  715  ```
  716  
  717  ```yaml
  718  # application-local.yml — expose everything locally
  719  management:
  720    endpoints:
  721      web:
  722        exposure:
  723          include: "*"
  724  ```
  725  
  726  Custom health indicator:
  727  
  728  ```java
  729  @Component
  730  public class BackendHealthIndicator implements HealthIndicator {
  731  
  732      private final NotificationRepository notificationRepository;
  733  
  734      @Override
  735      public Health health() {
  736          try {
  737              notificationRepository.count();
  738              return Health.up().build();
  739          } catch (Exception ex) {
  740              return Health.down(ex).build();
  741          }
  742      }
  743  }
  744  ```
  745  
  746  ---
  747  
  748  ## 15. Logging
  749  
  750  ```java
  751  @Slf4j  // Lombok — provides log field
  752  @Service
  753  public class NotificationService {
  754  
  755      public NotificationDto save(NotificationRequest request, HttpHeaders headers) {
  756          // Parameterised — correct
  757          log.info("Saving notification for reference: {}", request.referenceNumber());
  758  
  759          // Structured with context
  760          log.debug("Save request received: referenceNumber={}, userId={}",
  761                  request.referenceNumber(), headers.getFirst("User-Id"));
  762  
  763          try {
  764              var result = doSave(request);
  765              log.info("Notification saved: referenceNumber={}", result.referenceNumber());
  766              return result;
  767          } catch (Exception ex) {
  768              // Always log with exception object — not ex.getMessage()
  769              log.error("Failed to save notification: referenceNumber={}",
  770                      request.referenceNumber(), ex);
  771              throw ex;
  772          }
  773      }
  774  }
  775  ```
  776  
  777  Log levels:
  778  - `TRACE` — very fine-grained, never in production
  779  - `DEBUG` — diagnostic detail for troubleshooting
  780  - `INFO` — normal operations (default production level)
  781  - `WARN` — unexpected but handled
  782  - `ERROR` — operation failed, needs attention
  783  
  784  ### What to log
  785  
  786  Support reads these logs to answer "what happened to this notification, this user, this call?". Write every log line for that reader.
  787  
  788  **Every branch that changes an outcome logs once, with the ids support searches by.** An outcome-changing branch is a refusal, a redirect, a retry, a fallback, a state switch, or a caught exception that the code carries on past. Log it once, where the decision is made, with the reference number, notification id, user id, port code, dependency and operation, or whichever of these are in scope. For each new `catch`, retry or fallback, ask: which log line tells support this happened, and which ids does it carry? If the answer is "none", add one. A silent retry or fallback is a defect.
  789  
  790  **Log where the ids are.** If the place that spots the problem does not hold the id, return the result and log in the caller that does.
  791  
  792  Bad, from `PortType` in `trade-imports-reference-data`. The enum warns, but it only holds the traffic value, so support cannot tell which port is affected:
  793  
  794  ```java
  795  if (type.isEmpty() && REPORTED_UNKNOWN_TRAFFIC.add(stripped)) {
  796    log.warn("MDM port traffic '{}' is not a known port type; its ports are listed last with no type", stripped);
  797  }
  798  ```
  799  
  800  Good: `PortType.fromTraffic` returns `Optional.empty()` and does not log. `PortOfEntry(MdmPortOfEntry)`, which holds the port code, logs:
  801  
  802  ```java
  803  this.type = PortType.fromTraffic(mdm.getTraffic()).orElse(null);
  804  if (type == null) {
  805    log.warn("Port {} has MDM traffic '{}', which is not a known port type", code, mdm.getTraffic());
  806  }
  807  ```
  808  
  809  **Pass the throwable, never only its message.** Give the exception as the last argument, with no `{}` for it. SLF4J then prints the type, the message, the stack trace and the cause chain. `e.getMessage()` alone drops the type and the cause, and is often null.
  810  
  811  Bad, from `ExternalCallMetrics` in `trade-imports-reference-data` and `trade-imports-dynamics-gateway`:
  812  
  813  ```java
  814  } catch (RuntimeException e) {
  815    log.warn("Could not record external call {}/{}: {}", call.dependency(), call.operation(), e.getMessage());
  816  }
  817  ```
  818  
  819  Good:
  820  
  821  ```java
  822  } catch (RuntimeException e) {
  823    log.warn("Could not record external call {}/{}", call.dependency(), call.operation(), e);
  824  }
  825  ```
  826  
  827  **A failure line says why it failed.** `ExternalCallMetrics.measure` catches the exception, records the call as failed and rethrows. The log line it writes reads `External call <dependency>/<operation> failure in 5 ms`, with no cause and no status. Support sees a failure and cannot tell a timeout from a refusal. Carry the HTTP status, or the exception type when there is no status, into the failure line. If the exception is rethrown and logged in full where it is handled, do not log its stack trace here as well. `ExternalCallRecorder` in `trade-imports-address-book` does this: its failure line carries the cause's class name and message as the key-value pairs `error.type` and `error.message`, with no throwable attached (service-observability's `references/LOGGING.md`).
  828  
  829  **No request or response bodies at INFO.** Bodies hold personal data (names, addresses) and can be large. Log the status and what the code did with the answer, such as a result count. If a body is the only way to tell two failures apart, log a bounded excerpt at WARN on the failure path only.
  830  
  831  Bad, from `AddressLookupClient` in `trade-imports-ins-backend`. Every successful lookup writes the full address list to the log:
  832  
  833  ```java
  834  log.info("Address lookup answered: status={} body={}", response.getStatusCode().value(), responseBody);
  835  ```
  836  
  837  Good:
  838  
  839  ```java
  840  log.info("Address lookup answered: status={}", response.getStatusCode().value());
  841  ```
  842  
  843  `logRefusal` in the same class is the acceptable case: a refusal, at WARN, with the body cut to `MAX_LOGGED_BODY_LENGTH`.
  844  
  845  **Do not test diagnostic log lines.** A test that pins a spike or debugging log line keeps it alive after the spike ends. Test the outcome; if a log line is part of the contract (an audit event, an ECS field), test that in an IT such as `EcsLoggingIT`.
  846  
  847  `logback-spring.xml` — switch format by Spring profile:
  848  
  849  ```xml
  850  <configuration>
  851    <springProfile name="!local">
  852      <!-- ECS format for deployed environments -->
  853      <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
  854        <encoder class="co.elastic.logging.logback.EcsEncoder">
  855          <serviceName>trade-imports-animals-backend</serviceName>
  856        </encoder>
  857      </appender>
  858    </springProfile>
  859  
  860    <springProfile name="local">
  861      <!-- Human-readable for local dev -->
  862      <appender name="STDOUT" class="ch.qos.logback.core.ConsoleAppender">
  863        <encoder>
  864          <pattern>%d{HH:mm:ss} %-5level [%X{traceId}] %logger{36} - %msg%n</pattern>
  865        </encoder>
  866      </appender>
  867    </springProfile>
  868  
  869    <!-- Suppress health check noise -->
  870    <logger name="org.springframework.web.servlet.DispatcherServlet" level="WARN"/>
  871  
  872    <root level="${LOG_LEVEL:-INFO}">
  873      <appender-ref ref="STDOUT"/>
  874    </root>
  875  </configuration>
  876  ```
  877  
  878  ---
  879  
  880  ## 16. Spring Data MongoDB (brief)
  881  
  882  Full reference: `docs/java/spring-data-mongodb.md`.
  883  
  884  ```java
  885  @Document(collection = "notifications")
  886  @Builder
  887  @Data
  888  public class Notification {
  889  
  890      @Id
  891      private String id;
  892  
  893      @Indexed(sparse = true, unique = true)
  894      private String referenceNumber;
  895  
  896      @CreatedDate
  897      private Instant createdAt;
  898  
  899      @LastModifiedDate
  900      private Instant updatedAt;
  901  }
  902  ```
  903  
  904  ```java
  905  public interface NotificationRepository extends MongoRepository<Notification, String> {
  906  
  907      Optional<Notification> findByReferenceNumber(String referenceNumber);
  908  
  909      List<Notification> findAllByReferenceNumberIn(List<String> referenceNumbers);
  910  
  911      boolean existsByReferenceNumber(String referenceNumber);
  912  }
  913  ```
  914  
  915  ---
  916  
  917  ## 17. HTTP clients (RestClient)
  918  
  919  ```java
  920  @Configuration
  921  @RequiredArgsConstructor
  922  public class HttpClientConfig {
  923  
  924      private final TraceIdPropagationInterceptor traceInterceptor;
  925  
  926      @Bean
  927      public RestClient backendRestClient(
  928              @Value("${app.backend-url}") String baseUrl) {
  929          return RestClient.builder()
  930                  .baseUrl(baseUrl)
  931                  .requestInterceptor(traceInterceptor)
  932                  .defaultHeader("Content-Type", "application/json")
  933                  .build();
  934      }
  935  }
  936  ```
  937  
  938  ```java
  939  @Service
  940  @RequiredArgsConstructor
  941  public class BackendClient {
  942  
  943      private final RestClient backendRestClient;
  944  
  945      public NotificationDto getNotification(String referenceNumber) {
  946          return backendRestClient.get()
  947                  .uri("/notifications/{ref}", referenceNumber)
  948                  .retrieve()
  949                  .onStatus(HttpStatusCode::is4xxClientError, (req, res) -> {
  950                      throw new NotFoundException("Notification not found: " + referenceNumber);
  951                  })
  952                  .body(NotificationDto.class);
  953      }
  954  
  955      public NotificationDto saveNotification(NotificationRequest request) {
  956          return backendRestClient.post()
  957                  .uri("/notifications")
  958                  .body(request)
  959                  .retrieve()
  960                  .body(NotificationDto.class);
  961      }
  962  }
  963  ```
  964  
  965  Prefer `RestClient` (Spring 6.1+). Do not use `RestTemplate` for new code.
  966  
  967  ---
  968  
  969  ## 18. OpenAPI (brief)
  970  
  971  Full reference: `docs/java/openapi-springdoc.md`.
  972  
  973  ```java
  974  @Tag(name = "Notifications", description = "Manage import notifications")
  975  @RestController
  976  public class NotificationController {
  977  
  978      @Operation(summary = "Get all notifications")
  979      @ApiResponse(responseCode = "200", description = "Notifications retrieved")
  980      @GetMapping("/notifications")
  981      public List<NotificationDto> findAll() { ... }
  982  }
  983  ```
  984  
  985  ---
  986  
  987  ## 19. Micrometer metrics
  988  
  989  Every metric is a Micrometer meter, and `EmfMeterRegistry` publishes them all to CloudWatch with each meter's tags as its dimensions. The rule, the classes to copy, the allowlist and the tests are in `~/git/defra/trade-imports-workspace/.claude/skills/service-observability/references/METRICS.md` → "Publish (Java, Spring Boot)". Follow it; this section only shows the shape.
  990  
  991  `MetricsConfig` creates the registry when `aws.emf.enabled` is true (section 9), and holds the aspects `@Timed` and `@Counted` need:
  992  
  993  ```java
  994  @Configuration
  995  public class MetricsConfig {
  996  
  997      @Bean
  998      @ConditionalOnProperty(name = "aws.emf.enabled", havingValue = "true")
  999      EmfMeterRegistry emfMeterRegistry(
 1000              @Value("${aws.emf.namespace}") String namespace,
 1001              @Value("${aws.emf.step}") Duration step,
 1002              @Value("${aws.emf.environment:}") String environment) { ... }
 1003  
 1004      @Bean
 1005      TimedAspect timedAspect(MeterRegistry meterRegistry) {
 1006          return new TimedAspect(meterRegistry);
 1007      }
 1008  
 1009      @Bean
 1010      CountedAspect countedAspect(MeterRegistry registry) {
 1011          return new CountedAspect(registry);
 1012      }
 1013  }
 1014  ```
 1015  
 1016  `@Timed` on controller/service methods:
 1017  ```java
 1018  @Timed("controller.notification.save.time")
 1019  public NotificationDto save(NotificationRequest request, HttpHeaders headers) { ... }
 1020  ```
 1021  
 1022  A business metric is a meter, tagged by its dimension:
 1023  ```java
 1024  public void countChange(Change change) {
 1025      Counter.builder("address.change")
 1026          .tag("change", change.name().toLowerCase(Locale.ROOT))
 1027          .register(meterRegistry)
 1028          .increment();
 1029  }
 1030  ```
 1031  
 1032  Each metric name goes on the allowlist (`management.metrics.enable` in `application.yml`), or its meter publishes nothing.
 1033  
 1034  ---
 1035  
 1036  ## 20. Testing
 1037  
 1038  Full reference: `docs/java/testing/unit.md` and `docs/java/testing/integration.md`.
 1039  
 1040  Key pattern — Testcontainers `@DynamicPropertySource`:
 1041  
 1042  ```java
 1043  @SpringBootTest
 1044  @Testcontainers
 1045  class NotificationServiceIT {
 1046  
 1047      @Container
 1048      static MongoDBContainer mongo = new MongoDBContainer("mongo:7");
 1049  
 1050      @DynamicPropertySource
 1051      static void mongoProperties(DynamicPropertyRegistry registry) {
 1052          registry.add("spring.data.mongodb.uri", mongo::getReplicaSetUrl);
 1053      }
 1054  }
 1055  ```
 1056  
 1057  ---
 1058  
 1059  ## 21. Project conventions
 1060  
 1061  | Convention | Value |
 1062  |-----------|-------|
 1063  | Base package | `uk.gov.defra.tradeimportsanimals` |
 1064  | Java version | Java 25 (Amazon Corretto) |
 1065  | Spring Boot | 3.5.x |
 1066  | Build tool | Maven |
 1067  | Coverage minimum | 65% (JaCoCo enforced in `verify`) |
 1068  | HTTP port | 8085 |
 1069  | Shutdown | Graceful (`server.shutdown=graceful`) |
 1070  | Proxy headers | `server.forward-headers-strategy=framework` |
 1071  
 1072  **Lombok annotations to use:**
 1073  
 1074  | Annotation | Purpose |
 1075  |-----------|---------|
 1076  | `@RequiredArgsConstructor` | Constructor injection |
 1077  | `@Slf4j` | Provides `log` field |
 1078  | `@Builder` | Builder pattern |
 1079  | `@Data` | Getters + setters + equals + hashCode (use on mutable entities) |
 1080  | `@Value` | Immutable value class (all fields final) |
 1081  | `@With` | Generates `withX()` copy methods |
 1082  
 1083  **Error type URI convention:** `/problems/{problem-type}` (e.g. `/problems/not-found`, `/problems/validation-error`)
 1084  
 1085  ---
 1086  
 1087  ## 22. Maven — coordinated dependency versions via BOMs
 1088  
 1089  Spring Boot's `spring-boot-starter-parent` already imports a curated BOM for Spring/Jackson/etc. For dependency families *outside* Spring (AWS SDK, Spring Cloud, Testcontainers), import their BOM in `dependencyManagement` rather than pinning each artifact's `<version>` separately. A BOM keeps every artifact in the family at a compatible version.
 1090  
 1091  ```xml
 1092  <dependencyManagement>
 1093      <dependencies>
 1094          <!-- AWS SDK v2 — one BOM, every aws-sdk dep stays consistent -->
 1095          <dependency>
 1096              <groupId>software.amazon.awssdk</groupId>
 1097              <artifactId>bom</artifactId>
 1098              <version>${aws.sdk.version}</version>
 1099              <type>pom</type>
 1100              <scope>import</scope>
 1101          </dependency>
 1102  
 1103          <!-- Spring Cloud — manages spring-cloud-starter-* artifacts -->
 1104          <dependency>
 1105              <groupId>org.springframework.cloud</groupId>
 1106              <artifactId>spring-cloud-dependencies</artifactId>
 1107              <version>${spring.cloud.version}</version>
 1108              <type>pom</type>
 1109              <scope>import</scope>
 1110          </dependency>
 1111      </dependencies>
 1112  </dependencyManagement>
 1113  
 1114  <dependencies>
 1115      <!-- No <version> — comes from the BOM -->
 1116      <dependency>
 1117          <groupId>software.amazon.awssdk</groupId>
 1118          <artifactId>s3</artifactId>
 1119      </dependency>
 1120      <dependency>
 1121          <groupId>software.amazon.awssdk</groupId>
 1122          <artifactId>sts</artifactId>
 1123      </dependency>
 1124      <dependency>
 1125          <groupId>org.springframework.cloud</groupId>
 1126          <artifactId>spring-cloud-starter-openfeign</artifactId>
 1127      </dependency>
 1128  </dependencies>
 1129  ```
 1130  
 1131  **Why it matters.** Manual per-artifact versions drift — one upgrade leaves siblings on incompatible versions, surfacing as `NoSuchMethodError`/`LinkageError` at runtime. A single BOM property bumps all family members atomically.
```

## File: `docs/best-practices/java/testing/unit.md`

### Diff

```diff
diff --git a/docs/best-practices/java/testing/unit.md b/docs/best-practices/java/testing/unit.md
index d9c96822..1975aadf 100644
--- a/docs/best-practices/java/testing/unit.md
+++ b/docs/best-practices/java/testing/unit.md
@@ -33,7 +33,7 @@ There are three distinct flavours of unit test in this codebase:
 |----------|-------------|
 | Pure unit — direct instantiation | Services, exception handlers, interceptors, config classes with no Spring dependencies |
 | `@WebMvcTest` slice | Controllers — exercises the full Spring MVC dispatch chain without a real server |
-| Annotation-contract tests | Verifying that production classes carry required annotations (`@ConditionalOnProperty`, `@Scheduled`, etc.) |
+| Conditional-bean tests (`ApplicationContextRunner`) | Proving a bean is created or left out by its condition (`@ConditionalOnProperty` and the like) |
 
 ---
 
@@ -240,20 +240,45 @@ mockMvc.perform(delete("/notifications")...)
 
 ---
 
-## Annotation-contract tests
+## Conditional-bean tests
 
-When a production class must carry specific annotations for the application to work correctly (e.g. `@Scheduled`, `@ConditionalOnProperty`), verify this with reflection. Prefer this over integration tests for annotation presence — it runs faster and fails with a clear message.
+When a bean must exist only under a condition (`@ConditionalOnProperty` and the like), test what the condition does, not that the annotation is there. `ApplicationContextRunner` starts just the configuration under test, with the properties you give it, in milliseconds. Run it with the property on and off and assert on the beans. Reading the annotation by reflection proves only that it is spelled as written.
+
+The worked example is `configuration/MetricsConfigTest` in `trade-imports-address-book`:
 
 ```java
+private final ApplicationContextRunner contextRunner =
+    new ApplicationContextRunner()
+        .withUserConfiguration(MetricsConfig.class)
+        .withBean(
+            ConfigurableApplicationContext.CONVERSION_SERVICE_BEAN_NAME,
+            ConversionService.class,
+            ApplicationConversionService::getSharedInstance)
+        .withBean(
+            SimpleMeterRegistry.class, SimpleMeterRegistry::new, bean -> bean.setPrimary(true))
+        .withPropertyValues("aws.emf.namespace=test-namespace", "aws.emf.step=1m");
+
+@Test
+void emfMeterRegistry_isCreatedWhenEmfIsEnabled() {
+    contextRunner
+        .withPropertyValues("aws.emf.enabled=true")
+        .run(context -> assertThat(context).hasSingleBean(EmfMeterRegistry.class));
+}
+
 @Test
-void metricsPublisher_shouldHaveScheduledAnnotation() {
-    Method publishMethod = EmfMetricsPublisher.class.getMethod("publishMetrics");
-    Scheduled scheduled = publishMethod.getAnnotation(Scheduled.class);
-    assertThat(scheduled).isNotNull();
-    assertThat(scheduled.fixedRate()).isEqualTo(60000L);
+void emfMeterRegistry_isLeftOutWhenEmfIsDisabled() {
+    contextRunner
+        .withPropertyValues("aws.emf.enabled=false")
+        .run(
+            context -> {
+              assertThat(context).hasNotFailed();
+              assertThat(context).doesNotHaveBean(EmfMeterRegistry.class);
+            });
 }
 ```
 
+The runner supplies every property the bean reads, so the enabled test can start it. It registers Spring Boot's `ApplicationConversionService` as the context's conversion service, because a bare `ApplicationContextRunner` does not bind `"1m"` to a `Duration`. The disabled test asserts `hasNotFailed()` before `doesNotHaveBean(...)`: a context that failed to start has no beans, so without it the test passes whatever the condition does.
+
 ---
 
 ## Test method naming
```

### File at the reviewed commit, with line numbers

```markdown
    1  # Unit Testing — trade-imports-animals-backend
    2  
    3  ## Overview
    4  
    5  Unit tests run in isolation — no Spring context, no database, no HTTP server. External dependencies are replaced with Mockito mocks. Tests execute in the Maven `test` phase via Surefire.
    6  
    7  **Run with:**
    8  ```bash
    9  mvn test             # unit tests only
   10  mvn verify           # unit + integration tests
   11  ```
   12  
   13  `mvn test` runs no `*IT` class. Before calling a backend change done, run `mvn verify`, with Docker running for Testcontainers.
   14  
   15  ---
   16  
   17  ## File naming convention
   18  
   19  | Pattern | Runner | Phase |
   20  |---------|--------|-------|
   21  | `*Test.java` | Maven Surefire | `test` |
   22  | `*IT.java` | Maven Failsafe | `integration-test` / `verify` |
   23  
   24  No `@Tag` or `@Category` annotations are used. The `Test` suffix is the only distinction.
   25  
   26  ---
   27  
   28  ## Test types
   29  
   30  There are three distinct flavours of unit test in this codebase:
   31  
   32  | Approach | When to use |
   33  |----------|-------------|
   34  | Pure unit — direct instantiation | Services, exception handlers, interceptors, config classes with no Spring dependencies |
   35  | `@WebMvcTest` slice | Controllers — exercises the full Spring MVC dispatch chain without a real server |
   36  | Conditional-bean tests (`ApplicationContextRunner`) | Proving a bean is created or left out by its condition (`@ConditionalOnProperty` and the like) |
   37  
   38  ---
   39  
   40  ## Pure unit tests
   41  
   42  ### Setup pattern
   43  
   44  Construct the class under test in `@BeforeEach` using its real constructor. Never use `@InjectMocks` — explicit construction makes dependencies visible and avoids silent injection failures.
   45  
   46  ```java
   47  @ExtendWith(MockitoExtension.class)
   48  class NotificationServiceTest {
   49  
   50      @Mock
   51      private NotificationRepository notificationRepository;
   52  
   53      @Mock
   54      private AuditRepository auditRepository;
   55  
   56      private NotificationService notificationService;
   57  
   58      @BeforeEach
   59      void setUp() {
   60          notificationService = new NotificationService(notificationRepository, auditRepository);
   61      }
   62  }
   63  ```
   64  
   65  Use `@ExtendWith(MockitoExtension.class)` whenever the class under test has collaborators that need mocking. For classes with no dependencies (e.g. a simple exception handler), omit the extension and instantiate directly:
   66  
   67  ```java
   68  class GlobalExceptionHandlerTest {
   69  
   70      private GlobalExceptionHandler exceptionHandler;
   71  
   72      @BeforeEach
   73      void setUp() {
   74          exceptionHandler = new GlobalExceptionHandler();
   75      }
   76  }
   77  ```
   78  
   79  ### Mocks
   80  
   81  Mock only at the edge of the service: a repository (the database), an HTTP or SDK client (the network), the clock. Never mock a class of your own that holds logic, such as a mapper, a validator or a rule class: construct the real one, so the test covers it too. A collaborator service that itself only fronts an edge, such as a document service over S3, may be mocked where its calls are the side effect under test.
   82  
   83  Declare mocks as fields with `@Mock`. Use inline `mock()` only for objects that are local to a single test (e.g. a `BindingResult` created by a test helper):
   84  
   85  ```java
   86  // Field mock — used across multiple tests
   87  @Mock
   88  private NotificationRepository notificationRepository;
   89  
   90  // Inline mock — local to one test or helper
   91  BindingResult bindingResult = mock(BindingResult.class);
   92  when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldErrors));
   93  ```
   94  
   95  Use `lenient()` stubs in `@BeforeEach` for stubs that not every test exercises — this avoids `UnnecessaryStubbingException` without suppressing the extension:
   96  
   97  ```java
   98  @BeforeEach
   99  void setUp() throws IOException {
  100      interceptor = new TraceIdPropagationInterceptor("x-cdp-request-id");
  101      headers = new HttpHeaders();
  102      lenient().when(request.getHeaders()).thenReturn(headers);
  103      lenient().when(execution.execute(any(), any())).thenReturn(response);
  104  }
  105  ```
  106  
  107  ### What to assert — behaviour, not mock interactions
  108  
  109  Tests must assert **observable behaviour**: the return value of the method under test, or the state it produces. Do not write tests whose primary assertion is that a mock was called.
  110  
  111  **Bad — testing that the mock works as configured:**
  112  ```java
  113  // This test would pass even if the production code did nothing useful.
  114  // It just proves that when(repo.save(...)).thenReturn(x) works.
  115  when(repository.save(any())).thenReturn(savedDoc);
  116  service.initiate(ref, request);
  117  ArgumentCaptor<MyDocument> captor = ArgumentCaptor.forClass(MyDocument.class);
  118  verify(repository).save(captor.capture());
  119  assertThat(captor.getValue().getStatus()).isEqualTo(Status.PENDING); // ← mock input, not behaviour
  120  ```
  121  
  122  **Good — asserting on what the caller receives:**
  123  ```java
  124  DocumentUploadResponse response = service.initiate(ref, request);
  125  assertThat(response.uploadId()).isEqualTo("expected-id");
  126  assertThat(response.uploadUrl()).isEqualTo("https://expected-url");
  127  ```
  128  
  129  **The rule:** if deleting the production code (or making it return a hardcoded wrong value) would still let the test pass, the test is not testing behaviour.
  130  
  131  **When `verify()` is acceptable:**
  132  
  133  - As a *secondary* check after a meaningful result assertion: fine
  134  - To assert something was *never* called (guards against unwanted side effects): fine
  135  - As the *sole* assertion — only if the method is `void` **and** the side-effect genuinely cannot be observed any other way. In practice this is rare: prefer integration tests with a real database over unit tests that capture mock inputs.
  136  
  137  ```java
  138  // Fine — secondary verify after a meaningful assertion
  139  assertThat(response.uploadId()).isEqualTo("existing-upload-id");
  140  verify(cdpUploaderClient, never()).initiate(any()); // idempotency guard
  141  
  142  // Fine — void method, guarding against unwanted save
  143  verify(repository, never()).save(any());
  144  ```
  145  
  146  **`void` methods that persist to a database**: if the only way to verify correctness is to inspect what was passed to `repository.save()`, that is a signal to write an integration test instead — not to add an ArgumentCaptor. The IT tests in this project use a real MongoDB container precisely for this reason.
  147  
  148  ### ArgumentCaptor
  149  
  150  Use `ArgumentCaptor` when you need to make assertions on a complex object passed to a collaborator, **and** you have already established that the method produces a correct observable result. Never use it as a substitute for a result assertion.
  151  
  152  Prefer `ArgumentCaptor.forClass()` declared inline for one-off captures. For tests that capture repeatedly, declare `@Captor` fields:
  153  
  154  ```java
  155  // Inline — for a single capture assertion
  156  ArgumentCaptor<Audit> auditCaptor = ArgumentCaptor.forClass(Audit.class);
  157  verify(auditRepository).save(auditCaptor.capture());
  158  Audit saved = auditCaptor.getValue();
  159  assertThat(saved.getResult()).isEqualTo(Result.SUCCESS);
  160  
  161  // Field — when capture is needed across multiple tests
  162  @Captor private ArgumentCaptor<HttpRequest> requestCaptor;
  163  @Captor private ArgumentCaptor<byte[]> bodyCaptor;
  164  ```
  165  
  166  ### State cleanup
  167  
  168  If a test modifies global state (e.g. SLF4J MDC), clean it up in `@AfterEach`:
  169  
  170  ```java
  171  @AfterEach
  172  void tearDown() {
  173      MDC.clear();
  174  }
  175  ```
  176  
  177  ---
  178  
  179  ## Controller tests — `@WebMvcTest`
  180  
  181  Use `@WebMvcTest` (not `@SpringBootTest`) for controller unit tests. It starts the Spring MVC layer only — no database, no full context. MockMvc is auto-configured.
  182  
  183  Wire the admin secret via `@TestPropertySource` so the security filter has a value to compare:
  184  
  185  ```java
  186  @WebMvcTest(NotificationController.class)
  187  @TestPropertySource(properties = "admin.secret=test-secret")
  188  class NotificationControllerTest {
  189  
  190      @Autowired
  191      private MockMvc mockMvc;
  192  
  193      @Autowired
  194      private ObjectMapper objectMapper;
  195  
  196      @MockitoBean
  197      private NotificationService notificationService;
  198  }
  199  ```
  200  
  201  Use `@MockitoBean` (not `@Mock`) for service dependencies — Spring needs to inject these into the controller bean.
  202  
  203  ### HTTP assertions
  204  
  205  ```java
  206  // GET list
  207  mockMvc.perform(get("/notifications")
  208          .contentType(MediaType.APPLICATION_JSON))
  209      .andExpect(status().isOk())
  210      .andExpect(jsonPath("$").isArray())
  211      .andExpect(jsonPath("$.length()").value(2))
  212      .andExpect(jsonPath("$[0].id").value("507f1f77bcf86cd799439011"));
  213  
  214  // POST with body
  215  mockMvc.perform(post("/notifications")
  216          .contentType(MediaType.APPLICATION_JSON)
  217          .content(objectMapper.writeValueAsString(dto)))
  218      .andExpect(status().isOk())
  219      .andExpect(jsonPath("$.referenceNumber").value(expectedRef));
  220  
  221  // DELETE with header
  222  mockMvc.perform(delete("/notifications")
  223          .contentType(MediaType.APPLICATION_JSON)
  224          .header("Trade-Imports-Animals-Admin-Secret", "test-secret")
  225          .content(objectMapper.writeValueAsString(referenceNumbers)))
  226      .andExpect(status().isNoContent());
  227  ```
  228  
  229  `@WebMvcTest` also exercises `@ControllerAdvice` handlers. Use it to verify that exceptions thrown by mocked services map to the correct HTTP status codes — this is cheaper than an integration test for basic exception-to-status mapping:
  230  
  231  ```java
  232  // Validates that NotFoundException → 404 through GlobalExceptionHandler
  233  doThrow(new NotFoundException("not found"))
  234      .when(notificationService).deleteByReferenceNumbers(any(), any());
  235  
  236  mockMvc.perform(delete("/notifications")...)
  237      .andExpect(status().isNotFound())
  238      .andExpect(jsonPath("$.detail").value("not found"));
  239  ```
  240  
  241  ---
  242  
  243  ## Conditional-bean tests
  244  
  245  When a bean must exist only under a condition (`@ConditionalOnProperty` and the like), test what the condition does, not that the annotation is there. `ApplicationContextRunner` starts just the configuration under test, with the properties you give it, in milliseconds. Run it with the property on and off and assert on the beans. Reading the annotation by reflection proves only that it is spelled as written.
  246  
  247  The worked example is `configuration/MetricsConfigTest` in `trade-imports-address-book`:
  248  
  249  ```java
  250  private final ApplicationContextRunner contextRunner =
  251      new ApplicationContextRunner()
  252          .withUserConfiguration(MetricsConfig.class)
  253          .withBean(
  254              ConfigurableApplicationContext.CONVERSION_SERVICE_BEAN_NAME,
  255              ConversionService.class,
  256              ApplicationConversionService::getSharedInstance)
  257          .withBean(
  258              SimpleMeterRegistry.class, SimpleMeterRegistry::new, bean -> bean.setPrimary(true))
  259          .withPropertyValues("aws.emf.namespace=test-namespace", "aws.emf.step=1m");
  260  
  261  @Test
  262  void emfMeterRegistry_isCreatedWhenEmfIsEnabled() {
  263      contextRunner
  264          .withPropertyValues("aws.emf.enabled=true")
  265          .run(context -> assertThat(context).hasSingleBean(EmfMeterRegistry.class));
  266  }
  267  
  268  @Test
  269  void emfMeterRegistry_isLeftOutWhenEmfIsDisabled() {
  270      contextRunner
  271          .withPropertyValues("aws.emf.enabled=false")
  272          .run(
  273              context -> {
  274                assertThat(context).hasNotFailed();
  275                assertThat(context).doesNotHaveBean(EmfMeterRegistry.class);
  276              });
  277  }
  278  ```
  279  
  280  The runner supplies every property the bean reads, so the enabled test can start it. It registers Spring Boot's `ApplicationConversionService` as the context's conversion service, because a bare `ApplicationContextRunner` does not bind `"1m"` to a `Duration`. The disabled test asserts `hasNotFailed()` before `doesNotHaveBean(...)`: a context that failed to start has no beans, so without it the test passes whatever the condition does.
  281  
  282  ---
  283  
  284  ## Test method naming
  285  
  286  ```
  287  {subject}_{shouldDoWhat}
  288  {subject}_{shouldDoWhat}_{whenContext}
  289  ```
  290  
  291  Use the method name or operation as the subject prefix. Examples:
  292  
  293  ```
  294  saveOriginOfImport_shouldSaveNewNotificationAndGenerateReferenceNumber
  295  saveOriginOfImport_shouldUpdateExistingNotification
  296  findAll_shouldReturnEmptyList
  297  deleteByReferenceNumbers_shouldThrowNotFoundException_whenOneIsMissing
  298  handleValidationException_shouldReturnBadRequestWithFieldErrors
  299  handleValidationException_shouldHandleNullTraceId
  300  intercept_shouldAddTraceIdHeader_whenMdcContainsTraceId
  301  intercept_shouldNotAddHeader_whenMdcTraceIdIsBlank
  302  post_shouldCreateNotificationAndReturnReferenceNumber
  303  delete_shouldReturn401_whenAdminSecretHeaderIsMissing
  304  ```
  305  
  306  Do not use `testXxx()` naming — this is an older JUnit 3 convention found in some tests but it is not the standard going forward.
  307  
  308  ---
  309  
  310  ## Test titles and layout
  311  
  312  ### The title states what the assertions prove
  313  
  314  Read the assertions, then write the title from them. A title that claims more than the assertions check is a defect in that test, not a naming preference.
  315  
  316  Bad: titled `submit_shouldSetStatusToSubmitted`, while the only assertion is `isEqualTo(SUBMITTED_ACTION_REQUIRED)`. A reader trusts the title and believes a plain submit is covered.
  317  
  318  Good: `submit_shouldRequireActionWhenAHealthCertificateIsOutstanding`, with a fixture that has an outstanding health certificate.
  319  
  320  Do not copy an acceptance criterion into the title when the body tests a stand-in for it (a draft fixture standing in for a submitted one, say). Either test the real case or name the stand-in.
  321  
  322  ### The test fails without the change it covers
  323  
  324  Before you call a test done, undo the production change it covers (or invert the condition it guards), run the test and see it fail. Restore the change and see it pass. A test that stays green against the old code proves nothing about the new code: fix the assertion, or delete the test and the code it was meant to cover.
  325  
  326  ### No tests that pin diagnostic log lines
  327  
  328  Do not write a test that pins a diagnostic, spike or temporary log line, its level or its fields. Coverage work tests the outcome the branch changes, not the line that reports it. A log line is pinned only when support depends on it: an outcome-changing branch that must log its ids.
  329  
  330  ### Layout: no Given / When / Then comments
  331  
  332  Do not write `// Given`, `// When`, `// Then` or `// And` comments. Separate set-up, action and assertions with a blank line. When set-up is long enough to need a label, extract it into a named helper (`givenNotificationWithOutstandingCertificate()`) so the name does the labelling.
  333  
  334  One behaviour per test. If you need a second `// Then`, you have a second test.
  335  
  336  Bad: one test, two behaviours, and a title that names only the first:
  337  
  338  ```java
  339  @Test
  340  void deleteByReferenceNumbers_shouldDeleteAll_whenAllFound() {
  341      // Given
  342      String ref1 = "DRAFT.IMP.2026.111";
  343      Notification n1 = Notification.builder().id("111").referenceNumber(ref1).build();
  344      when(notificationRepository.findAllByReferenceNumberIn(List.of(ref1))).thenReturn(List.of(n1));
  345      when(auditRepository.save(any(Audit.class))).thenReturn(new Audit());
  346  
  347      // When
  348      notificationService.deleteByReferenceNumbers(List.of(ref1), headers);
  349  
  350      // Then — deleteAll is called with the found notifications
  351      verify(notificationRepository).deleteAll(List.of(n1));
  352  
  353      // And an audit record is saved with SUCCESS
  354      ArgumentCaptor<Audit> auditCaptor = ArgumentCaptor.forClass(Audit.class);
  355      verify(auditRepository).save(auditCaptor.capture());
  356      assertThat(auditCaptor.getValue().getResult()).isEqualTo(Result.SUCCESS);
  357  }
  358  ```
  359  
  360  Good: two tests, a shared helper for the set-up, blank lines for structure:
  361  
  362  ```java
  363  @Test
  364  void deleteByReferenceNumbers_shouldDeleteTheFoundNotifications() {
  365      Notification notification = givenStoredNotification("DRAFT.IMP.2026.111");
  366  
  367      notificationService.deleteByReferenceNumbers(List.of("DRAFT.IMP.2026.111"), headers);
  368  
  369      verify(notificationRepository).deleteAll(List.of(notification));
  370  }
  371  
  372  @Test
  373  void deleteByReferenceNumbers_shouldAuditSuccess_whenAllFound() {
  374      givenStoredNotification("DRAFT.IMP.2026.111");
  375  
  376      notificationService.deleteByReferenceNumbers(List.of("DRAFT.IMP.2026.111"), headers);
  377  
  378      ArgumentCaptor<Audit> auditCaptor = ArgumentCaptor.forClass(Audit.class);
  379      verify(auditRepository).save(auditCaptor.capture());
  380      assertThat(auditCaptor.getValue().getResult()).isEqualTo(Result.SUCCESS);
  381  }
  382  ```
  383  
  384  A multi-step flow (create, then update, then delete) is one test per step, each setting up its own state through a helper. One long flow test fails at the first broken step and hides every later one.
  385  
  386  ### Comments beside assertions
  387  
  388  When you change an assertion, re-read every comment near it. A comment that still names the old value is wrong the moment the assertion changes: delete it. Better still, do not write one; the assertion and the title already say it.
  389  
  390  ---
  391  
  392  ## Assertions
  393  
  394  ### AssertJ — primary
  395  
  396  AssertJ is the standard assertion library. Do not use JUnit's `assertEquals` / `assertNotNull` — these exist in some older tests but are not the standard going forward.
  397  
  398  ```java
  399  // Object assertions
  400  assertThat(result).isNotNull();
  401  assertThat(result.getReferenceNumber()).startsWith("DRAFT.IMP." + currentYear + ".");
  402  assertThat(result.getReferenceNumber()).endsWith(generatedId);
  403  
  404  // Exception assertions
  405  assertThatThrownBy(() -> service.doSomething(arg))
  406      .isInstanceOf(NotFoundException.class)
  407      .hasMessageContaining("DRAFT.IMP.2026.MISSING");
  408  
  409  // Collection assertions
  410  assertThat(result).hasSize(3);
  411  assertThat(result).extracting(Notification::getCommodity)
  412      .containsExactly("Live cattle", "Live sheep", "Live pigs");
  413  
  414  // Map assertions
  415  assertThat(errors).hasSize(2);
  416  assertThat(errors.get("origin")).isEqualTo("must not be null");
  417  ```
  418  
  419  ### Mockito verification
  420  
  421  ```java
  422  // Verify exact call count
  423  verify(notificationRepository, times(2)).save(any(Notification.class));
  424  verify(notificationRepository, times(1)).findAll();
  425  
  426  // Verify never called
  427  verify(notificationRepository, never()).deleteAll(anyList());
  428  
  429  // Verify call with specific argument
  430  verify(notificationRepository).deleteAll(List.of(n1, n2));
  431  ```
  432  
  433  ### `InOrder` — when call order matters
  434  
  435  For cascade operations where the *order* of collaborator calls is part of the contract (delete children before parent, persist before publish, etc.), bare `verify` calls pass even when the order is swapped. Use `InOrder` so a swap fails the test.
  436  
  437  ```java
  438  // Wrong — both verifies pass even if production swapped the calls
  439  @Test
  440  void deleteByReferenceNumbers_shouldCascade() {
  441      notificationService.deleteByReferenceNumbers(List.of("REF-1"));
  442  
  443      verify(notificationRepository).deleteAllByReferenceNumberIn(List.of("REF-1"));
  444      verify(documentService).deleteForNotificationRefs(List.of("REF-1"));
  445  }
  446  
  447  // Correct — fails if children are deleted after parent (orphan-window bug)
  448  @Test
  449  void deleteByReferenceNumbers_shouldDeleteDocumentsBeforeNotifications() {
  450      notificationService.deleteByReferenceNumbers(List.of("REF-1"));
  451  
  452      InOrder inOrder = inOrder(documentService, notificationRepository);
  453      inOrder.verify(documentService).deleteForNotificationRefs(List.of("REF-1"));
  454      inOrder.verify(notificationRepository).deleteAllByReferenceNumberIn(List.of("REF-1"));
  455  }
  456  ```
  457  
  458  Use this whenever a service composes two or more collaborator calls whose ordering is load-bearing. Without `InOrder`, the test green-lights any permutation.
  459  
  460  ---
  461  
  462  ## Enum serialisation
  463  
  464  Each enum gets two serialisation tests, however many constants it has:
  465  
  466  - one round trip for one constant
  467  - one unknown value, which must throw `InvalidFormatException` (a different Jackson code path)
  468  
  469  Do not add a test per constant, and do not parameterise over `@EnumSource` to cover them all. Domain enums such as document types and scan statuses grow as values are confirmed; the test suite must not grow with them when the contract is the same. A reviewer must not raise a missing per-constant test as a gap. A missing unknown-value test is a gap.
  470  
  471  Bad: one test per constant, as `AccompanyingDocumentTest.ScanStatusJsonSerialisation` does today:
  472  
  473  ```java
  474  @Test
  475  void scanStatus_pending_serialisesToUppercaseString() throws JsonProcessingException { ... }
  476  
  477  @Test
  478  void scanStatus_complete_serialisesToUppercaseString() throws JsonProcessingException { ... }
  479  
  480  @Test
  481  void scanStatus_rejected_serialisesToUppercaseString() throws JsonProcessingException { ... }
  482  ```
  483  
  484  Good:
  485  
  486  ```java
  487  @Test
  488  void scanStatus_shouldRoundTripThroughJson() throws JsonProcessingException {
  489      String json = objectMapper.writeValueAsString(ScanStatus.PENDING);
  490  
  491      assertThat(json).isEqualTo("\"PENDING\"");
  492      assertThat(objectMapper.readValue(json, ScanStatus.class)).isEqualTo(ScanStatus.PENDING);
  493  }
  494  
  495  @Test
  496  void scanStatus_unknownValue_throwsInvalidFormatException() {
  497      assertThatThrownBy(() -> objectMapper.readValue("\"UNKNOWN\"", ScanStatus.class))
  498          .isInstanceOf(InvalidFormatException.class);
  499  }
  500  ```
  501  
  502  Use one test per constant only when constants serialise differently, for example each has its own `@JsonProperty` or `@JsonValue`. A small closed enum (HTTP method, day of week) may use a parameterised round trip.
  503  
  504  ---
  505  
  506  ## Helper methods
  507  
  508  Set-up used by two tests goes in a shared helper. When you promote a local helper to a shared one, delete every local copy in the same change.
  509  
  510  Extract repeated setup into private helpers — do not inline complex construction in every test:
  511  
  512  ```java
  513  // Private helper for audit-relevant headers
  514  private HttpHeaders headersWithAuditFields() {
  515      HttpHeaders headers = new HttpHeaders();
  516      headers.add("x-cdp-request-id", "test-trace-id");
  517      headers.add("User-Id", "test-user-id");
  518      return headers;
  519  }
  520  
  521  // Private helper for constructing hard-to-create exceptions
  522  private MethodArgumentNotValidException createValidationException(FieldError... fieldErrors) {
  523      // ...
  524  }
  525  ```
  526  
  527  ---
  528  
  529  ## What the existing unit tests cover
  530  
  531  | Class | Tests | What it covers |
  532  |-------|-------|----------------|
  533  | `NotificationControllerTest` | 8 | MVC dispatch, request/response serialisation, admin secret enforcement, NotFoundException → 404, empty-list validation |
  534  | `NotificationServiceTest` | 10 | Save new (two-phase: ID then reference), save existing (upsert), findAll, delete all-found, delete with missing (NotFoundException + FAILURE audit), delete empty list (no-op) |
  535  | `GlobalExceptionHandlerTest` | 9 | Validation → 400, NotFoundException → 404, ConflictException → 409, generic Exception → 500, traceId from MDC, null traceId handling |
  536  | `TraceIdPropagationInterceptorTest` | 6 | Header set when MDC populated, not set when null/blank/empty, overwrites existing header, body passed through unchanged |
  537  | `EmfMetricsPublisherTest` | ~4 | Metrics publish scheduling, meter registry interactions |
  538  | `MetricsConfigTest` | ~3 | MeterRegistry bean creation, publisher registration |
  539  | `MetricsConfigurationPropertiesTest` | ~3 | Annotation contracts: `@ConditionalOnProperty`, `@Service`, `@Scheduled(fixedRate=60000)` |
  540  | `CertificateLoaderTest` | ~5 | null/empty/valid/invalid certificate paths |
  541  | `CacheConfigTest` | ~3 | Caffeine spec construction, CacheManager bean |
  542  | `ApplicationTest` | 0 | Placeholder only — no assertions |
```

## Guides

### Source: `docs/best-practices/skills/patterns.md`

# Workspace skill patterns — the 8-pattern checklist

Workspace skills under `~/git/defra/trade-imports-workspace/.claude/skills/`
share a small vocabulary of shapes. Each pattern is a judgment call,
not a default — the same skill rarely uses all of them. This doc is
the canonical reference cited by `skill-creator` (CREATE mode applies
it, AUDIT mode checks it) and by anyone reviewing a skill by hand.

Companion docs in this directory:

- [`anti-patterns.md`](anti-patterns.md) — known mis-applications,
  one entry per recurring trap.
- [`scaffold-template.md`](scaffold-template.md) — the `SKILL.md`
  skeleton CREATE mode emits.

## 1. State as canonical JSON (or not)

**Question:** What state does the skill produce, and is it queried by
downstream tooling?

- **JSON-canonical** if: there's a list of N items the skill or the
  user wants to filter / aggregate / mutate by helper (review items,
  upgrade packages, style findings). The walker pattern only makes
  sense over a JSON list.
- **Prose-canonical** if: the artifact is a narrative the user reads
  end-to-end and nothing queries (a plan, a Jira description, a
  refinement verdict report, a how-it-works doc). Don't promote to
  JSON.

**Pattern-fit trap:** it's tempting to add a JSON sidecar "for
queryability" everywhere. Only do it when there is an actual query.

## 2. Scripts call other scripts (single dispatcher)

**Question:** Does the LLM run multiple sequential deterministic
commands at session start (fetch X, then fetch Y, then mkdir Z, then
write W)? If yes, those collapse into one `start-<skill>.sh` (or
`prepare-<skill>.sh`) dispatcher.

The dispatcher's first stdout line is conventionally `MODE: <NAME>`
so the parent session knows which branch to follow.

**Pattern-fit trap:** if the workflow has only 1-2 deterministic
setup steps, a dispatcher is overkill. Inline in `SKILL.md` is fine.

## 3. Pre-baked context at prepare time

**Question:** Do workers (fan-out subagents) or the parent session
fetch the same data multiple times? If yes, bake it once at prepare-
time into `workareas/<skill>/<ticket>/...`.

Examples: per-repo best-practices bundles, PR diff caches, per-
version CHANGELOG sections.

**Pattern-fit trap:** don't pre-bake speculative context. Only what
the workflow actually reads on the hot path.

## 4. Bash call hygiene (LLM-typed commands)

The hard rules, all enforced via the project allowlist:

- One command per Bash call. No `&&` / `;` / `|` chains.
- No `cd <dir> && cmd` — use `-C` (git), `--prefix` (npm) or `-f`
  (mvn).
- Never pipe a test run. Redirect it to a file and Read the file:
  `npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> test > <workarea>/test.log 2>&1`,
  not `... test | tail -40`. A piped run reports the trimmer's exit
  code, so a red run reads as green. `guard-bash.sh` denies it.
- Format and lint through the repo's named npm script
  (`npm --prefix ~/git/defra/trade-imports-workspace/repos/<repo> run format`).
  Never a `node_modules/.bin/` binary and never `npx`: prettier run
  by path from outside the repo formats differently from the repo's
  own script, and the pre-commit hook rejects the result.
- No `find ... -exec`. Run a plain `find ~/git/... -name X`, then Read.
- No Grep or Glob tools in a spawned agent. Search with one unpiped
  Bash `grep -rn`; find files with one unpiped `find`.
- No `VAR=x cmd` prefixes; they do not match the allowlist.
- No env vars (`$VAR`) in LLM-typed Bash — Claude Code prompts on
  expansion. Use literal
  `~/git/defra/trade-imports-workspace/...` paths.
- No `/Users/<you>/git/...` resolved form either — the matcher
  treats `~/git/...` and `/Users/.../git/...` as different prefixes.
- No `python3 -c` for JSON — use `jq` or workspace helpers.
- No `awk` / `sed -n` / `grep -n` to inspect files — use Read with
  offset+limit.
- Filter at the script (`--filter`, `--file`, `--repo` flag), not
  at the pipe.

This is workspace-wide; the full rule table lives in
[`docs/agent-skills.md`](../../agent-skills.md) → "Bash call
hygiene". Skill prose must comply; AUDIT mode flags violations.

## 5. What every agent prompt carries

**Question:** Does the skill, workflow or script spawn agents
(`general-purpose` Task subagents following `references/<NAME>.md`,
Workflow `agent()` calls, Codex briefs, ad-hoc spawns)? If yes, each
prompt carries three things. Spawned agents read only their prompt and
the files it names: not the parent `SKILL.md`, and not the user's auto
memory.

1. **The GUARD RAILS block, first.** The rail list is in
   [`docs/agent-skills.md`](../../agent-skills.md) → "Spawning agents".
   A worker reference file opens with a one-line pointer to it and to
   "Bash call hygiene". Point, don't inline, so copies cannot drift.
2. **The house rules, for every agent that writes or reviews code,
   tests or templates.** The prompt says: "Before you start, read
   `~/git/defra/trade-imports-workspace/.claude/rules/code-quality.md`
   in full." This holds for skill personas, Workflow scripts and
   one-off scripts alike. Rule files under `.claude/rules/` load only
   when an agent happens to read a matching path, and Codex loads
   none, so a prompt that does not name the file leaves the agent
   without the rules.
3. **An explicit `model`**, chosen by the table in "Spawning agents".

Bad, from an ad-hoc fix workflow: a brief that says "match animals' doc
comment" and names no rules file; the agent copied the ticket key into
the code. Good: GUARD RAILS first, then the line telling the agent to
read `code-quality.md` in full, then the task.

**Pattern-fit trap:** if the skill has no fan-out (the parent session
follows the reference inline), the pointer is optional; the parent
already has the rules. Any spawn at all needs all three.

## 6. Idempotent + atomic helpers

**Question:** Do helper scripts mutate state files?

- Atomic mutation = `jq ... > "$tmp" && mv "$tmp" "$file"` (or
  equivalent). Never partial-write.
- Coverage / completion gates check JSON fields, not file
  presence/non-emptiness (`jq -e '.verdict != null'`, not
  `[[ -s file ]]`).
- Where re-running might re-process already-done work, add a
  `reconciled_at` / `processed_at` marker and skip files where it's
  newer than the source's `updated_at`.

**Pattern-fit trap:** for single-shot single-author flows
(ticket-creator's `draft.md`), atomicity is over-engineering.
Recognise that.

## 7. Walker UX (for N-item triage)

**Question:** Does the skill produce a list of decisions the user
needs to make one-at-a-time (findings, items, packages)? If yes,
batch the presentation: present all items in one markdown block,
take a single batch keystroke string (`FFWFFWSSF`), apply via
parallel helper calls, slow-track only `D`s.

**Pattern-fit trap:** walkers are for N items. A single artifact (a
plan, a verdict, a draft) doesn't get a walker — natural-language
approval is right.

## 8. Allowlist coverage

**Question:** Does the skill introduce new `tools/<name>/` scripts?
If yes, add:

```
Bash(~/git/defra/trade-imports-workspace/tools/<name>/*)
Bash(~/git/defra/trade-imports-workspace/tools/<name>/*:*)
```

to `.claude/settings.json`. CREATE mode generates the entries as
part of scaffolding; AUDIT mode checks for missing entries.

## Pattern 9 (companion): Prose hygiene

The 8-pattern checklist focuses on shape. A ninth axis — prose
hygiene — runs orthogonally: even a correctly-shaped skill can carry
residue. AUDIT mode evaluates it but the deliverable is a **proposed
trim diff** (per-file deletions / collapses with line refs and short
rationale), not in-place edits. Trims land via a separate
implementation pass after the user reviews.

Trim categories to scan for:

- Historical / migration residue ("previously ...", "migrated
  from ...", "used to live at ..."). Commit log owns the rationale.
- Workspace-wide content duplicated per skill — collapse to a one-
  line reference to `docs/agent-skills.md`.
- Hygiene pointer placement: workers spawned as `general-purpose`
  subagents need the one-line pointer to `docs/agent-skills.md`
  (never a re-inlined full block); parent-loaded references inherit
  `SKILL.md`.
- Over-defensive bullets making the same point.
- Verbose rationale ("why" beyond a single phrase) — belongs in
  commits / audit plans, not skill prose.
- Stale references to scripts, paths, helpers that no longer exist.
- Forward-looking notes that aren't actionable.
- Repeated examples — pick one canonical location.

**Don't cut:** anti-pattern guardrails, worker spawn-prompt
templates, per-step instructions, decision rationale that informs
edge cases, cross-skill handoff prose, concrete file/line
citations.

**A lean skill has a narrow scope, not short prose.** When a skill is
"too fat", split what it does (one element or one increment, then
stop), never the detail of how it does it. Never trim instructions to
hit a line count.

## Judging a skill, workflow or tool design

- **Judge options on how well they run, every time they run:** output
  quality, correctness, report quality, Claude and Codex parity, and
  whether the run stays inside the guard rails. Tooling is built once
  and run many times.
- **Never weigh build cost.** No "fewest changes", "smallest diff",
  "reuse", "cheapest" or "least work" angle for a designer, and no such
  dimension for a judge. "Take the best of what we have" means reuse
  proven ideas, not minimise the diff. Cutting a fixed cost paid on
  every run is a fair criterion; implementation effort is not.
- **Do not shrink the output to fit a channel.** A platform limit, such
  as the Artifact size ceiling, is a fact about one channel: pick a
  channel that carries the best output.
- **No gold-plating.** Scope is what was asked. A mechanism earns its
  place only against a failure that has happened, or one the requested
  behaviour cannot work without. Bad: a tooling programme that gave
  every critic's imagined risk its own mechanism and grew to a 468 KB
  design. Good: a few CLI commands and prompt files that meet the ask.
- **Rails before features in a new sub-project.** Phase 0 of a new CLI,
  package or repo folder is its agent rails: `CLAUDE.md` (tests first,
  behavioural tests, library-first integrations, plain English for user
  text, the best-practices it inherits), `.claude/settings.json` with
  its hooks, and `.claude/skills/` where repeated tasks are already
  clear. Feature code starts in phase 1. `tim/` is the model.

## Cross-cutting conventions

- **Path conventions** — literal
  `~/git/defra/trade-imports-workspace/...` in LLM-typed
  prose. No env vars. See
  [`docs/agent-skills.md`](../../agent-skills.md).
- **Worker fan-out** — `subagent_type: general-purpose` with a
  `Follow the instructions in ~/git/.../references/<NAME>.md.`
  prompt. Not custom subagent types (they trigger the no-write
  guardrail). Every spawn prompt carries the three items in §5.
- **Rendered markdown from JSON** — when state is JSON, the
  markdown view (e.g. `## Items` table) is generated by a
  `render-X.sh` helper. Hand-edits to the markdown are overwritten.
- **Cross-skill conventions** live under
  `docs/best-practices/...` — single source of truth for things
  multiple skills cite.

### Source: `docs/best-practices/skills/anti-patterns.md`

# Workspace skill anti-patterns

Known mis-applications of the [8-pattern checklist](patterns.md).
This list grows: when a new audit pass surfaces a fresh trap, add it
here. Skills (especially `skill-creator`) read this doc at session
start so the checklist stays current without code changes.

Each entry: the anti-pattern, the symptom that catches it, and the
correction.

## A1. WALKER applied to single-artifact flows

**Symptom:** the skill produces ONE artifact (a plan, a verdict, a
draft) but ships a `WALKER.md` reference + walker keystroke prose
("F / W / D").

**Why it's wrong:** a walker is N-item triage. A single artifact
gets natural-language approval, not a keystroke loop.

**Correction:** delete the walker reference; replace with a
"Step N: iterate with user" prose section.

## A2. JSON canonical state where prose is the natural fit

**Symptom:** a single narrative document (refinement verdict, plan,
draft) has a JSON sidecar and a `render-X.sh` helper.

**Why it's wrong:** nothing queries the JSON. The render layer
exists to prevent hand-edits that wouldn't have happened anyway.

**Correction:** make the markdown canonical. Delete the JSON shape
and render helper.

## A3. Multi-helper toolchain for single-mutation state

**Symptom:** state with one mutation point ships with
`add-X.sh` + `mark-X.sh` + `set-status-X.sh` + `set-Y.sh`.

**Why it's wrong:** the surface area exceeds the workflow. The
helper count signals state complexity; mismatched count signals
over-engineering.

**Correction:** collapse to one mutation helper (or none — let the
LLM edit the artifact directly if there is no contract to enforce).

## A4. FRESH / REFRESH dispatcher where re-running fresh is the same thing

**Symptom:** `start-<skill>.sh` branches FRESH vs REFRESH based on
workspace state, but the REFRESH branch does the same work as
FRESH minus a couple of guards.

**Why it's wrong:** the dual-state adds branches, schemas, and
docs without earning idempotency the user actually feels. Often
"FRESH" already merges into prior state idempotently — REFRESH is
the same code path.

**Correction:** drop the mode branching. Make every invocation
fresh; have consumers idempotently merge into prior state.

## A5. Parallel general-purpose fan-out for judgment-heavy work

**Symptom:** the skill spawns N `general-purpose` Task subagents
for work where each worker needs the full ticket context to make a
good call (architectural reviews, ambiguous prioritisation calls).

**Why it's wrong:** fan-out is best when each worker has a tight
deliverable from a local context (one file, one package). Spreading
judgment across N subagents loses the cross-cutting view.

**Correction:** keep the work in the parent session, one item at a
time, or use a walker if the user is making the calls.

## A6. Render helper for artifacts the LLM writes directly

**Symptom:** `render-X.sh` exists but nothing else writes the
JSON — the LLM writes the markdown, the render helper rewrites it
from a JSON the LLM also writes.

**Why it's wrong:** the render layer should compile JSON the
helpers mutate (atomic, contract-checked) into a read-only markdown
view. If the LLM is the only writer, there is no JSON contract to
protect.

**Correction:** delete the render helper; the markdown is
canonical.

## A7. Pre-bake helpers for context the workflow reads once

**Symptom:** `prebake-context.sh` populates a workarea file the
workflow opens exactly once, in the same session as the prebake.

**Why it's wrong:** the pre-bake adds a script + a workarea path +
a step; the saving is one re-fetch the parent could just do inline.

**Correction:** inline the fetch in the step that consumes it.
Keep pre-bake only when fan-out workers each re-read it, or when
the data is expensive (network, computed) AND read >1 times.

## A8. Hardcoded sub-command chains in script prose

**Symptom:** SKILL.md or a helper script tells the LLM to run
`mvn clean test && mvn clean verify` (or any chain where one
command subsumes the other).

**Why it's wrong:** breaks Bash call hygiene (`&&` chain) AND the
two-command sequence is wrong — `mvn verify` runs `test` already.

**Correction:** one command per Bash call AND check the build tool
semantics — usually one phase subsumes another.

## A9. Custom subagent_type for fan-out

**Symptom:** a `references/<NAME>.md` worker is spawned with
`subagent_type: <custom-name>`.

**Why it's wrong:** custom subagent types receive the no-write
guardrail; workers can't `Write`/`Edit` the per-file artifacts
downstream scripts consume.

**Correction:** always `subagent_type: general-purpose` for
workspace workers. Use the persona path in the prompt.

## A10. Env vars in LLM-typed Bash

**Symptom:** SKILL.md or persona prose typed
`$TRADE_IMPORTS_WORKSPACE/tools/...` or
`$HOME/git/defra/...`.

**Why it's wrong:** Claude Code's "Contains simple_expansion" check
trips on `$VAR` in LLM-typed commands even when the var is
allowlisted ([GH#51001](https://github.com/anthropics/claude-code/issues/51001)).

**Correction:** literal `~/git/defra/trade-imports-workspace/...`
paths. `~` expands transparently and doesn't trip the check.

## A11. Cross-skill handoff claimed on one side only

**Symptom:** a skill's description or "When to use" says another
skill "follows this recipe" or "invokes this skill", and a search of
the named skill finds no mention.

**Why it's wrong:** the description is what routes a request. A
reader, or the model, trusts the handoff and the other skill never
makes it.

**Correction:** land the pointer in the other skill in the same
change, or word the claim as an instruction to the user ("point its
plan at these steps").

## A12. Reference implementation cited on an unmerged branch

**Symptom:** a reference tells the reader to "read these classes
before writing anything" and the classes are not on the cited repo's
`main`.

**Why it's wrong:** a run started from a clean checkout finds nothing
at the cited path and either stalls or invents the shape.

**Correction:** name the branch beside the citation until it merges,
or wait for the merge before the skill lands.
