# EUDPA-306: Unified dashboard showing notifications across journeys

## Metadata
- **Type:** Story
- **Status:** In Dev
- **Priority:** Medium
- **Labels:** COMMON-CAP-0.3
- **Parent:** EUDPA-68
- **Assignee:** Hamid Jemei

## Description

<p><b>As a</b> Trader<br/>
<b>I want</b> to see import notifications from every journey in one place<br/>
<b>So that</b> I do not have to visit a separate dashboard for each type of import</p>

<p><b>Background</b></p>

<p>This is the strategic dashboard <a href="https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6553406071" class="external-link" rel="nofollow noreferrer">ADR-EUDP-006</a><br/>
exists to enable. It reads the aggregated store built by 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-305" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-305" class="jira-issue-macro-key issue-link"  title="Stand up trade-imports-ins-backend and aggregate internal and external events" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-305
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 rather than calling<br/>
each journey, so adding a journey later costs nothing here.</p>

<p>It lives in <tt>trade-imports-ins-frontend</tt>, the shared INS shell stood up by 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-287" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-287" class="jira-issue-macro-key issue-link"  title="Adding a new address via address book" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-287
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
.<br/>
INS does not absorb the journey frontends - <tt>trade-imports-animals-frontend</tt> stays as it<br/>
is, and the dashboard routes traders into it.</p>

<p><b>This supersedes EUDPA-73</b></p>

<p>
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-73" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-73" class="jira-issue-macro-key issue-link"  title="Skeleton: Search a notification " >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-73
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 ("Skeleton: Search a notification") says of itself: "a tactical solution and will<br/>
be replaced by the strategic unified dashboard in a future release". This is that release.<br/>
Its two AC are carried over verbatim below so nothing is lost in the swap, and so the<br/>
existing E2E tests have an equivalent to point at.</p>

<p>Full search and filtering is not in scope. Reference-number lookup is, because the E2E<br/>
suite needs a deterministic way to find a known notification.</p>

<div class="panel" style="background-color: #fffae6;border-width: 1px;"><div class="panelContent" style="background-color: #fffae6;">
<p><b>The list is not scoped to an organisation - that comes later</b></p>

<p>A notification does not carry an organisation today; <tt>organisationId</tt> is not persisted on<br/>
it. So there is nothing to filter on, and this dashboard lists every notification in the<br/>
aggregated store.</p>

<p>Scoping is deliberately left to a separate ticket, which needs to persist<br/>
<tt>organisationId</tt> on the notification, carry it through the events, and only then filter<br/>
here. None of that is in this ticket.</p>

<p><b>This dashboard must not reach real users until that lands</b> - unscoped, it would show every<br/>
trader every other trader's consignments. Fine while pre-live, not fine after.</p>
</div></div>

<p><b>Scope</b></p>

<ul>
	<li><tt>trade-imports-ins-backend</tt> - query endpoint over the aggregated store: list, sort, paginate, look up by reference number</li>
	<li><tt>trade-imports-ins-frontend</tt> - dashboard page, results list, empty states, deep links</li>
</ul>


<p><b>Out of scope</b></p>

<ul>
	<li>Scoping the list to the signed-in user's organisation - separate ticket, blocked on <tt>organisationId</tt> being persisted on a notification</li>
</ul>


<p><ins><b>Acceptance Criteria</b></ins></p>

<p><b>AC1 - See notifications on the dashboard</b></p>

<p><b>Given</b> I have signed in<br/>
<b>When</b> I open the dashboard<br/>
<b>Then</b> I should see the notifications held in the aggregated store<br/>
<b>And</b> each row should show enough to identify the consignment - reference number, status, origin country, commodity and arrival date</p>

<p><b>AC2 - Notifications appear regardless of journey</b></p>

<p><b>Given</b> notifications exist from more than one import journey<br/>
<b>Then</b> all of them should appear in the same list<br/>
<b>And</b> the list should not need changing when a new journey starts publishing</p>

<p><b>AC3 - Open a notification</b></p>

