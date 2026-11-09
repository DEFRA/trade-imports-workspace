# EUDPA-713: Store and enforce the owning organisation on every live animals notification

## Metadata
- **Type:** Story
- **Status:** In Dev
- **Priority:** Medium
- **Labels:** COMMON-CAP-0.2
- **Parent:** EUDPA-133
- **Assignee:** TarunKumar Palisetty

## Description

<p><b>As</b> a trader acting for an organisation,<br/>
<b>I want</b> to see and change only my organisation's import notifications,<br/>
<b>So that</b> other organisations cannot see or change our consignments and party details</p>

<p><b>Description</b><br/>
Live animals notifications are not scoped to an organisation. Any signed-in user, from any organisation, can list, read and change every notification.</p>

<ul>
	<li><tt>NotificationAggregate</tt> in <tt>trade-imports-animals-backend</tt> stores no organisation ID.</li>
	<li><tt>GET /notifications</tt> filters by status only. The single-notification endpoints look up by reference number only.</li>
	<li>The frontend does not send the organisation ID to the backend on list or read calls. It uses it only to resolve party names against the address book.</li>
	<li>The organisation ID reaches the backend only on the actor of a write, and is kept on the outbox event for audit. It is never written to the notification.</li>
</ul>


<p>The address book already scopes every record by organisation. It returns 404 when the caller's organisation does not match. Notifications should work the same way.</p>

<p><ins><b>Acceptance Criteria</b></ins></p>

<ul>
	<li>When a trader creates a notification, the backend stores their organisation ID on it as the owner. The value comes from the Defra ID <tt>currentRelationshipId</tt> claim in their session, never from the request body.</li>
	<li>The dashboard list (<tt>GET /notifications</tt>, with or without a reference number) returns only notifications that belong to the caller's organisation.</li>
	<li>Reading, replacing, copying, submitting, amending, cancelling an amendment or soft-deleting another organisation's notification returns 404. The response does not reveal that the notification exists.</li>
	<li>Reading another organisation's notification answers ({{GET /notifications/
{ref}/fulfilments}}) returns 404 from the front end.<br/>
* The backend returns a 403 Forbidden to the frontend, and logs the request.<br/>
* A copy of a notification belongs to the caller's organisation.<br/>
* The backend rejects a trader-facing request that carries no organisation ID, rather than returning every notification.<br/>
* Notifications stored without an organisation ID are deleted. We are not live, so no data needs to be kept.<br/>
* The notification collection has an index on <tt>organisationId</tt> together with <tt>status</tt> and the dashboard sort fields, so the scoped list stays fast.<br/>
* Tests show that a user in organisation A cannot see or change a notification that belongs to organisation B.<br/>
<br/>
<div class="panel" style="background-color: #deebff;border-width: 1px;"></div><br/>
<b>Tech Notes</b><br/>
<br/>
* The organisation ID will eventually come from the session store. For now, the frontend sends it in a header, as the address book does with <tt>Trade-Imports-Organisation-Id</tt>. The backend takes it from that header and never from the request body, including <tt>actor.organisationId</tt>. The frontend reads it through <tt>organisationIdOf(request)</tt>, which already takes it from the verified session only.<br/>
* Live animals has no delegation of authority, so agents never act on behalf of an importer. The owner is always <tt>currentRelationshipId</tt>; ignore <tt>onBehalfOfOrganisationId</tt>. Plants will have delegation, so its equivalent ticket must handle it.<br/>
* Add <tt>organisationId</tt> to <tt>NotificationAggregate</tt>. Set it once, on create, and never change it on replace or amend.<br/>
* Filter every repository read by organisation (<tt>findByReferenceNumberAndOrganisationId</tt> and similar), rather than checking after the read.<br/>
* The organisation ID is a free-form string today: a 7-digit number in the Defra ID stub, <tt>stub-org-1</tt> in the frontend's stub sign-in, and a UUID in one test helper. Do not validate its format.<br/>
* Out of scope: <tt>GET /notifications/reference-numbers</tt>, {{/{ref}
<p>/outbox-events}}, {{/</p>
{ref}
<p>/replay}} and bulk <tt>DELETE /notifications</tt>. The admin app uses these, and they stay unscoped.</p>
<div class="panel" style="border-width: 1px;"></div></li>
</ul>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References


