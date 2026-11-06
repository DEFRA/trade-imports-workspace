# EUDPA-759: Origin of the import: remove the return to overview actions

## Metadata
- **Type:** Bug
- **Status:** Deskcheck
- **Priority:** Medium
- **Labels:** 
- **Parent:** EUDPA-745
- **Assignee:** Hamid Jemei

## Description

<p>The Origin of the import page shows "Save and return to overview" and "Cancel and return to overview". This page should only have "Save and continue".</p>

<p>Env: Test</p>

<p><b>Steps to reproduce:</b></p>
<ol>
	<li>Open the Origin of the import page for a notification.</li>
	<li>Look at the buttons and links under "Your internal reference for this consignment (optional)".</li>
</ol>


<p><font color="#36b37e"><b>Expected:</b></font> "Save and continue" is the only way to save and move on.<br/>
<font color="#ff5630"><b>Actual:</b></font> "Save and return to overview" and "Cancel and return to overview" are also shown.</p>

<p><b>Related:</b> 
    <span class="jira-issue-macro resolved" data-jira-key="EUDPA-755" >
                <a href="https://eaflood.atlassian.net/browse/EUDPA-755" class="jira-issue-macro-key issue-link"  title="Origin of the import" >
            <img class="icon" src="https://eaflood.atlassian.net/rest/api/2/universal_avatar/view/type/issuetype/avatar/10315?size=medium" />
            EUDPA-755
        </a>
                                                    <span class="aui-lozenge aui-lozenge-subtle aui-lozenge-success jira-macro-single-issue-export-pdf">Done</span>
            </span>
 acceptance criteria AC4, AC6 and AC7 describe these two controls and need updating once this is agreed.</p>

<p><ins><b>Acceptance Criteria</b></ins><br/>
<b>Given</b> I am on the "Origin of the import" page<br/>
<b>When</b> I look at the actions on the page<br/>
<b>Then</b> I see a "Save and continue" button<br/>
<b>And</b> I do not see a "Save and return to overview" button<br/>
<b>And</b> I do not see a "Cancel and return to overview" link</p>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (2)

### Syed Islam (2026-11-02)
As discussed, please can you review and set to ready if happy [~accountid:635ffa757d4645af4f033f9c] 

### Monica.Rivera (2026-11-02)
[~accountid:712020:7116afd8-7125-4d89-9524-4ad5a6e736b2] description and AC reviewed, all fine, ticket set RFD.

## Confluence References


