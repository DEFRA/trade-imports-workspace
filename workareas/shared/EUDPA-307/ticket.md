# EUDPA-307: Emit the full notification lifecycle event catalogue

## Metadata
- **Type:** Task
- **Status:** In Dev
- **Priority:** Medium
- **Labels:** 
- **Parent:** EUDPA-133
- **Assignee:** Ian Griffiths

## Description


<p><b>We need to</b> publish a lifecycle event for every notification state transition, and correct the two we publish against the wrong transition<br/>
<b>So that</b> consumers can rely on the event catalogue the schemas already define</p>

<p><b>Background</b></p>

<p><tt>DEFRA/trade-imports-schemas</tt> defines seven <tt>gbn-ag-event-*</tt> schemas, each pinned to a<br/>
specific state transition. The backend emits two of them, and both are attached to the<br/>
wrong transition.</p>

<p>This is not only an INS concern. The catalogue is the external model — PIMS, IDCOMS and TDS<br/>
consume it — so the gap and the mis-mapping exist independently of the aggregation work.<br/>
<tt>trade-imports-ins-backend</tt> is simply the consumer that makes it visible, because it needs<br/>
created and amendment-cancelled to tell a new notification from an edited one.</p>

<p><b>What the schemas specify, and what the code does</b></p>

<div class='table-wrap'>
<table class='confluenceTable'><tbody>
<tr>
<th class='confluenceTh'> Transition </th>
<th class='confluenceTh'> Schema </th>
<th class='confluenceTh'> Emitted today </th>
</tr>
<tr>
<td class='confluenceTd'> entry → DRAFT </td>
<td class='confluenceTd'> <tt>NotificationCreated</tt> </td>
<td class='confluenceTd'> <b>nothing</b> — <tt>createNotification</tt> bypasses the outbox </td>
</tr>
<tr>
<td class='confluenceTd'> DRAFT → SUBMITTED </td>
<td class='confluenceTd'> <tt>NotificationSubmitted</tt> </td>
<td class='confluenceTd'> <tt>NotificationSubmitted</tt> — correct </td>
</tr>
<tr>
<td class='confluenceTd'> SUBMITTED → AMEND </td>
<td class='confluenceTd'> <tt>NotificationAmendmentRequested</tt> </td>
<td class='confluenceTd'> <b><tt>NotificationSubmissionAmended</tt></b> — wrong event </td>
</tr>
<tr>
<td class='confluenceTd'> AMEND → SUBMITTED (re-submitted) </td>
<td class='confluenceTd'> <tt>NotificationSubmissionAmended</tt> </td>
<td class='confluenceTd'> <b><tt>NotificationSubmitted</tt></b> — wrong event </td>
</tr>
<tr>
<td class='confluenceTd'> AMEND → SUBMITTED (abandoned) </td>
<td class='confluenceTd'> <tt>NotificationAmendmentCancelled</tt> </td>
<td class='confluenceTd'> <b>nothing</b> — <tt>cancelAmendNotification</tt> saves directly </td>
</tr>
<tr>
<td class='confluenceTd'> DRAFT → DELETED </td>
<td class='confluenceTd'> <tt>NotificationDeleted</tt> </td>
<td class='confluenceTd'> <b>nothing</b> — <tt>softDeleteNotification</tt> saves directly </td>
</tr>
<tr>
<td class='confluenceTd'> SUBMITTED/AMEND → DELETED </td>
<td class='confluenceTd'> <tt>NotificationSubmissionDeleted</tt> </td>
<td class='confluenceTd'> <b>nothing</b> </td>
</tr>
</tbody></table>
</div>


<p><b>The two mis-mappings</b></p>

<p><tt>amendNotification</tt> moves SUBMITTED → AMEND — it <b>re-opens</b> a notification for editing.<br/>
It emits <tt>NOTIFICATION_SUBMISSION_AMENDED</tt>. The schema for that event says it fires when<br/>
"an amended notification is re-submitted (AMEND → SUBMITTED)" with <tt>versionId</tt><br/>
incremented. The event that belongs on SUBMITTED → AMEND is<br/>
<tt>NotificationAmendmentRequested</tt>, whose schema describes exactly that transition and<br/>
notes "the document body has not yet been revised, only its workflow state".</p>

