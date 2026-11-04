# EUDPA-739: Remove orphaned page: Search for an approved commercial transporter

## Metadata
- **Type:** Bug
- **Status:** In Dev
- **Priority:** Low
- **Labels:** 
- **Parent:** EUDPA-119
- **Assignee:** Amir Naveed

## Description

<p>The "Search for an approved commercial transporter" page (<tt>transporters/select</tt> in <tt>trade-imports-animals-frontend</tt>) is still served, but it is orphaned: nothing in the service links to it. The only way to reach it is by entering its address.</p>

<p>Env: All</p>

<p><b>Steps to reproduce:</b></p>
<ol>
	<li>Start a notification and note its reference from the address bar.</li>
	<li>Open Transport details. No page in the service links to the "Search for an approved commercial transporter" page.</li>
	<li>Enter the page's address, <tt>/live-animals/notifications/[reference]/transporters/select</tt>, using the reference from step 1. For example, <tt><a href="http://localhost:3000/live-animals/notifications/GBN-AG-26-ABC123/transporters/select" class="external-link" rel="nofollow noreferrer">http://localhost:3000/live-animals/notifications/GBN-AG-26-ABC123/transporters/select</a></tt> in the local stack.</li>
	<li>The "Search for an approved commercial transporter" page loads.</li>
</ol>


<p><font color="#36b37e"><b>Expected:</b></font> The page no longer exists. Entering its address shows the Page not found page.<br/>
<font color="#ff5630"><b>Actual:</b></font> The orphaned page loads.</p>

<p><b>Recommendation</b><br/>
Remove the page.</p>

<p><b>Scope</b></p>
<ul>
	<li>In: the <tt>transporters/select</tt> controller, template, copy, route registration, section caption entry and the tests for it in <tt>trade-imports-animals-frontend</tt>.</li>
	<li>Out: the transporter list, transporter type, commercial and private transporter pages.</li>
</ul>


<p><ins><b>Acceptance Criteria</b></ins></p>
<ul>
	<li>Entering <tt>/live-animals/notifications/[reference]/transporters/select</tt> shows the Page not found page.</li>
	<li>The controller, template, copy, route registration, section caption entry and tests for the page no longer exist.</li>
</ul>

## Acceptance Criteria

<!-- Extract from description above - look for "AC:", "Acceptance Criteria:", numbered lists, Given/When/Then -->

## Comments (1)

### Martyn Nevers (2026-10-27)
Removing the page also needs a change in {{trade-imports-ins-tests}}. Use the same branch name in both repositories.

*Delete in {{trade-imports-ins-tests}}:*
* {{tests/animals/e2e/pages/transporter-selection.spec.ts}} (three tests that open the page by its address)
* {{toTransporterSelection()}} in {{flows/animals/journey.ts}}
* the {{transporterSelection}} page object: {{page-objects/animals/transporter-selection-page.ts}} and its entry in {{page-objects/animals/index.ts}}

## Confluence References


