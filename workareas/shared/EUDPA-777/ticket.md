# EUDPA-777: Remove the commodity type from the live animals journey and from what we send on

## Metadata
- **Type:** Story
- **Status:** Deskcheck
- **Priority:** Medium
- **Labels:** 
- **Parent:** EUDPA-328
- **Assignee:** Amir Naveed

## Description

<p><b>As</b> the team building the live animals journey,<br/>
<b>I want</b> the commodity type taken out of the journey and out of what we send on,<br/>
<b>So that</b> nothing reaching PIMS is decided by a hard-coded table no user ever sees or confirms.</p>

<p><b>Description</b><br/>
This ticket was going to serve MDM's commodity types through <tt>trade-imports-reference-data</tt> and ask the trader for one on the commodity page. That is no longer wanted: the live animals journey will not ask for a commodity type.</p>

<p>A commodity type is in the code today, but invisible rather than inert. Checked against <tt>main</tt> in all four repos on 6 November 2026:</p>
<ul>
	<li><b>No page asks it and nothing shows it.</b> There is no type question, no check-your-answers row, and no <tt>.njk</tt> that mentions <tt>commodityType</tt>.</li>
	<li><b>It is stamped on silently.</b> <tt>seedLine</tt> sets <tt>commodityType</tt> from a hard-coded table the moment a commodity and species are picked.</li>
	<li><b>The table covers cattle only.</b> <tt>Bos sp.</tt> becomes Game (24), anything else under cattle Domestic (16), and every other commodity code a single blank type (2). It came from an IPAFFS commodity-categories extract, not from MDM.</li>
	<li><b>It is a mandatory obligation that can never block,</b> because the silent stamp always fills it. That is the other half of why nobody can see it.</li>
	<li><b>It does leave the service.</b> The frontend maps the type's text out as <tt>typeOfCommodity</tt>, the backend carries it, and GBN-AG sends it to PIMS as <tt>TradeLineItem.typeCode</tt>. The blank type is dropped, so in practice only a cattle consignment sends one - "Domestic" or "Game", decided by Latin name and confirmed by nobody.</li>
	<li><b>And the slot it lands in means something else.</b> The GBN-AG contract specifies a trade line's <tt>typeCode</tt> as the commodity's <b>form</b> - <tt>LIVE_ANIMAL</tt>, <tt>SEMEN</tt>, <tt>EMBRYO</tt> or <tt>OVA</tt> - drawn from the Defra <tt>species_type</tt> codelist named by a sibling <tt>urlId</tt>. We send "Domestic" with <tt>urlId</tt> null, so no consumer can resolve it against anything. PIMS has already settled this from the other end: its v0.2.0 and v0.3.0 schemas leave <tt>typeCode</tt> and <tt>urlId</tt> off the trade line item on purpose - "resolved from CN-code reference data downstream rather than sourced from the notification (gap G18)".</li>
</ul>


<p>So the choice is not between asking for the type and not asking. It is between leaving a value no user can see or correct going to PIMS in a slot that means something else, and removing it. This ticket removes it.</p>

<p><b>Recommendation</b><br/>
Take the type out end to end in the journey and the message: the hard-coded table and its readers, the obligation and the line field, the mapper's <tt>typeOfCommodity</tt>, and the backend's <tt>typeCode</tt> population.</p>

<p><tt>trade-imports-schemas</tt> is a <b>documentation</b> change, not a field removal. <tt>typeCode</tt> stays on the GBN-AG trade line item - germinals need it, and the germplasm example sends <tt>EMBRYO</tt> - but the mapping row that says V4's type question populates it is now wrong, and should say what the PIMS schemas already say. No new schema version, no sample changes.</p>

<p><tt>trade-imports-reference-data</tt> needs no change - it never grew a type field, so there is nothing there to undo.</p>

<div class='table-wrap'>
<table class='confluenceTable'><tbody>
<tr>
<th class='confluenceTh'>What needs doing</th>
<th class='confluenceTh'>Where</th>
</tr>
<tr>
<td class='confluenceTd'>Remove <tt>TYPES_BY_CODE</tt>, <tt>typeFor</tt>, <tt>typesFor</tt>, <tt>GAME_SPECIES</tt> and the Domestic/Game/blank constants</td>
<td class='confluenceTd'><tt>trade-imports-animals-frontend</tt></td>
</tr>
<tr>
<td class='confluenceTd'>Remove <tt>typeIdFor</tt>, <tt>typeTextForId</tt>, and <tt>seedLine</tt>'s <tt>commodityType</tt></td>
<td class='confluenceTd'><tt>trade-imports-animals-frontend</tt></td>
</tr>
<tr>
<td class='confluenceTd'>Remove the <tt>commodityType</tt> obligation and its evaluation binding</td>
<td class='confluenceTd'><tt>trade-imports-animals-frontend</tt></td>
</tr>
<tr>
<td class='confluenceTd'>Remove <tt>typeOfCommodity</tt> from the notification mapper, and <tt>typeTextForLine</tt></td>
<td class='confluenceTd'><tt>trade-imports-animals-frontend</tt></td>
</tr>
<tr>
<td class='confluenceTd'>Remove <tt>typeOfCommodity</tt> from <tt>Commodity</tt>/<tt>Species</tt>, and stop populating <tt>typeCode</tt> on the GBN-AG trade line item</td>
<td class='confluenceTd'><tt>trade-imports-animals-backend</tt></td>
</tr>
<tr>
<td class='confluenceTd'>Correct the "Type selection" mapping row, which says V4's type question populates <tt>typeCode</tt></td>
<td class='confluenceTd'><tt>trade-imports-schemas</tt></td>
</tr>
</tbody></table>
</div>