<p><tt>submitNotification</tt> handles both DRAFT → SUBMITTED and AMEND → SUBMITTED and emits<br/>
<tt>NOTIFICATION_SUBMITTED</tt> for both. The second case is a re-submission and should emit<br/>
<tt>NotificationSubmissionAmended</tt>.</p>

<p>The net effect for a downstream consumer is that an amendment currently looks like it<br/>
completed at the moment the user opened it for editing, and the actual re-submission looks<br/>
like a first submission.</p>

<p><b>Scope</b></p>
<ul>
	<li><tt>trade-imports-animals-backend</tt> — <tt>OutboxEventType</tt>: add the five missing types</li>
	<li><tt>trade-imports-animals-backend</tt> — emit on create, cancel-amend and delete, which currently bypass the outbox</li>
	<li><tt>trade-imports-animals-backend</tt> — correct the two mis-mapped transitions</li>
	<li><tt>trade-imports-animals-backend</tt> — per-event payloads: the schemas differ on what <tt>data</tt> carries, from identifier-only on <tt>NotificationDeleted</tt> to a full snapshot on the submission events</li>
	<li><tt>trade-imports-animals-backend</tt> — compute <tt>versionId</tt> in the outbox rather than persisting it on <tt>Notification</tt> (see panel below)</li>
</ul>


<p><ins><b>Acceptance Criteria</b></ins></p>
<ul>
	<li>Every transition in the table above emits its schema-specified event, and no other</li>
	<li>Every event type is emitted under <tt>uk.gov.defra.imports.notification.*</tt>, matching the committed schemas — <tt>OutboxEventType</tt> is internally consistent</li>
	<li>Downstream consumers have been told before the change ships — the event-type values they match on are changing, not just being added to</li>
	<li>Each event's <tt>data</tt> validates against that event's schema — the payloads differ per event and are not interchangeable</li>
	<li>Creating a notification emits <tt>NotificationCreated</tt></li>
	<li>Copying a notification emits <tt>NotificationCreated</tt> for the <b>new</b> notification and nothing at all for the source — a copy does not mutate the source, so it produces no event on that aggregate and does not move its <tt>aggregateVersion</tt></li>
	<li>Cancelling an amendment emits <tt>NotificationAmendmentCancelled</tt> carrying the reverted snapshot</li>
	<li>Deleting distinguishes <tt>NotificationDeleted</tt> (from DRAFT) from <tt>NotificationSubmissionDeleted</tt> (from SUBMITTED or AMEND)</li>
	<li>Re-submitting an amended notification emits <tt>NotificationSubmissionAmended</tt>, and opening one for amendment emits <tt>NotificationAmendmentRequested</tt></li>
	<li>All events continue to share one <tt>aggregateVersion</tt> sequence per notification, with no gaps or reuse</li>
	<li><tt>versionId</tt> reads 1 on first submission and increments only on re-submission — it does not move when an amendment is opened or cancelled, or when a notification is deleted, and it is independent of <tt>aggregateVersion</tt></li>
	<li><tt>versionId</tt> is computed in the outbox as the event is assembled, by counting the submission events on the aggregate — no counter is persisted on <tt>Notification</tt></li>
	<li>Re-publishing a stored outbox event reproduces the same <tt>versionId</tt> it was written with, however many submissions have happened since</li>
	<li>Events reach external consumers through the gateway exactly as the two current ones do</li>
</ul>


<div class="panel" style="background-color: #e3fcef;border-width: 1px;"><div class="panelContent" style="background-color: #e3fcef;">
<p><b><tt>versionId</tt> — decided: keep it, compute it in the outbox</b></p>

