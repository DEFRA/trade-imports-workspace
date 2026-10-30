# EUDPA-617: Integrate early-access MDM commodity API into live animals frontend

## Metadata
- **Type:** Task
- **Status:** Deskcheck
- **Priority:** Medium
- **Labels:** 
- **Parent:** EUDPA-87
- **Assignee:** Amir Naveed

## Description

<p><b>We need to</b> integrate the first, early-access version of the MDM commodity API into the live animals frontend, replacing the current stub.</p>

<p><b>So that</b> we can validate the API against our commodity search needs early, and build the search component in 
    <span class="jira-issue-macro" data-jira-key="EUDPA-616" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-616" class="jira-issue-macro-key issue-link"  title="Add a search type-ahead for choosing commodities, reusable across the journey" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-616
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-current jira-macro-single-issue-export-pdf">In Dev</span>
            </span>
 with the real API contract in mind, so it does not need to change shape when we later adopt the API fully.</p>

<p><b>Background</b><br/>
The frontend currently uses a stub for commodity data. The prototype introduces a commodity search at <a href="https://gb-notification-service-ca0bf4d22c75.herokuapp.com/what-are-you-importing" class="external-link" rel="nofollow noreferrer">what-are-you-importing</a> that we want to bring into the real frontend. MDM (via David Savanyu) confirmed the commodity API is available in TST as a first iteration, based on ITAHC data from Traces. It's early access, intended to help design and build prototype screens and refine requirements. See the <a href="https://defra-digital-team.slack.com/archives/C0BCQQPU6MV/p1783338796200899" class="external-link" rel="nofollow noreferrer">Slack thread</a> for the full message. The API let’s us pick the commodity code and species. </p>

<p>Integration path: live animals frontend → trade-imports-reference-data → MDM. The frontend does not call MDM directly.</p>

<p>Playing this now also validates the API and confirms it meets our needs for search by common name (for example, "cattle"), commodity code (for example, "0102"), or Latin name (for example, "Bos taurus"). Any gaps or issues found should be fed back to the MDM team.</p>

<p><b>Scope</b></p>

<ul>
	<li>trade-imports-animals-frontend - call trade-imports-reference-data for commodity search instead of the stub</li>
	<li>trade-imports-reference-data - proxy commodity search requests through to the MDM commodity API</li>
</ul>


<p><ins><b>Acceptance Criteria</b></ins></p>

<ul>
	<li>Search returns results for a match on common name (for example, "cattle")</li>
	<li>Search returns results for a match on commodity code (for example, "0102")</li>
	<li>Search returns results for a match on Latin name (for example, "Bos taurus")</li>
	<li>Any search behaviour the API does not support (for example, partial matches such as "cat" for "cattle") is documented</li>
	<li>Any gaps or issues found in the API during integration are fed back to the MDM team</li>
	<li>Update the stubs
	<ul>
		<li>The reference data stub itself, for use in docker compose environments</li>
		<li>Any data that’s subbed in the frontend itself, for use in unit tests should match the response from the reference data service</li>
	</ul>
	</li>
</ul>


<div class="panel" style="background-color: #eae6ff;border-width: 1px;"><div class="panelContent" style="background-color: #eae6ff;">
<p><b>Tech notes</b></p>

<ul>
	<li>Swagger: <a href="https://tstmdminfaf1401mdmapi.azurewebsites.net/api/trade/product/api-docs/#/" class="external-link" rel="nofollow noreferrer">https://tstmdminfaf1401mdmapi.azurewebsites.net/api/trade/product/api-docs/#/</a></li>
	<li>Endpoint: <a href="https://tst-internal-gateway.trade.azure.defra.cloud/mdm/trade/product" class="external-link" rel="nofollow noreferrer">https://tst-internal-gateway.trade.azure.defra.cloud/mdm/trade/product</a></li>
	<li>Data Browser UI: <a href="https://tstmdminfaf1401mdmapi.azurewebsites.net/demo/product#tab-search" class="external-link" rel="nofollow noreferrer">https://tstmdminfaf1401mdmapi.azurewebsites.net/demo/product#tab-search</a></li>
	<li>Swagger and Data Browser UI require VPN access (the Microsoft one, not the CDP/AWS one). The endpoint needs the same auth as POE/Countries.</li>
	<li>This is the first MDM commodity API iteration, based on ITAHC data — more types (P, PP) and filtering are coming later.</li>
	<li>Related: 
    <span class="jira-issue-macro" data-jira-key="EUDPA-616" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-616" class="jira-issue-macro-key issue-link"  title="Add a search type-ahead for choosing commodities, reusable across the journey" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-616
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-current jira-macro-single-issue-export-pdf">In Dev</span>
            </span>
 (JS-enabled commodity search component with accessible fallback) — design the API integration so the component doesn't need to change shape when fully adopted.</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (11)