<p><b>When</b> I select a notification<br/>
<b>Then</b> I should be taken to that notification in the journey frontend that owns it</p>

<p><b>AC4 - Search by complete notification reference</b> (carried from 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-73" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-73" class="jira-issue-macro-key issue-link"  title="Skeleton: Search a notification " >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-73
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
)</p>

<p><b>Given</b> I am on the dashboard<br/>
<b>And</b> a notification exists with a GBN-AGN reference<br/>
<b>When</b> I enter the complete GBN-AGN reference into the keyword or reference search field<br/>
<b>Then</b> I should see only the matching notification in the results</p>

<p><b>AC5 - No matching notification found</b> (carried from 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-73" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-73" class="jira-issue-macro-key issue-link"  title="Skeleton: Search a notification " >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-73
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
)</p>

<p><b>Given</b> I am on the dashboard<br/>
<b>When</b> I enter a value into the keyword or reference search field<br/>
<b>And</b> no notification matches<br/>
<b>Then</b> I should see the message "No notifications found"<br/>
<b>And</b> no notifications should be displayed in the results list</p>

<p><b>AC6 - Nothing to show yet</b></p>

<p><b>Given</b> there are no notifications in the aggregated store<br/>
<b>Then</b> I should see an empty state that lets me start a new one, rather than a blank list</p>

<p><b>AC7 - Recent edits are reflected</b></p>

<p><b>Given</b> I edit a notification in a journey frontend<br/>
<b>When</b> I return to the dashboard<br/>
<b>Then</b> the change should be reflected without me needing to do anything other than reloading the page</p>

<div class="panel" style="background-color: #eae6ff;border-width: 1px;"><div class="panelContent" style="background-color: #eae6ff;">
<p><b>Tech notes</b></p>

<ul>
	<li>
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-287" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-287" class="jira-issue-macro-key issue-link"  title="Adding a new address via address book" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-287
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 AC2 already exposes the signed-in user's organisation on the session, so the frontend half of scoping exists. What is missing is an <tt>organisationId</tt> on the notification to match it against - which is why scoping is a separate ticket rather than a line of code here.</li>
	<li>Do not work around that by inferring ownership from anything else on the notification. A wrong answer here shows one trader another's consignments.</li>
	<li>Sorting and pagination already have a house pattern in the skeleton dashboard (
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-188" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-188" class="jira-issue-macro-key issue-link"  title="Skeleton | Dashboard sorting" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-188
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
, 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-189" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-189" class="jira-issue-macro-key issue-link"  title="Skeleton | Dashboard pagination" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-189
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
) - follow it rather than inventing a second one</li>
	<li>AC7 is eventual, not transactional. Worth agreeing what lag is acceptable and whether the page needs to say anything when it is stale.</li>
	<li>Reference lookup is exact-match, not fuzzy - cheap over the aggregated store and deterministic for E2E</li>
	<li>GDS: this is a list of case-like records, so the usual pattern work applies. See <tt>docs/best-practices/gds/</tt>.</li>
</ul>
</div></div>

<div class="panel" style="background-color: #fffae6;border-width: 1px;"><div class="panelContent" style="background-color: #fffae6;">
<p><b>Open questions</b></p>

<ul>
	<li>Does 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-73" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-73" class="jira-issue-macro-key issue-link"  title="Skeleton: Search a notification " >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-73
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 get closed when this ships, or does the skeleton dashboard stay alive alongside INS for a period? That decides whether the two need to agree on behaviour in the interim.</li>
	<li>Deep-linking into <tt>trade-imports-animals-frontend</tt> assumes a stable per-notification URL. Worth confirming one exists and is safe to link to from another service.</li>
	<li>
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-73" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-73" class="jira-issue-macro-key issue-link"  title="Skeleton: Search a notification " >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-73
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 carries the shorter <tt>CAP-0.3</tt> label for the same capability. This ticket uses the map's canonical <tt>COMMON-CAP-0.3</tt> - worth correcting 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-73" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-73" class="jira-issue-macro-key issue-link"  title="Skeleton: Search a notification " >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-73
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 so the two match.</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References

