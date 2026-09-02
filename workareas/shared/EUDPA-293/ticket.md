# EUDPA-293: Review page validation for edited/deleted addresses

## Metadata
- **Type:** Story
- **Status:** Deskcheck
- **Priority:** Medium
- **Labels:** 
- **Parent:** EUDPA-58
- **Assignee:** Amir Naveed

## Description

<p><b>As a</b> Trader<br/>
<b>I want</b> to be told if my notification uses an address that no longer exists<br/>
<b>So that</b> I can correct it before submitting</p>

<div class="panel" style="background-color: #deebff;border-width: 1px;"><div class="panelContent" style="background-color: #deebff;">
<p><b>Description</b></p>

<p>When I pick an address from the address book for a role on my consignment -<br/>
consignor, consignee, place of destination and so on - the notification records<br/>
that choice as a <b>consignment party</b>: the address, plus the role it plays.</p>

<p>Addresses are shared across the organisation, so the address behind one of my<br/>
consignment parties can be edited or deleted by a colleague while my<br/>
notification is still being worked on. This story makes sure a notification<br/>
cannot be submitted against an address that has been deleted, and pins down what<br/>
happens when one is edited.</p>

<p><b>The rules</b> (the first and third are the model's, from the consignment party<br/>
work; this story owns the second):</p>

<ul>
	<li><b>Address edited, notification in Draft or Amend</b> - the notification shows the<br/>
  latest address details. No user action needed. <b>(Model guarantee - 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-294" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-294" class="jira-issue-macro-key issue-link"  title="Link notifications to addresses from the address book" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-294
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
.)</b></li>
	<li><b>Address deleted, notification in Draft or Amend</b> - the user must choose a<br/>
  replacement before submitting. <b>(This story.)</b></li>
	<li><b>Either, notification already Submitted</b> - nothing changes. A submitted<br/>
  notification is part of the legal record and keeps the address details as they<br/>
  were at submission. <b>(Model guarantee - 
    <span class="jira-issue-macro" data-jira-key="EUDPA-295" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-295" class="jira-issue-macro-key issue-link"  title="Freeze address details onto the notification on submit" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-295
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-current jira-macro-single-issue-export-pdf">In Dev</span>
            </span>
.)</b></li>
</ul>


<p>Related - <a href="https://eaflood.atlassian.net/browse/EUDPA-286" class="external-link" rel="nofollow noreferrer">EUDPA-286</a> covers<br/>
editing and deleting the address itself. 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-294" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-294" class="jira-issue-macro-key issue-link"  title="Link notifications to addresses from the address book" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-294
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 builds the reference and<br/>
resolve (rules 1); 
    <span class="jira-issue-macro" data-jira-key="EUDPA-295" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-295" class="jira-issue-macro-key issue-link"  title="Freeze address details onto the notification on submit" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-295
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-current jira-macro-single-issue-export-pdf">In Dev</span>
            </span>
 builds the snapshot (rule 3).</p>
</div></div>

<p><b>Acceptance Criteria</b></p>

<p>The "latest details in a draft" (
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-294" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-294" class="jira-issue-macro-key issue-link"  title="Link notifications to addresses from the address book" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-294
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
) and "submitted notification frozen"<br/>
(
    <span class="jira-issue-macro" data-jira-key="EUDPA-295" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-295" class="jira-issue-macro-key issue-link"  title="Freeze address details onto the notification on submit" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-295
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-current jira-macro-single-issue-export-pdf">In Dev</span>
            </span>
) guarantees are <b>not</b> acceptance criteria here — those tickets deliver<br/>
and test them. This story adds the <b>deleted-address</b> gate on top, in two layers:<br/>
the backend rejects a submit that still references a deleted address (AC2), and<br/>
the review page surfaces it and lets the trader replace it (AC1, AC3).</p>

<p><b>AC1 - Validate deleted addresses on the review page</b></p>

<p><b>Given</b> I have a notification in Draft or Amend status<br/>
<b>And</b> one or more addresses it uses have since been deleted from the Address book<br/>
<b>When</b> I am navigated to the review page<br/>
<b>Then</b> I should see a validation message telling me to select a replacement<br/>
<b>And</b> I should see an inline validation message against each affected role<br/>
<b>And</b> I should not be able to submit until every deleted address has been replaced</p>

<p><b>AC2 - The backend rejects a submit that references a deleted address</b></p>