<p><b>Scope</b></p>
<ul>
	<li><tt>trade-imports-animals-frontend</tt> - no type derived, stored or mapped out</li>
	<li><tt>trade-imports-animals-backend</tt> - <tt>typeCode</tt> no longer populated on GBN-AG trade line items</li>
	<li><tt>trade-imports-schemas</tt> - correct the GBN-AG and PIMS documentation so <tt>typeCode</tt> on a trade line item reads as reference-data-resolved from the CN code, not journey-sourced. Keep the field, keep every sample, mint no new version</li>
	<li><tt>trade-imports-ins-tests</tt> - drop <tt>typeOfCommodity</tt> from the animals notification document model, and any spec that reads it</li>
	<li><tt>openspec/</tt> - only if a live animals scenario turns out to mention the type; a check on 6 November 2026 found none</li>
	<li>Out of scope: <tt>trade-imports-reference-data</tt>, which never served types, so there is nothing to remove</li>
	<li>Out of scope: the high-risk plants journey's own type question (
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-690" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-690" class="jira-issue-macro-key issue-link"  title="Design Release 2.1: the Import notification service front door asks &#39;What are you importing?&#39; before a notification is created" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-690
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
), which is a different journey and unaffected</li>
</ul>


<p><ins><b>Acceptance Criteria</b></ins></p>
<ul>
	<li>No commodity type is asked for, derived or stored anywhere in the live animals journey</li>
	<li>A notification built through the journey carries no <tt>typeOfCommodity</tt>, for cattle or for any other commodity</li>
	<li>A GBN-AG message built from that notification carries no <tt>typeCode</tt> on its trade line items</li>
	<li>A notification that already holds a <tt>commodityType</tt> still reads and still submits - the change does not break work in progress</li>
	<li>The hard-coded Domestic/Game table and its tests are deleted, not left unused</li>
	<li><tt>trade-imports-schemas</tt>'s "Type selection" mapping row no longer claims the journey's type question populates <tt>typeCode</tt>, and names what resolves it instead</li>
	<li>The GBN-AG trade line item still accepts a <tt>typeCode</tt> for germinal forms, and the germplasm example still validates</li>
	<li><tt>npm run validate-schemas</tt> and <tt>npm run validate-samples</tt> both pass in <tt>trade-imports-schemas</tt></li>
	<li>PIMS have confirmed, in writing, that a cattle trade line item with no <tt>typeCode</tt> is what they expect - their own schemas already say so, so this is a confirmation rather than an open question</li>
</ul>


