# EUDPA-368: Map missing frontend notification fields into NotificationAggregate.notification

## Metadata
- **Type:** Task
- **Status:** Deskcheck
- **Priority:** Medium
- **Labels:** 
- **Parent:** EUDPA-142
- **Assignee:** Amir Naveed

## Description


<p><b>We need to</b> wire the notification fields the frontend already collects into<br/>
`NotificationAggregate.notification`, adding backend model fields where none<br/>
exist today.</p>

<p><b>So that</b> data a trader enters on a live-animals notification — region code,<br/>
transit details, transport identification, per-animal identifiers — actually<br/>
reaches the notification record instead of being silently dropped between the<br/>
frontend and the backend.</p>

<p><b>Background</b><br/>
The backend copy from the inbound DTO to `Notification`<br/>
(<tt>NotificationService.setNotificationDetails</tt>) is already a complete 1:1<br/>
pass-through of whatever the frontend sends. Every gap below originates in the<br/>
frontend's outbound payload builder<br/>
(<tt>notification-mapper/mapper-a/</tt>), not in the backend. Full field-by-field<br/>
evidence (<a href="file:line" class="external-link" rel="nofollow noreferrer">file:line</a>) is in<br/>
<a href="https://github.com/DEFRA/trade-imports-workspace/blob/main/docs/analysis/gbn-ag-field-lineage.md" class="external-link" rel="nofollow noreferrer">docs/analysis/gbn-ag-field-lineage.md</a>, section 1.</p>

<p>This is the first of three related tickets closing GBN-AG field-mapping gaps<br/>
end to end (frontend → aggregate → generic GBN-AG → PIMS GBN-AG). Some fields<br/>
this ticket adds to the aggregate are prerequisites for the next ticket in the<br/>
sequence to carry them further.</p>