<p><tt>versionId</tt> tracks how many times the notification has been submitted. It is a document<br/>
revision number carried inside the payload at <tt>data.exchangedDocument.versionId</tt> — the<br/>
<tt>submission-amended</tt> sample carries <tt>"versionId": 2</tt> alongside<br/>
<tt>"notificationStatusCode": "SUBMITTED"</tt>. The core schema defines it<br/>
(<a href="https://github.com/DEFRA/trade-imports-schemas/blob/8b75e950956b2a052f72043f7543065ba91de931/schemas/core/defra-unvtd-canonical-core-v1.schema.json#L641-L645" class="external-link" rel="nofollow noreferrer">permalink</a>):</p>

<blockquote><p>Document revision number. V1 on first submission, increments on each subsequent<br/>
re-submission. Distinct from the envelope's <tt>aggregateVersion</tt> (event sequence) and the<br/>
schema's structural version.</p></blockquote>

<p><b>Judith on the PIMS team has asked us to leave it in for now</b> —<br/>
<a href="https://defra-digital-team.slack.com/archives/C0B11737H89/p1785238832948799" class="external-link" rel="nofollow noreferrer">Slack thread</a>.<br/>
So it stays in the schemas and we emit it.</p>

<p><b>We compute it in the outbox — nothing is persisted on <tt>Notification</tt>.</b> With the transition<br/>
mapping corrected it falls out of the events already stored:</p>

<blockquote><p>versionId = count of <tt>NotificationSubmitted</tt> + <tt>NotificationSubmissionAmended</tt><br/>
events on that <tt>aggregateId</tt></p></blockquote>

<p>First submission gives 1, first re-submission gives 2, and so on — which is what the schema<br/>
specifies. No new field, no migration, and no second source of truth to drift from the<br/>
outbox.</p>

<p>Two things the implementation has to get right:</p>

<p><b>Count before the write.</b> The count happens as <tt>data</tt> is assembled in<br/>
<tt>OutboxService.appendEvent</tt>, before the row is written — not at publish. Events are<br/>
immutable, so the value has to be baked in. A count run at publish time would report today's<br/>
submission total when replaying a year-old event; computing it before the write means<br/>
republishing a stored row cannot drift. The same rule covers anything else derived — resolve<br/>
it before the row is written, never at publish.</p>

<p><b>Correct the mis-mappings first.</b> The count is only right once the transitions above are<br/>
fixed. Today <tt>NotificationSubmissionAmended</tt> fires on SUBMITTED → AMEND — a notification<br/>
being <b>opened</b> for editing, not submitted — so counting it as things stand would overcount<br/>
every amendment. That ordering sits within this ticket; it is not a separate dependency.</p>

<p>Not to be confused with the two other counters in play. <tt>aggregateVersion</tt> is the<br/>
envelope's event sequence and moves on every outbox row — dozens per notification once<br/>
<tt>NotificationEdited</tt> fires per page save. <tt>metadata.schemaVersion</tt> is structural.<br/>
<tt>versionId</tt> moves only on submission.</p>
</div></div>

<div class="panel" style="background-color: #eae6ff;border-width: 1px;"><div class="panelContent" style="background-color: #eae6ff;">
<p><b>Tech notes</b></p>
<ul>
	<li><tt>NotificationStatus</tt> is <tt>DRAFT, SUBMITTED, AMEND, DELETED</tt> — it maps cleanly onto the transitions the schemas describe, so the state model itself needs no change</li>
	<li><tt>writeWithOutbox</tt> already does the locked write-and-append; the operations that currently bypass it (<tt>createNotification</tt>, <tt>cancelAmendNotification</tt>, <tt>softDeleteNotification</tt>, <tt>copyNotification</tt>) should route through it rather than growing a second path</li>
	<li>Correcting the mis-mappings changes what existing external consumers receive. They need telling before it ships, not after.</li>
	<li><tt>NotificationSubmittedData</tt> is a 13-field projection shared by both current events. Per-event payloads will not all fit it.</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References


