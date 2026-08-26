# EUDPA-335: Refactor Notification model: extract aggregate + content, drop NotificationBase inheritance

## Metadata
- **Type:** Task
- **Status:** In Dev
- **Priority:** Lowest
- **Labels:** technicalImprovement
- **Parent:** EUDPA-79
- **Assignee:** Paul Hodgson

## Description

<p><b>We need to</b> restructure the <tt>Notification</tt> model in trade-imports-animals-backend so that the aggregate root and the notification content are separate types, held by composition rather than inheritance.</p>

<p><b>So that</b> the Mongo document layout mirrors the domain — aggregate metadata at the root, a <tt>notification</tt> sub-object symmetric to the existing <tt>fulfilments</tt> sub-object — and <tt>submittedBaseline</tt> can share the same type as the live content instead of a parallel snapshot class.</p>

<p><b>Background</b></p>

<p>Today, <tt>uk.gov.defra.trade.imports.animals.notification.Notification</tt> extends <tt>NotificationBase</tt>. The content fields (<tt>commodity</tt>, <tt>origin</tt>, parties, <tt>transport</tt>, etc.) live at the root of both the Java class and the Mongo document, while <tt>fulfilments</tt> sits as a nested sub-object. A parallel class, <tt>NotificationContentSnapshot</tt>, exists solely to capture the amendable content on submit and restore it on cancel-amend.</p>

<p>Structurally this leaves the notification content and the fulfilments asymmetric on the wire and in Mongo, and requires a bespoke snapshot class + mapper to freeze the content shape at submit-time.</p>

<p><b>Scope</b></p>

<ul>
	<li>trade-imports-animals-backend — the whole refactor lives here. Read projections, request DTO, and the fields callers consume from write responses are all preserved by design.</li>
</ul>


<p><b>What changes:</b></p>

<ul>
	<li>Rename <tt>uk.gov.defra.trade.imports.animals.notification.Notification</tt> → <tt>NotificationAggregate</tt>.</li>
	<li>Create a new <tt>Notification</tt> class containing the current content fields from <tt>NotificationBase</tt>: <tt>origin</tt>, <tt>commodity</tt>, <tt>reasonForImport</tt>, <tt>additionalDetails</tt>, <tt>origin/consignor/consignee/importer/destination/consignment</tt> parties, <tt>cphNumber</tt>, <tt>transport</tt>.</li>
	<li><tt>NotificationAggregate</tt> <b>has-a</b> <tt>Notification</tt> (composition), no longer <b>is-a</b> one.</li>
	<li>Aggregate-level fields stay on <tt>NotificationAggregate</tt>: <tt>id</tt>, <tt>referenceNumber</tt>, <tt>status</tt>, <tt>created</tt>, <tt>updated</tt>, <tt>concurrencyToken</tt>, <tt>submittedAt</tt>, <tt>expireAt</tt>, plus the existing <tt>fulfilments</tt> sub-object.</li>
	<li><tt>submittedBaseline</tt> field is retyped as <tt>Notification</tt> (an instance of the new class), symmetric with the live <tt>notification</tt> field.</li>
	<li>Delete <tt>NotificationContentSnapshot</tt> and its dedicated mapper. Replace amend/cancel-amend content-copy logic with a mapper (MapStruct) that copies the new <tt>Notification</tt> into/out of <tt>submittedBaseline</tt>.</li>
	<li><tt>NotificationDto</tt> continues to extend the same fields it inherits today. Whether the DTO also splits along the same seam is left for the implementer to judge based on request-body compatibility; the current inbound wrapper <tt>SaveNotificationDto</tt> nests the notification body under <tt>notification</tt> already.</li>
</ul>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References