### Amir Naveed (2026-09-23)
*Risk found while planning: commodity codes aren't checked against MDM at submit*

Nothing between the frontend and the outbox event checks MDM data a second time.

* The backend's only check before writing a submit or amend event is that the referenced parties are still in the address book. It has no MDM or reference-data client.
* The dynamics gateway maps the events to PIMS without checking them.
* The frontend only checks answers against MDM-sourced lists while the trader fills in each page. Those lists are cached and aren't loaded again at submit.

So once this ticket is in, a commodity or species picked from the MDM search goes into the submitted notification without being checked again. If MDM withdraws or changes a code after a draft is saved, the draft still submits with the old value, and PIMS gets it.

Countries and ports work the same way today, so this ticket doesn't make things worse.


### Amir Naveed (2026-09-30)
h3. MDM product API review, 30 Sept: not ready for implementation

Ran 46 requests against the MDM product API (TST, {{itahc}} dataset) and compared the results with the design prototype's "What are you importing?" search and later screens. The current plan uses MDM {{/search}} only. The results show that will not reproduce the prototype's page.

h4. What needs deciding before implementation

# *Approach.* Pass each search to MDM {{/search}} (current plan), or build the catalogue in reference-data from {{/commodities}} and {{/commodities/
/species}} and search it ourselves.
# *Rule keys.* Frontend keys its rules by commodity name ("Cow", "Cat"). Those names go away if commodities come from MDM. Proposal, not agreed: key by commodity code, and by MDM species id for the permanent address rule.
# *Commodity names.* Nothing in MDM gives "Cattle" or "Cat". Someone needs to own that list.
# *Fish.* MDM's 030111 has 13 species and none of the prototype's three families.
# *Environments.* Earlier notes say the API is listed for TST and SND only. To recheck.

h4. To follow up with the MDM team

# {{/search}} stops at 25 results. {{page}} and {{size}} are ignored, and {{totalElements}} says 25 even when more match. "cat" does not return cattle; "catt" does.
# The same species comes back once for every code. "cattle" returns Bos taurus 23 times, under codes starting 01, 02, 04 and 05.
# Names are not the ones traders use. 0102 is "Live bovine animals", 01061900 is "Other", and the {{commonName}} for Bos taurus is "aurochs".
# 01061900 is one record with 1,234 species and no sub-groups for cats, dogs and ferrets.
# {{identificationSystems}} has the same 21 values on 0102, 01061900 and 030111.
# Species lists differ from the prototype. 0102 includes two elephants and has no yak, gaur, banteng or musk ox.
# {{/suggest}} does not return what was typed. "cat" suggests rats, and results have no code or id.

h4. To follow up with the design team

# Are the prototype's commodity names and species common names a requirement, and who owns them?
# Is the permanent address rule (cats, dogs, ferrets) by species? MDM lists the dog under two species names.
# Is the prototype's table of identifiers, CPH, unweaned and packages rules the source of truth?
# Which species lists are right: the prototype's or MDM's (0102, 030111, and where elephants sit)?
# The prototype puts Turkey, Duck, Goose and Guinea fowl on 010512 to 010515. MDM holds their species on 01051200 to 01051500.
# Must "cat" show every cattle species, as it does in the prototype by matching the commodity name "Cattle"?

h4. Searches not yet run

* "bovine", "swine", "sheep": does {{/search}} look at commodity descriptions?
* "yak", "gaur", "musk ox", "banteng": does MDM hold them under another code?
* {{/commodities}} for 0201 and the other codes returned for "cattle": MDM's own descriptions for them.

