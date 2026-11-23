# EUDPA-827: Party pickers in animals and plants show every saved address on one page

## Metadata
- **Type:** Bug
- **Status:** In Dev
- **Priority:** Medium
- **Labels:** 
- **Parent:** EUDPA-107
- **Assignee:** Ian Griffiths

## Description

<p>The party pickers in the live animals and high-risk plants journeys no longer page their results. A trader with many saved addresses for a role gets every one of them in one long table. Paging was removed by mistake and needs to come back.</p>

<p>Env: Dev, Test</p>

<p><b>Background:</b> 
    <span class="jira-issue-macro" data-jira-key="EUDPA-805" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-805" class="jira-issue-macro-key issue-link"  title="Design Release 2.1: live animals consignment parties — role-filtered pickers, the same-as shortcuts, the CPH number and the contact address" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-805
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-current jira-macro-single-issue-export-pdf">Deskcheck</span>
            </span>
 (Design Release 2.1, consignment parties) filtered each picker to the addresses saved for its role, and also removed paging (<a href="https://github.com/DEFRA/trade-imports-animals-frontend/pull/486" class="external-link" rel="nofollow noreferrer">animals-frontend #486</a>, <a href="https://github.com/DEFRA/trade-imports-plants-frontend/pull/148" class="external-link" rel="nofollow noreferrer">plants-frontend #148</a>). The requirement came from the Design Release 2.1 prototype, which holds too few addresses to need paging, so "one page" was read as intended. It was not. Role filtering is correct and stays.</p>

<p><b>Steps to reproduce:</b></p>
<ol>
	<li>Sign in as a trader whose organisation has more than 8 addresses saved for one role (for example, consignor).</li>
	<li>Start an animals or plants notification and open that role's picker.</li>
</ol>


<p>Example in Dev: <a href="https://trade-imports-animals-frontend.dev.cdp-int.defra.cloud/live-animals/notifications/GBN-AG-26-344NH3/place-of-origin/select?from=overview" class="external-link" rel="nofollow noreferrer">GBN-AG-26-344NH3 place of origin picker</a></p>

<p><font color="#36b37e"><b>Expected:</b></font> The picker shows the role's addresses 8 to a page, with GOV.UK pagination below the results when there are more than 8.<br/>
<font color="#ff5630"><b>Actual:</b></font> The picker shows every address for the role on one page, with no pagination.</p>

<p><b>Pickers affected:</b></p>
<div class='table-wrap'>
<table class='confluenceTable'><tbody>
<tr>
<th class='confluenceTh'> Service </th>
<th class='confluenceTh'> Pickers </th>
</tr>
<tr>
<td class='confluenceTd'> Live animals </td>
<td class='confluenceTd'> Place of origin, consignor, consignee, importer, place of destination </td>
</tr>
<tr>
<td class='confluenceTd'> High-risk plants </td>
<td class='confluenceTd'> Consignor, place of destination, consignment contact </td>
</tr>
</tbody></table>
</div>


<p><b>Recommendation:</b> Restore paging on top of the role filtering, at 8 addresses a page: GOV.UK pagination shown only when there are more than 8, and the search text and chosen address carried from page to page. 8 matches the design prototype's address book, the INS address book (REQ-INS-ADDR-013) and the transporter list (
    <span class="jira-issue-macro" data-jira-key="EUDPA-824" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-824" class="jira-issue-macro-key issue-link"  title="Split the list on the Transporter details page into pages of 8" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-824
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-complete jira-macro-single-issue-export-pdf">To Do</span>
            </span>
). Before #486 and #148 the pickers paged at 5 (<tt>PAGE_SIZE</tt> in each frontend's <tt>services/address-book/index.js</tt>), which no spec or design recorded. Correct the behaviour spec and the Design Release 2.1 backlog to say the pickers page, so a re-distil does not remove it again.</p>

<p><b>Scope:</b></p>
<ul>
	<li>In: the 8 pickers above, their openspec specs (<tt>live-animals/addresses</tt>, <tt>plants/addresses</tt>, <tt>plants/journey-pages/consignor-select</tt>, <tt>plants/journey-pages/place-of-destination</tt>, <tt>plants/journey-pages/consignment-contact-select</tt>) and the <tt>design-release-2-1</tt> requirement that says one page.</li>
	<li>Out: role filtering, the transporters page (its own ticket), the contact address page (being removed in its own ticket).</li>
</ul>


<p><ins><b>Acceptance Criteria</b></ins><br/>
<b>Given</b> a trader has more than 8 addresses saved for a role<br/>
<b>When</b> the trader opens that role's picker in either journey<br/>
<b>Then</b> the picker shows the first 8 of those addresses with GOV.UK pagination below them</p>

<p><b>Given</b> a trader has searched in a picker and chosen an address<br/>
<b>When</b> the trader moves to another page<br/>
<b>Then</b> the search text stays in the box, the results stay filtered by it and the chosen address is still chosen</p>

<p><b>Given</b> a trader has 8 addresses or fewer saved for a role<br/>
<b>When</b> the trader opens that role's picker<br/>
<b>Then</b> no pagination shows</p>

<p><b>Given</b> a picker lists only one role's addresses<br/>
<b>When</b> the trader pages through them<br/>
<b>Then</b> every page holds addresses saved for that role or with no role, and none saved only for another role</p>

<ul>
	<li>The openspec scenarios for the affected pickers say they page, and each is linked to a test that proves it.</li>
	<li>The Design Release 2.1 backlog and sources say the pickers page, so a re-distil does not drop paging again.</li>
</ul>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (0)



## Confluence References