<p><b>Scope</b></p>
<ul>
	<li><tt>trade-imports-animals-frontend</tt> - wire 4 backend <tt>Transport.java</tt><br/>
  fields the frontend mapper already has a home for but never reads<br/>
  (<tt>notification-mapper/mapper-a/sections/transport.js</tt>): <tt>meansOfTransport</tt>,<br/>
  <tt>transportIdentification</tt>, <tt>transportDocumentReference</tt>,<br/>
  <tt>transitedCountries</tt>.</li>
	<li><tt>trade-imports-animals-backend</tt> + <tt>trade-imports-animals-frontend</tt> - add<br/>
  backend model fields (there is no slot today) and frontend mapper wiring for:<br/>
  <tt>origin.regionOfOriginCode</tt> (the actual region code value — only the<br/>
  boolean <tt>requiresRegionCode</tt> flag currently crosses), <tt>purposeInInternalMarket</tt>,<br/>
  <tt>destinationCountry</tt>, <tt>portOfExit</tt>, <tt>exitDate</tt>, and 5 per-unit animal<br/>
  identifier fields: <tt>animalIdentifierTattoo</tt>, <tt>horseName</tt>,<br/>
  <tt>animalIdentifierIdentificationDetails</tt>, <tt>animalIdentifierDescription</tt>,<br/>
  <tt>permanentAddress</tt>.</li>
	<li><tt>trade-imports-animals-frontend</tt> - fix<br/>
  <tt>species-entry.js</tt> so ear tag and passport map from <b>every</b><br/>
  animal-identifier unit on a species line, not only the first<br/>
  (<tt>line.animalIdentifiers?.<span class="error">&#91;0&#93;</span></tt> today). This is a scalar-to-array<br/>
  structural change, not a field-wiring fix — scope and test it separately<br/>
  from the field additions above.</li>
	<li><tt>trade-imports-animals-frontend</tt> - extend<br/>
  <tt>notification-mapper.test.js</tt>'s gap-documentation fixture to cover<br/>
  <tt>destinationCountry</tt>, <tt>portOfExit</tt> and <tt>exitDate</tt>. Unlike every other<br/>
  gap this ticket fixes, the existing fixture doesn't currently catch these<br/>
  three, so nothing today guards against them silently going missing again.</li>
</ul>


<p><ins><b>Acceptance Criteria</b></ins></p>
<ul>
	<li>Submitting a notification with a region code populates<br/>
  <tt>notification.origin.regionOfOriginCode</tt> with the entered value, not just<br/>
  <tt>requiresRegionCode</tt>.</li>
	<li>Submitting a notification with <tt>reasonForImport = internalMarket</tt> carries<br/>
  <tt>purposeInInternalMarket</tt> through to the aggregate.</li>
	<li>Submitting a notification with <tt>reasonForImport</tt> in {transit,<br/>
  transhipmentOrOnwardTravel} carries <tt>destinationCountry</tt> through.</li>
	<li>Submitting a notification with <tt>reasonForImport</tt> in {transit,<br/>
  temporaryAdmissionHorses} carries <tt>portOfExit</tt> through.</li>
	<li>Submitting a notification with <tt>reasonForImport = temporaryAdmissionHorses</tt><br/>
  carries <tt>exitDate</tt> through.</li>
	<li><tt>meansOfTransport</tt>, <tt>transportIdentification</tt>,<br/>
  <tt>transportDocumentReference</tt> and <tt>transitedCountries</tt> all reach<br/>
  <tt>notification.transport</tt> on submission.</li>
	<li>A species line with more than one animal-identifier unit carries every<br/>
  unit's ear tag and passport through, not just the first.</li>
	<li>Each per-unit identifier field (tattoo, horse name, identification details,<br/>
  description, permanent address) reaches the aggregate when entered.</li>
	<li><tt>notification-mapper.test.js</tt>'s gap fixture explicitly asserts<br/>
  <tt>destinationCountry</tt>, <tt>portOfExit</tt> and <tt>exitDate</tt> as mapped.</li>
</ul>


<div class="panel" style="background-color: #eae6ff;border-width: 1px;"><div class="panelContent" style="background-color: #eae6ff;">
<p><b>Tech notes</b></p>
<ul>
	<li>Full field-by-field evidence (<a href="file:line" class="external-link" rel="nofollow noreferrer">file:line</a>) and gap list:<br/>
  <a href="https://github.com/DEFRA/trade-imports-workspace/blob/main/docs/analysis/gbn-ag-field-lineage.md" class="external-link" rel="nofollow noreferrer">docs/analysis/gbn-ag-field-lineage.md</a>, section 1.</li>
	<li>Out of scope: Weight, Transporter Status and any other field the frontend<br/>
  doesn't collect today. Those need frontend collection work first — a<br/>
  separate future body of work, not this ticket.</li>
	<li>Related tickets (same investigation, next hops in the pipeline): mapping<br/>
  from <tt>NotificationAggregate.notification</tt> into the generic GBN-AG event,<br/>
  and from the generic GBN-AG event into the PIMS-specific event.</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (2)

### Rhys Sharrem (2026-09-02)
Nice job. It's definitely worth flagging any fields PIMS are expecting that aren't in the frontend. Things to check:
- Are they in the design release?
- Are they in the Data Fields page in Confluence: https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6497338582/Live+Animals+Data+Fields+-+V4? I expect not, as otherwise they'd be in the front end but worth checking.

If PIMS are expecting fields that aren't in the design release or the data fields page, then we should flag those up to Monica and Judith and decide what to do.

_This comment was left via Slack._

### Ian Griffiths (2026-09-02)
Checked against the frontend code and the [Live Animals Data Fields - V4|https://eaflood.atlassian.net/wiki/spaces/EUDP/pages/6497338582] page, including its own "Out of Scope Data Elements" table.

*Genuinely missing from the frontend, and not in the V4 page either - new scope, worth flagging to Monica and Judith:*
* *Weight (KG)* (PIMS: {{TradeLineItem}} net/gross weight) - zero references anywhere in the frontend, zero mentions anywhere on the V4 page. Never discussed at all, not even in "Out of Scope".
* *Transporter Status* (Transporter Approval Number does flow correctly today) - absent from both the frontend and the V4 page entirely.
* *Species Family Name / Species Class Name / Species Type Name* (domestic vs game) - absent from both. The PIMS mapping page itself flags these as tentative ("TBC"/"may also be required"), not confirmed. Note "domestic"/"game" wording does appear on the V4 page, but only inside commodity-code list entries (e.g. "Pig (Domestic)", "Game Birds") - may already be derivable from the commodity code the trader picks, the same way scientific/common name are resolved from the CN code rather than typed in.

*Missing from the frontend, but with a documented reason - not a silent gap:*
* *Microchip and Leg Ring* identifier types - PIMS lists 7 animal-identifier types; the frontend implements 6 (Passport, Tattoo, Ear Tag, Horse Name, plus free-text Identification Details/Description as a fallback). Microchip never appears on the V4 page at all. Leg Ring's close cousin, *"Animal Identifier - Wing Ring", was explicitly considered and de-scoped by Monica Rivera on 2026-05-29* (V4 page's own "Out of Scope" table). Not an oversight - PIMS is expecting something design already deliberately cut.

*Missing from the frontend, but is in the design spec - an integration gap, not a missing page:*
* *Person Responsible for Load* (name, phone, email, organisation name/address/phone - PIMS: {{exchangedDocument.issuer}}) - no frontend field anywhere. But it *is* on the V4 page, explicitly marked "Consumed on authentication" / sourced from "gov identity" - by design this should come from the notifier's authenticated Defra ID/organisation record, not a journey page. The real gap is the frontend not threading the authenticated identity's details into the outbound notification payload - worth checking whether that data is even captured at sign-in before treating it as a data-entry gap.

Haven't done a full screen-by-screen check against the design mockups (Figma/design-release corpus) beyond this Confluence spec - can run that separately via the workspace's parity tooling if useful.

## Confluence References