<p><b>Given</b> a notification references one or more deleted addresses<br/>
<b>When</b> it is submitted (regardless of the frontend - e.g. a direct API call)<br/>
<b>Then</b> the submit should be rejected with a validation error naming each affected<br/>
role<br/>
<b>And</b> the notification should stay in its current status, not become Submitted<br/>
<b>And</b> a submit with no deleted references should succeed</p>

<p><b>AC3 - Replace a deleted address</b></p>

<p><b>Given</b> the review page has flagged a deleted address<br/>
<b>When</b> I select the inline validation message<br/>
<b>Then</b> I should be taken to the relevant part of the notification to choose a<br/>
replacement<br/>
<b>And</b> choosing a valid address should clear the validation message<br/>
<b>And</b> I should be able to submit once no deleted addresses remain</p>

<div class="panel" style="background-color: #deebff;border-width: 1px;"><div class="panelContent" style="background-color: #deebff;">
<p><b>Tech Notes</b></p>

<ul>
	<li><b>This story spans two Live Animals repos</b>, not the Import Notification Service:<br/>
  the review-page UX in <tt>trade-imports-animals-frontend</tt> (AC1, AC3) and the<br/>
  submit-time gate in <tt>trade-imports-animals-backend</tt> (AC2). Both are journey<br/>
  behaviour, not a shared feature - only the address book itself is shared.</li>
	<li><b>The backend gate is the authoritative one.</b> On submit, the notification<br/>
  resolves its references (EUDPA-294's model); if any resolves to a soft-deleted<br/>
  address, reject with a per-role validation error and leave the status<br/>
  unchanged. The frontend check is UX on top - do not rely on it to keep deleted<br/>
  references out of a submission.</li>
	<li>This gate runs <b>before</b> EUDPA-295's snapshot in the submit flow - validate,<br/>
  then freeze. So a submitted notification never snapshots a deleted address.</li>
	<li><b>Depends on EUDPA-294</b> for the reference-and-resolve model. That ticket makes a<br/>
  Draft/Amend notification hold a reference to an address and resolve it on read -<br/>
  which is what lets this story detect a <b>deleted</b> reference (resolve returns a<br/>
  soft-deleted address). It does <b>not</b> depend on 
    <span class="jira-issue-macro" data-jira-key="EUDPA-295" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-295" class="jira-issue-macro-key issue-link"  title="Freeze address details onto the notification on submit" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-295
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-current jira-macro-single-issue-export-pdf">In Dev</span>
            </span>
 (the submit-time<br/>
  freeze): this story validates Draft/Amend, where addresses resolve live.</li>
	<li><b>Terms:</b> the address book stores <b>addresses</b>. A notification's reference to one,<br/>
  plus the role it plays, is a <b>consignment party</b>. What a colleague edits or<br/>
  deletes is the address; what carries the validation error is the consignment<br/>
  party.</li>
	<li>AC1 fires when resolving a consignment party returns a soft-deleted address.<br/>
  The check belongs with the rest of the review page's validation, not as a<br/>
  separate pass.</li>
	<li>An amend starts from the submitted copy (
    <span class="jira-issue-macro" data-jira-key="EUDPA-295" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-295" class="jira-issue-macro-key issue-link"  title="Freeze address details onto the notification on submit" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10318?size=medium" />
            EUDPA-295
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-current jira-macro-single-issue-export-pdf">In Dev</span>
            </span>
) and then resolves live. If<br/>
  it references a since-deleted address, AC1 applies to the amend too - which is<br/>
  why the current ticket framed this around amend.</li>
</ul>
</div></div>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (2)

### Rhys Sharrem (2026-07-21)
Check with [~accountid:712020:f440cc12-4d45-4ee5-86ca-4a3fd83f06ef] and [~accountid:712020:7116afd8-7125-4d89-9524-4ad5a6e736b2] - should the user be notified on the check your answers screen that the address they selected has been changed/edited since they selected it.

### Rhys Sharrem (2026-07-22)
I spoke to [~accountid:712020:f440cc12-4d45-4ee5-86ca-4a3fd83f06ef], [~accountid:712020:c6c15692-1994-471f-89c7-8dcc4e7d83ee] and [~accountid:712020:470ae6d6-0c99-48af-a90c-2adf58a5e071] about this in the UCD standup. They said that any deleted addresses in the address book should be treated as if they weren’t entered yet on the notification, so it should be flagged as “To Do” in validation and on the tasklist.

## Confluence References