<div class="panel" style="background-color: #deebff;border-width: 1px;"><div class="panelContent" style="background-color: #deebff;">
<p><b>Tech Notes</b></p>
<ul>
	<li>The PIMS risk is small and twice evidenced. On the wire, <tt>TradeLineItem</tt> carries no <tt>@JsonInclude(NON_NULL)</tt> and there is no global Jackson inclusion setting, so every non-cattle line already serialises <tt>"typeCode": null</tt> today, and <tt>GbnAgMapperTest</tt> asserts exactly that. On the contract, no PIMS version carries <tt>typeCode</tt> on a trade line item at all: v0.1.0 omits it, and v0.2.0 and v0.3.0 omit it with a description saying so deliberately. Removing the population makes cattle behave like every other commodity, not like something PIMS has never seen.</li>
	<li>None of the PIMS schemas set <tt>additionalProperties: false</tt>, so today's stray "Domestic" is undocumented-but-tolerated rather than invalid. That is why this has gone unnoticed, and why no PIMS version needs minting to stop it - v0.4.0 is not needed, and neither is a <tt>gbn-ag-pims-v0.4.0-changes.md</tt>.</li>
	<li>The eight GBN-AG event schemas under <tt>schemas/profiles/imports/gb/events/</tt> carry the notification snapshot by <tt>$ref</tt> to <tt>gbn-ag-v1.schema.json</tt>, not inline. A change to <tt>gbnAgTradeLineItem</tt> flows through all eight on its own - do not edit them one by one.</li>
	<li><tt>typeCode</tt> is already optional on <tt>gbnAgTradeLineItem</tt> (<tt>required</tt> lists <tt>applicableClassification</tt>, <tt>description</tt>, <tt>scientificName</tt>, <tt>commonName</tt> and <tt>specifiedLineTradeDelivery</tt>), so a sender omitting it stays valid against <tt>gbn-ag-v1</tt>. No <tt>-v2</tt> under the repo's versioning rule, which mints a new file only for a breaking change.</li>
	<li>The schemas work is three documentation edits: the "Type selection" section of <tt>schemas/profiles/imports/gb/pims-data-mapping.md</tt>, whose description still ends "V4 row 8 Type selection populates this"; the <tt>typeCode</tt> row of <tt>schemas/profiles/imports/gb/gbn-ag-data-dictionary.md</tt>; and the <tt>typeCode</tt> description on <tt>gbnAgTradeLineItem</tt> in <tt>schemas/profiles/imports/gb/gbn-ag-v1.schema.json</tt>. The wording to match is already in that schema for the sibling fields - <tt>scientificName</tt> reads "resolved from Defra reference data keyed on the CN code rather than entered by the trader".</li>
	<li><b>Leave every sample alone.</b> The line-item <tt>typeCode</tt> in the samples is <tt>LIVE_ANIMAL</tt> (or <tt>EMBRYO</tt> in the germplasm example) with <tt>urlId</tt> <tt><a href="https://refdata.tbc.defra.gov.uk/species_type" class="external-link" rel="nofollow noreferrer">https://refdata.tbc.defra.gov.uk/species_type</a></tt> - that is the contract working as intended, and the opposite of what we send. Stripping it would be the wrong change. The other <tt>typeCode</tt> matches across that repo are document types, package types and animal-identifier types, none of them this field.</li>
	<li>The repo's <tt>CLAUDE.md</tt> points at a <tt>CHANGELOG.md</tt> that does not exist on <tt>main</tt>, so there is no changelog entry to add. Validation is the whole CI surface: <tt>npm run validate-schemas</tt> and <tt>npm run validate-samples</tt>.</li>
	<li>The frontend sends the type's <b>text</b> ("Domestic"/"Game"), not its id, so nothing downstream depends on the 16/24/2 ids.</li>
	<li>Frontend, all under <tt>src/server/app</tt>: the table at <tt>sets/live-animals/services/commodities/rules.js</tt> (lines 89-111); <tt>typeIdFor</tt>/<tt>typeTextForId</tt> at <tt>sets/live-animals/services/commodities/index.js</tt>; the silent stamp at <tt>sets/live-animals/journeys/linear/features/commodities/search/actions/commit-selection.js</tt>; the obligation at <tt>sets/live-animals/obligations/sections/commodities/lines.js</tt>; the binding at <tt>sets/live-animals/journeys/linear/features/commodities/evaluation.js</tt>; the mapping at <tt>services/persistence/records/notification-mapper/mapper-a/commodity.js</tt> via <tt>shared/lines/type-text-for-line.js</tt>; the read-back at <tt>shared/lines/from-fulfilment.js</tt>.</li>
	<li><tt>mapper-a/commodity.js</tt> also uses the type to decide whether a commodity group's lines share one type - <tt>groupHasUniformType</tt>, which puts the type on the group when they agree and on each species when they do not. That branch goes with the field.</li>
	<li>Frontend fixtures carrying a <tt>commodityType</tt>: <tt>journeys/linear/fixtures/characterisation-corpus.js</tt>, <tt>characterisation-oracles.json</tt> and <tt>flow/fixtures/happy-path.json</tt>.</li>
	<li>Backend: <tt>typeOfCommodity</tt> on <tt>notification/Commodity.java</tt> and <tt>notification/Species.java</tt>, copied in <tt>NotificationCopyMapper</tt>, mapped to GBN-AG <tt>typeCode</tt> in <tt>outbox/gbnag/TradeLineItem.java</tt> (<tt>typeCodeFor</tt>, and the species and complement-total line builders). <tt>typeCodeFor</tt> prefers the species' type over the complement's - that precedence goes with the field.</li>
	<li>Tests repo: <tt>typeOfCommodity</tt> is an optional field on <tt>StoredSpecies</tt> and <tt>StoredCommodityComplement</tt> in <tt>domain/animals/models/db/notification-document.ts</tt>. No animals spec asserts a value for it, so this is a model tidy rather than test rework. The <tt>typeCode</tt> matches elsewhere in that repo are document and animal-identifier type codes, not the commodity type - leave them alone.</li>
	<li>Requirements <tt>req-2130</tt> and <tt>req-2131</tt> of the Design Release 2.1 distillation, and row <tt>inc-029</tt> of the commodities and import reason theme, are withdrawn by this ticket rather than carried out. That theme closes either way.</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (1)

### Amir Naveed (2026-11-09)
*Known limitation: notifications saved before this change*

Notifications saved before this change can still hold a commodity type:
* *Backend:* {{typeOfCommodity}} on the stored commodity (and possibly species). An integration test ({{NotificationIT.putAndSubmit_shouldSucceedAndShedTypeOfCommodity_whenStoredCommodityStillHoldsIt}}) proves such a notification still reads, saves and submits, and that the field is dropped on save and left out of the outbound event.
* *Frontend:* a saved journey's answers can still hold a {{commodityType}} answer and the removed obligation id ({{22071829-…}}). We have not tested that such a draft still loads and submits in the frontend.

Agreed not to cover the frontend case: old notifications are deleted on TTL expiry in dev and tst, so no stale drafts will remain there.

## Confluence References