Evidence and detail are in the workspace under {{workareas/ticket-planning/EUDPA-617/}}: {{mdm-follow-ups.md}} (11 items), {{mdm-run-2026-09-30.md}}, {{commodity-usage.md}} and the Postman collection.

### Amir Naveed (2026-10-01)
see slack conversation [https://defra-digital-team.slack.com/archives/C0BCQQPU6MV/p1790848138763949|https://defra-digital-team.slack.com/archives/C0BCQQPU6MV/p1790848138763949|smart-link] 

Following EUDPA-617 - MDM commodity API vs prototype meeting, wait for mdm and ui team sync before playing this ticket further.

moving back in to dev [~accountid:712020:d28dac84-8334-4615-b6fa-8c8cc11b3681] [~accountid:712020:7116afd8-7125-4d89-9524-4ad5a6e736b2] 

### Amir Naveed (2026-10-14)
MDM product API (gbnag dataset, TST): decisions and open questions after the 13 Oct run. MDM is still cleaning up the data, so some items are waiting on that.

*Decisions*

# A line is identified by CN code + Latin name (e.g. {{0102|Bos taurus}}). MDM's id is not stored.
# Rows shown in search results are kept in the session until Continue. On Continue, the ticked rows are saved on the lines. No second call to reference-data.
# Each line saves what we persist and send to PIMS: CN code, Latin name and common name (all on MDM's search rows), and the commodity description (not on search rows; reference-data adds it from /commodities or /commodities/tree). Domestic/Game type comes from our own rule, because gbnag has no coded lists.
# Commodity rules (identifiers, package count, unweaned, CPH, permanent address, Domestic/Game) are keyed by CN code, or code + Latin name where one code covers several animals. They stay in the frontend; only the hard-coded catalogue is removed.
# The permanent-address question is keyed on 01061900 + Latin name (Felis catus, Canis familiaris, Mustela putorius furo), for now.
# The live-animals picker excludes germinals, using isGerminal only (no chapter fallback). Germinals get their own journey (Design Release 2.1).
# Elephants under 0102, missing common names and spelling duplicates are data issues. No workaround; re-check after MDM's upload.
# A Latin-name spelling change by MDM stops our rules matching that species, with no error. The rules must be updated to match.
# We use /search only, not /suggest.

*Proposed*

* Reopening the page rebuilds the selection from the saved lines only, with no MDM call.

*Open questions*

* Design: should each group have a common name (like "Cattle" and "Cat" in the prototype), and should MDM hold it? The commodity name is also sent to PIMS (as description and commonName), so with MDM's tariff text, cats and dogs would go to PIMS as "Other".
* Design: which Latin names under 01061900 get the permanent-address question? Does "Cat" (Felis, the genus) count, as well as "Domestic Cat" (Felis catus)?
* Design / product: if MDM removes or renames a species after a trader has saved it on a notification, what should happen: keep the line, drop it, or ask the trader to choose again?
* MDM: once the data is cleaned up, can the same species still be under more than one live-animal code?
* MDM: when will isGerminal (or the proposed germinal object) be populated?
* MDM: will fish be added to gbnag?


[~accountid:712020:7116afd8-7125-4d89-9524-4ad5a6e736b2] [~accountid:712020:f440cc12-4d45-4ee5-86ca-4a3fd83f06ef] can you please take a look.

### Amir Naveed (2026-10-15)
h3. MDM unavailable: fallback lookup

*Decisions*

# A nightly job in reference-data downloads the full data set from MDM's /commodities/tree?dataset=gbnag and saves it in Mongo. The job also runs at startup if there's no copy yet.
# If the job fails for any reason, the previous data is not lost. We keep one copy, and it's only overwritten by a successful download that passes checks (not empty, every species list complete). A failed run retries later instead of waiting a whole day.
# Live searches use MDM /search. If it returns 503, can't be reached, or times out, reference-data searches the saved copy instead. Other errors (e.g. 400) don't use the fallback.
# The fallback returns matches only, in the same response as a live search (shape, grouping, isGerminal filter), so the frontend can't tell which source answered. A source marker is logged; the trader isn't told.
# One page of up to 100 results for now, live and fallback. The response carries the total number of matches, so paging can be added later (MDM /search supports it).
# If MDM is down and there's no saved copy, reference-data returns 503.
# The commodity description comes from the saved copy, because /search rows don't carry it.
# We log every fallback search and alert if the saved copy is more than a day old.

*Accepted*

* Fallback results can be up to a day old, and our own match may differ slightly from MDM's.

*Open questions*

* Platform: is Mongo provisioned for reference-data in every CDP environment?
* MDM: is there a preferred time for the nightly download?
* Design: if a search has more than 100 matches, should the page offer more results or ask the trader to refine the search?



[~accountid:712020:d28dac84-8334-4615-b6fa-8c8cc11b3681] - started to document fallback idea.

### Monica.Rivera (2026-10-15)
[~accountid:712020:0c52fb84-435f-4d77-b4d0-1bbeca700a1b] Hi, thanks for this. Just one general caveat before answering these questions, [~accountid:5f6b225246a2ed0072f9f474] and I have been working on a spreadsheet as a first draft of the proposed commodity/species mapping. It’s useful for the initial integration and the PIMS devs are also aware of it and the approach we’ve taken. However, we won’t be able to fully validate and confirm the mappings until we have the TRACES production data.

# *Group common name / PIMS:* I don’t think we need an additional common name for each commodity group. The intention is to show the scientific name for individual species and, where several species within the same genus are covered, use *genus + spp.*, which is the approach we followed in the spreadsheet. My assumption at this stage is that the same structure will be followed on PIMS (scientific specie name and genus+spp. FYI: [~accountid:5b6035b4dfe79e2c947cf127] 
# *Permanent address:* For now I’d keep:                                                                                                                                                                   - 010619 + _Felis catus_  + Domestic cat                                                                                                                                                                    -  010619 + _Canis familiaris_ or _Canis Lupus familiaris_ (to verify in Traces) + Domestic dog                                                                                                          - 01061900 +  _Mustela putorius furo +_ Ferret                                                                                                                                                                     We can revisit all of this if the final TRACES Prod data changes the mapping.
# *Species removed/renamed by MDM:* I think we need to distinguish between draft and submitted notifications here and also consider PIMS/reporting implications (very important!).                                                                                                                                                       – If it’s still a draft, my preference would be to ask the notifier to review the selection and choose from the current options before submission, rather changing or removing without validating with the notifier first.                                                                                              - If it’s already been submitted, I’d prefer to keep the value originally submitted (as this will have further implications on PIMS and reporting).

Leaving the other questions for the MDM team: [~accountid:712020:fcbb0838-100d-4a72-9ff4-7596b882e1dd]

cc: [~accountid:712020:7116afd8-7125-4d89-9524-4ad5a6e736b2] [~accountid:557058:8b4443eb-2359-4f00-bc8f-0e91596116c6] 

### Amir Naveed (2026-10-15)
Thanks [~accountid:635ffa757d4645af4f033f9c] that's really helpful.

For species MDM removes or renames, planning to check a draft's species against MDM only when it's submitted. If a species is no longer there, ask the notifier to choose again before it can be submitted. Is checking only at submission OK?

Treat an amendment like a submitted notification: species already submitted keep their original value, and only lines the notifier changes use the current MDM options. Is that OK?

Also, to confirm: for cat and dog you wrote 010619. Do you mean 01061900, the same code as ferret?

### Amir Naveed (2026-10-23)
*Change to decision 3 (14 Oct): what a notification sends as its commodity name, for now*

Decision 3 said each line saves and sends PIMS its CN code, Latin name, common name and commodity description. On 19 Oct we changed how that's done in this ticket:

* Each line saves its CN code, Latin name and common name, all from MDM's search rows.
* The commodity description isn't saved. Search rows don't carry it, so we dropped the extra lookup after search.
* The payload shape is unchanged, so this ticket needs no backend change. {{commodity.name}} now carries the CN code (for example {{0102}}), where it used to carry the catalogue name ("Cow"). Species {{value}} carries the Latin name.

*What this means until EUDPA-669 lands*
* GBN-AG {{TradeLineItem.description}} and {{commonName}} carry the CN code, taken from the first line, on every trade line.
* The INS dashboard and the live-animals dashboard card show the CN code as the commodity.
* The tests, the E2E specs and [gbn-ag-field-lineage.md|https://github.com/DEFRA/trade-imports-workspace/blob/main/docs/analysis/gbn-ag-field-lineage.md] all expect and describe this one value.

*Where the real names come from*
EUDPA-669 gives each commodity on a notification its own name and CN code, and each GBN-AG trade line its own commodity. The species' everyday name (for example "Cattle") and the commodity description go with that work, not this ticket.

### Amir Naveed (2026-10-23)
*Follow-up: the real names need payload changes, which we've handed to EUDPA-669*

Getting the real names to PIMS and the dashboards needs the payload to change, not just this ticket's frontend. Checked on {{main}}:

* *One name per commodity:* the backend stamps the single {{commodity.name}} on every trade line ({{TradeLineItem.linesFrom}}). EUDPA-669's {{commodities[]}} array fixes this.
* *Species everyday name:* backend {{Species}} has only {{value}} and {{text}}, so the {{commonName}} each line stores has nowhere to go.
* *Commodity description:* no line stores it, and the payload has no field for it.
* *ins-backend* builds the dashboard commodity from the commodity name, so it has to follow the new shape.

The gateway already passes the names through to PIMS v0.2.0, so it needs no change.

The details are in a comment on EUDPA-669 for Tarun. This ticket keeps sending the CN code as recorded above.

### Amir Naveed (2026-10-28)
h3. Dev and Docker Compose only: stub species the review refuses

The MDM stub (trade-imports-stub) offers species in its search results for some codes that have no saved species page. In dev or Docker Compose, if you choose one of these and press Continue on the review, the draft is refused with "... can no longer be selected", because the species check gets an empty page from the stub. TST and production call real MDM, so this does not affect them.

*Codes with no saved species page:*

||Code||What it covers||
|0103|Pigs|
|010410|Sheep|
|010420|Goats|
|01051111|Chickens|
|01051200|Turkeys|
|01051300|Ducks|
|01051400|Geese|
|01051500|Guinea fowl|
|01059400|Chickens (another weight band)|
|01059910|Ducks (another weight band)|
|01059920|Geese (another weight band)|
|01059930|Turkeys (another weight band)|
|01059950|Guinea fowl (another weight band)|
|01061410|Rabbits and hares|
|01061490|Rabbits and hares (other)|
|01062000|Reptiles|
|01063100|Birds of prey|
|01063910|Pigeons and doves|
|01064900|Other insects|
|0301|Fish|

*Codes that work end to end in dev:* 0101 (horses), 0102 (cattle), 01061900 (other mammals, including cats, dogs and ferrets), 01063200 (parrots), 01063300 (ostriches), 01063980 (other birds), 01064100 (bees). Every species the ins-tests specs use is in this list.

When testing in dev, choose species from these codes. If one of the missing codes is needed, its species page can be captured from TST and added to the stub.

### Monica.Rivera (2026-10-29)
[~accountid:712020:0c52fb84-435f-4d77-b4d0-1bbeca700a1b] sorry, I missed your previous message, apologies. I leave my replies below but I was thinking in what circumstances would a species be removed or renamed in MDM, would this normally just be a correction of the common name or typoor a change rather than the species itself actually changing? because I don’t think species names change easily nor often.

# For species MDM removes or renames - My concern with checking at submission is that it might be a bit late if changing the species means there’re different questions to answer or fields to complete, I’m thinking about those dynamics questions/fields for example…could we validate the species at any other point in the journey (when the user resumes or continues an existing draft) and then validate again at submission as a final check? 
# Yes, I agree with this in general, my only thought is that if the species has been renamed or removed in MDM, should we let the notifier know when they amend the notification and give them the option to update it if needed? I think so…any changes they make as part of the amendment will be reflected in INS once saved and passed to PIMS, so we wouldn't be losing anything. 
# Yes, exactly, 0106 is the broader category, while 01061900 is the more specific code, so I meant 01061900 for cats, dogs and ferrets too.

Thank you.

## Confluence References


