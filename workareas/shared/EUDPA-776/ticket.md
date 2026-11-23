# EUDPA-776: Remove the contact address page from the live animals journey

## Metadata
- **Type:** Story
- **Status:** Deskcheck
- **Priority:** Medium
- **Labels:** 
- **Parent:** EUDPA-107
- **Assignee:** TarunKumar Palisetty

## Description

<p><b>As</b> someone raising a live animals import notification,<br/>
<b>I want</b> to stop being asked for a contact address for the consignment,<br/>
<b>So that</b> I only answer what the service needs while its policy is settled</p>

<p><b>Description</b><br/>
We need to remove the "Contact address for consignment" page from the live animals journey.</p>

<p>The Live Animals UCD stand-up agreed to remove the page while outstanding policy questions are clarified. If the policy outcome says the page is needed, we will bring it back at the right point in the journey.</p>

<p>The page also lists the whole address book with no paging. A large address book makes the page slow, which makes the tests that pass through it slow and sometimes fail.</p>

<p>Today the page is optional. It ends the opening sequence before check your answers. It also appears as a row on Overview and on check your answers. The chosen address is saved on the notification as the <tt>consignment</tt> party. Since 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-615" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-615" class="jira-issue-macro-key issue-link"  title="Publish PIMS schema v0.3.0 and send the fields PIMS still needs" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-615
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 it is sent to PIMS as <tt>exchangedDocument.issuer</tt>.</p>

<p>Remove the page, its <tt>contactAddress</tt> obligation and the <tt>consignment</tt> party. With no contact address, nothing fills <tt>issuer</tt>, so drop it from our internal GBN-AG event schema. Publish PIMS schema v0.4.0 without <tt>issuer</tt>, and have the gateway send v0.4.0 alongside the earlier versions.</p>

<p><b>Scope</b></p>
<ul>
	<li>In: the animals frontend journey, the branch address in the address book, the <tt>consignment</tt> party in the frontend and backend, <tt>issuer</tt> in the backend, the gateway and the internal GBN-AG schema, PIMS schema v0.4.0, the PIMS mapping docs, the Data Fields v4 Confluence page, the openspec live-animals specs and the ins-tests animals specs.</li>
	<li>Out: bringing the page back if policy needs it. That would be a new ticket, restoring the page from git history and adding <tt>issuer</tt> back. The plants journey's contact page. Existing drafts with a <tt>consignment</tt> party need no migration: the service is not live, so they can be deleted.</li>
</ul>


<p><ins><b>Acceptance Criteria</b></ins></p>
<ul>
	<li>The live animals journey has no contact address page. The opening sequence goes from the page before it straight to check your answers.</li>
	<li>Overview and check your answers show no contact address row.</li>
	<li>The old contact address URL no longer serves the page.</li>
	<li>A new live animals notification saves no <tt>consignment</tt> party, and live animals has no <tt>contactAddress</tt> obligation.</li>
	<li><tt>gbn-ag-v1.schema.json</tt> and <tt>gbn-ag-data-dictionary.md</tt> have no <tt>exchangedDocument.issuer</tt>.</li>
	<li>The GBN-AG event for a submitted notification has no <tt>issuer</tt>.</li>
	<li>PIMS schema v0.4.0 is published in <tt>trade-imports-schemas</tt> with no <tt>exchangedDocument.issuer</tt>, and a <tt>gbn-ag-pims-v0.4.0-changes.md</tt> says why.</li>
	<li>The gateway sends PIMS v0.4.0 messages alongside the earlier versions, and no PIMS message it sends carries <tt>issuer</tt>.</li>
	<li><tt>pims-data-mapping.md</tt> says <tt>issuer</tt> is not sent from v0.4.0 while the contact address page is out of the journey.</li>
	<li>The address book has no branch address. A branch address is the same as the contact address, so it goes with the contact address page, and the address book no longer offers the consignment contact's add-address controls.</li>
	<li>Update the Data Fields v4 Confluence page to remove contact address so it matches the journey without the page.</li>
	<li>The openspec live-animals specs (contact-address, journey-flow, addresses, check-your-answers, overview) match the journey without the page.</li>
	<li>The ins-tests animals e2e and a11y specs pass against the journey without the page, and <tt>dynamics/notification-data.spec.ts</tt> asserts the event has no <tt>issuer</tt>.</li>
</ul>


<div class="panel" style="background-color: #deebff;border-width: 1px;"><div class="panelContent" style="background-color: #deebff;">
<p><b>Tech Notes</b></p>
<ul>
	<li>Frontend: <tt>features/contact/</tt>, <tt>obligations/sections/misc.js</tt>, the check-your-answers contact-address card and section, the hub copy, the flow fixtures, and <tt>consignment</tt> in <tt>mapper-a/sections/direct-fields.js</tt>.</li>
	<li>Backend: <tt>NotificationBase.consignment</tt> (<tt>ConsignmentParty</tt>) is stored and copied (<tt>NotificationCopyMapper</tt>, <tt>NotificationView</tt>). <tt>outbox/gbnag/ExchangedDocument</tt> builds <tt>issuer</tt> from <tt>TradeParty.from(notification.getConsignment())</tt>. Remove the <tt>issuer</tt> field and <tt>TradeParty.from(ConsignmentParty)</tt>.</li>
	<li>Gateway: remove <tt>issuer</tt> from <tt>notification/outbox/gbnag/ExchangedDocument</tt>, and stop <tt>PimsGbnAgDataMapperV3</tt> mapping it, so v0.3.0 messages leave their optional <tt>issuer</tt> empty. Add a v0.4.0 mapper and publisher next to <tt>PimsEventMapperV3</tt> and <tt>PimsGbnAgDataMapperV3</tt>, as 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-615" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-615" class="jira-issue-macro-key issue-link"  title="Publish PIMS schema v0.3.0 and send the fields PIMS still needs" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-615
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 did for v0.3.0. Keep publishing every earlier version: PIMS still consumes v0.1.0, and we retire a version only once PIMS tell us they support a later one.</li>
	<li>Schemas: in <tt>trade-imports-schemas</tt>, remove <tt>issuer</tt> from <tt>gbn-ag-v1.schema.json</tt> (properties and <tt>exchangedDocument.required</tt>) and from <tt>gbn-ag-data-dictionary.md</tt>. The schema sets no <tt>additionalProperties: false</tt>, and only live animals produces and only the gateway reads <tt>issuer</tt>, so nothing else breaks. Mint <tt>pims/gbn-ag-pims-v0.4.0.schema.json</tt> from v0.3.0 without <tt>issuer</tt>, and add it to the schemas <tt>README.md</tt>. Neither the backend nor the gateway validates events against these schemas at runtime.</li>
	<li>Tests repo: <tt>tests/animals/e2e/pages/contact-address.spec.ts</tt>, <tt>opening-run.spec.ts</tt>, <tt>hub-groups-and-cya-rows.spec.ts</tt>, <tt>dynamics/notification-data.spec.ts</tt>, the persistence spec and the a11y journey specs all touch the page.</li>
	<li>Address book: <tt>trade-imports-ins-frontend</tt> <tt>features/address-book/journey-registry.js</tt> (<tt>CONSIGNMENT_CONTACT_FULFILMENT_ID</tt>, <tt>isConsignmentContact</tt>) and the add page's consignment contact controls, plus the openspec <tt>ins/address-book</tt> spec and its coverage.</li>
	<li>Field lineage: <tt>docs/analysis/gbn-ag-field-lineage.md</tt>, section 4 "Person responsible".</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References