### ADR-EUDP-006: Import Notification Service Data Aggregation

=== Page 6553406071 ===
Title: ADR-EUDP-006: Import Notification Service Data Aggregation
Space: EUDP
Version: 6 (Updated: 2026-07-30T13:03:08.508Z)
Updated by: Ben Letton
URL: https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6553406071

=== Labels ===
generated

=== Body (HTML) ===
<div class="confluence-information-macro confluence-information-macro-note conf-macro output-block" data-hasbody="true" data-macro-name="note" data-macro-id="77a897fc-c7a0-4432-9991-7b3ad67bc386"><span class="aui-icon aui-icon-small aui-iconfont-warning confluence-information-macro-icon"> </span><div class="confluence-information-macro-body"><p>This page was automatically generated from <a href="https://github.com/DEFRA/trade-imports-documentation/blob/main/docs/systems/EUDP/Architecture%20and%20Development/ADR/ADR-EUDP-006-ins-aggregation.md" class="external-link" rel="nofollow">source on GitHub</a>. Do not edit directly as your edits may be overwritten.</p><p>Inline comments will be lost on update, please consider using page comments instead.</p></div></div><div class="toc-macro client-side-toc-macro  conf-macro output-block" data-cssliststyle="default" data-headerelements="H1,H2,H3" data-hasbody="false" data-macro-name="toc" data-macro-id="5c9478d9-0ce9-4341-b52b-079a7b4267b1"> </div><h1 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-ADR-EUDP-006:ImportNotificationServiceDataAggregation">ADR-EUDP-006: Import Notification Service Data Aggregation</h1><div class="table-wrap"><table data-layout="default" class="confluenceTable"><tbody><tr><th class="confluenceTh"><p>Status</p></th><th class="confluenceTh"><p>Proposed</p></th></tr><tr><td class="confluenceTd"><p>Date</p></td><td class="confluenceTd"><p>15 July 2026</p></td></tr><tr><td class="confluenceTd"><p>Proposed By</p></td><td class="confluenceTd"><p>Ben Letton</p></td></tr><tr><td class="confluenceTd"><p>Agreed On</p></td><td class="confluenceTd"><p>TBC</p></td></tr><tr><td class="confluenceTd"><p>Agreed By</p></td><td class="confluenceTd"><p>TBC</p></td></tr><tr><td class="confluenceTd"><p>Decision</p></td><td class="confluenceTd"><p>TBC</p></td></tr></tbody></table></div><h2 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-RelatedDocuments">Related Documents</h2><ul><li><p><a href="/wiki/spaces/EUDP/pages/6468470808/ADR-EUDP-001+Dynamics+Integration+Pattern+for+CDP+User+Journeys" data-linked-resource-id="6468470808" data-linked-resource-version="58" data-linked-resource-type="page">ADR-EUDP-001 Dynamics Integration Pattern for CDP User Journeys</a></p></li><li><p><a href="/wiki/spaces/EUDP/pages/6492258959/ADR-EUDP-002+Event+Specification+and+Versioning" data-linked-resource-id="6492258959" data-linked-resource-version="19" data-linked-resource-type="page">ADR-EUDP-002 Outbox Event Specification</a></p></li></ul><h2 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-Context">Context</h2><p>The Import Notification Service (INS) needs an aggregated data store that powers cross-notification search and an operational dashboard. It must reflect the current state of a notification, including in-flight changes to key fields such as origin country or commodity code, across several import journeys. Those journeys may be owned and operated by different delivery teams e.g. EU animals, EU plants, and potentially even RoW CHED-A journeys (as described in ADR-EUDP-001).</p><p>Each journey within INS is mandated to publish notification events through a transactional outbox pattern as established in ADR-EUDP-001 and specified in ADR-EUDP-002. The INS aggregation service is one consumer of those events. Its purpose is to maintain a de-normalised, queryable view of all notifications.</p><p>That existing event catalogue is an <strong>external model</strong>: semantically rich, producer-curated business facts e.g. <code>NotificationCreated</code>, <code>NotificationSubmitted</code>, <code>NotificationSubmissionAmended</code>, <code>NotificationSubmissionCancelled</code>. These events convey intended semantics and are designed to cross the INS domain boundary. These events evolve conservatively because they are contracts with independently-evolving consumers.</p><p>The INS aggregated store is an <strong>internal</strong> concern of the INS domain. This ADR decides the <strong>internal model</strong> that maintains the aggregated view: an event stream that is deliberately less concerned with semantics, and is optimised for keeping cross-journey services and data current, and sufficiently decoupled to evolve at pace (because it never leaves the domain).</p><h1 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-AggregationOverview">Aggregation Overview</h1><span class="confluence-embedded-file-wrapper image-center-wrapper"><img class="confluence-embedded-image image-center" loading="lazy" src="https://eaflood.atlassian.net/wiki/download/attachments/6553406071/ins-aggregation-overview.png?version=3&amp;modificationDate=1785416586392&amp;cacheVersion=1&amp;api=v2" data-image-src="https://eaflood.atlassian.net/wiki/download/attachments/6553406071/ins-aggregation-overview.png?version=3&amp;modificationDate=1785416586392&amp;cacheVersion=1&amp;api=v2" data-height="967" data-width="1600" data-unresolved-comment-count="0" data-linked-resource-id="6553732919" data-linked-resource-version="3" data-linked-resource-type="attachment" data-linked-resource-default-alias="ins-aggregation-overview.png" data-base-url="https://eaflood.atlassian.net/wiki" data-linked-resource-content-type="image/png" data-linked-resource-container-id="6553406071" data-linked-resource-container-version="6" data-media-id="728e0e18-4f08-4ed1-af3c-360dbdb30815" data-media-type="file"></span><h2 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-ProblemStatement">Problem Statement</h2><p>How should import journeys publish notification data so that the INS aggregation service can maintain a searchable, current-state view across multiple journeys, while keeping the cost of adding new aggregated features low as the number of journeys and owning teams grows?</p><h2 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-Constraints,Considerations,andArchitecturalDesignGoals">Constraints, Considerations, and Architectural Design Goals</h2><ol start="1"><li><p><strong>Respect the internal versus external model split:</strong> The external model is producer-curated and semantically rich; it crosses the boundary and must be stable and managed at the boundary via versioned schemas.</p></li><li><p><strong>Minimise cross-team coordination:</strong> Journeys <em>may</em> owned by independent teams. Contracts force every journey team to change in lock-step,  throughput is a function of the slowest. Reducing coupling is the dominant driver for separating internal and external events.</p></li><li><p><strong>Current-state aggregation</strong> is the primary use case. The dashboard and search require the latest state of a notifications across journeys.</p></li><li><p><strong>Preserve ordering and idempotency per notification</strong> by using notification <code>aggregateId</code> and <code>aggregateVersion</code> as per ADR-EUDP-002. The aggregation service upserts by notification identity, so duplicate and replayed events converge to the same state.</p></li></ol><h2 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-Options">Options</h2><h3 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-OptionA:Producer-ownedrichevents">Option A: Producer-owned rich events</h3><p>Each journey emits fine-grained, intention-revealing events, for example <code>NotificationArrivalTimeUpdated</code> or <code>NotificationCommodityCodeCorrected</code>. The producer determines the semantics and owns the mapping to named business facts. The aggregation service subscribes to the specific events it needs and acts on each directly. This is the design philosophy behind the <strong>external</strong> events extended to serve the internal aggregated domain. </p><h3 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-OptionB:Consumer-ownedfirehoseevent">Option B: Consumer-owned firehose event</h3><p>Each journey emits a new semantically weak event type, <code>NotificationEdited</code>, carrying the full notification snapshot as a fat event per ADR-EUDP-002. Minimal schema, Consumers responsible for semantic interpretation and how to act upon it.</p><p>Should  a change-triggered feature genuinely need a named event, the aggregation service <em>could</em> perform change detection itself and republish further internal domain event(s) that it owns. </p><p>The <code>NotificationEdited</code> is more like a <code>Change Data Capture</code> (CDC) pattern aka a &quot;firehose&quot; for change. This is the internal change model. The producer-curated lifecycle events continue unchanged as the external model; the journey's outbox carries both, and the boundary filter keeps <code>NotificationEdited</code> inside the domain.</p><h1 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-ComparativeAnalysis">Comparative Analysis</h1><p>Both options consume the same outbox and SNS transport from ADR-EUDP-001. They differ in where the semantics of a change live: in the producer (Option A) or in the consumer (Option B). This is the distributed-versus-centralised trade-off of ADR-EUDP-001 restated at the level of the event schema.</p><h2 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-Cross-TeamCoordinationandEvolvability">Cross-Team Coordination and Evolvability</h2><p>A new field added under additive, weak-schema evolution is immediately usable by the aggregator in Option B, with no producer-side event work. Option A requires a named event for that field in each journey before the aggregator can use it.</p><div class="table-wrap"><table data-layout="default" class="confluenceTable"><tbody><tr><th class="confluenceTh"><p>Dimension</p></th><th class="confluenceTh"><p>Option A: Producer-owned rich events</p></th><th class="confluenceTh"><p>Option B: Consumer-owned firehose</p></th></tr><tr><td class="confluenceTd"><p>Adding a new aggregated feature</p></td><td class="confluenceTd"><p>New event type emitted by every journey</p></td><td class="confluenceTd"><p>Single change in the aggregator</p></td></tr><tr><td class="confluenceTd"><p>Effect of a new payload field</p></td><td class="confluenceTd"><p>New event type per field, per journey</p></td><td class="confluenceTd"><p>Appears in the firehose for free; the aggregator reads it</p></td></tr><tr><td class="confluenceTd"><p>Blocking dependency</p></td><td class="confluenceTd"><p>Blocked on the slowest journey team</p></td><td class="confluenceTd"><p>None on producers</p></td></tr><tr><td class="confluenceTd"><p>Coordination cost as journeys grow</p></td><td class="confluenceTd"><p>Grows with the number of journeys</p></td><td class="confluenceTd"><p>Roughly constant</p></td></tr></tbody></table></div><p><strong>Trade-off</strong></p><ul><li><p>Option A <strong>gains</strong> precise, per-change contracts at the cost of cross-team coordination that grows with the estate. </p></li><li><p>Option B <strong>gains</strong> aggregator autonomy and near-constant coordination cost, at the cost of moving change semantics into the consumer.</p></li></ul><h1 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-ComparativeAnalysis.1">Comparative Analysis</h1><p>For the primary use case, current-state search and dashboard, Option B requires no change detection at all: the aggregator upserts the latest snapshot and serves queries from it. Change detection is incurred only for the subset of features that trigger on a specific change, and even then the aggregator already holds prior state to compare against.</p><h2 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-ConsumerComplexity">Consumer Complexity</h2><div class="table-wrap"><table data-layout="default" class="confluenceTable"><tbody><tr><th class="confluenceTh"><p>Dimension</p></th><th class="confluenceTh"><p>Option A</p></th><th class="confluenceTh"><p>Option B</p></th></tr><tr><td class="confluenceTd"><p>Current-state aggregation</p></td><td class="confluenceTd"><p>Handle many event types</p></td><td class="confluenceTd"><p>Upsert the snapshot, no change detection</p></td></tr><tr><td class="confluenceTd"><p>Change-triggered features</p></td><td class="confluenceTd"><p>Act on the specific event</p></td><td class="confluenceTd"><p>Detect the change by comparison, or read <code>changedFields</code></p></td></tr><tr><td class="confluenceTd"><p>State required in the consumer</p></td><td class="confluenceTd"><p>Per event type</p></td><td class="confluenceTd"><p>The aggregated store it already keeps</p></td></tr></tbody></table></div><p><strong>Trade-off</strong></p><ul><li><p>Option B <strong>concentrates</strong> any change-detection cost in one place and avoids it entirely for the main use case. </p></li><li><p>Option A <strong>avoids</strong> change detection but obliges the consumer to track a growing set of event types.</p></li></ul><h2 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-Summary">Summary</h2><div class="table-wrap"><table data-layout="default" class="confluenceTable"><tbody><tr><th class="confluenceTh"><p>Decision Criterion</p></th><th class="confluenceTh"><p><strong>Option A: Rich (producer)</strong></p></th><th class="confluenceTh"><p><strong>Option B: Firehose (consumer)</strong></p></th></tr><tr><td class="confluenceTd"><p><strong>Cross-Team Coordination and Evolvability</strong></p></td><td class="confluenceTd"><p>Weak</p></td><td class="confluenceTd"><p>Good</p></td></tr><tr><td class="confluenceTd"><p><strong>Consumer Complexity</strong></p></td><td class="confluenceTd"><p>OK</p></td><td class="confluenceTd"><p>Good</p></td></tr></tbody></table></div><p><strong>Score Summary</strong>:</p><ul><li><p><strong>Option A</strong>: 1 OK, 1 Weak</p></li><li><p><strong>Option B</strong>: 2 Good</p></li></ul><p>Option B leads on both criteria. The dominant driver is cross-team coordination: Option A is blocked on the slowest journey team and its cost grows with every journey added, while Option B's stays roughly constant. On consumer complexity, the primary use case needs no change detection at all under Option B, and the aggregator already holds the prior state that the minority of change-triggered features compare against.</p><p><strong>Prefer Option A if</strong> many independent services need to react to specific, intent-bearing changes, so that computing those semantics once at the producer outweighs the cross-team coordination cost.</p><p><strong>Prefer Option B if</strong> the primary consumer is the aggregation service maintaining current state, and keeping journey teams free to evolve without being drawn into the aggregator's roadmap is the dominant concern.</p><h3 id="ADR-EUDP-006:ImportNotificationServiceDataAggregation-Recommendation-OPTIONB">Recommendation - OPTION B</h3><p>Adopt <strong>Option B</strong> as an internal-versus-external split rather than an absolute. The producer-curated lifecycle events stay the external model, crossing the boundary to PIMS, IDCOMS and TDS. <code>NotificationEdited</code> is the internal model, owned by the aggregation use case.</p><p>What decides it is where the coordination cost lands: producer teams keep a contract that changes rarely, and semantic richness is added inside the one team that wants it.</p><p>Each journey's outbox carries both models. Mixing them weakens the outbox contract deliberately, accepted because retries, dead-lettering, replay, ordering and monitoring are then built once and serve both. A separate topic would forgo that for no gain: the boundary filter already keeps internal events inside the domain, and one stream preserves a single <code>aggregateVersion</code> sequence per notification, which is what every consumer orders on.</p><p>The flow below traces one edit from journey to aggregated store. <code>NotificationEdited</code> is not in the Trade Gateway's outbound filter set, so it never leaves the INS domain, and external consumers ordering on <code>aggregateVersion</code> see gaps that ADR-EUDP-002's ordering model already accommodates.</p><span class="confluence-embedded-file-wrapper image-center-wrapper"><img class="confluence-embedded-image image-center" loading="lazy" src="https://eaflood.atlassian.net/wiki/download/attachments/6553406071/ins-aggregation-notification-edited-events.png?version=3&amp;modificationDate=1785416587438&amp;cacheVersion=1&amp;api=v2" data-image-src="https://eaflood.atlassian.net/wiki/download/attachments/6553406071/ins-aggregation-notification-edited-events.png?version=3&amp;modificationDate=1785416587438&amp;cacheVersion=1&amp;api=v2" data-height="912" data-width="1600" data-unresolved-comment-count="0" data-linked-resource-id="6553732925" data-linked-resource-version="3" data-linked-resource-type="attachment" data-linked-resource-default-alias="ins-aggregation-notification-edited-events.png" data-base-url="https://eaflood.atlassian.net/wiki" data-linked-resource-content-type="image/png" data-linked-resource-container-id="6553406071" data-linked-resource-container-version="6" data-media-id="27d1f7e0-9d90-4196-8a85-55867a76855a" data-media-type="file"></span><hr/>


